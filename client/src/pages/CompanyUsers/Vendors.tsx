import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Index';
import { Button } from '../../components/ui/Index';
import { Input } from '../../components/ui/Index';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../../components/ui/Index';
import { Star } from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  rating: number;
  notes?: string;
  addressId?: string;
  tags?: Array<{ tag: { id: string; name: string } }>;
}

interface Tag {
  id: string;
  name: string;
}

export default function Vendors({ currentUser }: { currentUser?: any }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vendor.email && vendor.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (vendor.phone && vendor.phone.includes(searchTerm)) ||
    (vendor.tags && vendor.tags.some(vt => vt.tag.name.toLowerCase().includes(searchTerm.toLowerCase())))
  );
  
  // Create form state
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createRating, setCreateRating] = useState(0);
  const [createHoverRating, setCreateHoverRating] = useState(0);
  const [createNotes, setCreateNotes] = useState('');
  
  // Edit form state
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRating, setEditRating] = useState(0);
  const [editHoverRating, setEditHoverRating] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState<Set<string>>(new Set());
  const [tagInput, setTagInput] = useState('');
  
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';
  const canEdit = currentUser?.role === 'ADMIN' || currentUser?.role === 'PLANNER';

  useEffect(() => {
    loadVendors();
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const res = await api('/vendors/tags/list');
      if (res.ok) {
        setAllTags(Array.isArray(res.body) ? res.body : []);
      }
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  };

  const loadVendors = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api('/vendors');
      if (res.ok) {
        setVendors(Array.isArray(res.body) ? res.body : []);
      } else {
        setError(res.body?.error || 'Failed to load vendors');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingId('create');
    
    if (!createName.trim()) {
      alert('Vendor name is required');
      setSavingId(null);
      return;
    }

    try {
      const res = await api('/vendors', {
        method: 'POST',
        body: {
          name: createName,
          email: createEmail || undefined,
          phone: createPhone || undefined,
          rating: parseInt(createRating as any) || 0,
          notes: createNotes || undefined
        }
      });

      if (res.ok) {
        setCreateName('');
        setCreateEmail('');
        setCreatePhone('');
        setCreateRating(0);
        setCreateNotes('');
        setShowCreateForm(false);
        loadVendors();
      } else {
        alert(res.body?.error || res.body?.errors?.[0] || 'Failed to create vendor');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creating vendor');
    } finally {
      setSavingId(null);
    }
  };

  const startEditVendor = (vendor: Vendor) => {
    setEditingVendorId(vendor.id);
    setEditName(vendor.name);
    setEditEmail(vendor.email || '');
    setEditPhone(vendor.phone || '');
    setEditRating(vendor.rating || 0);
    setEditNotes(vendor.notes || '');
    setEditTags(new Set(vendor.tags?.map(vt => vt.tag.id) || []));
    setTagInput('');
  };

  const updateVendor = async () => {
    if (!editingVendorId) return;
    if (!editName.trim()) {
      alert('Vendor name is required');
      return;
    }

    setSavingId(editingVendorId);
    try {
      const res = await api(`/vendors/${editingVendorId}`, {
        method: 'PUT',
        body: {
          name: editName,
          email: editEmail || undefined,
          phone: editPhone || undefined,
          rating: editRating,
          notes: editNotes || undefined
        }
      });

      if (res.ok) {
        // Sync tags
        const currentVendor = vendors.find(v => v.id === editingVendorId);
        const currentTagIds = new Set(currentVendor?.tags?.map(vt => vt.tag.id) || []);
        
        const tagUpdates: Promise<any>[] = [];
        
        // Add new tags
        Array.from(editTags).forEach(tagId => {
          if (!currentTagIds.has(tagId)) {
            tagUpdates.push(api(`/vendors/${editingVendorId}/tags/${tagId}`, { method: 'POST' }));
          }
        });
        
        // Remove deleted tags
        Array.from(currentTagIds).forEach(tagId => {
          if (!editTags.has(tagId)) {
            tagUpdates.push(api(`/vendors/${editingVendorId}/tags/${tagId}`, { method: 'DELETE' }));
          }
        });

        await Promise.all(tagUpdates);

        setEditingVendorId(null);
        setTagInput('');
        loadVendors();
      } else {
        alert(res.body?.error || res.body?.errors?.[0] || 'Failed to update vendor');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating vendor');
    } finally {
      setSavingId(null);
    }
  };

  const deleteVendor = async (vendorId: string) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;

    setSavingId(vendorId);
    try {
      const res = await api(`/vendors/${vendorId}`, { method: 'DELETE' });
      if (res.ok) {
        loadVendors();
      } else {
        alert(res.body?.error || 'Failed to delete vendor');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting vendor');
    } finally {
      setSavingId(null);
    }
  };

  const avgRating = vendors.length > 0 ? (vendors.reduce((sum, v) => sum + v.rating, 0) / vendors.length).toFixed(1) : 0;
  const ratedVendors = vendors.filter(v => v.rating > 0).length;

  return (
    <div className="max-w-6xl mx-auto mt-8">
      {/* Header and Stats */}
      <Card className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Vendors</h2>
        <p className="text-foreground mb-4">
          {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} • {ratedVendors} rated • Avg rating: {avgRating}/5
        </p>
        
        {error && <div className="text-sm text-red-400 mb-4">{error}</div>}
      </Card>

      {/* Create Form */}
      {canEdit && (
        <Card className="mb-6">
          <Collapsible
            open={showCreateForm}
            onOpenChange={setShowCreateForm}
          >
            <CollapsibleTrigger className="w-full text-left font-semibold py-2 hover:text-foreground transition-colors">
              Add New Vendor
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <form onSubmit={createVendor} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <>
                    <label className="text-sm text-foreground block mb-2">Name *</label>
                    <Input
                      value={createName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateName(e.target.value)}
                      className="bg-input hover:bg-input/80"
                    />
                  </>
                  <>
                    <label className="text-sm text-foreground block mb-2">Email</label>
                    <Input
                      type="email"
                      value={createEmail}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateEmail(e.target.value)}
                      className="bg-input hover:bg-input/80"
                    />
                  </>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <>
                    <label className="text-sm text-foreground block mb-2">Phone</label>
                    <Input
                      value={createPhone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreatePhone(e.target.value)}
                      className="bg-input hover:bg-input/80"
                    />
                  </>
                  <>
                    <label className="text-sm text-foreground mb-2 w-auto">Rating</label>
                    <div className="flex gap-1 place-items-end">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setCreateRating(star);
                          }}
                          onMouseEnter={() => setCreateHoverRating(star)}
                          onMouseLeave={() => setCreateHoverRating(0)}
                          className="p-0 hover:scale-110 transition-transform"
                        >
                          <Star
                            size={24}
                            className={`${
                              star <= (createHoverRating || createRating)
                                ? 'fill-accent stroke-accent'
                                : 'stroke-muted-foreground'
                            }`}
                          />
                        </button>
                      ))}
                      {createRating > 0 && (
                        <span className="text-sm text-muted-foreground ml-2">{createRating}/5</span>
                      )}
                    </div>
                  </>
                </div>

                <>
                  <label className="text-sm text-foreground block mb-2">Notes</label>
                  <textarea
                    value={createNotes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCreateNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-input hover:bg-input/80 text-sm focus:border-ring"
                    rows={3}
                  />
                </>

                <div className="flex gap-2 justify-end pt-2">
                  <Button
                    onClick={() => setShowCreateForm(false)}
                    className="bg-card hover:bg-card/80"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={savingId === 'create'}
                    className="bg-green-700 hover:bg-green-600 disabled:opacity-50"
                  >
                    {savingId === 'create' ? 'Creating...' : 'Create Vendor'}
                  </Button>
                </div>
              </form>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Search */}
      <Card className="mb-6">
        <Input
          type="text"
          placeholder="Search vendors by name, email, phone, or tag..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-input hover:bg-input/80 border"
        />
      </Card>

      {/* Vendor List */}
      <Card>
        {loading ? (
          <p className="text-foreground">Loading vendors...</p>
        ) : filteredVendors.length === 0 && vendors.length > 0 ? (
          <p className="text-foreground">No vendors match your search.</p>
        ) : vendors.length === 0 ? (
          <p className="text-foreground">No vendors found.</p>
        ) : (
          <div className="space-y-3">
            {filteredVendors.map(vendor => {
              const isEditing = editingVendorId === vendor.id;
              const isSaving = savingId === vendor.id;

              return (
                <div
                  key={vendor.id}
                  className={`p-4 rounded bg-card border ${
                    isEditing ? 'border-blue-600 bg-card/40' : 'border-pink-700 bg-card hover:bg-input'
                  } transition`}
                >
                  {isEditing ? (
                    // Edit Mode
                    <div className="space-y-4" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-foreground block mb-1">Name</label>
                          <Input
                            value={editName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                            className="bg-input border"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-foreground block mb-1">Email</label>
                          <Input
                            type="email"
                            value={editEmail}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditEmail(e.target.value)}
                            className="bg-input border"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-foreground block mb-1">Phone</label>
                          <Input
                            value={editPhone}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditPhone(e.target.value)}
                            className="bg-input border"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-foreground block mb-1">Rating (0-5 stars)</label>
                          <div className="flex gap-1 items-center">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setEditRating(star);
                                }}
                                onMouseEnter={() => setEditHoverRating(star)}
                                onMouseLeave={() => setEditHoverRating(0)}
                                className="p-0 hover:scale-110 transition-transform"
                              >
                                <Star
                                  size={20}
                                  className={`${
                                    star <= (editHoverRating || editRating)
                                      ? 'fill-accent stroke-accent'
                                      : 'stroke-muted-foreground'
                                  }`}
                                />
                              </button>
                            ))}
                            {editRating > 0 && (
                              <span className="text-xs text-muted-foreground ml-2">{editRating}/5</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-foreground block mb-1">Notes</label>
                        <textarea
                          value={editNotes}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditNotes(e.target.value)}
                          className="w-full px-3 py-2 border focus:border-primary bg-input hover:bg-input/80 text-sm"
                          rows={2}
                        />
                      </div>

                      <div>
                        <label className="text-xs text-foreground block mb-2">Tags</label>
                        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-card rounded min-h-10 items-start">
                          {editTags.size === 0 ? (
                            <span className="text-xs text-card-foreground bg-card self-center">No tags selected</span>
                          ) : (
                            Array.from(editTags).map(tagId => {
                              const tag = allTags.find(t => t.id === tagId);
                              return (
                                <div key={tagId} className="flex items-center gap-1 bg-input hover:bg-input/80 px-2 py-1 rounded text-xs text-foreground">
                                  {tag?.name}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newTags = new Set(editTags);
                                      newTags.delete(tagId);
                                      setEditTags(newTags);
                                    }}
                                    className="ml-1 text-foreground hover:text-red-400 font-bold bg-input"
                                  >
                                    ✕
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            value={tagInput}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
                            onKeyDown={async (e: React.KeyboardEvent<HTMLInputElement>) => {
                              if (e.key === 'Enter' && tagInput.trim()) {
                                e.preventDefault();
                                try {
                                  const res = await api('/vendors/tags/create', {
                                    method: 'POST',
                                    body: { name: tagInput.trim() }
                                  });
                                  if (res.ok) {
                                    const newTag = res.body;
                                    const newTags = new Set(editTags);
                                    newTags.add(newTag.id);
                                    setEditTags(newTags);
                                    setTagInput('');
                                    // Refresh available tags
                                    const tagsRes = await api('/vendors/tags/list');
                                    if (tagsRes.ok) {
                                      setAllTags(Array.isArray(tagsRes.body) ? tagsRes.body : []);
                                    }
                                  } else {
                                    alert(res.body?.error || 'Failed to create tag');
                                  }
                                } catch (err) {
                                  alert('Error creating tag');
                                }
                              }
                            }}
                            placeholder="Type tag name and press Enter"
                            className="flex-1"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        <Button
                          onClick={() => {
                            setEditingVendorId(null);
                            setTagInput('');
                          }}
                          size="sm"
                          className="bg-card hover:bg-card/80"
                          disabled={isSaving}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={updateVendor}
                          size="sm"
                          disabled={isSaving}
                          className="bg-green-700 hover:bg-green-600 disabled:opacity-50"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-start justify-between gap-4">
                      <div 
                        onClick={() => canEdit && startEditVendor(vendor)} 
                        className={`flex-1 ${canEdit ? 'cursor-pointer' : ''}`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-foreground">{vendor.name}</h4>
                          {vendor.rating > 0 && (
                            <span className="text-sm text-foreground">
                              {'★'.repeat(vendor.rating)}{'☆'.repeat(5 - vendor.rating)}
                            </span>
                          )}
                        </div>
                        
                        <div className="text-sm text-foreground space-y-1">
                          {vendor.email && <div>📧 {vendor.email}</div>}
                          {vendor.phone && <div>📱 {vendor.phone}</div>}
                          {vendor.notes && (
                            <>
                              <span className="font-semibold">Notes</span> {vendor.notes}
                            </>
                          )}
                          {vendor.tags && vendor.tags.length > 0 && (
                            <div className="text-xs mt-2">
                              <div className="font-semibold mb-1">Tags:</div>
                              <div className="flex flex-wrap gap-1">
                                {vendor.tags.map(vt => (
                                  <span key={vt.tag.id} className="bg-primary px-2 py-1 rounded text-foreground">
                                    {vt.tag.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {canEdit && (
                        <div className="flex gap-2 shrink-0">
                          <Button
                            onClick={() => startEditVendor(vendor)}
                            size="sm"
                            className="bg-primary hover:bg-primary/80 hover:border-secondary"
                            disabled={isSaving}
                          >
                            Edit
                          </Button>
                          {isAdmin && (
                            <Button
                              onClick={() => deleteVendor(vendor.id)}
                              size="sm"
                              className="bg-destructive/50 hover:bg-destructive"
                              disabled={isSaving}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
