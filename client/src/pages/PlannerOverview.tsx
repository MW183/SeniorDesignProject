import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';

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
};

export default function PlannerOverview({ currentUser }: { currentUser?: any }) {
  const [stats, setStats] = useState<PlannerStats[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      // Fetch all tasks
      const tasksRes = await api('/tasks');
      const tasks = tasksRes.ok && Array.isArray(tasksRes.body) ? tasksRes.body : [];

      // Fetch all users
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
            case 'IN_PROGRESS':
              plannerStats.inProgress++;
              break;
            case 'COMPLETED':
              plannerStats.completed++;
              break;
            case 'BLOCKED':
              plannerStats.blocked++;
              break;
          }
        }
      });

      setStats(Array.from(plannerMap.values()));
    } catch (error) {
      console.error('Failed to load planner overview:', error);
      setStats([]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

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
  ];

  return (
    <div className="max-w-5xl mx-auto mt-8">
      <Card>
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h2 className="text-2xl font-semibold m-0">Planner Overview</h2>
          <p className="m-0 text-sm text-slate-400">Task distribution across planners</p>
        </div>
        {loading ? (
          <p>Loading...</p>
        ) : stats.length === 0 ? (
          <p className="text-slate-400">No planners found.</p>
        ) : (
          <Table columns={columns} data={stats} />
        )}
      </Card>
    </div>
  );
}
