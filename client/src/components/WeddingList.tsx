import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { api } from '../lib/api';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

type Wedding = {
  id: string;
  date: string;
  spouse1Id?: string;
  spouse2Id?: string;
  locationId?: string;
  tasksRemaining?: number;
  createdAt: string;
};

const WeddingList = forwardRef(function WeddingList({ currentUser }: { currentUser?: any }, ref) {
  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api('/weddings');
      if (res.ok) {
        setWeddings(Array.isArray(res.body) ? res.body : []);
      }
    } catch (error) {
      console.error('Failed to load weddings:', error);
    }
    setLoading(false);
  }

  useImperativeHandle(ref, () => ({ load }));

  useEffect(() => { load(); }, []);

  async function deleteWedding(weddingId: string) {
    if (!confirm('Remove yourself from this wedding?')) return;
    const res = await api(`/weddings/${weddingId}`, { method: 'DELETE' });
    if (res.ok) {
      load();
    } else {
      alert(res.body?.error || 'Failed to remove from wedding');
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const columns = [
    {
      key: 'date',
      label: 'Wedding Date',
      className: 'text-left pb-2 w-1/4',
      render: (wedding: Wedding) => (
        <span className="font-medium">{formatDate(wedding.date)}</span>
      )
    },
    {
      key: 'tasksRemaining',
      label: 'Remaining Tasks',
      className: 'text-center pb-2 w-1/6',
      render: (wedding: Wedding) => (
        <span>{wedding.tasksRemaining ?? 0}</span>
      )
    },
    {
      key: 'createdAt',
      label: 'Created',
      className: 'text-left pb-2 w-1/4',
      render: (wedding: Wedding) => (
        <span className="text-sm text-slate-400">{formatDate(wedding.createdAt)}</span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-center pb-2 w-[100px]',
      render: (wedding: Wedding) => (
        <div className="flex gap-2 justify-center">
          <Button variant="danger" size="sm" onClick={() => deleteWedding(wedding.id)}>
            Remove
          </Button>
        </div>
      )
    }
  ];

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <h3 className="text-lg font-semibold m-0">Your Weddings</h3>
        <p className="m-0 text-sm text-slate-400">
          {weddings.length} wedding{weddings.length !== 1 ? 's' : ''}
        </p>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : weddings.length === 0 ? (
        <p className="text-slate-400">No weddings assigned yet.</p>
      ) : (
        <Table columns={columns} data={weddings} />
      )}
    </Card>
  );
});

export default WeddingList;
