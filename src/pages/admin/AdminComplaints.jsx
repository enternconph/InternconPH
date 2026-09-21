import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import Pagination from '../../components/ui/Pagination';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminComplaints() {
  const [data, setData] = useState({
    institutionReports: [],
    escalatedAccidents: [],
    warnings: [],
    suspensions: []
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'accidents' | 'sanctions'

  // Resolution modal state for Institution Report
  const [selectedReport, setSelectedReport] = useState(null);
  const [resolutionStatus, setResolutionStatus] = useState('resolved');
  const [sanctionType, setSanctionType] = useState('none');
  const [sanctionDays, setSanctionDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Detail modal for viewing full report or accident
  const [viewingReport, setViewingReport] = useState(null);
  const [viewingAccident, setViewingAccident] = useState(null);

  // Search/filter
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination states
  const [reportsPage, setReportsPage] = useState(1);
  const [accidentsPage, setAccidentsPage] = useState(1);
  const [warningsPage, setWarningsPage] = useState(1);
  const [suspensionsPage, setSuspensionsPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const fetchAdminData = useCallback(async () => {
    try {
      const res = await api.get('/admin/complaints');
      if (res.success && res.data) {
        setData({
          institutionReports: res.data.institutionReports || [],
          escalatedAccidents: res.data.escalatedAccidents || [],
          warnings: res.data.warnings || [],
          suspensions: res.data.suspensions || []
        });
        setReportsPage(1);
        setAccidentsPage(1);
        setWarningsPage(1);
        setSuspensionsPage(1);
      }
    } catch (err) {
      console.error('Fetch admin complaints error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Real-time synchronization via sockets
  useRealtimeRefresh(fetchAdminData);

  const openResolveModal = (report) => {
    setSelectedReport(report);
    setResolutionStatus('resolved');
    setSanctionType('none');
    setSanctionDays(30);
    setNotes('');
    setErrorMsg('');
  };

  const handleResolveReport = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;

    // Client-side safeguard for repeat-offense rule
    const repeatCount = selectedReport.institution_org_report_count || 1;
    if ((sanctionType === 'warning' || sanctionType === 'suspension') && repeatCount < 2) {
      setErrorMsg(
        `Repeat-Offense Policy: Sanctions require at least 2 reports from this institution. Current count: ${repeatCount}.`
      );
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.post(`/admin/complaints/reports/${selectedReport.report_id}/resolve`, {
        status: resolutionStatus,
        resolution_notes: notes,
        sanction_type: sanctionType,
        days: sanctionDays
      });

      if (res.success) {
        setMessage(res.message || 'Institution report concluded successfully.');
        setSelectedReport(null);
        setNotes('');
        setTimeout(() => setMessage(''), 5000);
        fetchAdminData();
      } else {
        setErrorMsg(res.message || 'Action failed.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit resolution.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered reports
  const filteredReports = useMemo(() => {
    return data.institutionReports.filter((r) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.title?.toLowerCase().includes(q) ||
        r.institution_name?.toLowerCase().includes(q) ||
        r.organization_name?.toLowerCase().includes(q) ||
        r.category_name?.toLowerCase().includes(q)
      );
    });
  }, [data.institutionReports, searchQuery]);

  const paginatedReports = useMemo(() => {
    const startIndex = (reportsPage - 1) * ITEMS_PER_PAGE;
    return filteredReports.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredReports, reportsPage]);
  const reportsTotalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);

  const paginatedAccidents = useMemo(() => {
    const startIndex = (accidentsPage - 1) * ITEMS_PER_PAGE;
    return data.escalatedAccidents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [data.escalatedAccidents, accidentsPage]);
  const accidentsTotalPages = Math.ceil(data.escalatedAccidents.length / ITEMS_PER_PAGE);

  const paginatedWarnings = useMemo(() => {
    const startIndex = (warningsPage - 1) * ITEMS_PER_PAGE;
    return data.warnings.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [data.warnings, warningsPage]);
  const warningsTotalPages = Math.ceil(data.warnings.length / ITEMS_PER_PAGE);

  const paginatedSuspensions = useMemo(() => {
    const startIndex = (suspensionsPage - 1) * ITEMS_PER_PAGE;
    return data.suspensions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [data.suspensions, suspensionsPage]);
  const suspensionsTotalPages = Math.ceil(data.suspensions.length / ITEMS_PER_PAGE);

  const pendingReportsCount = data.institutionReports.filter((r) => r.status === 'pending').length;
  const activeSuspensionsCount = data.suspensions.filter((s) => s.is_active).length;
  const unreadAccidentsCount = useMemo(() => {
    return data.escalatedAccidents.filter((a) => !a.is_read).length;
  }, [data.escalatedAccidents]);

  const handleToggleAccidentRead = async (accidentId, currentStatus) => {
    try {
      const res = await api.patch(`/admin/complaints/accidents/${accidentId}/read`, {
        read: !currentStatus
      });
      if (res.success) {
        setData(prev => ({
          ...prev,
          escalatedAccidents: prev.escalatedAccidents.map(acc => 
            acc.accident_id === accidentId ? { ...acc, is_read: res.data?.is_read ? 1 : 0, admin_read_at: res.data?.admin_read_at } : acc
          )
        }));
        if (viewingAccident && viewingAccident.accident_id === accidentId) {
          setViewingAccident(prev => ({
            ...prev,
            is_read: res.data?.is_read ? 1 : 0,
            admin_read_at: res.data?.admin_read_at
          }));
        }
      }
    } catch (err) {
      console.error('Failed to toggle accident read status:', err);
    }
  };

  const handleMarkAllAccidentsRead = async () => {
    try {
      const res = await api.post('/admin/complaints/accidents/read-all');
      if (res.success) {
        setData(prev => ({
          ...prev,
          escalatedAccidents: prev.escalatedAccidents.map(acc => ({
            ...acc,
            is_read: 1,
            admin_read_at: new Date().toISOString()
          }))
        }));
        if (viewingAccident) {
          setViewingAccident(prev => ({
            ...prev,
            is_read: 1,
            admin_read_at: new Date().toISOString()
          }));
        }
      }
    } catch (err) {
      console.error('Failed to mark all accidents as read:', err);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-on-surface">Institution Reports & Governance</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-vibrant-orange/10 text-vibrant-orange border border-vibrant-orange/20">
              System Admin
            </span>
          </div>
          <p className="text-xs md:text-sm text-on-surface-variant mt-1">
            Review formal compliance dossiers escalated by higher education institutions and govern organizational accountability with repeat-offense safeguards.
          </p>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-3 border border-emerald-200 shadow-sm animate-fadeIn">
          <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
          <span>{message}</span>
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bento-card relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Institution Reports</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">account_balance</span>
            </div>
          </div>
          <p className="text-2xl font-black text-on-surface mt-2">{data.institutionReports?.length || 0}</p>
          <p className="text-[11px] text-on-surface-variant mt-1">Formal University Dossiers</p>
        </div>

        <div className="bento-card relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pending Action</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <span className="material-symbols-outlined text-[18px]">pending_actions</span>
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">{pendingReportsCount}</p>
          <p className="text-[11px] text-on-surface-variant mt-1">Awaiting Administrative Ruling</p>
        </div>

        <div className="bento-card relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Escalated Accidents</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <span className="material-symbols-outlined text-[18px]">emergency</span>
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 mt-2">{data.escalatedAccidents?.length || 0}</p>
          <p className="text-[11px] text-on-surface-variant mt-1">Workplace Incidents on Record</p>
        </div>

        <div className="bento-card relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Active Sanctions</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <span className="material-symbols-outlined text-[18px]">gavel</span>
            </div>
          </div>
          <p className="text-2xl font-black text-purple-600 mt-2">
            {(data.warnings?.length || 0) + activeSuspensionsCount}
          </p>
          <p className="text-[11px] text-on-surface-variant mt-1">
            {data.warnings?.length || 0} Warnings &bull; {activeSuspensionsCount} Suspensions
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-outline-variant/60 gap-4">
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'reports'
              ? 'border-vibrant-orange text-vibrant-orange'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">description</span>
          <span>Formal Institution Reports</span>
          {pendingReportsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white">
              {pendingReportsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('accidents')}
          className={`pb-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'accidents'
              ? 'border-vibrant-orange text-vibrant-orange'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">emergency</span>
          <span>Escalated Accident Reports</span>
          {data.escalatedAccidents?.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white">
                {data.escalatedAccidents.length}
              </span>
              {unreadAccidentsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse" title={`${unreadAccidentsCount} unread reports`}>
                  {unreadAccidentsCount} new
                </span>
              )}
            </div>
          )}
        </button>

        <button
          onClick={() => setActiveTab('sanctions')}
          className={`pb-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'sanctions'
              ? 'border-vibrant-orange text-vibrant-orange'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">gavel</span>
          <span>Sanctions Register</span>
          {(data.warnings?.length || 0) + activeSuspensionsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-purple-600 text-white">
              {(data.warnings?.length || 0) + activeSuspensionsCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: FORMAL INSTITUTION REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search report, institution, or organization..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-low text-xs text-on-surface focus:outline-none focus:border-vibrant-orange"
              />
            </div>
            <div className="text-xs text-on-surface-variant flex items-center gap-2 self-end sm:self-auto">
              <span className="inline-block w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Repeat Offense Rule: ≥2 reports required for formal sanctions</span>
            </div>
          </div>

          {loading ? (
            <div className="p-12">
              <LoadingSpinner message="Loading institution reports..." />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="bento-card py-12 text-center space-y-2">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">assignment_turned_in</span>
              <p className="text-sm font-bold text-on-surface">No Formal Institution Reports Found</p>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                Higher education institutions have not escalated any unresolved grievance dossiers to System Administration at this time.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report) => {
                const reportCount = report.institution_org_report_count || 1;
                const isRepeatOffender = reportCount >= 2;

                return (
                  <div
                    key={report.report_id}
                    className="bento-card border border-outline-variant/60 hover:border-outline-variant transition-all duration-200 p-5 space-y-4"
                  >
                    {/* Card Header */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 border-b border-outline-variant/40 pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm md:text-base font-bold text-on-surface">{report.title}</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-surface-container-high text-on-surface">
                            {report.category_name}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              report.status === 'pending'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : report.status === 'action_taken'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-surface-container-high text-on-surface-variant'
                            }`}
                          >
                            {report.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant mt-1 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                          Filed on {new Date(report.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      {/* Repeat Offense Indicator Badge */}
                      <div className="flex items-center gap-2">
                        {isRepeatOffender ? (
                          <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                            <span className="material-symbols-outlined text-rose-600 text-[18px] animate-pulse">
                              warning
                            </span>
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-wider text-rose-700 leading-tight">
                                Repeat Offense ({reportCount} Reports)
                              </p>
                              <p className="text-[10px] text-rose-600/90 font-medium">Sanctions Legally Eligible</p>
                            </div>
                          </div>
                        ) : (
                          <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-600 text-[18px]">
                              visibility
                            </span>
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-wider text-amber-700 leading-tight">
                                1st Report on File
                              </p>
                              <p className="text-[10px] text-amber-600/90 font-medium">Monitored Observation</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Entities Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/30">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-primary">school</span>
                          Reporting Institution
                        </span>
                        <p className="font-bold text-on-surface text-xs md:text-sm">{report.institution_name}</p>
                        <p className="text-[11px] text-on-surface-variant font-mono">
                          Code: {report.institution_code || 'N/A'} &bull; Contact: {report.reporter_email}
                        </p>
                      </div>

                      <div className="space-y-1 border-t md:border-t-0 md:border-l border-outline-variant/40 pt-2 md:pt-0 md:pl-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-vibrant-orange">corporate_fare</span>
                          Reported Organization
                        </span>
                        <p className="font-bold text-on-surface text-xs md:text-sm">{report.organization_name}</p>
                        <p className="text-[11px] text-on-surface-variant font-mono">
                          Contact: {report.org_email || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Findings & Recommendations preview */}
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-bold text-on-surface-variant text-[11px] uppercase tracking-wider">
                          University Investigation Findings:
                        </span>
                        <p className="text-on-surface mt-0.5 line-clamp-2 bg-surface-container-low/50 p-2.5 rounded-lg border border-outline-variant/20">
                          {report.description}
                        </p>
                      </div>
                      {report.recommendations && (
                        <div>
                          <span className="font-bold text-on-surface-variant text-[11px] uppercase tracking-wider">
                            University Recommendation:
                          </span>
                          <p className="text-on-surface-variant mt-0.5 line-clamp-1 italic">
                            &ldquo;{report.recommendations}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-outline-variant/40">
                      <button
                        onClick={() => setViewingReport(report)}
                        className="px-3 py-1.5 text-xs font-bold text-on-surface-variant hover:text-on-surface bg-surface-container hover:bg-surface-container-high rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                        <span>Read Full Dossier</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {report.status === 'pending' ? (
                          <button
                            onClick={() => openResolveModal(report)}
                            className="px-4 py-2 bg-vibrant-orange text-white rounded-xl text-xs font-bold hover:bg-deep-orange transition-all shadow-sm flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-[16px]">gavel</span>
                            <span>Review & Take Action</span>
                          </button>
                        ) : (
                          <span className="text-xs text-on-surface-variant font-semibold px-2 py-1 bg-surface-container rounded-lg">
                            Case Concluded ({report.status.replace(/_/g, ' ')})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredReports.length > 0 && (
                <Pagination 
                  currentPage={reportsPage}
                  totalPages={reportsTotalPages}
                  onPageChange={setReportsPage}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ESCALATED ACCIDENT REPORTS */}
      {activeTab === 'accidents' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-on-surface">Escalated Workplace Accidents Register</h2>
              <p className="text-xs text-on-surface-variant">
                Read-only archive of verified student workplace accidents submitted by organizations and escalated by academic institutions.
              </p>
            </div>
            {unreadAccidentsCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAccidentsRead}
                className="self-start sm:self-auto px-3 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">done_all</span>
                <span>Mark All as Read ({unreadAccidentsCount})</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-12">
              <LoadingSpinner message="Fetching escalated accidents..." />
            </div>
          ) : data.escalatedAccidents.length === 0 ? (
            <div className="bento-card py-12 text-center space-y-2">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">health_and_safety</span>
              <p className="text-sm font-bold text-on-surface">No Escalated Accidents on Record</p>
              <p className="text-xs text-on-surface-variant">
                No formal workplace accident reports have been escalated to System Administration.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedAccidents.map((acc) => {
                  const isCritical = acc.severity === 'critical' || acc.severity === 'severe';

                return (
                  <div
                    key={acc.accident_id}
                    className={`bento-card border transition-all p-5 space-y-3 ${
                      acc.is_read
                        ? 'border-outline-variant/50 opacity-90'
                        : 'border-amber-400/80 bg-amber-500/[0.02] shadow-sm ring-1 ring-amber-400/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-outline-variant/40 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              acc.severity === 'critical' || acc.severity === 'fatal'
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : acc.severity === 'severe'
                                ? 'bg-orange-100 text-orange-800 border border-orange-300'
                                : acc.severity === 'moderate'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}
                          >
                            Severity: {acc.severity}
                          </span>
                          {acc.is_read ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">done_all</span>
                              Read
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping"></span>
                              Unread
                            </span>
                          )}
                          <span className="text-[11px] text-on-surface-variant">
                            {new Date(acc.accident_date || acc.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-on-surface mt-1.5">{acc.subject || 'Workplace Incident'}</h4>
                      </div>

                      <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                        <span className="material-symbols-outlined text-[20px]">
                          {isCritical ? 'emergency' : 'medical_services'}
                        </span>
                      </div>
                    </div>

                    {/* Intern & Org Info */}
                    <div className="space-y-1 text-xs bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/30">
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Affected Intern:</span>
                        <span className="font-bold text-on-surface">
                          {acc.first_name} {acc.last_name} ({acc.student_number || 'N/A'})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Institution:</span>
                        <span className="font-medium text-on-surface">{acc.institution_name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Organization:</span>
                        <span className="font-medium text-on-surface">{acc.organization_name}</span>
                      </div>
                    </div>

                    {/* Location & Injuries */}
                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="font-bold text-on-surface-variant text-[10px] uppercase">Incident Location:</span>
                        <p className="text-on-surface text-xs">{acc.location || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="font-bold text-on-surface-variant text-[10px] uppercase">Injuries Reported:</span>
                        <p className="text-on-surface text-xs line-clamp-2">{acc.injuries_sustained || 'None reported'}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleToggleAccidentRead(acc.accident_id, !!acc.is_read)}
                        className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                          acc.is_read
                            ? 'text-on-surface-variant hover:bg-surface-container-high border border-outline-variant/40'
                            : 'text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800 shadow-sm'
                        }`}
                        title={acc.is_read ? 'Mark as Unread' : 'Mark as Read'}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {acc.is_read ? 'mark_chat_unread' : 'mark_chat_read'}
                        </span>
                        <span>{acc.is_read ? 'Mark Unread' : 'Mark as Read'}</span>
                      </button>

                      <button
                        onClick={() => setViewingAccident(acc)}
                        className="px-3 py-1.5 text-xs font-bold text-vibrant-orange hover:bg-orange-tint rounded-lg transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">info</span>
                        <span>Full Accident Dossier</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
              
              {data.escalatedAccidents.length > 0 && (
                <Pagination 
                  currentPage={accidentsPage}
                  totalPages={accidentsTotalPages}
                  onPageChange={setAccidentsPage}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SANCTIONS REGISTER */}
      {activeTab === 'sanctions' && (
        <div className="space-y-6">
          {/* Active Warnings Section */}
          <div className="bento-card space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-[22px]">warning</span>
                <h3 className="text-base font-bold text-on-surface">Official Administrative Warnings</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200">
                {data.warnings.length} Active
              </span>
            </div>

            {data.warnings.length === 0 ? (
              <p className="text-xs text-on-surface-variant py-4 text-center">No official warnings on record.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-outline-variant/50 text-on-surface-variant text-[11px] uppercase whitespace-nowrap">
                      <th className="py-2.5 px-3">Organization</th>
                      <th className="py-2.5 px-3">Reason / Justification</th>
                      <th className="py-2.5 px-3">Issued By</th>
                      <th className="py-2.5 px-3">Date Issued</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {paginatedWarnings.map((w) => (
                      <tr key={w.warning_id} className="hover:bg-surface-container-low transition-colors">
                        <td className="py-3 px-3 font-bold text-on-surface">{w.organization_name}</td>
                        <td className="py-3 px-3 text-on-surface-variant max-w-md">{w.reason}</td>
                        <td className="py-3 px-3 font-mono text-on-surface-variant">{w.issued_by_email || 'Admin'}</td>
                        <td className="py-3 px-3 text-on-surface-variant whitespace-nowrap">
                          {new Date(w.issued_at || w.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {data.warnings.length > 0 && (
              <div className="mt-4">
                <Pagination 
                  currentPage={warningsPage}
                  totalPages={warningsTotalPages}
                  onPageChange={setWarningsPage}
                />
              </div>
            )}
          </div>

          {/* Account Suspensions Section */}
          <div className="bento-card space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-600 text-[22px]">block</span>
                <h3 className="text-base font-bold text-on-surface">Account Suspensions</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-50 text-rose-800 border border-rose-200">
                {activeSuspensionsCount} Currently Suspended
              </span>
            </div>

            {data.suspensions.length === 0 ? (
              <p className="text-xs text-on-surface-variant py-4 text-center">No account suspensions on record.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-outline-variant/50 text-on-surface-variant text-[11px] uppercase whitespace-nowrap">
                      <th className="py-2.5 px-3">Organization</th>
                      <th className="py-2.5 px-3">Duration & Dates</th>
                      <th className="py-2.5 px-3">Reason</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {paginatedSuspensions.map((s) => (
                      <tr key={s.suspension_id} className="hover:bg-surface-container-low transition-colors">
                        <td className="py-3 px-3 font-bold text-on-surface">{s.organization_name}</td>
                        <td className="py-3 px-3 text-on-surface-variant">
                          <p className="font-medium text-on-surface">
                            {new Date(s.start_date).toLocaleDateString()} &rarr; {new Date(s.end_date).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="py-3 px-3 text-on-surface-variant max-w-md">{s.reason}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              s.is_active
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-surface-container-high text-on-surface-variant'
                            }`}
                          >
                            {s.is_active ? 'Active Suspension' : 'Lapsed / Restored'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {data.suspensions.length > 0 && (
              <div className="mt-4">
                <Pagination 
                  currentPage={suspensionsPage}
                  totalPages={suspensionsTotalPages}
                  onPageChange={setSuspensionsPage}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: RESOLVE INSTITUTION REPORT & ENFORCE REPEAT-OFFENSE POLICY */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-xl w-full rounded-2xl p-6 border border-outline-variant shadow-2xl space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-outline-variant pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-vibrant-orange">
                  Administrative Resolution
                </span>
                <h3 className="text-base font-bold text-on-surface mt-0.5">
                  Action on Report: {selectedReport.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2 border border-rose-200">
                <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Repeat Offense Policy Banner */}
            {selectedReport.institution_org_report_count >= 2 ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-600 text-[20px]">gavel</span>
                  <p className="text-xs font-black uppercase tracking-wider text-rose-700">
                    Repeat-Offense Threshold Met ({selectedReport.institution_org_report_count} Reports on File)
                  </p>
                </div>
                <p className="text-xs text-rose-800/90 leading-relaxed">
                  {selectedReport.institution_name} has submitted <strong>{selectedReport.institution_org_report_count} formal reports</strong> against{' '}
                  <strong>{selectedReport.organization_name}</strong>. Under platform governance bylaws, administrative sanctions (Formal Warning or Account Suspension) are authorized.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-[20px]">info</span>
                  <p className="text-xs font-black uppercase tracking-wider text-amber-700">
                    First-Time Report Governance Guardrail
                  </p>
                </div>
                <p className="text-xs text-amber-800/90 leading-relaxed">
                  This is the <strong>1st report</strong> submitted by {selectedReport.institution_name} against{' '}
                  {selectedReport.organization_name}. Platform bylaws require at least <strong>2 substantiated reports</strong> before punitive administrative sanctions (Warning or Suspension) can be legally imposed. This report will be logged and monitored.
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleResolveReport} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
                  Resolution Decision
                </label>
                <select
                  value={resolutionStatus}
                  onChange={(e) => setResolutionStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low font-bold text-xs text-on-surface outline-none focus:border-vibrant-orange"
                >
                  <option value="resolved">Conclude & Log Action Taken (Uphold Findings)</option>
                  <option value="dismissed">Dismiss Case (Insufficient Evidence / Closed)</option>
                </select>
              </div>

              {resolutionStatus === 'resolved' && (
                <div>
                  <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
                    Administrative Sanction on {selectedReport.organization_name}
                  </label>
                  <select
                    value={sanctionType}
                    onChange={(e) => setSanctionType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low font-bold text-xs text-on-surface outline-none focus:border-vibrant-orange"
                  >
                    <option value="none">
                      No Administrative Sanction (Log Findings & Keep Under Monitoring)
                    </option>
                    <option
                      value="warning"
                      disabled={selectedReport.institution_org_report_count < 2}
                    >
                      Issue Formal Written Warning to Organization{' '}
                      {selectedReport.institution_org_report_count < 2 ? '(Requires 2+ Reports)' : '— Authorized'}
                    </option>
                    <option
                      value="suspension"
                      disabled={selectedReport.institution_org_report_count < 2}
                    >
                      Temporary Account Suspension{' '}
                      {selectedReport.institution_org_report_count < 2 ? '(Requires 2+ Reports)' : '— Authorized'}
                    </option>
                  </select>
                  {selectedReport.institution_org_report_count < 2 && (
                    <p className="text-[11px] text-amber-700 mt-1 font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">lock</span>
                      Sanction options disabled: minimum of 2 reports from this institution required.
                    </p>
                  )}
                </div>
              )}

              {sanctionType === 'suspension' && (
                <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/60 space-y-2">
                  <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">
                    Suspension Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={sanctionDays}
                    onChange={(e) => setSanctionDays(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-white outline-none focus:border-vibrant-orange"
                  />
                  <p className="text-[11px] text-on-surface-variant">
                    Organization account status will be set to &lsquo;suspended&rsquo; and all active listings temporarily hidden for {sanctionDays} days.
                  </p>
                </div>
              )}

              <div>
                <label className="block font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-1">
                  Administrative Ruling & Findings Summary <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows="4"
                  required
                  placeholder="Detail the rationale, university evidence considered, and directives issued to the organization..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low outline-none focus:border-vibrant-orange text-xs text-on-surface"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  disabled={submitting}
                  className="px-4 py-2 bg-surface-container text-on-surface rounded-xl font-bold hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-vibrant-orange text-white rounded-xl font-bold hover:bg-deep-orange transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                      <span>Enforcing...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      <span>Confirm Resolution</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: FULL DOSSIER VIEWER */}
      {viewingReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full rounded-2xl p-6 border border-outline-variant shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-outline-variant pb-3">
              <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-surface-container-high text-on-surface">
                  {viewingReport.category_name}
                </span>
                <h3 className="text-base font-bold text-on-surface mt-1">{viewingReport.title}</h3>
                <p className="text-xs text-on-surface-variant">Report #{viewingReport.report_id}</p>
              </div>
              <button
                onClick={() => setViewingReport(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30">
              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">Reporting University</span>
                <p className="font-bold text-on-surface">{viewingReport.institution_name}</p>
                <p className="text-[11px] text-on-surface-variant">{viewingReport.reporter_email}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">Target Organization</span>
                <p className="font-bold text-on-surface">{viewingReport.organization_name}</p>
                <p className="text-[11px] text-on-surface-variant">{viewingReport.org_email}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <h4 className="font-bold text-on-surface text-[11px] uppercase tracking-wider">
                  Detailed Findings & Evidence
                </h4>
                <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/20 mt-1 whitespace-pre-wrap text-on-surface leading-relaxed">
                  {viewingReport.description}
                </div>
              </div>

              {viewingReport.recommendations && (
                <div>
                  <h4 className="font-bold text-on-surface text-[11px] uppercase tracking-wider">
                    University Recommendations
                  </h4>
                  <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/20 mt-1 text-on-surface leading-relaxed">
                    {viewingReport.recommendations}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-outline-variant">
              <button
                onClick={() => setViewingReport(null)}
                className="px-4 py-2 bg-surface-container text-on-surface rounded-xl text-xs font-bold"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ACCIDENT REPORT DETAIL VIEWER */}
      {viewingAccident && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-xl w-full rounded-2xl p-6 border border-outline-variant shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-outline-variant pb-3">
              <div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    viewingAccident.severity === 'critical' || viewingAccident.severity === 'severe' || viewingAccident.severity === 'fatal'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Severity: {viewingAccident.severity}
                </span>
                <h3 className="text-base font-bold text-on-surface mt-1">
                  {viewingAccident.subject || 'Workplace Accident Incident'}
                </h3>
              </div>
              <button
                onClick={() => setViewingAccident(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30 space-y-1">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Student:</span>
                  <span className="font-bold text-on-surface">
                    {viewingAccident.first_name} {viewingAccident.last_name} ({viewingAccident.student_number || 'N/A'})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Institution:</span>
                  <span className="font-medium text-on-surface">{viewingAccident.institution_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Organization:</span>
                  <span className="font-medium text-on-surface">{viewingAccident.organization_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Date & Time:</span>
                  <span className="font-medium text-on-surface">
                    {viewingAccident.accident_date ? new Date(viewingAccident.accident_date).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Location:</span>
                  <span className="font-medium text-on-surface">{viewingAccident.location || 'N/A'}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-on-surface-variant text-[10px] uppercase">Injuries Sustained:</span>
                <p className="bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/20 mt-1">
                  {viewingAccident.injuries_sustained || 'None specified'}
                </p>
              </div>

              <div>
                <span className="font-bold text-on-surface-variant text-[10px] uppercase">Medical Attention Provided:</span>
                <p className="bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/20 mt-1">
                  {viewingAccident.medical_attention || 'None specified'}
                </p>
              </div>

              <div>
                <span className="font-bold text-on-surface-variant text-[10px] uppercase">Witnesses:</span>
                <p className="bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/20 mt-1">
                  {viewingAccident.witnesses || 'None specified'}
                </p>
              </div>

              <div>
                <span className="font-bold text-on-surface-variant text-[10px] uppercase">Emergency Actions Taken:</span>
                <p className="bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/20 mt-1">
                  {viewingAccident.actions_taken || 'None specified'}
                </p>
              </div>

              <div>
                <span className="font-bold text-on-surface-variant text-[10px] uppercase">Preventive Measures Implemented:</span>
                <p className="bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/20 mt-1">
                  {viewingAccident.preventive_measures || 'None specified'}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => handleToggleAccidentRead(viewingAccident.accident_id, !!viewingAccident.is_read)}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm ${
                  viewingAccident.is_read
                    ? 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/40'
                    : 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-400/20'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {viewingAccident.is_read ? 'mark_chat_unread' : 'mark_chat_read'}
                </span>
                <span>{viewingAccident.is_read ? 'Mark as Unread' : 'Mark as Read'}</span>
              </button>
              <button
                onClick={() => setViewingAccident(null)}
                className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl text-xs font-bold transition-colors"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
