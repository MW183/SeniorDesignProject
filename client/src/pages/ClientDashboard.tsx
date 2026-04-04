import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

/** id, name, description, currentStatus, dueDate, priority
 *  categories: id, name, weddingId, sortOrder */
interface Task {
  id: string;
  name: string;
  description: string | null;
  currentStatus: 'PENDING' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';
  dueDate: string;
  priority: number;
  category: {
    id: string;
    name: string;
    weddingId: string;
    sortOrder: number;
  };
}

//group tasks by category 
interface GroupedTasks {
  [weddingId: string]: {
    wedding: { id: string; date: string };
    categories: {
      [categoryName: string]: Task[];
    };
  };
}

export default function ClientDashboard({ currentUser }: { currentUser: any }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');

  useEffect(() => {
    loadCoupleTasksFunc();
  }, []);
  /** load couple tasks  & handle errors */
  async function loadCoupleTasksFunc() {
    try {
      setLoading(true);
      setError(null);
      const res = await api('/tasks/couple/me');
      if (res.ok && Array.isArray(res.body)) {
        setTasks(res.body);
      } else {
        setError('Failed to load tasks');
      }
    } catch (err) {
      console.error('Error loading couple tasks:', err);
      setError('An error occurred while loading your tasks');
    } finally {
      setLoading(false);
    }
  }


  /** function to update task status */
  async function updateTaskStatus(taskId: string, status: string) {
    try {
      const res = await api(`/tasks/${taskId}`, {
        method: 'PUT',
        body: { currentStatus: status }
      });

      if (res.ok) {
        setTasks(tasks.map(t => t.id === taskId ? {...t, currentStatus: status as 'PENDING' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED'} : t));
        setEditingTaskId(null);
      } else {
        setError(res.body?.error || 'Failed to update task');
      }
    } catch (err) {
      setError('An error occurred while updating the task');
    }
  }

  // Filter and group tasks by wedding and category
  const groupedTasks: GroupedTasks = tasks
    .filter(t => !selectedStatus || t.currentStatus === selectedStatus)
    .reduce((acc, task) => {
      const weddingId = task.category.weddingId;
      const categoryName = task.category.name;

      if (!acc[weddingId]) {
        acc[weddingId] = {
          wedding: { id: weddingId, date: '' }, // Could fetch wedding date if needed
          categories: {}
        };
      }

      if (!acc[weddingId].categories[categoryName]) {
        acc[weddingId].categories[categoryName] = [];
      }

      acc[weddingId].categories[categoryName].push(task);
      return acc;
    }, {} as GroupedTasks);

  const statusColors: Record<string, string> = {
    PENDING: 'bg-secondary text-secondary-foreground',
    IN_PROGRESS: 'bg-secondary text-secondary-foreground',
    BLOCKED: 'bg-destructive text-destructive-foreground',
    COMPLETED: 'bg-primary text-primary-foreground',
    CANCELLED: 'bg-muted text-muted-foreground'
  };

  const priorityLabels: Record<number, string> = {
    1: 'Urgent',
    2: 'High',
    3: 'Normal',
    4: 'Low',
    5: 'Minimal'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-secondary-foreground">Loading your tasks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">My Wedding Tasks</h1>
        <p className="text-secondary-foreground">Track your wedding planning progress</p>
      </div>

      {error && (
        <div className="p-4 bg-destructive/20 border border-destructive rounded text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Status Filter */}
      <Card>
        <h3 className="font-semibold mb-3">Filter by Status</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setSelectedStatus(null)}
            variant={selectedStatus === null ? 'default' : 'outline'}
            className={selectedStatus === null ? 'bg-blue-600' : ''}
          >
            All Tasks ({tasks.length})
          </Button>
          {['PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED'].map(status => {
            const count = tasks.filter(t => t.currentStatus === status).length;
            return (
              <Button
                key={status}
                onClick={() => setSelectedStatus(status)}
                variant={selectedStatus === status ? 'default' : 'outline'}
                className={selectedStatus === status ? 'bg-blue-600' : ''}
              >
                {status.replace('_', ' ')} ({count})
              </Button>
            );
          })}
        </div>
      </Card>

      {/* Tasks Grouped by Wedding and Category */}
      {Object.keys(groupedTasks).length === 0 ? (
        <Card>
          <p className="text-secondary-foreground text-center py-8">
            {selectedStatus ? `No tasks found with status: ${selectedStatus}` : 'No tasks assigned yet'}
          </p>
        </Card>
      ) : (
        Object.entries(groupedTasks).map(([weddingId, weddingData]) => (
          <Card key={weddingId}>
            <h2 className="text-2xl font-semibold mb-6 text-pink-100">Wedding #{weddingId.slice(0, 8)}</h2>

            {Object.entries(weddingData.categories).map(([categoryName, categoryTasks]) => (
              <div key={categoryName} className="mb-8 last:mb-0">
                <h3 className="text-lg font-semibold bg-accent-foreground mb-4 pb-2 border-b border-pink-600">
                  {categoryName}
                </h3>

                <div className="space-y-3">
                  {categoryTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 bg-secondary/30 rounded border border-secondary hover:border-secondary/80 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{task.name}</h4>
                          {task.description && (
                            <p className="text-sm text-secondary-foreground mt-1">{task.description}</p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap ${statusColors[task.currentStatus]}`}>
                          {task.currentStatus.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-secondary-foreground mb-3">
                        <>
                          <span className="bg-accent">Priority: </span>
                          <span className="bg-accent-foreground">{priorityLabels[task.priority] || 'Unknown'}</span>
                        </>
                        <>
                          <span className="bg-accent">Due: </span>
                          <span className="bg-accent-foreground">
                            {new Date(task.dueDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </>
                      </div>

                      {/* Status Update */}
                      {editingTaskId === task.id ? (
                        <div className="flex gap-2 items-center">
                          <select
                            value={newStatus}
                            onChange={e => setNewStatus(e.target.value)}
                            className="flex-1 px-3 py-2 bg-secondary border border-secondary rounded text-sm text-secondary-foreground focus:outline-none focus:border-accent"
                          >
                            <option value="">Select status...</option>
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="BLOCKED">Blocked</option>
                            <option value="COMPLETED">Completed</option>
                          </select>
                          <Button
                            onClick={() => updateTaskStatus(task.id, newStatus)}
                            className="px-3 py-2 bg-primary hover:bg-primary/80 text-xs"
                          >
                            Save
                          </Button>
                          <Button
                            onClick={() => setEditingTaskId(null)}
                            className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => {
                            setEditingTaskId(task.id);
                            setNewStatus(task.currentStatus);
                          }}
                          className="text-xs bg-secondary hover:bg-secondary/80"
                        >
                          Update Status
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        ))
      )}
    </div>
  );
}
