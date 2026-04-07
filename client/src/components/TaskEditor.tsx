import React, { useState } from 'react';
import { api } from '../lib/api';

interface TaskDependency {
  id: string;
  name: string;
  currentStatus: string;
}

interface TaskNote {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
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
  const [expandedNoteTaskId, setExpandedNoteTaskId] = useState<string | null>(null);
  const [taskNotes, setTaskNotes] = useState<{ [key: string]: TaskNote[] }>({});
  const [loadingNoteTaskId, setLoadingNoteTaskId] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState<{ [key: string]: string }>({});

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
    if (daysUntil < 0) return 'text-destructive-foreground bg-destructive';
    if (daysUntil === 0) return 'text-destructive-foreground bg-destructive';
    if (daysUntil <= 7) return 'text-secondary-foreground bg-secondary';
    return 'text-muted-foreground bg-card';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500 text-foreground hover:bg/20';
      case 'IN_PROGRESS':
        return 'bg-secondary text-secondary-foreground';
      case 'BLOCKED':
        return 'bg-destructive text-destructive-foreground';
      case 'CANCELLED':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-translucent text-card-foreground hover:bg-foreground/20';
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

  const loadTaskNotes = async (taskId: string) => {
    // Notes should always be loaded from task data
    const task = tasks.find(t => t.id === taskId);
    if (task?.taskNotes) {
      setTaskNotes({ ...taskNotes, [taskId]: task.taskNotes });
      setExpandedNoteTaskId(expandedNoteTaskId === taskId ? null : taskId);
      return;
    }
    
    // If notes aren't in task data, just toggle expansion (shouldn't happen with new API)
    setExpandedNoteTaskId(expandedNoteTaskId === taskId ? null : taskId);
  };

