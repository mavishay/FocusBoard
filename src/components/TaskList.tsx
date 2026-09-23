import { Component, useState, type ReactNode } from 'react';
import { useTasks } from '@/hooks/useTasks';
import {
  formatDueDate,
  getPriorityFromDueDate,
  type TaskItem,
} from '@/lib/task-utils';

const GOOGLE_BLUE = '#4285F4';
const TICKTICK_BLUE = '#3C8DFF';

export { formatDueDate, getPriorityFromDueDate } from '@/lib/task-utils';

class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function TaskListInner() {
  const [showCompleted, setShowCompleted] = useState(false);
  const {
    tasks,
    syncStatus,
    accounts,
    accountsColorMap,
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

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-3 border border-border rounded-lg animate-pulse">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-muted rounded" />
              <div className="h-4 w-3/4 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
        <p className="text-destructive text-sm mb-2">{error}</p>
        <button onClick={loadData} className="px-3 py-1.5 rounded-md border border-border bg-secondary cursor-pointer text-sm hover:bg-secondary/80 transition-colors">Retry</button>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <div className="text-3xl mb-2 opacity-50">✅</div>
        <p className="text-muted-foreground text-sm mb-3">No task accounts connected</p>
        <button onClick={handleConnect} className="px-4 py-2 rounded-lg bg-[#4285F4] text-white cursor-pointer text-sm font-medium hover:bg-[#3367d6] transition-colors">
          Connect Task Account
        </button>
      </div>
    );
  }

  const activeTasks = tasks.filter((t) => t.status === 'needsAction' || t.status === '0');
  const completedTasks = tasks.filter((t) => t.status === 'completed' || t.status === '1');
  const visibleTasks = showCompleted ? tasks : activeTasks;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-3 shrink-0">
        <span className="text-xs text-muted-foreground">
          {syncStatus?.lastSyncAt
            ? `Last sync: ${new Date(syncStatus.lastSyncAt).toLocaleTimeString()}`
            : 'Not yet synced'}
          {syncStatus?.status === 'syncing' && ' (syncing...)'}
        </span>
        <div className="flex gap-2 items-center">
          {completedTasks.length > 0 && (
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="px-3 py-1.5 rounded border border-border bg-secondary cursor-pointer text-xs"
            >
              {showCompleted ? 'Hide' : 'Show'} Done ({completedTasks.length})
            </button>
          )}
          <button
            onClick={handleSync}
            disabled={syncStatus?.status === 'syncing'}
            className={`px-3 py-1.5 rounded border border-border bg-secondary cursor-pointer text-xs ${syncStatus?.status === 'syncing' ? 'opacity-50' : ''}`}
          >
            Sync
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 rounded border-none bg-emerald-500 text-white cursor-pointer text-xs"
          >
            + Add Task
          </button>
        </div>
      </div>
      {showAddForm && (
        <div className="mb-4 p-3 border border-border rounded-lg bg-secondary/50">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Task title"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1 p-2 rounded border border-border"
            />
            <input
              type="date"
              value={newTaskDueDate}
              onChange={(e) => setNewTaskDueDate(e.target.value)}
              className="p-2 rounded border border-border"
            />
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={newTaskListId}
              onChange={(e) => setNewTaskListId(e.target.value)}
              className="flex-1 p-2 rounded border border-border"
            >
              {availableLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.source === 'google-tasks' ? '🟢 ' : '🔵 '}{list.title}
                </option>
              ))}
            </select>
            <button onClick={handleAddTask} className="px-3 py-1.5 rounded border-none bg-emerald-500 text-white cursor-pointer text-sm">
              Save
            </button>
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 rounded border border-border bg-secondary cursor-pointer text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}
      {visibleTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className="text-3xl mb-2 opacity-50">🎯</div>
          <p className="text-muted-foreground text-sm">
            {tasks.length === 0 ? 'No tasks found' : 'All tasks completed!'}
          </p>
        </div>
      ) : (
        <ul className="list-none p-0 m-0 overflow-auto flex-1 flex flex-col gap-1.5">
          {visibleTasks.map((task) => renderTaskRow({
            task,
            accounts,
            accountsColorMap,
            editingTaskId,
            editTitle,
            setEditTitle,
            handleToggleComplete,
            handleDelete,
            handleEditStart,
            handleEditSave,
            handleEditCancel,
          }))}
        </ul>
      )}
    </div>
  );
}

