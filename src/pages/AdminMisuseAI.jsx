import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { AlertTriangle, Mail, User, MessageSquare, Clock, ShieldAlert, Loader2, Trash2 } from 'lucide-react';

const AdminMisuseAI = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_misuse_reports')
        .select('*')
        .order('detected_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Failed to load misuse reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (id) => {
    try {
      const { error } = await supabase
        .from('ai_misuse_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      console.error('Failed to delete report:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <Loader2 size={32} className="text-red-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl border border-red-300/20 shadow-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
              <ShieldAlert size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Missuse AI</h1>
              <p className="text-sm text-red-300">
                {reports.length} misuse report{reports.length !== 1 ? 's' : ''} detected
              </p>
            </div>
          </div>

          {reports.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <ShieldAlert size={48} className="mx-auto mb-3 text-slate-600" />
              <p className="text-sm font-medium">No misuse reports yet</p>
              <p className="text-xs text-slate-500 mt-1">Non-educational queries will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className={`bg-white/5 rounded-2xl border p-4 cursor-pointer transition-all ${
                    selected?.id === report.id
                      ? 'border-red-400/50 ring-1 ring-red-400/30'
                      : 'border-red-300/10 hover:border-red-300/30'
                  }`}
                  onClick={() => setSelected(selected?.id === report.id ? null : report)}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {report.profile_pic ? (
                        <img
                          src={report.profile_pic}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-red-400/30"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-red-900/50 flex items-center justify-center">
                          <User size={18} className="text-red-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-white font-medium text-sm truncate">
                            {report.full_name || 'Unknown User'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Mail size={11} className="text-red-400" />
                            <span className="text-xs text-red-300 truncate">{report.email}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
                          <Clock size={11} />
                          {report.detected_at
                            ? new Date(report.detected_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Unknown'}
                        </div>
                      </div>

                      <div className="mt-3 bg-red-900/20 rounded-xl p-3 border border-red-500/20">
                        <div className="flex items-start gap-2">
                          <MessageSquare size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-red-200 whitespace-pre-wrap break-words">
                            {report.message}
                          </p>
                        </div>
                      </div>

                      {selected?.id === report.id && (
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteReport(report.id); }}
                            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-400/30 hover:bg-red-900/30 transition"
                          >
                            <Trash2 size={12} />
                            Delete Report
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMisuseAI;
