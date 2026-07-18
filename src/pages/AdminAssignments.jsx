import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, FileText, Users, CheckCircle, Clock, Eye, Trash2, Edit2, Star } from 'lucide-react';
import AlertModal from '../components/AlertModal';

const AdminAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  const [createForm, setCreateForm] = useState({ title: '', description: '', course_id: '', due_date: '', max_marks: 100, created_by: '' });
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [creating, setCreating] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [gradeValue, setGradeValue] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [grading, setGrading] = useState(false);
  const [alert, setAlert] = useState({ show: false, title: '', message: '', type: 'info' });
  const [filterAssignment, setFilterAssignment] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: courseList }, { data: teacherList }] = await Promise.all([
        supabase.from('courses').select('id, title').order('title'),
        supabase.from('profiles').select('id, full_name, email').eq('role', 'teacher').order('full_name'),
      ]);
      setCourses(courseList || []);
      setTeachers(teacherList || []);

      const { data: assignmentList } = await supabase
        .from('assignments')
        .select('*, courses!assignments_course_id_fkey(id, title), profiles!assignments_created_by_fkey(id, full_name)')
        .order('created_at', { ascending: false });
      setAssignments(assignmentList || []);

      const assignmentIds = (assignmentList || []).map((a) => a.id);
      if (assignmentIds.length > 0) {
        const { data: subList } = await supabase
          .from('assignment_submissions')
          .select('*, profiles!assignment_submissions_user_id_fkey(id, full_name, email, avatar_url)')
          .in('assignment_id', assignmentIds)
          .order('submitted_at', { ascending: false });

        const enrichedSubs = (subList || []).map((sub) => {
          const assignment = assignmentList.find((a) => a.id === sub.assignment_id);
          return { ...sub, assignment };
        });
        setSubmissions(enrichedSubs);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.course_id) {
      setAlert({ show: true, title: 'Missing Fields', message: 'Title and course are required.', type: 'warning' });
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from('assignments').insert({
        title: createForm.title.trim(),
        description: createForm.description.trim() || null,
        course_id: createForm.course_id,
        due_date: createForm.due_date || null,
        max_marks: createForm.max_marks || null,
        created_by: createForm.created_by || null,
        is_active: true,
      });
      if (error) throw error;
      setAlert({ show: true, title: 'Created', message: 'Assignment created successfully.', type: 'success' });
      resetForm();
      setActiveTab('list');
      loadData();
    } catch (err) {
      setAlert({ show: true, title: 'Error', message: err.message || 'Failed to create assignment.', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingAssignment) return;
    setCreating(true);
    try {
      const { error } = await supabase
        .from('assignments')
        .update({
          title: createForm.title.trim(),
          description: createForm.description.trim() || null,
          course_id: createForm.course_id,
          due_date: createForm.due_date || null,
          max_marks: createForm.max_marks || null,
          is_active: createForm.is_active ?? true,
        })
        .eq('id', editingAssignment.id);
      if (error) throw error;
      setAlert({ show: true, title: 'Updated', message: 'Assignment updated successfully.', type: 'success' });
      setEditingAssignment(null);
      resetForm();
      loadData();
    } catch (err) {
      setAlert({ show: true, title: 'Error', message: err.message || 'Failed to update assignment.', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('assignments').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      setAlert({ show: true, title: 'Deleted', message: 'Assignment deleted successfully.', type: 'success' });
      setConfirmDelete(null);
      loadData();
    } catch (err) {
      setAlert({ show: true, title: 'Error', message: err.message || 'Failed to delete assignment.', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleGrade = async () => {
    if (!gradingSubmission) return;
    const maxMarks = gradingSubmission.assignment?.max_marks;
    const grade = parseFloat(gradeValue);
    if (isNaN(grade) || grade < 0) {
      setAlert({ show: true, title: 'Invalid Grade', message: 'Please enter a valid grade (0 or more).', type: 'warning' });
      return;
    }
    if (maxMarks != null && grade > maxMarks) {
      setAlert({ show: true, title: 'Invalid Grade', message: `Grade cannot exceed max marks (${maxMarks}).`, type: 'warning' });
      return;
    }
    setGrading(true);
    try {
      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          grade,
          feedback: gradeFeedback.trim() || null,
          status: 'graded',
          graded_at: new Date().toISOString(),
        })
        .eq('id', gradingSubmission.id);
      if (error) throw error;
      setAlert({ show: true, title: 'Graded', message: 'Submission graded successfully.', type: 'success' });
      setGradingSubmission(null);
      setGradeValue('');
      setGradeFeedback('');
      loadData();
    } catch (err) {
      setAlert({ show: true, title: 'Error', message: err.message || 'Failed to grade submission.', type: 'error' });
    } finally {
      setGrading(false);
    }
  };

  const resetForm = () => {
    setCreateForm({ title: '', description: '', course_id: '', due_date: '', max_marks: 100, created_by: '' });
  };

  const openEdit = (assignment) => {
    setEditingAssignment(assignment);
    setCreateForm({
      title: assignment.title || '',
      description: assignment.description || '',
      course_id: assignment.course_id || '',
      due_date: assignment.due_date ? assignment.due_date.slice(0, 16) : '',
      max_marks: assignment.max_marks ?? 100,
      is_active: assignment.is_active ?? true,
      created_by: assignment.created_by || '',
    });
    setActiveTab('create');
  };

  const filteredSubmissions = submissions.filter((s) => {
    if (filterAssignment && s.assignment_id !== filterAssignment) return false;
    if (filterStatus === 'submitted' && s.status !== 'submitted') return false;
    if (filterStatus === 'graded' && s.status !== 'graded') return false;
    return true;
  });

  const totalSubs = submissions.length;
  const pendingSubs = submissions.filter((s) => s.status === 'submitted').length;
  const gradedSubs = submissions.filter((s) => s.status === 'graded').length;

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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Assignments Management</h1>
          <p className="text-slate-500 mt-1">Manage all assignments across all teachers and courses.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveTab('list'); }}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${activeTab === 'list' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            List
          </button>
          <button
            onClick={() => { setActiveTab('create'); setEditingAssignment(null); resetForm(); }}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors inline-flex items-center gap-2 ${activeTab === 'create' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
          >
            <Plus size={16} />
            {editingAssignment ? 'Edit' : 'Create'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-white shadow-sm p-4 text-center">
          <FileText size={24} className="mx-auto text-blue-600 mb-1" />
          <p className="text-2xl font-bold text-slate-800">{assignments.length}</p>
          <p className="text-xs text-slate-500">Total Assignments</p>
        </div>
        <div className="rounded-xl border bg-white shadow-sm p-4 text-center">
          <Users size={24} className="mx-auto text-purple-600 mb-1" />
          <p className="text-2xl font-bold text-slate-800">{totalSubs}</p>
          <p className="text-xs text-slate-500">Total Submissions</p>
        </div>
        <div className="rounded-xl border bg-white shadow-sm p-4 text-center">
          <CheckCircle size={24} className="mx-auto text-green-600 mb-1" />
          <p className="text-2xl font-bold text-slate-800">{gradedSubs}</p>
          <p className="text-xs text-slate-500">Graded</p>
        </div>
        <div className="rounded-xl border bg-white shadow-sm p-4 text-center">
          <Clock size={24} className="mx-auto text-amber-600 mb-1" />
          <p className="text-2xl font-bold text-slate-800">{pendingSubs}</p>
          <p className="text-xs text-slate-500">Pending Review</p>
        </div>
      </div>

      {activeTab === 'create' && (
        <div className="rounded-xl border bg-white shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">
            {editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}
          </h2>
          <form onSubmit={editingAssignment ? handleUpdate : handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Title *</label>
              <input
                type="text"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="Assignment title"
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Describe the assignment..."
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Course *</label>
                <select
                  value={createForm.course_id}
                  onChange={(e) => setCreateForm({ ...createForm, course_id: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select course...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Due Date</label>
                <input
                  type="datetime-local"
                  value={createForm.due_date}
                  onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Max Marks</label>
                <input
                  type="number"
                  min="0"
                  value={createForm.max_marks}
                  onChange={(e) => setCreateForm({ ...createForm, max_marks: e.target.value ? parseInt(e.target.value) : '' })}
                  placeholder="100"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Created By</label>
                <select
                  value={createForm.created_by}
                  onChange={(e) => setCreateForm({ ...createForm, created_by: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Admin (You)</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
            {editingAssignment && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={createForm.is_active ?? true}
                  onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="is_active" className="text-sm font-semibold text-slate-700">Active</label>
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm disabled:opacity-50"
              >
                {creating ? 'Saving...' : editingAssignment ? 'Update Assignment' : 'Create Assignment'}
              </button>
              {editingAssignment && (
                <button
                  type="button"
                  onClick={() => { setEditingAssignment(null); resetForm(); }}
                  className="px-4 py-2.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-semibold text-sm"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-slate-50">
              <h2 className="font-bold text-slate-800">All Assignments ({assignments.length})</h2>
            </div>
            {assignments.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No assignments created yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Title</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Course</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Created By</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Due Date</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Max Marks</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Submissions</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => {
                      const subCount = submissions.filter((s) => s.assignment_id === a.id).length;
                      const gradedCount = submissions.filter((s) => s.assignment_id === a.id && s.status === 'graded').length;
                      const overdue = a.due_date && new Date(a.due_date) < new Date();
                      return (
                        <tr key={a.id} className="border-b last:border-b-0 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-800">{a.title}</td>
                          <td className="px-4 py-3 text-slate-600">{a.courses?.title || '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{a.profiles?.full_name || 'Admin'}</td>
                          <td className={`px-4 py-3 ${overdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                            {a.due_date ? new Date(a.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{a.max_marks ?? '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{subCount} ({gradedCount} graded)</td>
                          <td className="px-4 py-3">
                            {a.is_active ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Active</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">Inactive</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEdit(a)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Edit"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => setConfirmDelete(a)}
                                className="text-red-600 hover:text-red-800"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
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

          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="font-bold text-slate-800">All Submissions ({filteredSubmissions.length})</h2>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={filterAssignment || ''}
                  onChange={(e) => setFilterAssignment(e.target.value || null)}
                  className="border border-slate-300 rounded-lg p-2 text-sm"
                >
                  <option value="">All Assignments</option>
                  {assignments.map((a) => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-slate-300 rounded-lg p-2 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="submitted">Submitted</option>
                  <option value="graded">Graded</option>
                </select>
              </div>
            </div>
            {filteredSubmissions.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No submissions match the current filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Student</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Assignment</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Submitted</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Grade</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((sub) => (
                      <tr key={sub.id} className="border-b last:border-b-0 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={sub.profiles?.avatar_url || 'https://via.placeholder.com/32'}
                              alt=""
                              className="w-7 h-7 rounded-full object-cover"
                            />
                            <div>
                              <p className="font-medium text-slate-800">{sub.profiles?.full_name || 'Student'}</p>
                              <p className="text-xs text-slate-400">{sub.profiles?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{sub.assignment?.title || '-'}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {sub.status === 'graded' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700"><CheckCircle size={12} /> Graded</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700"><Clock size={12} /> Submitted</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {sub.grade != null ? `${sub.grade}${sub.assignment?.max_marks != null ? `/${sub.assignment.max_marks}` : ''}` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {sub.file_url && (
                              <a
                                href={sub.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                                title="View File"
                              >
                                <Eye size={16} />
                              </a>
                            )}
                            <button
                              onClick={() => {
                                setGradingSubmission(sub);
                                setGradeValue(sub.grade != null ? String(sub.grade) : '');
                                setGradeFeedback(sub.feedback || '');
                              }}
                              className="text-amber-600 hover:text-amber-800"
                              title="Grade"
                            >
                              <Star size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {gradingSubmission && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Grade Submission</h2>
                <button onClick={() => setGradingSubmission(null)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {gradingSubmission.profiles?.full_name || 'Student'} — {gradingSubmission.assignment?.title}
              </p>
              {gradingSubmission.assignment?.max_marks != null && (
                <p className="text-xs text-slate-400 mt-1">Max marks: {gradingSubmission.assignment.max_marks}</p>
              )}
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Grade *</label>
                <input
                  type="number"
                  min="0"
                  max={gradingSubmission.assignment?.max_marks || undefined}
                  step="0.5"
                  value={gradeValue}
                  onChange={(e) => setGradeValue(e.target.value)}
                  placeholder="Enter grade"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Feedback</label>
                <textarea
                  rows={4}
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  placeholder="Provide feedback for the student..."
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              {gradingSubmission.notes && (
                <div className="bg-slate-50 border rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Student Notes:</p>
                  <p className="text-sm text-slate-700">{gradingSubmission.notes}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setGradingSubmission(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleGrade}
                disabled={grading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm disabled:opacity-50 inline-flex items-center gap-2"
              >
                {grading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Star size={16} />
                    Save Grade
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <Trash2 size={40} className="mx-auto text-red-500 mb-4" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Assignment?</h3>
            <p className="text-slate-500 mb-6">
              Are you sure you want to delete <span className="font-semibold text-slate-700">{confirmDelete.title}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
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

export default AdminAssignments;