function renderTaskRow({
  task,
  accounts,
  accountsColorMap,
  editingTaskId,
  editTitle,
  setEditTitle,
  handleToggleComplete,
  handleDelete,
  handleEditStart,
  handleEditSave,
  handleEditCancel,
}: {
  task: TaskItem;
  accounts: Array<{ id: string; email: string; displayName: string; source?: string }>;
  accountsColorMap: Record<string, string>;
  editingTaskId: string | null;
  editTitle: string;
  setEditTitle: (value: string) => void;
  handleToggleComplete: (task: TaskItem) => void;
  handleDelete: (task: TaskItem) => void;
  handleEditStart: (task: TaskItem) => void;
  handleEditSave: (task: TaskItem) => void;
  handleEditCancel: () => void;
}) {
  const taskAccount = accounts.find((a) => a.id === task.source || a.email === task.source);
  const taskColor = (taskAccount && accountsColorMap[taskAccount.email]) || GOOGLE_BLUE;
  const isOverdue = task.dueAt && new Date(task.dueAt) < new Date() && !(task.status === 'completed' || task.status === '1');
  const isCompleted = task.status === 'completed' || task.status === '1';
  const priority = getPriorityFromDueDate(task.dueAt);
  const priorityColors = { high: '#ef4444', medium: '#eab308', low: '#22c55e' };
  const priorityLabels = { high: 'High', medium: 'Medium', low: 'Low' };

  return (
    <li
      key={task.id}
      className={`group flex items-center gap-2 p-2.5 border rounded-lg transition-all duration-200 hover:shadow-sm ${
        isOverdue ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-card hover:border-primary/30'
      }`}
      style={{ borderLeftWidth: '4px', borderLeftColor: taskColor }}
    >
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-white shrink-0"
        style={{ background: task.source === 'Google Tasks' ? GOOGLE_BLUE : TICKTICK_BLUE }}
        title={task.source}
        aria-label={task.source}
      >
        <span aria-hidden="true">{task.source}</span>
      </span>
      <label className="relative flex items-center justify-center shrink-0">
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={() => handleToggleComplete(task)}
          aria-label={`Mark "${task.title}" as ${isCompleted ? 'incomplete' : 'complete'}`}
          className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-border checked:bg-primary checked:border-primary transition-colors"
        />
        <svg className="absolute w-3 h-3 text-primary-foreground pointer-events-none opacity-0 peer-checked:opacity-100" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 8L6 11L11 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </label>
      {editingTaskId === task.id ? (
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={() => handleEditSave(task)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleEditSave(task);
            if (e.key === 'Escape') handleEditCancel();
          }}
          autoFocus
          className="flex-1 p-1 text-sm border border-border rounded"
        />
      ) : (
        <span
          className={`flex-1 text-sm cursor-pointer ${
            isCompleted
              ? 'line-through text-muted-foreground'
              : isOverdue
                ? 'text-destructive font-medium'
                : 'text-foreground'
          }`}
          onClick={() => handleEditStart(task)}
          title="Click to edit"
        >
          {task.title}
        </span>
      )}
      {task.dueAt && (
        <span className="flex items-center gap-1">
          {priority && (
            <span
              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white shrink-0"
              style={{ background: priorityColors[priority] }}
              title={`Priority: ${priorityLabels[priority]}`}
              aria-label={`Priority: ${priorityLabels[priority]}`}
            >
              {priorityLabels[priority]}
            </span>
          )}
          <span className={`text-xs whitespace-nowrap ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
            {formatDueDate(task.dueAt)}
          </span>
        </span>
      )}
      <button
        onClick={() => handleDelete(task)}
        className="opacity-0 group-hover:opacity-100 text-destructive/70 hover:text-destructive border-none p-1 cursor-pointer text-xs bg-transparent transition-opacity"
        aria-label={`Delete "${task.title}"`}
      >
        ×
      </button>
    </li>
  );
}

export function TaskList() {
  return (
    <ErrorBoundary fallback={<p>Failed to load tasks</p>}>
      <TaskListInner />
    </ErrorBoundary>
  );
}
