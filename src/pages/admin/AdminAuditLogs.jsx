import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/client';
import Pagination from '../../components/ui/Pagination';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useRealtimeRefresh } from '../../contexts/SocketContext';

// Human-readable action labels
const ACTION_LABELS = {
  user_login: '🔑 User Login',
  user_suspended: '🚫 Account Suspended',
  user_activated: '✅ Account Activated',
  complaint_filed: '📝 Complaint Filed',
  org_complaint_filed: '📝 Org Complaint Filed',
  ai_skills_recalculated: '🤖 AI Skills Recalculated',
  settings_updated: '⚙️ Settings Updated',
  status_change: '🔄 Status Change',
  created: '➕ Record Created',
  updated: '✏️ Record Updated',
  deleted: '🗑️ Record Deleted',
  verified: '✔️ Verified',
};

const ACTION_COLORS = {
  user_login: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  user_suspended: 'bg-red-500/15 text-red-400 border-red-500/30',
  user_activated: 'bg-green-500/15 text-green-400 border-green-500/30',
  complaint_filed: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  org_complaint_filed: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  ai_skills_recalculated: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  settings_updated: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

const getActionLabel = (action) => ACTION_LABELS[action] || action;
const getActionColor = (action) =>
  ACTION_COLORS[action] || 'bg-orange-500/15 text-vibrant-orange border-orange-500/30';

function getUserDisplayName(log) {
  if (log.student_first_name && log.student_last_name) return `${log.student_first_name} ${log.student_last_name}`;
  if (log.organization_name) return log.organization_name;
  if (log.institution_name) return log.institution_name;
  return log.user_email || 'System';
}

function parseJsonSafe(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return null; }
}

