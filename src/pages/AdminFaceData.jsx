import React, { useEffect, useState } from 'react';
import { ScanFace, Trash2, RefreshCw } from 'lucide-react';
import AlertModal from '../components/AlertModal';
import LoadingSpinner from '../components/LoadingSpinner';

const FACE_BACKEND_URL = import.meta.env.VITE_FACE_BACKEND_URL || 'http://localhost:5000';

const AdminFaceData = () => {
  const [faces, setFaces] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'info' });

  const loadFaces = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${FACE_BACKEND_URL}/api/admin/face-data`);
      if (!res.ok) throw new Error('Failed to fetch face data');
      const data = await res.json();
      setFaces(data.faces || []);
      setTotal(data.total || 0);
    } catch (err) {
      setAlertModal({ show: true, title: 'Load Failed', message: err.message || 'Unable to load face data.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaces();
  }, []);

  const deleteFace = async (faceId, email) => {
    if (!window.confirm(`Delete face data for ${email}?`)) return;
    try {
      const res = await fetch(`${FACE_BACKEND_URL}/api/admin/face-data/${faceId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setFaces((prev) => prev.filter((f) => f.id !== faceId));
      setTotal((prev) => prev - 1);
    } catch (err) {
      setAlertModal({ show: true, title: 'Delete Failed', message: err.message || 'Unable to delete.', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ScanFace className="text-indigo-600" size={28} />
            <h1 className="text-2xl font-bold text-slate-900">Face Data</h1>
            <span className="bg-indigo-100 text-indigo-700 text-sm font-semibold px-3 py-1 rounded-full">
              {total} registered
            </span>
          </div>
          <button
            onClick={loadFaces}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition text-sm font-medium"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading face data..." />
        ) : faces.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <ScanFace className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-slate-500 text-lg">No faces registered yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">#</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Email</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">User ID</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-600">Encoding Size</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-600">Version</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Registered</th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {faces.map((face, idx) => (
                  <tr key={face.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="px-5 py-3 text-slate-500">{idx + 1}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">{face.email}</td>
                    <td className="px-5 py-3 text-slate-500 font-mono text-xs">{face.user_id?.slice(0, 8)}...</td>
                    <td className="px-5 py-3 text-slate-600">{face.encoding_length} values</td>
                    <td className="px-5 py-3 text-slate-600">v{face.encoding_version}</td>
                    <td className="px-5 py-3 text-slate-500">
                      {face.created_at ? new Date(face.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => deleteFace(face.id, face.email)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition"
                        title="Delete face data"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertModal
        show={alertModal.show}
        onClose={() => setAlertModal({ show: false, title: '', message: '', type: 'info' })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
};

export default AdminFaceData;