  const addNewNote = async (taskId: string) => {
    const content = newNoteContent[taskId]?.trim();
    if (!content) {
      setError('Note content cannot be empty');
      return;
    }

    setSavingTaskId(taskId);
    setError(null);
    try {
      const res = await api(`/notes/task/${taskId}`, {
        method: 'POST',
        body: { content }
      });

      if (res.ok) {
        setTaskNotes({
          ...taskNotes,
          [taskId]: [...(taskNotes[taskId] || []), res.body]
        });
        setNewNoteContent({ ...newNoteContent, [taskId]: '' });
      } else {
        setError(res.body?.error || 'Failed to add note');
      }
    } catch (err) {
      console.error('Error adding note:', err);
      setError('An error occurred while adding the note');
    } finally {
      setSavingTaskId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
             ' at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
  };

  const tasksToShow = showCompleted ? tasks : tasks.filter(t => t.currentStatus !== 'COMPLETED' && t.currentStatus !== 'CANCELLED');

  return (
    <div className="bg-card divide-y divide-border">
      {error && <div className="px-4 py-2 bg-destructive/10 border-b border-destructive text-destructive-foreground text-sm">{error}</div>}
    
      {/* Task List */}
      {tasksToShow.length === 0 && !creatingNewTask ? (
        <div className="px-4 py-3 text-sm text-muted-foreground">No tasks in this category</div>
      ) : (
        tasksToShow.map(task => {
          const daysUntil = getDaysUntil(task.dueDate);
          const isEditing = editingTask?.id === task.id;

          return (
            <div
              key={task.id}
              className={`px-4 py-3 ${isEditing ? 'bg-card' : 'hover:bg-muted'} transition cursor-pointer`}
            >
            {isEditing ? (
              // EDIT MODE
              <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                {/* Name */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Task Name</label>
                  <input
                    type="text"
                    value={editingTask.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingTask({ ...editingTask, name: e.target.value })}
                    className="w-full px-2 py-1 bg-input border rounded text-sm"
                  />
                </div>

                {/* Status and Priority */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Status</label>
                    <select
                      value={editingTask.currentStatus}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditingTask({ ...editingTask, currentStatus: e.target.value })}
                      className="w-full px-2 py-1 bg-translucent border rounded text-xs"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="BLOCKED">BLOCKED</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Priority</label>
                    <select
                      value={editingTask.priority}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditingTask({ ...editingTask, priority: parseInt(e.target.value) })}
                      className="w-full px-2 py-1 bg-input border rounded text-xs"
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
                    <label className="text-xs text-muted-foreground block mb-1">Due Date</label>
                    <input
                      type="date"
                      value={editingTask.dueDate.split('T')[0]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                      className="w-full px-2 py-1 bg-input border rounded text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2 pb-1">
                    <input
                      type="checkbox"
                      id={`couple-${editingTask.id}`}
                      checked={editingTask.assignToCouple}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingTask({ ...editingTask, assignToCouple: e.target.checked })}
                      className="w-4 h-4 rounded bg-card text-ring focus:ring-ring cursor-pointer"
                    />
                    <label htmlFor={`couple-${editingTask.id}`} className="text-xs text-foreground cursor-pointer">
                      Assign to couple
                    </label>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Notes</label>
                  <textarea
                    value={editingTask.notes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditingTask({ ...editingTask, notes: e.target.value })}
                    placeholder="Add notes..."
                    className="w-full px-2 py-1 bg-card border rounded text-xs placeholder-muted-foreground"
                    rows={2}
                  />
                </div>

                {/* Note History in Edit Mode */}
                {taskNotes[editingTask.id] && taskNotes[editingTask.id].length > 0 && (
                  <div className="mt-3 p-2 bg-muted/30 rounded text-xs space-y-2">
                    <p className="text-muted-foreground font-medium">Note History:</p>
                    {taskNotes[editingTask.id].map((note) => (
                      <div key={note.id} className="bg-card p-2 rounded border border-border">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-muted-foreground font-medium">{note.author.name}</span>
                          <span className="text-muted-foreground text-xs">{formatDate(note.createdAt)}</span>
                        </div>
                        <p className="text-foreground whitespace-pre-wrap">{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Save/Cancel Buttons */}
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      setEditingTask(null);
                    }}
                    className="px-3 py-1 bg-primary hover:bg-primary/80 rounded text-xs"
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
                    className="px-3 py-1 bg-primary hover:bg-primary/80 rounded text-xs disabled:opacity-50"
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
                    <h4 className="font-medium wrap-break-word">{task.name}</h4>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1 wrap-break-word">{task.description}</p>
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
                      className="px-2 py-1 bg-destructive hover:bg-destructive/80 text-destructive-foreground text-xs rounded whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  )}
                </div>

                <div className="flex gap-2 mb-2 flex-wrap">
                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(task.currentStatus)}`}>
                    {task.currentStatus}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-card text-card-foreground">
                    {getPriorityLabel(task.priority)}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded text-card-foreground ${getUrgencyColor(daysUntil)}`}>
                    {daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : `${daysUntil}d`}
                  </span>
                </div>

                {task.notes && (
                  <p className="text-xs text-card-foreground mb-2 italic">{task.notes}</p>
                )}

                {/* Note History Section */}
                <div className="mt-3 pt-3 border-t border-border" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => loadTaskNotes(task.id)}
                    disabled={loadingNoteTaskId === task.id}
                    className="text-xs text-primary hover:text-primary/80 underline disabled:opacity-50"
                  >
                    {loadingNoteTaskId === task.id ? 'Loading notes...' : `${taskNotes[task.id]?.length || 0} note${taskNotes[task.id]?.length !== 1 ? 's' : ''}`}
                  </button>

                  {/* Expanded Note History */}
                  {expandedNoteTaskId === task.id && (
                    <div className="mt-3 space-y-3 bg-muted/30 p-2 rounded text-xs">
                      {/* Existing Notes */}
                      {taskNotes[task.id] && taskNotes[task.id].length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-muted-foreground font-medium text-xs">Note History:</p>
                          {taskNotes[task.id].map((note) => (
                            <div key={note.id} className="bg-card p-2 rounded border border-border">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-muted-foreground font-medium">{note.author.name}</span>
                                <span className="text-muted-foreground text-xs">{formatDate(note.createdAt)}</span>
                              </div>
                              <p className="text-foreground whitespace-pre-wrap">{note.content}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No notes yet</p>
                      )}

                      {/* Add New Note Form */}
                      <div className="mt-3 pt-3 border-t border-border">
                        <label className="text-muted-foreground font-medium text-xs block mb-1">Add a note:</label>
                        <textarea
                          value={newNoteContent[task.id] || ''}
                          onChange={(e) => setNewNoteContent({ ...newNoteContent, [task.id]: e.target.value })}
                          placeholder="Type your note here..."
                          className="w-full px-2 py-1 bg-input border border-border rounded text-xs placeholder-muted-foreground resize-none"
                          rows={2}
                        />
                        <button
                          type="button"
                          onClick={() => addNewNote(task.id)}
                          disabled={savingTaskId === task.id}
                          className="mt-2 px-2 py-1 bg-primary hover:bg-primary/80 text-primary-foreground text-xs rounded disabled:opacity-50"
                        >
                          {savingTaskId === task.id ? 'Saving...' : 'Add Note'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* {task.assignedTo && (
                  <p className="text-xs text-muted-foreground">
                    Assigned to: <span className="text-muted-foreground font-medium">{task.assignedTo.name}</span>
                  </p>
                )}  */}
              </div>
            )}
          </div>
        );
        })
      )}

        {/* Create New Task Button */}
      {!creatingNewTask && (
        <div className="px-4 py-3 flex justify-end">
          <button
            type="button"
            onClick={() => setCreatingNewTask(true)}
            className="px-3 py-1 bg-primary hover:bg-primary/80 rounded w-full primary-foreground text-xs"
          >
            + Add Task
          </button>
        </div>
      )}

      {/* Create New Task Form */}
      {creatingNewTask && (
        <div className="px-4 py-3 bg-muted/50 border-b border-border">
          <h4 className="text-sm font-bold justify-self-center w-auto bg-muted mb-3">Create New Task in {categoryName}</h4>
          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
            {/* Name */}
            <div>
              <label className="text-xs block mb-1">Task Name*</label>
              <input
                type="text"
                value={newTaskData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTaskData({ ...newTaskData, name: e.target.value })}
                placeholder="Enter task name"
                className="w-full px-2 py-1 bg-input border border-border rounded text-foreground text-sm placeholder-muted-foreground"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs block mb-1\">Description</label>
            <div>
              <textarea
                value={newTaskData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewTaskData({ ...newTaskData, description: e.target.value })}
                placeholder="Enter task description (optional)"
                className="w-full px-2 py-1 bg-input border border-border rounded text-foreground text-sm placeholder-muted-foreground"
                rows={2}
              />
            </div>

            {/* Priority and Due Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs block mb-1">Priority*</label>
                <select
                  value={newTaskData.priority}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewTaskData({ ...newTaskData, priority: parseInt(e.target.value) })}
                  className="w-full px-2 py-1 bg-input border border-border rounded text-foreground text-sm placeholder-muted-foreground"
                >
                  <option value="0">NORMAL</option>
                  <option value="1">URGENT</option>
                  <option value="2">HIGH</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Due Date*</label>
                <input
                  type="date"
                  value={newTaskData.dueDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTaskData({ ...newTaskData, dueDate: e.target.value })}
                  className="w-full px-2 py-1 bg-input border border-border rounded text-foreground text-sm placeholder-muted-foreground"
                />
              </div>
            </div>

           
            {/* Notes */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Notes</label>
              <textarea
                value={newTaskData.notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewTaskData({ ...newTaskData, notes: e.target.value })}
                placeholder="Add notes (optional)"
                className="w-full px-2 py-1 bg-input border border-border rounded text-foreground text-sm placeholder-muted-foreground"
                rows={2}
              />
            </div>

             {/* Couple Assignment */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="new-couple-assign"
                checked={newTaskData.assignToCouple}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTaskData({ ...newTaskData, assignToCouple: e.target.checked })}
                className="w-4 h-4 rounded bg-card text-ring focus:ring-ring cursor-pointer"
              />
              <label htmlFor="new-couple-assign" className="text-xs text-foreground cursor-pointer">
                Assign to couple
              </label>
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
                className="px-3 py-1 bg-primary-foreground h rounded text-xs"
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
                className="px-3 py-1 bg-primary hover:bg-primary/80 rounded text-xs disabled:opacity-50"
              >
                {savingTaskId === 'new' ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
