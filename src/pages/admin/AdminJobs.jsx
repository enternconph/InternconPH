import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import Pagination from '../../components/ui/Pagination';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { TableSkeleton } from '../../components/ui/Skeleton';
import useDebounce from '../../hooks/useDebounce';
import { DetailDrawer, DetailRow, DetailLink } from '../../components/ui';
import { resolveFileUrl } from '../../utils/fileHelper';

export default function AdminJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedJobForDetail, setSelectedJobForDetail] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const fetchJobs = useCallback(async () => {
    try {
      const res = await api.get('/admin/jobs');
      if (res.success && res.data) {
        setJobs(res.data);
        setCurrentPage(1); // Reset page on new fetch
      }
    } catch (err) {
      console.error('Fetch admin jobs error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Real-time synchronization
  useRealtimeRefresh(fetchJobs);

  const handleUpdateStatus = async (jobId, status) => {
    setMessage('');
    const res = await api.put(`/admin/jobs/${jobId}/status`, { status });
    if (res.success) {
      setMessage(`Job status updated to ${status}.`);
      fetchJobs();
    } else {
      alert(res.message || 'Update failed.');
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 250);
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
      if (!matchesStatus) return false;

      if (!debouncedSearchTerm.trim()) return true;
      const term = debouncedSearchTerm.toLowerCase().trim();

      const title = (job.title || '').toLowerCase();
      const org = (job.organization_name || '').toLowerCase();
      const loc = (job.location || '').toLowerCase();
      const area = (job.workplace_area || '').toLowerCase();
      const desc = (job.description || '').toLowerCase();

      return title.includes(term) || org.includes(term) || loc.includes(term) || area.includes(term) || desc.includes(term);
    });
  }, [jobs, debouncedSearchTerm, statusFilter]);

  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredJobs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredJobs, currentPage]);

  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface">Job Posting Moderation</h1>
          <p className="text-xs sm:text-sm text-on-surface-variant">Review and manage all internship listings across the network</p>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-green-tint text-pinoy-green rounded-lg text-xs font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{message}</span>
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
            placeholder="Search job title, company, location..."
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
            <span className="text-xs font-bold text-on-surface-variant">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-vibrant-orange"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending_review">Pending Review</option>
              <option value="closed">Closed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <span className="text-xs text-on-surface-variant font-medium">
            Showing <strong className="text-on-surface">{filteredJobs.length}</strong> of {jobs.length}
          </span>
        </div>
      </div>

      <div className="bento-card space-y-4">
        {loading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : filteredJobs.length === 0 ? (
          <p className="text-xs text-on-surface-variant text-center py-6">No matching job postings found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant text-xs whitespace-nowrap">
                  <th className="py-3 px-4">Opportunity</th>
                  <th className="py-3 px-4">Company & Location</th>
                  <th className="py-3 px-4">Status & Capacity</th>
                  <th className="py-3 px-4 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {paginatedJobs.map((j) => (
                  <tr key={j.job_id} className="hover:bg-surface-container-low transition-colors">
                    {/* Title & Detail Link */}
                    <td className="py-3 px-4">
                      <p className="font-bold text-on-surface text-xs leading-tight">{j.title}</p>
                      <DetailLink onClick={() => setSelectedJobForDetail(j)}>
                        View Details
                      </DetailLink>
                    </td>

                    {/* Company & Location */}
                    <td className="py-3 px-4 text-xs text-on-surface-variant">
                      <p className="font-semibold text-on-surface">{j.organization_name}</p>
                      <p className="text-[11px] truncate max-w-[160px]">{j.location || 'Flexible'}</p>
                    </td>

                    {/* Status & Capacity */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          j.status === 'active' ? 'bg-green-tint text-pinoy-green' :
                          j.status === 'pending_review' ? 'bg-orange-tint text-vibrant-orange' :
                          'bg-surface-container text-on-surface-variant'
                        }`}>
                          {j.status?.replace('_', ' ')}
                        </span>
                        <span className="font-semibold text-xs text-on-surface">{j.slots_available || 1} slot(s)</span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">{j.applicant_count || 0} candidate(s)</p>
                    </td>

                    {/* Moderation Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedJobForDetail(j)}
                          className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
                          title="View Complete Opportunity Specs"
                        >
                          <span className="material-symbols-outlined text-[15px]">info</span>
                        </button>

                        <select
                          value={j.status}
                          onChange={(e) => handleUpdateStatus(j.job_id, e.target.value)}
                          className="px-2 py-1 rounded-lg border border-outline-variant bg-surface-container text-xs font-bold text-on-surface outline-none cursor-pointer"
                        >
                          <option value="active">Active</option>
                          <option value="pending_review">Pending Review</option>
                          <option value="closed">Closed</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
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

      {/* Slide-over Detail Drawer for Admin Opportunity Moderation */}
      {selectedJobForDetail && (
        <DetailDrawer
          open={!!selectedJobForDetail}
          onClose={() => setSelectedJobForDetail(null)}
          title={selectedJobForDetail.title}
          subtitle={`Moderation Review • ${selectedJobForDetail.organization_name}`}
          footer={
            <div className="flex items-center justify-between w-full gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {selectedJobForDetail.status !== 'active' && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = selectedJobForDetail.job_id;
                      handleUpdateStatus(id, 'active');
                      setSelectedJobForDetail(null);
                    }}
                    className="px-3.5 py-2 bg-pinoy-green hover:opacity-90 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Approve & Activate</span>
                  </button>
                )}
                {selectedJobForDetail.status !== 'rejected' && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = selectedJobForDetail.job_id;
                      handleUpdateStatus(id, 'rejected');
                      setSelectedJobForDetail(null);
                    }}
                    className="px-3 py-2 bg-error-container text-error hover:bg-error-container/70 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">cancel</span>
                    <span>Reject Post</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedJobForDetail(null)}
                className="px-4 py-2 bg-surface-container hover:bg-surface-container-high rounded-xl text-xs font-bold text-on-surface transition-colors"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Flyer Image Preview if available */}
            {selectedJobForDetail.flyer_image_url && (
              <div className="rounded-2xl overflow-hidden border border-outline-variant max-h-56 bg-surface-container">
                <img
                  src={resolveFileUrl(selectedJobForDetail.flyer_image_url)}
                  alt="Flyer Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Core Specs Card */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/60 space-y-2">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-2">
                Posting Specifications
              </h4>
              <DetailRow label="Host Organization" value={selectedJobForDetail.organization_name} />
              <DetailRow
                label="Posting Type"
                value={
                  <span className="capitalize font-bold text-on-surface">
                    {selectedJobForDetail.posting_type === 'ojt' ? 'OJT Internship' : selectedJobForDetail.posting_type === 'on_call' ? 'On-Call Opportunity' : 'Career Job'}
                  </span>
                }
              />
              <DetailRow
                label="Current Status"
                value={
                  <span className="capitalize font-bold text-xs">
                    {selectedJobForDetail.status?.replace('_', ' ')}
                  </span>
                }
              />
              <DetailRow label="Work Setup" value={selectedJobForDetail.work_setup || 'On-site'} />
              <DetailRow label="Slots Available" value={`${selectedJobForDetail.slots_available || 1} slot(s)`} />
              <DetailRow label="Candidates Applied" value={`${selectedJobForDetail.applicant_count || 0} applicant(s)`} />
              <DetailRow label="Office Location" value={selectedJobForDetail.location || 'N/A'} />
              {selectedJobForDetail.workplace_area && (
                <DetailRow label="Workplace Area" value={selectedJobForDetail.workplace_area} />
              )}
            </div>

            {/* Description */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/60 space-y-1.5">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Role Description</h4>
              <p className="text-xs text-on-surface-variant whitespace-pre-line leading-relaxed">
                {selectedJobForDetail.description || 'No detailed description provided.'}
              </p>
            </div>

            {/* Requirements */}
            {selectedJobForDetail.requirements && (
              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/60 space-y-1.5">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Qualifications & Requirements</h4>
                <p className="text-xs text-on-surface-variant whitespace-pre-line leading-relaxed">
                  {selectedJobForDetail.requirements}
                </p>
              </div>
            )}
          </div>
        </DetailDrawer>
      )}
    </div>
  );
}
