import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {Button} from './ui/button';
import ClientSelector from './ClientSelector';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Wedding {
  id: string;
  spouse1Id?: string | null;
  spouse2Id?: string | null;
  spouse1?: Client | null;
  spouse2?: Client | null;
}

interface CouplemembersEditorProps {
  weddingId: string;
  onUpdate?: (wedding: Wedding) => void;
  onSaveComplete?: () => void;
}

export default function CouplemembersEditor({ weddingId, onUpdate, onSaveComplete }: CouplemembersEditorProps) {
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSpouse1, setSelectedSpouse1] = useState<Client | null>(null);
  const [selectedSpouse2, setSelectedSpouse2] = useState<Client | null>(null);

  useEffect(() => {
    fetchWeddingDetails();
  }, [weddingId]);

  const fetchWeddingDetails = async () => {
    try {
      setLoading(true);
      const res = await api(`/weddings/${weddingId}`);
      if (res.ok) {
        setWedding(res.body);
        setSelectedSpouse1(res.body.spouse1 || null);
        setSelectedSpouse2(res.body.spouse2 || null);
      } else {
        setError('Failed to load wedding details');
      }
    } catch (err) {
      setError('An error occurred while loading wedding details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!wedding) return;

    setError(null);
    setUpdating(true);

    try {
      const updates: any = {};

      if (selectedSpouse1?.id && selectedSpouse1.id !== wedding.spouse1Id) {
        updates.spouse1Id = selectedSpouse1.id;
      }
      if (selectedSpouse2?.id && selectedSpouse2.id !== wedding.spouse2Id) {
        updates.spouse2Id = selectedSpouse2.id;
      }

      if (Object.keys(updates).length === 0) {
        setError('No changes to save');
        setUpdating(false);
        return;
      }

      const res = await api(`/weddings/${weddingId}`, {
        method: 'PUT',
        body: updates
      });

      if (res.ok) {
        const updatedWedding = {
          ...wedding,
          ...updates,
          spouse1: selectedSpouse1,
          spouse2: selectedSpouse2
        };
        setWedding(updatedWedding);
        onUpdate?.(updatedWedding);
        setError(null);
        onSaveComplete?.();
      } else {
        setError(res.body?.error || 'Failed to save wedding details');
      }
    } catch (err) {
      setError('An error occurred while saving');
    } finally {
      setUpdating(false);
    }
  };

  const hasChanges = () => {
    if (!wedding) return false;
    return (
      selectedSpouse1?.id !== wedding.spouse1Id ||
      selectedSpouse2?.id !== wedding.spouse2Id
    );
  };

  if (loading) {
    return <p className="text-slate-400">Loading couple members...</p>;
  }

  if (!wedding) {
    return <p className="text-red-400">Wedding not found</p>;
  }

  return (
    <div className="space-y-6">
      {/* Spouse 1 */}
      <div>
        <h4 className="text-sm font-medium text-slate-300 mb-3">Couple Member 1</h4>
        {selectedSpouse1 ? (
          <div className="bg-slate-800 border border-slate-700 rounded p-3 mb-2">
            <p className="font-medium text-white">{selectedSpouse1.name}</p>
            {selectedSpouse1.email && (
              <p className="text-xs text-slate-400">{selectedSpouse1.email}</p>
            )}
            {selectedSpouse1.phone && (
              <p className="text-xs text-slate-400">{selectedSpouse1.phone}</p>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSpouse1(null);
              }}
              className="text-xs text-blue-400 hover:text-blue-300 mt-2 underline"
            >
              Change
            </button>
          </div>
        ) : (
          <ClientSelector
            onClientSelected={setSelectedSpouse1}
            label="Add couple member 1"
            placeholder="Search for couple member 1..."
          />
        )}
      </div>

      {/* Spouse 2 */}
      <div>
        <h4 className="text-sm font-medium text-slate-300 mb-3">Couple Member 2</h4>
        {selectedSpouse2 ? (
          <div className="bg-slate-800 border border-slate-700 rounded p-3 mb-2">
            <p className="font-medium text-white">{selectedSpouse2.name}</p>
            {selectedSpouse2.email && (
              <p className="text-xs text-slate-400">{selectedSpouse2.email}</p>
            )}
            {selectedSpouse2.phone && (
              <p className="text-xs text-slate-400">{selectedSpouse2.phone}</p>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSpouse2(null);
              }}
              className="text-xs text-blue-400 hover:text-blue-300 mt-2 underline"
            >
              Change
            </button>
          </div>
        ) : (
          <ClientSelector
            onClientSelected={setSelectedSpouse2}
            label="Add couple member 2"
            placeholder="Search for couple member 2..."
          />
        )}
      </div>

      {error && <div className="text-sm text-red-400 mt-4">{error}</div>}

      <div className="flex gap-2 mt-6">
        <Button
          onClick={handleSaveDetails}
          disabled={updating || !hasChanges()}
        >
          {updating ? 'Saving...' : 'Save'}
        </Button>
        {!hasChanges() && selectedSpouse1 && selectedSpouse2 && (
          <span className="text-xs text-slate-400 flex items-center">✓ Couple members set</span>
        )}
      </div>
    </div>
  );
}