function formatTimestamp(ts) {
  if (!ts) return 'Never';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ChangeDetails({ oldValues, newValues }) {
  const oldParsed = parseJsonSafe(oldValues);
  const newParsed = parseJsonSafe(newValues);

  if (!oldParsed && !newParsed) return <span className="text-on-surface-variant text-[11px] italic">No details recorded</span>;

  const renderObj = (obj, label, color) => {
    if (!obj || typeof obj !== 'object') return null;
    return (
      <div className={`p-2 rounded-lg border ${color} text-[11px] font-mono space-y-0.5`}>
        <p className="font-bold font-sans text-[10px] uppercase tracking-wider mb-1 opacity-70">{label}</p>
        {Object.entries(obj).map(([key, val]) => (
          <div key={key} className="flex gap-2">
            <span className="font-bold min-w-[100px]">{key}:</span>
            <span className="break-all">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {oldParsed && renderObj(oldParsed, 'Previous Values', 'border-red-500/20 bg-red-500/5 text-red-300')}
      {newParsed && renderObj(newParsed, 'New Values', 'border-green-500/20 bg-green-500/5 text-green-300')}
    </div>
  );
}

function UserActivityModal({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await api.get(`/admin/audit-logs/user/${userId}?limit=100`);
      if (res.success) setData(res.data);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-surface-container-high rounded-2xl p-8">
          <LoadingSpinner message="Fetching user activity..." />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-container-high rounded-2xl border border-outline-variant max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-outline-variant flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-on-surface">User Activity History</h3>
            {data?.user && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-on-surface-variant">{data.user.email}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${data.user.is_active ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'}`}>
                  {data.user.is_active ? 'Active' : 'Inactive'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-blue-500/15 text-blue-400 border-blue-500/30 capitalize">
                  {data.user.role_name}
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-surface-container rounded-lg transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        {/* Timeline */}
        <div className="overflow-y-auto flex-1 p-5">
          {data?.activities?.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant text-sm">No recorded activity for this user.</div>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-2 top-0 bottom-0 w-px bg-outline-variant" />
              {data?.activities?.map((act, i) => (
                <div key={act.log_id} className="relative mb-4 group">
                  <div className="absolute -left-[16px] top-1 w-3 h-3 rounded-full bg-vibrant-orange border-2 border-surface-container-high z-10" />
                  <div className="bg-surface-container rounded-xl p-3 border border-outline-variant/50 hover:border-vibrant-orange/30 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getActionColor(act.action)}`}>
                        {getActionLabel(act.action)}
                      </span>
                      <span className="text-[10px] text-on-surface-variant">{new Date(act.created_at).toLocaleString()}</span>
                    </div>
                    {act.table_name && (
                      <p className="text-[11px] text-on-surface-variant">
                        Table: <span className="font-bold text-on-surface">{act.table_name}</span>
                        {act.record_id && <> &middot; Record: <span className="font-bold text-on-surface">#{act.record_id}</span></>}
                        {act.ip_address && <> &middot; IP: <span className="font-mono text-on-surface">{act.ip_address}</span></>}
                      </p>
                    )}
                    <ChangeDetails oldValues={act.old_values} newValues={act.new_values} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminAuditLogs() {
  const [activeTab, setActiveTab] = useState('logs');

  // Activity Log state
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [availableActions, setAvailableActions] = useState([]);
  const [availableTables, setAvailableTables] = useState([]);

  // Pagination for logs
  const [logsCurrentPage, setLogsCurrentPage] = useState(1);
  const LOGS_PER_PAGE = 20;

  // User Sessions state
  const [sessions, setSessions] = useState([]);
  const [sessionStats, setSessionStats] = useState({});
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionSearch, setSessionSearch] = useState('');
  
  // Pagination for sessions
  const [sessionsCurrentPage, setSessionsCurrentPage] = useState(1);
  const SESSIONS_PER_PAGE = 20;

  // User drill-down modal
  const [selectedUserId, setSelectedUserId] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let query = '?limit=200';
    if (actionFilter) query += `&action=${actionFilter}`;
    if (tableFilter) query += `&table_name=${tableFilter}`;
    if (searchQuery) query += `&search=${encodeURIComponent(searchQuery)}`;
    if (dateFrom) query += `&date_from=${dateFrom}`;
    if (dateTo) query += `&date_to=${dateTo}`;

    const res = await api.get(`/admin/audit-logs${query}`);
    if (res.success) {
      setLogs(res.data || []);
      setLogsCurrentPage(1);
      if (res.meta) {
        setAvailableActions(res.meta.availableActions || []);
        setAvailableTables(res.meta.availableTables || []);
      }
    }
    setLoading(false);
  }, [actionFilter, tableFilter, searchQuery, dateFrom, dateTo]);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    const res = await api.get('/admin/audit-logs/user-sessions');
    if (res.success && res.data) {
      setSessions(res.data.sessions || []);
      setSessionStats(res.data.stats || {});
      setSessionsCurrentPage(1);
    }
    setSessionsLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
    else if (activeTab === 'sessions') fetchSessions();
  }, [activeTab, fetchLogs, fetchSessions]);

  useRealtimeRefresh(() => {
    if (activeTab === 'logs') fetchLogs();
    else if (activeTab === 'sessions') fetchSessions();
  });

  const toggleRow = (logId) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (!sessionSearch) return true;
      const q = sessionSearch.toLowerCase();
      return (s.email && s.email.toLowerCase().includes(q)) ||
        (s.role_name && s.role_name.toLowerCase().includes(q)) ||
        (s.student_first_name && s.student_first_name.toLowerCase().includes(q)) ||
        (s.student_last_name && s.student_last_name.toLowerCase().includes(q)) ||
        (s.organization_name && s.organization_name.toLowerCase().includes(q)) ||
        (s.institution_name && s.institution_name.toLowerCase().includes(q));
    });
  }, [sessions, sessionSearch]);

  const paginatedLogs = useMemo(() => {
    const startIndex = (logsCurrentPage - 1) * LOGS_PER_PAGE;
    return logs.slice(startIndex, startIndex + LOGS_PER_PAGE);
  }, [logs, logsCurrentPage]);
  const logsTotalPages = Math.ceil(logs.length / LOGS_PER_PAGE);

  const paginatedSessions = useMemo(() => {
    const startIndex = (sessionsCurrentPage - 1) * SESSIONS_PER_PAGE;
    return filteredSessions.slice(startIndex, startIndex + SESSIONS_PER_PAGE);
  }, [filteredSessions, sessionsCurrentPage]);
  const sessionsTotalPages = Math.ceil(filteredSessions.length / SESSIONS_PER_PAGE);

  const tabs = [
    { id: 'logs', label: 'Activity Log', icon: 'history' },
    { id: 'sessions', label: 'User Sessions', icon: 'person_search' },
    { id: 'stats', label: 'Live Stats', icon: 'monitoring' },
  ];

  return (
    <div className="p-4 md:p-8 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-vibrant-orange">shield_lock</span>
            System Audit Trail
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Complete record of all system events, user logins, session history, and administrative actions
          </p>
        </div>
        <button
          onClick={() => activeTab === 'logs' ? fetchLogs() : fetchSessions()}
          className="px-4 py-2 bg-surface-container rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-1.5 border border-outline-variant self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container rounded-xl p-1 border border-outline-variant w-fit max-w-full overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === tab.id
                ? 'bg-vibrant-orange text-white shadow-md'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: Activity Log */}
      {activeTab === 'logs' && (
        <>
          {/* Filters */}
          <div className="bento-card flex items-center gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-on-surface-variant">search</span>
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                className="px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-low outline-none w-44"
              />
            </div>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-low font-bold outline-none"
            >
              <option value="">All Actions</option>
              {availableActions.map(a => (
                <option key={a} value={a}>{getActionLabel(a)}</option>
              ))}
            </select>

            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-low font-bold outline-none"
            >
              <option value="">All Tables</option>
              {availableTables.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <div className="flex items-center gap-1.5">
              <span className="text-on-surface-variant font-bold">From:</span>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-outline-variant bg-surface-container-low outline-none" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-on-surface-variant font-bold">To:</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-outline-variant bg-surface-container-low outline-none" />
            </div>

            {(actionFilter || tableFilter || searchQuery || dateFrom || dateTo) && (
              <button
                onClick={() => { setActionFilter(''); setTableFilter(''); setSearchQuery(''); setDateFrom(''); setDateTo(''); }}
                className="px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 font-bold hover:bg-red-500/20 transition-colors"
              >
                Clear Filters
              </button>
            )}

            <span className="ml-auto font-bold text-on-surface-variant">
              {logs.length} event(s)
            </span>
          </div>

          {/* Logs Table */}
          <div className="bento-card">
            {loading ? (
              <LoadingSpinner message="Fetching activity logs..." />
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-2 block">inbox</span>
                <p className="text-sm">No audit events found matching your criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[760px]">
                  <thead>
                    <tr className="border-b border-outline-variant text-on-surface-variant font-bold whitespace-nowrap">
                      <th className="py-3 px-3 w-8"></th>
                      <th className="py-3 px-3">ID</th>
                      <th className="py-3 px-3">Timestamp</th>
                      <th className="py-3 px-3">Event</th>
                      <th className="py-3 px-3">Target</th>
                      <th className="py-3 px-3">User</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    {paginatedLogs.map((log) => {
                      const isExpanded = expandedRows.has(log.log_id);
                      const hasDetails = log.old_values || log.new_values;
                      return (
                        <React.Fragment key={log.log_id}>
                          <tr
                            className={`hover:bg-surface-container-low transition-colors ${hasDetails ? 'cursor-pointer' : ''} ${isExpanded ? 'bg-surface-container-low' : ''}`}
                            onClick={() => hasDetails && toggleRow(log.log_id)}
                          >
                            <td className="py-2.5 px-3">
                              {hasDetails && (
                                <span className={`material-symbols-outlined text-[14px] text-on-surface-variant transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                  chevron_right
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-on-surface font-mono">#{log.log_id}</td>
                            <td className="py-2.5 px-3 text-on-surface-variant whitespace-nowrap">
                              <div>{new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                              <div className="text-[10px]">{new Date(log.created_at).toLocaleTimeString()}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${getActionColor(log.action)}`}>
                                {getActionLabel(log.action)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-on-surface">
                              <span className="font-bold">{log.table_name || '—'}</span>
                              {log.record_id && <span className="text-on-surface-variant ml-1">#{log.record_id}</span>}
                            </td>
                            <td className="py-2.5 px-3">
                              {log.user_email ? (
                                <div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedUserId(log.user_id); }}
                                    className="font-bold text-on-surface hover:text-vibrant-orange transition-colors text-left"
                                  >
                                    {getUserDisplayName(log)}
                                  </button>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] text-on-surface-variant">{log.user_email}</span>
                                    <span className="px-1.5 py-0 rounded text-[9px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 capitalize">{log.role_name}</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-on-surface-variant italic">System</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {log.user_is_active !== undefined && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  log.user_is_active ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${log.user_is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                                  {log.user_is_active ? 'Active' : 'Inactive'}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-on-surface-variant font-mono text-[11px]">{log.ip_address || '—'}</td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={8} className="p-0">
                                <div className="px-8 py-3 bg-surface-container-low border-l-2 border-vibrant-orange">
                                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Change Details</p>
                                  <ChangeDetails oldValues={log.old_values} newValues={log.new_values} />
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            {!loading && logs.length > 0 && (
              <Pagination 
                currentPage={logsCurrentPage}
                totalPages={logsTotalPages}
                onPageChange={setLogsCurrentPage}
              />
            )}
          </div>
        </>
      )}

      {/* TAB: User Sessions */}
      {activeTab === 'sessions' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Active Users', value: sessionStats.active_users || 0, icon: 'person', color: 'text-green-400' },
              { label: 'Inactive Users', value: sessionStats.inactive_users || 0, icon: 'person_off', color: 'text-red-400' },
              { label: 'Logins Today', value: sessionStats.logins_today || 0, icon: 'login', color: 'text-blue-400' },
              { label: 'Logins (7 days)', value: sessionStats.logins_this_week || 0, icon: 'date_range', color: 'text-purple-400' },
              { label: 'Events Today', value: sessionStats.events_today || 0, icon: 'bolt', color: 'text-amber-400' },
              { label: 'Total Events', value: sessionStats.total_events || 0, icon: 'database', color: 'text-vibrant-orange' },
            ].map(stat => (
              <div key={stat.label} className="bento-card flex flex-col items-center text-center py-3">
                <span className={`material-symbols-outlined text-2xl ${stat.color}`}>{stat.icon}</span>
                <span className="text-xl font-bold text-on-surface mt-1">{stat.value.toLocaleString()}</span>
                <span className="text-[10px] text-on-surface-variant font-bold">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="bento-card flex items-center gap-3 text-xs">
            <span className="material-symbols-outlined text-[14px] text-on-surface-variant">search</span>
            <input
              type="text"
              placeholder="Search users by name, email, role, or organization..."
              value={sessionSearch}
              onChange={(e) => setSessionSearch(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-low outline-none flex-1"
            />
            <span className="font-bold text-on-surface-variant">{filteredSessions.length} user(s)</span>
          </div>

          {/* Sessions Table */}
          <div className="bento-card">
            {sessionsLoading ? (
              <LoadingSpinner message="Fetching user sessions..." />
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-2 block">group_off</span>
                <p className="text-sm">No users found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[900px]">
                  <thead>
                    <tr className="border-b border-outline-variant text-on-surface-variant font-bold whitespace-nowrap">
                      <th className="py-3 px-3">User</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Total Logins</th>
                      <th className="py-3 px-3">First Login</th>
                      <th className="py-3 px-3">Latest Login</th>
                      <th className="py-3 px-3">Total Actions</th>
                      <th className="py-3 px-3">Last Action</th>
                      <th className="py-3 px-3">Last IP</th>
                      <th className="py-3 px-3">Registered</th>
                      <th className="py-3 px-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    {paginatedSessions.map(s => {
                      const name = s.student_first_name && s.student_last_name
                        ? `${s.student_first_name} ${s.student_last_name}`
                        : s.organization_name || s.institution_name || '';
                      return (
                        <tr key={s.user_id} className="hover:bg-surface-container-low transition-colors">
                          <td className="py-2.5 px-3">
                            <div>
                              {name && <p className="font-bold text-on-surface">{name}</p>}
                              <p className="text-on-surface-variant">{s.email}</p>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 capitalize whitespace-nowrap">
                              {s.role_name}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                              s.is_active ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                              {s.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-on-surface text-center">{s.total_logins || 0}</td>
                          <td className="py-2.5 px-3 text-on-surface-variant whitespace-nowrap">{formatTimestamp(s.first_login_at)}</td>
                          <td className="py-2.5 px-3 text-on-surface whitespace-nowrap font-bold">{formatTimestamp(s.latest_login_at)}</td>
                          <td className="py-2.5 px-3 font-bold text-on-surface text-center">{s.total_actions || 0}</td>
                          <td className="py-2.5 px-3 text-on-surface-variant whitespace-nowrap">{formatTimestamp(s.last_action_at)}</td>
                          <td className="py-2.5 px-3 text-on-surface-variant font-mono text-[11px]">{s.last_ip_address || '—'}</td>
                          <td className="py-2.5 px-3 text-on-surface-variant whitespace-nowrap">{formatTimestamp(s.registered_at)}</td>
                          <td className="py-2.5 px-3">
                            <button
                              onClick={() => setSelectedUserId(s.user_id)}
                              className="p-1.5 rounded-lg bg-vibrant-orange/10 text-vibrant-orange hover:bg-vibrant-orange/20 transition-colors"
                              title="View full activity"
                            >
                              <span className="material-symbols-outlined text-[16px]">visibility</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            {!sessionsLoading && filteredSessions.length > 0 && (
              <Pagination 
                currentPage={sessionsCurrentPage}
                totalPages={sessionsTotalPages}
                onPageChange={setSessionsCurrentPage}
              />
            )}
          </div>
        </>
      )}

      {/* TAB: Live Stats */}
      {activeTab === 'stats' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recent Login Activity */}
            <div className="bento-card">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-green-400 text-[18px]">login</span>
                Recent Login Activity
              </h3>
              {logs.filter(l => l.action === 'user_login').slice(0, 10).length === 0 ? (
                <p className="text-xs text-on-surface-variant italic py-4 text-center">No login events recorded yet. Users will appear here after logging in.</p>
              ) : (
                <div className="space-y-2">
                  {logs.filter(l => l.action === 'user_login').slice(0, 10).map(l => (
                    <div key={l.log_id} className="flex items-center justify-between px-3 py-2 bg-surface-container rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${l.user_is_active ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                        <div>
                          <p className="text-xs font-bold text-on-surface">{getUserDisplayName(l)}</p>
                          <p className="text-[10px] text-on-surface-variant">{l.user_email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-on-surface-variant">{formatTimestamp(l.created_at)}</p>
                        <p className="text-[10px] text-on-surface-variant font-mono">{l.ip_address || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Admin Actions */}
            <div className="bento-card">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-vibrant-orange text-[18px]">admin_panel_settings</span>
                Recent Admin Actions
              </h3>
              {logs.filter(l => l.action !== 'user_login').slice(0, 10).length === 0 ? (
                <p className="text-xs text-on-surface-variant italic py-4 text-center">No admin actions recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {logs.filter(l => l.action !== 'user_login').slice(0, 10).map(l => (
                    <div key={l.log_id} className="flex items-center justify-between px-3 py-2 bg-surface-container rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getActionColor(l.action)}`}>
                          {getActionLabel(l.action)}
                        </span>
                        <div>
                          <p className="text-xs text-on-surface">{l.table_name} {l.record_id ? `#${l.record_id}` : ''}</p>
                          <p className="text-[10px] text-on-surface-variant">{l.user_email || 'System'}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-on-surface-variant whitespace-nowrap">{formatTimestamp(l.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Event Type Breakdown */}
          <div className="bento-card">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-purple-400 text-[18px]">analytics</span>
              Event Type Breakdown
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {(() => {
                const counts = {};
                logs.forEach(l => { counts[l.action] = (counts[l.action] || 0) + 1; });
                return Object.entries(counts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([action, count]) => (
                    <div key={action} className="flex flex-col items-center p-3 rounded-xl bg-surface-container border border-outline-variant/50">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border mb-1.5 ${getActionColor(action)}`}>
                        {getActionLabel(action)}
                      </span>
                      <span className="text-lg font-bold text-on-surface">{count}</span>
                    </div>
                  ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* User Activity Drill-Down Modal */}
      {selectedUserId && (
        <UserActivityModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}
    </div>
  );
}
