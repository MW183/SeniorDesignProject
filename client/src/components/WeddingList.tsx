import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { api } from '../lib/api';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import CollapsibleSection from './ui/CollapsibleSection';
import WeddingDetailsEditor from './WeddingDetailsEditor';

type Wedding = {
  id: string;
  date: string;
  spouse1Id?: string;
  spouse2Id?: string;
  locationId?: string;
  tasksRemaining?: number;
  categories?: Array<{
    id: string;
    name: string;
    tasks?: Array<{
      id: string;
      currentStatus: string;
      [key: string]: any;
    }>;
  }>;
  createdAt: string;
};

const WeddingList = forwardRef(function WeddingList({ currentUser }: { currentUser?: any }, ref) {
  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedWeddingIds, setExpandedWeddingIds] = useState<Set<string>>(new Set());

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

  const getTaskCounts = (wedding: Wedding) => {
    if (!wedding.categories) return { remaining: 0, total: 0 };
    let total = 0;
    let remaining = 0;
    wedding.categories.forEach(cat => {
      if (cat.tasks) {
        cat.tasks.forEach(task => {
          total++;
          if (task.currentStatus !== 'COMPLETED' && task.currentStatus !== 'CANCELLED') {
            remaining++;
          }
        });
      }
    });
    return { remaining, total };
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
      render: (wedding: Wedding) => {
        const { remaining, total } = getTaskCounts(wedding);
        return <span>{remaining}/{total}</span>;
      }
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
      className: 'text-center pb-2 w-[160px]',
      render: (wedding: Wedding) => {
        const isExpanded = expandedWeddingIds.has(wedding.id);
        return (
          <div className="flex gap-2 justify-center flex-wrap">
            <Button 
              size="sm" 
              onClick={() => {
                const newExpanded = new Set(expandedWeddingIds);
                if (newExpanded.has(wedding.id)) {
                  newExpanded.delete(wedding.id);
                } else {
                  newExpanded.add(wedding.id);
                }
                setExpandedWeddingIds(newExpanded);
              }}
            >
              {isExpanded ? 'Close' : 'Edit'}
            </Button>
            <Button variant="danger" size="sm" onClick={() => deleteWedding(wedding.id)}>
              Remove
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <>
      <Card>
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold m-0">
            {currentUser?.role === 'ADMIN' ? 'All Weddings' : 'Your Weddings'}
          </h3>
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

      {Array.from(expandedWeddingIds).map((weddingId) => {
        const wedding = weddings.find(w => w.id === weddingId);
        if (!wedding) return null;
        return (
          <Card key={weddingId} className="mt-4">
            <CollapsibleSection
              title={`Wedding Details - ${formatDate(wedding.date)}`}
              isExpanded={true}
              onToggle={() => {
                const newExpanded = new Set(expandedWeddingIds);
                newExpanded.delete(weddingId);
                setExpandedWeddingIds(newExpanded);
              }}
            >
              <WeddingDetailsEditor 
                weddingId={weddingId}
                onUpdate={() => load()}
                currentUser={currentUser}
              />
            </CollapsibleSection>
          </Card>
        );
      })}
    </>
  );
});

export default WeddingList;
