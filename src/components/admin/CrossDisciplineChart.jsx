import React, { useState, useMemo } from 'react';

export default function CrossDisciplineChart({ matrix = [], onSelectDiscipline, activeDiscipline = 'all' }) {
  const [chartView, setChartView] = useState('dual'); // 'dual' | 'demand' | 'talent' | 'share'
  const [hoveredItem, setHoveredItem] = useState(null);

  // Filter out items with 0 activity if desired, or keep all to show full spectrum
  const chartData = useMemo(() => {
    if (!matrix || matrix.length === 0) return [];
    return matrix;
  }, [matrix]);

  // Overall totals and maximums for scaling
  const { totalOpenings, totalStudents, maxOpenings, maxStudents } = useMemo(() => {
    let tOpen = 0;
    let tStud = 0;
    let mOpen = 1;
    let mStud = 1;

    chartData.forEach(item => {
      tOpen += item.total_openings || 0;
      tStud += item.total_students || 0;
      if ((item.total_openings || 0) > mOpen) mOpen = item.total_openings;
      if ((item.total_students || 0) > mStud) mStud = item.total_students;
    });

    return { totalOpenings: tOpen, totalStudents: tStud, maxOpenings: mOpen, maxStudents: mStud };
  }, [chartData]);

  // Discipline brand color palette for SVG/Canvas
  const getDisciplineHex = (id) => {
    const palette = {
      computing: '#06b6d4', // cyan-500
      business: '#3b82f6', // blue-500
      engineering: '#f59e0b', // amber-500
      healthcare: '#f43f5e', // rose-500
      hospitality: '#10b981', // emerald-500
      education: '#6366f1', // indigo-500
      criminology: '#475569', // slate-600
      arts: '#ec4899', // pink-500
      agriculture: '#84cc16', // lime-500
      social_sciences: '#14b8a6', // teal-500
      maritime: '#0284c7' // sky-600
    };
    return palette[id] || '#f97316';
  };

  // Sorted views
  const demandSortedData = useMemo(() => {
    return [...chartData].sort((a, b) => (b.total_openings || 0) - (a.total_openings || 0));
  }, [chartData]);

  const talentSortedData = useMemo(() => {
    return [...chartData].sort((a, b) => (b.total_students || 0) - (a.total_students || 0));
  }, [chartData]);

  // Donut chart arcs calculation
  const donutSlices = useMemo(() => {
    if (totalOpenings === 0) return [];
    let accumulatedAngle = 0;
    return demandSortedData
      .filter(d => (d.total_openings || 0) > 0)
      .map(item => {
        const percentage = ((item.total_openings || 0) / totalOpenings) * 100;
        const angle = ((item.total_openings || 0) / totalOpenings) * 360;
        const startAngle = accumulatedAngle;
        accumulatedAngle += angle;
        return {
          ...item,
          percentage: percentage.toFixed(1),
          startAngle,
          angle,
          colorHex: getDisciplineHex(item.id)
        };
      });
  }, [demandSortedData, totalOpenings]);

  // Summary Top Highlights
  const topDemandDiscipline = demandSortedData[0];
  const topTalentDiscipline = talentSortedData[0];

  return (
    <div className="bento-card p-5 md:p-6 rounded-3xl bg-surface border border-outline-variant space-y-6 shadow-sm">
      {/* ─── HEADER & CONTROLS ────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-outline-variant pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-tint text-vibrant-orange flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">bar_chart</span>
            </div>
            <h2 className="text-lg font-bold text-on-surface tracking-tight">
              Cross-Discipline Skill Demand & Talent Intelligence Chart
            </h2>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Comparative telemetry across all 11 CHED academic disciplines — tracking employer hiring demand against student talent density
          </p>
        </div>

        {/* View Mode Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-container rounded-2xl border border-outline-variant self-start lg:self-auto overflow-x-auto max-w-full scrollbar-none">
          <button
            onClick={() => setChartView('dual')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              chartView === 'dual'
                ? 'bg-vibrant-orange text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base">stacked_bar_chart</span>
            <span>Demand vs. Talent</span>
          </button>

          <button
            onClick={() => setChartView('demand')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              chartView === 'demand'
                ? 'bg-vibrant-orange text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base">work</span>
            <span>Employer Demand</span>
          </button>

          <button
            onClick={() => setChartView('talent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              chartView === 'talent'
                ? 'bg-vibrant-orange text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base">groups</span>
            <span>Talent Pool</span>
          </button>

          <button
            onClick={() => setChartView('share')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              chartView === 'share'
                ? 'bg-vibrant-orange text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base">donut_large</span>
            <span>Market Share %</span>
          </button>
        </div>
      </div>

      {/* ─── LEGEND & QUICK INSIGHTS ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-vibrant-orange shrink-0"></span>
            <span className="font-semibold text-on-surface">Employer Openings (Demand)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-pinoy-green shrink-0"></span>
            <span className="font-semibold text-on-surface">Student Talent Pool (Supply)</span>
          </div>
          <span className="text-[11px] text-on-surface-variant hidden md:inline">
            • Hover over any bar to view top skills • Click to filter
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="px-2.5 py-1 rounded-lg bg-orange-tint text-vibrant-orange font-bold whitespace-nowrap">
            Total Openings: {totalOpenings}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-green-tint text-pinoy-green font-bold whitespace-nowrap">
            Total Talent Pool: {totalStudents.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ─── 1. DUAL-METRIC COMPARISON (Demand vs Talent) ─────────────── */}
      {chartView === 'dual' && (
        <div className="space-y-4">
          <div className="w-full overflow-x-auto pb-2 scrollbar-thin border-b border-outline-variant/60">
            <div className="h-72 min-w-[620px] lg:min-w-0 w-full pt-6 pb-2 flex items-end justify-between gap-2 md:gap-3">
              {chartData.map((item) => {
                const demandHeightPct = maxOpenings > 0 
                  ? Math.max(8, ((item.total_openings || 0) / maxOpenings) * 88) 
                  : 8;
                const talentHeightPct = maxStudents > 0 
                  ? Math.max(8, ((item.total_students || 0) / maxStudents) * 88) 
                  : 8;

                const isHovered = hoveredItem?.id === item.id;
                const isSelected = activeDiscipline === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectDiscipline && onSelectDiscipline(item.id)}
                    onMouseEnter={() => setHoveredItem(item)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`flex-1 min-w-[50px] max-w-[85px] h-full flex flex-col items-center justify-end group cursor-pointer transition-all duration-300 ${
                      isSelected ? 'opacity-100 scale-105' : 'hover:opacity-100 opacity-90'
                    }`}
                  >
                    {/* Paired Bars Container */}
                    <div className="w-full flex items-end justify-center gap-1.5 h-full relative">
                      {/* Orange Bar: Openings */}
                      <div
                        style={{ height: `${demandHeightPct}%` }}
                        className={`w-1/2 rounded-t-lg bg-gradient-to-t from-orange-500 to-amber-400 relative transition-all duration-500 group-hover:brightness-110 ${
                          isHovered ? 'shadow-lg shadow-orange-500/30' : ''
                        }`}
                      >
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-black text-vibrant-orange whitespace-nowrap">
                          {item.total_openings || 0}
                        </div>
                      </div>

                      {/* Green Bar: Student Talent */}
                      <div
                        style={{ height: `${talentHeightPct}%` }}
                        className={`w-1/2 rounded-t-lg bg-gradient-to-t from-emerald-600 to-teal-400 relative transition-all duration-500 group-hover:brightness-110 ${
                          isHovered ? 'shadow-lg shadow-emerald-500/30' : ''
                        }`}
                      >
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-black text-pinoy-green whitespace-nowrap">
                          {item.total_students || 0}
                        </div>
                      </div>
                    </div>

                    {/* Discipline Label & Icon */}
                    <div className="mt-3 text-center w-full min-w-0">
                      <div className="w-7 h-7 mx-auto rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:text-vibrant-orange group-hover:bg-orange-50 transition-colors">
                        <span className="material-symbols-outlined text-sm">{item.icon}</span>
                      </div>
                      <p className="text-[10px] font-bold text-on-surface mt-1 truncate max-w-[75px] mx-auto group-hover:text-vibrant-orange transition-colors">
                        {item.label.split(' ')[0]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-center text-on-surface-variant italic">
            Left bar (Orange): Employer Job Openings • Right bar (Green): Student Talent Pool Density
          </p>
        </div>
      )}

      {/* ─── 2. EMPLOYER DEMAND RANKED VIEW ───────────────────────────── */}
      {chartView === 'demand' && (
        <div className="space-y-4">
          <div className="w-full overflow-x-auto pb-2 scrollbar-thin border-b border-outline-variant/60">
            <div className="h-72 min-w-[620px] lg:min-w-0 w-full pt-6 pb-2 flex items-end justify-between gap-3">
              {demandSortedData.map((item, idx) => {
                const heightPct = maxOpenings > 0 
                  ? Math.max(10, ((item.total_openings || 0) / maxOpenings) * 88) 
                  : 10;
                const isHovered = hoveredItem?.id === item.id;
                const colorHex = getDisciplineHex(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectDiscipline && onSelectDiscipline(item.id)}
                    onMouseEnter={() => setHoveredItem(item)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className="flex-1 min-w-[50px] max-w-[90px] h-full flex flex-col items-center justify-end group cursor-pointer transition-all duration-300"
                  >
                    {/* Single Column */}
                    <div className="w-full flex items-end justify-center h-full relative">
                      <div
                        style={{ 
                          height: `${heightPct}%`,
                          backgroundColor: colorHex
                        }}
                        className={`w-3/4 rounded-t-xl relative transition-all duration-500 group-hover:scale-105 ${
                          isHovered ? 'shadow-xl' : 'opacity-90 hover:opacity-100'
                        }`}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-black text-on-surface flex items-center gap-0.5">
                          <span>{item.total_openings || 0}</span>
                          {(item.total_openings || 0) >= 8 && (
                            <span className="material-symbols-outlined text-[13px] text-orange-500">local_fire_department</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Label */}
                    <div className="mt-3 text-center w-full min-w-0">
                      <div className="w-7 h-7 mx-auto rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:text-vibrant-orange transition-colors">
                        <span className="material-symbols-outlined text-sm">{item.icon}</span>
                      </div>
                      <p className="text-[10px] font-bold text-on-surface mt-1 truncate max-w-[80px] mx-auto">
                        {item.label.split(' ')[0]}
                      </p>
                      <span className="text-[9px] font-semibold text-vibrant-orange">
                        #{idx + 1}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-center text-on-surface-variant italic">
            Ranked by employer hiring volume and job openings posted across partner organizations
          </p>
        </div>
      )}

      {/* ─── 3. STUDENT TALENT POOL RANKED VIEW ───────────────────────── */}
      {chartView === 'talent' && (
        <div className="space-y-4">
          <div className="w-full overflow-x-auto pb-2 scrollbar-thin border-b border-outline-variant/60">
            <div className="h-72 min-w-[620px] lg:min-w-0 w-full pt-6 pb-2 flex items-end justify-between gap-3">
              {talentSortedData.map((item, idx) => {
                const heightPct = maxStudents > 0 
                  ? Math.max(10, ((item.total_students || 0) / maxStudents) * 88) 
                  : 10;
                const isHovered = hoveredItem?.id === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectDiscipline && onSelectDiscipline(item.id)}
                    onMouseEnter={() => setHoveredItem(item)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className="flex-1 min-w-[50px] max-w-[90px] h-full flex flex-col items-center justify-end group cursor-pointer transition-all duration-300"
                  >
                    {/* Single Column */}
                    <div className="w-full flex items-end justify-center h-full relative">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-3/4 rounded-t-xl bg-gradient-to-t from-emerald-600 to-teal-400 relative transition-all duration-500 group-hover:scale-105 ${
                          isHovered ? 'shadow-xl shadow-emerald-500/30' : 'opacity-90 hover:opacity-100'
                        }`}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-pinoy-green whitespace-nowrap">
                          {(item.total_students || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Label */}
                    <div className="mt-3 text-center w-full min-w-0">
                      <div className="w-7 h-7 mx-auto rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:text-pinoy-green transition-colors">
                        <span className="material-symbols-outlined text-sm">{item.icon}</span>
                      </div>
                      <p className="text-[10px] font-bold text-on-surface mt-1 truncate max-w-[80px] mx-auto">
                        {item.label.split(' ')[0]}
                      </p>
                      <span className="text-[9px] font-semibold text-pinoy-green">
                        #{idx + 1}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-center text-on-surface-variant italic">
            Ranked by total verified student competency endorsements across enrolled students
          </p>
        </div>
      )}

      {/* ─── 4. SECTOR MARKET SHARE VIEW (Donut + Progress Bars) ─────── */}
      {chartView === 'share' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* SVG Donut Chart */}
          <div className="md:col-span-5 flex flex-col items-center justify-center relative">
            <svg viewBox="0 0 200 200" className="w-56 h-56 max-w-full transform -rotate-90">
              {donutSlices.map((slice, idx) => {
                const radius = 70;
                const strokeWidth = 26;
                const circumference = 2 * Math.PI * radius;
                const strokeDasharray = `${(slice.angle / 360) * circumference} ${circumference}`;
                const strokeDashoffset = -((slice.startAngle / 360) * circumference);

                return (
                  <circle
                    key={slice.id}
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="transparent"
                    stroke={slice.colorHex}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-500 cursor-pointer hover:stroke-width-32"
                    onMouseEnter={() => setHoveredItem(slice)}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => onSelectDiscipline && onSelectDiscipline(slice.id)}
                  />
                );
              })}
            </svg>

            {/* Inner Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-2xl font-black text-on-surface">
                {hoveredItem ? hoveredItem.total_openings : totalOpenings}
              </span>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                {hoveredItem ? `${hoveredItem.label.split(' ')[0]} Openings` : 'Total Openings'}
              </span>
              {hoveredItem && (
                <span className="text-[10px] font-bold text-vibrant-orange mt-0.5">
                  {(((hoveredItem.total_openings || 0) / (totalOpenings || 1)) * 100).toFixed(1)}% Share
                </span>
              )}
            </div>
          </div>

          {/* Detailed Market Share Progress Bars */}
          <div className="md:col-span-7 space-y-2.5">
            {donutSlices.map((slice) => (
              <div
                key={slice.id}
                onClick={() => onSelectDiscipline && onSelectDiscipline(slice.id)}
                onMouseEnter={() => setHoveredItem(slice)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`p-2 rounded-xl transition-all cursor-pointer border ${
                  hoveredItem?.id === slice.id
                    ? 'bg-surface-container border-vibrant-orange/50 shadow-sm'
                    : 'border-transparent hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: slice.colorHex }}
                    />
                    <span className="font-bold text-on-surface truncate">{slice.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-vibrant-orange whitespace-nowrap">{slice.total_openings} Jobs</span>
                    <span className="text-[11px] text-on-surface-variant font-semibold whitespace-nowrap">({slice.percentage}%)</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${slice.percentage}%`,
                      backgroundColor: slice.colorHex 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── HOVERED / SELECTED DISCIPLINE SPOTLIGHT CARD ─────────────── */}
      {hoveredItem ? (
        <div className="p-4 rounded-2xl bg-surface-container border border-vibrant-orange/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border text-white shadow-sm shrink-0`}
                 style={{ backgroundColor: getDisciplineHex(hoveredItem.id) }}>
              <span className="material-symbols-outlined text-2xl">{hoveredItem.icon}</span>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-on-surface text-sm truncate">{hoveredItem.label}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-tint text-vibrant-orange whitespace-nowrap">
                  {hoveredItem.total_openings || 0} Openings
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-tint text-pinoy-green whitespace-nowrap">
                  {(hoveredItem.total_students || 0).toLocaleString()} Talent Pool
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-0.5 truncate">{hoveredItem.deptName}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Top In-Demand:</span>
            {hoveredItem.top_demand?.slice(0, 3).map((sk, idx) => (
              <span key={idx} className="px-2 py-1 bg-surface rounded-lg text-xs font-semibold text-on-surface border border-outline-variant flex items-center gap-1">
                <span>{sk.skill_name}</span>
                <span className="text-[10px] text-vibrant-orange font-bold">({sk.demand_count})</span>
              </span>
            ))}
            <button
              onClick={() => onSelectDiscipline && onSelectDiscipline(hoveredItem.id)}
              className="ml-auto md:ml-2 px-3 py-1 bg-vibrant-orange text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-1 shrink-0"
            >
              <span>View Skills</span>
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </button>
          </div>
        </div>
      ) : (
        /* Summary Highlight Strip when no item is hovered */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-start sm:items-center gap-3 min-w-0 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-vibrant-orange flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 border border-orange-100/80">
              <span className="material-symbols-outlined text-xl">workspace_premium</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Top Hiring Discipline</p>
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 mt-0.5">
                <span className="text-xs font-bold text-on-surface">
                  {topDemandDiscipline?.label || 'Computing & IT'}
                </span>
                <span className="text-[11px] font-semibold text-vibrant-orange whitespace-nowrap">
                  ({topDemandDiscipline?.total_openings || 0} Openings)
                </span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-start sm:items-center gap-3 min-w-0 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-pinoy-green flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 border border-emerald-100/80">
              <span className="material-symbols-outlined text-xl">group</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Largest Talent Pool</p>
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 mt-0.5">
                <span className="text-xs font-bold text-on-surface">
                  {topTalentDiscipline?.label || 'Business & Accountancy'}
                </span>
                <span className="text-[11px] font-semibold text-pinoy-green whitespace-nowrap">
                  ({(topTalentDiscipline?.total_students || 0).toLocaleString()} Students)
                </span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-start sm:items-center gap-3 min-w-0 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 border border-purple-100/80">
              <span className="material-symbols-outlined text-xl">verified</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Disciplines Covered</p>
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 mt-0.5">
                <span className="text-xs font-bold text-on-surface">
                  {chartData.length} Fields
                </span>
                <span className="text-[11px] font-semibold text-purple-600 whitespace-nowrap">
                  • 64 Degree Programs
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
