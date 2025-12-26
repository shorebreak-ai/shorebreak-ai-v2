// ============================================================================
// SHOREBREAK AI - PAGE ADMIN
// ============================================================================

import { useState, useMemo } from 'react';
import { Users, Activity, MoreHorizontal, Search, Database, BarChart3 } from 'lucide-react';
import { useAdminStats, useAdminUsers } from '../hooks';
import { Card, Badge, Spinner, Alert } from '../components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatNumber, formatRelativeTime } from '../lib/utils';

export default function Admin() {
  const { stats, loading: statsLoading, error: statsError } = useAdminStats();
  const { users, loading: usersLoading, updateUserRole, deleteUser } = useAdminUsers();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u) =>
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const chartData = useMemo(() => {
    if (!stats?.weekly_activity) {
      return Array.from({ length: 8 }, (_, i) => ({
        name: `Week ${i + 1}`,
        reviews: Math.floor(Math.random() * 50) + 10,
        seo: Math.floor(Math.random() * 30) + 5,
      }));
    }
    const grouped: Record<string, { reviews: number; seo: number }> = {};
    stats.weekly_activity.forEach((item) => {
      const week = new Date(item.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!grouped[week]) grouped[week] = { reviews: 0, seo: 0 };
      if (item.type === 'reviews') grouped[week].reviews = item.count;
      if (item.type === 'seo') grouped[week].seo = item.count;
    });
    return Object.entries(grouped).map(([name, data]) => ({ name, ...data })).slice(-8);
  }, [stats]);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    await updateUserRole(userId, newRole);
    setActionMenu(null);
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      await deleteUser(userId);
    }
    setActionMenu(null);
  };

  if (statsLoading || usersLoading) {
    return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2>
            <Badge variant="primary">Admin Access</Badge>
          </div>
          <p className="text-slate-500">Platform overview and user management.</p>
        </div>
      </div>

      {statsError && <Alert variant="error">{statsError}</Alert>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Users</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.total_users || 0}</div>
          </div>
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users className="w-5 h-5" /></div>
        </Card>
        <Card className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Analyses</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{formatNumber(stats?.total_analyses || 0)}</div>
          </div>
          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Activity className="w-5 h-5" /></div>
        </Card>
        <Card className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">This Month</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.analyses_this_month || 0}</div>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><BarChart3 className="w-5 h-5" /></div>
        </Card>
        <Card className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tokens Used</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{formatNumber(stats?.total_tokens_used || 0)}</div>
          </div>
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Database className="w-5 h-5" /></div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-900">Platform Activity</h3>
          <p className="text-sm text-slate-500">Weekly analysis volume breakdown</p>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} cursor={{ fill: '#f8fafc' }} />
              <Legend />
              <Bar dataKey="reviews" name="Review Analyses" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="seo" name="SEO Audits" fill="#3b82f6" radius={[4, 4, 0, 0]} fillOpacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-0 overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-bold text-slate-900">User Management</h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input placeholder="Search users..." className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 font-medium">Name & Email</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Created</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{user.full_name}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.role === 'admin' ? 'primary' : 'neutral'}>{user.role}</Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{formatRelativeTime(user.created_at)}</td>
                    <td className="px-6 py-4 text-right relative">
                      <button className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100" onClick={() => setActionMenu(actionMenu === user.id ? null : user.id)}>
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {actionMenu === user.id && (
                        <div className="absolute right-6 top-12 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-10 min-w-[150px]">
                          <button className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50" onClick={() => handleRoleChange(user.id, user.role === 'admin' ? 'user' : 'admin')}>
                            {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                          </button>
                          <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50" onClick={() => handleDeleteUser(user.id)}>Delete User</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-900">Recent Activity</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {(stats?.recent_activity || []).slice(0, 5).map((log, i) => (
              <div key={i} className="p-4 hover:bg-slate-50 transition-colors flex gap-3">
                <div className="mt-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div></div>
                <div>
                  <p className="text-sm text-slate-900 font-medium">{log.action}</p>
                  <p className="text-xs text-slate-500 mt-0.5">by <span className="font-medium">{log.user_email || 'System'}</span> • {formatRelativeTime(log.created_at)}</p>
                </div>
              </div>
            ))}
            {(!stats?.recent_activity || stats.recent_activity.length === 0) && (
              <div className="p-8 text-center text-slate-500 text-sm">No recent activity</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
