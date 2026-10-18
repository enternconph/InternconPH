import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import api from '../../api/client';
import { DashboardSkeleton } from '../../components/ui/Skeleton';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recalculatingAi, setRecalculatingAi] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date());

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4500);
  };

  const fetchDashboard = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.get('/admin/dashboard');
      if (res.success && res.data) {
        setData(res.data);
        setLastRefreshedAt(new Date());
        if (isManual) showToast('Dashboard metrics refreshed successfully.');
      }
    } catch (err) {
      console.error('Fetch admin dashboard error:', err);
      if (isManual) showToast('Could not refresh dashboard data.', 'error');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useRealtimeRefresh(() => fetchDashboard(false));

  const handleRecalculateAi = async () => {
    setRecalculatingAi(true);
    try {
      const res = await api.post('/admin/analytics/recalculate');
      if (res.success) {
        showToast(res.message || 'AI Skill Engine recalibrated across all programs!');
        fetchDashboard(false);
      } else {
        showToast(res.message || 'Failed to recalculate.', 'error');
      }
    } catch (err) {
      console.error('Recalculate AI error:', err);
      showToast('Could not recalculate AI skill demand.', 'error');
    } finally {
      setRecalculatingAi(false);
    }
  };

  const m = data?.metrics || {};
  const roleDist = data?.roleDistribution || {};
  const totalUsersCount = m.totalUsers || 1;

  const studentPct = Math.round(((roleDist.student || 0) / totalUsersCount) * 100);
  const orgPct = Math.max(1, Math.round(((roleDist.hiring_organization || 0) / totalUsersCount) * 100));
  const instPct = Math.max(1, Math.round((((roleDist.institution || 0) + (roleDist.institution_staff || 0)) / totalUsersCount) * 100));

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Toast */}
      {toastMessage && (
        <div className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-3 shadow-lg ${
          toastType === 'error'
            ? 'bg-rose-950/50 border-rose-800 text-rose-300'
            : 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
        }`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">
              {toastType === 'error' ? 'error' : 'check_circle'}
            </span>
            <span>{toastMessage}</span>
          </div>
          <button type="button" onClick={() => setToastMessage('')} className="opacity-60 hover:opacity-100">
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      )}

      {/* ═══ Header ═══ */}
      <div className="bento-card !p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="text-lg font-black tracking-tight text-on-surface whitespace-nowrap">System Overview</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              disabled={refreshing}
              onClick={() => fetchDashboard(true)}
              className="px-2.5 py-1.5 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container text-on-surface text-[11px] font-bold transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[14px] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
              <span>{refreshing ? '...' : 'Refresh'}</span>
            </button>
            <Link to="/dashboard/admin/institutions" className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">school</span>
              Institutions
              {m.pendingInstitutions > 0 && <span className="px-1 py-0 bg-white/20 rounded text-[9px] ml-0.5">{m.pendingInstitutions}</span>}
            </Link>
            <Link to="/dashboard/admin/organizations" className="px-2.5 py-1.5 bg-vibrant-orange hover:bg-deep-orange text-white rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">business</span>
              Orgs
              {m.pendingOrgs > 0 && <span className="px-1 py-0 bg-white/20 rounded text-[9px] ml-0.5">{m.pendingOrgs}</span>}
            </Link>
            <Link to="/dashboard/admin/complaints" className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">gavel</span>
              Grievances
            </Link>
          </div>
        </div>
      </div>

      {/* ═══ Stat Cards ═══ */}
      <div>
        <div className="flex items-center justify-between mb-2 px-0.5">
          <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px] text-vibrant-orange">analytics</span>
            Core Metrics
          </span>
          <span className="text-[9px] text-on-surface-variant">
            {lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { label: 'Total Users', value: m.totalUsers, icon: 'groups', to: '/dashboard/admin/users', color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Students', value: m.totalStudents, icon: 'school', to: '/dashboard/admin/users', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Organizations', value: m.totalOrgs, icon: 'business', to: '/dashboard/admin/organizations', color: 'text-amber-400', bg: 'bg-amber-500/10', alert: m.pendingOrgs > 0 },
            { label: 'Institutions', value: m.totalInstitutions, icon: 'account_balance', to: '/dashboard/admin/institutions', color: 'text-indigo-400', bg: 'bg-indigo-500/10', alert: m.pendingInstitutions > 0 },
            { label: 'Active OJTs', value: m.activeOjts, icon: 'timelapse', to: '/dashboard/admin/jobs', color: 'text-teal-400', bg: 'bg-teal-500/10' },
            { label: 'Job Postings', value: m.totalJobs, icon: 'post_add', to: '/dashboard/admin/jobs', color: 'text-vibrant-orange', bg: 'bg-orange-500/10' },
            { label: 'Grievances', value: m.totalComplaints || 0, icon: 'gavel', to: '/dashboard/admin/complaints', color: 'text-rose-400', bg: 'bg-rose-500/10', alert: m.pendingComplaints > 0 },
            { label: 'Sanctions', value: m.activeSuspensions || 0, icon: 'shield_with_heart', to: '/dashboard/admin/complaints', color: 'text-purple-400', bg: 'bg-purple-500/10' },
          ].map((card) => (
            <Link
              key={card.label}
              to={card.to}
              className="bento-card group !p-3 hover:border-vibrant-orange/40 transition-all relative"
            >
              {card.alert && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.bg} ${card.color} mb-2`}>
                <span className="material-symbols-outlined text-[18px]">{card.icon}</span>
              </div>
              <p className="text-xl font-black text-on-surface leading-none">{(card.value || 0).toLocaleString()}</p>
              <p className="text-[10px] font-bold text-on-surface-variant mt-1 uppercase tracking-wider">{card.label}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ═══ Row 2: Demographics + AI Skills ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* LEFT: User Demographics */}
        <div className="space-y-4">
          <div className="bento-card !p-4">
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-vibrant-orange text-[16px]">pie_chart</span>
                User Demographics
              </h2>
              <Link to="/dashboard/admin/users" className="text-[10px] font-bold text-vibrant-orange hover:underline">Manage →</Link>
            </div>

            {/* Distribution Bar */}
            <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden flex mb-3">
              <div style={{ width: `${studentPct}%` }} className="bg-emerald-500 h-full transition-all duration-500" />
              <div style={{ width: `${orgPct}%` }} className="bg-vibrant-orange h-full transition-all duration-500" />
              <div style={{ width: `${instPct}%` }} className="bg-indigo-500 h-full transition-all duration-500" />
            </div>

            {/* Role Breakdown */}
            <div className="space-y-1.5">
              {[
                { label: 'Students', value: roleDist.student || 0, color: 'bg-emerald-500', to: '/dashboard/admin/users' },
                { label: 'Hiring Orgs', value: roleDist.hiring_organization || 0, color: 'bg-vibrant-orange', to: '/dashboard/admin/organizations' },
                { label: 'HEI Staff & Deans', value: (roleDist.institution || 0) + (roleDist.institution_staff || 0), color: 'bg-indigo-500', to: '/dashboard/admin/institutions' },
                { label: 'System Admins', value: roleDist.system_admin || 0, color: 'bg-purple-500', to: '/dashboard/admin/users' },
              ].map(role => (
                <Link
                  key={role.label}
                  to={role.to}
                  className="flex items-center justify-between p-2 rounded-lg border border-outline-variant/30 bg-surface hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${role.color}`} />
                    <span className="text-[11px] font-semibold text-on-surface-variant">{role.label}</span>
                  </div>
                  <span className="text-sm font-black text-on-surface">{role.value.toLocaleString()}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Pending Alert */}
          {(m.pendingInstitutions > 0 || m.pendingOrgs > 0) && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-300">
                <span className="material-symbols-outlined text-[18px]">pending_actions</span>
                <h3 className="font-bold text-xs">Pending Verification</h3>
              </div>
              <p className="text-[10px] text-on-surface-variant">
                {m.pendingInstitutions || 0} institutions and {m.pendingOrgs || 0} organizations awaiting review.
              </p>
              <div className="flex gap-2 flex-wrap">
                {m.pendingInstitutions > 0 && (
                  <Link to="/dashboard/admin/institutions" className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition-colors">
                    Verify Institutions ({m.pendingInstitutions})
                  </Link>
                )}
                {m.pendingOrgs > 0 && (
                  <Link to="/dashboard/admin/organizations" className="px-2.5 py-1 bg-vibrant-orange text-white rounded-lg text-[10px] font-bold hover:bg-deep-orange transition-colors">
                    Review Orgs ({m.pendingOrgs})
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Audit Trail Preview */}
          <div className="bento-card !p-4">
            <div className="flex justify-between items-center mb-2.5">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-vibrant-orange text-[16px]">receipt_long</span>
                Recent Activity
              </h3>
              <Link to="/dashboard/admin/audit-logs" className="text-[10px] font-bold text-vibrant-orange hover:underline">View All →</Link>
            </div>

            <div className="divide-y divide-surface-container-high">
              {(data?.recentAuditLogs || []).map((log) => (
                <div key={log.log_id} className="py-1.5 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-surface-container text-on-surface-variant whitespace-nowrap shrink-0">
                      {log.action?.replace(/_/g, ' ')}
                    </span>
                    <span className="font-semibold text-on-surface truncate text-[11px]">{log.user_email || 'System'}</span>
                  </div>
                  <span className="text-[10px] text-on-surface-variant whitespace-nowrap shrink-0">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {(!data?.recentAuditLogs || data.recentAuditLogs.length === 0) && (
                <p className="text-[11px] text-on-surface-variant text-center py-3">No recent audit records.</p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: AI Skill Intelligence */}
        <div className="bento-card !p-4">
          <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-on-surface flex items-center gap-1.5 flex-wrap">
                <span className="material-symbols-outlined text-vibrant-orange text-[16px]">psychology</span>
                AI Skill Demand & Curriculum Intelligence
                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">v2.6</span>
              </h2>
              <p className="text-[10px] text-on-surface-variant mt-0.5">Competency weights tuned to employer vacancies & coursework</p>
            </div>
            <button
              type="button"
              disabled={recalculatingAi}
              onClick={handleRecalculateAi}
              className="px-2.5 py-1.5 rounded-lg bg-vibrant-orange text-white hover:bg-deep-orange text-[10px] font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1 shrink-0"
            >
              <span className={`material-symbols-outlined text-[14px] ${recalculatingAi ? 'animate-spin' : ''}`}>
                {recalculatingAi ? 'progress_activity' : 'bolt'}
              </span>
              {recalculatingAi ? 'Recalibrating...' : 'Sync AI Engine'}
            </button>
          </div>

          {/* Top Skills */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Top In-Demand Skills</span>
              <Link to="/dashboard/admin/analytics" className="font-bold text-vibrant-orange hover:underline text-[10px] flex items-center gap-0.5">
                Full Analytics <span className="material-symbols-outlined text-[11px]">open_in_new</span>
              </Link>
            </div>

            <div className="space-y-1.5">
              {(data?.topSkills || []).slice(0, 8).map((sk, idx) => (
                <div
                  key={sk.skill_name || idx}
                  className="p-2 rounded-lg border border-outline-variant/30 bg-surface-container-lowest hover:border-vibrant-orange/30 transition-all flex items-center gap-2"
                >
                  <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[9px] font-bold shrink-0">
                    #{idx + 1}
                  </span>
                  <p className="text-[11px] font-bold text-on-surface truncate flex-1 min-w-0">{sk.skill_name}</p>
                  <span className="text-[10px] text-on-surface-variant whitespace-nowrap shrink-0">{sk.student_count || 0} verified</span>
                  <span className="material-symbols-outlined text-[12px] text-emerald-500 shrink-0">trending_up</span>
                </div>
              ))}
            </div>
          </div>

          {/* CHED Coverage */}
          <div className="p-3 rounded-lg bg-surface-container-low/60 border border-outline-variant/20">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-on-surface flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px] text-vibrant-orange">school</span>
                CHED Discipline Coverage
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {['BSIT', 'BSCS', 'BSA', 'BSCE', 'BSN', 'BSHM', 'BSTM', 'BMMA', 'BSCRIM', 'BSPSY'].map((code) => (
                <span key={code} className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-surface border border-outline-variant/40 text-on-surface-variant">
                  {code}
                </span>
              ))}
              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-vibrant-orange/10 text-vibrant-orange border border-vibrant-orange/20">
                +20 More
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Row 3: Recent Orgs + Institutions ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent Organizations */}
        <div className="bento-card !p-4">
          <div className="flex justify-between items-start mb-3">
            <h2 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-vibrant-orange text-[16px]">corporate_fare</span>
              Recent Organizations
            </h2>
            <Link to="/dashboard/admin/organizations" className="text-[10px] font-bold text-vibrant-orange hover:underline shrink-0">
              All ({m.totalOrgs}) →
            </Link>
          </div>

          <div className="space-y-1.5">
            {data?.recentOrgs?.slice(0, 5).map((org) => (
              <div
                key={org.organization_id}
                className="p-2.5 rounded-lg border border-outline-variant/30 bg-surface hover:bg-surface-container-low transition-all flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[11px] text-on-surface truncate">{org.organization_name}</p>
                  <p className="text-[10px] text-on-surface-variant truncate">{org.industry || 'General'} · {org.city || 'Philippines'}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold capitalize ${
                    org.status === 'pending' ? 'bg-amber-500/15 text-amber-400'
                    : org.status === 'active' ? 'bg-green-500/15 text-green-400'
                    : 'bg-surface-container text-on-surface-variant'
                  }`}>{org.status}</span>
                  <Link to="/dashboard/admin/organizations" className="px-2 py-1 rounded-lg text-[10px] font-bold border border-outline-variant/60 hover:bg-surface-container-high transition-colors">
                    Manage
                  </Link>
                </div>
              </div>
            ))}
            {(!data?.recentOrgs || data.recentOrgs.length === 0) && (
              <p className="text-[11px] text-on-surface-variant text-center py-4">No organizations registered yet.</p>
            )}
          </div>
        </div>

        {/* Recent Institutions */}
        <div className="bento-card !p-4">
          <div className="flex justify-between items-start mb-3">
            <h2 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-indigo-400 text-[16px]">account_balance</span>
              Recent Institutions
            </h2>
            <Link to="/dashboard/admin/institutions" className="text-[10px] font-bold text-vibrant-orange hover:underline shrink-0">
              All ({m.totalInstitutions}) →
            </Link>
          </div>

          <div className="space-y-1.5">
            {data?.recentInstitutions?.slice(0, 5).map((inst) => (
              <div
                key={inst.institution_id}
                className="p-2.5 rounded-lg border border-outline-variant/30 bg-surface hover:bg-surface-container-low transition-all flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <p className="font-bold text-[11px] text-on-surface truncate">{inst.institution_name}</p>
                    {inst.institution_code && (
                      <span className="px-1 rounded text-[8px] font-bold bg-surface-container text-on-surface-variant shrink-0">
                        {inst.institution_code}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-on-surface-variant truncate">{inst.city || 'City'}, {inst.province || 'Philippines'}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold capitalize ${
                    inst.status === 'pending' ? 'bg-amber-500/15 text-amber-400'
                    : inst.status === 'active' ? 'bg-green-500/15 text-green-400'
                    : 'bg-surface-container text-on-surface-variant'
                  }`}>{inst.status}</span>
                  <Link to={`/dashboard/admin/institutions/${inst.institution_id}`} className="px-2 py-1 rounded-lg text-[10px] font-bold border border-outline-variant/60 hover:bg-surface-container-high transition-colors">
                    Review
                  </Link>
                </div>
              </div>
            ))}
            {(!data?.recentInstitutions || data.recentInstitutions.length === 0) && (
              <p className="text-[11px] text-on-surface-variant text-center py-4">No institutions registered yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
