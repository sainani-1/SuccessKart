import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Trophy, Search, Loader2, UserPlus, UserX, AlertTriangle, CheckCircle } from 'lucide-react';
import AlertModal from '../components/AlertModal';
import { logAdminActivity } from '../utils/adminActivityLogger';
import { fetchSkillUpGrantedUsers, grantSkillUpAccess, revokeSkillUpAccess } from '../utils/skillupAccess';
import { fetchPremiumPlanTypeMap } from '../utils/premiumPlanTypes';

const AdminGrantSkillUpAccess = () => {
  const [users, setUsers] = useState([]);
  const [grantedUserIds, setGrantedUserIds] = useState([]);
  const [search, setSearch] = useState('');
  const [searchAll, setSearchAll] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'info' });
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [userToRevoke, setUserToRevoke] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setPageLoading(true);
    try {
      const [{ data: profiles, error: profilesError }, granted, planTypeMap] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, premium_until')
          .eq('role', 'student')
          .order('full_name'),
        fetchSkillUpGrantedUsers(),
        fetchPremiumPlanTypeMap(),
      ]);

      if (profilesError) throw new Error(profilesError.message);

      setUsers((profiles || []).map((u) => ({ ...u, premium_plan_type: planTypeMap[u.id] || 'premium' })));
      setGrantedUserIds(granted.map((g) => g.id));
    } catch {
      setAlertModal({
        show: true,
        title: 'Error',
        message: 'Failed to load data.',
        type: 'error',
      });
    } finally {
      setPageLoading(false);
    }
  };

  const handleGrant = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await grantSkillUpAccess(selectedUser.id, user?.id);
      if (error) throw new Error(error);

      await logAdminActivity({
        adminId: user?.id,
        eventType: 'action',
        action: 'Granted SkillUp access',
        target: selectedUser.id,
        details: {
          module: 'grant-skillup-access',
          user_email: selectedUser.email || null,
        },
      });

      setShowGrantModal(false);
      setAlertModal({
        show: true,
        title: 'Success',
        message: `SkillUp access granted to ${selectedUser.full_name || selectedUser.email}. They can now access SkillUp without Premium Plus.`,
        type: 'success',
      });
      setSelectedUser(null);
      setStudentQuery('');
      await loadData();
    } catch (err) {
      setAlertModal({
        show: true,
        title: 'Error',
        message: err.message || 'Failed to grant SkillUp access.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!userToRevoke) return;
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await revokeSkillUpAccess(userToRevoke.id);
      if (error) throw new Error(error);

      await logAdminActivity({
        adminId: user?.id,
        eventType: 'action',
        action: 'Revoked SkillUp access',
        target: userToRevoke.id,
        details: {
          module: 'grant-skillup-access',
          user_email: userToRevoke.email || null,
        },
      });

      setShowRevokeModal(false);
      setUserToRevoke(null);
      setAlertModal({
        show: true,
        title: 'Success',
        message: `SkillUp access revoked from ${userToRevoke.full_name || userToRevoke.email}.`,
        type: 'success',
      });
      await loadData();
    } catch (err) {
      setAlertModal({
        show: true,
        title: 'Error',
        message: err.message || 'Failed to revoke SkillUp access.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const matchedStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return [];
    return users
      .filter(
        (u) =>
          (u.full_name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [users, studentQuery]);

  const filtered = users.filter(
    (u) =>
      (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredAll = users.filter(
    (u) =>
      (u.full_name || '').toLowerCase().includes(searchAll.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchAll.toLowerCase())
  );

  const grantedUsers = filtered.filter((u) => grantedUserIds.includes(u.id));
  const notGrantedUsers = filteredAll.filter((u) => !grantedUserIds.includes(u.id));

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Loader2 size={32} className="text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Grant SkillUp Access</h1>
        <p className="text-slate-500">
          Give students SkillUp Yourself access without requiring Premium Plus. Students granted access can only use SkillUp — they won't get other premium features.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Trophy size={20} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Students</p>
            <p className="text-lg font-bold text-gray-800">{users.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <CheckCircle size={20} className="text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">SkillUp Granted</p>
            <p className="text-lg font-bold text-gray-800">{grantedUserIds.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
            <UserPlus size={20} className="text-orange-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Without Access</p>
            <p className="text-lg font-bold text-gray-800">{users.length - grantedUserIds.length}</p>
          </div>
        </div>
      </div>

      {/* Grant Access Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Grant SkillUp Access to a Student</h2>
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search student by name or email..."
            value={studentQuery}
            onChange={(e) => {
              setStudentQuery(e.target.value);
              setSelectedUser(null);
            }}
            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
          />
        </div>
        {matchedStudents.length > 0 && (
          <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {matchedStudents.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  setSelectedUser(u);
                  setStudentQuery(u.full_name || u.email);
                }}
                className={`w-full text-left px-4 py-3 hover:bg-emerald-50 transition border-b border-gray-100 last:border-0 ${
                  grantedUserIds.includes(u.id) ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{u.full_name || 'No name'}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                  {grantedUserIds.includes(u.id) && (
                    <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                      Already Granted
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
        {selectedUser && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">
              Granting SkillUp access to: <span className="font-semibold text-gray-800">{selectedUser.full_name || selectedUser.email}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              This student will be able to access SkillUp Yourself without Premium Plus. They won't receive any other premium features.
            </p>
            {grantedUserIds.includes(selectedUser.id) ? (
              <button
                type="button"
                onClick={() => {
                  setUserToRevoke(selectedUser);
                  setShowRevokeModal(true);
                }}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition"
              >
                <UserX size={16} /> Revoke Access
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowGrantModal(true)}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition"
              >
                <UserPlus size={16} /> Grant SkillUp Access
              </button>
            )}
          </div>
        )}
      </div>

      {/* Granted Users List */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          Students with SkillUp Access ({grantedUsers.length})
        </h2>
        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search granted users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
            />
          </div>
        </div>
        {grantedUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Trophy size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No students with granted SkillUp access</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-3 font-semibold text-gray-600">#</th>
                  <th className="pb-3 font-semibold text-gray-600">Name</th>
                  <th className="pb-3 font-semibold text-gray-600 hidden sm:table-cell">Email</th>
                  <th className="pb-3 font-semibold text-gray-600 text-center">Premium</th>
                  <th className="pb-3 font-semibold text-gray-600 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {grantedUsers.map((u, idx) => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-3 text-gray-400">{idx + 1}</td>
                    <td className="py-3 font-medium text-gray-800">{u.full_name || 'No name'}</td>
                    <td className="py-3 text-gray-500 hidden sm:table-cell">{u.email}</td>
                    <td className="py-3 text-center">
                      {u.premium_until && new Date(u.premium_until) > new Date() ? (
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                          {u.premium_plan_type === 'premium_plus' ? 'Premium Plus' : 'Premium'}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          Free
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setUserToRevoke(u);
                          setShowRevokeModal(true);
                        }}
                        className="text-xs font-medium text-red-500 hover:text-red-700 transition"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All Students List */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          All Students ({notGrantedUsers.length} without access)
        </h2>
        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search all students by name or email..."
              value={searchAll}
              onChange={(e) => setSearchAll(e.target.value)}
              className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          {notGrantedUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm font-medium">All students have SkillUp access</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-3 font-semibold text-gray-600">#</th>
                  <th className="pb-3 font-semibold text-gray-600">Name</th>
                  <th className="pb-3 font-semibold text-gray-600 hidden sm:table-cell">Email</th>
                  <th className="pb-3 font-semibold text-gray-600 text-center">Premium</th>
                  <th className="pb-3 font-semibold text-gray-600 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {notGrantedUsers.slice(0, 50).map((u, idx) => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-3 text-gray-400">{idx + 1}</td>
                    <td className="py-3 font-medium text-gray-800">{u.full_name || 'No name'}</td>
                    <td className="py-3 text-gray-500 hidden sm:table-cell">{u.email}</td>
                    <td className="py-3 text-center">
                      {u.premium_until && new Date(u.premium_until) > new Date() ? (
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                          {u.premium_plan_type === 'premium_plus' ? 'Premium Plus' : 'Premium'}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          Free
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(u);
                          setStudentQuery(u.full_name || u.email);
                          setShowGrantModal(true);
                        }}
                        className="text-xs font-medium text-emerald-500 hover:text-emerald-700 transition"
                      >
                        Grant Access
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {notGrantedUsers.length > 50 && (
            <p className="text-xs text-gray-400 mt-3 text-center">
              Showing 50 of {notGrantedUsers.length} students. Use search to find specific students.
            </p>
          )}
        </div>
      </div>

      {/* Grant Confirmation Modal */}
      {showGrantModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <UserPlus size={20} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Grant SkillUp Access</h3>
                <p className="text-xs text-gray-500">Confirm granting access</p>
              </div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700">
                Grant <span className="font-semibold">{selectedUser.full_name || selectedUser.email}</span> access to SkillUp Yourself?
              </p>
              <p className="text-xs text-gray-500 mt-2">
                They will be able to use SkillUp coding challenges without Premium Plus. They won't receive any other premium features.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowGrantModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGrant}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition disabled:opacity-60 inline-flex items-center gap-2"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Confirm Grant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Confirmation Modal */}
      {showRevokeModal && userToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <UserX size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Revoke SkillUp Access</h3>
                <p className="text-xs text-gray-500">Confirm revoking access</p>
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700">
                Revoke <span className="font-semibold">{userToRevoke.full_name || userToRevoke.email}</span>'s SkillUp access?
              </p>
              <p className="text-xs text-gray-500 mt-2">
                They will no longer be able to access SkillUp unless they buy Premium Plus or you grant access again.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowRevokeModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition disabled:opacity-60 inline-flex items-center gap-2"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Confirm Revoke
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        show={alertModal.show}
        onClose={() => setAlertModal({ ...alertModal, show: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
};

export default AdminGrantSkillUpAccess;
