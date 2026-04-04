import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui';
import { Button } from '../../components/ui';
import {Input} from '../../components/ui';
import { api } from '../../lib/api';

interface Task {
  id: string;
  name: string;
  description?: string;
  dueDate: string;
  priority: number;
  currentStatus: string;
  category: {
    id: string;
    name: string;
    weddingId: string;
  };
  dependsOn?: {
    id: string;
    name: string;
    currentStatus: string;
  } | null;
}

interface WeddingInfo {
  id: string;
  spouse1?: { name: string } | null;
  spouse2?: { name: string } | null;
}

export default function PlanningDashboard({ currentUser }: { currentUser?: any }) {
  const navigate = useNavigate();
  const [upcomingTasks, setUpcomingTasks] = useState<Array<{ task: Task; wedding?: WeddingInfo }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredUpcomingTasks = upcomingTasks.filter(({ task, wedding }) => {
    const searchLower = searchTerm.toLowerCase();
    const taskName = task.name.toLowerCase();
    const weddingName = wedding ? 
      `${wedding.spouse1?.name || ''} ${wedding.spouse2?.name || ''}`.toLowerCase() :
      '';
    const category = task.category?.name?.toLowerCase() || '';
    return taskName.includes(searchLower) ||
           weddingName.includes(searchLower) ||
           category.includes(searchLower);
  });

  useEffect(() => {
    loadUpcomingTasks();
  }, []);

  const loadUpcomingTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const tasksRes = await api('/tasks/assigned/me');
      if (!tasksRes.ok) {
        setError('Failed to load tasks');
        setLoading(false);
        return;
      }

      const allTasks = Array.isArray(tasksRes.body) ? tasksRes.body : [];
      
      // Filter for uncompleted tasks only
      const uncompletedTasks = allTasks.filter(
        (t: Task) => t.currentStatus !== 'COMPLETED' && t.currentStatus !== 'CANCELLED'
      );

      // Sort by due date
      uncompletedTasks.sort(
        (a: Task, b: Task) =>
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );

      // Get tasks without dependencies
      const tasksWithoutDeps = uncompletedTasks.filter((t: Task) => !t.dependsOn);
      
      // Take first 10 tasks without dependencies
      let upcomingList = tasksWithoutDeps.slice(0, 10);

      // If we need more tasks to reach 10, add tasks with dependencies (showing their dependencies)
      if (upcomingList.length < 10) {
        const tasksWithDeps = uncompletedTasks.filter((t: Task) => t.dependsOn);
        upcomingList = [...upcomingList, ...tasksWithDeps].slice(0, 10);
      }

      // Fetch wedding info for context
      const tasksByWedding: { [key: string]: WeddingInfo } = {};
      for (const task of upcomingList) {
        const weddingId = task.category.weddingId;
        if (!tasksByWedding[weddingId]) {
          try {
            const weddingRes = await api(`/weddings/${weddingId}`);
            if (weddingRes.ok) {
              tasksByWedding[weddingId] = weddingRes.body;
            }
          } catch (err) {
            console.error('Failed to load wedding info:', err);
          }
        }
      }

      setUpcomingTasks(
        upcomingList.map((task: Task) => ({
          task,
          wedding: tasksByWedding[task.category.weddingId]
        }))
      );
    } catch (err) {
      setError('An error occurred while loading tasks');
      console.error(err);
    } finally {
      setLoading(false);
    }
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
    if (daysUntil < 0) return 'text-destructive-foreground bg-destructive';
    if (daysUntil === 0) return 'text-destructive-foreground bg-destructive';
    if (daysUntil <= 7) return 'text-secondary-foreground bg-secondary';
    return 'text-secondary-foreground bg-secondary';
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

  const getWeddingName = (wedding?: WeddingInfo): string => {
    if (!wedding) return 'Wedding';
    const spouse1 = wedding.spouse1?.name;
    const spouse2 = wedding.spouse2?.name;
    if (spouse1 && spouse2) return `${spouse1} & ${spouse2}'s Wedding`;
    if (spouse1) return `${spouse1}'s Wedding`;
    if (spouse2) return `${spouse2}'s Wedding`;
    return 'Wedding';
  };

  return (
    <div className="max-w-6xl mx-auto mt-8">
      <Card className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Dashboard</h2>
        <p className="text-foreground">Welcome, {currentUser?.name}!</p>
      </Card>

      <div className="mb-6 flex gap-2">
        <Button onClick={() => navigate('/my-weddings')}>
          View All Weddings
        </Button>
        <Button onClick={() => navigate('/')} variant="secondary">
          View All Tasks
        </Button>
      </div>

      <Card className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Your 10 Upcoming Tasks</h3>

        {error && <div className="text-sm text-red-400 mb-4">{error}</div>}

        {loading ? (
          <p className="text-foreground">Loading tasks...</p>
        ) : (
          <>
            <Input
              type="text"
              placeholder="Search tasks by name, wedding, or category..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="mb-4"
            />
            {filteredUpcomingTasks.length === 0 && upcomingTasks.length > 0 ? (
              <p className="text-foreground mt-4">No tasks match your search.</p>
            ) : upcomingTasks.length === 0 ? (
              <p className="text-foreground mt-4">No upcoming tasks at the moment - great work!</p>
            ) : (
              <div className="space-y-2 mt-4">
              {filteredUpcomingTasks.map(({ task, wedding }) => {
              const daysUntil = getDaysUntil(task.dueDate);
              const hasUnmetDependency = task.dependsOn && task.dependsOn.currentStatus !== 'COMPLETED';

              return (
                <div
                  key={task.id}
                  className={`p-3 border border-pink-700 rounded hover:bg-primary transition cursor-pointer ${
                    hasUnmetDependency ? 'opacity-75' : ''
                  }`}
                  onClick={() => navigate(`/my-weddings/${task.category.weddingId}/tasks`)}
                >
                  {hasUnmetDependency && (
                    <div className="mb-2 p-2 bg-red-900 border border-red-700 rounded text-sm text-red-200">
                      ⚠ Blocked: Waiting on "{task.dependsOn!.name}"
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-white wrap-break-word">{task.name}</h4>
                      <div className="text-xs text-foreground mt-1">
                        <div className="font-semibold">{getWeddingName(wedding)}</div>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs bg-primary px-2 py-1 rounded">
                            {task.category.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 items-start shrink-0">
                      <span
                        className={`text-xs px-2 py-1 rounded font-semibold ${
                          task.priority === 1
                            ? 'bg-red-900 text-red-200'
                            : task.priority === 2
                            ? 'bg-amber-900 text-amber-200'
                            : 'bg-primary text-foreground'
                        }`}
                      >
                        {getPriorityLabel(task.priority)}
                      </span>
                      <div className="text-right">
                        <div className="font-medium text-white text-sm">
                          {new Date(task.dueDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded block font-semibold ${getUrgencyColor(daysUntil).split(' ')[0]} ${getUrgencyColor(daysUntil).split(' ')[1]}`}
                        >
                          {daysUntil < 0
                            ? `${Math.abs(daysUntil)}d ago`
                            : daysUntil === 0
                            ? 'Today'
                            : `${daysUntil}d away`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
