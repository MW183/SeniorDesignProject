import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ChevronsUpDown, Plus } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
}

interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  rating: number;
  notes?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  tags?: Array<{ tag: Tag }>;
}

interface WeddingVendor {
  weddingId: string;
  vendorId: string;
  rating: number;
  notes?: string;
  vendor: Vendor;
  assignedAt: string;
}

interface VendorEditorProps {
  weddingId: string;
  onUpdate?: (vendors: WeddingVendor[]) => void;
  onSaveComplete?: () => void;
}

export default function VendorEditor({ weddingId, onUpdate, onSaveComplete }: VendorEditorProps) {
  const [weddingVendors, setWeddingVendors] = useState<WeddingVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [vendorSearch, setVendorSearch] = useState('');
  const [availableVendors, setAvailableVendors] = useState<Vendor[]>([]);
  const [assignedVendorSearch, setAssignedVendorSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [openAssignedSearch, setOpenAssignedSearch] = useState(false);
  const [openAddVendorSearch, setOpenAddVendorSearch] = useState(false);
  const [showCreateVendorForm, setShowCreateVendorForm] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorEmail, setNewVendorEmail] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [creatingVendor, setCreatingVendor] = useState(false);

  useEffect(() => {
    fetchWeddingVendors();
  }, [weddingId]);

  useEffect(() => {
    // Load all available vendors when "Add Vendor" modal opens
    if (showAddVendor && availableVendors.length === 0 && vendorSearch === '') {
      loadAllVendors();
    }
  }, [showAddVendor]);

  const fetchWeddingVendors = async () => {
    try {
      setLoading(true);
      const res = await api(`/weddings/${weddingId}/vendors`);
      if (res.ok) {
        setWeddingVendors(res.body);
      } else {
        setError('Failed to load wedding vendors');
      }
    } catch (err) {
      setError('An error occurred while loading vendors');
    } finally {
      setLoading(false);
    }
  };

  const loadAllVendors = async () => {
    setSearchLoading(true);
    try {
      const res = await api(`/vendors`);
      if (res.ok) {
        // Filter out already-assigned vendors
        const assignedVendorIds = weddingVendors.map(wv => wv.vendorId);
        const available = res.body.filter((v: Vendor) => !assignedVendorIds.includes(v.id));
        setAvailableVendors(available);
      } else {
        setAvailableVendors([]);
      }
    } catch (err) {
      setAvailableVendors([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Filter vendors based on search term
  const filterVendors = (vendors: Vendor[], searchTerm: string): Vendor[] => {
    if (!searchTerm.trim()) return vendors;
    const term = searchTerm.toLowerCase();
    return vendors.filter(v => 
      v.name.toLowerCase().includes(term) ||
      (v.email && v.email.toLowerCase().includes(term)) ||
      (v.phone && v.phone.includes(term)) ||
      (v.tags && v.tags.some(vt => vt.tag.name.toLowerCase().includes(term)))
    );
  };

  // Filter assigned vendors
  const filterAssignedVendors = (vendorList: WeddingVendor[], searchTerm: string): WeddingVendor[] => {
    if (!searchTerm.trim()) return vendorList;
    const term = searchTerm.toLowerCase();
    return vendorList.filter(wv =>
      wv.vendor.name.toLowerCase().includes(term) ||
      (wv.vendor.email && wv.vendor.email.toLowerCase().includes(term)) ||
      (wv.vendor.phone && wv.vendor.phone.includes(term)) ||
      (wv.vendor.tags && wv.vendor.tags.some(vt => vt.tag.name.toLowerCase().includes(term)))
    );
  };

  const handleAssignVendor = async (vendor: Vendor) => {
    try {
      setError(null);
      const res = await api(`/weddings/${weddingId}/vendors/${vendor.id}`, {
        method: 'POST'
      });

      if (res.ok) {
        setWeddingVendors([...weddingVendors, res.body]);
        setVendorSearch('');
        setAvailableVendors([]);
        setShowAddVendor(false);
        onUpdate?.([...weddingVendors, res.body]);
        onSaveComplete?.();
      } else {
        setError(res.body?.error || 'Failed to assign vendor');
      }
    } catch (err) {
      setError('An error occurred while assigning vendor');
    }
  };

  const handleEditVendor = (weddingVendor: WeddingVendor) => {
    setEditingVendorId(weddingVendor.vendorId);
    setEditRating(weddingVendor.rating);
    setEditNotes(weddingVendor.notes || '');
    setEditError(null);
  };

  const handleSaveRating = async () => {
    if (!editingVendorId) return;

    // Validate
    if (editRating > 0 && editNotes.trim().length === 0) {
      setEditError('Notes are required when rating is greater than 0');
      return;
    }

    try {
      setEditError(null);
      console.log('[VendorEditor] Saving rating:', { editRating, editNotes, editingVendorId });
      
      const res = await api(`/weddings/${weddingId}/vendors/${editingVendorId}`, {
        method: 'PUT',
        body: {
          rating: editRating,
          notes: editNotes.trim().length > 0 ? editNotes : null
        }
      });

      console.log('[VendorEditor] Save response:', { ok: res.ok, body: res.body });

      if (res.ok) {
        console.log('[VendorEditor] Response rating:', res.body?.rating);
        const updatedVendors = weddingVendors.map(wv =>
          wv.vendorId === editingVendorId ? res.body : wv
        );
        setWeddingVendors(updatedVendors);
        onUpdate?.(updatedVendors);
        setEditingVendorId(null);
        onSaveComplete?.();
      } else {
        setEditError(res.body?.error || 'Failed to save rating');
      }
    } catch (err) {
      console.error('[VendorEditor] Error saving rating:', err);
      setEditError('An error occurred while saving');
    }
  };

  const handleRemoveVendor = async (vendorId: string) => {
    if (!confirm('Remove this vendor from the wedding?')) return;

    try {
      setError(null);
      const res = await api(`/weddings/${weddingId}/vendors/${vendorId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        const updatedVendors = weddingVendors.filter(wv => wv.vendorId !== vendorId);
        setWeddingVendors(updatedVendors);
        onUpdate?.(updatedVendors);
        onSaveComplete?.();
      } else {
        setError(res.body?.error || 'Failed to remove vendor');
      }
    } catch (err) {
      setError('An error occurred while removing vendor');
    }
  };

  const handleCreateVendor = async () => {
    if (!newVendorName.trim()) {
      setError('Vendor name is required');
      return;
    }

    setCreatingVendor(true);
    setError(null);

    try {
      // Create vendor
      const vendorRes = await api('/vendors', {
        method: 'POST',
        body: {
          name: newVendorName.trim(),
          email: newVendorEmail.trim() || null,
          phone: newVendorPhone.trim() || null
        }
      });

      if (!vendorRes.ok) {
        setError(vendorRes.body?.errors?.[0] || vendorRes.body?.error || 'Failed to create vendor');
        setCreatingVendor(false);
        return;
      }

      // Assign vendor to wedding
      const vendor = vendorRes.body;
      const assignRes = await api(`/weddings/${weddingId}/vendors/${vendor.id}`, {
        method: 'POST'
      });

      if (assignRes.ok) {
        setWeddingVendors([...weddingVendors, assignRes.body]);
        setNewVendorName('');
        setNewVendorEmail('');
        setNewVendorPhone('');
        setShowCreateVendorForm(false);
        setShowAddVendor(false);
        onUpdate?.([...weddingVendors, assignRes.body]);
        onSaveComplete?.();
      } else {
        setError(assignRes.body?.error || 'Failed to assign vendor');
      }
    } catch (err) {
      setError('An error occurred while creating vendor');
    } finally {
      setCreatingVendor(false);
    }
  };

  if (loading) {
    return <p className="text-slate-400">Loading vendors...</p>;
  }

  const editingVendor = weddingVendors.find(wv => wv.vendorId === editingVendorId);
  const filteredWeddingVendors = filterAssignedVendors(weddingVendors, assignedVendorSearch);
  const filteredAvailableVendors = filterVendors(availableVendors, vendorSearch);

  return (
    <div className="space-y-4">
      {/* Display assigned vendors */}
      {weddingVendors.length > 0 ? (
        <div className="space-y-3">
          {/* Search assigned vendors */}
          <Popover open={openAssignedSearch} onOpenChange={setOpenAssignedSearch}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openAssignedSearch}
                className="w-full justify-between"
              >
                <span className="truncate text-slate-400">Search assigned vendors...</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
            <div className="flex flex-col">
              <Input
                placeholder="Search vendors by name, email, phone, or tag..."
                value={assignedVendorSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssignedVendorSearch(e.target.value)}
                className="m-1 mb-0"
              />
              <Command>
                <CommandEmpty>No assigned vendors found</CommandEmpty>
                <CommandList>
                  <CommandGroup>
                    {filteredWeddingVendors.map((wv) => (
                      <CommandItem
                        key={wv.vendorId}
                        value={wv.vendorId}
                        onSelect={() => {
                          setOpenAssignedSearch(false);
                        }}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-white">{wv.vendor.name}</p>
                          {(wv.vendor.email || wv.vendor.phone) && (
                            <p className="text-xs text-slate-400">
                              {wv.vendor.email && <span>{wv.vendor.email}</span>}
                              {wv.vendor.email && wv.vendor.phone && <span> • </span>}
                              {wv.vendor.phone && <span>{wv.vendor.phone}</span>}
                            </p>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
            </PopoverContent>
          </Popover>
          {filteredWeddingVendors.map(wv => (
            <div key={wv.vendorId} className="bg-slate-800 border border-slate-700 rounded p-3">
              {editingVendorId === wv.vendorId ? (
                // Edit mode
                <div className="space-y-3">
                  <div>
                    <h5 className="font-medium text-white mb-2">{wv.vendor.name}</h5>
                    {wv.vendor.email && <p className="text-xs text-slate-400">{wv.vendor.email}</p>}
                    {wv.vendor.phone && <p className="text-xs text-slate-400">{wv.vendor.phone}</p>}
                    {wv.vendor.tags && wv.vendor.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {wv.vendor.tags.map(vt => (
                          <span key={vt.tag.id} className="text-xs bg-slate-700 text-slate-200 px-2 py-1 rounded">
                            {vt.tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rating */}
                  <div>
                    <label className="text-sm text-foreground mb-2 block">Rating (0-5 stars)</label>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditRating(star);
                          }}
                          className={`px-3 py-1 text-sm rounded ${
                            editRating === star
                              ? 'bg-yellow-600 text-white'
                              : 'bg-card text-card-foreground hover:bg-card/80'
                          }`}
                        >
                          {'★'.repeat(star || 1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-sm text-foreground mb-2 block">
                      Notes {editRating > 0 && <span className="text-destructive">*</span>}
                    </label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => {
                        e.stopPropagation();
                        setEditNotes(e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Add notes about this vendor..."
                      className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                      rows={3}
                    />
                  </div>

                  {editError && <div className="text-sm text-destructive">{editError}</div>}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveRating();
                      }}
                      className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-sm rounded"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingVendorId(null);
                      }}
                      className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // Display mode
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h5 className="font-medium text-white">{wv.vendor.name}</h5>
                      {wv.vendor.email && <p className="text-xs text-slate-400">{wv.vendor.email}</p>}
                      {wv.vendor.phone && <p className="text-xs text-slate-400">{wv.vendor.phone}</p>}
                    </div>
                    <div className="text-right">
                      {wv.rating === 0 ? (
                        <p className="text-xs text-slate-500">No rating</p>
                      ) : (
                        <p className="text-sm text-yellow-400">{'★'.repeat(wv.rating)}</p>
                      )}
                    </div>
                  </div>

                  {wv.vendor.tags && wv.vendor.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {wv.vendor.tags.map(vt => (
                        <span key={vt.tag.id} className="text-xs bg-slate-700 text-slate-200 px-2 py-1 rounded">
                          {vt.tag.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {wv.notes && <p className="text-xs text-muted-foreground mb-2 italic">{wv.notes}</p>}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditVendor(wv);
                      }}
                      className="text-xs text-accent hover:text-accent/80 underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveVendor(wv.vendorId);
                      }}
                      className="text-xs text-destructive hover:text-destructive/80 underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No vendors assigned yet</p>
      )}

      {/* Add vendor section */}
      {!showAddVendor ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowAddVendor(true);
          }}
          className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded"
        >
          + Add Vendor
        </button>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded p-3 space-y-3">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Plus className="h-4 w-4" /> Search & Add Vendors
          </h4>

          {/* Search available vendors */}
          <Popover open={openAddVendorSearch} onOpenChange={setOpenAddVendorSearch}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openAddVendorSearch}
                className="w-full justify-between"
              >
                <span className="truncate text-slate-400">Search vendors by name, email, phone, or tag...</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
            <div className="flex flex-col">
              <Input
                placeholder="Search vendors..."
                value={vendorSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVendorSearch(e.target.value)}
                className="m-1 mb-0"
              />
              <Command>
                <CommandEmpty>
                  {searchLoading ? 'Loading vendors...' : 'No vendors found'}
                </CommandEmpty>
                <CommandList>
                  <CommandGroup>
                    {filteredAvailableVendors.map((vendor) => (
                      <CommandItem
                        key={vendor.id}
                        value={vendor.id}
                        onSelect={() => {
                          handleAssignVendor(vendor);
                          setOpenAddVendorSearch(false);
                          setVendorSearch('');
                        }}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-white">{vendor.name}</p>
                          {(vendor.email || vendor.phone) && (
                            <p className="text-xs text-slate-400">
                              {vendor.email && <span>{vendor.email}</span>}
                              {vendor.email && vendor.phone && <span> • </span>}
                              {vendor.phone && <span>{vendor.phone}</span>}
                            </p>
                          )}
                          {vendor.tags && vendor.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {vendor.tags.map(vt => (
                                <span key={vt.tag.id} className="text-xs bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded">
                                  {vt.tag.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
            </PopoverContent>
          </Popover>

          {/* Create new vendor form */}
          {!showCreateVendorForm ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowCreateVendorForm(true);
              }}
              className="w-full px-3 py-2 bg-green-900 hover:bg-green-800 text-white text-sm rounded"
            >
              + Create New Vendor
            </button>
          ) : (
            <div className="bg-slate-700 border border-slate-600 rounded p-3 space-y-2">
              <h4 className="text-sm font-medium text-slate-200">New Vendor</h4>
              <Input
                placeholder="Vendor name *"
                value={newVendorName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewVendorName(e.target.value)}
                className="text-sm"
              />
              <Input
                placeholder="Email"
                type="email"
                value={newVendorEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewVendorEmail(e.target.value)}
                className="text-sm"
              />
              <Input
                placeholder="Phone"
                value={newVendorPhone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewVendorPhone(e.target.value)}
                className="text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    handleCreateVendor();
                  }}
                  disabled={creatingVendor}
                  className="flex-1 px-2 py-1 bg-green-700 hover:bg-green-600 disabled:bg-slate-600 text-white text-sm rounded"
                >
                  {creatingVendor ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    setShowCreateVendorForm(false);
                    setNewVendorName('');
                    setNewVendorEmail('');
                    setNewVendorPhone('');
                  }}
                  className="flex-1 px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {error && <div className="text-sm text-red-400">{error}</div>}

          <button
            type="button"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              setShowAddVendor(false);
              setVendorSearch('');
              setAvailableVendors([]);
            }}
            className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
