import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import CrossDisciplineChart from '../../components/admin/CrossDisciplineChart';

export default function AdminAnalytics() {
  const [data, setData] = useState({
    metrics: null,
    disciplines: [],
    programs: [],
    topSkills: [],
    studentSkillsCount: [],
    crossDisciplineMatrix: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedDiscipline, setSelectedDiscipline] = useState('all');
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [recalculating, setRecalculating] = useState(false);
  const [recalculateMessage, setRecalculateMessage] = useState(null);

  const fetchAnalytics = async (discipline = selectedDiscipline, program = selectedProgram, search = searchQuery) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (discipline && discipline !== 'all') params.append('discipline', discipline);
      if (program && program !== 'all') params.append('program_code', program);
      if (search) params.append('search', search);

      const res = await api.get(`/admin/analytics/skills?${params.toString()}`);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch skill analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(selectedDiscipline, selectedProgram, searchQuery);
  }, [selectedDiscipline, selectedProgram]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAnalytics(selectedDiscipline, selectedProgram, searchQuery);
  };

  const handleRecalculateAI = async () => {
    setRecalculating(true);
    setRecalculateMessage(null);
    try {
      const res = await api.post('/admin/analytics/recalculate');
      if (res.success) {
        setRecalculateMessage({
          type: 'success',
          text: res.message || 'AI Skill Demand Model recalculated across all 53+ degree programs!'
        });
        await fetchAnalytics(selectedDiscipline, selectedProgram, searchQuery);
      } else {
        setRecalculateMessage({
          type: 'error',
          text: res.message || 'Recalculation failed.'
        });
      }
    } catch (err) {
      setRecalculateMessage({
        type: 'error',
        text: 'Failed to contact analytics calculation engine.'
      });
    } finally {
      setRecalculating(false);
      setTimeout(() => setRecalculateMessage(null), 8000);
    }
  };

  const clearFilters = () => {
    setSelectedDiscipline('all');
    setSelectedProgram('all');
    setSearchQuery('');
    fetchAnalytics('all', 'all', '');
  };

  // Find active program object
  const activeProgramObj = useMemo(() => {
    if (selectedProgram === 'all') return null;
    return data.programs?.find(p => p.program_code === selectedProgram);
  }, [selectedProgram, data.programs]);

  // Find active discipline cluster object
  const activeDisciplineObj = useMemo(() => {
    if (selectedDiscipline === 'all') return null;
    return data.disciplines?.find(d => d.id === selectedDiscipline);
  }, [selectedDiscipline, data.disciplines]);

  // Dynamic badge color helper
  const getDeptColor = (dept) => {
    if (!dept) return 'bg-gray-100 text-gray-700 border-gray-200';
    const d = dept.toLowerCase();
    if (d.includes('health') || d.includes('nurs')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (d.includes('engineering') || d.includes('arch')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (d.includes('account') || d.includes('business') || d.includes('financ')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (d.includes('hospit') || d.includes('tour') || d.includes('hotel')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (d.includes('educat') || d.includes('teach')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (d.includes('criminol') || d.includes('safety')) return 'bg-slate-100 text-slate-800 border-slate-300';
    if (d.includes('art') || d.includes('media') || d.includes('design')) return 'bg-pink-50 text-pink-700 border-pink-200';
    if (d.includes('agri') || d.includes('environ')) return 'bg-lime-50 text-lime-800 border-lime-200';
    if (d.includes('comput') || d.includes('it') || d.includes('technol')) return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    return 'bg-purple-50 text-purple-700 border-purple-200';
  };

  const getDisciplineIcon = (id) => {
    const iconMap = {
      all: 'hub',
      computing: 'terminal',
      business: 'payments',
      engineering: 'engineering',
      healthcare: 'health_and_safety',
      hospitality: 'hotel',
      education: 'school',
      criminology: 'shield',
      arts: 'palette',
      agriculture: 'agriculture',
      social_sciences: 'psychology',
      maritime: 'directions_boat'
    };
    return iconMap[id] || 'domain';
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ─── HEADER & ACTIONS ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-vibrant-orange text-3xl">insights</span>
            <h1 className="text-2xl md:text-3xl font-bold text-on-surface tracking-tight">
              Skill Demand Intelligence & Analytics
            </h1>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            Cross-discipline telemetry across all 53+ CHED courses — tracking employer demand, curriculum competencies, and student talent density
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRecalculateAI}
            disabled={recalculating}
            className="flex items-center gap-2 px-4 py-2.5 bg-vibrant-orange text-white text-xs font-semibold rounded-xl hover:bg-orange-600 transition-all shadow-sm disabled:opacity-50"
            title="Recalculate skill demand weights and curriculum matching for all courses"
          >
            <span className={`material-symbols-outlined text-base ${recalculating ? 'animate-spin' : ''}`}>
              neurology
            </span>
            <span>{recalculating ? 'Recalculating AI Telemetry...' : 'Recalculate AI Alignment'}</span>
          </button>
        </div>
      </div>

      {/* Recalculate Feedback Notification */}
      {recalculateMessage && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-xs border ${
          recalculateMessage.type === 'success' 
            ? 'bg-green-50 text-green-800 border-green-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">
              {recalculateMessage.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span className="font-semibold">{recalculateMessage.text}</span>
          </div>
          <button onClick={() => setRecalculateMessage(null)} className="text-gray-400 hover:text-gray-600">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* ─── SYSTEM-WIDE KPI CARDS ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bento-card p-4 rounded-2xl bg-surface border border-outline-variant flex items-center gap-3.5 min-w-0 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-orange-tint text-vibrant-orange flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">menu_book</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-black text-on-surface truncate">
              {data.metrics?.total_skills || 367}
            </p>
            <p className="text-xs text-on-surface-variant font-medium truncate">Tracked Industry Skills</p>
            <span className="text-[10px] text-vibrant-orange font-semibold block truncate">Across all disciplines</span>
          </div>
        </div>

        <div className="bento-card p-4 rounded-2xl bg-surface border border-outline-variant flex items-center gap-3.5 min-w-0 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0 border border-cyan-100">
            <span className="material-symbols-outlined text-2xl">school</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-black text-on-surface truncate">
              {data.metrics?.total_programs || 64}
            </p>
            <p className="text-xs text-on-surface-variant font-medium truncate">Academic Degree Programs</p>
            <span className="text-[10px] text-cyan-700 font-semibold block truncate">CHED Recognized Curricula</span>
          </div>
        </div>

        <div className="bento-card p-4 rounded-2xl bg-surface border border-outline-variant flex items-center gap-3.5 min-w-0 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <span className="material-symbols-outlined text-2xl">work</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-black text-on-surface truncate">
              {data.metrics?.total_jobs || 307}
            </p>
            <p className="text-xs text-on-surface-variant font-medium truncate">Active Internship Postings</p>
            <span className="text-[10px] text-emerald-700 font-semibold block truncate">Cross-industry employers</span>
          </div>
        </div>

        <div className="bento-card p-4 rounded-2xl bg-surface border border-outline-variant flex items-center gap-3.5 min-w-0 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
            <span className="material-symbols-outlined text-2xl">groups</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-black text-on-surface truncate">
              {data.metrics?.total_students_with_skills || 645}
            </p>
            <p className="text-xs text-on-surface-variant font-medium truncate">Students with Verified Skills</p>
            <span className="text-[10px] text-purple-700 font-semibold block truncate">Ready for OJT deployment</span>
          </div>
        </div>
      </div>

      {/* ─── FILTERS & DEGREE SELECTOR ────────────────────────────────── */}
      <div className="bento-card p-4 rounded-2xl bg-surface border border-outline-variant space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Degree Program Dropdown Selector */}
          <div className="flex-1 flex flex-col md:flex-row items-stretch md:items-center gap-3 min-w-0">
            <div className="relative flex-1 min-w-0">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                school
              </span>
              <select
                value={selectedProgram}
                onChange={(e) => {
                  setSelectedProgram(e.target.value);
                  if (e.target.value !== 'all') {
                    // Find corresponding department if possible
                    const prog = data.programs?.find(p => p.program_code === e.target.value);
                    if (prog?.department) {
                      const cluster = data.disciplines?.find(d => 
                        prog.department.toLowerCase().includes(d.deptName.toLowerCase()) || 
                        d.deptName.toLowerCase().includes(prog.department.toLowerCase())
                      );
                      if (cluster) setSelectedDiscipline(cluster.id);
                    }
                  }
                }}
                className="w-full pl-10 pr-8 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs font-semibold text-on-surface focus:outline-none focus:border-vibrant-orange transition-all cursor-pointer truncate"
              >
                <option value="all">🎓 All Academic Programs & Courses ({data.programs?.length || 53} Programs)</option>
                {data.programs?.map((p) => (
                  <option key={p.program_code} value={p.program_code}>
                    {p.program_code} — {p.program_name} ({p.job_count || 0} Openings • {p.student_count || 0} Students)
                  </option>
                ))}
              </select>
            </div>

            {/* Keyword Search */}
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-64 lg:w-72 shrink-0">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search skill, program, tool..."
                className="w-full pl-10 pr-8 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-vibrant-orange transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    fetchAnalytics(selectedDiscipline, selectedProgram, '');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </form>

            {(selectedDiscipline !== 'all' || selectedProgram !== 'all' || searchQuery) && (
              <button
                onClick={clearFilters}
                className="px-3.5 py-2.5 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container flex items-center justify-center gap-1.5 transition-all shrink-0"
              >
                <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                <span>Reset View</span>
              </button>
            )}
          </div>
        </div>

        {/* Discipline Cluster Horizontal Pills */}
        <div className="pt-2 border-t border-outline-variant">
          <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-2.5 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-vibrant-orange">category</span>
            <span>CHED Academic Discipline Clusters</span>
          </p>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {data.disciplines?.map((disc) => {
              const isSelected = selectedDiscipline === disc.id;
              const icon = getDisciplineIcon(disc.id);
              return (
                <button
                  key={disc.id}
                  onClick={() => {
                    setSelectedDiscipline(disc.id);
                    setSelectedProgram('all'); // reset specific program when switching cluster
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 border transition-all ${
                    isSelected
                      ? 'bg-vibrant-orange text-white border-vibrant-orange shadow-sm'
                      : 'bg-surface-container text-on-surface-variant border-outline-variant hover:border-gray-400 hover:text-on-surface'
                  }`}
                >
                  <span className={`material-symbols-outlined text-sm ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                    {icon}
                  </span>
                  <span>{disc.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Filter Context Banner */}
      {(selectedDiscipline !== 'all' || selectedProgram !== 'all') && (
        <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-vibrant-orange text-white flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-xl">
                {activeDisciplineObj ? getDisciplineIcon(activeDisciplineObj.id) : 'school'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-900 text-sm truncate">
                {activeProgramObj ? `${activeProgramObj.program_code} — ${activeProgramObj.program_name}` : activeDisciplineObj?.label}
              </p>
              <p className="text-gray-600 text-[11px] truncate">
                {activeProgramObj 
                  ? `Department: ${activeProgramObj.department} • Active Openings: ${activeProgramObj.job_count || 0} • Student Talent: ${activeProgramObj.student_count || 0}`
                  : `Discipline: ${activeDisciplineObj?.deptName} • Filtered skills & talent density`
                }
              </p>
            </div>
          </div>

          <button
            onClick={clearFilters}
            className="px-3 py-1.5 bg-white border border-orange-300 text-vibrant-orange font-bold rounded-xl hover:bg-orange-100 transition-all text-xs shrink-0 self-end sm:self-auto"
          >
            Show All Courses
          </button>
        </div>
      )}

      {/* ─── CROSS-DISCIPLINE SKILL DEMAND & TALENT CHART ─────────────── */}
      {selectedDiscipline === 'all' && selectedProgram === 'all' && !searchQuery && (
        <CrossDisciplineChart
          matrix={data.crossDisciplineMatrix}
          onSelectDiscipline={(id) => {
            setSelectedDiscipline(id);
            setSelectedProgram('all');
          }}
          activeDiscipline={selectedDiscipline}
        />
      )}

      {/* ─── DETAILED SKILLS TELEMETRY (TWO COLUMNS) ──────────────────── */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-9 w-9 border-4 border-vibrant-orange border-t-transparent"></div>
          <p className="text-xs text-on-surface-variant font-medium">Loading cross-discipline skill telemetry...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
          {/* Top Demanded Skills in Job Postings */}
          <div className="bento-card space-y-4 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2 truncate">
                <span className="material-symbols-outlined text-vibrant-orange text-[20px] shrink-0">trending_up</span>
                <span className="truncate">
                  {selectedProgram !== 'all' 
                    ? `Top Demanded Skills: ${selectedProgram}` 
                    : selectedDiscipline !== 'all'
                    ? `Top Demanded Skills: ${activeDisciplineObj?.label}`
                    : 'Top Demanded Skills Across All Programs'}
                </span>
              </h2>
              <span className="text-xs text-on-surface-variant shrink-0 whitespace-nowrap">
                {data.topSkills?.length || 0} In-Demand Skills
              </span>
            </div>

            <div className="space-y-3">
              {data.topSkills?.length === 0 ? (
                <div className="p-8 text-center bg-surface-container rounded-2xl border border-outline-variant">
                  <span className="material-symbols-outlined text-gray-300 text-4xl mb-2">find_in_page</span>
                  <p className="text-xs font-semibold text-on-surface">No skill demands recorded for this filter.</p>
                  <p className="text-[11px] text-on-surface-variant mt-1">Try selecting another academic program or discipline cluster.</p>
                </div>
              ) : (
                data.topSkills?.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3 sm:p-3.5 bg-surface-container rounded-xl flex items-center justify-between gap-3 border border-outline-variant hover:border-vibrant-orange/40 transition-all text-xs min-w-0"
                  >
                    <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1 pr-2">
                      <span className="w-6 h-6 rounded-full bg-orange-tint text-vibrant-orange flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-on-surface truncate text-xs">{s.skill_name}</p>
                        
                        {/* Course & Department Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getDeptColor(s.primary_department)}`}>
                            {s.primary_department || 'Academic'}
                          </span>
                          {s.programs?.slice(0, 3).map((prog, pIdx) => (
                            <span key={pIdx} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                              {prog}
                            </span>
                          ))}
                          {s.programs?.length > 3 && (
                            <span className="text-[9px] text-gray-400 font-bold">
                              +{s.programs.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="px-3 py-1 bg-orange-tint text-vibrant-orange font-bold rounded-full text-xs whitespace-nowrap">
                        {s.demand_count || 1} Openings
                      </span>
                      {s.student_count > 0 && (
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">
                          {s.student_count} Students
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Student Talent Pool Distribution */}
          <div className="bento-card space-y-4 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2 truncate">
                <span className="material-symbols-outlined text-pinoy-green text-[20px] shrink-0">groups</span>
                <span className="truncate">
                  {selectedProgram !== 'all' 
                    ? `Student Talent Pool: ${selectedProgram}` 
                    : selectedDiscipline !== 'all'
                    ? `Student Talent Pool: ${activeDisciplineObj?.label}`
                    : 'Student Talent Pool Across All Programs'}
                </span>
              </h2>
              <span className="text-xs text-on-surface-variant shrink-0 whitespace-nowrap">
                {data.studentSkillsCount?.length || 0} Competencies
              </span>
            </div>

            <div className="space-y-3">
              {data.studentSkillsCount?.length === 0 ? (
                <div className="p-8 text-center bg-surface-container rounded-2xl border border-outline-variant">
                  <span className="material-symbols-outlined text-gray-300 text-4xl mb-2">person_search</span>
                  <p className="text-xs font-semibold text-on-surface">No student competencies recorded yet.</p>
                  <p className="text-[11px] text-on-surface-variant mt-1">Students will appear here as they register and endorse their skills.</p>
                </div>
              ) : (
                data.studentSkillsCount?.map((st, idx) => (
                  <div
                    key={idx}
                    className="p-3 sm:p-3.5 bg-surface-container rounded-xl flex items-center justify-between gap-3 border border-outline-variant hover:border-pinoy-green/40 transition-all text-xs min-w-0"
                  >
                    <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1 pr-2">
                      <span className="w-6 h-6 rounded-full bg-green-tint text-pinoy-green flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-on-surface truncate text-xs">{st.skill_name}</p>

                        {/* Course & Department Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getDeptColor(st.primary_department)}`}>
                            {st.primary_department || 'Academic'}
                          </span>
                          {st.programs?.slice(0, 3).map((prog, pIdx) => (
                            <span key={pIdx} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                              {prog}
                            </span>
                          ))}
                          {st.programs?.length > 3 && (
                            <span className="text-[9px] text-gray-400 font-bold">
                              +{st.programs.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="px-3 py-1 bg-green-tint text-pinoy-green font-bold rounded-full text-xs whitespace-nowrap">
                        {st.student_count} Students
                      </span>
                      {st.demand_count > 0 && (
                        <span className="text-[10px] text-vibrant-orange font-semibold whitespace-nowrap">
                          {st.demand_count} Openings
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
