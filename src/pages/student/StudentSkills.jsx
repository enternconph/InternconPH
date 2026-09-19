import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../api/client';
import { PROGRAM_SKILLS_CATALOG, getSkillsForProgram, getRelatedSkillsForProgram } from '../../data/programSkillsData';
import { getSkillMatchExplanation } from '../../utils/skillSynergyMatcher';

// ─── DISCIPLINE CATEGORIES ────────────────────────────────────
const DISCIPLINE_CATEGORIES = [
  { id: 'all', label: 'All Disciplines', icon: 'apps', keywords: [] },
  { id: 'it', label: 'Information Technology', icon: 'code', keywords: ['javascript','react','node','python','sql','html','css','typescript','next.js','tailwind','docker','aws','git','api','database','web','software','mobile','flutter','laravel','php','java','c#','angular','vue','mongodb','firebase','linux','cloud','devops','kubernetes','figma','ui/ux'] },
  { id: 'accounting', label: 'Accountancy & Finance', icon: 'account_balance', keywords: ['accounting','quickbooks','tax','audit','financial','bookkeep','cpa','xero','ledger','payroll','cost accounting','ifrs','budget','excel','spreadsheet'] },
  { id: 'engineering', label: 'Engineering & Architecture', icon: 'engineering', keywords: ['autocad','revit','civil','structural','construct','matlab','solidworks','bim','survey','engineering','architect','mep','staad','etabs','cad'] },
  { id: 'hospitality', label: 'Hospitality & Culinary', icon: 'restaurant', keywords: ['hotel','hospitality','culinary','chef','food','beverage','haccp','opera','kitchen','dining','barista','banquet','housekeeping','f&b'] },
  { id: 'tourism', label: 'Tourism & Travel', icon: 'flight', keywords: ['tour','travel','flight','amadeus','sabre','gds','airline','resort','itinerary','destination','tourism','booking'] },
  { id: 'healthcare', label: 'Healthcare & Nursing', icon: 'health_and_safety', keywords: ['nurse','nursing','patient','clinical','vital','health','medical','bls','cpr','triage','pharmac','ehr','medication','infection','anatomy'] },
  { id: 'business', label: 'Business & Marketing', icon: 'campaign', keywords: ['marketing','seo','social media','market research','business','entrepreneurship','management','sales','brand','advertising','e-commerce','crm','content'] },
  { id: 'psychology', label: 'Psychology & HR', icon: 'psychology', keywords: ['psychology','counseling','talent','recruitment','hr','labor','employee','training','assessment','organizational','talent acquisition'] },
  { id: 'education', label: 'Education', icon: 'school', keywords: ['education','teaching','curriculum','pedagogy','classroom','lesson','instructional','assessment','special education','edtech'] },
  { id: 'design', label: 'Design & Media', icon: 'palette', keywords: ['design','graphic','figma','photoshop','illustrator','canva','video','animation','photography','creative','media','adobe','premiere','after effects'] },
];

// ─── PROGRAM-BASED STARTER PACKS ─────────────────────────────
const STARTER_PACKS = {
  BSIT: [
    { name: '🌐 Web Developer Pack', skills: ['JavaScript', 'HTML/CSS', 'React.js', 'Git/Version Control'] },
    { name: '📊 Data Analyst Pack', skills: ['Python', 'SQL', 'Data Analysis', 'Excel/Spreadsheets'] },
    { name: '🎨 UI/UX Designer Pack', skills: ['UI/UX Design', 'Figma', 'HTML/CSS', 'Graphic Design'] },
  ],
  BSCS: [
    { name: '💻 Full-Stack Developer Pack', skills: ['JavaScript', 'Python', 'SQL', 'Git/Version Control'] },
    { name: '🤖 AI & Data Science Pack', skills: ['Python', 'Machine Learning', 'Data Analysis', 'SQL'] },
    { name: '☁️ Cloud & DevOps Pack', skills: ['Docker', 'AWS Cloud', 'Linux', 'Git/Version Control'] },
  ],
  BSA: [
    { name: '📒 Accountant Essential Pack', skills: ['Financial Accounting', 'QuickBooks', 'Excel/Spreadsheets', 'Taxation & Tax Compliance'] },
    { name: '🔍 Audit & Compliance Pack', skills: ['Auditing & Assurance', 'Cost Accounting', 'Financial Modeling', 'Excel/Spreadsheets'] },
    { name: '💼 Finance Technology Pack', skills: ['Xero Accounting', 'Payroll Processing & Benefits Admin', 'Financial Accounting', 'QuickBooks'] },
  ],
  BSCE: [
    { name: '📐 Civil Engineer Pack', skills: ['AutoCAD', 'Structural Analysis & Design', 'Construction Management & Costing', 'Project Management'] },
    { name: '🏗️ BIM & Architecture Pack', skills: ['BIM / Revit Architecture', 'AutoCAD', 'Construction Management & Costing', 'Project Management'] },
  ],
  BSCpE: [
    { name: '💻 Computer Engineer Pack', skills: ['Python', 'JavaScript', 'SQL', 'Git/Version Control'] },
    { name: '⚡ Embedded Systems Pack', skills: ['Python', 'MATLAB', 'Linux', 'Git/Version Control'] },
  ],
  BSEE: [
    { name: '⚡ Electrical Engineer Pack', skills: ['AutoCAD', 'MATLAB', 'Project Management', 'Excel/Spreadsheets'] },
  ],
  BSHM: [
    { name: '🏨 Hotel & Culinary Pack', skills: ['Food & Beverage Service', 'HACCP & Food Safety', 'Front Office Operations (Opera PMS)', 'Customer Service'] },
    { name: '🎉 Events & Banqueting Pack', skills: ['Event Management & Banqueting', 'Food & Beverage Service', 'Customer Service', 'Culinary Arts'] },
  ],
  BSTM: [
    { name: '✈️ Tourism & Travel Pack', skills: ['Tourism Tour Guiding & Itinerary Planning', 'Amadeus / Sabre GDS Flight Booking', 'Customer Service', 'English Proficiency'] },
    { name: '🌍 Destination Management Pack', skills: ['Tourism Tour Guiding & Itinerary Planning', 'Event Management & Banqueting', 'Customer Service', 'English Proficiency'] },
  ],
  BSN: [
    { name: '🏥 Healthcare Essential Pack', skills: ['Patient Care & Assessment', 'Basic Life Support (BLS / CPR)', 'Clinical Documentation & EHR', 'Pharmacology & Medication Administration'] },
    { name: '⚕️ Clinical Nursing Pack', skills: ['Patient Care & Assessment', 'Infection Control & Prevention', 'Basic Life Support (BLS / CPR)', 'Clinical Documentation & EHR'] },
  ],
  BSBA: [
    { name: '📈 Marketing Starter Pack', skills: ['Digital Marketing', 'Search Engine Optimization (SEO)', 'Social Media Management', 'Market Research'] },
    { name: '💼 Business Ops Pack', skills: ['Business Development', 'Project Management', 'Excel/Spreadsheets', 'Customer Service'] },
  ],
  BSPSY: [
    { name: '🧠 Psychology & HR Pack', skills: ['Psychological Assessment & Testing', 'Talent Acquisition & Recruitment', 'Employee Relations & Labor Code', 'Training & Development'] },
    { name: '🤝 Counseling Foundations Pack', skills: ['Psychological Assessment & Testing', 'Customer Service', 'Communication', 'Training & Development'] },
  ],
  BSEd: [
    { name: '📚 Educator Starter Pack', skills: ['Curriculum Development', 'Instructional Design', 'Educational Technology', 'Classroom Management'] },
  ],
};

