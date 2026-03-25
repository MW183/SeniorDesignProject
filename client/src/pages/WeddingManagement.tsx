import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import PlannerAssignment from '../components/PlannerAssignment';
import CouplemembersEditor from '../components/CouplemembersEditor';
import VenueEditor from '../components/VenueEditor';
import VendorEditor from '../components/VendorEditor';
import CollapsibleSection from '../components/ui/CollapsibleSection';

interface Wedding {
  id: string;
  date: string;
  spouse1?: { name: string } | null;
  spouse2?: { name: string } | null;
  location?: { street: string; city: string; state: string; zip: string } | null;
  planners?: Array<{ planner: { id: string; name: string; email: string } }>;
}

export default function WeddingManagement({ currentUser }: { currentUser?: any }) {
  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedWeddingId, setExpandedWeddingId] = useState<string | null>(null);
  const [expandedPlannersWeddingId, setExpandedPlannersWeddingId] = useState<string | null>(null);
  const [editingCouplemembersWeddingId, setEditingCouplemembersWeddingId] = useState<string | null>(null);
  const [editingVenueWeddingId, setEditingVenueWeddingId] = useState<string | null>(null);
  const [editingVendorsWeddingId, setEditingVendorsWeddingId] = useState<string | null>(null);

  useEffect(() => {
    loadWeddings();
  }, []);

  const loadWeddings = async () => {
    setLoading(true);
    setError(null);
    try {
      // For admins, this should return all weddings
      const res = await api('/weddings');
      if (res.ok && Array.isArray(res.body)) {
        const sorted = res.body.sort(
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

  const getWeddingName = (wedding: Wedding): string => {
    const names = [];
    if (wedding.spouse1?.name) names.push(wedding.spouse1.name);
    if (wedding.spouse2?.name) names.push(wedding.spouse2.name);
    
    if (names.length === 0) return 'Wedding';
    if (names.length === 1) return `${names[0]}'s Wedding`;
    return `${names.join(' & ')}'s Wedding`;
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
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="max-w-5xl mx-auto mt-8">
      <Card className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Manage Weddings</h2>
        <p className="text-slate-400">View all weddings and manage planner assignments</p>
      </Card>

      {error && <Card className="mb-6 border border-red-700 bg-red-950"><p className="text-red-300">{error}</p></Card>}

      {loading ? (
        <Card><p className="text-slate-400">Loading weddings...</p></Card>
      ) : weddings.length === 0 ? (
        <Card><p className="text-slate-400">No weddings found.</p></Card>
      ) : (
        <div className="space-y-3">
          {weddings.map((wedding) => {
            const daysUntil = getDaysUntil(wedding.date);
            const isExpanded = expandedWeddingId === wedding.id;

            return (
              <Card key={wedding.id}>
                <button
                  onClick={() => setExpandedWeddingId(isExpanded ? null : wedding.id)}
                  className="text-left w-full hover:opacity-70 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">{getWeddingName(wedding)}</h3>
                      <div className="text-sm text-slate-400 mt-1">
                        <div>{formatDate(wedding.date)}</div>
                        <div className="text-xs mt-1">
                          {daysUntil < 0 ? `${Math.abs(daysUntil)} days ago` : `${daysUntil} days away`}
                        </div>
                      </div>
                      {wedding.planners && wedding.planners.length > 0 && (
                        <div className="mt-2 text-sm text-slate-300">
                          <span className="font-medium">Assigned Planners:</span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {wedding.planners.map((p) => (
                              <span key={p.planner.id} className="bg-slate-700 px-2 py-1 rounded text-xs">
                                {p.planner.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-slate-500 text-xs pt-1">
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-700 space-y-0">
                    {/* Couple Members Section */}
                    <CollapsibleSection
                      title="Couple Members"
                      isExpanded={editingCouplemembersWeddingId === wedding.id}
                      onToggle={() =>
                        setEditingCouplemembersWeddingId(
                          editingCouplemembersWeddingId === wedding.id ? null : wedding.id
                        )
                      }
                      firstSection={true}
                      summary={
                        <div className="bg-slate-800 border border-slate-700 rounded p-3 text-sm space-y-1">
                          <div>
                            <span className="text-slate-400">Member 1: </span>
                            <span className="font-medium text-white">
                              {wedding.spouse1?.name || 'Not set'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Member 2: </span>
                            <span className="font-medium text-white">
                              {wedding.spouse2?.name || 'Not set'}
                            </span>
                          </div>
                        </div>
                      }
                    >
                      <CouplemembersEditor
                        weddingId={wedding.id}
                        onUpdate={() => {
                          loadWeddings();
                        }}
                      />
                    </CollapsibleSection>

                    {/* Venue Section */}
                    <CollapsibleSection
                      title="Venue"
                      isExpanded={editingVenueWeddingId === wedding.id}
                      onToggle={() =>
                        setEditingVenueWeddingId(
                          editingVenueWeddingId === wedding.id ? null : wedding.id
                        )
                      }
                      summary={
                        wedding.location ? (
                          <div className="bg-slate-800 border border-slate-700 rounded p-3 text-sm space-y-1">
                            <p className="font-medium text-white">{wedding.location.street}</p>
                            <p className="text-slate-400">
                              {wedding.location.city}, {wedding.location.state} {wedding.location.zip}
                            </p>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-500">No venue set</div>
                        )
                      }
                    >
                      <VenueEditor
                        weddingId={wedding.id}
                        onUpdate={() => {
                          loadWeddings();
                        }}
                      />
                    </CollapsibleSection>

                    {/* Vendors Section */}
                    <CollapsibleSection
                      title="Vendors"
                      isExpanded={editingVendorsWeddingId === wedding.id}
                      onToggle={() =>
                        setEditingVendorsWeddingId(
                          editingVendorsWeddingId === wedding.id ? null : wedding.id
                        )
                      }
                      summary={
                        <div className="text-sm text-slate-500">Manage vendors for this wedding</div>
                      }
                    >
                      <VendorEditor
                        weddingId={wedding.id}
                        onUpdate={() => {
                          loadWeddings();
                        }}
                      />
                    </CollapsibleSection>

                    {/* Planner Assignment Section */}
                    <CollapsibleSection
                      title="Assign Planners"
                      isExpanded={expandedPlannersWeddingId === wedding.id}
                      onToggle={() =>
                        setExpandedPlannersWeddingId(
                          expandedPlannersWeddingId === wedding.id ? null : wedding.id
                        )
                      }
                      summary={
                        wedding.planners && wedding.planners.length > 0 ? (
                          <div className="bg-slate-800 border border-slate-700 rounded p-3 text-sm space-y-1">
                            {wedding.planners.map((p) => (
                              <div key={p.planner.id} className="flex items-center justify-between">
                                <span className="text-white font-medium">{p.planner.name}</span>
                                <span className="text-xs text-slate-400">{p.planner.email}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-slate-500">No planners assigned</div>
                        )
                      }
                    >
                      <PlannerAssignment
                        weddingId={wedding.id}
                        onAssignmentChanged={loadWeddings}
                      />
                    </CollapsibleSection>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
