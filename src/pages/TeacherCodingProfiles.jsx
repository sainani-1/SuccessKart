import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Code2, ExternalLink, Eye, Loader2, Search, ShieldAlert, Users } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const PLATFORM_COLORS = {
  leetcode: 'bg-amber-100 text-amber-700 border-amber-200',
  codechef: 'bg-orange-100 text-orange-700 border-orange-200',
  hackerrank: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  codeforces: 'bg-blue-100 text-blue-700 border-blue-200',
  github: 'bg-slate-100 text-slate-700 border-slate-200',
  linkedin: 'bg-sky-100 text-sky-700 border-sky-200',
};

const STATUS_STYLES = {
  open: { chip: 'bg-rose-100 text-rose-700 border-rose-200', label: 'Open', Icon: AlertTriangle },
  reviewing: { chip: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Reviewing', Icon: Eye },
  cleared: { chip: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Cleared', Icon: CheckCircle2 },
};

const statusStyle = (status) =>
  STATUS_STYLES[String(status || 'open').toLowerCase()] || STATUS_STYLES.open;

const platformClass = (platform) =>
  PLATFORM_COLORS[String(platform || '').toLowerCase()] || 'bg-violet-100 text-violet-700 border-violet-200';

const profileUrl = (account) => {
  const raw = String(account.url || '').trim();
  if (raw) return raw.startsWith('http') ? raw : `https://${raw}`;
  const handle = String(account.handle || '').trim();
  if (!handle) return '';
  const platform = String(account.platform || '').toLowerCase();
  if (platform === 'github') return `https://github.com/${handle}`;
  if (platform === 'linkedin') return `https://www.linkedin.com/in/${handle}`;
  if (platform === 'leetcode') return `https://leetcode.com/${handle}`;
  if (platform === 'codechef') return `https://www.codechef.com/users/${handle}`;
  if (platform === 'codeforces') return `https://codeforces.com/profile/${handle}`;
  if (platform === 'hackerrank') return `https://www.hackerrank.com/${handle}`;
  return '';
};

const formatWhen = (iso) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '';

// Teacher / admin directory of every student's saved coding-platform links
// together with all plagiarism reports raised on them. Teachers see the
// students assigned to them; admins see everyone.
const TeacherCodingProfiles = () => {
  const { profile } = useAuth();
  const [students, setStudents] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      let studentQuery = supabase
        .from('profiles')
        .select('id, full_name, email, assigned_teacher_id')
        .eq('role', 'student')
        .order('full_name');
      if (!isAdmin) studentQuery = studentQuery.eq('assigned_teacher_id', profile.id);
      const [{ data: studentRows }, { data: accountRows }, { data: reportRows }] = await Promise.all([
        studentQuery,
        supabase.from('coding_accounts').select('user_id, platform, handle, url'),
        // RLS already scopes this: admins see every report, teachers only the
        // ones assigned to them (20261012 migration).
        supabase
          .from('plagiarism_reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500),
      ]);
      if (cancelled) return;
      setStudents(studentRows || []);
      setAccounts(accountRows || []);
      setReports(reportRows || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, isAdmin]);

  const byStudent = useMemo(() => {
    const map = new Map();
    accounts.forEach((account) => {
      const key = String(account.user_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(account);
    });
    map.forEach((rows) =>
      rows.sort((a, b) => String(a.platform).localeCompare(String(b.platform)))
    );
    return map;
  }, [accounts]);

  const reportsByStudent = useMemo(() => {
    const map = new Map();
    reports.forEach((report) => {
      const key = String(report.student_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(report);
    });
    return map;
  }, [reports]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return students;
    return students.filter((student) =>
      [student.full_name, student.email].some((value) =>
        String(value || '').toLowerCase().includes(needle)
      )
    );
  }, [students, query]);

  const withLinks = students.filter((student) => (byStudent.get(String(student.id)) || []).length).length;
  const openReports = reports.filter((report) => String(report.status || 'open') === 'open').length;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 py-10">
        <Loader2 className="animate-spin" size={18} /> Loading coding profiles &amp; plagiarism…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Code2 size={24} /> Coding Profiles &amp; Plagiarism
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin
              ? 'Every student’s coding-platform links (LeetCode, CodeChef, HackerRank…) with all plagiarism reports.'
              : 'Your assigned students’ coding-platform links with every plagiarism report raised on them.'}
          </p>
        </div>
        <div className="text-right text-xs text-slate-500 space-y-0.5">
          <p className="font-semibold text-slate-700">
            <Users size={13} className="inline -mt-0.5 mr-1" />
            {students.length} students · {withLinks} with links
          </p>
          <p className={`font-semibold ${openReports ? 'text-rose-600' : 'text-slate-500'}`}>
            <ShieldAlert size={13} className="inline -mt-0.5 mr-1" />
            {reports.length} plagiarism report{reports.length === 1 ? '' : 's'} ({openReports} open)
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by student name or email…"
          className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border rounded-2xl p-10 text-center text-slate-400">
          <Users className="mx-auto mb-2" size={34} />
          <p className="text-sm">
            {students.length
              ? 'No student matches that search.'
              : isAdmin
              ? 'No students registered yet.'
              : 'No students are assigned to you yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((student) => {
            const links = byStudent.get(String(student.id)) || [];
            const studentReports = reportsByStudent.get(String(student.id)) || [];
            const openCount = studentReports.filter(
              (report) => String(report.status || 'open') === 'open'
            ).length;
            const expanded = expandedId === student.id;
            return (
              <div key={student.id} className="bg-white border rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {student.full_name || 'Unnamed student'}
                    </p>
                    <p className="text-xs text-slate-500">{student.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {studentReports.length ? (
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border ${
                          openCount
                            ? 'bg-rose-50 text-rose-600 border-rose-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                      >
                        <ShieldAlert size={12} />
                        {studentReports.length} report{studentReports.length === 1 ? '' : 's'}
                        {openCount ? ` · ${openCount} open` : ''}
                      </span>
                    ) : null}
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">
                      {links.length
                        ? `${links.length} profile${links.length === 1 ? '' : 's'}`
                        : 'No profiles saved'}
                    </span>
                  </div>
                </div>

                {links.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {links.map((account) => {
                      const url = profileUrl(account);
                      const content = (
                        <>
                          <span className="font-semibold capitalize">{account.platform}</span>
                          {account.handle ? (
                            <span className="text-slate-500">@{String(account.handle).replace(/^@/, '')}</span>
                          ) : null}
                          {url ? <ExternalLink size={12} className="opacity-60" /> : null}
                        </>
                      );
                      return url ? (
                        <a
                          key={`${account.platform}-${account.handle}`}
                          href={url}
                          target="_blank"
                          rel="noreferrer noopener"
                          title="Open the student's profile on this platform to compare submissions"
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium hover:opacity-80 ${platformClass(
                            account.platform
                          )}`}
                        >
                          {content}
                        </a>
                      ) : (
                        <span
                          key={`${account.platform}-${account.handle}`}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${platformClass(
                            account.platform
                          )}`}
                        >
                          {content}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-400">
                    This student has not saved any coding profiles yet.
                  </p>
                )}

                {studentReports.length ? (
                  <div className="mt-4 border-t pt-3">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : student.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
                    >
                      {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      Plagiarism reports ({studentReports.length})
                    </button>
                    {expanded ? (
                      <div className="mt-2 space-y-2">
                        {studentReports.map((report) => {
                          const style = statusStyle(report.status);
                          const StatusIcon = style.Icon;
                          return (
                            <div
                              key={report.id || `${report.exam_title}-${report.created_at}`}
                              className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-800">
                                  {report.exam_title || 'Exam'}
                                </p>
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded-full border ${style.chip}`}
                                >
                                  <StatusIcon size={11} /> {style.label}
                                </span>
                              </div>
                              {report.reason ? (
                                <p className="text-xs text-slate-600 mt-1.5">{report.reason}</p>
                              ) : null}
                              {report.details ? (
                                <p className="text-xs text-slate-500 mt-1">{report.details}</p>
                              ) : null}
                              <p className="text-[11px] text-slate-400 mt-1.5">
                                Raised {formatWhen(report.created_at)}
                                {report.updated_at && report.updated_at !== report.created_at
                                  ? ` · updated ${formatWhen(report.updated_at)}`
                                  : ''}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeacherCodingProfiles;
