import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import api from '../../api/client';
import { resolveFileUrl, formatFileSize, getFileIcon, isImageFile, isPdfFile } from '../../utils/fileHelper';
import { DashboardSkeleton } from '../../components/ui/Skeleton';

const OJT_STATUS_STYLES = {
  ongoing:     'bg-green-100 text-green-700',
  completed:   'bg-blue-100 text-blue-700',
  graduated:   'bg-purple-100 text-purple-700',
  pending:     'bg-amber-100 text-amber-700',
  not_started: 'bg-surface-container text-on-surface-variant',
  default:     'bg-surface-container text-on-surface-variant'
};

function ojtBadge(status) {
  const key = (status || 'default').toLowerCase();
  const cls = OJT_STATUS_STYLES[key] || OJT_STATUS_STYLES.default;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${cls}`}>
      {(status || 'N/A').replace(/_/g, ' ')}
    </span>
  );
}

// ── Student Detail Drawer ─────────────────────────────────────────────────────
function StudentDetailDrawer({ studentId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewItem, setPreviewItem] = useState(null);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    api.get(`/inst/students/${studentId}/profile`)
      .then(res => { if (res.success) setProfile(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [studentId]);

  const stu = profile?.student;
  const port = profile?.portfolio;
  const reg  = profile?.registration;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant bg-surface-container-low flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-on-surface">
              {stu ? `${stu.first_name} ${stu.last_name}` : 'Student Profile'}
            </h2>
            {stu && (
              <p className="text-xs text-on-surface-variant">
                {stu.student_number} · {stu.program_name || 'N/A'}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex justify-center pt-20">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-vibrant-orange border-t-transparent" />
            </div>
          ) : !stu ? (
            <p className="text-sm text-center text-on-surface-variant pt-20">Could not load student profile.</p>
          ) : (
            <>
              {/* Personal Info */}
              <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant space-y-3">
                <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-vibrant-orange text-[18px]">person</span>
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div><p className="text-on-surface-variant font-bold uppercase text-[10px]">Email</p><p className="text-on-surface break-all">{stu.email}</p></div>
                  <div><p className="text-on-surface-variant font-bold uppercase text-[10px]">Contact</p><p className="text-on-surface">{stu.contact_number || '—'}</p></div>
                  <div><p className="text-on-surface-variant font-bold uppercase text-[10px]">Year Level</p><p className="text-on-surface">{stu.year_level || '—'}</p></div>
                  <div><p className="text-on-surface-variant font-bold uppercase text-[10px]">Classification</p><p className="text-on-surface capitalize">{stu.classification || '—'}</p></div>
                  <div><p className="text-on-surface-variant font-bold uppercase text-[10px]">OJT Status</p>{ojtBadge(stu.ojt_status)}</div>
                  <div><p className="text-on-surface-variant font-bold uppercase text-[10px]">Verification</p>
                    {reg ? (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        reg.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>{reg.status}</span>
                    ) : <span className="text-on-surface-variant">No record</span>}
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <p className="text-on-surface-variant font-bold uppercase text-[10px]">OJT Hours</p>
                    <p className="text-on-surface">
                      {stu.completed_ojt_hours || 0} / {stu.required_ojt_hours || stu.prog_required_hours || 600} hrs rendered
                    </p>
                  </div>
                </div>
              </div>

              {/* Digital Career Portfolio */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-vibrant-orange text-[18px]">work_history</span>
                  Digital Career Portfolio &amp; Credentials
                </h3>

                {/* Academic Portfolio */}
                {port?.academic_portfolio?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-blue-600 uppercase">Academic Portfolio ({port.academic_portfolio.length})</p>
                    <div className="space-y-1.5">
                      {port.academic_portfolio.map(item => {
                        const fileUrl = resolveFileUrl(item.file_path);
                        const isImg = isImageFile(item.file_name, item.file_path);
                        return (
                          <div key={item.item_id} className="flex items-center justify-between p-2.5 bg-blue-50/60 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {isImg && fileUrl ? (
                                <img
                                  src={fileUrl}
                                  alt={item.title}
                                  className="w-8 h-8 rounded-lg object-cover border border-blue-200 shrink-0 cursor-pointer hover:opacity-80"
                                  loading="lazy"
                                  decoding="async"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                  onClick={() => setPreviewItem(item)}
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                  <span className="material-symbols-outlined text-[18px]">{getFileIcon(item.file_name)}</span>
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-on-surface line-clamp-1">{item.title}</p>
                                {item.file_name && <p className="text-[10px] text-on-surface-variant">📎 {item.file_name}</p>}
                              </div>
                            </div>
                            {item.file_path && (
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                <button onClick={() => setPreviewItem(item)}
                                  className="px-2 py-1 bg-blue-100 text-blue-600 rounded-lg text-[11px] font-bold hover:bg-blue-200 transition-colors flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[13px]">open_in_new</span> View
                                </button>
                                <a
                                  href={fileUrl}
                                  download={item.file_name || true}
                                  className="p-1 text-on-surface-variant hover:text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                  title="Download File"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <span className="material-symbols-outlined text-[15px]">download</span>
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Credentials */}
                {port?.credentials?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-amber-600 uppercase">Credentials &amp; Certificates ({port.credentials.length})</p>
                    <div className="space-y-1.5">
                      {port.credentials.map(item => {
                        const fileUrl = resolveFileUrl(item.file_path);
                        const isImg = isImageFile(item.file_name, item.file_path);
                        return (
                          <div key={item.item_id} className="flex items-center justify-between p-2.5 bg-amber-50/60 rounded-xl border border-amber-100">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {isImg && fileUrl ? (
                                <img
                                  src={fileUrl}
                                  alt={item.title}
                                  className="w-8 h-8 rounded-lg object-cover border border-amber-200 shrink-0 cursor-pointer hover:opacity-80"
                                  loading="lazy"
                                  decoding="async"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                  onClick={() => setPreviewItem(item)}
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                  <span className="material-symbols-outlined text-[18px]">{getFileIcon(item.file_name)}</span>
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-on-surface line-clamp-1">{item.title}</p>
                                {item.file_name && <p className="text-[10px] text-on-surface-variant">📎 {item.file_name}</p>}
                              </div>
                            </div>
                            {item.file_path && (
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                <button onClick={() => setPreviewItem(item)}
                                  className="px-2 py-1 bg-amber-100 text-amber-600 rounded-lg text-[11px] font-bold hover:bg-amber-200 transition-colors flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[13px]">open_in_new</span> View
                                </button>
                                <a
                                  href={fileUrl}
                                  download={item.file_name || true}
                                  className="p-1 text-on-surface-variant hover:text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
                                  title="Download File"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <span className="material-symbols-outlined text-[15px]">download</span>
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Academic Records */}
                {port?.academic_records?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-emerald-600 uppercase">Academic Records ({port.academic_records.length})</p>
                    <div className="space-y-1.5">
                      {port.academic_records.map(item => {
                        const fileUrl = resolveFileUrl(item.file_path);
                        const isImg = isImageFile(item.file_name, item.file_path);
                        return (
                          <div key={item.item_id} className="flex items-center justify-between p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {isImg && fileUrl ? (
                                <img
                                  src={fileUrl}
                                  alt={item.title}
                                  className="w-8 h-8 rounded-lg object-cover border border-emerald-200 shrink-0 cursor-pointer hover:opacity-80"
                                  loading="lazy"
                                  decoding="async"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                  onClick={() => setPreviewItem(item)}
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                  <span className="material-symbols-outlined text-[18px]">{getFileIcon(item.file_name)}</span>
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-on-surface line-clamp-1">{item.title}</p>
                                {item.file_name && <p className="text-[10px] text-on-surface-variant">📎 {item.file_name}</p>}
                              </div>
                            </div>
                            {item.file_path && (
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                <button onClick={() => setPreviewItem(item)}
                                  className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-[11px] font-bold hover:bg-emerald-200 transition-colors flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[13px]">open_in_new</span> View
                                </button>
                                <a
                                  href={fileUrl}
                                  download={item.file_name || true}
                                  className="p-1 text-on-surface-variant hover:text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                  title="Download File"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <span className="material-symbols-outlined text-[15px]">download</span>
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Resume */}
                {port?.resumes?.length > 0 && port.resumes[0].file_path && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-purple-600 uppercase">Active Resume</p>
                    <div className="flex items-center justify-between p-2.5 bg-purple-50/60 rounded-xl border border-purple-100">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-purple-500 text-[18px]">description</span>
                        <div>
                          <p className="font-bold text-xs text-on-surface">{port.resumes[0].file_name || 'Resume'}</p>
                          <p className="text-[10px] text-on-surface-variant">Version {port.resumes[0].version}{port.resumes[0].file_size ? ` · ${formatFileSize(port.resumes[0].file_size)}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        <button onClick={() => setPreviewItem({ ...port.resumes[0], title: port.resumes[0].file_name || 'Resume' })}
                          className="px-2 py-1 bg-purple-100 text-purple-600 rounded-lg text-[11px] font-bold hover:bg-purple-200 transition-colors flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">open_in_new</span> View
                        </button>
                        <a href={resolveFileUrl(port.resumes[0].file_path)} download={port.resumes[0].file_name || true}
                          className="px-2 py-1 bg-purple-600 text-white rounded-lg text-[11px] font-bold hover:bg-purple-700 transition-colors flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">download</span>
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {!port?.academic_portfolio?.length && !port?.credentials?.length && !port?.academic_records?.length && !port?.resumes?.length && (
                  <p className="text-xs text-on-surface-variant italic p-3 bg-surface-container-low rounded-xl border border-outline-variant">
                    No portfolio items uploaded yet.
                  </p>
                )}
              </div>

              {/* Graduated: OJT Background */}
              {port?.is_graduated && port?.ojt_background?.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-outline-variant">
                  <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-pinoy-green text-[18px]">verified</span>
                    OJT Background
                    <span className="text-[10px] bg-green-100 text-pinoy-green px-2 py-0.5 rounded-full font-bold">Graduated</span>
                  </h3>
                  <div className="space-y-2">
                    {port.ojt_background.map((ojt, i) => (
                      <div key={ojt.ojt_id || i} className="p-3 bg-green-50/60 rounded-xl border border-green-100 space-y-1">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-xs text-on-surface">{ojt.organization_name}</p>
                          {ojtBadge(ojt.status)}
                        </div>
                        <p className="text-[11px] text-on-surface-variant">{ojt.industry}{ojt.org_address ? ` · ${ojt.org_address}` : ''}</p>
                        <p className="text-[11px] text-on-surface-variant">
                          {ojt.rendered_hours || 0} / {ojt.required_hours || 0} hrs
                          {ojt.mentor_first_name && ` · Mentor: ${ojt.mentor_first_name} ${ojt.mentor_last_name || ''}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Graduated: Mentor Evaluations */}
              {port?.is_graduated && port?.mentor_evaluations?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-vibrant-orange text-[18px]">rate_review</span>
                    Mentor Evaluations
                  </h3>
                  <div className="space-y-2">
                    {port.mentor_evaluations.map((ev, i) => (
                      <div key={i} className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs text-on-surface">{ev.organization_name}</span>
                          <span className="text-xs font-bold text-amber-600">⭐ {ev.rating} / 5.0</span>
                        </div>
                        <p className="text-xs text-on-surface-variant italic">"{ev.comments || 'No written comments.'}"</p>
                        <p className="text-[10px] text-on-surface-variant">
                          Evaluator: {ev.evaluator_first_name ? `${ev.evaluator_first_name} ${ev.evaluator_last_name || ''}` : 'Workplace Mentor'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* File preview modal */}
      {previewItem && (() => {
        const fp  = resolveFileUrl(previewItem.file_path || '');
        const fn  = previewItem.file_name || previewItem.title || '';
        const isImg = isImageFile(fn, fp);
        const isPdf = isPdfFile(fn, fp);
        const isCert = previewItem.item_type === 'certificate' || fp.includes('/api/certificates/') || fp.includes('certificate:');
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={() => setPreviewItem(null)}>
            <div className="bg-white dark:bg-surface rounded-2xl max-w-4xl w-full p-4 space-y-3 border border-outline-variant shadow-2xl max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-on-surface">{previewItem.title || previewItem.file_name}</h3>
                  {previewItem.file_name && <p className="text-[11px] text-on-surface-variant">📎 {previewItem.file_name}{previewItem.file_size ? ` · ${formatFileSize(previewItem.file_size)}` : ''}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {fp && (
                    <a href={fp}
                      target={isCert ? "_blank" : undefined}
                      rel={isCert ? "noopener noreferrer" : undefined}
                      download={isCert ? undefined : (previewItem.file_name || true)}
                      className="px-3 py-1.5 bg-vibrant-orange text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-deep-orange transition-colors">
                      <span className="material-symbols-outlined text-[14px]">{isCert ? 'open_in_new' : 'download'}</span> {isCert ? 'Print / Fullscreen' : 'Download'}
                    </a>
                  )}
                  <button onClick={() => setPreviewItem(null)} className="p-1.5 text-on-surface-variant hover:text-error transition-colors rounded-lg hover:bg-red-50">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>
              <div className="rounded-xl overflow-hidden border border-outline-variant bg-surface-container-low">
                {isCert && fp ? (
                  <iframe src={fp} title={previewItem.title} className="w-full h-[75vh] border-0 rounded-xl" />
                ) : isImg && fp ? (
                  <img src={fp} alt={previewItem.title} loading="lazy" decoding="async" className="w-full max-h-[70vh] object-contain" />
                ) : isPdf && fp ? (
                  <iframe src={fp} title={previewItem.title} className="w-full h-[70vh] border-0" />
                ) : fp ? (
                  <div className="p-8 text-center space-y-3">
                    <span className="material-symbols-outlined text-[56px] text-on-surface-variant opacity-40">{getFileIcon(previewItem.file_name)}</span>
                    <p className="text-sm font-bold text-on-surface">Preview not available</p>
                    <a href={fp} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-vibrant-orange text-white rounded-lg text-xs font-bold hover:bg-deep-orange transition-colors">
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span> Open in New Tab
                    </a>
                  </div>
                ) : (
                  <div className="p-8 text-center"><p className="text-sm text-on-surface-variant">No file attached.</p></div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function InstitutionDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Student directory local state
  const [stuSearch, setStuSearch] = useState('');
  const [stuProgram, setStuProgram] = useState('');
  const [stuOjt, setStuOjt] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/inst/dashboard');
      if (res.success && res.data) setData(res.data);
    } catch (err) {
      console.error('Failed to load institution dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useRealtimeRefresh(fetchDashboard);

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  const stats = data?.metrics || data?.stats || {};

  // ── Student Directory filtering (client-side) ──
  const rawStudents = data?.studentDirectory || [];
  const filteredStudents = rawStudents.filter(s => {
    const q = stuSearch.toLowerCase();
    const matchesSearch = !q || [s.first_name, s.last_name, s.student_number, s.email, s.program_name].some(
      v => (v || '').toLowerCase().includes(q)
    );
    const matchesProgram = !stuProgram || String(s.program_id) === stuProgram;
    const matchesOjt = !stuOjt || (s.ojt_status || 'not_started').toLowerCase() === stuOjt.toLowerCase();
    return matchesSearch && matchesProgram && matchesOjt;
  });

  const isStaff = data?.is_staff;
  const staffAssignment = data?.staff_assignment;
  const programsList = data?.programsList || [];

  return (
    <div className="p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Pending Dispatched Opportunities Alert Banner */}
      {(stats.pendingOffersCount || 0) > 0 && (
        <div className="p-4 bg-orange-tint/70 border border-vibrant-orange/40 rounded-2xl flex items-center justify-between flex-wrap gap-3 animate-fade-in shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-vibrant-orange text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">approval</span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                <span>Action Required: {stats.pendingOffersCount} Employer Opportunit{(stats.pendingOffersCount || 0) > 1 ? 'ies' : 'y'} Awaiting Endorsement</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-600 text-white font-bold animate-pulse">Review</span>
              </h3>
              <p className="text-xs text-on-surface-variant">Partner companies have dispatched OJT/Career opportunities for your students. Review and approve them so students can apply.</p>
            </div>
          </div>
          <Link to="/dashboard/institution/ojt-offers"
            className="px-4 py-2 bg-vibrant-orange text-white rounded-lg text-xs font-bold hover:bg-deep-orange transition-colors flex items-center gap-1.5 shadow-sm">
            <span>Review Opportunities</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      )}

      {/* Pending Staff Verification Alert Banner */}
      {!isStaff && (stats.pendingStaffCount || 0) > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/40 rounded-2xl flex items-center justify-between flex-wrap gap-3 animate-fade-in shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[22px]">badge</span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                <span>Action Required: {stats.pendingStaffCount} Staff Registration{(stats.pendingStaffCount || 0) > 1 ? 's' : ''} Awaiting Director Verification</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-600 text-white font-bold animate-pulse">Pending Review</span>
              </h3>
              <p className="text-xs text-on-surface-variant">New faculty or coordinator accounts registered using Director passcodes and are waiting for your approval before accessing departmental tools.</p>
            </div>
          </div>
          <Link to="/dashboard/institution/staff"
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors flex items-center gap-1.5 shadow-sm">
            <span>Verify Staff ({stats.pendingStaffCount})</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      )}

      {/* Banner */}
      <div className="bento-card flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-on-surface">
              {isStaff
                ? `${staffAssignment?.first_name || ''} ${staffAssignment?.last_name || ''} — Staff Dashboard 🎓`
                : `${data?.institution?.institution_name || user?.full_name || 'Partner University'} 🏛️`}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-emerald-600 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            {isStaff
              ? `Assigned Program: ${staffAssignment?.program_name || 'All Programs'} (${staffAssignment?.program_code || '—'}) · ${staffAssignment?.department || ''}`
              : 'Manage your student cohort, verify registration requests, and monitor host company placements in real time.'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-3.5 py-1 bg-green-tint text-pinoy-green rounded-full text-xs font-bold">
            {isStaff ? 'Program Staff' : 'Accredited Partner'}
          </span>
          {!isStaff && (
            <Link to="/dashboard/institution/ojt-offers"
              className="px-4 py-2 bg-surface-container text-on-surface hover:bg-surface-container-high rounded-lg text-xs font-bold transition-colors border border-outline-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">work</span>
              <span>Opportunities ({stats.pendingOffersCount || 0})</span>
            </Link>
          )}
          {!isStaff && (
            <Link to="/dashboard/institution/staff"
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors border flex items-center gap-1.5 ${
                (stats.pendingStaffCount || 0) > 0
                  ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 shadow-xs'
                  : 'bg-surface-container text-on-surface hover:bg-surface-container-high border-outline-variant'
              }`}>
              <span className="material-symbols-outlined text-[16px]">badge</span>
              <span>Verify Staff {(stats.pendingStaffCount || 0) > 0 ? `(${stats.pendingStaffCount})` : ''}</span>
              {(stats.pendingStaffCount || 0) > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              )}
            </Link>
          )}
          <Link to="/dashboard/institution/students"
            className="px-4 py-2 bg-vibrant-orange text-white rounded-lg text-xs font-bold hover:bg-deep-orange transition-colors shadow-sm flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
            <span>Verify Students ({stats.pendingCount || 0})</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bento-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-tint text-vibrant-orange flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]">school</span>
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              {isStaff ? 'Program Students' : 'Enrolled Students'}
            </p>
            <p className="text-2xl font-bold text-on-surface">{rawStudents.length || stats.totalStudents || 0}</p>
          </div>
        </div>

        <div className="bento-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-error-container text-error flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]">pending_actions</span>
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Pending Students</p>
            <p className="text-2xl font-bold text-error">{stats.pendingCount || 0}</p>
          </div>
        </div>

        <div className="bento-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-green-tint text-pinoy-green flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]">timelapse</span>
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Active Deployments</p>
            <p className="text-2xl font-bold text-pinoy-green">{stats.deployedStudents || 0}</p>
          </div>
        </div>

        <div className="bento-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]">apartment</span>
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Partner Employers</p>
            <p className="text-2xl font-bold text-on-surface">{stats.partnerOrgs || 0}</p>
          </div>
        </div>
      </div>

      {/* Grid: Pending Students & Recent Deployments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Student Registrations */}
        <div className="bento-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-4">
            <h2 className="font-bold text-lg text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-vibrant-orange">pending_actions</span>
              Pending Student Verifications
            </h2>
            <Link to="/dashboard/institution/students" className="text-xs font-bold text-vibrant-orange hover:underline">
              View All ({stats.pendingCount || 0})
            </Link>
          </div>

          {!data?.recentPending || data.recentPending.length === 0 ? (
            <div className="py-8 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">check_circle</span>
              <p className="text-sm">No pending student registrations at this time.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentPending.map((stu) => (
                <div key={stu.registration_id}
                  className="p-3 bg-surface-container-low rounded-xl border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="overflow-hidden">
                    <p className="font-bold text-sm text-on-surface truncate">{stu.first_name} {stu.last_name}</p>
                    <p className="text-xs text-on-surface-variant truncate">ID: {stu.student_number} · {stu.program_code || 'General'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-700 text-[10px] font-bold rounded-md">{stu.classification || 'Regular'}</span>
                    <Link to="/dashboard/institution/students"
                      className="px-2.5 py-1 bg-vibrant-orange text-white text-xs font-bold rounded-lg hover:bg-deep-orange transition-colors">
                      Review
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Deployments */}
        <div className="bento-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-4">
            <h2 className="font-bold text-lg text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-pinoy-green">apartment</span>
              Active OJT Placements
            </h2>
            <Link to="/dashboard/institution/monitoring" className="text-xs font-bold text-vibrant-orange hover:underline">
              Monitor All ({stats.deployedStudents || 0})
            </Link>
          </div>

          {!data?.recentDeployments || data.recentDeployments.length === 0 ? (
            <div className="py-8 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">work_off</span>
              <p className="text-sm">No active OJT placements currently recorded.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentDeployments.map((dep) => (
                <div key={dep.ojt_id}
                  className="p-3 bg-surface-container-low rounded-xl border border-outline-variant flex items-center justify-between gap-3">
                  <div className="overflow-hidden">
                    <p className="font-bold text-sm text-on-surface truncate">{dep.first_name} {dep.last_name}</p>
                    <p className="text-xs text-on-surface-variant truncate">{dep.organization_name} · {dep.program_name || 'Program'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-pinoy-green block">{dep.rendered_hours || 0} / {dep.required_hours || 600} hrs</span>
                    <span className="text-[10px] text-on-surface-variant block">Rendered</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dispatched Opportunities */}
      {!isStaff && (
        <div className="bento-card space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-vibrant-orange">work</span>
                  Employer Opportunities Dispatched to Institution
                </h2>
                {data?.pendingOffers?.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-tint text-vibrant-orange">
                    {data.pendingOffers.length} pending review
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant">
                Vacancies submitted by partner employers awaiting your academic endorsement so students can begin applying.
              </p>
            </div>
            <Link to="/dashboard/institution/ojt-offers"
              className="text-xs font-bold text-vibrant-orange hover:underline flex items-center gap-1">
              <span>Inspect All Opportunities</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

          {!data?.pendingOffers || data.pendingOffers.length === 0 ? (
            <div className="py-8 text-center text-on-surface-variant bg-slate-50 rounded-xl border border-slate-200">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">task_alt</span>
              <p className="text-sm font-bold text-on-surface">No Pending Opportunity Approvals</p>
              <p className="text-xs text-on-surface-variant mt-0.5">All opportunities dispatched to your institution have been reviewed and processed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.pendingOffers.map((offer) => (
                <div key={offer.approval_id}
                  className="p-4 bg-surface-container-low rounded-xl border border-outline-variant flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase">Pending Approval</span>
                      <span className="text-[10px] text-on-surface-variant capitalize">{offer.work_setup || 'Hybrid'} · {offer.slots_available || 1} slot(s)</span>
                    </div>
                    <h3 className="font-bold text-sm text-on-surface line-clamp-1">{offer.title}</h3>
                    <p className="text-xs font-medium text-vibrant-orange">{offer.organization_name}</p>
                    <p className="text-[11px] text-on-surface-variant flex items-center gap-1.5 flex-wrap">
                      <span>{offer.location || 'On-site / Hybrid'}</span>
                      {offer.workplace_area && (
                        <>
                          <span>•</span>
                          <span className="text-on-surface font-semibold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[12px] text-vibrant-orange">meeting_room</span>
                            <span>{offer.workplace_area}</span>
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-outline-variant flex justify-end">
                    <Link to="/dashboard/institution/ojt-offers"
                      className="px-3 py-1.5 bg-vibrant-orange text-white rounded-lg text-xs font-bold hover:bg-deep-orange transition-colors inline-flex items-center gap-1 shadow-xs">
                      <span>Review &amp; Endorse</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Student Directory ──────────────────────────────────────────────── */}
      <div className="bento-card space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-bold text-lg text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-vibrant-orange">group</span>
              Student Directory
              {isStaff && staffAssignment?.program_name && (
                <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                  {staffAssignment.program_name}
                </span>
              )}
            </h2>
            <p className="text-xs text-on-surface-variant">
              {isStaff
                ? `Showing students assigned to your program. Click a student to inspect their full profile and portfolio.`
                : `Complete student roster across all programs. Use filters to narrow results. Click a student to view their career portfolio.`}
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-surface-container text-on-surface-variant border border-outline-variant">
            {filteredStudents.length} / {rawStudents.length} shown
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full max-w-full">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-on-surface-variant">search</span>
            <input
              type="text"
              placeholder="Search by name, ID, email, program…"
              value={stuSearch}
              onChange={e => setStuSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs outline-none focus:border-vibrant-orange transition-colors"
            />
          </div>

          {/* Program filter — only for main account */}
          {!isStaff && programsList.length > 0 && (
            <select
              value={stuProgram}
              onChange={e => setStuProgram(e.target.value)}
              className="w-full sm:w-auto max-w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs outline-none focus:border-vibrant-orange transition-colors truncate"
            >
              <option value="">All Programs</option>
              {programsList.map(p => (
                <option key={p.program_id} value={String(p.program_id)}>{p.program_code} — {p.program_name}</option>
              ))}
            </select>
          )}

          {/* OJT Status filter */}
          <select
            value={stuOjt}
            onChange={e => setStuOjt(e.target.value)}
            className="w-full sm:w-auto max-w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs outline-none focus:border-vibrant-orange transition-colors"
          >
            <option value="">All OJT Status</option>
            <option value="not_started">Not Started</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="graduated">Graduated</option>
          </select>

          {(stuSearch || stuProgram || stuOjt) && (
            <button
              onClick={() => { setStuSearch(''); setStuProgram(''); setStuOjt(''); }}
              className="w-full sm:w-auto justify-center px-3 py-2 bg-error-container text-error rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">clear</span> Clear
            </button>
          )}
        </div>

        {/* Student Table / Cards */}
        {rawStudents.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl text-outline opacity-50">manage_accounts</span>
            <p className="text-sm font-bold mt-2">No students found</p>
            <p className="text-xs mt-1">
              {isStaff
                ? 'No students are assigned to your program yet, or your program assignment is pending.'
                : 'No verified students found for this institution.'}
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-8 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl text-outline">search_off</span>
            <p className="text-sm mt-2">No students match your search filters.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-outline-variant w-full max-w-full">
              <table className="w-full text-xs min-w-[700px]">
                <thead className="bg-surface-container-low whitespace-nowrap">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-bold text-on-surface-variant uppercase text-[10px] tracking-wider">Student</th>
                    <th className="px-3 py-2.5 text-left font-bold text-on-surface-variant uppercase text-[10px] tracking-wider">Program</th>
                    <th className="px-3 py-2.5 text-left font-bold text-on-surface-variant uppercase text-[10px] tracking-wider">OJT Status</th>
                    <th className="px-3 py-2.5 text-left font-bold text-on-surface-variant uppercase text-[10px] tracking-wider">Hours</th>
                    <th className="px-3 py-2.5 text-left font-bold text-on-surface-variant uppercase text-[10px] tracking-wider">Portfolio</th>
                    <th className="px-3 py-2.5 text-right font-bold text-on-surface-variant uppercase text-[10px] tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {filteredStudents.map(stu => (
                    <tr key={stu.student_id} className="hover:bg-surface-container-low/60 transition-colors">
                      <td className="px-3 py-2.5">
                        <p className="font-bold text-on-surface">{stu.last_name}, {stu.first_name}</p>
                        <p className="text-on-surface-variant">{stu.student_number}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-on-surface">{stu.program_code || '—'}</p>
                        <p className="text-on-surface-variant line-clamp-1">{stu.program_name || '—'}</p>
                      </td>
                      <td className="px-3 py-2.5">{ojtBadge(stu.ojt_status)}</td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-on-surface">{stu.completed_ojt_hours || 0} / {stu.required_ojt_hours || '—'}</p>
                        <p className="text-on-surface-variant">hrs</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          (stu.portfolio_count || 0) > 0 ? 'bg-blue-50 text-blue-700' : 'bg-surface-container text-on-surface-variant'
                        }`}>
                          {stu.portfolio_count || 0} item{(stu.portfolio_count || 0) !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => setSelectedStudentId(stu.student_id)}
                          className="px-3 py-1.5 bg-vibrant-orange text-white rounded-lg text-[11px] font-bold hover:bg-deep-orange transition-colors inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (Fits 100% on phone screens) */}
            <div className="md:hidden divide-y divide-outline-variant/60 rounded-xl border border-outline-variant bg-surface-container-low/40 overflow-hidden w-full max-w-full">
              {filteredStudents.map(stu => (
                <div key={stu.student_id} className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-on-surface truncate">
                        {stu.last_name}, {stu.first_name}
                      </p>
                      <p className="text-[11px] text-on-surface-variant font-mono">
                        {stu.student_number || 'No ID'}
                      </p>
                    </div>
                    {ojtBadge(stu.ojt_status)}
                  </div>

                  <div className="flex items-center justify-between text-xs text-on-surface-variant pt-1 border-t border-outline-variant/40">
                    <span className="font-medium text-on-surface truncate max-w-[170px]">
                      {stu.program_code || 'No Program'}
                    </span>
                    <span className="font-semibold text-on-surface">
                      {stu.completed_ojt_hours || 0} / {stu.required_ojt_hours || 600} hrs
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      (stu.portfolio_count || 0) > 0 ? 'bg-blue-50 text-blue-700' : 'bg-surface-container text-on-surface-variant'
                    }`}>
                      {stu.portfolio_count || 0} item{(stu.portfolio_count || 0) !== 1 ? 's' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentId(stu.student_id)}
                      className="px-3 py-1.5 bg-vibrant-orange text-white rounded-lg text-xs font-bold hover:bg-deep-orange transition-colors inline-flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      <span>View Profile</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Student Detail Drawer */}
      {selectedStudentId && (
        <StudentDetailDrawer
          studentId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
        />
      )}
    </div>
  );
}
