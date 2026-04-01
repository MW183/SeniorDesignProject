import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {Card} from './ui/card';
import {Button} from './ui/button';
import FormField from './ui/formField';
import {Input} from './ui/input';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Planner {
  id: string;
  name: string;
  email: string;
}

interface PlannerAssignmentProps {
  weddingId: string;
  onAssignmentChanged?: () => void;
}

export default function PlannerAssignment({ weddingId, onAssignmentChanged }: PlannerAssignmentProps) {
  const [planners, setPlanners] = useState<Planner[]>([]);
  const [availablePlanners, setAvailablePlanners] = useState<User[]>([]);
  const [selectedPlannerId, setSelectedPlannerId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPlanners();
    loadAvailablePlanners();
  }, [weddingId]);

  const loadPlanners = async () => {
    try {
      const res = await api(`/weddings/${weddingId}/planners`);
      if (res.ok && Array.isArray(res.body)) {
        setPlanners(res.body);
      }
    } catch (err) {
      console.error('Failed to load planners:', err);
    }
  };

  const loadAvailablePlanners = async () => {
    try {
      setLoading(true);
      // Get all users with planning roles
      const res = await api('/users');
      if (res.ok && Array.isArray(res.body)) {
        // Filter for users that could be planners (anyone really, but prefer non-ADMIN for flexibility)
        const allUsers = res.body as User[];
        setAvailablePlanners(allUsers);
      }
    } catch (err) {
      console.error('Failed to load available planners:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPlanner = async () => {
    if (!selectedPlannerId) {
      setError('Please select a planner');
      return;
    }

    setError(null);
    setAssigning(true);

    try {
      const res = await api(`/weddings/${weddingId}/assign-planner`, {
        method: 'POST',
        body: { plannerId: selectedPlannerId }
      });

      if (res.ok) {
        setSelectedPlannerId('');
        setSearchTerm('');
        await loadPlanners();
        onAssignmentChanged?.();
      } else {
        setError(res.body?.error || 'Failed to assign planner');
      }
    } catch (err) {
      setError('An error occurred while assigning planner');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemovePlanner = async (plannerId: string) => {
    if (!confirm('Remove this planner from the wedding?')) return;

    try {
      const res = await api(`/weddings/${weddingId}/planners/${plannerId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await loadPlanners();
        onAssignmentChanged?.();
      } else {
        setError(res.body?.error || 'Failed to remove planner');
      }
    } catch (err) {
      setError('An error occurred while removing planner');
    }
  };

  const filterPlanners = (search: string) => {
    if (!search.trim()) return availablePlanners;
    return availablePlanners.filter(
      p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase())
    );
  };

  const getUnassignedPlanners = () => {
    const assignedIds = new Set(planners.map(p => p.id));
    return availablePlanners.filter(p => !assignedIds.has(p.id));
  };

  const filteredPlanners = filterPlanners(searchTerm);

  return (
    <Card>
      <h4 className="text-lg font-semibold mb-4">Assign Planners</h4>

      <div className="mb-6">
        <h5 className="text-sm font-medium text-slate-300 mb-3">Currently Assigned</h5>
        {planners.length === 0 ? (
          <p className="text-xs text-slate-400">No planners assigned yet</p>
        ) : (
          <div className="space-y-2">
            {planners.map(planner => (
              <div
                key={planner.id}
                className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded p-3"
              >
                <div>
                  <p className="font-medium text-white">{planner.name}</p>
                  <p className="text-xs text-slate-400">{planner.email}</p>
                </div>
                <button
                  onClick={() => handleRemovePlanner(planner.id)}
                  className="text-xs text-red-400 hover:text-red-300 underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-slate-700 pt-4">
        <h5 className="text-sm font-medium text-slate-300 mb-3">Add Planner</h5>

        <div className="space-y-3">
          <FormField label="Search Planners" id="planner-search">
            <Input
              id="planner-search"
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </FormField>

          {searchTerm && (
            <div className="border border-slate-600 rounded bg-slate-800 max-h-48 overflow-y-auto">
              {filteredPlanners.length === 0 ? (
                <p className="text-xs text-slate-400 p-3">No planners found</p>
              ) : (
                filteredPlanners.map(planner => {
                  const isAssigned = planners.some(p => p.id === planner.id);
                  return (
                    <button
                      key={planner.id}
                      type="button"
                      disabled={isAssigned}
                      onClick={() => {
                        setSelectedPlannerId(planner.id);
                        setSearchTerm('');
                      }}
                      className={`w-full text-left px-3 py-2 border-b border-slate-700 last:border-b-0 ${
                        isAssigned
                          ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                          : 'hover:bg-slate-700 text-white'
                      }`}
                    >
                      <div className="font-medium">{planner.name}</div>
                      <div className="text-xs text-slate-400">{planner.email}</div>
                      {isAssigned && (
                        <div className="text-xs text-slate-500 mt-1">✓ Already assigned</div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}

          {selectedPlannerId && (
            <div>
              <p className="text-xs text-slate-400 mb-2">Selected:</p>
              <div className="bg-slate-800 border border-slate-600 rounded p-2 mb-3">
                <p className="text-sm font-medium text-white">
                  {availablePlanners.find(p => p.id === selectedPlannerId)?.name}
                </p>
              </div>
            </div>
          )}

          {error && <div className="text-xs text-red-400">{error}</div>}

          <div className="flex gap-2">
            <Button
              onClick={handleAssignPlanner}
              disabled={assigning || !selectedPlannerId || loading}
            >
              {assigning ? 'Assigning...' : 'Assign Planner'}
            </Button>
            {selectedPlannerId && (
              <button
                type="button"
                onClick={() => {
                  setSelectedPlannerId('');
                  setSearchTerm('');
                }}
                className="px-3 py-2 text-sm text-slate-400 hover:text-slate-300"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