// ─── DYNAMIC PROGRAM STYLING HELPER (All 53 Academic Programs) ──────
const getProgramDisplay = (code, dept, name) => {
  const c = (code || '').toUpperCase().trim();
  const d = (dept || '').toLowerCase();

  if (c === 'BSIT' || c === 'BSCS' || c === 'BSIS' || c === 'ACT' || d.includes('computing') || d.includes('information tech')) {
    return {
      icon: 'terminal',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      border: 'border-blue-200 dark:border-blue-500/20',
      badgeBg: 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300',
      label: name || 'Information Technology & Computing'
    };
  }
  if (c === 'BSA' || c === 'BSMA' || c === 'BSIA' || c.includes('FM') || d.includes('accountancy') || d.includes('finance')) {
    return {
      icon: 'account_balance',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      border: 'border-emerald-200 dark:border-emerald-500/20',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300',
      label: name || 'Accountancy & Financial Management'
    };
  }
  if (c.startsWith('BSBA') || c === 'BSM' || c === 'BSEntrep' || c === 'BSREM' || d.includes('business')) {
    return {
      icon: 'business_center',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      border: 'border-amber-200 dark:border-amber-500/20',
      badgeBg: 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300',
      label: name || 'Business & Administration'
    };
  }
  if (c.startsWith('BS') && (c.includes('CE') || c.includes('ME') || c.includes('EE') || c.includes('ECE') || c.includes('CPE') || c.includes('IE') || c.includes('ARCH') || c.includes('EM') || c.includes('METE') || c.includes('GEO')) || d.includes('engineering')) {
    return {
      icon: 'engineering',
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-500/10',
      border: 'border-indigo-200 dark:border-indigo-500/20',
      badgeBg: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300',
      label: name || 'Engineering & Architecture'
    };
  }
  if (c === 'BSHM' || c === 'BSCA' || d.includes('hospitality') || d.includes('culinary')) {
    return {
      icon: 'restaurant',
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-500/10',
      border: 'border-rose-200 dark:border-rose-500/20',
      badgeBg: 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300',
      label: name || 'Hospitality Management'
    };
  }
  if (c === 'BSTM' || d.includes('tourism') || d.includes('travel')) {
    return {
      icon: 'flight',
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-50 dark:bg-sky-500/10',
      border: 'border-sky-200 dark:border-sky-500/20',
      badgeBg: 'bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300',
      label: name || 'Tourism & Destination Management'
    };
  }
  if (c === 'BSN' || c === 'BSPHARM' || c === 'BSMLS' || c === 'BSPT' || c === 'BSOT' || c === 'BSRT' || d.includes('health') || d.includes('nursing')) {
    return {
      icon: 'health_and_safety',
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-500/10',
      border: 'border-red-200 dark:border-red-500/20',
      badgeBg: 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300',
      label: name || 'Health & Nursing Sciences'
    };
  }
  if (c === 'BSPSY' || c === 'AB-PSY' || c === 'BS-SW' || d.includes('psychology') || d.includes('social work')) {
    return {
      icon: 'psychology',
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-500/10',
      border: 'border-purple-200 dark:border-purple-500/20',
      badgeBg: 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300',
      label: name || 'Psychology & Behavioral Science'
    };
  }
  if (c.startsWith('BSED') || c.startsWith('BEED') || c.startsWith('BTLED') || c.startsWith('BPED') || c.startsWith('BSNED') || d.includes('education') || d.includes('teaching')) {
    return {
      icon: 'school',
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50 dark:bg-teal-500/10',
      border: 'border-teal-200 dark:border-teal-500/20',
      badgeBg: 'bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300',
      label: name || 'Teacher Education'
    };
  }
  if (c === 'BMMA' || c === 'BFA' || c === 'BAC' || c === 'BAJ' || d.includes('media') || d.includes('design') || d.includes('fine arts')) {
    return {
      icon: 'palette',
      color: 'text-fuchsia-600 dark:text-fuchsia-400',
      bg: 'bg-fuchsia-50 dark:bg-fuchsia-500/10',
      border: 'border-fuchsia-200 dark:border-fuchsia-500/20',
      badgeBg: 'bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-800 dark:text-fuchsia-300',
      label: name || 'Media, Arts & Design'
    };
  }
  if (c === 'BSCRIM' || d.includes('criminology') || d.includes('justice')) {
    return {
      icon: 'security',
      color: 'text-cyan-700 dark:text-cyan-400',
      bg: 'bg-cyan-50 dark:bg-cyan-500/10',
      border: 'border-cyan-200 dark:border-cyan-500/20',
      badgeBg: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300',
      label: name || 'Criminal Justice & Public Safety'
    };
  }
  if (c === 'BSMT' || c === 'BSMARE' || d.includes('maritime')) {
    return {
      icon: 'sailing',
      color: 'text-blue-700 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      border: 'border-blue-200 dark:border-blue-500/20',
      badgeBg: 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300',
      label: name || 'Maritime Studies'
    };
  }
  if (c === 'BSAGR' || c === 'BSF' || c === 'BSES' || d.includes('agriculture') || d.includes('forestry')) {
    return {
      icon: 'eco',
      color: 'text-lime-700 dark:text-lime-400',
      bg: 'bg-lime-50 dark:bg-lime-500/10',
      border: 'border-lime-200 dark:border-lime-500/20',
      badgeBg: 'bg-lime-100 dark:bg-lime-500/20 text-lime-800 dark:text-lime-300',
      label: name || 'Agriculture & Environmental Sciences'
    };
  }
  return {
    icon: 'auto_stories',
    color: 'text-vibrant-orange',
    bg: 'bg-orange-tint/40',
    border: 'border-vibrant-orange/20',
    badgeBg: 'bg-orange-tint text-vibrant-orange',
    label: name || code || 'Academic Program'
  };
};

