import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {Card} from './ui/card';
import {Button} from './ui/button';
import {Input} from './ui/input';
import FormField from './ui/formField';

/** id, name, version */
interface WeddingTemplate {
  id: string;
  name: string;
  version: number;
}

/** name, email, phone */
interface Spouse {
  name: string;
  email: string;
  phone: string;
}

export default function CreateWeddingForm({ onWeddingCreated }: { onWeddingCreated?: (weddingId?: string) => void }) {
  const [date, setDate] = useState('');
  const [templates, setTemplates] = useState<WeddingTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [useTemplate, setUseTemplate] = useState(false);
  const [enterSpouseData, setEnterSpouseData] = useState(false);
  const [spouse1, setSpouse1] = useState<Spouse>({ name: '', email: '', phone: '' });
  const [spouse2, setSpouse2] = useState<Spouse>({ name: '', email: '', phone: '' });
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

    // Validate spouse data if provided
    if (enterSpouseData) {
      if (spouse1.name && !spouse1.email) {
        setError('Spouse 1 email is required if name is provided');
        setLoading(false);
        return;
      }
      if (spouse2.name && !spouse2.email) {
        setError('Spouse 2 email is required if name is provided');
        setLoading(false);
        return;
      }
    }

    try {
      const body: any = {
        date: new Date(date).toISOString(),
        locationId: null
      };

      // Add spouse1 data if provided
      if (enterSpouseData && spouse1.name) {
        body.spouse1 = {
          name: spouse1.name,
          email: spouse1.email,
          phone: spouse1.phone || undefined
        };
      }

      // Add spouse2 data if provided
      if (enterSpouseData && spouse2.name) {
        body.spouse2 = {
          name: spouse2.name,
          email: spouse2.email,
          phone: spouse2.phone || undefined
        };
      }

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
        setEnterSpouseData(false);
        setSpouse1({ name: '', email: '', phone: '' });
        setSpouse2({ name: '', email: '', phone: '' });
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
            required
          />
        </FormField>

        <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded">
          <input
            type="checkbox"
            id="enterSpouseData"
            checked={enterSpouseData}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEnterSpouseData(e.target.checked)}
            className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
          />
          <label htmlFor="enterSpouseData" className="text-sm font-medium">
            Enter couple names & emails now
          </label>
        </div>

        {enterSpouseData && (
          <div className="border border-slate-600 rounded p-4 space-y-4 bg-slate-800/50">
            <h4 className="font-semibold text-slate-200">Spouse 1 (Optional)</h4>
            <FormField label="Name" id="spouse1Name">
              <Input
                id="spouse1Name"
                type="text"
                placeholder="e.g., Alice Johnson"
                value={spouse1.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpouse1({...spouse1, name: e.target.value})}
              />
            </FormField>
            <FormField label="Email" id="spouse1Email">
              <Input
                id="spouse1Email"
                type="email"
                placeholder="alice@example.com"
                value={spouse1.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpouse1({...spouse1, email: e.target.value})}
              />
            </FormField>
            <FormField label="Phone (Optional)" id="spouse1Phone">
              <Input
                id="spouse1Phone"
                type="tel"
                placeholder="+1-555-0101"
                value={spouse1.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpouse1({...spouse1, phone: e.target.value})}
              />
            </FormField>

            <h4 className="font-semibold text-slate-200 mt-6">Spouse 2 (Optional)</h4>
            <FormField label="Name" id="spouse2Name">
              <Input
                id="spouse2Name"
                type="text"
                placeholder="e.g., Bob Johnson"
                value={spouse2.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpouse2({...spouse2, name: e.target.value})}
              />
            </FormField>
            <FormField label="Email" id="spouse2Email">
              <Input
                id="spouse2Email"
                type="email"
                placeholder="bob@example.com"
                value={spouse2.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpouse2({...spouse2, email: e.target.value})}
              />
            </FormField>
            <FormField label="Phone (Optional)" id="spouse2Phone">
              <Input
                id="spouse2Phone"
                type="tel"
                placeholder="+1-555-0102"
                value={spouse2.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpouse2({...spouse2, phone: e.target.value})}
              />
            </FormField>

            <div className="text-xs text-slate-400 mt-3 p-2 bg-slate-700/50 rounded">
              <strong>Note:</strong> CLIENT accounts will be automatically created for couple members with emails. They'll receive verification and password setup links.
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded">
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
        You can add or modify couple details and location after creating the wedding.
      </p>
    </Card>
  );
}
