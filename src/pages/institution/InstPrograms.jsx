import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';

export default function InstPrograms() {
  const [activePrograms, setActivePrograms] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Department Filter & View Mode State
  const [deptFilter, setDeptFilter] = useState('All');
  const [programSearch, setProgramSearch] = useState('');
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' | 'table'

  // Modals & Selectors
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [batchHoursMode, setBatchHoursMode] = useState('ched_default'); // 'ched_default' | 'custom'
  const [batchCustomHours, setBatchCustomHours] = useState(486);
  const [editingProgram, setEditingProgram] = useState(null); // for editing required hours
  const [editHoursValue, setEditHoursValue] = useState(600);

  // Catalog Filters & Batch Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('All');
  const [selectedCatalogIds, setSelectedCatalogIds] = useState([]);
  const [savingBatch, setSavingBatch] = useState(false);

  // Fetch active programs configured by this institution
  const fetchActivePrograms = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inst/programs');
      if (res.success && res.data) {
        setActivePrograms(res.data);
      }
    } catch (err) {
      console.error('Error fetching active programs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch complete nationwide CHED catalog with active flags
  const fetchCatalog = async () => {
    setCatalogLoading(true);
    try {
      const res = await api.get('/inst/catalog-programs');
      if (res.success && res.data) {
        setCatalog(res.data);
      }
    } catch (err) {
      console.error('Error fetching nationwide catalog:', err);
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    fetchActivePrograms();
  }, []);

  const handleOpenCatalog = () => {
    setErrorMsg('');
    setMessage('');
    setModalError('');
    setModalSuccess('');
    setSelectedCatalogIds([]);
    setBatchHoursMode('ched_default');
    fetchCatalog();
    setShowCatalogModal(true);
  };

  // Toggle single catalog selection for batch activation
  const toggleCatalogSelection = (id) => {
    setSelectedCatalogIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Select all visible inactive programs
  const handleSelectAllVisible = (inactiveItems) => {
    const idsToAdd = inactiveItems.map(item => item.master_program_id);
    setSelectedCatalogIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
  };

  // Deselect all visible inactive programs
  const handleDeselectAllVisible = (inactiveItems) => {
    const idsToRemove = new Set(inactiveItems.map(item => item.master_program_id));
    setSelectedCatalogIds(prev => prev.filter(id => !idsToRemove.has(id)));
  };

  // Activate a single program directly from catalog
  const handleActivateSingle = async (masterProg) => {
    setModalError('');
    setModalSuccess('');
    try {
      const res = await api.post('/inst/programs', {
        master_program_id: masterProg.master_program_id,
        required_ojt_hours: masterProg.default_ojt_hours
      });
      if (res.success) {
        setModalSuccess(res.message || `${masterProg.program_name} added to your curricular programs!`);
        setSelectedCatalogIds(prev => prev.filter(id => id !== masterProg.master_program_id));
        fetchActivePrograms();
        fetchCatalog();
      } else {
        setModalError(res.message || 'Failed to activate program.');
      }
    } catch (err) {
      setModalError(err.message || 'An error occurred.');
    }
  };

  // Batch activate all selected courses
  const handleBatchActivate = async () => {
    if (selectedCatalogIds.length === 0) return;
    setSavingBatch(true);
    setModalError('');
    setModalSuccess('');
    setErrorMsg('');
    setMessage('');
    try {
      const payload = {
        master_program_ids: selectedCatalogIds,
        ...(batchHoursMode === 'custom' && batchCustomHours ? { required_ojt_hours: batchCustomHours } : {})
      };
      const res = await api.post('/inst/programs', payload);
      if (res.success) {
        setMessage(res.message || `Activated ${selectedCatalogIds.length} programs successfully!`);
        setShowCatalogModal(false);
        setSelectedCatalogIds([]);
        fetchActivePrograms();
      } else {
        setModalError(res.message || 'Failed to activate selected programs.');
      }
    } catch (err) {
      setModalError(err.message || 'An error occurred.');
    } finally {
      setSavingBatch(false);
    }
  };

  // Edit required OJT hours for an active program
  const handleSaveHours = async (e) => {
    e.preventDefault();
    if (!editingProgram) return;
    try {
      const res = await api.put(`/inst/programs/${editingProgram.program_id}`, {
        required_ojt_hours: editHoursValue
      });
      if (res.success) {
        setMessage(`Updated training requirement for ${editingProgram.program_name} to ${editHoursValue} hours.`);
        setEditingProgram(null);
        fetchActivePrograms();
      } else {
        alert(res.message || 'Failed to update hours.');
      }
    } catch (err) {
      alert(err.message || 'An error occurred.');
    }
  };

  // Remove program from university offerings
  const handleDeleteProgram = async (prog) => {
    if (!window.confirm(`Are you sure you want to remove "${prog.program_name}" from your active university offerings?`)) return;
    try {
      const res = await api.delete(`/inst/programs/${prog.program_id}`);
      if (res.success) {
        setMessage(res.message || 'Program removed from university offerings.');
        fetchActivePrograms();
      } else {
        alert(res.message || 'Failed to remove program.');
      }
    } catch (err) {
      alert(err.message || 'An error occurred.');
    }
  };

    // Unique active departments configured in university offerings
  const activeDepartments = useMemo(() => {
    const set = new Set();
    activePrograms.forEach((p) => {
      const d = p.department || p.discipline || 'General Offerings';
      if (d) set.add(d);
    });
    return ['All', ...Array.from(set).sort()];
  }, [activePrograms]);

  // Department statistics (number of programs, total students)
  const deptStats = useMemo(() => {
    const stats = {};
    activePrograms.forEach((p) => {
      const d = p.department || p.discipline || 'General Offerings';
      if (!stats[d]) stats[d] = { count: 0, students: 0 };
      stats[d].count += 1;
      stats[d].students += parseInt(p.student_count || 0, 10);
    });
    return stats;
  }, [activePrograms]);

  // Filter active programs by selected department and search query
  const filteredPrograms = useMemo(() => {
    return activePrograms.filter((p) => {
      const d = p.department || p.discipline || 'General Offerings';
      const matchesDept = deptFilter === 'All' || d === deptFilter;
      const q = programSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.program_name?.toLowerCase().includes(q) ||
        p.program_code?.toLowerCase().includes(q) ||
        p.department?.toLowerCase().includes(q) ||
        p.discipline?.toLowerCase().includes(q);
      return matchesDept && matchesSearch;
    });
  }, [activePrograms, deptFilter, programSearch]);

  // Group filtered programs by academic department
  const groupedPrograms = useMemo(() => {
    const groups = {};
    filteredPrograms.forEach((p) => {
      const d = p.department || p.discipline || 'General Offerings';
      if (!groups[d]) groups[d] = [];
      groups[d].push(p);
    });
    return groups;
  }, [filteredPrograms]);

  const getDepartmentIcon = (deptName = '') => {
    const name = deptName.toLowerCase();
    if (name.includes('comput') || name.includes('information') || name.includes('it')) return 'terminal';
    if (name.includes('business') || name.includes('account') || name.includes('finance')) return 'account_balance';
    if (name.includes('engineer') || name.includes('arch')) return 'architecture';
    if (name.includes('educ') || name.includes('teach')) return 'school';
    if (name.includes('tourism') || name.includes('hospital')) return 'travel_explore';
    if (name.includes('crim') || name.includes('safety') || name.includes('law')) return 'shield';
    if (name.includes('agri') || name.includes('environ') || name.includes('fish')) return 'eco';
    if (name.includes('human') || name.includes('social') || name.includes('public admin')) return 'public';
    return 'domain';
  };

  // Filter catalog by search query and discipline
  const disciplines = ['All', ...Array.from(new Set(catalog.map(c => c.discipline))).filter(Boolean)];

  const filteredCatalog = catalog.filter(prog => {
    const matchesSearch = 
      prog.program_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prog.program_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prog.discipline && prog.discipline.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDiscipline = selectedDiscipline === 'All' || prog.discipline === selectedDiscipline;
    return matchesSearch && matchesDiscipline;
  });

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Academic Programs & OJT Matrices</h1>
          <p className="text-sm text-on-surface-variant">
            Select standardized CHED curricular degree programs nationwide, organize by department, and configure institutional training hours.
          </p>
        </div>

        <button
          onClick={handleOpenCatalog}
          className="px-5 py-2.5 bg-vibrant-orange text-white rounded-lg font-bold text-sm hover:bg-deep-orange transition-colors shadow-sm flex items-center gap-2 self-start sm:self-auto whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[18px]">library_add</span>
          <span>+ Select from Nationwide Catalog</span>
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className="p-3.5 bg-green-tint text-pinoy-green rounded-xl text-xs font-bold flex items-center gap-2 border border-pinoy-green/20 animate-fade-in">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{message}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-error-container text-error rounded-xl text-xs font-bold flex items-center gap-2 border border-error/20 animate-fade-in">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bento-card flex items-center gap-3.5 p-4">
          <div className="p-3 rounded-xl bg-orange-tint/40 text-vibrant-orange flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">school</span>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Active Offerings</p>
            <h3 className="text-2xl font-bold text-on-surface">
              {activePrograms.length} Courses
              <span className="text-xs font-normal text-on-surface-variant ml-1">
                across {activeDepartments.length > 1 ? activeDepartments.length - 1 : 0} Depts
              </span>
            </h3>
          </div>
        </div>

        <div className="bento-card flex items-center gap-3.5 p-4">
          <div className="p-3 rounded-xl bg-green-tint text-pinoy-green flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">groups</span>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Total Enrolled Interns</p>
            <h3 className="text-2xl font-bold text-on-surface">
              {activePrograms.reduce((sum, p) => sum + parseInt(p.student_count || 0, 10), 0)} Students
            </h3>
          </div>
        </div>

        <div className="bento-card flex items-center gap-3.5 p-4">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">verified</span>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Standard Catalog</p>
            <h3 className="text-2xl font-bold text-on-surface">80+ CHED Accredited</h3>
          </div>
        </div>
      </div>

      {/* ACTIVE PROGRAMS LIST WITH DEPARTMENT FILTERING & GROUPING */}
      <div className="space-y-4">
        {/* Main Section Controls Bar */}
        <div className="bento-card space-y-4 p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-outline-variant pb-3">
            <div>
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span>Active University Offerings</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-tint text-vibrant-orange border border-vibrant-orange/30">
                  {filteredPrograms.length} {filteredPrograms.length === 1 ? 'Program' : 'Programs'}
                </span>
              </h2>
              <p className="text-xs text-on-surface-variant">
                Filter by academic department, search course codes, and manage institutional OJT training requirements.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
              {/* View Mode Switcher */}
              <div className="inline-flex rounded-xl bg-surface-container p-1 text-xs font-bold border border-outline-variant">
                <button
                  type="button"
                  onClick={() => setViewMode('grouped')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    viewMode === 'grouped'
                      ? 'bg-vibrant-orange text-white shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">grid_view</span>
                  <span>Group by Department</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    viewMode === 'table'
                      ? 'bg-vibrant-orange text-white shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">table_rows</span>
                  <span>Flat Table</span>
                </button>
              </div>

              <button
                onClick={handleOpenCatalog}
                className="text-xs font-bold text-vibrant-orange hover:underline flex items-center gap-1 ml-2"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>Add More Courses</span>
              </button>
            </div>
          </div>

          {/* Search and Department Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search active courses by name, code (BSIT, BSA...), or department..."
                value={programSearch}
                onChange={(e) => setProgramSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-xs text-on-surface outline-none focus:border-vibrant-orange focus:ring-1 focus:ring-vibrant-orange"
              />
              {programSearch && (
                <button
                  type="button"
                  onClick={() => setProgramSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Department Filter Chips / Tabs */}
          {activeDepartments.length > 1 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block">
                Filter by Academic Department / College:
              </span>
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                {activeDepartments.map((dept) => {
                  const isAll = dept === 'All';
                  const count = isAll ? activePrograms.length : (deptStats[dept]?.count || 0);
                  const isSelected = deptFilter === dept;
                  const iconName = isAll ? 'apps' : getDepartmentIcon(dept);

                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setDeptFilter(dept)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border shrink-0 ${
                        isSelected
                          ? 'bg-vibrant-orange text-white border-vibrant-orange shadow-sm'
                          : 'bg-surface-container-low hover:bg-surface-container text-on-surface border-outline-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{iconName}</span>
                      <span>{dept}</span>
                      <span
                        className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Content Views */}
        {loading ? (
          <div className="bento-card p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
          </div>
        ) : activePrograms.length === 0 ? (
          <div className="bento-card text-center py-12 text-on-surface-variant space-y-3">
            <div className="p-3 bg-surface-container rounded-full w-12 h-12 flex items-center justify-center mx-auto text-on-surface-variant">
              <span className="material-symbols-outlined text-[28px]">library_books</span>
            </div>
            <div>
              <p className="text-base font-bold text-on-surface">No Curricular Programs Configured</p>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto mt-1">
                Select your academic programs directly from the nationwide CHED catalog to avoid manual data entry and duplicate records.
              </p>
            </div>
            <button
              onClick={handleOpenCatalog}
              className="px-4 py-2 bg-vibrant-orange text-white rounded-lg font-bold text-xs hover:bg-deep-orange transition-colors"
            >
              Browse Nationwide Catalog
            </button>
          </div>
        ) : filteredPrograms.length === 0 ? (
          <div className="bento-card text-center py-12 text-on-surface-variant space-y-3">
            <div className="p-3 bg-surface-container rounded-full w-12 h-12 flex items-center justify-center mx-auto text-on-surface-variant">
              <span className="material-symbols-outlined text-[28px]">search_off</span>
            </div>
            <div>
              <p className="text-base font-bold text-on-surface">No Courses Found Matching Filters</p>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto mt-1">
                No active offerings matched your search &quot;{programSearch}&quot; in {deptFilter === 'All' ? 'any department' : deptFilter}.
              </p>
            </div>
            <button
              onClick={() => {
                setProgramSearch('');
                setDeptFilter('All');
              }}
              className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg font-bold text-xs transition-colors inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Reset Filters</span>
            </button>
          </div>
        ) : viewMode === 'grouped' ? (
          /* GROUP BY DEPARTMENT VIEW */
          <div className="space-y-6 animate-fade-in">
            {Object.entries(groupedPrograms).map(([deptName, deptPrograms]) => {
              const deptIcon = getDepartmentIcon(deptName);
              const totalStudents = deptPrograms.reduce((sum, p) => sum + parseInt(p.student_count || 0, 10), 0);

              return (
                <div key={deptName} className="bento-card space-y-4 overflow-hidden">
                  {/* Department Section Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant pb-3 bg-surface-container-lowest/50 -m-5 sm:-m-6 p-4 sm:p-5 mb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-tint/50 text-vibrant-orange flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[22px]">{deptIcon}</span>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-on-surface flex items-center gap-2 flex-wrap">
                          <span>{deptName}</span>
                        </h3>
                        <p className="text-xs text-on-surface-variant">
                          Academic Department / College Offerings
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-surface-container text-on-surface border border-outline-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">school</span>
                        <span>{deptPrograms.length} {deptPrograms.length === 1 ? 'Program' : 'Programs'}</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-tint text-pinoy-green border border-pinoy-green/20 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">groups</span>
                        <span>{totalStudents} Enrolled</span>
                      </span>
                    </div>
                  </div>

                  {/* Table of courses in this department */}
                  <div className="overflow-x-auto pt-2">
                    <table className="w-full text-left text-xs min-w-[700px]">
                      <thead>
                        <tr className="border-b border-outline-variant text-on-surface-variant font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
                          <th className="py-2.5 px-3">Degree Program / Course</th>
                          <th className="py-2.5 px-3">Code</th>
                          <th className="py-2.5 px-3 text-center">Required Training Hours</th>
                          <th className="py-2.5 px-3 text-center">Enrolled Interns</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container">
                        {deptPrograms.map((p) => (
                          <tr key={p.program_id} className="hover:bg-surface-container-low transition-colors">
                            <td className="py-3 px-3">
                              <p className="font-bold text-on-surface text-sm">{p.program_name}</p>
                              {p.description && (
                                <p className="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5">{p.description}</p>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-surface-container text-on-surface border border-outline-variant/60">
                                {p.program_code}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold bg-orange-tint/40 text-vibrant-orange border border-vibrant-orange/20">
                                <span className="material-symbols-outlined text-[14px]">timer</span>
                                <span>{p.required_ojt_hours} hrs</span>
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-on-surface">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface">
                                <span className="material-symbols-outlined text-[13px] text-on-surface-variant">person</span>
                                <span>{p.student_count || 0}</span>
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingProgram(p);
                                    setEditHoursValue(p.required_ojt_hours);
                                  }}
                                  title="Adjust required training hours"
                                  className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs transition-colors flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[14px]">edit</span>
                                  <span>Edit Hours</span>
                                </button>

                                <button
                                  onClick={() => handleDeleteProgram(p)}
                                  title="Remove from offerings"
                                  className="p-1 rounded-lg text-error hover:bg-error-container transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* FLAT TABLE VIEW */
          <div className="bento-card overflow-x-auto p-0 animate-fade-in">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-on-surface-variant font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
                  <th className="py-3.5 px-4">Degree Program / Course</th>
                  <th className="py-3.5 px-4">Code</th>
                  <th className="py-3.5 px-4">Department / College</th>
                  <th className="py-3.5 px-4 text-center">Required Hours</th>
                  <th className="py-3.5 px-4 text-center">Enrolled</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {filteredPrograms.map((p) => (
                  <tr key={p.program_id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-on-surface text-sm">{p.program_name}</p>
                      {p.description && (
                        <p className="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5">{p.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-surface-container text-on-surface border border-outline-variant/60">
                        {p.program_code}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-vibrant-orange">
                          {getDepartmentIcon(p.department || p.discipline)}
                        </span>
                        <span className="text-on-surface font-semibold">
                          {p.department || p.discipline || 'General'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold bg-orange-tint/40 text-vibrant-orange border border-vibrant-orange/20">
                        <span className="material-symbols-outlined text-[14px]">timer</span>
                        <span>{p.required_ojt_hours} hrs</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-on-surface">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface">
                        <span className="material-symbols-outlined text-[13px] text-on-surface-variant">person</span>
                        <span>{p.student_count || 0}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingProgram(p);
                            setEditHoursValue(p.required_ojt_hours);
                          }}
                          title="Adjust required training hours"
                          className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                          <span>Edit Hours</span>
                        </button>

                        <button
                          onClick={() => handleDeleteProgram(p)}
                          title="Remove from offerings"
                          className="p-1 rounded-lg text-error hover:bg-error-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* NATIONWIDE CHED CATALOG MODAL */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl border border-outline-variant shadow-2xl w-full max-w-4xl space-y-4 max-h-[90vh] flex flex-col p-6">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-outline-variant pb-3 shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase text-vibrant-orange tracking-wider block mb-0.5">
                  Standardized Curriculum Catalog
                </span>
                <h2 className="text-xl font-bold text-on-surface">Nationwide CHED Degree Programs Catalog</h2>
                <p className="text-xs text-on-surface-variant">
                  Select accredited degree programs to activate in your university. Standard CHED course titles and codes prevent duplication across institutions.
                </p>
              </div>

              <button
                onClick={() => setShowCatalogModal(false)}
                className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* In-Modal Alerts */}
            {modalSuccess && (
              <div className="p-3 bg-green-tint text-pinoy-green rounded-xl text-xs font-bold flex items-center justify-between gap-2 border border-pinoy-green/20 shrink-0 animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>{modalSuccess}</span>
                </div>
                <button type="button" onClick={() => setModalSuccess('')} className="hover:opacity-75">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            )}

            {modalError && (
              <div className="p-3 bg-error-container text-error rounded-xl text-xs font-bold flex items-center justify-between gap-2 border border-error/20 shrink-0 animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{modalError}</span>
                </div>
                <button type="button" onClick={() => setModalError('')} className="hover:opacity-75">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            )}

            {/* Search & Discipline Filter Bar */}
            <div className="space-y-3 shrink-0">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search by degree title, code (e.g. BSIT, BSA, BSCE), or discipline..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-xs text-on-surface outline-none focus:border-vibrant-orange"
                />
              </div>

              {/* Discipline Filter Pills & Selection Shortcuts */}
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs max-w-full">
                  {disciplines.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDiscipline(d)}
                      className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${selectedDiscipline === d
                          ? 'bg-vibrant-orange text-white shadow-sm'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                        }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>

                {/* Batch selection shortcut */}
                {(() => {
                  const availableInactiveFiltered = filteredCatalog.filter(c => c.is_active_in_institution !== 1);
                  const allVisibleSelected = availableInactiveFiltered.length > 0 && availableInactiveFiltered.every(c => selectedCatalogIds.includes(c.master_program_id));

                  if (availableInactiveFiltered.length === 0) return null;

                  return (
                    <div className="flex items-center gap-2 text-xs">
                      {allVisibleSelected ? (
                        <button
                          type="button"
                          onClick={() => handleDeselectAllVisible(availableInactiveFiltered)}
                          className="px-3 py-1 text-[11px] font-bold text-error bg-error-container/40 hover:bg-error-container rounded-lg transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[15px]">remove_done</span>
                          <span>Deselect Visible ({availableInactiveFiltered.length})</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectAllVisible(availableInactiveFiltered)}
                          className="px-3 py-1 text-[11px] font-bold text-vibrant-orange bg-orange-tint/40 hover:bg-vibrant-orange hover:text-white rounded-lg transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[15px]">done_all</span>
                          <span>Select All Visible ({availableInactiveFiltered.length})</span>
                        </button>
                      )}
                      {selectedCatalogIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedCatalogIds([])}
                          className="px-2.5 py-1 text-[11px] font-bold text-on-surface-variant hover:text-on-surface bg-surface-container rounded-lg transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Catalog List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {catalogLoading ? (
                <div className="p-12 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
                </div>
              ) : filteredCatalog.length === 0 ? (
                <div className="text-center py-10 text-on-surface-variant text-xs">
                  No degree programs matching "{searchQuery}" in {selectedDiscipline}.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {filteredCatalog.map((item) => {
                    const isActive = item.is_active_in_institution === 1;
                    const isSelected = selectedCatalogIds.includes(item.master_program_id);

                    return (
                      <div
                        key={item.master_program_id}
                        onClick={() => {
                          if (!isActive) toggleCatalogSelection(item.master_program_id);
                        }}
                        className={`p-3 rounded-xl border transition-all flex flex-col justify-between text-xs ${isActive
                            ? 'bg-green-tint/30 border-pinoy-green/30'
                            : isSelected
                              ? 'bg-orange-tint/40 border-vibrant-orange shadow-sm cursor-pointer ring-1 ring-vibrant-orange'
                              : 'bg-surface-container-low border-outline-variant hover:border-vibrant-orange/40 cursor-pointer'
                          }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {!isActive && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleCatalogSelection(item.master_program_id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="rounded text-vibrant-orange focus:ring-vibrant-orange cursor-pointer"
                                />
                              )}
                              <span className="font-bold text-on-surface text-sm truncate">{item.program_name}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-surface text-on-surface border border-outline-variant shrink-0">
                              {item.program_code}
                            </span>
                          </div>

                          <p className="text-[11px] text-on-surface-variant line-clamp-2">
                            {item.description || item.discipline}
                          </p>

                          <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-1 border-t border-outline-variant/40">
                            <span className="font-medium">{item.discipline}</span>
                            <span className="font-bold text-vibrant-orange">
                              Default: {item.default_ojt_hours} hrs
                            </span>
                          </div>
                        </div>

                        {/* Action Footer */}
                        <div className="pt-2 mt-2 border-t border-outline-variant/40 flex justify-end">
                          {isActive ? (
                            <span className="text-[11px] font-bold text-pinoy-green flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              <span>Active ({item.current_ojt_hours} hrs)</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleActivateSingle(item);
                              }}
                              className="px-3 py-1 bg-surface-container hover:bg-vibrant-orange hover:text-white rounded-lg text-[11px] font-bold text-on-surface transition-colors cursor-pointer"
                            >
                              + Activate Course
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="border-t border-outline-variant pt-3 shrink-0 flex justify-between items-center flex-wrap gap-3">
              <div className="flex items-center gap-3 flex-wrap text-xs">
                {selectedCatalogIds.length > 0 ? (
                  <>
                    <span className="font-bold text-xs text-vibrant-orange bg-orange-tint/40 px-3 py-1 rounded-full border border-vibrant-orange/20">
                      {selectedCatalogIds.length} course{selectedCatalogIds.length > 1 ? 's' : ''} selected
                    </span>

                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                      <span className="font-medium text-[11px]">Training Hours:</span>
                      <select
                        value={batchHoursMode}
                        onChange={(e) => setBatchHoursMode(e.target.value)}
                        className="px-2 py-1 bg-surface-container text-xs font-bold rounded-lg border border-outline-variant outline-none"
                      >
                        <option value="ched_default">Standard CHED Defaults</option>
                        <option value="custom">Custom Hours</option>
                      </select>
                      {batchHoursMode === 'custom' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="100"
                            max="2500"
                            value={batchCustomHours}
                            onChange={(e) => setBatchCustomHours(parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-surface text-xs font-bold rounded-lg border border-outline-variant outline-none focus:border-vibrant-orange"
                            placeholder="Hours"
                          />
                          <span className="text-[11px] font-bold">hrs</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-on-surface-variant">
                    Click checkboxes or cards to select degree programs for batch activation.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCatalogModal(false)}
                  className="px-4 py-2 bg-surface-container text-on-surface rounded-lg font-bold text-xs hover:bg-surface-container-high cursor-pointer"
                >
                  Close
                </button>

                {selectedCatalogIds.length > 0 && (
                  <button
                    type="button"
                    disabled={savingBatch}
                    onClick={handleBatchActivate}
                    className="px-5 py-2 bg-vibrant-orange text-white rounded-lg font-bold text-xs hover:bg-deep-orange transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    {savingBatch && <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>}
                    <span className="material-symbols-outlined text-[16px]">library_add_check</span>
                    <span>Activate Selected Programs ({selectedCatalogIds.length})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT REQUIRED OJT HOURS MODAL */}
      {editingProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl border border-outline-variant shadow-2xl w-full max-w-md space-y-4 p-6">
            <div className="flex justify-between items-start border-b border-outline-variant pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-vibrant-orange tracking-wider block">
                  Curriculum Matrix Configuration
                </span>
                <h3 className="font-bold text-base text-on-surface">{editingProgram.program_name}</h3>
                <p className="text-xs text-on-surface-variant">Course Code: {editingProgram.program_code}</p>
              </div>
              <button
                onClick={() => setEditingProgram(null)}
                className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveHours} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-on-surface block mb-1">
                  Standard Required Training Hours (OJT) *
                </label>
                <p className="text-[11px] text-on-surface-variant mb-2">
                  Specify the total required hours for students under this curriculum. This value dictates the threshold for OJT completion certificates.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="100"
                    max="2500"
                    required
                    value={editHoursValue}
                    onChange={(e) => setEditHoursValue(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface text-sm font-bold outline-none focus:border-vibrant-orange"
                  />
                  <span className="text-xs font-bold text-on-surface-variant shrink-0">Hours</span>
                </div>
              </div>

              <div className="pt-2 border-t border-outline-variant flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProgram(null)}
                  className="px-4 py-2 bg-surface-container text-on-surface rounded-lg font-bold hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-vibrant-orange text-white rounded-lg font-bold hover:bg-deep-orange transition-colors shadow-sm"
                >
                  Save Training Hours
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
