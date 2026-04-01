import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {Card} from './ui/card';
import {Button} from './ui/button';
import {Input} from './ui/input';
import FormField from './ui/formField';
import AddressSelector from './AddressSelector';
import PlannerAssignment from './PlannerAssignment';
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from './ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  type: string;
}

interface Wedding {
  id: string;
  date: string;
  spouse1Id?: string | null;
  spouse2Id?: string | null;
  locationId?: string | null;
  spouse1?: Client | null;
  spouse2?: Client | null;
  location?: Address | null;
}

interface WeddingDetailsEditorProps {
  weddingId: string;
  onUpdate?: (wedding: Wedding) => void;
  currentUser?: any;
  showOnlyLocation?: boolean;
  onSaveComplete?: () => void;
  showTitle?: boolean;
}

export default function WeddingDetailsEditor({ weddingId, onUpdate, currentUser, showOnlyLocation = false, onSaveComplete, showTitle = false }: WeddingDetailsEditorProps) {
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Address | null>(null);
  const [weddingDate, setWeddingDate] = useState<string>('');
  const [locationOpen, setLocationOpen] = useState(false);

  useEffect(() => {
    fetchWeddingDetails();
  }, [weddingId]);

  const fetchWeddingDetails = async () => {
    try {
      setLoading(true);
      const res = await api(`/weddings/${weddingId}`);
      if (res.ok) {
        setWedding(res.body);
        setSelectedLocation(res.body.location || null);
        // Format date as YYYY-MM-DD for input field
        const date = new Date(res.body.date);
        const dateStr = date.toISOString().split('T')[0];
        setWeddingDate(dateStr);
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
      
      // Check for date changes
      const currentDateStr = new Date(wedding.date).toISOString().split('T')[0];
      if (weddingDate && weddingDate !== currentDateStr) {
        updates.date = new Date(weddingDate).toISOString();
      }
      
      if (selectedLocation?.id && selectedLocation.id !== wedding.locationId) {
        updates.locationId = selectedLocation.id;
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
        const updatedWedding = { ...wedding, ...updates, location: selectedLocation, date: updates.date || wedding.date };
        setWedding(updatedWedding);
        // Update the date state if it was changed
        if (updates.date) {
          const date = new Date(updates.date);
          const dateStr = date.toISOString().split('T')[0];
          setWeddingDate(dateStr);
        }
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
    const currentDateStr = new Date(wedding.date).toISOString().split('T')[0];
    return weddingDate !== currentDateStr ||
           selectedLocation?.id !== wedding.locationId;
  };

  if (loading) {
    return <Card><p className="text-slate-400">Loading wedding details...</p></Card>;
  }

  if (!wedding) {
    return <Card><p className="text-red-400">Wedding not found</p></Card>;
  }

  const dateHasChanged = weddingDate !== new Date(wedding.date).toISOString().split('T')[0];
  const locationDisplay = selectedLocation 
    ? `${selectedLocation.street} ${selectedLocation.city}, ${selectedLocation.state}` 
    : 'Set location';

  const weddingDisplayName = (() => {
    const spouse1 = wedding.spouse1?.name || '';
    const spouse2 = wedding.spouse2?.name || '';
    if (spouse1 && spouse2) return `${spouse1} & ${spouse2}'s Wedding`;
    if (spouse1) return `${spouse1}'s Wedding`;
    if (spouse2) return `${spouse2}'s Wedding`;
    return 'Wedding Details';
  })();

  return (
    <div className="space-y-4">
      {showTitle && (
        <h3 className="text-sm font-semibold text-slate-300">{weddingDisplayName}</h3>
      )}
      {/* Wedding Date */}
      <div>
        <FormField label="Wedding Date" id="wedding-date">
          <Input
            id="wedding-date"
            type="date"
            value={weddingDate}
            onChange={(e) => setWeddingDate(e.target.value)}
          />
        </FormField>
        {dateHasChanged && (
          <div className="mt-2 p-2 bg-blue-900 border border-blue-700 rounded text-xs text-blue-200">
            <p className="font-semibold mb-1">Wedding date will recalculate all task due dates</p>
            <p>Template & manual tasks will be updated automatically.</p>
          </div>
        )}
      </div>

      {/* Location - Collapsible */}
      <Collapsible open={locationOpen} onOpenChange={setLocationOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-slate-200 w-full">
          <ChevronDown className={`h-4 w-4 transition-transform ${locationOpen ? 'rotate-180' : ''}`} />
          <span>{locationDisplay}</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 pl-0">
          {selectedLocation ? (
            <div className="bg-slate-700 border border-slate-600 rounded p-3 mb-2">
              <p className="font-medium text-white text-sm">
                {selectedLocation.street}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {selectedLocation.city}, {selectedLocation.state} {selectedLocation.zip}
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLocation(null);
                }}
                className="text-xs text-blue-400 hover:text-blue-300 mt-2 underline"
              >
                Change Location
              </button>
            </div>
          ) : (
            <AddressSelector 
              onAddressSelected={setSelectedLocation}
              label=""
              placeholder="Search for location..."
              addressType="Venue"
            />
          )}
        </CollapsibleContent>
      </Collapsible>

      {error && (
        <div className="text-sm text-red-400">
          {error}
        </div>
      )}

      <Button 
        onClick={handleSaveDetails} 
        disabled={updating || !hasChanges()}
        className="w-full text-sm py-2"
      >
        {updating ? 'Saving...' : 'Save'}
      </Button>

      {!showOnlyLocation && currentUser?.role === 'ADMIN' && (
        <div className="pt-4 border-t border-slate-700">
          <PlannerAssignment weddingId={weddingId} onAssignmentChanged={() => onUpdate?.(wedding!)} />
        </div>
      )}
    </div>
  );
}
