import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import Pagination from '../../components/ui/Pagination';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { TableSkeleton } from '../../components/ui/Skeleton';
import useDebounce from '../../hooks/useDebounce';

export default function AdminInstitutions() {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedInst, setSelectedInst] = useState(null); // Document inspection modal
  const [instDetail, setInstDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const parseAddress = (addrStr) => {
    if (!addrStr) return 'Philippines';
    try {
      const addr = JSON.parse(addrStr);
      return [addr.street, addr.barangay, addr.city, addr.province, addr.region]
        .filter(Boolean)
        .join(', ');
    } catch(e) {
      return addrStr;
    }
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const token = localStorage.getItem('token') || '';

  const fetchInstitutions = useCallback(async () => {
    try {
      const res = await api.get('/admin/institutions');
      if (res.success && res.data) {
        setInstitutions(res.data);
        setCurrentPage(1); // Reset page on new fetch
      }
    } catch (err) {
      console.error('Fetch institutions error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstitutions();
  }, [fetchInstitutions]);

  // Real-time synchronization
  useRealtimeRefresh(fetchInstitutions);

  const handleOpenInspection = async (inst) => {
    setSelectedInst(inst);
    setInstDetail(null);
    setPreviewUrl(null);
    setDetailLoading(true);
    try {
      const res = await api.get(`/admin/institutions/${inst.institution_id}`);
      if (res.success && res.data) {
        setInstDetail(res.data);
      }
    } catch (err) {
      console.error('Fetch institution detail error:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatus = async (instId, action) => {
    setMessage('');
    try {
      const res = await api.post(`/admin/institutions/${instId}/status`, { action });
      if (res.success) {
        setMessage(res.message);
        setSelectedInst(null);
        setInstDetail(null);
        setPreviewUrl(null);
        fetchInstitutions();
      } else {
        alert(res.message || 'Action failed.');
      }
    } catch (err) {
      alert(err.message || 'Server error updating status.');
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 250);
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredInstitutions = useMemo(() => {
    return institutions.filter((inst) => {
      const matchesStatus = statusFilter === 'all' || inst.status === statusFilter;
      if (!matchesStatus) return false;

      if (!debouncedSearchTerm.trim()) return true;
      const term = debouncedSearchTerm.toLowerCase().trim();

      const name = (inst.institution_name || '').toLowerCase();
      const code = (inst.institution_code || '').toLowerCase();
      const email = (inst.contact_email || '').toLowerCase();
      const phone = (inst.contact_phone || '').toLowerCase();
      const type = (inst.institution_type || '').toLowerCase();
      const addr = parseAddress(inst.address).toLowerCase();

      return name.includes(term) || code.includes(term) || email.includes(term) || phone.includes(term) || type.includes(term) || addr.includes(term);
    });
  }, [institutions, debouncedSearchTerm, statusFilter]);

  const paginatedInstitutions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInstitutions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredInstitutions, currentPage]);

  const totalPages = Math.ceil(filteredInstitutions.length / ITEMS_PER_PAGE);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-on-surface">Institution Legal Accreditation & Verifications</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-emerald-600 border border-emerald-200 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Review CHED Government Recognition, TESDA CTPR, and DepEd permits with uploaded legal softcopies.
          </p>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-green-tint text-pinoy-green rounded-xl text-xs font-bold flex items-center gap-2 border border-pinoy-green/20">
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
            placeholder="Search institution name, code, contact, address..."
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
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <span className="text-xs text-on-surface-variant font-medium">
            Showing <strong className="text-on-surface">{filteredInstitutions.length}</strong> of {institutions.length}
          </span>
        </div>
      </div>

      <div className="bento-card space-y-4">
        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant text-xs whitespace-nowrap">
                  <th className="py-3 px-4">Institution Name</th>
                  <th className="py-3 px-4">Classification & Code</th>
                  <th className="py-3 px-4">Director / Contact</th>
                  <th className="py-3 px-4">Accreditation Softcopies</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {paginatedInstitutions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-on-surface-variant">
                      No educational institutions found.
                    </td>
                  </tr>
                ) : (
                  paginatedInstitutions.map((inst) => {
                    const isPending = inst.status === 'pending';

                    return (
                      <tr key={inst.institution_id} className="hover:bg-surface-container-low transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-on-surface">{inst.institution_name}</p>
                          <p className="text-xs text-on-surface-variant">{parseAddress(inst.address)}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-bold text-vibrant-orange block">{inst.institution_code}</span>
                          <span className="text-[11px] text-on-surface-variant capitalize">
                            {(inst.institution_type || 'university').replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-on-surface-variant">
                          <p className="font-medium text-on-surface">{inst.director_name || 'Director / President'}</p>
                          <p className="text-[11px]">{inst.contact_email || 'N/A'}</p>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleOpenInspection(inst)}
                            className="px-2.5 py-1.5 bg-surface-container text-xs font-bold text-vibrant-orange rounded-lg border border-outline-variant hover:bg-surface-container-high transition-colors flex items-center gap-1.5 shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[16px]">verified_user</span>
                            <span>Inspect Softcopies</span>
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                              isPending
                                ? 'bg-amber-500/10 text-amber-600'
                                : inst.status === 'rejected'
                                ? 'bg-error-container text-error'
                                : 'bg-green-tint text-pinoy-green'
                            }`}
                          >
                            {inst.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isPending ? (
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => handleStatus(inst.institution_id, 'approve')}
                                className="px-3 py-1 bg-pinoy-green text-white rounded-lg text-xs font-bold hover:opacity-90 shadow-sm transition-opacity"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleStatus(inst.institution_id, 'reject')}
                                className="px-3 py-1 bg-error text-white rounded-lg text-xs font-bold hover:opacity-90 shadow-sm transition-opacity"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-pinoy-green inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">verified</span> Verified
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
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

      {/* Legal Document Inspection Modal */}
      {selectedInst && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-outline-variant rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-6 animate-in fade-in zoom-in duration-150 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-outline-variant pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-vibrant-orange text-[26px]">school</span>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-on-surface">
                    Legal Accreditation: {selectedInst.institution_name}
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">
                    Philippine Higher Ed & Tech-Voc Government Recognition softcopy audit
                  </p>
                </div>
              </div>
              <button onClick={() => { setSelectedInst(null); setInstDetail(null); setPreviewUrl(null); }} className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-lg hover:bg-surface-container transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {detailLoading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
                <span className="text-xs text-on-surface-variant">Loading legal accreditation records...</span>
              </div>
            ) : (
              <div className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
                {/* Institution Profile & License details */}
                <div className="p-4 bg-surface-container rounded-xl space-y-2.5 border border-outline-variant">
                  <span className="font-bold text-on-surface uppercase tracking-wider block text-[11px]">
                    Educational Entity Profile
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-on-surface-variant">
                    <p>Institution Code: <strong className="text-on-surface font-mono">{selectedInst.institution_code}</strong></p>
                    <p>Classification: <strong className="text-on-surface capitalize">{(instDetail?.institution?.institution_type || selectedInst.institution_type || 'university').replace('_', ' ')}</strong></p>
                    <p>Director / President: <strong className="text-on-surface">{instDetail?.institution?.director_name || selectedInst.director_name || 'N/A'}</strong></p>
                    <p>Official Email: <strong className="text-on-surface break-all">{selectedInst.contact_email || 'N/A'}</strong></p>
                    <p>Campus Trunkline: <strong className="text-on-surface">{selectedInst.contact_phone || 'N/A'}</strong></p>
                    <p>Website: <a href={selectedInst.website || '#'} target="_blank" rel="noreferrer" className="text-vibrant-orange hover:underline break-all">{selectedInst.website || 'N/A'}</a></p>
                    <p className="sm:col-span-2">Campus Address: <strong className="text-on-surface">{parseAddress(selectedInst.address)}</strong></p>
                    {selectedInst.google_map_link && (
                      <p className="sm:col-span-3 mt-1">
                        Location Map: <a href={selectedInst.google_map_link} target="_blank" rel="noreferrer" className="text-vibrant-orange hover:underline inline-flex items-center gap-1 font-bold"><span className="material-symbols-outlined text-[16px]">location_on</span> View on Google Maps</a>
                      </p>
                    )}
                    <div className="col-span-full pt-2 border-t border-outline-variant/60">
                      <span>Permit / Recognition No: <strong className="text-on-surface font-mono text-xs text-vibrant-orange font-bold ml-1">{instDetail?.institution?.accreditation_number || selectedInst.accreditation_number || 'Under Review'}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Submitted Softcopy Credentials */}
                <div className="p-4 bg-surface-container rounded-xl space-y-3 border border-outline-variant">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-on-surface flex items-center gap-1.5 text-xs sm:text-sm">
                      <span className="material-symbols-outlined text-pinoy-green text-[20px]">verified_user</span>
                      Government Recognition Softcopies (CHED GR / TESDA CTPR / DepEd Permits)
                    </p>
                    <span className="text-[11px] text-on-surface-variant font-medium bg-surface px-2.5 py-0.5 rounded-full border border-outline-variant">
                      {(instDetail?.documents || []).length} Document(s)
                    </span>
                  </div>

                  {(!instDetail?.documents || instDetail.documents.length === 0) ? (
                    <div className="p-4 bg-amber-500/10 text-amber-700 rounded-lg text-xs flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px]">warning</span>
                      <span>No softcopy legal documents attached for this institution.</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {instDetail.documents.map((doc, idx) => {
                        const viewUrl = `/api/admin/documents/${doc.document_id}/view?type=institution&token=${token}`;
                        const downloadUrl = `/api/admin/documents/${doc.document_id}/download?type=institution&token=${token}`;
                        const isSelfDeclared = doc.file_path && doc.file_path.startsWith('Ref:');

                        return (
                          <div
                            key={doc.document_id || idx}
                            className="p-3.5 bg-surface rounded-xl border border-outline-variant hover:border-vibrant-orange/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center flex-wrap gap-2">
                                <span className="material-symbols-outlined text-vibrant-orange text-[20px] shrink-0">
                                  {doc.document_name?.includes('CHED') ? 'school' : doc.document_name?.includes('TESDA') ? 'engineering' : 'verified_user'}
                                </span>
                                <span className="font-bold text-on-surface text-xs sm:text-sm break-words leading-tight">
                                  {doc.document_name || 'Accreditation Softcopy'}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                  doc.verified ? 'bg-green-tint text-pinoy-green' : 'bg-amber-500/10 text-amber-700'
                                }`}>
                                  {doc.verified ? 'Verified' : 'Pending Inspection'}
                                </span>
                              </div>
                              <p className="text-[11px] font-mono text-on-surface-variant pl-7 break-all">
                                File: <strong className="text-on-surface font-semibold">{doc.file_name || doc.file_path}</strong>
                              </p>
                              {doc.uploaded_at && (
                                <p className="text-[10px] text-on-surface-variant pl-7">
                                  Uploaded: {new Date(doc.uploaded_at).toLocaleString()}
                                </p>
                              )}
                            </div>

                            {!isSelfDeclared && (
                              <div className="flex items-center flex-wrap gap-2 shrink-0 self-start sm:self-center pl-7 sm:pl-0">
                                <button
                                  type="button"
                                  onClick={() => setPreviewUrl(previewUrl === viewUrl ? null : viewUrl)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 shadow-xs ${
                                    previewUrl === viewUrl
                                      ? 'bg-vibrant-orange text-white border-vibrant-orange'
                                      : 'bg-surface-container text-on-surface border-outline-variant hover:bg-surface-container-high'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    {previewUrl === viewUrl ? 'visibility_off' : 'visibility'}
                                  </span>
                                  <span>{previewUrl === viewUrl ? 'Hide Preview' : 'Preview'}</span>
                                </button>
                                <a
                                  href={viewUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-surface-container text-on-surface rounded-lg text-xs font-bold border border-outline-variant hover:bg-surface-container-high transition-colors flex items-center gap-1.5 shadow-xs"
                                >
                                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                  <span>Open</span>
                                </a>
                                <a
                                  href={downloadUrl}
                                  className="px-3 py-1.5 bg-surface-container text-on-surface rounded-lg text-xs font-bold border border-outline-variant hover:bg-surface-container-high transition-colors flex items-center gap-1.5 shadow-xs"
                                >
                                  <span className="material-symbols-outlined text-[16px]">download</span>
                                  <span>Download</span>
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Inline Document Preview Box */}
                  {previewUrl && (
                    <div className="mt-4 p-3 bg-surface-container-lowest rounded-xl border border-outline-variant space-y-2 shadow-xs">
                      <div className="flex justify-between items-center px-1">
                        <span className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-vibrant-orange text-[18px]">visibility</span>
                          Live Softcopy Preview
                        </span>
                        <button
                          onClick={() => setPreviewUrl(null)}
                          className="px-2 py-1 text-xs text-error font-bold hover:bg-error/10 rounded-md transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[15px]">close</span>
                          Close Preview
                        </button>
                      </div>
                      <div className="rounded-lg overflow-hidden border border-outline-variant bg-white">
                        <iframe
                          src={previewUrl}
                          title="Document Softcopy Preview"
                          className="w-full h-96 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-outline-variant shrink-0">
              <button
                onClick={() => { setSelectedInst(null); setInstDetail(null); setPreviewUrl(null); }}
                className="px-4 py-2 bg-surface-container text-xs font-bold text-on-surface rounded-xl hover:bg-surface-container-high transition-colors"
              >
                Close
              </button>
              {selectedInst.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStatus(selectedInst.institution_id, 'reject')}
                    className="px-4 py-2 bg-error text-white text-xs font-bold rounded-xl hover:opacity-90 shadow-sm transition-opacity"
                  >
                    Reject Institution
                  </button>
                  <button
                    onClick={() => handleStatus(selectedInst.institution_id, 'approve')}
                    className="px-4 py-2 bg-pinoy-green text-white text-xs font-bold rounded-xl hover:opacity-90 shadow-sm flex items-center gap-1.5 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    Approve Accreditation
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