export default function StudentSkills() {
  const [data, setData] = useState({
    studentSkills: [],
    allSkills: [],
    recommendations: [],
    readiness: null,
    program: null,
    marketIntelligenceRepo: {}
  });

  const [selectedSkill, setSelectedSkill] = useState('');
  const [customSkillName, setCustomSkillName] = useState('');
  const [isCustomSkill, setIsCustomSkill] = useState(false);
  const [proficiency, setProficiency] = useState('intermediate');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Filtering & Search for recommendations
  const [activeFilter, setActiveFilter] = useState('all');
  const [recSearch, setRecSearch] = useState('');
  const [recPage, setRecPage] = useState(1);
  const [showAllRecs, setShowAllRecs] = useState(false);
  const RECS_PER_PAGE = 6;

  // Discipline & text filter for skill library
  const [activeDiscipline, setActiveDiscipline] = useState('all');
  const [skillSearchTerm, setSkillSearchTerm] = useState('');

  // Live Internet Explorer Search
  const [exploreQuery, setExploreQuery] = useState('');
  const [activeModalSkill, setActiveModalSkill] = useState(null);

  // Skill deletion state
  const [skillToDelete, setSkillToDelete] = useState(null);
  const [deletingSkillId, setDeletingSkillId] = useState(null);

  // Custom skill live preview
  const [customSkillPreview, setCustomSkillPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Library program filter state (defaults to student's program)
  const [selectedProgramFilter, setSelectedProgramFilter] = useState('');

  // Curriculum chip wall tab: 'core' | 'related' | 'all'
  const [curriculumTab, setCurriculumTab] = useState('core');

  // Course Alignment state for AI Recommendations: 'all' | specific program code
  const [aiAlignmentTarget, setAiAlignmentTarget] = useState('all');

  const fetchSkills = async (targetProg = aiAlignmentTarget, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const progQuery = targetProg ? `?program_code=${encodeURIComponent(targetProg)}` : '';
      const res = await api.get(`/student/skills${progQuery}`);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch student skills:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleAlignmentChange = (newTarget) => {
    setAiAlignmentTarget(newTarget);
    fetchSkills(newTarget);
  };

  const handleGenerateAiRecommendations = async () => {
    setAiGenerating(true);
    try {
      const res = await api.post('/student/skills/ai-generate', {
        program_code: aiAlignmentTarget
      });
      if (res.success && res.data) {
        setData((prev) => ({
          ...prev,
          recommendations: res.data.recommendations || prev.recommendations,
          ai_metadata: res.data.ai_metadata || prev.ai_metadata,
          readiness: res.data.readiness || prev.readiness
        }));
        showToast(res.message || 'AI Recommendations regenerated across academic courses!');
      } else {
        showToast(res.message || 'Failed to generate recommendations.', true);
      }
    } catch (err) {
      console.error('AI generation failed:', err);
      showToast('Could not complete AI generation.', true);
    } finally {
      setAiGenerating(false);
    }
  };

  useEffect(() => {
    fetchSkills('all');
  }, []);

  // Sync selectedProgramFilter with student's actual program once loaded
  useEffect(() => {
    if (data.program?.program_code && !selectedProgramFilter) {
      setSelectedProgramFilter(data.program.program_code);
    }
  }, [data.program, selectedProgramFilter]);

  // Quick helper to show temporary toast
  const showToast = (msg, isErr = false) => {
    if (isErr) {
      setErrorMessage(msg);
      setMessage('');
      setTimeout(() => setErrorMessage(''), 4000);
    } else {
      setMessage(msg);
      setErrorMessage('');
      setTimeout(() => setMessage(''), 4000);
    }
  };

  // Debounced custom skill preview lookup
  useEffect(() => {
    if (!customSkillName.trim() || customSkillName.trim().length < 2) {
      setCustomSkillPreview(null);
      return;
    }
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await api.get(`/student/skills/market-intel?skill=${encodeURIComponent(customSkillName.trim())}`);
        if (res.success && res.data) {
          setCustomSkillPreview(res.data);
        }
      } catch (e) {
        console.error('Preview lookup failed:', e);
      } finally {
        setPreviewLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [customSkillName]);

  // Debounced explorer search with live API call
  const [explorerIntel, setExplorerIntel] = useState(null);
  const [explorerLoading, setExplorerLoading] = useState(false);

  useEffect(() => {
    if (!exploreQuery.trim() || exploreQuery.trim().length < 2) {
      setExplorerIntel(null);
      return;
    }
    const q = exploreQuery.trim().toLowerCase();
    const repo = data.marketIntelligenceRepo || {};
    const exactKey = Object.keys(repo).find((k) => k.toLowerCase() === q);
    if (exactKey) {
      setExplorerIntel({ skill_name: exactKey, ...repo[exactKey] });
      return;
    }
    const partialKey = Object.keys(repo).find((k) => k.toLowerCase().includes(q));
    if (partialKey) {
      setExplorerIntel({ skill_name: partialKey, ...repo[partialKey] });
      return;
    }
    const timer = setTimeout(async () => {
      setExplorerLoading(true);
      try {
        const res = await api.get(`/student/skills/market-intel?skill=${encodeURIComponent(exploreQuery.trim())}`);
        if (res.success && res.data) {
          setExplorerIntel({ skill_name: exploreQuery.trim(), ...res.data });
        }
      } catch (e) {
        console.error('Explorer lookup failed:', e);
      } finally {
        setExplorerLoading(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [exploreQuery, data.marketIntelligenceRepo]);

  const handleAddSkill = async (e) => {
    if (e) e.preventDefault();
    if (!isCustomSkill && !selectedSkill) {
      showToast('Please select a skill from the library or click a competency chip.', true);
      return;
    }
    if (isCustomSkill && !customSkillName.trim()) {
      showToast('Please enter a custom competency name.', true);
      return;
    }

    setActionLoading(true);
    let payload;
    if (isCustomSkill) {
      payload = { skill_name: customSkillName.trim(), proficiency_level: proficiency, program_code: aiAlignmentTarget };
    } else {
      const isNumeric = !isNaN(Number(selectedSkill)) && Number(selectedSkill) > 0;
      payload = isNumeric
        ? { skill_id: Number(selectedSkill), proficiency_level: proficiency, program_code: aiAlignmentTarget }
        : { skill_name: String(selectedSkill), proficiency_level: proficiency, program_code: aiAlignmentTarget };
    }

    const res = await api.post('/student/skills', payload);
    setActionLoading(false);

    if (res.success) {
      showToast(res.message || 'Competency added! AI Recommendations recalculated.');
      setSelectedSkill('');
      setCustomSkillName('');
      setCustomSkillPreview(null);
      setIsCustomSkill(false);
      if (res.data) {
        setData((prev) => ({
          ...prev,
          studentSkills: res.data.studentSkills || prev.studentSkills,
          recommendations: res.data.recommendations || prev.recommendations,
          ai_metadata: res.data.ai_metadata || prev.ai_metadata,
          readiness: res.data.readiness || prev.readiness
        }));
      }
    } else {
      showToast(res.message || 'Failed to add skill.', true);
    }
  };

  const handleQuickAddRecommendation = async (skillId, skillName) => {
    setActionLoading(true);
    const res = await api.post('/student/skills', {
      skill_id: skillId,
      skill_name: skillName,
      proficiency_level: 'intermediate',
      program_code: aiAlignmentTarget
    });
    setActionLoading(false);

    if (res.success) {
      showToast(`Added "${skillName}"! AI Recommendations realigned.`);
      if (activeModalSkill && activeModalSkill.skill_name === skillName) {
        setActiveModalSkill(null);
      }
      if (res.data) {
        setData((prev) => ({
          ...prev,
          studentSkills: res.data.studentSkills || prev.studentSkills,
          recommendations: res.data.recommendations || prev.recommendations,
          ai_metadata: res.data.ai_metadata || prev.ai_metadata,
          readiness: res.data.readiness || prev.readiness
        }));
      }
    } else {
      showToast(res.message || 'Failed to add recommendation.', true);
    }
  };

  const handleRemoveSkill = (sk) => {
    if (!sk) return;
    setSkillToDelete(sk);
  };

  const handleExecuteDelete = async (sk) => {
    if (!sk) return;
    const targetId = sk.id || sk.skill_id;
    const name = sk.skill_name;
    const skillId = sk.skill_id;

    setDeletingSkillId(targetId);

    // Optimistically remove from state so the skill card immediately disappears
    setData((prev) => ({
      ...prev,
      studentSkills: (prev.studentSkills || []).filter((s) => {
        if (sk.id && s.id === sk.id) return false;
        if (skillId && s.skill_id === skillId) return false;
        if (name && (s.skill_name || '').toLowerCase().trim() === (name || '').toLowerCase().trim()) return false;
        return true;
      })
    }));

    // Dismiss modal immediately for responsive feeling
    setSkillToDelete(null);

    try {
      const query = name ? `?name=${encodeURIComponent(name)}` : '';
      const endpoint = targetId ? `/student/skills/${targetId}${query}` : `/student/skills/${encodeURIComponent(name)}`;
      const res = await api.delete(endpoint);

      if (res.success) {
        showToast(`Removed "${name || 'Skill'}" from profile.`);
        if (res.data?.studentSkills) {
          setData((prev) => ({
            ...prev,
            studentSkills: res.data.studentSkills
          }));
        }
        // Silently refresh skills & recommendations in the background
        fetchSkills(aiAlignmentTarget, true);
      } else {
        showToast(res.message || 'Failed to remove skill.', true);
        fetchSkills(aiAlignmentTarget, true);
      }
    } catch (err) {
      console.error('Failed to remove skill:', err);
      showToast('Failed to remove skill.', true);
      fetchSkills(aiAlignmentTarget, true);
    } finally {
      setDeletingSkillId(null);
    }
  };

  // Add a starter pack of skills
  const handleAddStarterPack = async (packSkills) => {
    setActionLoading(true);
    for (const skillName of packSkills) {
      const dbSkill = data.allSkills?.find((s) => s.skill_name.toLowerCase() === skillName.toLowerCase());
      if (dbSkill) {
        await api.post('/student/skills', { skill_id: dbSkill.skill_id, proficiency_level: 'intermediate' });
      } else {
        await api.post('/student/skills', { skill_name: skillName, proficiency_level: 'intermediate' });
      }
    }
    setActionLoading(false);
    showToast('Starter skill pack added! Check out your updated internet recommendations.');
    fetchSkills();
  };

  // Add all remaining skills for a program curriculum or related competencies
  const handleAddAllProgramSkills = async (progSkills) => {
    const unadded = (progSkills || []).filter((s) => !s.isAdded);
    if (unadded.length === 0) {
      showToast('All skills in this list are already verified in your profile.');
      return;
    }
    setActionLoading(true);
    try {
      // Send batch addition request to backend
      const res = await api.post('/student/skills', {
        skills: unadded.map((s) => ({
          skill_id: s.skill_id || null,
          skill_name: s.name || s.skill_name,
          proficiency_level: 'intermediate'
        })),
        program_code: aiAlignmentTarget
      });
      setActionLoading(false);
      if (res.success) {
        showToast(res.message || `Added ${unadded.length} competencies! AI Recommendations recalculated.`);
        if (res.data) {
          setData((prev) => ({
            ...prev,
            studentSkills: res.data.studentSkills || prev.studentSkills,
            recommendations: res.data.recommendations || prev.recommendations,
            ai_metadata: res.data.ai_metadata || prev.ai_metadata,
            readiness: res.data.readiness || prev.readiness
          }));
        }
      } else {
        showToast(res.message || 'Failed to add all skills.', true);
      }
    } catch (err) {
      console.error('Batch add skills error:', err);
      setActionLoading(false);
      showToast('Failed to add all skills.', true);
    }
  };

  // Verified skills set for instant lookup
  const verifiedSkillNames = useMemo(() => {
    return new Set((data.studentSkills || []).map((s) => (s.skill_name || '').toLowerCase().trim()));
  }, [data.studentSkills]);

  // Comprehensive structure of all skills related to the student's program/discipline
  const programSkillsStructure = useMemo(() => {
    const progCode = selectedProgramFilter === 'all' || !selectedProgramFilter
      ? (data.program?.program_code || 'BSIT')
      : selectedProgramFilter;

    const dbSkillsMap = new Map();
    (data.allSkills || []).forEach((s) => {
      dbSkillsMap.set((s.skill_name || '').toLowerCase().trim(), s);
    });

    const relatedInfo = getRelatedSkillsForProgram(progCode);

    const mapSkillWithDb = (sk, isCore = true) => {
      const dbMatch = dbSkillsMap.get(sk.name.toLowerCase().trim());
      const isAdded = verifiedSkillNames ? verifiedSkillNames.has(sk.name.toLowerCase().trim()) : false;
      return {
        name: sk.name,
        skill_name: sk.name,
        category: sk.category || (dbMatch ? dbMatch.category_name : (isCore ? 'Core Curriculum' : 'Related Discipline')),
        category_name: sk.category || (dbMatch ? dbMatch.category_name : (isCore ? 'Core Curriculum' : 'Related Discipline')),
        skill_id: dbMatch ? dbMatch.skill_id : null,
        isAdded,
        isCore,
        from_program: sk.from_program || progCode
      };
    };

    const core = (relatedInfo.core || []).map((sk) => mapSkillWithDb(sk, true));
    const related = (relatedInfo.related || []).map((sk) => mapSkillWithDb(sk, false));
    const allRelated = [...core, ...related];

    const relatedNameSet = new Set(allRelated.map((s) => s.name.toLowerCase().trim()));
    const other = (data.allSkills || [])
      .filter((s) => !relatedNameSet.has((s.skill_name || '').toLowerCase().trim()))
      .map((s) => ({
        name: s.skill_name,
        skill_name: s.skill_name,
        category: s.category_name || 'General',
        category_name: s.category_name || 'General',
        skill_id: s.skill_id,
        isAdded: verifiedSkillNames ? verifiedSkillNames.has((s.skill_name || '').toLowerCase().trim()) : false,
        isCore: false
      }));

    return {
      program_code: relatedInfo.program_code || progCode,
      program_name: relatedInfo.program_name || progCode,
      department: relatedInfo.department || 'Academic Discipline',
      core,
      related,
      allRelated,
      other,
      unaddedCore: core.filter((s) => !s.isAdded),
      unaddedRelated: related.filter((s) => !s.isAdded),
      unaddedAllRelated: allRelated.filter((s) => !s.isAdded)
    };
  }, [selectedProgramFilter, data.program, data.allSkills, verifiedSkillNames]);

  // Active curriculum skills displayed in the competency chip wall
  const activeProgramSkills = useMemo(() => {
    if (curriculumTab === 'related') {
      return programSkillsStructure.related;
    }
    if (curriculumTab === 'all') {
      return programSkillsStructure.allRelated;
    }
    return programSkillsStructure.core;
  }, [curriculumTab, programSkillsStructure]);

  // Filter the skill library by text search (or returns all database skills)
  const filteredSkillLibrary = useMemo(() => {
    if (!data.allSkills) return [];
    const allDbSkills = data.allSkills;

    // Direct text search takes precedence across all skills
    if (skillSearchTerm.trim()) {
      const q = skillSearchTerm.toLowerCase();
      return allDbSkills.filter((skill) => {
        const nameMatch = (skill.skill_name || '').toLowerCase().includes(q);
        const catMatch = (skill.category_name || '').toLowerCase().includes(q);
        return nameMatch || catMatch;
      });
    }

    return allDbSkills;
  }, [data.allSkills, skillSearchTerm]);

  // Filter recommendations based on active tabs & search
  const filteredRecommendations = useMemo(() => {
    if (!data.recommendations) return [];

    return data.recommendations.filter((rec) => {
      if (recSearch) {
        const query = recSearch.toLowerCase();
        const matchesName = (rec.skill_name || '').toLowerCase().includes(query);
        const matchesCategory = (rec.category_name || '').toLowerCase().includes(query);
        const matchesReason = (rec.reason || '').toLowerCase().includes(query);
        if (!matchesName && !matchesCategory && !matchesReason) return false;
      }

      if (activeFilter === 'course_aligned') {
        if (aiAlignmentTarget === 'all') {
          return rec.is_program_core || rec.match_type === 'program_baseline' || (rec.score || 0) >= 88;
        }
        const pCode = (aiAlignmentTarget || data.program?.program_code || '').toLowerCase();
        return rec.is_program_core ||
          rec.match_type === 'program_baseline' ||
          (rec.reason && (rec.reason.toLowerCase().includes('curriculum') || rec.reason.toLowerCase().includes('alignment') || rec.reason.toLowerCase().includes('dual fit') || (pCode && rec.reason.toLowerCase().includes(pCode)))) ||
          (rec.score || 0) >= 90;
      }
      if (activeFilter === 'high_demand') {
        return (rec.intel?.ph_hiring_index || 0) >= 92;
      }
      if (activeFilter === 'synergy') {
        return rec.synergy_source && typeof rec.synergy_source === 'string' && !rec.synergy_source.includes('Core') && !rec.synergy_source.includes('Curriculum');
      }
      if (activeFilter === 'emerging') {
        const growth = String(rec.intel?.growth_rate || '');
        return growth.includes('+35%') || growth.includes('+4') || growth.includes('+5');
      }
      return true;
    });
  }, [data.recommendations, activeFilter, recSearch, data.program, aiAlignmentTarget]);

  // Reset pagination to page 1 on filter/search changes
  useEffect(() => {
    setRecPage(1);
  }, [activeFilter, recSearch, aiAlignmentTarget]);

  const totalRecPages = Math.max(1, Math.ceil(filteredRecommendations.length / RECS_PER_PAGE));
  const displayedRecommendations = useMemo(() => {
    if (showAllRecs) return filteredRecommendations;
    const startIndex = (recPage - 1) * RECS_PER_PAGE;
    return filteredRecommendations.slice(startIndex, startIndex + RECS_PER_PAGE);
  }, [filteredRecommendations, showAllRecs, recPage]);

  // Program display info using dynamic helper
  const currentProgramDisplay = useMemo(() => {
    return getProgramDisplay(
      data.program?.program_code,
      data.program?.department,
      data.program?.program_name
    );
  }, [data.program]);

  // Course-specific starter packs
  const courseStarterPacks = useMemo(() => {
    const pCode = data.program?.program_code;
    if (pCode && STARTER_PACKS[pCode]) return STARTER_PACKS[pCode];
    return STARTER_PACKS.BSIT || [];
  }, [data.program]);

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ─── 1. UNIFIED EXECUTIVE HERO HEADER ──────────────────────────── */}
      <div className="bento-card p-6 bg-gradient-to-r from-surface-container-lowest via-surface-container-low to-surface-container border border-outline-variant shadow-sm relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-vibrant-orange/10 blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            {/* Live Badge Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-green-tint text-pinoy-green border border-pinoy-green/30 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-pinoy-green animate-pulse"></span>
                Live Market Intelligence Active
              </span>
              <span className="text-[11px] font-medium text-on-surface-variant">
                PH & Global 2026 Labor Market Benchmarks
              </span>
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-black text-on-surface tracking-tight">
                Skills & Market Match
              </h1>
              <p className="text-xs md:text-sm text-on-surface-variant max-w-2xl mt-1 leading-relaxed">
                Real-time competency analytics powered by live hiring data, companion skill pairings, and industry roadmaps tailored to your academic curriculum.
              </p>
            </div>

            {/* Enrolled Academic Program Badge */}
            {data.program && (
              <div className="inline-flex items-center gap-3 p-2.5 pr-4 rounded-xl bg-surface-container border border-outline-variant shadow-xs">
                <div className={`h-10 w-10 rounded-lg ${currentProgramDisplay.bg} ${currentProgramDisplay.border} border flex items-center justify-center shrink-0`}>
                  <span className={`material-symbols-outlined text-[22px] ${currentProgramDisplay.color}`}>
                    {currentProgramDisplay.icon}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-vibrant-orange">
                      Enrolled Degree Program
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-surface-container-high text-on-surface">
                      {data.program.program_code}
                    </span>
                  </div>
                  <h2 className="text-xs md:text-sm font-bold text-on-surface">
                    {data.program.program_name || currentProgramDisplay.label}
                  </h2>
                  {data.program.department && (
                    <span className="text-[10px] text-on-surface-variant">
                      {data.program.department}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action: Refresh button */}
          <div className="flex items-center gap-3 shrink-0 self-start lg:self-center">
            <button
              type="button"
              onClick={() => fetchSkills()}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface flex items-center gap-2 transition-all shadow-xs"
              title="Refresh market insights"
            >
              <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>sync</span>
              <span>Refresh Intelligence</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── TOAST NOTIFICATIONS ──────────────────────────────────────── */}
      {message && (
        <div className="p-4 bg-green-tint text-pinoy-green border border-pinoy-green/20 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="hover:opacity-75">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 text-error border border-error/20 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="hover:opacity-75">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* ─── 2. MARKET READINESS SCORECARDS ─────────────────────────────── */}
      {data.readiness && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Overall Market Alignment */}
          <div className="bento-card p-5 space-y-3 bg-gradient-to-br from-surface-container-lowest to-surface-container border border-outline-variant">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Overall Market Readiness</span>
              <span className="material-symbols-outlined text-vibrant-orange text-[20px]">insights</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-on-surface tracking-tight">{data.readiness.overall_readiness}%</span>
              <span className="text-xs font-bold text-pinoy-green bg-green-tint px-2.5 py-0.5 rounded-full">
                {data.readiness.overall_readiness >= 75 ? 'Industry Ready' : data.readiness.overall_readiness >= 45 ? 'Advancing Profile' : 'Starter Profile'}
              </span>
            </div>
            <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-vibrant-orange to-deep-orange h-full rounded-full transition-all duration-500"
                style={{ width: `${data.readiness.overall_readiness}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-on-surface-variant">
              Calculated from {data.studentSkills?.length || 0} verified skills against top 2026 hiring benchmarks.
            </p>
          </div>

          {/* Card 2: Top Aligned Career Track */}
          <div className="bento-card p-5 space-y-3 bg-gradient-to-br from-surface-container-lowest to-surface-container border border-outline-variant">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Primary Career Alignment</span>
              <span className="material-symbols-outlined text-blue-500 text-[20px]">target</span>
            </div>
            {data.readiness.best_track ? (
              <>
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-orange-tint flex items-center justify-center text-vibrant-orange shrink-0">
                    <span className="material-symbols-outlined text-[20px]">{data.readiness.best_track.icon || 'work'}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-on-surface line-clamp-1">{data.readiness.best_track.title}</h3>
                    <span className="text-[11px] font-bold text-vibrant-orange">{data.readiness.best_track.match_pct}% Match Alignment</span>
                  </div>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  {data.readiness.best_track.missing_skills.length > 0 ? (
                    <span>
                      Add <strong>{data.readiness.best_track.missing_skills.slice(0, 2).join(', ')}</strong> to reach 100% track readiness.
                    </span>
                  ) : (
                    <span className="text-pinoy-green font-bold">100% Core Competencies Verified for this Track!</span>
                  )}
                </p>
              </>
            ) : (
              <p className="text-xs text-on-surface-variant py-2">Add skills to unlock career track matching.</p>
            )}
          </div>

          {/* Card 3: Dynamic Demand Index */}
          <div className="bento-card p-5 space-y-3 bg-gradient-to-br from-surface-container-lowest to-surface-container border border-outline-variant">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Skill Ecosystem Synergies</span>
              <span className="material-symbols-outlined text-purple-500 text-[20px]">hub</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-on-surface">{data.recommendations?.length || 0}</span>
              <span className="text-xs font-medium text-on-surface-variant">Active Internet Pairings</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(data.recommendations || []).slice(0, 4).map((r) => (
                <span key={r.skill_id || r.recommendation_id} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface">
                  +{r.skill_name}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-on-surface-variant">
              Recommendations recalculate automatically when you add new competencies.
            </p>
          </div>
        </div>
      )}

      {/* ─── 3. MAIN TWO-COLUMN WORKSPACE (PROPORTIONED: 5 lg / 4 xl left, 7 lg / 8 xl right) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ─── LEFT COLUMN: MY VERIFIED SKILLS & COMPETENCY WORKSPACE (STICKY) ──── */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto pr-1">

          {/* ─── CARD: MY VERIFIED SKILLS PASSPORT ───────────────────────── */}
          <div className="bento-card p-5 space-y-4 bg-surface-container-lowest border border-outline-variant shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-vibrant-orange text-[20px]">psychology</span>
                <h2 className="text-base font-bold text-on-surface">My Verified Skills</h2>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-tint text-vibrant-orange border border-vibrant-orange/20">
                {data.studentSkills?.length || 0} Added
              </span>
            </div>

            {loading ? (
              <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
              </div>
            ) : data.studentSkills?.length === 0 ? (
              <div className="text-center py-5 px-4 space-y-3 bg-surface-container-low rounded-xl border border-dashed border-outline-variant">
                <div className="h-12 w-12 rounded-2xl bg-surface-container mx-auto flex items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[28px]">school</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-on-surface">No competencies recorded yet</p>
                  <p className="text-[11px] text-on-surface-variant max-w-xs mx-auto leading-relaxed">
                    Add your skills, tools, or curriculum competencies to generate live data-driven career recommendations.
                  </p>
                </div>

                {/* COURSE-SPECIFIC QUICK STARTER PACKS */}
                <div className="pt-2 border-t border-outline-variant space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    {data.program?.program_code ? `${data.program.program_code} Starter Packs` : 'Quick Starter Packs'}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {courseStarterPacks.map((pack, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAddStarterPack(pack.skills)}
                        disabled={actionLoading}
                        className="px-3 py-2 bg-surface-container hover:bg-orange-tint hover:text-vibrant-orange text-xs font-bold rounded-lg text-left transition-colors flex justify-between items-center disabled:opacity-50"
                      >
                        <span>{pack.name}</span>
                        <span className="material-symbols-outlined text-[16px]">add</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {data.studentSkills?.map((sk) => {
                  const intel = data.marketIntelligenceRepo?.[sk.skill_name];
                  const prof = (sk.proficiency_level || '').toLowerCase();
                  return (
                    <div
                      key={sk.id}
                      className="p-3 bg-surface-container-low hover:bg-surface-container rounded-xl flex items-center justify-between border border-outline-variant transition-all group"
                    >
                      <div className="space-y-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-on-surface truncate">{sk.skill_name}</span>
                          <span
                            className={`inline-block text-[9px] px-2 py-0.5 rounded font-black uppercase shrink-0 ${
                              prof === 'advanced'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-500/20'
                                : prof === 'intermediate'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 border border-sky-500/20'
                            }`}
                          >
                            {sk.proficiency_level}
                          </span>
                        </div>
                        {intel && (
                          <div className="flex items-center gap-2 text-[10px] text-on-surface-variant font-medium">
                            <span className="text-pinoy-green font-bold">{intel.growth_rate}</span>
                            <span>•</span>
                            <span>{intel.ph_hiring_index}/100 Hiring Index</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveModalSkill({ skill_name: sk.skill_name, ...intel })}
                          className="p-1.5 text-on-surface-variant hover:text-vibrant-orange hover:bg-orange-tint rounded-lg transition-colors"
                          title="View Market Intel"
                        >
                          <span className="material-symbols-outlined text-[17px]">info</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleRemoveSkill(sk);
                          }}
                          disabled={deletingSkillId === (sk.id || sk.skill_id)}
                          className="p-1.5 text-on-surface-variant hover:text-error hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                          title={`Remove ${sk.skill_name || 'skill'}`}
                          aria-label={`Remove ${sk.skill_name || 'skill'}`}
                        >
                          {deletingSkillId === (sk.id || sk.skill_id) ? (
                            <div className="w-4 h-4 border-2 border-error border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span className="material-symbols-outlined text-[17px]">delete</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── CARD: ADD COMPETENCY WORKSPACE (STREAMLINED & UNCLUTTERED) ─── */}
          <div className="bento-card p-5 space-y-4 bg-surface-container-lowest border border-outline-variant shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-vibrant-orange text-[20px]">add_circle</span>
                <span>Add Skill or Competency</span>
              </h2>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex p-1 rounded-xl bg-surface-container border border-outline-variant">
              <button
                type="button"
                onClick={() => {
                  setIsCustomSkill(false);
                  setCustomSkillPreview(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  !isCustomSkill
                    ? 'bg-vibrant-orange text-white shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">menu_book</span>
                <span>Course & Skills Library</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCustomSkill(true);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  isCustomSkill
                    ? 'bg-vibrant-orange text-white shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">edit_note</span>
                <span>Custom Competency</span>
              </button>
            </div>

            <form onSubmit={handleAddSkill} className="space-y-4">
              {!isCustomSkill ? (
                <div className="space-y-3.5">
                  {/* Single Course Filter Dropdown */}
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant block mb-1">
                      Academic Program Curriculum
                    </label>
                    <div className="relative">
                      <select
                        value={selectedProgramFilter}
                        onChange={(e) => {
                          setSelectedProgramFilter(e.target.value);
                          setSelectedSkill('');
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-medium outline-none focus:border-vibrant-orange appearance-none pr-8 transition-colors"
                      >
                        {data.program?.program_code && (
                          <option value={data.program.program_code}>
                            ⭐ My Enrolled Program: {data.program.program_name} ({data.program.program_code})
                          </option>
                        )}
                        <option value="all">🌐 Universal Academic Catalog (All Programs)</option>
                        {Object.values(PROGRAM_SKILLS_CATALOG).map((p) => {
                          if (p.program_code === data.program?.program_code) return null;
                          return (
                            <option key={p.program_code} value={p.program_code}>
                              {p.program_code} — {p.program_name} ({p.department})
                            </option>
                          );
                        })}
                      </select>
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant absolute right-2.5 top-2.5 pointer-events-none">
                        expand_more
                      </span>
                    </div>
                  </div>

                  {/* Instant Competency Search */}
                  <div>
                    <div className="relative">
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant absolute left-3 top-2.5 pointer-events-none">
                        search
                      </span>
                      <input
                        type="text"
                        placeholder="Search competency or tool (e.g. React, QuickBooks, AutoCAD)..."
                        value={skillSearchTerm}
                        onChange={(e) => setSkillSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-medium outline-none focus:border-vibrant-orange transition-colors"
                      />
                      {skillSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setSkillSearchTerm('')}
                          className="absolute right-2.5 top-2 text-on-surface-variant hover:text-on-surface"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Primary Interactive Curriculum Competency Chips */}
                  {programSkillsStructure.allRelated.length > 0 && !skillSearchTerm && (
                    <div className="p-3 bg-gradient-to-br from-surface-container-low to-surface-container rounded-xl border border-outline-variant space-y-2.5 animate-fade-in">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="material-symbols-outlined text-vibrant-orange text-[16px]">school</span>
                          <span className="text-[11px] font-bold text-on-surface">
                            {programSkillsStructure.program_code} Competencies
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-surface-container-high text-on-surface-variant">
                            {programSkillsStructure.allRelated.filter((s) => s.isAdded).length}/{programSkillsStructure.allRelated.length} Verified
                          </span>
                        </div>

                        {activeProgramSkills.some((s) => !s.isAdded) && (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleAddAllProgramSkills(activeProgramSkills)}
                            className="text-[10px] font-bold text-vibrant-orange hover:underline flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[13px]">playlist_add</span>
                            <span>Add All {curriculumTab === 'core' ? 'Core' : curriculumTab === 'related' ? 'Related' : 'Course'} Skills</span>
                          </button>
                        )}
                      </div>

                      {/* Filter Tabs for Competency Chips Wall */}
                      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface-container border border-outline-variant/60 w-fit text-[10px]">
                        <button
                          type="button"
                          onClick={() => setCurriculumTab('core')}
                          className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                            curriculumTab === 'core'
                              ? 'bg-vibrant-orange text-white'
                              : 'text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          Core Curriculum ({programSkillsStructure.core.length})
                        </button>
                        {programSkillsStructure.related.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setCurriculumTab('related')}
                            className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                              curriculumTab === 'related'
                                ? 'bg-vibrant-orange text-white'
                                : 'text-on-surface-variant hover:text-on-surface'
                            }`}
                          >
                            Related Field ({programSkillsStructure.related.length})
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setCurriculumTab('all')}
                          className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                            curriculumTab === 'all'
                              ? 'bg-vibrant-orange text-white'
                              : 'text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          All ({programSkillsStructure.allRelated.length})
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                        {activeProgramSkills.map((sk) => {
                          const isSelected = selectedSkill && (sk.skill_id ? selectedSkill == sk.skill_id : selectedSkill === sk.name);
                          return (
                            <button
                              key={`${sk.name}-${sk.from_program || ''}`}
                              type="button"
                              disabled={sk.isAdded || actionLoading}
                              onClick={() => {
                                if (sk.skill_id) {
                                  setSelectedSkill(sk.skill_id);
                                } else {
                                  setSelectedSkill(sk.name);
                                }
                              }}
                              className={`p-1.5 px-2.5 rounded-lg text-[10px] font-medium border transition-all flex items-center gap-1.5 text-left ${
                                sk.isAdded
                                  ? 'bg-green-tint/60 text-pinoy-green border-pinoy-green/30 cursor-default opacity-80'
                                  : isSelected
                                  ? 'bg-orange-tint text-vibrant-orange border-vibrant-orange ring-2 ring-vibrant-orange/20 shadow-xs font-bold'
                                  : 'bg-surface-container-lowest text-on-surface border-outline-variant hover:border-vibrant-orange hover:bg-surface-container'
                              }`}
                            >
                              <span>{sk.name}</span>
                              {sk.isAdded ? (
                                <span className="text-[9px] font-bold text-pinoy-green flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[12px]">check</span>
                                  <span>In Profile</span>
                                </span>
                              ) : isSelected ? (
                                <span className="text-[9px] font-bold px-1 rounded bg-vibrant-orange text-white">
                                  Selected
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Select from Library Section (All Skills Related to Student Course/Program) */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <label className="text-[11px] font-bold text-on-surface flex items-center gap-1">
                          <span className="material-symbols-outlined text-vibrant-orange text-[16px]">local_library</span>
                          <span>Select from Library</span>
                        </label>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-tint text-vibrant-orange border border-vibrant-orange/20">
                          {programSkillsStructure.allRelated.length} related to {programSkillsStructure.program_code}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {programSkillsStructure.unaddedAllRelated.length > 0 && (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleAddAllProgramSkills(programSkillsStructure.unaddedAllRelated)}
                            className="text-[10px] font-bold text-vibrant-orange hover:text-white hover:bg-vibrant-orange px-2.5 py-1 rounded-lg bg-orange-tint/70 border border-vibrant-orange/40 transition-all flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                            title={`Add all ${programSkillsStructure.unaddedAllRelated.length} unadded course skills to profile`}
                          >
                            <span className="material-symbols-outlined text-[13px]">playlist_add</span>
                            <span>+ Add All {programSkillsStructure.program_code} Skills ({programSkillsStructure.unaddedAllRelated.length})</span>
                          </button>
                        )}
                        {selectedSkill && (
                          <button
                            type="button"
                            onClick={() => setSelectedSkill('')}
                            className="text-[10px] font-bold text-on-surface-variant hover:text-on-surface transition-colors"
                          >
                            Clear Selection
                          </button>
                        )}
                      </div>
                    </div>

                    <select
                      id="student-skills-library-select"
                      value={selectedSkill}
                      onChange={(e) => setSelectedSkill(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-medium outline-none focus:border-vibrant-orange transition-colors"
                    >
                      <option value="">Choose a skill from library...</option>
                      {skillSearchTerm.trim() ? (
                        <optgroup label={`Search Results (${filteredSkillLibrary.length} skills)`}>
                          {filteredSkillLibrary.map((s) => (
                            <option key={`search-${s.skill_id}`} value={s.skill_id}>
                              {s.skill_name} ({s.category_name || 'General'}) {verifiedSkillNames.has((s.skill_name || '').toLowerCase().trim()) ? '— ✓ In Profile' : ''}
                            </option>
                          ))}
                        </optgroup>
                      ) : (
                        <>
                          {/* 1. Core Program Curriculum Competencies */}
                          <optgroup label={`⭐ Core Curriculum: ${programSkillsStructure.program_name} (${programSkillsStructure.core.length} skills)`}>
                            {programSkillsStructure.core.map((s) => (
                              <option key={`core-${s.name}-${s.skill_id || ''}`} value={s.skill_id || s.name}>
                                {s.name} ({s.category || 'Core'}) {s.isAdded ? '— ✓ In Profile' : ''}
                              </option>
                            ))}
                          </optgroup>

                          {/* 2. Related Department & Industry Competencies */}
                          {programSkillsStructure.related.length > 0 && (
                            <optgroup label={`🚀 Related ${programSkillsStructure.department} Competencies (${programSkillsStructure.related.length} skills)`}>
                              {programSkillsStructure.related.map((s) => (
                                <option key={`rel-${s.name}-${s.skill_id || ''}`} value={s.skill_id || s.name}>
                                  {s.name} ({s.category || 'Related'}) {s.isAdded ? '— ✓ In Profile' : ''}
                                </option>
                              ))}
                            </optgroup>
                          )}

                          {/* 3. Cross-Discipline & General Competencies */}
                          {programSkillsStructure.other.length > 0 && (
                            <optgroup label={`🌐 General & Cross-Discipline Skills (${programSkillsStructure.other.length} skills)`}>
                              {programSkillsStructure.other.map((s) => (
                                <option key={`other-${s.skill_id}`} value={s.skill_id}>
                                  {s.name} ({s.category || 'General'}) {s.isAdded ? '— ✓ In Profile' : ''}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </>
                      )}
                    </select>
                  </div>
                </div>
              ) : (
                /* Custom Competency Mode */
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant block mb-1">
                      Enter Any Skill, Tool, or Certification Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AutoCAD, QuickBooks, HACCP, Next.js, Amadeus GDS..."
                      value={customSkillName}
                      onChange={(e) => setCustomSkillName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-medium outline-none focus:border-vibrant-orange transition-colors"
                      required
                    />
                    <p className="text-[10px] text-on-surface-variant mt-1">
                      Works for any course — IT, Accounting, Engineering, Hospitality, Nursing, and more.
                    </p>
                  </div>

                  {/* LIVE CUSTOM SKILL INTERNET PREVIEW */}
                  {previewLoading && (
                    <div className="flex items-center gap-2 p-2 text-[11px] text-on-surface-variant">
                      <div className="h-3.5 w-3.5 border-2 border-vibrant-orange border-t-transparent rounded-full animate-spin"></div>
                      <span>Analyzing competency with live market benchmarks...</span>
                    </div>
                  )}
                  {customSkillPreview && !previewLoading && (
                    <div className="p-3 bg-gradient-to-br from-surface-container to-surface-container-high rounded-xl border border-outline-variant space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Live Internet Preview</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-tint text-pinoy-green animate-pulse">
                          ● Analyzed
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-on-surface">{customSkillPreview.domain || 'Detected Field'}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="p-2 bg-surface-container-lowest rounded-lg border border-outline-variant/60">
                          <span className="text-[9px] text-on-surface-variant block">Est. Salary</span>
                          <span className="text-[11px] font-bold text-on-surface">{customSkillPreview.ph_entry_salary || '₱28,000+'}</span>
                        </div>
                        <div className="p-2 bg-surface-container-lowest rounded-lg border border-outline-variant/60">
                          <span className="text-[9px] text-on-surface-variant block">Growth Rate</span>
                          <span className="text-[11px] font-bold text-pinoy-green">{customSkillPreview.growth_rate || '+30% YoY'}</span>
                        </div>
                      </div>
                      {customSkillPreview.companions && customSkillPreview.companions.length > 0 && (
                        <div>
                          <span className="text-[9px] text-on-surface-variant block mb-1">Companion Skills</span>
                          <div className="flex flex-wrap gap-1">
                            {customSkillPreview.companions.slice(0, 4).map((c, i) => (
                              <span key={i} className="text-[9px] font-bold px-2 py-0.5 bg-orange-tint text-vibrant-orange rounded-md">+{c}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Proficiency Level Selector */}
              <div>
                <label className="text-[11px] font-bold text-on-surface-variant block mb-1">Proficiency Level</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {['beginner', 'intermediate', 'advanced'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setProficiency(lvl)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold capitalize border transition-all text-center ${
                        proficiency === lvl
                          ? 'bg-orange-tint text-vibrant-orange border-vibrant-orange shadow-xs ring-1 ring-vibrant-orange/30'
                          : 'bg-surface-container-low text-on-surface-variant border-outline-variant hover:border-on-surface-variant'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Action Button (Clean High-Contrast State) */}
              <button
                type="submit"
                disabled={actionLoading || (!isCustomSkill && !selectedSkill) || (isCustomSkill && !customSkillName.trim())}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 ${
                  (!isCustomSkill && !selectedSkill) || (isCustomSkill && !customSkillName.trim())
                    ? 'bg-surface-container-high text-on-surface-variant/70 border border-outline-variant cursor-not-allowed'
                    : 'bg-vibrant-orange hover:bg-deep-orange text-white cursor-pointer'
                }`}
              >
                {actionLoading ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    <span>Save & Recalculate Recommendations</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ─── CARD: UNIVERSAL INTERNET EXPLORER SEARCH ────────────────── */}
          <div className="bento-card p-5 space-y-3 bg-surface-container-lowest border border-outline-variant shadow-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-500 text-[20px]">travel_explore</span>
              <div>
                <h3 className="font-bold text-xs text-on-surface">Explore Any Skill Market Intelligence</h3>
                <p className="text-[11px] text-on-surface-variant">Check demand & compensation for any skill in any academic discipline</p>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search any skill (e.g. QuickBooks, AutoCAD, HACCP, React)..."
                value={exploreQuery}
                onChange={(e) => setExploreQuery(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-medium outline-none focus:border-blue-500 transition-colors pr-8"
              />
              {exploreQuery && (
                <button
                  onClick={() => { setExploreQuery(''); setExplorerIntel(null); }}
                  className="absolute right-2.5 top-2.5 text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            {explorerLoading && (
              <div className="flex items-center gap-2 p-2 text-[11px] text-on-surface-variant">
                <div className="h-3.5 w-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Fetching internet intelligence for "{exploreQuery}"...</span>
              </div>
            )}

            {explorerIntel && !explorerLoading && (
              <div className="p-3 bg-surface-container rounded-xl border border-outline-variant space-y-2 text-xs animate-fade-in">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-on-surface">{explorerIntel.skill_name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-pinoy-green">{explorerIntel.growth_rate}</span>
                      {explorerIntel.domain && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">{explorerIntel.domain}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {explorerIntel.ph_hiring_index}/100 Hiring
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant line-clamp-2">{explorerIntel.job_market_summary}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-bold text-on-surface">Est: {explorerIntel.ph_entry_salary}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveModalSkill(explorerIntel)}
                      className="text-[11px] font-bold text-blue-600 hover:underline"
                    >
                      Deep Dive
                    </button>
                    {!verifiedSkillNames.has(explorerIntel.skill_name.toLowerCase()) && (
                      <button
                        onClick={() => handleQuickAddRecommendation(null, explorerIntel.skill_name)}
                        className="px-2.5 py-1 bg-vibrant-orange text-white rounded-lg text-[10px] font-bold hover:bg-deep-orange"
                      >
                        + Add Skill
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT COLUMN: AI DATA-DRIVEN RECOMMENDATIONS FEED (7 lg, 8 xl) ─── */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          <div className="bento-card p-6 space-y-5 bg-surface-container-lowest border border-outline-variant shadow-sm">
            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="material-symbols-outlined text-vibrant-orange text-[22px]">auto_awesome</span>
                  <h2 className="text-base md:text-lg font-bold text-on-surface">AI Data-Driven Recommendations</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-tint text-vibrant-orange border border-vibrant-orange/30 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-vibrant-orange animate-pulse"></span>
                    AI Engine Active
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Companion competencies & labor market projections aligned with academic curricula
                </p>
              </div>

              {/* Actions: AI Generate Button & Search Bar */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={aiGenerating || loading}
                  onClick={handleGenerateAiRecommendations}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-vibrant-orange to-deep-orange text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all disabled:opacity-50 shrink-0"
                  title="Recalculate recommendations aligned with your program and added competencies"
                >
                  <span className={`material-symbols-outlined text-[16px] ${aiGenerating ? 'animate-spin' : ''}`}>
                    {aiGenerating ? 'refresh' : 'auto_awesome'}
                  </span>
                  <span>{aiGenerating ? 'Aligning...' : 'Regenerate AI'}</span>
                </button>

                <div className="relative w-full sm:w-40">
                  <input
                    type="text"
                    placeholder="Filter skills..."
                    value={recSearch}
                    onChange={(e) => setRecSearch(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-outline-variant bg-surface-container-low text-xs outline-none focus:border-vibrant-orange transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* AI Alignment Context Insight Banner (Stacked Full-Width Layout) */}
            <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-br from-orange-tint/40 via-surface-container to-surface-container-high border border-vibrant-orange/30 space-y-3.5 shadow-sm">
              {/* Top: Description Row - Spans 100% width, never squished */}
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-vibrant-orange/15 flex items-center justify-center text-vibrant-orange shrink-0 mt-0.5 shadow-sm">
                  <span className="material-symbols-outlined text-[22px]">psychology</span>
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-on-surface text-sm md:text-base">
                      AI Curriculum Alignment:{' '}
                      <span className="text-vibrant-orange">
                        {aiAlignmentTarget === 'all'
                          ? 'All Degree Programs (53 Academic Courses)'
                          : aiAlignmentTarget === data.program?.program_code
                          ? `${data.program?.program_name || 'My Degree'} (${data.program?.program_code})`
                          : `${PROGRAM_SKILLS_CATALOG[aiAlignmentTarget]?.program_name || aiAlignmentTarget} (${aiAlignmentTarget})`
                        }
                      </span>
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-tint text-pinoy-green border border-pinoy-green/30 shrink-0">
                      ● Active Alignment
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Tuned to <strong className="text-on-surface">{data.studentSkills?.length || 0} verified competencies</strong> in your profile.
                    {data.ai_metadata?.primary_focus_skill ? (
                      <span className="inline-block mt-1 sm:mt-0 sm:inline sm:ml-1 text-vibrant-orange font-bold">
                        ✦ Technical recommendations actively prioritized based on your saved "{data.ai_metadata.primary_focus_skill}" competency.
                      </span>
                    ) : (
                      <span> Recommendations adapt automatically across all academic courses whenever you add or edit skills.</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Bottom: Switcher Controls Row - Full width with clean wrapping */}
              <div className="pt-3 border-t border-outline-variant/60 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider shrink-0">
                    Align To:
                  </span>

                  <button
                    type="button"
                    onClick={() => handleAlignmentChange('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                      aiAlignmentTarget === 'all'
                        ? 'bg-vibrant-orange text-white shadow-sm ring-1 ring-vibrant-orange'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface border border-outline-variant/60'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">public</span>
                    <span>All Courses (53)</span>
                  </button>

                  {data.program?.program_code && (
                    <button
                      type="button"
                      onClick={() => handleAlignmentChange(data.program.program_code)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                        aiAlignmentTarget === data.program.program_code
                          ? 'bg-vibrant-orange text-white shadow-sm ring-1 ring-vibrant-orange'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface border border-outline-variant/60'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">school</span>
                      <span>My Course ({data.program.program_code})</span>
                    </button>
                  )}

                  <div className="relative">
                    <select
                      value={aiAlignmentTarget === 'all' || aiAlignmentTarget === data.program?.program_code ? '' : aiAlignmentTarget}
                      onChange={(e) => {
                        if (e.target.value) handleAlignmentChange(e.target.value);
                      }}
                      className="px-2.5 py-1.5 pr-7 rounded-lg border border-outline-variant bg-surface-container text-xs font-medium outline-none focus:border-vibrant-orange text-on-surface appearance-none max-w-[210px] truncate"
                    >
                      <option value="">Other Academic Course...</option>
                      {Object.values(PROGRAM_SKILLS_CATALOG).map((p) => (
                        <option key={p.program_code} value={p.program_code}>
                          {p.program_code} — {p.program_name}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined text-[15px] text-on-surface-variant absolute right-1.5 top-2 pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>

                {data.ai_metadata?.engine && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-surface-container-high text-on-surface-variant border border-outline-variant/60 shrink-0">
                    {data.ai_metadata.engine}
                  </span>
                )}
              </div>
            </div>

            {/* Filter Category Pills */}
            <div className="flex flex-wrap gap-2 pt-1 border-b border-outline-variant pb-3">
              {[
                { id: 'all', label: 'All AI Recommendations', icon: 'apps' },
                { 
                  id: 'course_aligned', 
                  label: `${aiAlignmentTarget === 'all' ? 'All Courses' : aiAlignmentTarget} Aligned`, 
                  icon: 'school' 
                },
                { id: 'synergy', label: 'High Synergy Pairs', icon: 'hub' },
                { id: 'high_demand', label: 'Top In-Demand (92%+)', icon: 'trending_up' },
                { id: 'emerging', label: 'Fastest Growing (+35% YoY)', icon: 'rocket_launch' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    activeFilter === tab.id
                      ? 'bg-vibrant-orange text-white shadow-sm'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Recommendations Grid Feed */}
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3">
                <div className="animate-spin rounded-full h-9 w-9 border-4 border-vibrant-orange border-t-transparent"></div>
                <p className="text-xs font-bold text-on-surface-variant">AI Engine is analyzing academic curricula and verified competencies...</p>
              </div>
            ) : filteredRecommendations.length === 0 ? (
              <div className="text-center py-12 space-y-3 bg-surface-container-low rounded-2xl p-6 border border-dashed border-outline-variant">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant">search_off</span>
                <p className="text-xs font-bold text-on-surface">No recommendations match your current filter.</p>
                <button
                  onClick={() => {
                    setActiveFilter('all');
                    setRecSearch('');
                  }}
                  className="px-4 py-2 bg-vibrant-orange text-white rounded-lg text-xs font-bold hover:bg-deep-orange transition-colors"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedRecommendations.map((rec) => {
                  const intel = rec.intel || {};
                  const isAlreadyAdded = verifiedSkillNames.has((rec.skill_name || '').toLowerCase());

                  return (
                    <div
                      key={rec.recommendation_id}
                      className="p-4 bg-gradient-to-br from-surface-container-lowest to-surface-container rounded-2xl border border-outline-variant hover:border-vibrant-orange transition-all duration-200 space-y-3 flex flex-col justify-between shadow-sm hover:shadow-md group h-full"
                    >
                      {/* Top Bar: Skill & Synergy Tag */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block">
                                {rec.category_name || 'Technical Skills'}
                              </span>
                              {rec.match_type === 'primary_technical_synergy' && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-orange-tint text-vibrant-orange border border-vibrant-orange/30">
                                  Saved Skill Technical Pair
                                </span>
                              )}
                            </div>
                            <h3 className="font-bold text-sm text-on-surface group-hover:text-vibrant-orange transition-colors">
                              {rec.skill_name}
                            </h3>
                          </div>
                          <span className="text-[10px] font-black text-vibrant-orange bg-orange-tint px-2.5 py-1 rounded-full shrink-0 border border-vibrant-orange/20">
                            {rec.score || 95}% AI Fit
                          </span>
                        </div>

                        {/* Program & Synergy Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {rec.is_program_core && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1 shrink-0">
                              <span className="material-symbols-outlined text-[11px]">school</span>
                              <span>
                                {aiAlignmentTarget === 'all' ? 'Universal Core' : `${aiAlignmentTarget || data.program?.program_code || 'Degree'} Curriculum`}
                              </span>
                            </span>
                          )}
                          {rec.synergy_source && typeof rec.synergy_source === 'string' && !rec.synergy_source.includes('Core') && !rec.synergy_source.includes('Curriculum') && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-orange-tint text-vibrant-orange border border-vibrant-orange/20 flex items-center gap-1 shrink-0">
                              <span className="material-symbols-outlined text-[11px]">hub</span>
                              <span>Pairs with {rec.synergy_source}</span>
                            </span>
                          )}
                        </div>

                        {/* Match with My Verified Skills Explanation */}
                        {(() => {
                          const matchIntel = getSkillMatchExplanation(rec, data.studentSkills, data.program);
                          return (
                            <div className="p-2.5 bg-surface-container/70 rounded-xl text-[11px] text-on-surface-variant flex items-start gap-2.5 border border-outline-variant/50">
                              <div className="w-6 h-6 rounded-lg bg-vibrant-orange/10 flex items-center justify-center text-vibrant-orange shrink-0 mt-0.5">
                                <span className="material-symbols-outlined text-[15px]">psychology</span>
                              </div>
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1 flex-wrap">
                                  <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider block">
                                    Matches Your Verified Skills
                                  </span>
                                  {matchIntel.matchedSkillNames.length > 0 && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-tint text-vibrant-orange border border-vibrant-orange/20">
                                      Pairs with {matchIntel.matchedSkillNames[0]}
                                    </span>
                                  )}
                                </div>
                                <p className="leading-relaxed text-[11px] text-on-surface-variant">
                                  {matchIntel.explanation}
                                </p>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Entry Salary Indicator */}
                        {intel.ph_entry_salary && (
                          <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant font-medium">
                            <span className="material-symbols-outlined text-[14px] text-on-surface-variant">payments</span>
                            <span>Est. Market Range: <strong>{intel.ph_entry_salary}</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Bottom Action Row */}
                      <div className="pt-2.5 border-t border-outline-variant flex items-center justify-between gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setActiveModalSkill({ skill_name: rec.skill_name, ...intel, category_name: rec.category_name, skill_id: rec.skill_id })}
                          className="text-[11px] font-bold text-on-surface-variant hover:text-vibrant-orange flex items-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          <span>Explore Intel</span>
                        </button>

                        {isAlreadyAdded ? (
                          <span className="text-[11px] font-bold text-pinoy-green flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            <span>In Profile</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleQuickAddRecommendation(rec.skill_id, rec.skill_name)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 bg-vibrant-orange text-white hover:bg-deep-orange rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 shrink-0"
                          >
                            <span className="material-symbols-outlined text-[14px]">add</span>
                            <span>Add to Profile</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {!loading && filteredRecommendations.length > RECS_PER_PAGE && (
              <div className="pt-4 border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="text-on-surface-variant font-medium">
                  {showAllRecs ? (
                    <span>Showing all <strong>{filteredRecommendations.length}</strong> recommendations</span>
                  ) : (
                    <span>
                      Showing <strong>{(recPage - 1) * RECS_PER_PAGE + 1}–{Math.min(recPage * RECS_PER_PAGE, filteredRecommendations.length)}</strong> of <strong>{filteredRecommendations.length}</strong> recommendations
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAllRecs(!showAllRecs)}
                    className="px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-semibold transition-colors text-[11px]"
                  >
                    {showAllRecs ? `Paginate (${RECS_PER_PAGE} per page)` : 'Show All'}
                  </button>

                  {!showAllRecs && totalRecPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setRecPage((p) => Math.max(1, p - 1))}
                        disabled={recPage === 1}
                        className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed text-on-surface transition-colors"
                        title="Previous Page"
                      >
                        <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                      </button>

                      {Array.from({ length: totalRecPages }).map((_, idx) => {
                        const pageNum = idx + 1;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setRecPage(pageNum)}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                              recPage === pageNum
                                ? 'bg-vibrant-orange text-white shadow-xs'
                                : 'border border-outline-variant text-on-surface hover:bg-surface-container'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => setRecPage((p) => Math.min(totalRecPages, p + 1))}
                        disabled={recPage === totalRecPages}
                        className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed text-on-surface transition-colors"
                        title="Next Page"
                      >
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── 4. DEEP-DIVE MARKET INTELLIGENCE MODAL ────────────────────── */}
      {activeModalSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-2xl border border-outline-variant max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 animate-scale-up">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-outline-variant pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-orange-tint text-vibrant-orange">
                    {activeModalSkill.category_name || activeModalSkill.domain || 'Professional Competency'}
                  </span>
                  <span className="text-[10px] font-bold text-pinoy-green bg-green-tint px-2 py-0.5 rounded-full">
                    {activeModalSkill.growth_rate || '+35% YoY Demand'}
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-on-surface mt-1">{activeModalSkill.skill_name}</h2>
                <p className="text-xs text-on-surface-variant">{activeModalSkill.search_trend || 'Active demand across top hiring partners'}</p>
              </div>

              <button
                onClick={() => setActiveModalSkill(null)}
                className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-surface-container rounded-xl border border-outline-variant">
                <span className="text-[10px] font-bold text-on-surface-variant block">PH Hiring Index</span>
                <span className="text-lg font-black text-on-surface">{activeModalSkill.ph_hiring_index || 94}/100</span>
              </div>
              <div className="p-3 bg-surface-container rounded-xl border border-outline-variant">
                <span className="text-[10px] font-bold text-on-surface-variant block">Market Demand Level</span>
                <span className="text-lg font-black text-vibrant-orange">{activeModalSkill.market_demand_level || 'Very High'}</span>
              </div>
              <div className="p-3 bg-surface-container rounded-xl border border-outline-variant col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-on-surface-variant block">Est. Entry Salary</span>
                <span className="text-xs font-black text-on-surface line-clamp-1">{activeModalSkill.ph_entry_salary || '₱35,000 - ₱60,000/mo'}</span>
              </div>
            </div>

            {/* Market Summary */}
            {activeModalSkill.job_market_summary && (
              <div className="p-3.5 bg-blue-50/60 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-bold">
                  <span className="material-symbols-outlined text-[16px]">public</span>
                  <span>Internet Market Insight</span>
                </div>
                <p className="text-on-surface text-[12px] leading-relaxed">{activeModalSkill.job_market_summary}</p>
              </div>
            )}

            {/* Top Hiring Industries */}
            {activeModalSkill.top_industries && activeModalSkill.top_industries.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Top Hiring Sectors</h4>
                <div className="flex flex-wrap gap-2">
                  {activeModalSkill.top_industries.map((ind, i) => (
                    <span key={i} className="text-xs font-medium px-3 py-1 bg-surface-container rounded-lg text-on-surface border border-outline-variant/60">
                      🏢 {ind}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Companion Technologies */}
            {activeModalSkill.companion_skills && activeModalSkill.companion_skills.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Recommended Companion Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {activeModalSkill.companion_skills.map((comp, i) => (
                    <span key={i} className="text-xs font-bold px-2.5 py-1 bg-orange-tint text-vibrant-orange rounded-lg">
                      +{comp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Industry Learning Roadmap */}
            {activeModalSkill.learning_roadmap && activeModalSkill.learning_roadmap.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Recommended Learning Milestones</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeModalSkill.learning_roadmap.map((step, i) => (
                    <div key={i} className="p-2.5 bg-surface-container rounded-lg text-xs flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-vibrant-orange text-white font-black text-[10px] flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-on-surface font-medium">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Verified Certifications */}
            {activeModalSkill.certifications && activeModalSkill.certifications.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Top Recognized Certifications</h4>
                <div className="space-y-2">
                  {activeModalSkill.certifications.map((cert, i) => (
                    <div key={i} className="p-3 bg-surface-container-low rounded-xl border border-outline-variant flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-on-surface">{cert.name}</p>
                        <p className="text-[11px] text-on-surface-variant">{cert.provider}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-tint text-pinoy-green">
                        {cert.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="pt-4 border-t border-outline-variant flex items-center justify-end gap-3">
              <button
                onClick={() => setActiveModalSkill(null)}
                className="px-4 py-2.5 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container transition-colors"
              >
                Close
              </button>
              {!verifiedSkillNames.has((activeModalSkill.skill_name || '').toLowerCase()) && (
                <button
                  onClick={() => handleQuickAddRecommendation(activeModalSkill.skill_id, activeModalSkill.skill_name)}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-vibrant-orange text-white rounded-xl text-xs font-bold hover:bg-deep-orange transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">add_task</span>
                  <span>Add to My Verified Profile</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CONFIRM REMOVE SKILL ───────────────────────────── */}
      {skillToDelete && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => !deletingSkillId && setSkillToDelete(null)}
        >
          <div 
            className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-error/10 text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">delete_forever</span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-on-surface">Remove Verified Skill?</h3>
                <p className="text-[11px] text-on-surface-variant">Update skills passport</p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Are you sure you want to remove <strong className="text-on-surface font-bold">"{skillToDelete.skill_name}"</strong> from your verified skills?
            </p>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setSkillToDelete(null)}
                disabled={deletingSkillId !== null}
                className="px-3.5 py-2 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleExecuteDelete(skillToDelete)}
                disabled={deletingSkillId !== null}
                className="px-4 py-2 bg-error text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {deletingSkillId !== null ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    <span>Remove Skill</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
