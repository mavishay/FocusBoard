import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import {
  generateTaskPlannerSuggestions,
  type PlannerAction,
  type PlannerTaskInput,
} from '../ai/task-planner';
import { WorkloadService } from './workload-service';
import { getAccessToken } from '../auth/ticktick';
import { TickTickAdapter } from '../sync/ticktick-adapter';

export interface OpenPlannerTask {
  id: string;
  title: string;
  source: 'TickTick';
  accountId: string;
  listId: string;
  listTitle: string;
  dueDate: string | null;
}

export interface PlannerSuggestionRecord {
  id: string;
  sessionId: string;
  taskId: string;
  taskTitle: string;
  source: 'TickTick';
  accountId: string;
  listId: string;
  currentDueDate: string | null;
  action: PlannerAction;
  suggestedDueDate: string | null;
  reasoning: string;
  accepted: boolean | null;
  appliedAt: string | null;
}

export interface PlannerSession {
  id: string;
  status: 'draft' | 'ready' | 'applied' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  suggestions: PlannerSuggestionRecord[];
}

export class TaskPlannerService {
  constructor(private db: Database.Database) {}

  listOpenTasks(): OpenPlannerTask[] {
    const ticktickRows = this.db
      .prepare(
        `SELECT tt.id, tt.title, tt.due_date, tt.project_id, tp.name as project_name, tp.account_id
         FROM ticktick_tasks tt
         JOIN ticktick_projects tp ON tt.project_id = tp.id
         WHERE tt.status = 0 AND tt.is_deleted = 0
         ORDER BY tt.updated_at DESC`,
      )
      .all() as Array<{
        id: string;
        title: string;
        due_date: string | null;
        project_id: string;
        project_name: string | null;
        account_id: string;
      }>;

    return ticktickRows.map((r) => ({
      id: r.id,
      title: r.title,
      source: 'TickTick',
      accountId: r.account_id,
      listId: r.project_id,
      listTitle: r.project_name ?? '',
      dueDate: r.due_date,
    }));
  }

