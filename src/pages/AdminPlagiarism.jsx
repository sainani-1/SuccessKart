import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Save, ShieldAlert } from 'lucide-react';
import { supabase } from '../supabaseClient';

const STATUS_OPTIONS = [
  { key: 'open', label: 'Open' },
  { key: 'reviewing', label: 'Reviewing' },
  { key: 'cleared', label: 'Cleared' },
];

const AdminPlagiarism = () => {
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState([]);
  const [aiUsers, setAiUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);

  const loadReports = async () => {
    const { data } = await supabase
      .from('plagiarism_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setReports(data || []);
  };

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('id, full_name, email').eq('role', 'teacher').order('full_name'),
      supabase.from('profiles').select('id, full_name, email').eq('role', 'student').order('full_name'),
      supabase.from('settings').select('key, value').in('key', ['plagiarism_enabled_teachers', 'ai_summary_enabled_users']),
      loadReports(),
    ]).then(([teachersResponse, studentsResponse, settings]) => {
      setTeachers(teachersResponse.data || []);
      setStudents(studentsResponse.data || []);
      const values = Object.fromEntries((settings.data || []).map((item) => [item.key, item.value]));
      try {
        setSelected(JSON.parse(values.plagiarism_enabled_teachers || '[]'));
        setAiUsers(JSON.parse(values.ai_summary_enabled_users || '[]'));
      } catch {
        setSelected([]);
        setAiUsers([]);
      }
    });
  }, []);

  const save = async () => {
    const results = await Promise.all([
      supabase.from('settings').upsert({ key: 'plagiarism_enabled_teachers', value: JSON.stringify(selected) }, { onConflict: 'key' }),
      supabase.from('settings').upsert({ key: 'ai_summary_enabled_users', value: JSON.stringify(aiUsers) }, { onConflict: 'key' }),
    ]);
    const error = results.find((result) => result.error)?.error;
    setMessage(error ? error.message : 'Teacher and AI summary access updated.');
  };

  const updateStatus = async (id, status) => {
    setBusyId(id);
    const { error } = await supabase
      .from('plagiarism_reports')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) setMessage(error.message);
    else setReports((prev) => prev.map((report) => (report.id === id ? { ...report, status } : report)));
    setBusyId(null);
  };

  const peopleById = useMemo(() => {
    const map = {};
    [...teachers, ...students].forEach((person) => {
      map[person.id] = person;
    });
    return map;
  }, [teachers, students]);

  const counts = useMemo(
    () => ({
      total: reports.length,
      open: reports.filter((report) => report.status === 'open').length,
    }),
    [reports]
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert size={22} /> Plagiarism &amp; AI Review Access
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Choose teachers who can review reports and students who may receive AI mistake summaries.
        </p>
      </div>

      <div className="bg-white border rounded-2xl p-6 space-y-3">
        <h2 className="font-bold">Teacher plagiarism access</h2>
        {teachers.map((teacher) => (
          <label key={teacher.id} className="flex gap-3 items-center border-b last:border-0 py-3">
            <input
              type="checkbox"
              checked={selected.includes(teacher.id)}
              onChange={(e) =>
                setSelected((current) =>
                  e.target.checked ? [...current, teacher.id] : current.filter((id) => id !== teacher.id)
                )
              }
            />
            <span>
              <span className="font-semibold">{teacher.full_name || 'Unnamed teacher'}</span>
              <span className="block text-xs text-slate-500">{teacher.email}</span>
            </span>
          </label>
        ))}

        <h2 className="font-bold pt-4">AI mistake-summary access</h2>
        {students.map((student) => (
          <label key={student.id} className="flex gap-3 items-center border-b last:border-0 py-3">
            <input
              type="checkbox"
              checked={aiUsers.includes(student.id)}
              onChange={(e) =>
                setAiUsers((current) =>
                  e.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id)
                )
              }
            />
            <span>
              <span className="font-semibold">{student.full_name || 'Unnamed student'}</span>
              <span className="block text-xs text-slate-500">{student.email}</span>
            </span>
          </label>
        ))}

        <button
          onClick={save}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white px-4 py-2.5 font-semibold"
        >
          <Save size={16} /> Save Access
        </button>
        {message ? <span className="ml-3 text-sm text-emerald-600">{message}</span> : null}
      </div>

      <div className="bg-white border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">Reports</h2>
          <span className="text-xs font-semibold text-slate-500">
            {counts.total} total · {counts.open} open
          </span>
        </div>
        {reports.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <AlertTriangle className="mx-auto mb-2" size={30} />
            <p className="text-sm">No plagiarism reports yet.</p>
          </div>
        ) : (
          <div className="divide-y">
            {reports.map((report) => {
              const student = peopleById[report.student_id];
              const teacher = peopleById[report.teacher_id];
              return (
                <div key={report.id} className="py-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {report.suspect_name || student?.full_name || 'Unnamed student'}
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        {report.suspect_email || student?.email || ''}
                      </span>
                    </p>
                    <p className="text-sm text-slate-700 mt-1">
                      {report.exam_title || 'Coding contest'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {report.reason || 'Review required'}
                      {report.details ? ` — ${report.details}` : ''}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {report.created_at ? new Date(report.created_at).toLocaleString() : ''} ·
                      Assigned to {teacher?.full_name || teacher?.email || 'unassigned'}
                    </p>
                  </div>
                  <select
                    value={['open', 'reviewing', 'cleared'].includes(report.status) ? report.status : 'open'}
                    onChange={(e) => updateStatus(report.id, e.target.value)}
                    disabled={busyId === report.id}
                    className="border rounded-lg px-2 py-1.5 text-xs font-semibold"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPlagiarism;
