import React, { useState } from 'react';
import { api } from '../lib/api';

interface TaskDependency {
  id: string;
  name: string;
  currentStatus: string;
}

interface Task {
  id: string;
  name: string;
  description?: string;
  dueDate: string;
  priority: number;
  currentStatus: string;
  notes?: string | null;
  assignToCouple?: boolean;
  category: {
    id: string;
    name: string;
    weddingId: string;
    sortOrder: number;
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  dependsOn?: TaskDependency | null;
  dependents?: TaskDependency[];
}

interface EditingTaskState {
  id: string;
  name: string;
  currentStatus: string;
  priority: number;
  notes: string;
  dueDate: string;
  assignToCouple: boolean;
}

interface TaskEditorProps {
  categoryId: string;
  categoryName: string;
  tasks: Task[];
  weddingId: string;
  onTasksChange: (updatedTasks: Task[]) => void;
  currentUser?: any;
  showCompleted?: boolean;
  onSaveComplete?: () => void;
}

export default function TaskEditor({
  categoryId,
  categoryName,
  tasks,
  weddingId,
  onTasksChange,
  currentUser,
  showCompleted = false,
  onSaveComplete
}: TaskEditorProps) {
  const [editingTask, setEditingTask] = useState<EditingTaskState | null>(null);
  const [creatingNewTask, setCreatingNewTask] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    name: '',
    description: '',
    priority: 0,
    dueDate: new Date().toISOString().split('T')[0],
    assignToCouple: false,
    notes: ''
  });
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getDaysUntil = (dateStr: string) => {
    const dueDate = new Date(dateStr);
    dueDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = dueDate.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const getUrgencyColor = (daysUntil: number) => {
    if (daysUntil < 0) return 'text-red-500 bg-red-950';
    if (daysUntil === 0) return 'text-red-400 bg-red-900';
    if (daysUntil <= 7) return 'text-amber-400 bg-amber-950';
    return 'text-slate-400 bg-slate-800';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-900 text-green-200';
      case 'IN_PROGRESS':
        return 'bg-blue-900 text-blue-200';
      case 'BLOCKED':
        return 'bg-red-900 text-red-200';
      case 'CANCELLED':
        return 'bg-slate-900 text-slate-200';
      default:
        return 'bg-slate-700 text-slate-200';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1:
        return 'URGENT';
      case 2:
        return 'HIGH';
      default:
        return 'NORMAL';
    }
  };

  const updateTask = async (taskId: string) => {
    if (!editingTask) return;

    setSavingTaskId(taskId);
    setError(null);
    try {
      // First, update the task itself
      const res = await api(`/tasks/${taskId}`, {
        method: 'PUT',
        body: {
          name: editingTask.name,
          currentStatus: editingTask.currentStatus,
          priority: editingTask.priority,
          dueDate: editingTask.dueDate,
          notes: editingTask.notes,
          assignToCouple: editingTask.assignToCouple
        }
      });

      if (!res.ok) {
        setError(res.body?.error || 'Failed to save task');
        setSavingTaskId(null);
        return;
      }

      // Get the original task to check if assignToCouple changed
      const originalTask = tasks.find(t => t.id === taskId);
      const coupleAssignmentChanged = originalTask?.assignToCouple !== editingTask.assignToCouple;

      // If assignToCouple changed, sync with couple members
      if (coupleAssignmentChanged) {
        try {
          // Fetch the wedding to get couple members (User records)
          const weddingRes = await api(`/weddings/${weddingId}`);
          if (weddingRes.ok) {
            const wedding = weddingRes.body;
            const coupleUserIds = [];
            if (wedding.spouse1?.id) coupleUserIds.push(wedding.spouse1.id);
            if (wedding.spouse2?.id) coupleUserIds.push(wedding.spouse2.id);

            if (coupleUserIds.length === 0) {
              console.warn('No couple members with user accounts found for wedding', weddingId);
            }

            if (editingTask.assignToCouple) {
              // Assign to all couple members who have user accounts
              for (const userId of coupleUserIds) {
                await api(`/tasks/${taskId}/couple`, {
                  method: 'POST',
                  body: { assignedToId: userId }
                });
              }
            } else {
              // Unassign from all couple members who have user accounts
              for (const userId of coupleUserIds) {
                await api(`/tasks/${taskId}/couple/${userId}`, {
                  method: 'DELETE'
                });
              }
            }
          }
        } catch (err) {
          console.error('Error syncing couple assignments:', err);
          // Don't fail the whole operation if couple sync fails
        }
      }

      const updatedTasks = tasks.map(t =>
        t.id === taskId
          ? { ...t, ...editingTask, dueDate: editingTask.dueDate }
          : t
      );
      onTasksChange(updatedTasks);
      setEditingTask(null);
      onSaveComplete?.();
    } catch (err) {
      setError('An error occurred while saving');
    } finally {
      setSavingTaskId(null);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    setSavingTaskId(taskId);
    setError(null);
    try {
      const res = await api(`/tasks/${taskId}`, { method: 'DELETE' });

      if (res.ok) {
        onTasksChange(tasks.filter(t => t.id !== taskId));
        setEditingTask(null);
      } else {
        setError(res.body?.error || 'Failed to delete task');
      }
    } catch (err) {
      setError('An error occurred while deleting');
    } finally {
      setSavingTaskId(null);
    }
  };

  const createNewTask = async () => {
    if (!newTaskData.name.trim()) {
      setError('Task name is required');
      return;
    }

    setSavingTaskId('new');
    setError(null);
    try {
      const res = await api('/tasks', {
        method: 'POST',
        body: {
          name: newTaskData.name.trim(),
          description: newTaskData.description.trim() || null,
          priority: newTaskData.priority,
          dueDate: newTaskData.dueDate,
          categoryId: categoryId,
          sortOrder: tasks.length
        }
      });

      if (!res.ok) {
        setError(res.body?.error || 'Failed to create task');
        setSavingTaskId(null);
        return;
      }

      const createdTask: Task = {
        ...res.body,
        category: {
          id: categoryId,
          name: categoryName,
          weddingId: weddingId,
          sortOrder: 0
        },
        notes: newTaskData.notes || null,
        dueDate: new Date(res.body.dueDate).toISOString(),
        currentStatus: 'PENDING',
        assignToCouple: newTaskData.assignToCouple
      };

      // If assign to couple is checked, sync with couple members
      if (newTaskData.assignToCouple) {
        try {
          const weddingRes = await api(`/weddings/${weddingId}`);
          if (weddingRes.ok) {
            const wedding = weddingRes.body;
            const coupleUserIds = [];
            if (wedding.spouse1?.id) coupleUserIds.push(wedding.spouse1.id);
            if (wedding.spouse2?.id) coupleUserIds.push(wedding.spouse2.id);

            for (const userId of coupleUserIds) {
              await api(`/tasks/${createdTask.id}/couple`, {
                method: 'POST',
                body: { assignedToId: userId }
              });
            }
          }
        } catch (err) {
          console.error('Error syncing couple assignments:', err);
        }
      }

      onTasksChange([...tasks, createdTask]);
      setCreatingNewTask(false);
      setNewTaskData({
        name: '',
        description: '',
        priority: 0,
        dueDate: new Date().toISOString().split('T')[0],
        assignToCouple: false,
        notes: ''
      });
      onSaveComplete?.();
    } catch (err) {
      setError('An error occurred while creating the task');
    } finally {
      setSavingTaskId(null);
    }
  };

  const startEditingTask = (task: Task) => {
    setEditingTask({
      id: task.id,
      name: task.name,
      currentStatus: task.currentStatus,
      priority: task.priority,
      notes: task.notes || '',
      dueDate: task.dueDate,
      assignToCouple: task.assignToCouple || false
    });
  };

  const tasksToShow = showCompleted ? tasks : tasks.filter(t => t.currentStatus !== 'COMPLETED' && t.currentStatus !== 'CANCELLED');

  return (
    <div className="bg-slate-900 divide-y divide-slate-800">
      {error && <div className="px-4 py-2 bg-red-900 border-b border-red-700 text-red-200 text-sm">{error}</div>}

      {/* Create New Task Button */}
      {!creatingNewTask && (
        <div className="px-4 py-3 flex justify-end">
          <button
            type="button"
            onClick={() => setCreatingNewTask(true)}
            className="px-3 py-1 bg-blue-700 hover:bg-blue-600 rounded text-white text-xs"
          >
            + Add Task
          </button>
        </div>
      )}

      {/* Create New Task Form */}
      {creatingNewTask && (
        <div className="px-4 py-3 bg-slate-800 border-b border-slate-700">
          <h4 className="text-sm font-medium text-white mb-3">Create New Task in {categoryName}</h4>
          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
            {/* Name */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Task Name*</label>
              <input
                type="text"
                value={newTaskData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTaskData({ ...newTaskData, name: e.target.value })}
                placeholder="Enter task name"
                className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm placeholder-slate-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Description</label>
              <textarea
                value={newTaskData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewTaskData({ ...newTaskData, description: e.target.value })}
                placeholder="Enter task description (optional)"
                className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs placeholder-slate-500"
                rows={2}
              />
            </div>

            {/* Priority and Due Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Priority*</label>
                <select
                  value={newTaskData.priority}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewTaskData({ ...newTaskData, priority: parseInt(e.target.value) })}
                  className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                >
                  <option value="0">NORMAL</option>
                  <option value="1">URGENT</option>
                  <option value="2">HIGH</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Due Date*</label>
                <input
                  type="date"
                  value={newTaskData.dueDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTaskData({ ...newTaskData, dueDate: e.target.value })}
                  className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                />
              </div>
            </div>

            {/* Couple Assignment */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="new-couple-assign"
                checked={newTaskData.assignToCouple}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTaskData({ ...newTaskData, assignToCouple: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="new-couple-assign" className="text-xs text-slate-300 cursor-pointer">
                Assign to couple
              </label>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Notes</label>
              <textarea
                value={newTaskData.notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewTaskData({ ...newTaskData, notes: e.target.value })}
                placeholder="Add notes (optional)"
                className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs placeholder-slate-500"
                rows={2}
              />
            </div>

            {/* Create/Cancel Buttons */}
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  setCreatingNewTask(false);
                  setNewTaskData({
                    name: '',
                    description: '',
                    priority: 0,
                    dueDate: new Date().toISOString().split('T')[0],
                    assignToCouple: false,
                    notes: ''
                  });
                }}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-white text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  createNewTask();
                }}
                disabled={savingTaskId === 'new'}
                className="px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-white text-xs disabled:opacity-50"
              >
                {savingTaskId === 'new' ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task List */}
      {tasksToShow.length === 0 && !creatingNewTask ? (
        <div className="px-4 py-3 text-sm text-slate-400">No tasks in this category</div>
      ) : (
        tasksToShow.map(task => {
          const daysUntil = getDaysUntil(task.dueDate);
          const isEditing = editingTask?.id === task.id;

          return (
            <div
              key={task.id}
              className={`px-4 py-3 ${isEditing ? 'bg-slate-800' : 'hover:bg-slate-800'} transition cursor-pointer`}
            >
            {isEditing ? (
              // EDIT MODE
              <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                {/* Name */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Task Name</label>
                  <input
                    type="text"
                    value={editingTask.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingTask({ ...editingTask, name: e.target.value })}
                    className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                  />
                </div>

                {/* Status and Priority */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Status</label>
                    <select
                      value={editingTask.currentStatus}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditingTask({ ...editingTask, currentStatus: e.target.value })}
                      className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="BLOCKED">BLOCKED</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Priority</label>
                    <select
                      value={editingTask.priority}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditingTask({ ...editingTask, priority: parseInt(e.target.value) })}
                      className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                    >
                      <option value="0">NORMAL</option>
                      <option value="1">URGENT</option>
                      <option value="2">HIGH</option>
                    </select>
                  </div>
                </div>

                {/* Due Date and Couple Assignment */}
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 block mb-1">Due Date</label>
                    <input
                      type="date"
                      value={editingTask.dueDate.split('T')[0]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                      className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2 pb-1">
                    <input
                      type="checkbox"
                      id={`couple-${editingTask.id}`}
                      checked={editingTask.assignToCouple}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingTask({ ...editingTask, assignToCouple: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor={`couple-${editingTask.id}`} className="text-xs text-slate-300 cursor-pointer">
                      Assign to couple
                    </label>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Notes</label>
                  <textarea
                    value={editingTask.notes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditingTask({ ...editingTask, notes: e.target.value })}
                    placeholder="Add notes..."
                    className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs placeholder-slate-400"
                    rows={2}
                  />
                </div>

                {/* Save/Cancel Buttons */}
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      setEditingTask(null);
                    }}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-white text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      updateTask(task.id);
                    }}
                    disabled={savingTaskId === task.id}
                    className="px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-white text-xs disabled:opacity-50"
                  >
                    {savingTaskId === task.id ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              // VIEW MODE
              <div onClick={() => startEditingTask(task)}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-white wrap-break-word">{task.name}</h4>
                    {task.description && (
                      <p className="text-xs text-slate-400 mt-1 wrap-break-word">{task.description}</p>
                    )}
                  </div>
                  {currentUser?.role === 'ADMIN' && (
                    <button
                      type="button"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        deleteTask(task.id);
                      }}
                      disabled={savingTaskId === task.id}
                      className="px-2 py-1 bg-red-900 hover:bg-red-800 text-red-200 text-xs rounded whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  )}
                </div>

                <div className="flex gap-2 mb-2 flex-wrap">
                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(task.currentStatus)}`}>
                    {task.currentStatus}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-200">
                    {getPriorityLabel(task.priority)}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${getUrgencyColor(daysUntil)}`}>
                    {daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : `${daysUntil}d`}
                  </span>
                </div>

                {task.notes && (
                  <p className="text-xs text-slate-400 mb-2 italic">{task.notes}</p>
                )}

                {task.assignedTo && (
                  <p className="text-xs text-slate-500">
                    Assigned to: <span className="text-slate-400">{task.assignedTo.name}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        );
        })
      )}
    </div>
  );
}
