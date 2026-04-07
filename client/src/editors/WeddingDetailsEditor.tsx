import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {Card} from '../components/ui/card';
import {Button} from '../components/ui/button';
import {Input} from '../components/ui/input';
import FormField from '../components/ui/FormField';
import AddressSelector from '../components/AddressSelector';
import PlannerAssignment from '../components/PlannerAssignment';
import CouplemembersEditor from './CouplemembersEditor';
import VendorEditor from './VendorEditor';
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '../components/ui/Collapsible';
import ConfirmDialog from '../components/ConfirmDialog';
import { ChevronDown, Loader } from 'lucide-react';

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
  const [weddingTime, setWeddingTime] = useState<string>('12:00');
  const [locationOpen, setLocationOpen] = useState(false);
  const [showDateConfirm, setShowDateConfirm] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<any>(null);
  const [editingCouplemembersOpen, setEditingCouplemembersOpen] = useState(false);
  const [editingVendorsOpen, setEditingVendorsOpen] = useState(false);
  const [expandedPlannersOpen, setExpandedPlannersOpen] = useState(false);

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
        // Format date as YYYY-MM-DD for input field (extract from ISO string safely)
        const dateStr = res.body.date.split('T')[0];
        setWeddingDate(dateStr);
        
        // Extract time from ISO string (e.g., "2027-04-07T14:30:00.000Z" -> "14:30")
        const timeMatch = res.body.date.match(/T(\d{2}):(\d{2}):/);
        if (timeMatch) {
          setWeddingTime(`${timeMatch[1]}:${timeMatch[2]}`);
        } else {
          setWeddingTime('12:00');
        }
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

    const updates: any = {};
    
    // Check for date/time changes
    const currentDateStr = wedding.date.split('T')[0];
    const dateHasChanged = weddingDate && weddingDate !== currentDateStr;
    
    // Extract current time from ISO string
    const currentTimeMatch = wedding.date.match(/T(\d{2}):(\d{2}):/);
    const currentTime = currentTimeMatch ? `${currentTimeMatch[1]}:${currentTimeMatch[2]}` : '12:00';
    const timeHasChanged = weddingTime !== currentTime;
    
    if (dateHasChanged || timeHasChanged) {
      // Combine date and time into ISO format
      const [hours, minutes] = weddingTime.split(':');
      updates.date = new Date(`${weddingDate}T${hours}:${minutes}:00Z`).toISOString();
    }
    
    if (selectedLocation?.id && selectedLocation.id !== wedding.locationId) {
      updates.locationId = selectedLocation.id;
    }

    if (Object.keys(updates).length === 0) {
      setError('No changes to save');
      return;
    }

    // Only show confirmation dialog if DATE changed (time changes don't recalculate due dates)
    if (dateHasChanged) {
      setPendingUpdates(updates);
      setShowDateConfirm(true);
      return;
    }

    // Otherwise proceed directly with save (for time-only changes or location changes)
    await performSave(updates);
  };

  const performSave = async (updates: any) => {
    if (!wedding) return;
    
    setUpdating(true);

    try {
      const res = await api(`/weddings/${weddingId}`, {
        method: 'PUT',
        body: updates
      });

      if (res.ok) {
        const updatedWedding = { ...wedding, ...updates, location: selectedLocation, date: updates.date || wedding.date };
        setWedding(updatedWedding);
        // Update the date state if it was changed
        if (updates.date) {
          const dateStr = updates.date.split('T')[0];
          setWeddingDate(dateStr);
          
          // Extract and set time
          const timeMatch = updates.date.match(/T(\d{2}):(\d{2}):/);
          if (timeMatch) {
            setWeddingTime(`${timeMatch[1]}:${timeMatch[2]}`);
          }
        }

        onUpdate?.(updatedWedding);
        setError(null);
        onSaveComplete?.();
        setShowDateConfirm(false);
        setPendingUpdates(null);
        // Reload page to update sidebar and all dependent components
        window.location.reload();
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
    const currentDateStr = wedding.date.split('T')[0];
    
    // Extract current time from ISO string
    const currentTimeMatch = wedding.date.match(/T(\d{2}):(\d{2}):/);
    const currentTime = currentTimeMatch ? `${currentTimeMatch[1]}:${currentTimeMatch[2]}` : '12:00';
    
    return weddingDate !== currentDateStr ||
           weddingTime !== currentTime ||
           selectedLocation?.id !== wedding.locationId;
  };

  if (loading) {
    return <Card><p className="text-muted-foreground">Loading wedding details...</p></Card>;
  }

  if (!wedding) {
    return <Card><p className="text-destructive">Wedding not found</p></Card>;
  }

  const dateHasChanged = weddingDate !== wedding.date.split('T')[0];
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
    <div className="space-y-4 relative w-full min-w-0">
      {/* Loading Spinner Overlay */}
      {updating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 rounded">
          <div className="bg-card rounded-lg p-8 flex flex-col items-center gap-3">
            <Loader className="h-8 w-8 animate-spin text-accent" />
            <p className="text-foreground font-medium">Updating wedding date and tasks...</p>
          </div>
        </div>
      )}
      {showTitle && (
        <h3 className="text-sm font-semibold text-foreground">{weddingDisplayName}</h3>
      )}
      {/* Wedding Date */}
      <div>
        <FormField label="Wedding Date" id="wedding-date">
          <Input
            id="wedding-date"
            type="date"
            value={weddingDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWeddingDate(e.target.value)}
          />
        </FormField>
      </div>

      {/* Wedding Time */}
      <div>
        <FormField label="Wedding Time" id="wedding-time">
          <Input
            id="wedding-time"
            type="time"
            value={weddingTime}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWeddingTime(e.target.value)}
          />
        </FormField>
      </div>

      {/* Location - Collapsible */}
      <Collapsible open={locationOpen} onOpenChange={setLocationOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-foreground/80 w-full">
          <ChevronDown className={`h-4 w-4 transition-transform ${locationOpen ? 'rotate-180' : ''}`} />
          <span>{locationDisplay}</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 pl-0 w-full min-w-0">
          {selectedLocation ? (
            <div className="bg-card border border-border rounded p-3 mb-2">
              <p className="font-medium text-card-foreground text-sm">
                {selectedLocation.street}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedLocation.city}, {selectedLocation.state} {selectedLocation.zip}
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLocation(null);
                }}
                className="text-xs text-foreground hover:text-foreground/80 mt-2"
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
        <div className="text-sm text-destructive">
          {error}
        </div>
      )}

      <Button 
        onClick={handleSaveDetails} 
        disabled={updating || !hasChanges()}
        className="w-full bg-primary text-primary-foreground rounded-2xl text-md hover:bg-primary/80"
      >
        {updating ? 'Saving...' : 'Save'}
      </Button>
      

      {!showOnlyLocation && currentUser?.role === 'ADMIN' && (
        <div className="pt-4 space-y-4 border-t border-border w-full min-w-0">
          {/* Couple Members Section */}
          <Collapsible
            open={editingCouplemembersOpen}
            onOpenChange={setEditingCouplemembersOpen}
          >
            <CollapsibleTrigger className="w-full text-left font-semibold py-2 text-foreground hover:text-foreground transition-colors flex items-center gap-2">
              <ChevronDown className={`h-4 w-4 transition-transform ${editingCouplemembersOpen ? 'rotate-180' : ''}`} />
              <span>Couple Members</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 w-full min-w-0">
{/*               <div className="bg-card border rounded p-3 mb-2">
                <div className="space-y-1 mb-3">
                  <div>
                    <span className="text-xs muted-foreground">Member 1: </span>
                    <span className="font-medium text-foreground text-sm">
                      {wedding?.spouse1?.name || 'Not set'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs muted-foreground">Member 2: </span>
                    <span className="font-medium text-foreground text-sm">
                      {wedding?.spouse2?.name || 'Not set'}
                    </span>
                  </div>
                </div>
              </div> */}
              <CouplemembersEditor
                weddingId={weddingId}
                onUpdate={() => {
                  fetchWeddingDetails();
                  onUpdate?.(wedding!);
                }}
                onSaveComplete={() => setEditingCouplemembersOpen(false)}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Vendors Section */}
          <Collapsible
            open={editingVendorsOpen}
            onOpenChange={setEditingVendorsOpen}
          >
            <CollapsibleTrigger className="w-full text-left font-semibold py-2 text-foreground hover:text-foreground transition-colors flex items-center gap-2">
              <ChevronDown className={`h-4 w-4 transition-transform ${editingVendorsOpen ? 'rotate-180' : ''}`} />
              <span>Vendors</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 w-full min-w-0">
              <div className="bg-card border rounded p-3 mb-2 text-sm text-foreground">
                Manage vendors for this wedding
              </div>
              <VendorEditor
                weddingId={weddingId}
                onUpdate={() => {
                  fetchWeddingDetails();
                  onUpdate?.(wedding!);
                }}
                onSaveComplete={() => setEditingVendorsOpen(false)}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Planners Section */}
          <Collapsible
            open={expandedPlannersOpen}
            onOpenChange={setExpandedPlannersOpen}
          >
            <CollapsibleTrigger className="w-full text-left font-semibold py-2 text-foreground hover:text-foreground transition-colors flex items-center gap-2">
              <ChevronDown className={`h-4 w-4 transition-transform ${expandedPlannersOpen ? 'rotate-180' : ''}`} />
              <span>Assign Planners</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 w-full min-w-0">
              <div className="w-full min-w-0 overflow-x-auto">
                <PlannerAssignment 
                  weddingId={weddingId} 
                  onAssignmentChanged={() => {
                    fetchWeddingDetails();
                    onUpdate?.(wedding!);
                  }} 
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDateConfirm}
        title="Update Wedding Date"
        message="Changing the wedding date will recalculate all task due dates. Template & manual tasks will be updated automatically."
        confirmText="Update Date"
        cancelText="Cancel"
        isDangerous={false}
        onConfirm={() => performSave(pendingUpdates)}
        onCancel={() => {
          setShowDateConfirm(false);
          setPendingUpdates(null);
        }}
      />
    </div>
  );
}
