import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
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

export default function AdminDashboard({ currentUser }: { currentUser?: any }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlannerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      setStats(Array.from(plannerMap.values()));
    } catch (err) {
      setError('Failed to load planner statistics');
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

  return (
    <div className="max-w-6xl mx-auto mt-8">
      <Card className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Admin Dashboard</h2>
        <p className="text-slate-400">Welcome, {currentUser?.name}!</p>
      </Card>

      {error && <Card className="mb-6 border border-red-700 bg-red-950"><p className="text-red-300">{error}</p></Card>}

      {/* Management Actions */}
      <Card className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Management</h3>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate('/manage-weddings')} variant="primary">
            Manage Weddings
          </Button>
          <Button onClick={() => navigate('/manage-planners')} variant="muted">
            Manage Planners
          </Button>
          <Button onClick={() => navigate('/create-wedding')} variant="muted">
            Create New Wedding
          </Button>
        </div>
      </Card>

      {/* Planner Stats */}
      <Card>
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold m-0">Planner Progress</h3>
          <p className="m-0 text-sm text-slate-400">Task distribution across planners</p>
        </div>
        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : stats.length === 0 ? (
          <p className="text-slate-400">No planners found.</p>
        ) : (
          <Table columns={columns} data={stats} />
        )}
      </Card>
    </div>
  );
}
