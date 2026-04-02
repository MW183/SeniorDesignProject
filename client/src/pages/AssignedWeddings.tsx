import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/ui';
import { Button } from '../components/ui';
import { Input } from '../components/ui';
import { useNavigate } from 'react-router-dom';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Wedding {
  id: string;
  date: string;
  spouse1?: Client | null;
  spouse2?: Client | null;
  categories?: Array<{
    id: string;
    name: string;
    tasks?: Array<{
      id: string;
      currentStatus: string;
    }>;
  }>;
}

export default function AssignedWeddings({ currentUser }: { currentUser?: any }) {
  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const filteredWeddings = weddings.filter(wedding => {
    const searchLower = searchTerm.toLowerCase();
    const spouse1Name = wedding.spouse1?.name?.toLowerCase() || '';
    const spouse2Name = wedding.spouse2?.name?.toLowerCase() || '';
    return spouse1Name.includes(searchLower) || spouse2Name.includes(searchLower);
  });

  useEffect(() => {
    loadWeddings();
  }, []);

  const loadWeddings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api('/weddings');
      if (res.ok) {
        const allWeddings = Array.isArray(res.body) ? res.body : [];
        // Sort by wedding date (soonest first)
        const sorted = allWeddings.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        setWeddings(sorted);
      } else {
        setError('Failed to load weddings');
      }
    } catch (err) {
      setError('An error occurred while loading weddings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getClientNames = (wedding: Wedding): string => {
    const names = [];
    if (wedding.spouse1?.name) names.push(wedding.spouse1.name);
    if (wedding.spouse2?.name) names.push(wedding.spouse2.name);
    
    if (names.length === 0) return 'Wedding';
    if (names.length === 1) return `${names[0]}'s Wedding`;
    return `${names.join(' & ')}'s Wedding`;
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntil = (dateStr: string) => {
    const weddingDate = new Date(dateStr);
    weddingDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = weddingDate.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const getUrgencyColor = (daysUntil: number) => {
    if (daysUntil < 0) return 'bg-red-950 border-red-700 text-red-200';
    if (daysUntil === 0) return 'bg-red-900 border-red-700 text-red-200';
    if (daysUntil <= 7) return 'bg-amber-900 border-amber-700 text-amber-200';
    return 'bg-slate-800 border-slate-700 text-slate-300';
  };

  return (
    <div className="max-w-6xl mx-auto mt-8">
      <Card className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Your Weddings</h2>
            <p className="text-slate-400">
              {currentUser?.name} • {weddings.length} assigned wedding{weddings.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button 
            onClick={() => loadWeddings()} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </Card>

      {error && (
        <Card className="mb-6">
          <div className="text-red-400">{error}</div>
        </Card>
      )}

      {/* Search */}
      <Card className="mb-6">
        <Input
          type="text"
          placeholder="Search weddings by couple name..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="mb-2"
        />
      </Card>

      {loading ? (
        <Card>
          <p className="text-slate-400">Loading weddings...</p>
        </Card>
      ) : filteredWeddings.length === 0 && weddings.length > 0 ? (
        <Card>
          <p className="text-slate-400">No weddings match your search.</p>
        </Card>
      ) : weddings.length === 0 ? (
        <Card>
          <p className="text-slate-400">No weddings assigned yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredWeddings.map(wedding => {
            const { remaining, total } = getTaskCounts(wedding);
            const daysUntil = getDaysUntil(wedding.date);
            const urgencyClass = getUrgencyColor(daysUntil);

            return (
              <Card
                key={wedding.id}
                className={`border-l-4 cursor-pointer hover:bg-slate-700 transition ${urgencyClass.split(' ')[0]} ${urgencyClass.split(' ')[1]}`}
              >
                <button
                  onClick={() => navigate(`/my-weddings/${wedding.id}/tasks`)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{getClientNames(wedding)}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-300">
                        <span className="font-medium">{formatDate(wedding.date)}</span>
                        <span className="text-slate-400">
                          {daysUntil < 0
                            ? `${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} ago`
                            : daysUntil === 0
                            ? 'Today'
                            : `${daysUntil} day${daysUntil !== 1 ? 's' : ''} away`}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-white">{remaining}/{total} tasks</div>
                      <div className="text-xs text-slate-400">
                        {remaining === 0 ? 'All done!' : `${remaining} remaining`}
                      </div>
                    </div>
                  </div>
                </button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