  createSession(): PlannerSession {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO task_planner_sessions (id, status, created_at, updated_at) VALUES (?, 'draft', ?, ?)`,
      )
      .run(id, now, now);

    return {
      id,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      suggestions: [],
    };
  }

  getSession(sessionId: string): PlannerSession | null {
    const session = this.db
      .prepare(`SELECT id, status, created_at, updated_at FROM task_planner_sessions WHERE id = ?`)
      .get(sessionId) as
      | { id: string; status: string; created_at: string; updated_at: string }
      | undefined;

    if (!session) return null;

    const suggestions = this.db
      .prepare(
        `SELECT id, session_id, task_id, task_title, source, account_id, list_id,
                current_due_date, action, suggested_due_date, reasoning, accepted, applied_at
         FROM task_planner_suggestions
         WHERE session_id = ?
         ORDER BY created_at ASC`,
      )
      .all(sessionId) as Array<{
        id: string;
        session_id: string;
        task_id: string;
        task_title: string;
        source: string;
        account_id: string;
        list_id: string;
        current_due_date: string | null;
        action: string;
        suggested_due_date: string | null;
        reasoning: string | null;
        accepted: number | null;
        applied_at: string | null;
      }>;

    return {
      id: session.id,
      status: session.status as PlannerSession['status'],
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      suggestions: suggestions.map((s) => ({
        id: s.id,
        sessionId: s.session_id,
        taskId: s.task_id,
        taskTitle: s.task_title,
        source: s.source as 'TickTick',
        accountId: s.account_id,
        listId: s.list_id,
        currentDueDate: s.current_due_date,
        action: s.action as PlannerAction,
        suggestedDueDate: s.suggested_due_date,
        reasoning: s.reasoning ?? '',
        accepted: s.accepted === null ? null : s.accepted === 1,
        appliedAt: s.applied_at,
      })),
    };
  }

  async generateSuggestions(sessionId: string): Promise<PlannerSession> {
    const openTasks = this.listOpenTasks();
    if (openTasks.length === 0) {
      throw new Error('No open tasks to plan');
    }

    const workloadService = new WorkloadService(this.db);
    const snapshot = workloadService.getLatest() ?? workloadService.calculate();

    const plannerInput: PlannerTaskInput[] = openTasks.map((t) => ({
      taskId: t.id,
      title: t.title,
      source: t.source,
      dueDate: t.dueDate,
      listTitle: t.listTitle,
    }));

    const aiSuggestions = await generateTaskPlannerSuggestions(
      this.db,
      plannerInput,
      {
        overdueTasks: snapshot.overdueTasks,
        todayTasks: snapshot.todayTasks,
        todayEvents: snapshot.todayEvents,
        score: snapshot.score,
      },
    );

    const now = new Date().toISOString();
    const taskMap = new Map(openTasks.map((t) => [t.id, t]));

    this.db.prepare(`DELETE FROM task_planner_suggestions WHERE session_id = ?`).run(sessionId);

    const insert = this.db.prepare(
      `INSERT INTO task_planner_suggestions
         (id, session_id, task_id, task_title, source, account_id, list_id,
          current_due_date, action, suggested_due_date, reasoning, accepted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    );

    for (const suggestion of aiSuggestions) {
      const task = taskMap.get(suggestion.taskId);
      if (!task) continue;

      insert.run(
        randomUUID(),
        sessionId,
        task.id,
        task.title,
        task.source,
        task.accountId,
        task.listId,
        task.dueDate,
        suggestion.action,
        suggestion.suggestedDueDate,
        suggestion.reasoning,
      );
    }

    this.db
      .prepare(`UPDATE task_planner_sessions SET status = 'ready', updated_at = ? WHERE id = ?`)
      .run(now, sessionId);

    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found after generating suggestions');
    }
    return session;
  }

  updateSuggestionAcceptance(
    sessionId: string,
    suggestionId: string,
    accepted: boolean,
  ): PlannerSuggestionRecord | null {
    const existing = this.db
      .prepare(`SELECT id FROM task_planner_suggestions WHERE id = ? AND session_id = ?`)
      .get(suggestionId, sessionId);

    if (!existing) return null;

    this.db
      .prepare(`UPDATE task_planner_suggestions SET accepted = ? WHERE id = ?`)
      .run(accepted ? 1 : 0, suggestionId);

    const session = this.getSession(sessionId);
    return session?.suggestions.find((s) => s.id === suggestionId) ?? null;
  }

  acceptAllSuggestions(sessionId: string): PlannerSession | null {
    this.db
      .prepare(
        `UPDATE task_planner_suggestions SET accepted = 1
         WHERE session_id = ? AND action != 'keep'`,
      )
      .run(sessionId);

    return this.getSession(sessionId);
  }

  async applyAcceptedSuggestions(sessionId: string): Promise<{ applied: number; failed: string[] }> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const toApply = session.suggestions.filter(
      (s) => s.accepted === true && s.action !== 'keep' && !s.appliedAt,
    );

    let applied = 0;
    const failed: string[] = [];
    const now = new Date().toISOString();

    for (const suggestion of toApply) {
      try {
        await this.applyTickTickSuggestion(suggestion);

        this.db
          .prepare(`UPDATE task_planner_suggestions SET applied_at = ? WHERE id = ?`)
          .run(now, suggestion.id);
        applied++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        failed.push(`${suggestion.taskTitle}: ${message}`);
      }
    }

    this.db
      .prepare(`UPDATE task_planner_sessions SET status = 'applied', updated_at = ? WHERE id = ?`)
      .run(now, sessionId);

    return { applied, failed };
  }

  private async applyTickTickSuggestion(suggestion: PlannerSuggestionRecord): Promise<void> {
    const accessToken = getAccessToken(this.db, suggestion.accountId);
    const adapter = new TickTickAdapter(accessToken);
    const now = new Date().toISOString();

    if (suggestion.action === 'complete') {
      await adapter.updateTask(suggestion.taskId, { status: 1 });
      this.db
        .prepare(`UPDATE ticktick_tasks SET status = 1, updated_at = ?, synced_at = ? WHERE id = ?`)
        .run(now, now, suggestion.taskId);
    } else if (suggestion.action === 'dismiss') {
      await adapter.deleteTask(suggestion.taskId);
      this.db.prepare(`DELETE FROM ticktick_tasks WHERE id = ?`).run(suggestion.taskId);
    } else if (suggestion.action === 'reschedule' && suggestion.suggestedDueDate) {
      await adapter.updateTask(suggestion.taskId, { dueDate: suggestion.suggestedDueDate });
      this.db
        .prepare(`UPDATE ticktick_tasks SET due_date = ?, updated_at = ?, synced_at = ? WHERE id = ?`)
        .run(suggestion.suggestedDueDate, now, now, suggestion.taskId);
    }
  }
}
