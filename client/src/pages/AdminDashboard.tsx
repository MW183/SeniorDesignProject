import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui';
import { Button } from '../components/ui';
import { Input } from '../components/ui';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '../components/ui/command';
import Table from '../components/ui/table';
import { api } from '../lib/api';


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
        new Date(b.wedding.date).getTime() - new Date(a.wedding.date).getTime()
      ));
    } catch (err) {
      setError('Failed to load statistics');
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { 
      key: 'planner', 
      label: 'Planner', 
      className: 'text-left pb-2 w-1/4',
      render: (stat: PlannerStats) => (
        <div>
          <div className="font-medium">{stat.planner.name}</div>
          <div className="text-sm text-slate-400">{stat.planner.email}</div>
        </div>
      )
    },
    { 
      key: 'totalTasks', 
      label: 'Total Tasks', 
      className: 'text-center pb-2 w-[100px]'
    },
    { 
      key: 'pending', 
      label: 'Pending', 
      className: 'text-center pb-2 w-[100px]',
      render: (stat: PlannerStats) => (
        <span className="text-yellow-400">{stat.pending}</span>
      )
    },
    { 
      key: 'inProgress', 
      label: 'In Progress', 
      className: 'text-center pb-2 w-[100px]',
      render: (stat: PlannerStats) => (
        <span className="text-blue-400">{stat.inProgress}</span>
      )
    },
    { 
      key: 'completed', 
      label: 'Completed', 
      className: 'text-center pb-2 w-[100px]',
      render: (stat: PlannerStats) => (
        <span className="text-green-400">{stat.completed}</span>
      )
    },
    { 
      key: 'blocked', 
      label: 'Blocked', 
      className: 'text-center pb-2 w-[100px]',
      render: (stat: PlannerStats) => (
        <span className="text-red-400">{stat.blocked}</span>
      )
    },
    { 
      key: 'cancelled', 
      label: 'Cancelled', 
      className: 'text-center pb-2 w-[100px]',
      render: (stat: PlannerStats) => (
        <span className="text-gray-400">{stat.cancelled}</span>
      )
    },
  ];

  const weddingColumns = [
    { 
      key: 'wedding', 
      label: 'Wedding', 
      className: 'text-left pb-2 w-1/3',
      render: (stat: WeddingStats) => (
        <div>
          <div className="font-medium">{stat.wedding.spouse1Name} & {stat.wedding.spouse2Name}</div>
          <div className="text-sm text-slate-400">{new Date(stat.wedding.date).toLocaleDateString()}</div>
        </div>
      )
    },
    { 
      key: 'planner', 
      label: 'Planner', 
      className: 'text-left pb-2 w-1/4',
      render: (stat: WeddingStats) => (
        <div className="font-medium">{stat.planner?.name || 'Unassigned'}</div>
      )
    },
    { 
      key: 'pending', 
      label: 'Pending', 
      className: 'text-center pb-2 w-[80px]',
      render: (stat: WeddingStats) => (
        <span className="text-yellow-400">{stat.pending}</span>
      )
    },
    { 
      key: 'inProgress', 
      label: 'In Progress', 
      className: 'text-center pb-2 w-[100px]',
      render: (stat: WeddingStats) => (
        <span className="text-blue-400">{stat.inProgress}</span>
      )
    },
    { 
      key: 'completed', 
      label: 'Completed', 
      className: 'text-center pb-2 w-[100px]',
      render: (stat: WeddingStats) => (
        <span className="text-green-400">{stat.completed}</span>
      )
    },
    { 
      key: 'blocked', 
      label: 'Blocked', 
      className: 'text-center pb-2 w-[80px]',
      render: (stat: WeddingStats) => (
        <span className="text-red-400">{stat.blocked}</span>
      )
    },
    { 
      key: 'cancelled', 
      label: 'Cancelled', 
      className: 'text-center pb-2 w-[100px]',
      render: (stat: WeddingStats) => (
        <span className="text-gray-400">{stat.cancelled}</span>
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
        <Card className="mb-6 border-red-700 bg-red-950">
          <CardContent className="pt-6">
            <p className="text-red-300">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Management Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate('/manage-weddings')} variant="outline">
              Manage Weddings
            </Button>
            <Button onClick={() => navigate('/manage-planners')} variant="outline">
              Manage Planners
            </Button>
            <Button onClick={() => navigate('/create-wedding')} variant="outline">
              Create New Wedding
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Wedding Stats */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Wedding Stats</CardTitle>
          <CardDescription>Task breakdown per wedding</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-400">Loading...</p>
          ) : weddingStats.length === 0 ? (
            <p className="text-slate-400">No weddings found.</p>
          ) : (
            <Table 
              columns={weddingColumns} 
              data={weddingStats.map(stat => ({
                ...stat,
                id: stat.wedding.id
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
