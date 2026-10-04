import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import api from '../../api/client';
import Pagination from '../../components/ui/Pagination';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { TableSkeleton } from '../../components/ui/Skeleton';
import useDebounce from '../../hooks/useDebounce';

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [data, setData] = useState({ users: [], roles: [] });
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const fetchUsers = useCallback(async () => {
    try {
      setError('');
      const query = selectedRole ? `?role=${selectedRole}` : '';
      const res = await api.get(`/admin/users${query}`);
      if (res.success && res.data) {
        setData(res.data);
        setCurrentPage(1); // Reset page on new fetch
      }
    } catch (err) {
      console.error('Fetch users error:', err);
      setError(err.message || 'Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  }, [selectedRole]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Real-time synchronization
  useRealtimeRefresh(fetchUsers);

  const handleToggleStatus = async (userId, currentActive) => {
    const action = currentActive ? 'suspend' : 'activate';
    if (action === 'suspend' && !window.confirm('Suspend this user account?')) {
      return;
    }

    setMessage('');
    const res = await api.put(`/admin/users/${userId}/status`, { action });
    if (res.success) {
      setMessage(res.message);
      fetchUsers();
    } else {
      alert(res.message || 'Action failed.');
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 250);

  const filteredUsers = useMemo(() => {
    const users = data.users || [];
    if (!debouncedSearchTerm.trim()) return users;
    const term = debouncedSearchTerm.toLowerCase().trim();

    return users.filter((u) => {
      const email = (u.email || '').toLowerCase();
      const role = (u.role_name || '').toLowerCase();
      const id = String(u.user_id || '');
      const firstName = (u.first_name || '').toLowerCase();
      const lastName = (u.last_name || '').toLowerCase();
      const status = u.is_active ? 'active' : 'suspended';

      return (
        email.includes(term) ||
        role.includes(term) ||
        id.includes(term) ||
        `#${id}`.includes(term) ||
        firstName.includes(term) ||
        lastName.includes(term) ||
        status.includes(term)
      );
    });
  }, [data.users, debouncedSearchTerm]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">User Accounts & Security</h1>
          <p className="text-sm text-on-surface-variant">Control account activation, filter by roles, and audit activity</p>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-green-tint text-pinoy-green rounded-lg text-xs font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-error-container text-error rounded-lg text-xs font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bento-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search email, user ID, role, or status..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-9 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:border-vibrant-orange focus:ring-1 focus:ring-vibrant-orange transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              title="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-0.5 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-on-surface-variant">Role:</span>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-vibrant-orange"
            >
              <option value="">All User Roles</option>
              {data.roles?.map((r) => (
                <option key={r.role_id} value={r.role_name}>
                  {r.role_name.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs text-on-surface-variant font-medium">
            Showing <strong className="text-on-surface">{filteredUsers.length}</strong> of {data.users?.length || 0}
          </span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bento-card space-y-4">
        {loading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant text-xs whitespace-nowrap">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Registered Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Account Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-on-surface-variant">
                      No matching user accounts found.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u) => {
                    const isSelf = u.user_id === currentUser?.user_id;

                    return (
                      <tr key={u.user_id} className="hover:bg-surface-container-low transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-on-surface-variant">#{u.user_id}</td>
                        <td className="py-3 px-4 font-bold text-on-surface">
                          {u.email}
                        {isSelf && <span className="ml-1 text-xs text-vibrant-orange font-normal">(You)</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-surface-container text-on-surface-variant capitalize">
                          {u.role_name?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-on-surface-variant">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          u.is_active ? 'bg-green-tint text-pinoy-green' : 'bg-error-container text-error'
                        }`}>
                          {u.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!isSelf ? (
                          <button
                            onClick={() => handleToggleStatus(u.user_id, u.is_active)}
                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                              u.is_active
                                ? 'bg-error-container text-error hover:bg-red-200'
                                : 'bg-green-tint text-pinoy-green hover:bg-green-200'
                            }`}
                          >
                            {u.is_active ? 'Suspend' : 'Activate'}
                          </button>
                        ) : (
                          <span className="text-xs text-on-surface-variant italic">Active Superadmin</span>
                        )}
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
            
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
