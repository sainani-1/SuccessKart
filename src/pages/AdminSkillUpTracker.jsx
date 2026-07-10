import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { TOTAL_PROBLEMS } from '../data/codingProblems';
import { Trophy, Loader2, AlertTriangle, Search, Users, BarChart3, Flame, Zap, Clock } from 'lucide-react';

const AdminSkillUpTracker = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: progressData, error: progressError } = await supabase
        .from('skillup_progress')
        .select('user_id, problems_solved, xp, coins, current_streak, longest_streak, total_submissions, total_coding_hours, last_active, updated_at')
        .order('problems_solved', { ascending: false });

      if (progressError) throw progressError;

      if (!progressData || progressData.length === 0) {
        setUsers([]);
        return;
      }

      const userIds = progressData.map((r) => r.user_id);

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = {};
      (profilesData || []).forEach((p) => {
        profileMap[p.id] = p;
      });

      const merged = progressData.map((r) => ({
        ...r,
        full_name: profileMap[r.user_id]?.full_name || 'Unknown',
        email: profileMap[r.user_id]?.email || '',
      }));

      setUsers(merged);
    } catch (err) {
      setError(err?.message || 'Failed to load SkillUp data');
    } finally {
      setLoading(false);
    }
  };

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  const totalUsers = users.length;
  const totalSolved = users.reduce((sum, u) => sum + (u.problems_solved || 0), 0);
  const avgSolved = totalUsers > 0 ? (totalSolved / totalUsers).toFixed(1) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Loader2 size={32} className="text-orange-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-red-200 shadow-lg p-8 max-w-md text-center">
          <AlertTriangle size={40} className="mx-auto mb-3 text-red-400" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">Failed to Load</h2>
          <p className="text-sm text-red-600 mb-4 break-words">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 md:p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                <Trophy size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-800">Track SY (SkillUp)</h1>
                <p className="text-xs text-gray-500">Monitor user progress on coding problems ({TOTAL_PROBLEMS} total)</p>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Users size={20} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Active Users</p>
                  <p className="text-lg font-bold text-gray-800">{totalUsers}</p>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <BarChart3 size={20} className="text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Solved</p>
                  <p className="text-lg font-bold text-gray-800">{totalSolved}</p>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Zap size={20} className="text-purple-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Avg Solved/User</p>
                  <p className="text-lg font-bold text-gray-800">{avgSolved}</p>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
              </div>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Trophy size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">No SkillUp users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="pb-3 font-semibold text-gray-600">#</th>
                      <th className="pb-3 font-semibold text-gray-600">Name</th>
                      <th className="pb-3 font-semibold text-gray-600 hidden sm:table-cell">Email</th>
                      <th className="pb-3 font-semibold text-gray-600 text-center">Solved</th>
                      <th className="pb-3 font-semibold text-gray-600 text-center hidden md:table-cell">Progress</th>
                      <th className="pb-3 font-semibold text-gray-600 text-center">XP</th>
                      <th className="pb-3 font-semibold text-gray-600 text-center hidden lg:table-cell">Coins</th>
                      <th className="pb-3 font-semibold text-gray-600 text-center hidden lg:table-cell">
                        <span className="inline-flex items-center gap-1"><Flame size={12} /> Streak</span>
                      </th>
                      <th className="pb-3 font-semibold text-gray-600 text-center hidden xl:table-cell">
                        <span className="inline-flex items-center gap-1"><Clock size={12} /> Hours</span>
                      </th>
                      <th className="pb-3 font-semibold text-gray-600 text-center hidden xl:table-cell">Submissions</th>
                      <th className="pb-3 font-semibold text-gray-600 text-right hidden xl:table-cell">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u, idx) => {
                      const pct = TOTAL_PROBLEMS > 0 ? ((u.problems_solved / TOTAL_PROBLEMS) * 100).toFixed(1) : 0;
                      return (
                        <tr key={u.user_id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                          <td className="py-3 text-gray-400">{idx + 1}</td>
                          <td className="py-3 font-medium text-gray-800 max-w-[180px] truncate">{u.full_name}</td>
                          <td className="py-3 text-gray-500 hidden sm:table-cell max-w-[200px] truncate">{u.email}</td>
                          <td className="py-3 text-center font-semibold text-gray-800">
                            {u.problems_solved}
                            <span className="text-gray-400 font-normal"> / {TOTAL_PROBLEMS}</span>
                          </td>
                          <td className="py-3 text-center hidden md:table-cell">
                            <div className="flex items-center gap-2 justify-center">
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-orange-500 rounded-full"
                                  style={{ width: `${Math.min(Number(pct), 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 w-10 text-right">{pct}%</span>
                            </div>
                          </td>
                          <td className="py-3 text-center text-orange-600 font-medium">{u.xp}</td>
                          <td className="py-3 text-center text-yellow-600 font-medium hidden lg:table-cell">{u.coins}</td>
                          <td className="py-3 text-center text-red-500 font-medium hidden lg:table-cell">{u.current_streak}</td>
                          <td className="py-3 text-center text-blue-500 font-medium hidden xl:table-cell">{Number(u.total_coding_hours || 0).toFixed(1)}</td>
                          <td className="py-3 text-center text-gray-500 hidden xl:table-cell">{u.total_submissions}</td>
                          <td className="py-3 text-right text-gray-400 text-xs hidden xl:table-cell">
                            {u.last_active ? new Date(u.last_active).toLocaleDateString('en-IN') : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSkillUpTracker;
