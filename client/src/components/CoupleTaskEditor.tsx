import React, { useState } from 'react';
import { api } from '../lib/api';
import { Card } from './ui/card';

interface CoupleTaskEditorProps {
  taskId: string;
  weddingId: string;
  assignToCouple: boolean;
  onAssignToCoupleChange: (value: boolean) => void;
}

export default function CoupleTaskEditor({
  taskId,
  weddingId,
  assignToCouple,
  onAssignToCoupleChange
}: CoupleTaskEditorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssignToCoupleToggle(value: boolean) {
    try {
      setLoading(true);
      setError(null);

      // Fetch the wedding to get couple members (Client records)
      const weddingRes = await api(`/weddings/${weddingId}`);
      if (!weddingRes.ok) {
        throw new Error('Failed to fetch wedding data');
      }

      const wedding = weddingRes.body;
      const coupleUserIds = [];
      if (wedding.spouse1?.userId) coupleUserIds.push(wedding.spouse1.userId);
      if (wedding.spouse2?.userId) coupleUserIds.push(wedding.spouse2.userId);

      if (coupleUserIds.length === 0) {
        setError('No couple members with user accounts found for this wedding');
        return;
      }

      if (value) {
        // Assign to all couple members who have user accounts
        for (const userId of coupleUserIds) {
          const res = await api(`/tasks/${taskId}/couple`, {
            method: 'POST',
            body: { assignedToId: userId }
          });
          if (!res.ok) {
            throw new Error('Failed to assign couple member');
          }
        }
      } else {
        // Unassign from all couple members who have user accounts
        for (const userId of coupleUserIds) {
          const res = await api(`/tasks/${taskId}/couple/${userId}`, {
            method: 'DELETE'
          });
          if (!res.ok) {
            throw new Error('Failed to unassign couple member');
          }
        }
      }

      // Update the task itself
      const updateRes = await api(`/tasks/${taskId}`, {
        method: 'PUT',
        body: { assignToCouple: value }
      });

      if (updateRes.ok) {
        onAssignToCoupleChange(value);
      } else {
        setError(updateRes.body?.error || 'Failed to update task');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4">Couple Assignment</h3>

      {error && (
        <div className="p-3 bg-destructive/20 border border-destructive rounded text-destructive text-sm mb-4">
          {error}
        </div>
      )}

      {/* Checkbox */}
      <div className="p-4 bg-card/50 rounded border border-border">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={assignToCouple}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAssignToCoupleToggle(e.target.checked)}
            disabled={loading}
            className="w-5 h-5 rounded border-border bg-input text-accent focus:ring-accent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div>
            <label className="font-semibold text-card-foreground cursor-pointer">
              Assign to Couple Members
            </label>
            <p className="text-sm text-muted-foreground mt-1">
              {assignToCouple 
                ? 'This task is assigned to both couple members'
                : 'Check to assign this task to both couple members'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
