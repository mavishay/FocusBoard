import { useMemo, useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { TaskPlannerWizard } from "@/components/TaskPlannerWizard";
import {
  bucketTasksByDueDate,
  formatImportance,
  formatTodayFootnote,
  formatTomorrowFootnote,
  getDateKeyInTimeZone,
  getPriorityFromDueDate,
  getProjectLabel,
  getUserTimeZone,
  type TaskItem,
} from "@/lib/task-utils";

function formatCardDateLabel(date: Date): string {
  return date.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "numeric",
  });
}

interface TasksTableProps {
  rows: TaskItem[];
  editingTaskId: string | null;
  editTitle: string;
  onEditTitleChange: (value: string) => void;
  onEditStart: (task: TaskItem) => void;
  onEditSave: (task: TaskItem) => void;
  onEditCancel: () => void;
  onToggleComplete: (task: TaskItem) => void;
  onDelete: (task: TaskItem) => void;
  timeZone: string;
}

function TasksTable({
  rows,
  editingTaskId,
  editTitle,
  onEditTitleChange,
  onEditStart,
  onEditSave,
  onEditCancel,
  onToggleComplete,
  onDelete,
  timeZone,
}: TasksTableProps) {
  if (rows.length === 0) {
    return <p className="ds-empty">אין משימות</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>משימה</th>
          <th>פרויקט</th>
          <th>חשיבות</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((task) => {
          const importance = formatImportance(getPriorityFromDueDate(task.dueAt, new Date(), timeZone));
          const todayKey = getDateKeyInTimeZone(new Date(), timeZone);
          const dueKey = task.dueAt ? getDateKeyInTimeZone(new Date(task.dueAt), timeZone) : null;
          const isOverdue = dueKey !== null && dueKey < todayKey;

          return (
            <tr key={task.id} className="ds-task-row">
              <td>
                <div className="ds-task-cell">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => onToggleComplete(task)}
                    aria-label={`סמן "${task.title}" כהושלם`}
                    className="ds-task-checkbox"
                  />
                  {editingTaskId === task.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => onEditTitleChange(e.target.value)}
                      onBlur={() => onEditSave(task)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onEditSave(task);
                        if (e.key === "Escape") onEditCancel();
                      }}
                      autoFocus
                      className="ds-task-edit-input"
                    />
                  ) : (
                    <button
                      type="button"
                      className={`ds-task-title ${isOverdue ? "ds-task-overdue" : ""}`}
                      onClick={() => onEditStart(task)}
                      title="לחץ לעריכה"
                    >
                      {task.title}
                    </button>
                  )}
                  <button
                    type="button"
                    className="ds-task-delete"
                    onClick={() => onDelete(task)}
                    aria-label={`מחק "${task.title}"`}
                  >
                    ×
                  </button>
                </div>
              </td>
              <td>{getProjectLabel(task)}</td>
              <td>
                {importance ? (
                  <span className={importance.variant === "hi" ? "ds-hi" : "ds-med"}>
                    {importance.label}
                  </span>
                ) : (
                  <span className="ds-med">—</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function TasksToolbar({
  syncStatus,
  onSync,
  onAdd,
  onPlan,
  showAddForm,
}: {
  syncStatus: { status: string; lastSyncAt: string | null } | null;
  onSync: () => void;
  onAdd: () => void;
  onPlan: () => void;
  showAddForm: boolean;
}) {
  return (
    <div className="ds-tasks-toolbar">
      <span className="ds-tasks-sync-meta">
        {syncStatus?.lastSyncAt
          ? `סנכרון: ${new Date(syncStatus.lastSyncAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", hour12: false })}`
          : "טרם סונכרן"}
        {syncStatus?.status === "syncing" && " (מסנכרן...)"}
      </span>
      <div className="ds-tasks-toolbar-actions">
        <button
          type="button"
          className="ds-tasks-btn"
          onClick={onSync}
          disabled={syncStatus?.status === "syncing"}
        >
          סנכרון
        </button>
        <button type="button" className="ds-tasks-btn" onClick={onPlan}>
          תכנן משימות
        </button>
        <button type="button" className="ds-tasks-btn ds-tasks-btn-primary" onClick={onAdd}>
          {showAddForm ? "סגור" : "+ הוסף משימה"}
        </button>
      </div>
    </div>
  );
}

function AddTaskForm({
  newTaskTitle,
  newTaskDueDate,
  newTaskListId,
  availableLists,
  onTitleChange,
  onDueDateChange,
  onListChange,
  onSave,
  onCancel,
}: {
  newTaskTitle: string;
  newTaskDueDate: string;
  newTaskListId: string;
  availableLists: Array<{ id: string; title: string; source: string }>;
  onTitleChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onListChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="ds-add-task-form">
      <input
        type="text"
        placeholder="שם משימה"
        value={newTaskTitle}
        onChange={(e) => onTitleChange(e.target.value)}
        className="ds-add-task-input"
      />
      <input
        type="date"
        value={newTaskDueDate}
        onChange={(e) => onDueDateChange(e.target.value)}
        className="ds-add-task-input"
      />
      <select
        value={newTaskListId}
        onChange={(e) => onListChange(e.target.value)}
        className="ds-add-task-input"
      >
        {availableLists.map((list) => (
          <option key={list.id} value={list.id}>
            {list.title}
          </option>
        ))}
      </select>
      <div className="ds-add-task-actions">
        <button type="button" className="ds-tasks-btn ds-tasks-btn-primary" onClick={onSave}>
          שמור
        </button>
        <button type="button" className="ds-tasks-btn" onClick={onCancel}>
          ביטול
        </button>
      </div>
    </div>
  );
}

export function TasksSections() {
  const [showPlanner, setShowPlanner] = useState(false);
  const timeZone = getUserTimeZone();
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const {
    tasks,
    syncStatus,
    accounts,
    loading,
    error,
    showAddForm,
    setShowAddForm,
    newTaskTitle,
    setNewTaskTitle,
    newTaskDueDate,
    setNewTaskDueDate,
    newTaskListId,
    setNewTaskListId,
    availableLists,
    editingTaskId,
    editTitle,
    setEditTitle,
    loadData,
    handleSync,
    handleConnect,
    handleToggleComplete,
    handleDelete,
    handleAddTask,
    handleEditStart,
    handleEditSave,
    handleEditCancel,
  } = useTasks();

  const { today, tomorrow: tomorrowTasks, overdueCount } = useMemo(
    () => bucketTasksByDueDate(tasks, now, timeZone),
    [tasks, timeZone],
  );

  const overdueTitles = useMemo(() => {
    const todayKey = getDateKeyInTimeZone(now, timeZone);
    return today
      .filter((task) => task.dueAt && getDateKeyInTimeZone(new Date(task.dueAt), timeZone) < todayKey)
      .map((task) => task.title);
  }, [today, now, timeZone]);

  const tableProps = {
    editingTaskId,
    editTitle,
    onEditTitleChange: setEditTitle,
    onEditStart: handleEditStart,
    onEditSave: handleEditSave,
    onEditCancel: handleEditCancel,
    onToggleComplete: handleToggleComplete,
    onDelete: handleDelete,
    timeZone,
  };

  if (loading) {
    return (
      <div className="ds-stack" data-testid="tasks-sections">
        <section className="ds-card">
          <h2>משימות · היום {formatCardDateLabel(now)}</h2>
          <p className="ds-footnote">טוען משימות...</p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ds-stack" data-testid="tasks-sections">
        <section className="ds-card">
          <p className="ds-footnote">{error}</p>
          <button type="button" className="ds-tasks-btn" onClick={loadData}>נסה שוב</button>
        </section>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="ds-stack" data-testid="tasks-sections">
        <section className="ds-card">
          <h2>משימות</h2>
          <p className="ds-footnote">לא מחוברות חשבונות משימות</p>
          <button type="button" className="ds-tasks-btn ds-tasks-btn-primary" onClick={handleConnect}>
            חבר חשבון משימות
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="ds-stack" data-testid="tasks-sections">
      <TasksToolbar
        syncStatus={syncStatus}
        onSync={handleSync}
        onAdd={() => setShowAddForm(!showAddForm)}
        onPlan={() => setShowPlanner(true)}
        showAddForm={showAddForm}
      />
      {showPlanner && (
        <TaskPlannerWizard
          onClose={() => setShowPlanner(false)}
          onApplied={loadData}
        />
      )}
      {showAddForm && (
        <AddTaskForm
          newTaskTitle={newTaskTitle}
          newTaskDueDate={newTaskDueDate}
          newTaskListId={newTaskListId}
          availableLists={availableLists}
          onTitleChange={setNewTaskTitle}
          onDueDateChange={setNewTaskDueDate}
          onListChange={setNewTaskListId}
          onSave={handleAddTask}
          onCancel={() => setShowAddForm(false)}
        />
      )}
      <section className="ds-card" data-testid="tasks-today-card">
        <h2>משימות · היום {formatCardDateLabel(now)}</h2>
        <TasksTable rows={today} {...tableProps} />
        <p className="ds-footnote">{formatTodayFootnote(overdueCount, overdueTitles)}</p>
      </section>
      <section className="ds-card" data-testid="tasks-tomorrow-card">
        <h2>משימות · מחר {formatCardDateLabel(tomorrow)}</h2>
        <TasksTable rows={tomorrowTasks} {...tableProps} />
        <p className="ds-footnote">{formatTomorrowFootnote(tomorrowTasks.length)}</p>
      </section>
    </div>
  );
}
