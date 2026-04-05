import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui';
import { Button } from '../../components/ui';
import { Input } from '../../components/ui';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '../../components/ui/command';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../../components/ui';
import Table from '../../components/ui/table';
import WeddingDetailsEditor from '../../components/WeddingDetailsEditor';
import { api } from '../../lib/api';

type Task = {
  id: string;
  name: string;
  description?: string;
  currentStatus: string;
  priority: number;
  dueDate: string;
  notes?: string;
  category?: {
    id: string;
    name: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
};


type PlannerStats = {
  planner: {
    id: string;
    name: string;
    email: string;
  };
  totalTasks: number;
  pending: number;
  inProgress: number;
  completed: number;
  blocked: number;
  cancelled: number;
};

type WeddingStats = {
  wedding: {
    id: string;
    spouse1Name: string;
    spouse2Name: string;
    date: string;
  };
  planner: {
    id: string;
    name: string;
  } | null;
  totalTasks: number;
  pending: number;
  inProgress: number;
  completed: number;
  blocked: number;
  cancelled: number;
};
export default function AdminDashboard({ currentUser }: { currentUser?: any }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlannerStats[]>([]);
  const [weddingStats, setWeddingStats] = useState<WeddingStats[]>([]);
  const [SearchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedWeddingId, setExpandedWeddingId] = useState<string | null>(null);
  const [blockedTasks, setBlockedTasks] = useState<Map<string, Task[]>>(new Map());
  const [loadingBlockedTasks, setLoadingBlockedTasks] = useState<Set<string>>(new Set());

  const filteredStats = stats.filter(stat =>
    stat.planner.name.toLowerCase().includes(SearchTerm.toLowerCase()) ||
    stat.planner.email.toLowerCase().includes(SearchTerm.toLowerCase())
  );

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all tasks
      const tasksRes = await api('/tasks');
      const tasks = tasksRes.ok && Array.isArray(tasksRes.body) ? tasksRes.body : [];

      // Fetch all users (planners)
      const usersRes = await api('/users');
      const users = usersRes.ok && Array.isArray(usersRes.body) ? usersRes.body : [];

      // Fetch all weddings
      const weddingsRes = await api('/weddings?limit=1000');
      const weddings = weddingsRes.ok && Array.isArray(weddingsRes.body) ? weddingsRes.body : [];

      // Group tasks by planner and count statuses
      const plannerMap = new Map<string, PlannerStats>();

      users.forEach((user: any) => {
        if (user.role === 'USER' || user.role === 'SUPPORT') {
          plannerMap.set(user.id, {
            planner: { id: user.id, name: user.name, email: user.email },
            totalTasks: 0,
            pending: 0,
            inProgress: 0,
            completed: 0,
            blocked: 0,
            cancelled: 0,
          });
        }
      });

      tasks.forEach((task: any) => {
        if (task.assignedToId && plannerMap.has(task.assignedToId)) {
          const plannerStats = plannerMap.get(task.assignedToId)!;
          plannerStats.totalTasks++;
          
          switch (task.currentStatus) {
            case 'PENDING':
              plannerStats.pending++;
              break;
            case 'IN PROGRESS':
              plannerStats.inProgress++;
              break;
            case 'COMPLETED':
              plannerStats.completed++;
              break;
            case 'BLOCKED':
              plannerStats.blocked++;
              break;
            case 'CANCELLED':
              plannerStats.cancelled++;
              break;
          }
        }
      });

      // Log tasks for debugging
      console.log('Total tasks:', tasks.length);
      console.log('Tasks with weddingId:', tasks.filter((t: any) => t.category?.weddingId).length);
      console.log('Completed tasks:', tasks.filter((t: any) => t.currentStatus === 'COMPLETED'));

      // Group tasks by wedding and count statuses
      const weddingMap = new Map<string, WeddingStats>();

      weddings.forEach((wedding: any) => {
        const primaryPlanner = wedding.planners?.[1];
        console.log('Wedding:', wedding.spouse1?.name, '- Planners:', wedding.planners);
        weddingMap.set(wedding.id, {
          wedding: {
            id: wedding.id,
            spouse1Name: wedding.spouse1?.name || 'Unknown',
            spouse2Name: wedding.spouse2?.name || 'Unknown',
            date: wedding.date
          },
          planner: primaryPlanner ? { id: primaryPlanner.planner.id, name: primaryPlanner.planner.name } : null,
          totalTasks: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
          blocked: 0,
          cancelled: 0,
        });
      });

      tasks.forEach((task: any) => {
        const weddingId = task.category?.weddingId;
        if (weddingId && weddingMap.has(weddingId)) {
          const weddingStats = weddingMap.get(weddingId)!;
          weddingStats.totalTasks++;
          
          switch (task.currentStatus) {
            case 'PENDING':
              weddingStats.pending++;
              break;
            case 'IN PROGRESS':
              weddingStats.inProgress++;
              break;
            case 'COMPLETED':
              weddingStats.completed++;
              break;
            case 'BLOCKED':
              weddingStats.blocked++;
              break;
            case 'CANCELLED':
              weddingStats.cancelled++;
              break;
          }
        }
      });

      setStats(Array.from(plannerMap.values()));
      setWeddingStats(Array.from(weddingMap.values()).sort((a, b) => 
        new Date(b.wedding.date.split('T')[0] + 'T00:00:00Z').getTime() - new Date(a.wedding.date.split('T')[0] + 'T00:00:00Z').getTime()
      ));
    } catch (err) {
      setError('Failed to load statistics');
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBlockedTasks = async (weddingId: string) => {
    try {
      setLoadingBlockedTasks(prev => new Set(prev).add(weddingId));
      const res = await api(`/tasks?weddingId=${weddingId}&status=BLOCKED`);
      if (res.ok && Array.isArray(res.body)) {
        setBlockedTasks(prev => new Map(prev).set(weddingId, res.body));
      }
    } catch (err) {
      console.error('Failed to load blocked tasks:', err);
    } finally {
      setLoadingBlockedTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(weddingId);
        return newSet;
      });
    }
  };

  const columns = [
    { 
      key: 'planner', 
      label: 'Planner', 
      className: 'text-left pb-2 min-w-[200px]',
      render: (stat: PlannerStats) => (
        <div>
          <div className="font-medium text-foreground">{stat.planner.name}</div>
          <div className="text-sm text-foreground">{stat.planner.email}</div>
        </div>
      )
    },
    { 
      key: 'totalTasks', 
      label: 'Total Tasks', 
      className: 'text-center pb-2 min-w-[85px]'
    },
    { 
      key: 'pending', 
      label: 'Pending', 
      className: 'text-center pb-2 min-w-[70px]',
      render: (stat: PlannerStats) => (
        <span className="text-foreground">{stat.pending}</span>
      )
    },
    { 
      key: 'inProgress', 
      label: 'In Progress', 
      className: 'text-center pb-2 min-w-[85px]',
      render: (stat: PlannerStats) => (
        <span className="text-foreground">{stat.inProgress}</span>
      )
    },
    { 
      key: 'completed', 
      label: 'Completed', 
      className: 'text-center pb-2 min-w-[85px]',
      render: (stat: PlannerStats) => (
        <span className="text-foreground">{stat.completed}</span>
      )
    },
    { 
      key: 'blocked', 
      label: 'Blocked', 
      className: 'text-center pb-2 min-w-[60px]',
      render: (stat: PlannerStats) => (
        <span className="text-destructive-foreground">{stat.blocked}</span>
      )
    },
    { 
      key: 'cancelled', 
      label: 'Cancelled', 
      className: 'text-center pb-2 min-w-[70px]',
      render: (stat: PlannerStats) => (
        <span className="text-muted-foreground">{stat.cancelled}</span>
      )
    },
  ];

  const weddingColumns = [
    { 
      key: 'wedding', 
      label: 'Wedding', 
      className: 'text-left pb-2 min-w-[200px]',
      render: (stat: WeddingStats) => (
        <button
          onClick={() => navigate(`/weddings/${stat.wedding.id}`)}
          className="text-left hover:opacity-70 transition"
        >
          <div className="font-medium text-foreground hover:underline cursor-pointer">{stat.wedding.spouse1Name} & {stat.wedding.spouse2Name}</div>
          <div className="text-sm text-foreground">{(() => { const [year, month, day] = stat.wedding.date.split('T')[0].split('-'); return `${month}/${day}/${year}`; })()}</div>
        </button>
      )
    },
    { 
      key: 'planner', 
      label: 'Planner', 
      className: 'text-left pb-2 min-w-[140px]',
      render: (stat: WeddingStats) => (
        <div className="font-medium">{stat.planner?.name || 'Unassigned'}</div>
      )
    },
    { 
      key: 'pending', 
      label: 'Pending', 
      className: 'text-center pb-2 min-w-[70px]',
      render: (stat: WeddingStats) => (
        <span className="text-foreground">{stat.pending}</span>
      )
    },
    { 
      key: 'inProgress', 
      label: 'In Progress', 
      className: 'text-center pb-2 min-w-[85px]',
      render: (stat: WeddingStats) => (
        <span className="text-foreground">{stat.inProgress}</span>
      )
    },
    { 
      key: 'completed', 
      label: 'Completed', 
      className: 'text-center pb-2 min-w-[85px]',
      render: (stat: WeddingStats) => (
        <span className="text-foreground">{stat.completed}</span>
      )
    },
    { 
      key: 'blocked', 
      label: 'Blocked', 
      className: 'text-center pb-2 min-w-[60px]',
      render: (stat: WeddingStats) => (
        <span className="text-foreground">{stat.blocked}</span>
      )
    },
    { 
      key: 'cancelled', 
      label: 'Cancelled', 
      className: 'text-center pb-2 min-w-[70px]',
      render: (stat: WeddingStats) => (
        <span className="text-muted-foreground">{stat.cancelled}</span>
      )
    },
  ];

  return (
    <div className="max-w-6xl mx-auto mt-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">Admin Dashboard</CardTitle>
          <CardDescription>Welcome, {currentUser?.name}!</CardDescription>
        </CardHeader>
      </Card>

      {error && (
        <Card className="mb-6 border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-red-300">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Wedding Stats */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Wedding Stats</CardTitle>
            <CardDescription>Task breakdown per wedding</CardDescription>
          </div>
          <Button onClick={() => navigate('/create-wedding')} className="whitespace-nowrap">
            + Create New Wedding
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="secondary-foreground">Loading...</p>
          ) : weddingStats.length === 0 ? (
            <p className="secondary-foreground">No weddings found.</p>
          ) : (
            <div className="space-y-3">
              {weddingStats.map((stat) => {
                const isExpanded = expandedWeddingId === stat.wedding.id;

                return (
                  <div key={stat.wedding.id} className="border rounded-lg overflow-hidden">
                    {/* Header - Planner Stats (visible when collapsed) */}
                    {!isExpanded && (
                      <div className="p-4 hover:bg-accent/30 transition">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 text-left">
                            <h4 className="font-medium text-foreground text-lg">{stat.wedding.spouse1Name} & {stat.wedding.spouse2Name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{(() => { const [year, month, day] = stat.wedding.date.split('T')[0].split('-'); return `${month}/${day}/${year}`; })()}</p>
                            {stat.planner && (
                              <p className="text-sm text-muted-foreground mt-1">Planner: <span className="font-medium">{stat.planner.name}</span></p>
                            )}
                          </div>
                          <div className="flex gap-4 text-sm">
                            <div className="text-center">
                              <div className="font-medium text-foreground">{stat.pending}</div>
                              <div className="text-xs text-muted-foreground">Pending</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-foreground">{stat.inProgress}</div>
                              <div className="text-xs text-muted-foreground">In Progress</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-foreground">{stat.completed}</div>
                              <div className="text-xs text-muted-foreground">Completed</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-destructive-foreground">{stat.blocked}</div>
                              <div className="text-xs text-muted-foreground">Blocked</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-muted-foreground">{stat.cancelled}</div>
                              <div className="text-xs text-muted-foreground">Cancelled</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Two-Part Collapsible Container */}
                    <div className="flex border-t">
                      {/* LEFT: Wedding Details Editor */}
                      <Collapsible
                        open={isExpanded}
                        onOpenChange={(isOpen) => setExpandedWeddingId(isOpen ? stat.wedding.id : null)}
                        className="flex-1 w-1/2"
                      >
                        <CollapsibleTrigger className="w-full p-4 text-left hover:bg-accent/30 transition border-r">
                          <div className="font-semibold text-foreground">Wedding Management</div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="col-span-1">
                          <div className="p-4 bg-muted/50 border-t border-r">
                            <WeddingDetailsEditor
                              weddingId={stat.wedding.id}
                              currentUser={currentUser}
                              onUpdate={() => loadStats()}
                            />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      {/* RIGHT: Blocked Tasks */}
                      <Collapsible
                        open={isExpanded}
                        onOpenChange={(isOpen) => {
                          setExpandedWeddingId(isOpen ? stat.wedding.id : null);
                          if (isOpen) {
                            loadBlockedTasks(stat.wedding.id);
                          }
                        }}
                        className="flex-1"
                      >
                        <CollapsibleTrigger className="w-full p-4 text-left hover:bg-accent/30 transition">
                          <div className="font-semibold text-foreground">Blocked Tasks</div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="col-span-1">
                          <div className="p-4 bg-muted/50 border-t">
                            {loadingBlockedTasks.has(stat.wedding.id) ? (
                              <p className="text-sm text-foreground">Loading blocked tasks...</p>
                            ) : blockedTasks.get(stat.wedding.id)?.length === 0 ? (
                              <p className="text-sm text-foreground">No blocked tasks for this wedding</p>
                            ) : (
                              <div className="space-y-3">
                                {blockedTasks.get(stat.wedding.id)?.map((task) => (
                                  <div key={task.id} className="bg-card border rounded-sm p-3 space-y-2">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <h4 className="font-medium text-foreground">{task.name}</h4>
                                        {task.description && (
                                          <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                      <span className="text-xs px-2 py-1 rounded bg-destructive text-destructive-foreground">
                                        BLOCKED
                                      </span>
                                      <span className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">
                                        Priority: {task.priority === 1 ? 'URGENT' : task.priority === 2 ? 'HIGH' : 'NORMAL'}
                                      </span>
                                      {task.category && (
                                        <span className="text-xs px-2 py-1 rounded bg-background text-foreground">
                                          {task.category.name}
                                        </span>
                                      )}
                                    </div>
                                    {task.notes && (
                                      <p className="text-xs text-muted-foreground italic">{task.notes}</p>
                                    )}
                                    {task.assignedTo && (
                                      <p className="text-xs text-muted-foreground">
                                        Assigned to: <span className="font-medium">{task.assignedTo.name}</span>
                                      </p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                      Due: {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
