import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card } from '../../components/ui';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../../components/ui';
import { Input } from '../../components/ui';

import TaskEditor from '../../components/TaskEditor';

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
type SearchableField = 'name' | 'Due Date' | 'category' | 'status' | 'notes';

export default function PlannerTasks({ currentUser, hideBackButton = false }: { currentUser?: any; hideBackButton?: boolean }) {
  // Get wedding ID from URL params; fetch and display tasks for the current user
  const { weddingId } = useParams<{ weddingId?: string }>();
  const navigate = useNavigate();
  
  // State for all tasks assigned to the user
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for sorting, filtering, and display options
  const [sortMode, setSortMode] = useState<SortMode>('Due Date');
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [weddingName, setWeddingName] = useState<string>('');

  // Filter tasks by search term
  const filteredTasks = tasks.filter(task => {
    const searchLower = searchTerm.toLowerCase();
    return task.name.toLowerCase().includes(searchLower) ||
           (task.description && task.description.toLowerCase().includes(searchLower));
  });

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

  // Apply completed/cancelled filter to filtered tasks
  const getDisplayTasks = () => {
    return showCompleted ? filteredTasks : filteredTasks.filter(t => t.currentStatus !== 'COMPLETED' && t.currentStatus !== 'CANCELLED');
  }
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



  const toggleCategoryExpanded = (category: string, isOpen?: boolean) => {
    const newExpanded = new Set(expandedCategories);
    if (isOpen === undefined) {
      if (newExpanded.has(category)) {
        newExpanded.delete(category);
      } else {
        newExpanded.add(category);
      }
    } else if (isOpen) {
      newExpanded.add(category);
    } else {
      newExpanded.delete(category);
    }
    setExpandedCategories(newExpanded);
  };

  const displayTasks = getDisplayTasks();
  const tasksByCategory = groupTasksByCategory(displayTasks);
  const categoriesSorted = Object.keys(tasksByCategory).sort(
    (a, b) => tasksByCategory[a].sortOrder - tasksByCategory[b].sortOrder
  );

  const activeTasks = tasks.filter(t => t.currentStatus !== 'COMPLETED' && t.currentStatus !== 'CANCELLED');
  const completedTasks = tasks.filter(t => t.currentStatus === 'COMPLETED' || t.currentStatus === 'CANCELLED');

  
  return (
    <div className="max-w-7xl mx-auto mt-8">
      {weddingId && !hideBackButton && (
        <div className="mb-4">
          <button
            onClick={() => navigate('/my-weddings')}
            className="px-3 py-2 bg-primary hover:bg-primary/80 rounded text-primary-foreground text-sm"
          >
            ← Back to Weddings
          </button>
        </div>
      )}
      
      <Card className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">
          {weddingId && weddingName ? `${weddingName} - Tasks` : 'My Tasks'}
        </h2>
        <p className="text-foreground">
          {currentUser?.name} • {activeTasks.length} active task{activeTasks.length !== 1 ? 's' : ''}
          {completedTasks.length > 0 && `, ${completedTasks.length} completed`}
        </p>
      </Card>

      <Card className="mb-6">
        {/* Search Bar */}
        <Input
          type="text"
          placeholder="Search tasks..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="mb-4 bg-input"
        />
        

        {/* Sort and Display Options */}
        <div className="flex justify-between items-center flex-wrap gap-4 mt-4">
          <div className="flex gap-2 items-center">
            <label className="text-sm text-foreground">Sort by:</label>
            <select
              value={sortMode}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortMode(e.target.value as SortMode)}
              className="px-3 py-2 bg-primary border border-secondary rounded text-primary-foreground text-sm"
            >
              <option value="name">Name</option>
              <option value="Due Date">Due Date</option>
              <option value="category">Category</option>
              <option value="status">Status</option>
            </select>
          </div>
          
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowCompleted(e.target.checked)}
              className="w-4 h-4"
            />
            Show completed tasks
          </label>
        </div>
      </Card>

        {error && <div className="text-sm text-red-400 mb-4">{error}</div>}

        {loading ? (
          <p className="text-foreground">Loading tasks...</p>
        ) : activeTasks.length === 0 && !showCompleted ? (
          <p className="text-foreground">No active tasks to display</p>
        ) : (
          <div className="space-y-4">
            {categoriesSorted.length === 0 ? (
              <p className="text-foreground">No tasks match your search</p>
            ) : (
              categoriesSorted.map((categoryName, index) => {
                const categoryData = tasksByCategory[categoryName];
                const sortedTasks = getSortedTasks(categoryData.tasks);
                const isExpanded = expandedCategories.has(categoryName);
                const activeCategoryTasks = sortedTasks.filter(t => t.currentStatus !== 'COMPLETED' && t.currentStatus !== 'CANCELLED');

                return (
                  <Card key={categoryName}>
                    <Collapsible
                      open={isExpanded}
                      onOpenChange={() => toggleCategoryExpanded(categoryName)}
                    >
                      <CollapsibleTrigger className="w-full text-left font-semibold py-2 hover:text-foreground transition-colors">
                        {categoryName}
                      </CollapsibleTrigger>
                      <div className="text-sm text-foreground mb-2">
                        {activeCategoryTasks.length} active task{activeCategoryTasks.length !== 1 ? 's' : ''}
                      </div>
                      <CollapsibleContent>
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
                          onSaveComplete={() => toggleCategoryExpanded(categoryName, false)}
                        />
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
  );
}
