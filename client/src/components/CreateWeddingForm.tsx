import React, { useState } from 'react';
import { api } from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import FormField from '../components/ui/FormField';

export default function CreateWeddingForm({ onWeddingCreated }: { onWeddingCreated?: () => void }) {
  const [date, setDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!date) {
      setError('Wedding date is required');
      setLoading(false);
      return;
    }

    try {
      const res = await api('/weddings', {
        method: 'POST',
        body: {
          date: new Date(date).toISOString(),
          locationId: null,
          spouse1Id: null,
          spouse2Id: null
        }
      });

      if (res.ok) {
        setDate('');
        setError(null);
        onWeddingCreated?.();
      } else {
        const err = res.body?.error || (res.body?.details ? JSON.stringify(res.body.details) : 'Failed to create wedding');
        setError(err);
      }
    } catch (e) {
      setError('An error occurred while creating the wedding');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mb-6">
      <h3 className="text-lg font-semibold mb-4">Create New Wedding</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Wedding Date" id="date">
          <Input
            id="date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </FormField>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Wedding'}
          </Button>
        </div>

        {error && (
          <div className="text-sm text-red-400 mt-2">
            {error}
          </div>
        )}
      </form>

      <p className="text-sm text-slate-400 mt-4">
        💡 You can add couple details and location after creating the wedding.
      </p>
    </Card>
  );
}
