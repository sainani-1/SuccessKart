import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleDot, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const STATUS_STYLES = {
  open: 'bg-rose-100 text-rose-700 border-rose-200',
  reviewing: 'bg-amber-100 text-amber-700 border-amber-200',
  cleared: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const STATUS_LABELS = { open: 'Open', reviewing: 'Reviewing', cleared: 'Cleared' };

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'reviewing', label: 'Reviewing' },
  { key: 'cleared', label: 'Cleared' },
];

// Plagiarism / review reports raised on the students assigned to this teacher.
// Status can be updated once the plagiarism_teacher_update policy is applied.
const TeacherPlagiarism = () => {
  const { profile } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState('');

  const loadReports = useCallback(async () => {
    if (!profile?.id) return;
    const { data, error } = await supabase
      .from('plagiarism_reports')
      .select('*')
      .eq('teacher_id', profile.id)
      .order('created_at', { ascending: false });
    if (error) setNotice(error.message);
    setReports(data || []);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const studentIds = useMemo(
    () => [...new Set(reports.map((report) => report.student_id).filter(Boolean))],
    [reports]
  );

  const [studentsById, setStudentsById] = useState({});
  useEffect(() => {
    if (!studentIds.length) return;
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', studentIds)
      .then(({ data }) => {
        setStudentsById(Object.fromEntries((data || []).map((row) => [row.id, row])));
      });
  }, [studentIds]);

  const updateStatus = async (report, status) => {
    setBusyId(report.id);
    setNotice('');
    const { error } = await supabase
      .from('plagiarism_reports')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', report.id);
    if (error) {
      setNotice(
        `Could not update status: ${error.message}. If permission was denied, apply the 20261012_coding_profile_visibility.sql migration in Supabase.`
      );
    } else {
      setReports((prev) =>
        prev.map((row) => (row.id === report.id ? { ...row, status } : row))
      );
      setNotice('');
    }
    setBusyId(null);
  };

  const counts = useMemo(
    () => ({
      all: reports.length,
      open: reports.filter((report) => report.status === 'open').length,
      reviewing: reports.filter((report) => report.status === 'reviewing').length,
      cleared: reports.filter((report) => report.status === 'cleared').length,
    }),
    [reports]
  );

  const visible = useMemo(
    () => (filter === 'all' ? reports : reports.filter((report) => report.status === filter)),
    [reports, filter]
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 py-10">
        <Loader2 className="animate-spin" size={18} /> Loading reports…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert size={24} /> Plagiarism Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Reports on your assigned students. Clear a report after review, or mark it for
            further checking.
          </p>
        </div>
        <button
          onClick={loadReports}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {notice ? (
        <div className="text-sm rounded-xl px-4 py-3 border bg-rose-50 border-rose-200 text-rose-700">
          {notice}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
              filter === item.key
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {item.label} ({counts[item.key]})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="bg-white border rounded-2xl p-10 text-center text-slate-400">
          <AlertTriangle className="mx-auto mb-2" size={34} />
          <p className="text-sm">
            {reports.length
              ? `No ${filter} reports.`
              : 'No plagiarism reports assigned to you.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b text-slate-500">
                <th className="p-4">Student</th>
                <th className="p-4">Exam / Contest</th>
                <th className="p-4">Reason</th>
                <th className="p-4">Raised</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((report) => {
                const student = studentsById[report.student_id];
                const status = STATUS_LABELS[report.status] ? report.status : 'open';
                return (
                  <tr key={report.id} className="border-b last:border-0 align-top">
                    <td className="p-4">
                      <p className="font-semibold text-slate-800">
                        {report.suspect_name || student?.full_name || 'Unnamed student'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {report.suspect_email || student?.email || ''}
                      </p>
                    </td>
                    <td className="p-4">{report.exam_title || '—'}</td>
                    <td className="p-4 max-w-xs">
                      <p>{report.reason || report.details || 'Review required'}</p>
                      {report.details && report.reason ? (
                        <p className="text-xs text-slate-400 mt-1">{report.details}</p>
                      ) : null}
                    </td>
                    <td className="p-4 text-xs text-slate-500 whitespace-nowrap">
                      {report.created_at ? new Date(report.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block text-[11px] font-bold uppercase px-2 py-1 rounded-full border ${
                          STATUS_STYLES[status] || STATUS_STYLES.open
                        }`}
                      >
                        {STATUS_LABELS[status] || status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5">
                        {status !== 'reviewing' ? (
                          <button
                            onClick={() => updateStatus(report, 'reviewing')}
                            disabled={busyId === report.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                          >
                            <CircleDot size={11} /> Mark Reviewing
                          </button>
                        ) : null}
                        {status !== 'cleared' ? (
                          <button
                            onClick={() => updateStatus(report, 'cleared')}
                            disabled={busyId === report.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            <CheckCircle2 size={11} /> Mark Cleared
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TeacherPlagiarism;
