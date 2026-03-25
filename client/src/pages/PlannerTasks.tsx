import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import Card from '../components/ui/Card';
import CollapsibleSection from '../components/ui/CollapsibleSection';
import TaskEditor from '../components/TaskEditor';

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

type SortMode = 'name' | 'Due Date' | 'category' | 'status';
type SearchField = 'name' | 'Due Date' | 'category' | 'status' | 'notes';

export default function PlannerTasks({ currentUser, hideBackButton = false }: { currentUser?: any; hideBackButton?: boolean }) {
  // Get wedding ID from URL params; fetch and display tasks for the current user
  const { weddingId } = useParams<{ weddingId?: string }>();
  const navigate = useNavigate();
  
  // State for all tasks assigned to the user
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for sorting, filtering, and display options
  const [sortMode, setSortMode] = useState<SortMode>('Due Date');
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [weddingName, setWeddingName] = useState<string>('');
  
  // State for search functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<SearchField>('name');

  // Load tasks when the component mounts or wedding ID changes
  useEffect(() => {
    loadTasks();
  }, [weddingId]);

  // Fetch tasks assigned to the current user, optionally filtered by wedding
  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use wedding ID if available to filter tasks for a specific wedding
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

      // Fetch the wedding name 
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

  //filter tasks (used to exclude completed/cancelled tasks)
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
        case 'Due Date':
          const taskDate = new Date(task.dueDate).toLocaleDateString('en-US');
          return taskDate.includes(term);
        default:
          return true;
      }
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
      case 'Due Date':
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
      {weddingId && !hideBackButton && (
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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm placeholder-slate-400"
              />
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value as SearchField)}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              >
                <option value="name">Name</option>
                <option value="Due Date">Due Date</option>
                <option value="category">Category</option>
                <option value="status">Status</option>
                <option value="notes">Notes</option>
              </select>
            </div>
            
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
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
                <option value="Due Date">Due Date</option>
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
              categoriesSorted.map((categoryName, index) => {
                const categoryData = tasksByCategory[categoryName];
                const sortedTasks = getSortedTasks(categoryData.tasks);
                const isExpanded = expandedCategories.has(categoryName);
                const activeCategoryTasks = sortedTasks.filter(t => t.currentStatus !== 'COMPLETED' && t.currentStatus !== 'CANCELLED');

                return (
                  <Card key={categoryName}>
                    <CollapsibleSection
                      title={categoryName}
                      isExpanded={isExpanded}
                      onToggle={() => toggleCategoryExpanded(categoryName)}
                      firstSection={index === 0}
                      summary={
                        <div className="text-sm text-slate-400">
                          {activeCategoryTasks.length} active task{activeCategoryTasks.length !== 1 ? 's' : ''}
                        </div>
                      }
                    >
                      <TaskEditor
                        categoryId={categoryData.tasks[0]?.category.id || ''}
                        categoryName={categoryName}
                        tasks={sortedTasks}
                        weddingId={weddingId || ''}
                        onTasksChange={(updatedTasks) => {
                          setTasks(tasks.filter(t =>
                            !categoryData.tasks.some(ct => ct.id === t.id)
                          ).concat(updatedTasks));
                        }}
                        currentUser={currentUser}
                        showCompleted={showCompleted}
                      />
                    </CollapsibleSection>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
