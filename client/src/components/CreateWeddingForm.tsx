import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {Card} from './ui/card';
import {Button} from './ui/Button';
import {Input} from './ui/Input';
import FormField from './ui/formField';

interface WeddingTemplate {
  id: string;
  name: string;
  version: number;
}

export default function CreateWeddingForm({ onWeddingCreated }: { onWeddingCreated?: (weddingId?: string) => void }) {
  const [date, setDate] = useState('');
  const [templates, setTemplates] = useState<WeddingTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [useTemplate, setUseTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    // Fetch available templates
    const fetchTemplates = async () => {
      try {
        const res = await api('/wedding-templates');
        if (res.ok && Array.isArray(res.body)) {
          setTemplates(res.body);
          if (res.body.length > 0) {
            setSelectedTemplate(res.body[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch templates:', err);
      } finally {
        setLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, []);

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
      const body: any = {
        date: new Date(date).toISOString(),
        locationId: null,
        spouse1Id: null,
        spouse2Id: null
      };

      if (useTemplate && selectedTemplate) {
        body.templateId = selectedTemplate;
      }

      const res = await api('/weddings', {
        method: 'POST',
        body
      });

      if (res.ok) {
        setDate('');
        setUseTemplate(false);
        setSelectedTemplate(templates.length > 0 ? templates[0].id : null);
        setError(null);
        onWeddingCreated?.(res.body?.id);
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

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="useTemplate"
            checked={useTemplate}
            onChange={e => setUseTemplate(e.target.checked)}
            className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
          />
          <label htmlFor="useTemplate" className="text-sm font-medium">
            Auto-populate tasks from template
          </label>
        </div>

        {useTemplate && !loadingTemplates && (
          <FormField label="Select Template" id="template">
            <select
              id="template"
              value={selectedTemplate || ''}
              onChange={e => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">-- Select a template --</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} (v{t.version})
                </option>
              ))}
            </select>
          </FormField>
        )}

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
        You can add couple details and location after creating the wedding.
      </p>
    </Card>
  );
}
