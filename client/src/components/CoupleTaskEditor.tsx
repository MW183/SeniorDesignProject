import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import FormField from './ui/formField';

interface CoupleTaskAssignment {
  id: string;
  taskId: string;
  assignedToId: string;
  assignedTo: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  createdAt: string;
}

interface CoupleTaskEditorProps {
  taskId: string;
  assignToCouple: boolean;
  onAssignToCoupleChange: (value: boolean) => void;
}

export default function CoupleTaskEditor({
  taskId,
  assignToCouple,
  onAssignToCoupleChange
}: CoupleTaskEditorProps) {
  const [coupleAssignments, setCoupleAssignments] = useState<CoupleTaskAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadCoupleAssignments();
  }, [taskId]);

  async function loadCoupleAssignments() {
    try {
      setLoading(true);
      const res = await api(`/tasks/${taskId}/couple`);
      if (res.ok && Array.isArray(res.body)) {
        setCoupleAssignments(res.body);
      }
    } catch (err) {
      console.error('Error loading couple assignments:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignToCoupleToggle(value: boolean) {
    try {
      // Update the task with new assignToCouple value
      const res = await api(`/tasks/${taskId}`, {
        method: 'PUT',
        body: { assignToCouple: value }
      });

      if (res.ok) {
        onAssignToCoupleChange(value);
        setError(null);
      } else {
        setError(res.body?.error || 'Failed to update task');
      }
    } catch (err) {
      setError('An error occurred while updating the task');
    }
  }

  async function searchClients() {
    if (!searchEmail.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const res = await api(`/users?search=${encodeURIComponent(searchEmail)}`);
      if (res.ok && Array.isArray(res.body)) {
        // Filter to only CLIENT users
        setSearchResults(res.body.filter((u: any) => u.role === 'CLIENT'));
      }
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearching(false);
    }
  }

  async function assignCoupleToTask(userId: string) {
    try {
      const res = await api(`/tasks/${taskId}/couple`, {
        method: 'POST',
        body: { assignedToId: userId }
      });

      if (res.ok) {
        setCoupleAssignments([...coupleAssignments, res.body]);
        setSearchEmail('');
        setSearchResults([]);
        setError(null);
      } else {
        setError(res.body?.error || 'Failed to assign couple member');
      }
    } catch (err) {
      setError('An error occurred while assigning the couple member');
    }
  }

  async function removeCoupleAssignment(userId: string) {
    try {
      const res = await api(`/tasks/${taskId}/couple/${userId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setCoupleAssignments(coupleAssignments.filter(a => a.assignedToId !== userId));
        setError(null);
      } else {
        setError(res.body?.error || 'Failed to remove assignment');
      }
    } catch (err) {
      setError('An error occurred while removing the assignment');
    }
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4">Couple Task Assignment</h3>

      {error && (
        <div className="p-3 bg-red-600/20 border border-red-600 rounded text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Assign to Couple Toggle */}
      <div className="mb-6 p-4 bg-slate-700/50 rounded border border-slate-600">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-white mb-1">Assign To Couple</h4>
            <p className="text-sm text-slate-400">
              When enabled, couple members can view and update this task
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={assignToCouple}
              onChange={e => handleAssignToCoupleToggle(e.target.checked)}
              className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-sm font-medium">
              {assignToCouple ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      {/* Current Assignments */}
      <div className="mb-6">
        <h4 className="font-semibold text-slate-200 mb-3">Assigned Couple Members</h4>
        {coupleAssignments.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No couple members assigned yet</p>
        ) : (
          <div className="space-y-2">
            {coupleAssignments.map(assignment => (
              <div
                key={assignment.id}
                className="p-3 bg-slate-700/30 rounded border border-slate-600 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-white">{assignment.assignedTo.name}</p>
                  <p className="text-xs text-slate-400">{assignment.assignedTo.email}</p>
                </div>
                <Button
                  onClick={() => removeCoupleAssignment(assignment.assignedToId)}
                  className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Couple Member */}
      <div>
        <h4 className="font-semibold text-slate-200 mb-3">Add Couple Member</h4>
        <div className="space-y-3 p-3 bg-slate-700/30 rounded border border-slate-600">
          <FormField label="Search by Email" id="coupleSearch">
            <div className="flex gap-2">
              <Input
                id="coupleSearch"
                type="email"
                placeholder="Search couple member email..."
                value={searchEmail}
                onChange={e => setSearchEmail(e.target.value)}
                onKeyUp={searchEmail.length > 2 ? searchClients : undefined}
              />
              <Button
                onClick={searchClients}
                disabled={searching || !searchEmail.trim()}
                className="px-4 bg-blue-600 hover:bg-blue-700"
              >
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </FormField>

          {searchResults.length > 0 && (
            <div className="bg-slate-800 rounded border border-slate-600 p-2">
              <p className="text-xs text-slate-400 mb-2">Found {searchResults.length} result(s):</p>
              <div className="space-y-1">
                {searchResults.map(user => {
                  const alreadyAssigned = coupleAssignments.some(a => a.assignedToId === user.id);
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 bg-slate-700/50 rounded"
                    >
                      <div className="text-sm">
                        <p className="font-medium text-white">{user.name}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                      <Button
                        onClick={() => assignCoupleToTask(user.id)}
                        disabled={alreadyAssigned}
                        className={`px-3 py-1 text-xs ${
                          alreadyAssigned
                            ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {alreadyAssigned ? 'Assigned' : 'Assign'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-slate-400 mt-4 p-2 bg-slate-900/50 rounded">
        <strong>Note:</strong> Only CLIENT users appear in search results. CLIENT accounts are automatically created when you add couple members to a wedding.
      </div>
    </Card>
  );
}
