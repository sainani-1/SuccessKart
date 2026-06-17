import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Trash2, Save, X } from 'lucide-react';
import usePopup from '../hooks/usePopup';
import LoadingSpinner from '../components/LoadingSpinner';

const DEFAULT_FORM = {
  name: '',
  price: '',
  useCase: '',
  whatPresentNow: '',
  whatItWillBe: '',
};

const AdminAddons = () => {
  const [addons, setAddons] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { popupNode, openPopup } = usePopup();

  useEffect(() => {
    loadAddons();
  }, []);

  const loadAddons = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'addons')
        .maybeSingle();
      const parsed = data?.value ? JSON.parse(data.value) : [];
      setAddons(Array.isArray(parsed) ? parsed : []);
    } catch {
      setAddons([]);
    } finally {
      setLoading(false);
    }
  };

  const persistAddons = async (next) => {
    setSaving(true);
    try {
      await supabase
        .from('settings')
        .upsert({ key: 'addons', value: JSON.stringify(next) }, { onConflict: 'key' });
      setAddons(next);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      openPopup('Missing Name', 'Please enter an add-on name.', 'warning');
      return;
    }
    if (!form.price || Number(form.price) < 0) {
      openPopup('Invalid Price', 'Please enter a valid price.', 'warning');
      return;
    }
    if (!form.useCase.trim()) {
      openPopup('Missing Use Case', 'Please describe the use case.', 'warning');
      return;
    }

    if (editingId) {
      const next = addons.map((a) =>
        a.id === editingId
          ? { ...a, name: form.name.trim(), price: Number(form.price), useCase: form.useCase.trim(), whatPresentNow: form.whatPresentNow.trim(), whatItWillBe: form.whatItWillBe.trim() }
          : a
      );
      await persistAddons(next);
      openPopup('Updated', 'Add-on updated successfully.', 'success');
    } else {
      const newAddon = {
        id: `addon_${Date.now()}`,
        name: form.name.trim(),
        price: Number(form.price),
        useCase: form.useCase.trim(),
        whatPresentNow: form.whatPresentNow.trim(),
        whatItWillBe: form.whatItWillBe.trim(),
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      await persistAddons([newAddon, ...addons]);
      openPopup('Added', 'Add-on added successfully.', 'success');
    }
    setForm(DEFAULT_FORM);
    setEditingId(null);
  };

  const startEdit = (addon) => {
    setForm({
      name: addon.name,
      price: String(addon.price),
      useCase: addon.useCase,
      whatPresentNow: addon.whatPresentNow,
      whatItWillBe: addon.whatItWillBe,
    });
    setEditingId(addon.id);
  };

  const cancelEdit = () => {
    setForm(DEFAULT_FORM);
    setEditingId(null);
  };

  const toggleActive = async (id) => {
    const next = addons.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a));
    await persistAddons(next);
  };

  const removeAddon = async (id) => {
    const next = addons.filter((a) => a.id !== id);
    await persistAddons(next);
    if (editingId === id) cancelEdit();
    openPopup('Removed', 'Add-on removed successfully.', 'success');
  };

  if (loading) return <LoadingSpinner message="Loading add-ons..." />;

  return (
    <div className="space-y-6">
      {popupNode}

      <div className="bg-gradient-to-r from-slate-900 to-slate-700 p-6 rounded-xl text-white">
        <h1 className="text-2xl font-bold mb-1">Add-Ons Management</h1>
        <p className="text-slate-200">Create and manage premium plus add-ons.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 mb-4">{editingId ? 'Edit Add-On' : 'Add New Add-On'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Add-On Name</label>
            <input
              type="text"
              className="w-full p-3 border border-slate-300 rounded-lg"
              placeholder="e.g. Advanced Analytics"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Price (INR)</label>
            <input
              type="number"
              min="0"
              className="w-full p-3 border border-slate-300 rounded-lg"
              placeholder="99"
              value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Use Case</label>
            <textarea
              rows={2}
              className="w-full p-3 border border-slate-300 rounded-lg"
              placeholder="What this add-on is used for..."
              value={form.useCase}
              onChange={(e) => setForm((p) => ({ ...p, useCase: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">What Present Now</label>
            <textarea
              rows={3}
              className="w-full p-3 border border-slate-300 rounded-lg"
              placeholder="What users currently have..."
              value={form.whatPresentNow}
              onChange={(e) => setForm((p) => ({ ...p, whatPresentNow: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">What It Will Be</label>
            <textarea
              rows={3}
              className="w-full p-3 border border-slate-300 rounded-lg"
              placeholder="What users will get after purchasing this add-on..."
              value={form.whatItWillBe}
              onChange={(e) => setForm((p) => ({ ...p, whatItWillBe: e.target.value }))}
            />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white disabled:opacity-60 ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {editingId ? <><Save size={16} /> Update Add-On</> : <><Plus size={16} /> Add Add-On</>}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-200 text-slate-700 font-semibold hover:bg-slate-300"
            >
              <X size={16} /> Cancel
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Current Add-Ons ({addons.length})</h2>
        {addons.length === 0 ? (
          <p className="text-slate-500 text-sm">No add-ons added yet.</p>
        ) : (
          <div className="space-y-3">
            {addons.map((addon) => (
              <div key={addon.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900">{addon.name}</h3>
                      <span className="text-sm font-bold text-emerald-600">INR {addon.price}</span>
                    </div>
                    {addon.useCase && <p className="text-sm text-slate-600 mt-1"><span className="font-medium">Use Case:</span> {addon.useCase}</p>}
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {addon.whatPresentNow && (
                        <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
                          <span className="font-medium text-slate-700">Present:</span>
                          <p className="text-slate-600 mt-0.5">{addon.whatPresentNow}</p>
                        </div>
                      )}
                      {addon.whatItWillBe && (
                        <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-200">
                          <span className="font-medium text-emerald-700">After:</span>
                          <p className="text-emerald-600 mt-0.5">{addon.whatItWillBe}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleActive(addon.id)}
                      className={`px-3 py-1.5 rounded text-sm font-semibold ${addon.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}
                    >
                      {addon.isActive ? 'Active' : 'Inactive'}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(addon)}
                      className="px-3 py-1.5 rounded text-sm font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAddon(addon.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm font-semibold bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAddons;
