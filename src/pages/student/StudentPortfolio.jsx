import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';
import { resolveFileUrl, formatFileSize, getFileIcon, isImageFile, isPdfFile } from '../../utils/fileHelper';

// Accept all file types so OS file pickers don't hide uploads with uppercase extensions (.PDF, .PNG, etc.)
const FILE_ACCEPT = '*/*';

export default function StudentPortfolio() {
  const [data, setData] = useState({
    portfolio: null,
    academic_portfolio: [],
    credentials: [],
    academic_records: [],
    resumes: [],
    is_graduated: false,
    ojt_background: [],
    mentor_evaluations: [],
    items: [],
    achievements: [],
    documents: [],
    student: null
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('academic_portfolio');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadFile, setUploadFile] = useState(null);

  // Resume upload
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeUploading, setResumeUploading] = useState(false);

  // Edit Item Modal
  const [editingItem, setEditingItem] = useState(null);

  // File preview modal
  const [previewItem, setPreviewItem] = useState(null);

  // Active section tab
  const [activeSection, setActiveSection] = useState('academic_portfolio');

  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await api.get('/student/portfolio');
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Fetch portfolio error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  useRealtimeRefresh(fetchPortfolio);

  const showNotification = (msg, isErr = false) => {
    if (isErr) { setError(msg); setMessage(''); }
    else { setMessage(msg); setError(''); }
    setTimeout(() => { setMessage(''); setError(''); }, 4000);
  };

  // Upload file then create portfolio item
  const handleUploadItem = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle) {
      showNotification('Please provide a title and select a file to upload.', true);
      return;
    }

    setUploading(true);
    try {
      // Step 1: Upload the file
      const formData = new FormData();
      formData.append('file', uploadFile);
      const uploadRes = await api.post('/student/portfolio/upload', formData);

      if (!uploadRes || !uploadRes.success) {
        showNotification((uploadRes && uploadRes.message) || 'File upload failed. Please try again.', true);
        setUploading(false);
        return;
      }

      const uploadedFilePath = uploadRes.data?.file_path || '';
      const uploadedFileName = uploadRes.data?.file_name || uploadFile.name;
      const uploadedFileSize = uploadRes.data?.file_size || uploadFile.size;

      // Step 2: Create portfolio item with file reference
      const itemRes = await api.post('/student/portfolio/items', {
        title: uploadTitle,
        description: uploadDesc,
        file_path: uploadedFilePath,
        file_name: uploadedFileName,
        file_size: uploadedFileSize,
        item_type: uploadCategory
      });

      if (itemRes && itemRes.success) {
        setUploadTitle('');
        setUploadDesc('');
        setUploadFile(null);
        // Reset file input
        const fileInput = document.getElementById('portfolio-file-input');
        if (fileInput) fileInput.value = '';
        showNotification('File uploaded and added to your portfolio!');
        fetchPortfolio();
      } else {
        showNotification((itemRes && itemRes.message) || 'Failed to save portfolio item.', true);
      }
    } catch (err) {
      console.error('Upload error:', err);
      showNotification((err && err.message) || 'Upload failed. Please try again.', true);
    } finally {
      setUploading(false);
    }
  };

  // Upload resume file
  const handleUploadResume = async (e) => {
    e.preventDefault();
    if (!resumeFile) {
      showNotification('Please select a resume file to upload.', true);
      return;
    }

    setResumeUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', resumeFile);
      const uploadRes = await api.post('/student/portfolio/upload', formData);

      if (!uploadRes || !uploadRes.success) {
        showNotification((uploadRes && uploadRes.message) || 'Resume upload failed. Please try again.', true);
        setResumeUploading(false);
        return;
      }

      const uploadedFilePath = uploadRes.data?.file_path || '';
      const uploadedFileName = uploadRes.data?.file_name || resumeFile.name;
      const uploadedFileSize = uploadRes.data?.file_size || resumeFile.size;

      const saveRes = await api.post('/student/resumes', {
        file_path: uploadedFilePath,
        file_name: uploadedFileName,
        file_size: uploadedFileSize
      });

      if (saveRes && saveRes.success) {
        setResumeFile(null);
        const fileInput = document.getElementById('resume-file-input');
        if (fileInput) fileInput.value = '';
        showNotification(saveRes.message || 'Resume uploaded successfully!');
        fetchPortfolio();
      } else {
        showNotification((saveRes && saveRes.message) || 'Failed to save resume.', true);
      }
    } catch (err) {
      console.error('Resume upload error:', err);
      showNotification((err && err.message) || 'Resume upload failed. Please try again.', true);
    } finally {
      setResumeUploading(false);
    }
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    const res = await api.put(`/student/portfolio/items/${editingItem.item_id}`, {
      title: editingItem.title,
      description: editingItem.description,
      item_type: editingItem.item_type
    });
    if (res.success) {
      setEditingItem(null);
      showNotification('Portfolio item updated.');
      fetchPortfolio();
    } else {
      showNotification(res.message || 'Failed to update item.', true);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    const res = await api.delete(`/student/portfolio/items/${id}`);
    if (res.success) {
      showNotification('Item deleted.');
      fetchPortfolio();
    }
  };

  const handleDeleteResume = async (id) => {
    if (!window.confirm('Delete this resume version?')) return;
    const res = await api.delete(`/student/resumes/${id}`);
    if (res.success) {
      showNotification('Resume deleted.');
      fetchPortfolio();
    }
  };

  const sections = [
    { key: 'academic_portfolio', label: 'Academic Portfolio', icon: 'school', color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
    { key: 'credentials', label: 'Credentials', icon: 'workspace_premium', color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
    { key: 'academic_records', label: 'Academic Records', icon: 'grading', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
    { key: 'resume', label: 'Resume', icon: 'description', color: 'text-purple-600', bgColor: 'bg-purple-500/10' },
  ];

  const getSectionItems = (key) => {
    const norm = (t) => (t || '').toLowerCase().trim();
    const isCred = (t) => ['credential', 'credentials', 'certificate', 'certification', 'honor', 'award', 'license', 'badge'].includes(norm(t));
    const isRecord = (t) => ['academic_record', 'academic_records', 'transcript', 'tor', 'cor', 'enrollment', 'record', 'grades'].includes(norm(t));
    const isAcad = (t) => ['academic_portfolio', 'project', 'sample_work', 'capstone', 'thesis', 'research', 'coursework'].includes(norm(t));

    if (key === 'academic_portfolio') {
      if (data.academic_portfolio && data.academic_portfolio.length > 0) return data.academic_portfolio;
      return (data.items || []).filter(i => isAcad(i.item_type) || (!isCred(i.item_type) && !isRecord(i.item_type)));
    }
    if (key === 'credentials') {
      if (data.credentials && data.credentials.length > 0) return data.credentials;
      return (data.items || []).filter(i => isCred(i.item_type));
    }
    if (key === 'academic_records') {
      if (data.academic_records && data.academic_records.length > 0) return data.academic_records;
      return (data.items || []).filter(i => isRecord(i.item_type));
    }
    return [];
  };

  const getCategoryLabel = (type) => {
    const map = {
      'academic_portfolio': 'Academic Portfolio',
      'credentials': 'Credential',
      'credential': 'Credential',
      'certificate': 'Certificate',
      'academic_record': 'Academic Record',
      'academic_records': 'Academic Records',
      'transcript': 'Transcript',
      'cor': 'Certificate of Registration',
      'project': 'Project',
      'sample_work': 'Work Sample',
    };
    return map[type] || type;
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-vibrant-orange text-[28px]">folder_special</span>
          Career Portfolio
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Upload and manage your academic portfolio, credentials, academic records, and resume.
          {data.is_graduated && ' Your OJT background and mentor evaluations are automatically included.'}
        </p>
      </div>

      {message && (
        <div className="p-3 bg-green-tint text-pinoy-green rounded-lg text-xs font-bold flex items-center gap-2 animate-[fadeIn_0.3s_ease-out]">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-error rounded-lg text-xs font-bold flex items-center gap-2 animate-[fadeIn_0.3s_ease-out]">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
            {sections.map(sec => (
              <button
                key={sec.key}
                onClick={() => {
                  setActiveSection(sec.key);
                  // Auto-sync the upload category to the active tab so items are always saved correctly
                  if (sec.key === 'credentials') setUploadCategory('credential');
                  else if (sec.key === 'academic_records') setUploadCategory('academic_record');
                  else if (sec.key !== 'resume') setUploadCategory('academic_portfolio');
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeSection === sec.key
                    ? 'bg-vibrant-orange text-white shadow-md shadow-vibrant-orange/20'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{sec.icon}</span>
                <span>{sec.label}</span>
                {sec.key !== 'resume' && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                    activeSection === sec.key ? 'bg-white/20' : 'bg-surface-container-high'
                  }`}>
                    {getSectionItems(sec.key).length}
                  </span>
                )}
                {sec.key === 'resume' && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                    activeSection === sec.key ? 'bg-white/20' : 'bg-surface-container-high'
                  }`}>
                    {data.resumes?.length || 0}
                  </span>
                )}
              </button>
            ))}

            {/* Auto OJT Tab for graduated students */}
            {data.is_graduated && (
              <>
                <button
                  onClick={() => setActiveSection('ojt_background')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    activeSection === 'ojt_background'
                      ? 'bg-vibrant-orange text-white shadow-md shadow-vibrant-orange/20'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">work_history</span>
                  <span>OJT Background</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                    activeSection === 'ojt_background' ? 'bg-white/20' : 'bg-surface-container-high'
                  }`}>
                    {data.ojt_background?.length || 0}
                  </span>
                </button>
                <button
                  onClick={() => setActiveSection('evaluations')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    activeSection === 'evaluations'
                      ? 'bg-vibrant-orange text-white shadow-md shadow-vibrant-orange/20'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">rate_review</span>
                  <span>Mentor Evaluations</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                    activeSection === 'evaluations' ? 'bg-white/20' : 'bg-surface-container-high'
                  }`}>
                    {data.mentor_evaluations?.length || 0}
                  </span>
                </button>
              </>
            )}
          </div>

          {/* ======================= ACADEMIC PORTFOLIO / CREDENTIALS / ACADEMIC RECORDS ======================= */}
          {['academic_portfolio', 'credentials', 'academic_records'].includes(activeSection) && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upload Form */}
              <div className="bento-card space-y-4">
                <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[20px] ${sections.find(s => s.key === activeSection)?.color}`}>
                    upload_file
                  </span>
                  <span>Upload {sections.find(s => s.key === activeSection)?.label}</span>
                </h2>
                <p className="text-[11px] text-on-surface-variant">
                  Accepted files: PDF, DOCX, JPG, PNG, JPEG, and more. Max 30MB per file.
                </p>

                <form onSubmit={handleUploadItem} className="space-y-3">
                  <input type="hidden" value={activeSection} />
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Title *</label>
                    <input
                      type="text"
                      required
                      placeholder={
                        activeSection === 'academic_portfolio' ? 'e.g. Capstone Project Documentation' :
                        activeSection === 'credentials' ? 'e.g. Dean\'s Lister Certificate' :
                        'e.g. Transcript of Records'
                      }
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-xs font-medium outline-none focus:border-vibrant-orange transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Description (Optional)</label>
                    <input
                      type="text"
                      placeholder="Brief description of the document..."
                      value={uploadDesc}
                      onChange={(e) => setUploadDesc(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-xs font-medium outline-none focus:border-vibrant-orange transition-colors"
                    />
                  </div>

                  {activeSection === 'academic_portfolio' && (
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Sub-type</label>
                      <select
                        value={uploadCategory}
                        onChange={(e) => setUploadCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-xs font-bold outline-none"
                      >
                        <option value="academic_portfolio">Academic Portfolio</option>
                        <option value="project">Capstone / Thesis</option>
                        <option value="sample_work">Work Sample</option>
                      </select>
                    </div>
                  )}

                  {activeSection === 'credentials' && (
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Credential Type</label>
                      <select
                        value={uploadCategory}
                        onChange={(e) => setUploadCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-xs font-bold outline-none"
                      >
                        <option value="credential">General Credential</option>
                        <option value="certificate">Certificate / Certification</option>
                      </select>
                    </div>
                  )}

                  {activeSection === 'academic_records' && (
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Record Type</label>
                      <select
                        value={uploadCategory}
                        onChange={(e) => setUploadCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-xs font-bold outline-none"
                      >
                        <option value="academic_record">Academic Record</option>
                        <option value="transcript">Transcript of Records (TOR)</option>
                        <option value="cor">Certificate of Registration (COR)</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Choose File *</label>
                    <div className="relative">
                      <input
                        id="portfolio-file-input"
                        type="file"
                        required
                        accept={FILE_ACCEPT}
                        onChange={(e) => {
                          const f = e.target.files[0] || null;
                          setUploadFile(f);
                          if (f && !uploadTitle) {
                            setUploadTitle(f.name.replace(/\.[^/.]+$/, ''));
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-xs font-medium outline-none file:mr-3 file:px-3 file:py-1 file:rounded-lg file:border-0 file:bg-vibrant-orange file:text-white file:text-xs file:font-bold file:cursor-pointer"
                      />
                    </div>
                    {uploadFile && (
                      <p className="text-[11px] text-on-surface-variant mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">{getFileIcon(uploadFile.name)}</span>
                        {uploadFile.name} ({formatFileSize(uploadFile.size)})
                      </p>
                    )}
                    <p className="text-[10px] text-on-surface-variant mt-1">Accepts PDF, DOCX, JPG, PNG, JPEG, and all formats. Max 30MB.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={uploading || !uploadFile || !uploadTitle}
                    className="w-full py-2.5 bg-vibrant-orange text-white rounded-lg text-xs font-bold hover:bg-deep-orange transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                        <span>Upload to {sections.find(s => s.key === activeSection)?.label}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Items List */}
              <div className="lg:col-span-2 bento-card space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[20px] ${sections.find(s => s.key === activeSection)?.color}`}>
                      {sections.find(s => s.key === activeSection)?.icon}
                    </span>
                    <span>
                      {sections.find(s => s.key === activeSection)?.label} ({getSectionItems(activeSection).length})
                    </span>
                  </h2>
                </div>

                {getSectionItems(activeSection).length === 0 ? (
                  <div className="text-center py-12 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[48px] mb-2 opacity-40">folder_open</span>
                    <p className="text-sm font-bold text-on-surface">No items yet</p>
                    <p className="text-xs mt-1">Upload files using the form to add to your {sections.find(s => s.key === activeSection)?.label}.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getSectionItems(activeSection).map((item) => (
                      <div key={item.item_id} className="p-3 bg-surface-container rounded-xl border border-outline-variant hover:border-vibrant-orange/30 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            {/* File icon / Image thumbnail */}
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${sections.find(s => s.key === activeSection)?.bgColor}`}>
                              {item.file_name && isImageFile(item.file_name, item.file_path) && item.file_path ? (
                                <img
                                  src={resolveFileUrl(item.file_path)}
                                  alt={item.title}
                                  className="w-10 h-10 rounded-lg object-cover cursor-pointer"
                                  onClick={() => setPreviewItem(item)}
                                />
                              ) : (
                                <span className={`material-symbols-outlined text-[20px] ${sections.find(s => s.key === activeSection)?.color}`}>
                                  {getFileIcon(item.file_name)}
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-on-surface">{item.title}</span>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${sections.find(s => s.key === activeSection)?.bgColor} ${sections.find(s => s.key === activeSection)?.color}`}>
                                  {getCategoryLabel(item.item_type)}
                                </span>
                                {item.associated_org_name && (
                                  <span className="text-[10px] bg-green-50 text-pinoy-green px-2 py-0.5 rounded font-bold flex items-center gap-0.5">
                                    <span className="material-symbols-outlined text-[10px]">verified</span>
                                    {item.associated_org_name}
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-xs text-on-surface-variant truncate">{item.description}</p>
                              )}
                              <div className="flex items-center gap-3 text-[11px] text-on-surface-variant">
                                {item.file_name && (
                                  <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">attach_file</span>
                                    {item.file_name}
                                  </span>
                                )}
                                {item.file_size && (
                                  <span>{formatFileSize(item.file_size)}</span>
                                )}
                                {item.created_at && (
                                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            {item.file_path && (
                              <button
                                onClick={() => setPreviewItem(item)}
                                className="text-on-surface-variant hover:text-vibrant-orange transition-colors p-1"
                                title="View / Preview File"
                              >
                                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                              </button>
                            )}
                            {item.file_path && (
                              <a
                                href={resolveFileUrl(item.file_path)}
                                download={item.file_name || true}
                                className="text-on-surface-variant hover:text-vibrant-orange transition-colors p-1"
                                title="Download File"
                              >
                                <span className="material-symbols-outlined text-[18px]">download</span>
                              </a>
                            )}
                            <button
                              onClick={() => setEditingItem(item)}
                              className="text-on-surface-variant hover:text-vibrant-orange transition-colors p-1"
                              title="Edit Item"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.item_id)}
                              className="text-on-surface-variant hover:text-error transition-colors p-1"
                              title="Delete Item"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================= RESUME SECTION ======================= */}
          {activeSection === 'resume' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upload Resume */}
              <div className="bento-card space-y-4">
                <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-600 text-[20px]">upload_file</span>
                  <span>Upload Resume</span>
                </h2>
                <p className="text-[11px] text-on-surface-variant">
                  Upload your latest resume or CV. Supports PDF, DOCX, JPG, PNG, and JPEG. Max 30MB.
                </p>

                <form onSubmit={handleUploadResume} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Choose Resume File *</label>
                    <input
                      id="resume-file-input"
                      type="file"
                      required
                      accept={FILE_ACCEPT}
                      onChange={(e) => setResumeFile(e.target.files[0] || null)}
                      className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-xs font-medium outline-none file:mr-3 file:px-3 file:py-1 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white file:text-xs file:font-bold file:cursor-pointer"
                    />
                    <p className="text-[10px] text-on-surface-variant mt-1">PDF, DOCX, JPG, PNG, and all formats accepted. Max 30MB.</p>
                    {resumeFile && (
                      <p className="text-[11px] text-on-surface-variant mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">{getFileIcon(resumeFile.name)}</span>
                        {resumeFile.name} ({formatFileSize(resumeFile.size)})
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={resumeUploading || !resumeFile}
                    className="w-full py-2.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {resumeUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                        <span>Upload New Resume Version</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Resume List */}
              <div className="lg:col-span-2 bento-card space-y-4">
                <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-600 text-[20px]">description</span>
                  <span>Resume Versions ({data.resumes?.length || 0})</span>
                </h2>

                {(!data.resumes || data.resumes.length === 0) ? (
                  <div className="text-center py-12 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[48px] mb-2 opacity-40">description</span>
                    <p className="text-sm font-bold text-on-surface">No resume uploaded yet</p>
                    <p className="text-xs mt-1">Upload your resume using the form. The latest version will be shown to organizations.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.resumes.map((resume) => (
                      <div key={resume.resume_id} className="p-3 bg-surface-container rounded-xl border border-outline-variant hover:border-purple-500/30 transition-colors">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                              <span className="material-symbols-outlined text-purple-600 text-[20px]">{getFileIcon(resume.file_name)}</span>
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-on-surface">{resume.file_name || `Resume v${resume.version}`}</span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600">v{resume.version}</span>
                                {resume.is_active === 1 && (
                                  <span className="text-[10px] bg-green-tint text-pinoy-green px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                    <span className="material-symbols-outlined text-[10px]">check_circle</span>
                                    Active
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-on-surface-variant">
                                {resume.file_size && <span>{formatFileSize(resume.file_size)}</span>}
                                {resume.created_at && <span>{new Date(resume.created_at).toLocaleDateString()}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {resume.file_path && (
                              <button
                                onClick={() => setPreviewItem({ ...resume, title: resume.file_name || 'Resume', item_type: 'resume' })}
                                className="text-on-surface-variant hover:text-purple-600 transition-colors p-1"
                                title="View / Preview"
                              >
                                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                              </button>
                            )}
                            {resume.file_path && (
                              <a
                                href={resolveFileUrl(resume.file_path)}
                                download={resume.file_name || true}
                                className="text-on-surface-variant hover:text-purple-600 transition-colors p-1"
                                title="Download Resume"
                              >
                                <span className="material-symbols-outlined text-[18px]">download</span>
                              </a>
                            )}
                            <button
                              onClick={() => handleDeleteResume(resume.resume_id)}
                              className="text-on-surface-variant hover:text-error transition-colors p-1"
                              title="Delete Resume"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================= OJT BACKGROUND (Auto for Graduated) ======================= */}
          {activeSection === 'ojt_background' && data.is_graduated && (
            <div className="bento-card space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-vibrant-orange text-[20px]">work_history</span>
                <h2 className="text-base font-bold text-on-surface">OJT Background & Training History</h2>
                <span className="text-[10px] bg-green-tint text-pinoy-green px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[10px]">verified</span>
                  Auto-added (Graduated)
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Your OJT background is automatically included in your career portfolio. This is visible to organizations reviewing your profile.
              </p>

              {(!data.ojt_background || data.ojt_background.length === 0) ? (
                <div className="text-center py-8 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[48px] mb-2 opacity-40">work_off</span>
                  <p className="text-sm font-bold text-on-surface">No OJT records found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.ojt_background.map((ojt, idx) => (
                    <div key={ojt.ojt_id || idx} className="p-4 bg-surface-container rounded-xl border border-outline-variant">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div className="space-y-1">
                          <h3 className="font-bold text-sm text-on-surface">{ojt.organization_name}</h3>
                          <p className="text-xs text-on-surface-variant">{ojt.industry}</p>
                          {ojt.org_address && <p className="text-[11px] text-on-surface-variant">{ojt.org_address}</p>}
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                          ojt.status === 'completed' ? 'bg-green-tint text-pinoy-green' :
                          ojt.status === 'active' ? 'bg-blue-500/10 text-blue-600' :
                          'bg-surface-container-high text-on-surface-variant'
                        }`}>
                          {ojt.status || 'Completed'}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-2 bg-surface-container-low rounded-lg">
                          <span className="block text-[10px] text-on-surface-variant uppercase font-bold">Required Hours</span>
                          <span className="font-bold text-on-surface">{ojt.required_hours || 0} hrs</span>
                        </div>
                        <div className="p-2 bg-surface-container-low rounded-lg">
                          <span className="block text-[10px] text-on-surface-variant uppercase font-bold">Rendered Hours</span>
                          <span className="font-bold text-on-surface">{ojt.rendered_hours || 0} hrs</span>
                        </div>
                        {ojt.mentor_first_name && (
                          <div className="p-2 bg-surface-container-low rounded-lg sm:col-span-2">
                            <span className="block text-[10px] text-on-surface-variant uppercase font-bold">Workplace Mentor</span>
                            <span className="font-bold text-on-surface">{ojt.mentor_first_name} {ojt.mentor_last_name}</span>
                            {ojt.mentor_contact && <span className="block text-[11px] text-on-surface-variant">{ojt.mentor_contact}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================= MENTOR EVALUATIONS (Auto for Graduated) ======================= */}
          {activeSection === 'evaluations' && data.is_graduated && (
            <div className="bento-card space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-vibrant-orange text-[20px]">rate_review</span>
                <h2 className="text-base font-bold text-on-surface">Mentor Performance Evaluations</h2>
                <span className="text-[10px] bg-green-tint text-pinoy-green px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[10px]">verified</span>
                  Auto-added (Graduated)
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Performance evaluations from your workplace mentors. These are automatically included in your profile and visible to organizations.
              </p>

              {(!data.mentor_evaluations || data.mentor_evaluations.length === 0) ? (
                <div className="text-center py-8 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[48px] mb-2 opacity-40">rate_review</span>
                  <p className="text-sm font-bold text-on-surface">No evaluations recorded yet</p>
                  <p className="text-xs mt-1">Evaluations from your organization mentors will appear here after your OJT is completed.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.mentor_evaluations.map((ev, idx) => (
                    <div key={ev.record_id || idx} className="p-4 bg-surface-container rounded-xl border border-outline-variant">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div className="space-y-1">
                          <h3 className="font-bold text-sm text-on-surface">{ev.organization_name}</h3>
                          <p className="text-xs text-on-surface-variant">
                            Evaluator: {ev.evaluator_first_name} {ev.evaluator_last_name}
                            {ev.evaluator_email && <span className="text-[11px]"> ({ev.evaluator_email})</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-500/10">
                          <span className="text-amber-600 font-bold text-sm">{ev.rating || 0}</span>
                          <span className="text-[11px] text-amber-600">/5.0 ⭐</span>
                        </div>
                      </div>

                      {ev.comments && (
                        <div className="mt-3 p-3 bg-surface-container-low rounded-lg border-l-4 border-vibrant-orange">
                          <p className="text-xs text-on-surface italic">"{ev.comments}"</p>
                        </div>
                      )}

                      <div className="mt-2 flex items-center gap-4 text-[11px] text-on-surface-variant">
                        {ev.evaluation_period && <span>Period: {ev.evaluation_period}</span>}
                        {ev.evaluated_at && <span>Date: {new Date(ev.evaluated_at).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-outline-variant shadow-2xl">
            <h3 className="text-base font-bold text-on-surface">Edit Portfolio Item</h3>
            <form onSubmit={handleUpdateItem} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Category</label>
                <select
                  value={editingItem.item_type}
                  onChange={(e) => setEditingItem({ ...editingItem, item_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container text-xs font-bold outline-none"
                >
                  <optgroup label="Academic Portfolio">
                    <option value="academic_portfolio">Academic Portfolio</option>
                    <option value="project">Capstone / Thesis</option>
                    <option value="sample_work">Work Sample</option>
                  </optgroup>
                  <optgroup label="Credentials">
                    <option value="credential">General Credential</option>
                    <option value="certificate">Certificate / Certification</option>
                  </optgroup>
                  <optgroup label="Academic Records">
                    <option value="academic_record">Academic Record</option>
                    <option value="transcript">Transcript of Records</option>
                    <option value="cor">Certificate of Registration</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Description</label>
                <textarea
                  rows="3"
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container text-xs outline-none"
                ></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-surface-container text-on-surface-variant rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-vibrant-orange text-white rounded-lg text-xs font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Preview Modal — supports images, PDFs (embedded), and download fallback for other formats */}
      {previewItem && (() => {
        const fp = resolveFileUrl(previewItem.file_path || '');
        const fn = previewItem.file_name || previewItem.title || '';
        const isImg = isImageFile(fn, fp);
        const isPdf = isPdfFile(fn, fp);
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setPreviewItem(null)}>
            <div className="bg-white rounded-2xl max-w-3xl w-full p-4 space-y-3 border border-outline-variant shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-on-surface">{previewItem.title}</h3>
                  {previewItem.file_name && (
                    <p className="text-[11px] text-on-surface-variant">📎 {previewItem.file_name} {previewItem.file_size ? `• ${formatFileSize(previewItem.file_size)}` : ''}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {fp && (
                    <a
                      href={fp}
                      download={previewItem.file_name || true}
                      className="px-3 py-1.5 bg-vibrant-orange text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-deep-orange transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">download</span>
                      Download
                    </a>
                  )}
                  <button onClick={() => setPreviewItem(null)} className="p-1.5 text-on-surface-variant hover:text-error transition-colors rounded-lg hover:bg-red-50">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>

              <div className="rounded-xl overflow-hidden border border-outline-variant bg-surface-container-low">
                {isImg && fp ? (
                  <img src={fp} alt={previewItem.title} className="w-full max-h-[70vh] object-contain" />
                ) : isPdf && fp ? (
                  <iframe
                    src={fp}
                    title={previewItem.title}
                    className="w-full h-[70vh] border-0"
                  />
                ) : fp ? (
                  <div className="p-8 text-center space-y-3">
                    <span className="material-symbols-outlined text-[56px] text-on-surface-variant opacity-40">{getFileIcon(previewItem.file_name || previewItem.title)}</span>
                    <p className="text-sm font-bold text-on-surface">Preview not available for this file type</p>
                    <p className="text-xs text-on-surface-variant">Click the Download button above to open or save the file.</p>
                    <a
                      href={fp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-vibrant-orange text-white rounded-lg text-xs font-bold hover:bg-deep-orange transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      Open in New Tab
                    </a>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-sm text-on-surface-variant">No file attached to this item.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
