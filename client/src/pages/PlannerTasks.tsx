import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

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

interface TasksByCategory {
  [key: string]: {
    sortOrder: number;
    tasks: Task[];
  };
}

type SortMode = 'name' | 'dueDate' | 'category' | 'status';
type SearchField = 'name' | 'dueDate' | 'category' | 'status' | 'notes';

interface EditingTaskState {
  id: string;
  name: string;
  currentStatus: string;
  priority: number;
  notes: string;
  dueDate: string;
}

export default function PlannerTasks({ currentUser }: { currentUser?: any }) {
  const { weddingId } = useParams<{ weddingId?: string }>();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('dueDate');
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [weddingName, setWeddingName] = useState<string>('');
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<SearchField>('name');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Editing state - unified per task
  const [editingTask, setEditingTask] = useState<EditingTaskState | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, [weddingId]);

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = weddingId ? `/tasks/assigned/me?weddingId=${weddingId}` : '/tasks/assigned/me';
      const tasksRes = await api(endpoint);
      console.log('[PlannerTasks] API response:', { ok: tasksRes.ok, status: tasksRes.status, body: tasksRes.body });
      
      if (!tasksRes.ok) {
        const errorMsg = tasksRes.body?.error || `Failed to load tasks (status: ${tasksRes.status})`;
        setError(errorMsg);
        console.error('[PlannerTasks] Error:', errorMsg);
        setLoading(false);
        return;
      }

      const allTasks = Array.isArray(tasksRes.body) ? tasksRes.body : [];
      console.log('[PlannerTasks] Loaded tasks:', allTasks.length);
      setTasks(allTasks);

      // If we have a wedding ID, fetch the wedding name
      if (weddingId && allTasks.length > 0) {
        try {
          const weddingRes = await api(`/weddings/${weddingId}`);
          if (weddingRes.ok) {
            const wedding = weddingRes.body;
            const spouse1 = wedding.spouse1?.name || '';
            const spouse2 = wedding.spouse2?.name || '';
            if (spouse1 && spouse2) {
              setWeddingName(`${spouse1} & ${spouse2}'s Wedding`);
            } else if (spouse1) {
              setWeddingName(`${spouse1}'s Wedding`);
            } else if (spouse2) {
              setWeddingName(`${spouse2}'s Wedding`);
            }
          }
        } catch (err) {
          console.error('Failed to load wedding name:', err);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMsg);
      console.error('[PlannerTasks] Exception:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTasks = () => {
    let filtered = showCompleted ? tasks : tasks.filter(t => t.currentStatus !== 'COMPLETED' && t.currentStatus !== 'CANCELLED');
    
    if (!searchTerm.trim()) {
      return filtered;
    }

    const term = searchTerm.toLowerCase();
    return filtered.filter(task => {
      switch (searchField) {
        case 'name':
          return task.name.toLowerCase().includes(term);
        case 'category':
          return task.category.name.toLowerCase().includes(term);
        case 'status':
          return task.currentStatus.toLowerCase().includes(term);
        case 'notes':
          return (task.notes || '').toLowerCase().includes(term);
        case 'dueDate':
          const taskDate = new Date(task.dueDate).toLocaleDateString('en-US');
          return taskDate.includes(term);
        default:
          return true;
      }
    });
  };

  const updateTask = async (taskId: string) => {
    if (!editingTask) return;
    
    setSavingTaskId(taskId);
    try {
      const res = await api(`/tasks/${taskId}`, {
        method: 'PUT',
        body: {
          name: editingTask.name,
          currentStatus: editingTask.currentStatus,
          priority: editingTask.priority,
          notes: editingTask.notes,
          dueDate: editingTask.dueDate
        }
      });
      
      if (res.ok) {
        setTasks(tasks.map(t => 
          t.id === taskId 
            ? { 
                ...t, 
                name: editingTask.name,
                currentStatus: editingTask.currentStatus, 
                priority: editingTask.priority,
                notes: editingTask.notes,
                dueDate: editingTask.dueDate
              } 
            : t
        ));
        setEditingTask(null);
      } else {
        alert(res.body?.error || 'Failed to update task');
      }
    } catch (err) {
      console.error('Error updating task:', err);
      alert('Error updating task');
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
      dueDate: task.dueDate
    });
  };

  const groupTasksByCategory = (taskList: Task[]): TasksByCategory => {
    const grouped: TasksByCategory = {};
    taskList.forEach(task => {
      const categoryName = task.category.name;
      if (!grouped[categoryName]) {
        grouped[categoryName] = {
          sortOrder: task.category.sortOrder,
          tasks: []
        };
      }
      grouped[categoryName].tasks.push(task);
    });
    return grouped;
  };

  const getSortedTasks = (categoryTasks: Task[]): Task[] => {
    const sorted = [...categoryTasks];
    
    switch (sortMode) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'dueDate':
        sorted.sort((a, b) => {
          const dateA = new Date(a.dueDate).getTime();
          const dateB = new Date(b.dueDate).getTime();
          if (dateA !== dateB) return dateA - dateB;
          if (a.priority !== b.priority) return a.priority - b.priority;
          return a.name.localeCompare(b.name);
        });
        break;
      case 'category':
        sorted.sort((a, b) => {
          if (a.category.name !== b.category.name) return a.category.name.localeCompare(b.category.name);
          return a.name.localeCompare(b.name);
        });
        break;
      case 'status':
        const statusOrder = { BLOCKED: 0, IN_PROGRESS: 1, PENDING: 2, COMPLETED: 3, CANCELLED: 4 };
        sorted.sort((a, b) => {
          const statusA = statusOrder[a.currentStatus as keyof typeof statusOrder] ?? 5;
          const statusB = statusOrder[b.currentStatus as keyof typeof statusOrder] ?? 5;
          if (statusA !== statusB) return statusA - statusB;
          return a.name.localeCompare(b.name);
        });
        break;
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return sorted;
  };

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

  const getUnmetDependencies = (task: Task): string | null => {
    if (!task.dependsOn) return null;
    if (task.dependsOn.currentStatus !== 'COMPLETED') {
      return `Cannot start until "${task.dependsOn.name}" is completed`;
    }
    return null;
  };

  const toggleCategoryExpanded = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const filteredTasks = getFilteredTasks();
  const tasksByCategory = groupTasksByCategory(filteredTasks);
  const categoriesSorted = Object.keys(tasksByCategory).sort(
    (a, b) => tasksByCategory[a].sortOrder - tasksByCategory[b].sortOrder
  );

  const activeTasks = filteredTasks.filter(t => t.currentStatus !== 'COMPLETED' && t.currentStatus !== 'CANCELLED');
  const completedTasks = filteredTasks.filter(t => t.currentStatus === 'COMPLETED' || t.currentStatus === 'CANCELLED');


  return (
    <div className="max-w-7xl mx-auto mt-8">
      {weddingId && (
        <div className="mb-4">
          <button
            onClick={() => navigate('/my-weddings')}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm"
          >
            ← Back to Weddings
          </button>
        </div>
      )}
      
      <Card className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">
          {weddingId && weddingName ? `${weddingName} - Tasks` : 'My Tasks'}
        </h2>
        <p className="text-slate-400">
          {currentUser?.name} • {activeTasks.length} active task{activeTasks.length !== 1 ? 's' : ''}
          {completedTasks.length > 0 && `, ${completedTasks.length} completed`}
        </p>
      </Card>

      <Card className="mb-6">
        {/* Search and Filter Bar */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex gap-2 flex-wrap items-end">
            <div className="flex gap-2 flex-1 min-w-64">
              <input
                type="text"
                placeholder={`Search by ${searchField}...`}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm placeholder-slate-400"
              />
              <select
                value={searchField}
                onChange={(e) => {
                  setSearchField(e.target.value as SearchField);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              >
                <option value="name">Name</option>
                <option value="dueDate">Due Date</option>
                <option value="category">Category</option>
                <option value="status">Status</option>
                <option value="notes">Notes</option>
              </select>
            </div>
            
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm"
              >
                Clear Filter
              </button>
            )}
          </div>

          {/* Sort and Display Options */}
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex gap-2 items-center">
              <label className="text-sm text-slate-300">Sort by:</label>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              >
                <option value="name">Name</option>
                <option value="dueDate">Due Date</option>
                <option value="category">Category</option>
                <option value="status">Status</option>
              </select>
            </div>
            
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="w-4 h-4"
              />
              Show completed tasks
            </label>
          </div>
        </div>

        {error && <div className="text-sm text-red-400 mb-4">{error}</div>}

        {loading ? (
          <p className="text-slate-400">Loading tasks...</p>
        ) : activeTasks.length === 0 && !showCompleted ? (
          <p className="text-slate-400">No active tasks to display</p>
        ) : (
          <div className="space-y-4">
            {categoriesSorted.length === 0 ? (
              <p className="text-slate-400">No tasks match your search</p>
            ) : (
              categoriesSorted.map(categoryName => {
                const categoryData = tasksByCategory[categoryName];
                const sortedTasks = getSortedTasks(categoryData.tasks);
                const isExpanded = expandedCategories.has(categoryName);
                const activeCategoryTasks = sortedTasks.filter(t => t.currentStatus !== 'COMPLETED' && t.currentStatus !== 'CANCELLED');

                // Pagination
                const tasksToShow = searchTerm ? sortedTasks : sortedTasks;
                const startIdx = searchTerm ? 0 : (currentPage - 1) * itemsPerPage;
                const endIdx = searchTerm ? tasksToShow.length : startIdx + itemsPerPage;
                const paginatedTasks = tasksToShow.slice(startIdx, endIdx);
                const totalPages = Math.ceil(tasksToShow.length / itemsPerPage);

                return (
                  <div key={categoryName} className="border border-slate-700 rounded overflow-hidden">
                    <button
                      onClick={() => toggleCategoryExpanded(categoryName)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800 transition bg-slate-800"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className={`${isExpanded ? 'rotate-90' : ''} transition`}>▶</span>
                        <div className="text-left font-semibold text-slate-100">{categoryName}</div>
                      </div>
                      <span className="text-sm text-slate-300">{activeCategoryTasks.length} active</span>
                    </button>

                    {isExpanded && (
                      <div className="bg-slate-900 border-t border-slate-700">
                        {sortedTasks.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-slate-400">No tasks in this category</div>
                        ) : (
                          <>
                            {paginatedTasks.map(task => {
                              const daysUntil = getDaysUntil(task.dueDate);
                              const unmetDep = getUnmetDependencies(task);
                              const isBlocked = unmetDep !== null || task.currentStatus === 'BLOCKED';
                              const isEditing = editingTask?.id === task.id;

                              return (
                                <div key={task.id} className={`px-4 py-3 border-b border-slate-800 last:border-b-0 ${isEditing ? 'bg-slate-800' : 'hover:bg-slate-800'} transition cursor-pointer`}>
                                  {unmetDep && (
                                    <div className="mb-2 p-2 bg-red-900 border border-red-700 rounded text-sm text-red-200 flex items-center gap-2">
                                      <span>⚠</span>
                                      <span>{unmetDep}</span>
                                    </div>
                                  )}
                                  
                                  {isEditing ? (
                                    // EDIT MODE
                                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                                      {/* Name */}
                                      <div>
                                        <label className="text-xs text-slate-400 block mb-1">Task Name</label>
                                        <input
                                          type="text"
                                          value={editingTask.name}
                                          onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })}
                                          className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                                        />
                                      </div>

                                      {/* Status and Priority */}
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <label className="text-xs text-slate-400 block mb-1">Status</label>
                                          <select
                                            value={editingTask.currentStatus}
                                            onChange={(e) => setEditingTask({ ...editingTask, currentStatus: e.target.value })}
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
                                            onChange={(e) => setEditingTask({ ...editingTask, priority: parseInt(e.target.value) })}
                                            className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                                          >
                                            <option value="0">NORMAL</option>
                                            <option value="2">HIGH</option>
                                            <option value="1">URGENT</option>
                                          </select>
                                        </div>
                                      </div>

                                      {/* Due Date */}
                                      <div>
                                        <label className="text-xs text-slate-400 block mb-1">Due Date</label>
                                        <input
                                          type="date"
                                          value={editingTask.dueDate.split('T')[0]}
                                          onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                                          className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                                        />
                                      </div>

                                      {/* Notes */}
                                      <div>
                                        <label className="text-xs text-slate-400 block mb-1">Notes</label>
                                        <textarea
                                          value={editingTask.notes}
                                          onChange={(e) => setEditingTask({ ...editingTask, notes: e.target.value })}
                                          placeholder="Add notes..."
                                          className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs placeholder-slate-400"
                                          rows={2}
                                        />
                                      </div>

                                      {/* Save Button */}
                                      <div className="flex gap-2 justify-end pt-2">
                                        <button
                                          onClick={() => setEditingTask(null)}
                                          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-white text-xs"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={() => updateTask(task.id)}
                                          disabled={savingTaskId === task.id}
                                          className="px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-white text-xs disabled:opacity-50"
                                        >
                                          Save
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    // VIEW MODE
                                    <div onClick={() => startEditingTask(task)}>
                                      <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex-1">
                                          <h4 className="font-medium text-white break-words">{task.name}</h4>
                                          {task.description && (
                                            <p className="text-xs text-slate-400 mt-1 break-words">{task.description}</p>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex gap-2 mb-2 flex-wrap">
                                        <span
                                          className={`text-xs px-2 py-1 rounded font-semibold ${
                                            task.priority === 1
                                              ? 'bg-red-900 text-red-200'
                                              : task.priority === 2
                                              ? 'bg-amber-900 text-amber-200'
                                              : 'bg-slate-700 text-slate-200'
                                          }`}
                                        >
                                          {getPriorityLabel(task.priority)}
                                        </span>
                                        <span
                                          className={`text-xs px-2 py-1 rounded ${
                                            task.currentStatus === 'IN_PROGRESS'
                                              ? 'bg-blue-900 text-blue-200'
                                              : task.currentStatus === 'BLOCKED'
                                              ? 'bg-red-900 text-red-200'
                                              : task.currentStatus === 'COMPLETED'
                                              ? 'bg-green-900 text-green-200'
                                              : task.currentStatus === 'CANCELLED'
                                              ? 'bg-slate-700 text-slate-300'
                                              : 'bg-slate-700 text-slate-200'
                                          }`}
                                        >
                                          {task.currentStatus.replace('_', ' ')}
                                        </span>
                                      </div>

                                      {task.notes && (
                                        <div className="mb-2 text-xs text-slate-300 bg-slate-800 p-2 rounded">
                                          <span className="font-semibold">Notes:</span> {task.notes}
                                        </div>
                                      )}

                                      <div className="text-xs text-slate-400 flex items-center gap-3">
                                        <span className="py-1 px-2 bg-slate-700 rounded">
                                          {new Date(task.dueDate).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                          })}
                                        </span>
                                        <span className={`py-1 px-2 rounded text-xs font-semibold ${getUrgencyColor(daysUntil).split(' ')[0]} ${getUrgencyColor(daysUntil).split(' ')[1]}`}>
                                          {daysUntil < 0
                                            ? `${Math.abs(daysUntil)}d ago`
                                            : daysUntil === 0
                                            ? 'Today'
                                            : `${daysUntil}d away`}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            
                            {/* Pagination */}
                            {!searchTerm && totalPages > 1 && (
                              <div className="px-4 py-3 border-t border-slate-700 flex justify-between items-center text-sm text-slate-400">
                                <div>
                                  Page {currentPage} of {totalPages}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-white text-xs"
                                  >
                                    Previous
                                  </button>
                                  <button
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-white text-xs"
                                  >
                                    Next
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
