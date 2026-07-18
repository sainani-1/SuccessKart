import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { Upload, FileText, CheckCircle, Clock, AlertCircle, Eye, Download } from 'lucide-react';
import AlertModal from '../components/AlertModal';

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.txt,.zip';
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const AssignmentSubmit = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitModal, setSubmitModal] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [alert, setAlert] = useState({ show: false, title: '', message: '', type: 'info' });

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', user.id);

      const courseIds = (enrollments || []).map((e) => e.course_id).filter(Boolean);

      const { data: courseList } = courseIds.length
        ? await supabase.from('courses').select('id, title').in('id', courseIds)
        : { data: [] };
      setCourses(courseList || []);

      const { data: assignmentList } = await supabase
        .from('assignments')
        .select('*, courses!assignments_course_id_fkey(id, title)')
        .in('course_id', courseIds.length ? courseIds : [-1])
        .eq('is_active', true)
        .order('due_date', { ascending: true });
      setAssignments(assignmentList || []);

      if (assignmentList && assignmentList.length > 0) {
        const assignmentIds = assignmentList.map((a) => a.id);
        const { data: subList } = await supabase
          .from('assignment_submissions')
          .select('*')
          .eq('user_id', user.id)
          .in('assignment_id', assignmentIds);

        const subMap = {};
        (subList || []).forEach((s) => {
          subMap[s.assignment_id] = s;
        });
        setSubmissions(subMap);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!submitModal) return;
    if (!selectedFile && !notes.trim()) {
      setAlert({ show: true, title: 'Missing Input', message: 'Please attach a file or add notes.', type: 'warning' });
      return;
    }
    setUploading(true);
    try {
      let fileUrl = null;
      if (selectedFile) {
        const filePath = `${user.id}/${submitModal.id}_${selectedFile.name}`;
        const { error: uploadErr } = await supabase.storage
          .from('assignment-submissions')
          .upload(filePath, selectedFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage
          .from('assignment-submissions')
          .getPublicUrl(filePath);
        fileUrl = urlData?.publicUrl || null;
      }

      const existing = submissions[submitModal.id];
      const payload = {
        assignment_id: submitModal.id,
        user_id: user.id,
        file_url: fileUrl,
        notes: notes.trim() || null,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      };

      if (existing) {
        const { error } = await supabase
          .from('assignment_submissions')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('assignment_submissions')
          .insert(payload);
        if (error) throw error;
      }

      setAlert({ show: true, title: 'Submitted', message: 'Your assignment has been submitted successfully.', type: 'success' });
      setSubmitModal(null);
      setSelectedFile(null);
      setNotes('');
      loadData();
    } catch (err) {
      setAlert({ show: true, title: 'Error', message: err.message || 'Failed to submit assignment.', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const openSubmit = (assignment) => {
    setSelectedFile(null);
    setNotes('');
    setSubmitModal(assignment);
  };

  const getStatusBadge = (assignmentId) => {
    const sub = submissions[assignmentId];
    if (!sub) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><Clock size={12} /> Pending</span>;
    if (sub.status === 'graded') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700"><CheckCircle size={12} /> Graded</span>;
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700"><FileText size={12} /> Submitted</span>;
  };

  const isOverdue = (dueDate) => dueDate && new Date(dueDate) < new Date();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 font-semibold">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Assignments</h1>
        <p className="text-slate-500 mt-1">View and submit your course assignments.</p>
      </div>

      {assignments.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <FileText size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg">No active assignments found for your enrolled courses.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => {
            const sub = submissions[assignment.id];
            const overdue = isOverdue(assignment.due_date) && !sub;
            const courseName = assignment.courses?.title || 'Unknown Course';

            return (
              <div key={assignment.id} className={`rounded-xl border bg-white shadow-sm p-6 ${overdue ? 'border-red-200 bg-red-50/30' : ''}`}>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText size={20} className="text-blue-600 shrink-0" />
                      <h3 className="text-lg font-bold text-slate-800 truncate">{assignment.title}</h3>
                      {getStatusBadge(assignment.id)}
                    </div>
                    <p className="text-sm text-slate-600 mb-1">Course: <span className="font-medium text-slate-800">{courseName}</span></p>
                    {assignment.description && (
                      <p className="text-sm text-slate-500 mb-2 line-clamp-2">{assignment.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-2">
                      {assignment.due_date && (
                        <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-semibold' : ''}`}>
                          <Clock size={12} />
                          Due: {new Date(assignment.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {overdue && <AlertCircle size={12} />}
                        </span>
                      )}
                      {assignment.max_marks != null && (
                        <span className="flex items-center gap-1">
                          Max Marks: {assignment.max_marks}
                        </span>
                      )}
                    </div>

                    {sub && sub.status === 'graded' && (
                      <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle size={16} className="text-green-600" />
                          <span className="font-bold text-green-700">Grade: {sub.grade}{assignment.max_marks != null ? ` / ${assignment.max_marks}` : ''}</span>
                        </div>
                        {sub.feedback && (
                          <p className="text-sm text-slate-600 mt-1"><span className="font-medium">Feedback:</span> {sub.feedback}</p>
                        )}
                        {sub.file_url && (
                          <a
                            href={sub.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
                          >
                            <Download size={14} /> Download Your Submission
                          </a>
                        )}
                      </div>
                    )}

                    {sub && sub.status === 'submitted' && sub.file_url && (
                      <div className="mt-3 flex items-center gap-2">
                        <a
                          href={sub.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          <Eye size={14} /> View Submitted File
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {sub?.status === 'graded' ? null : (
                      <button
                        onClick={() => openSubmit(assignment)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
                      >
                        <Upload size={16} />
                        {sub ? 'Resubmit' : 'Submit'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {submitModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Submit Assignment</h2>
                <button onClick={() => { setSubmitModal(null); setSelectedFile(null); setNotes(''); }} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
              </div>
              <p className="text-sm text-slate-500 mt-1">{submitModal.title}</p>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Upload File (optional)</label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept={ACCEPTED_TYPES}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && file.size > MAX_FILE_SIZE) {
                        setAlert({ show: true, title: 'File Too Large', message: 'Maximum file size is 25 MB.', type: 'warning' });
                        return;
                      }
                      setSelectedFile(file || null);
                    }}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                    {selectedFile ? (
                      <p className="text-sm font-medium text-slate-700">{selectedFile.name} <span className="text-slate-400">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span></p>
                    ) : (
                      <p className="text-sm text-slate-500">Click to browse. PDF, DOC, DOCX, TXT, ZIP (max 25 MB)</p>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Notes (optional)</label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes or comments for your teacher..."
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => { setSubmitModal(null); setSelectedFile(null); setNotes(''); }}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={uploading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm disabled:opacity-50 inline-flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        show={alert.show}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ show: false, title: '', message: '', type: 'info' })}
      />
    </div>
  );
};

export default AssignmentSubmit;
