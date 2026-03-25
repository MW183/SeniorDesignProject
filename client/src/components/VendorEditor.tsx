import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import Button from './ui/Button';

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
}

export default function VendorEditor({ weddingId, onUpdate }: VendorEditorProps) {
  const [weddingVendors, setWeddingVendors] = useState<WeddingVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [vendorSearch, setVendorSearch] = useState('');
  const [availableVendors, setAvailableVendors] = useState<Vendor[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    fetchWeddingVendors();
  }, [weddingId]);

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

  const searchVendors = async () => {
    if (vendorSearch.trim().length === 0) {
      setAvailableVendors([]);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await api(`/vendors?search=${encodeURIComponent(vendorSearch)}`);
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
      const res = await api(`/weddings/${weddingId}/vendors/${editingVendorId}`, {
        method: 'PUT',
        body: {
          rating: editRating,
          notes: editNotes.trim().length > 0 ? editNotes : null
        }
      });

      if (res.ok) {
        const updatedVendors = weddingVendors.map(wv =>
          wv.vendorId === editingVendorId ? res.body : wv
        );
        setWeddingVendors(updatedVendors);
        onUpdate?.(updatedVendors);
        setEditingVendorId(null);
      } else {
        setEditError(res.body?.error || 'Failed to save rating');
      }
    } catch (err) {
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
      } else {
        setError(res.body?.error || 'Failed to remove vendor');
      }
    } catch (err) {
      setError('An error occurred while removing vendor');
    }
  };

  if (loading) {
    return <p className="text-slate-400">Loading vendors...</p>;
  }

  const editingVendor = weddingVendors.find(wv => wv.vendorId === editingVendorId);

  return (
    <div className="space-y-4">
      {/* Display assigned vendors */}
      {weddingVendors.length > 0 ? (
        <div className="space-y-3">
          {weddingVendors.map(wv => (
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
                    <label className="text-sm text-slate-300 mb-2 block">Rating (0-5 stars)</label>
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
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          {'★'.repeat(star || 1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-sm text-slate-300 mb-2 block">
                      Notes {editRating > 0 && <span className="text-red-400">*</span>}
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

                  {editError && <div className="text-sm text-red-400">{editError}</div>}

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

                  {wv.notes && <p className="text-xs text-slate-300 mb-2 italic">{wv.notes}</p>}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditVendor(wv);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveVendor(wv.vendorId);
                      }}
                      className="text-xs text-red-400 hover:text-red-300 underline"
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
        <p className="text-slate-400 text-sm">No vendors assigned yet</p>
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
          <h4 className="text-sm font-medium text-slate-300">Search Vendors</h4>

          <div className="flex gap-2">
            <input
              type="text"
              value={vendorSearch}
              onChange={(e) => {
                e.stopPropagation();
                setVendorSearch(e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  searchVendors();
                }
              }}
              placeholder="Search vendors..."
              className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 outline-none"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                searchVendors();
              }}
              disabled={searchLoading}
              className="px-3 py-2 bg-blue-700 hover:bg-blue-600 disabled:bg-slate-600 text-white text-sm rounded"
            >
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Search results */}
          {availableVendors.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableVendors.map(vendor => (
                <div
                  key={vendor.id}
                  className="bg-slate-900 border border-slate-600 rounded p-2 flex justify-between items-start"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{vendor.name}</p>
                    {vendor.email && <p className="text-xs text-slate-400">{vendor.email}</p>}
                    {vendor.phone && <p className="text-xs text-slate-400">{vendor.phone}</p>}
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
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAssignVendor(vendor);
                    }}
                    className="text-xs px-2 py-1 bg-green-700 hover:bg-green-600 text-white rounded whitespace-nowrap"
                  >
                    Assign
                  </button>
                </div>
              ))}
            </div>
          )}

          {vendorSearch && searchLoading && (
            <p className="text-sm text-slate-400">Searching...</p>
          )}

          {vendorSearch && !searchLoading && availableVendors.length === 0 && (
            <p className="text-sm text-slate-500">(All matching vendors are already assigned)</p>
          )}

          {error && <div className="text-sm text-red-400">{error}</div>}

          <button
            type="button"
            onClick={(e) => {
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
