import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Clock, Plus, Trash2, Play, Video, Loader2, Calendar, ExternalLink } from 'lucide-react';

const APP_URL = import.meta.env.VITE_PUBLIC_APP_URL?.replace(/\/+$/, '') || window.location.origin;

function ScheduleMeet() {
  const [apiKey, setApiKey] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const loadApiKey = useCallback(async () => {
    const { data } = await supabase
      .from('sucesskart_meet_api_keys')
      .select('api_key')
      .eq('is_active', true)
      .maybeSingle();
    if (data) setApiKey(data.api_key);
  }, []);

  const loadSchedules = useCallback(async () => {
    if (!apiKey) return;
    try {
      const res = await fetch(`${APP_URL}/api/v1/meet/schedule`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await res.json();
      if (data.schedules) setSchedules(data.schedules);
    } catch { /* ignore */ }
  }, [apiKey]);

  useEffect(() => {
    loadApiKey();
  }, [loadApiKey]);

  useEffect(() => {
    if (apiKey) {
      loadSchedules().then(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [apiKey, loadSchedules]);

  const handleCreate = useCallback(async (e) => {
    e.preventDefault();
    if (!title.trim() || !scheduledAt || !apiKey) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch(`${APP_URL}/api/v1/meet/schedule`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: title.trim(), scheduled_at: scheduledAt }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setTitle('');
        setScheduledAt('');
        await loadSchedules();
      }
    } catch {
      setError('Failed to create schedule.');
    } finally {
      setCreating(false);
    }
  }, [title, scheduledAt, apiKey, loadSchedules]);

  const handleDelete = useCallback(async (id) => {
    if (!apiKey) return;
    const res = await fetch(`${APP_URL}/api/v1/meet/schedule/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json();
    if (data.status === 'cancelled') {
      await loadSchedules();
    }
  }, [apiKey, loadSchedules]);

  const handleStart = useCallback(async (id) => {
    if (!apiKey) return;
    const res = await fetch(`${APP_URL}/api/v1/meet/schedule/${id}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json();
    if (data.join_url) {
      window.open(data.join_url, '_blank');
      await loadSchedules();
    }
  }, [apiKey, loadSchedules]);

  if (!apiKey) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <Clock size={48} className="text-blue-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Schedule Meetings</h1>
        <p className="text-slate-500">You need an active API key to schedule meetings.</p>
        <a href="/sucesskart-meet-apikeys" className="inline-block mt-4 text-blue-600 font-semibold hover:underline">Get API Key</a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 size={32} className="text-blue-400 animate-spin" />
      </div>
    );
  }

  const minDate = new Date().toISOString().slice(0, 16);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
        <Clock size={28} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-900">Schedule a Meeting</h1>
      </div>

      <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Weekly Team Sync"
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date & Time</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            min={minDate}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={creating || !title.trim() || !scheduledAt}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-40 transition"
        >
          {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Schedule Meeting
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Calendar size={20} /> Scheduled Meetings
        </h2>
        {schedules.length === 0 && (
          <p className="text-slate-400 text-sm">No meetings scheduled yet.</p>
        )}
        {schedules.map(s => {
          const dt = new Date(s.scheduled_at);
          const isPast = dt < new Date();
          const canStart = s.status === 'scheduled';
          return (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-semibold text-slate-900">{s.title || s.room_name}</div>
                <div className="text-sm text-slate-500">
                  {dt.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : s.status === 'active' ? 'bg-green-100 text-green-700' : s.status === 'ended' ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-700'}`}>
                    {s.status}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{s.room_name}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canStart && (
                  <button onClick={() => handleStart(s.id)}
                    className="p-2 rounded-xl bg-green-600 text-white hover:bg-green-500 transition" title="Start now">
                    <Play size={16} />
                  </button>
                )}
                {s.status === 'active' && s.room_name && (
                  <a href={`/meet/rooms/${s.room_name}`} target="_blank" rel="noreferrer"
                    className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition" title="Join">
                    <ExternalLink size={16} />
                  </a>
                )}
                {canStart && (
                  <button onClick={() => handleDelete(s.id)}
                    className="p-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition" title="Cancel">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ScheduleMeet;
