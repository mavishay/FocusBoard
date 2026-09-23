import { useState, useEffect, useCallback } from 'react';
import type { TaskItem } from '@/lib/task-utils';

interface SyncStatus {
  status: 'idle' | 'syncing' | 'error';
  lastSyncAt: string | null;
  error: string | null;
  accountCount: number;
}

interface Account {
  id: string;
  email: string;
  displayName: string;
}

interface ListItem {
  id: string;
  title: string;
  accountId: string;
}

export function useTasks() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskListId, setNewTaskListId] = useState('');
  const [availableLists, setAvailableLists] = useState<ListItem[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ttTasks, ttStatus, ttAccounts] = await Promise.all([
        window.electronAPI.ticktick.listTasks(),
        window.electronAPI.ticktick.status(),
        window.electronAPI.ticktick.listAccounts(),
      ]);

      const normalizedTasks: TaskItem[] = ttTasks.map((t) => ({
        id: t.id,
        title: t.title,
        body: t.content,
        status: t.status,
        dueAt: t.dueDate,
        source: 'TickTick',
        completedAt: t.completedAt,
        updatedAt: t.updatedAt,
        listId: t.projectId,
        listTitle: t.projectTitle ?? '',
        projectId: t.projectId,
        projectTitle: t.projectTitle,
        accountId: t.accountId,
      }));

      setTasks(
        normalizedTasks.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
      );
      setSyncStatus({
        status: ttStatus.status,
        lastSyncAt: ttStatus.lastSyncAt,
        error: ttStatus.error,
        accountCount: ttAccounts.length,
      });
      setAccounts(ttAccounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadAvailableLists = useCallback(async () => {
    try {
      const ttAccounts = await window.electronAPI.ticktick.listAccounts();
      const lists: ListItem[] = [];
      for (const acc of ttAccounts) {
        const ttProjects = await window.electronAPI.ticktick.listProjects(acc.id);
        for (const p of ttProjects) {
          lists.push({ id: p.id, title: p.name, accountId: acc.id });
        }
      }
      setAvailableLists(lists);
      if (lists.length > 0 && !newTaskListId) {
        setNewTaskListId(lists[0].id);
      }
    } catch (err) {
      console.error('Failed to load lists:', err);
    }
  }, [newTaskListId]);

  useEffect(() => {
    if (showAddForm) {
      loadAvailableLists();
    }
  }, [showAddForm, loadAvailableLists]);

  const handleSync = async () => {
    try {
      const ttAccounts = await window.electronAPI.ticktick.listAccounts();
      if (ttAccounts.length > 0) {
        await window.electronAPI.ticktick.sync(ttAccounts[0].id);
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    }
  };

  const handleConnect = () => {
    window.location.hash = '#/settings';
  };

  const handleToggleComplete = async (task: TaskItem) => {
    const newStatus = task.status === '1' ? '0' : '1';

    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));

    try {
      const accountId = task.accountId || accounts[0]?.id;
      if (!accountId) throw new Error('No TickTick account');
      await window.electronAPI.ticktick.updateTask({
        accountId,
        projectId: task.listId,
        taskId: task.id,
        status: newStatus as '0' | '1',
      });
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleDelete = async (task: TaskItem) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;

    setTasks((prev) => prev.filter((t) => t.id !== task.id));

    try {
      const accountId = task.accountId || accounts[0]?.id;
      if (!accountId) throw new Error('No TickTick account');
      await window.electronAPI.ticktick.deleteTask({
        accountId,
        projectId: task.listId,
        taskId: task.id,
      });
    } catch (err) {
      setTasks((prev) =>
        [...prev, task].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      );
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) {
      setError('Title is required');
      return;
    }

    const listItem = availableLists.find((l) => l.id === newTaskListId);
    if (!listItem) {
      setError('Please select a list');
      return;
    }

    const optimisticTask: TaskItem = {
      id: `temp-${Date.now()}`,
      title: newTaskTitle.trim(),
      body: null,
      status: '0',
      dueAt: newTaskDueDate || null,
      source: 'TickTick',
      completedAt: null,
      updatedAt: new Date().toISOString(),
      listId: listItem.id,
      listTitle: listItem.title,
    };

    setTasks((prev) => [optimisticTask, ...prev]);
    setShowAddForm(false);
    setNewTaskTitle('');
    setNewTaskDueDate('');

    try {
      const result = await window.electronAPI.ticktick.createTask({
        accountId: listItem.accountId,
        projectId: listItem.id,
        title: newTaskTitle.trim(),
        dueDate: newTaskDueDate || undefined,
      });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === optimisticTask.id
            ? {
                id: result.id,
                title: result.title,
                body: result.content,
                status: result.status,
                dueAt: result.dueDate ?? null,
                source: 'TickTick',
                completedAt: result.completedAt,
                updatedAt: result.updatedAt,
                listId: result.projectId,
                listTitle: result.projectTitle ?? '',
                projectId: result.projectId,
                projectTitle: result.projectTitle,
                accountId: listItem.accountId,
              }
            : t,
        ),
      );
    } catch (err) {
      setTasks((prev) => prev.filter((t) => t.id !== optimisticTask.id));
      setError(err instanceof Error ? err.message : 'Failed to create task');
    }
  };

  const handleEditStart = (task: TaskItem) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
  };

  const handleEditSave = async (task: TaskItem) => {
    if (!editTitle.trim()) {
      setEditingTaskId(null);
      return;
    }

    const newTitle = editTitle.trim();
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, title: newTitle } : t)));
    setEditingTaskId(null);

    try {
      const accountId = task.accountId || accounts[0]?.id;
      if (!accountId) throw new Error('No TickTick account');
      await window.electronAPI.ticktick.updateTask({
        accountId,
        projectId: task.listId,
        taskId: task.id,
        title: newTitle,
      });
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, title: task.title } : t)));
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    }
  };

  const handleEditCancel = () => {
    setEditingTaskId(null);
    setEditTitle('');
  };

  return {
    tasks,
    syncStatus,
    accounts,
    accountsColorMap: {} as Record<string, string>,
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
  };
}
