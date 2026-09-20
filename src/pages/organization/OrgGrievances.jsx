import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';

export const CONDUCT_CATEGORIES = [
  { value: 'misconduct', label: 'General Misconduct / Unprofessional Behavior' },
  { value: 'attendance', label: 'Chronic Absenteeism / Unauthorized Tardiness' },
  { value: 'safety_violation', label: 'Safety Protocol Violation' },
  { value: 'property_damage', label: 'Company Property Damage / Negligence' },
  { value: 'academic_integrity', label: 'Breach of NDA / Data Confidentiality' },
  { value: 'harassment', label: 'Interpersonal Conflict / Harassment' },
  { value: 'other', label: 'Other Workplace Concern' }
];

export const ACCIDENT_CATEGORIES = [
  { value: 'workplace_accident', label: 'Workplace Accident & Physical Injury' },
  { value: 'slip_fall', label: 'Slip, Trip or Fall Incident' },
  { value: 'machinery_equipment', label: 'Machinery / Equipment Hazard' },
  { value: 'chemical_hazardous', label: 'Chemical / Hazardous Substance Exposure' },
  { value: 'physical_strain', label: 'Physical Strain / Ergonomic Injury' },
  { value: 'medical_emergency', label: 'Medical Emergency / Acute Physical Trauma' },
  { value: 'other_accident', label: 'Other Workplace Safety Incident' }
];

export const getCleanCategoryName = (c) => {
  let cat = c?.incident_category || c?.category_name || (typeof c?.category === 'string' ? c.category : '');
  // Sanitize if legacy mismatched to allowance/stipend
  if (!cat || cat.toLowerCase().includes('allowance') || cat.toLowerCase().includes('stipend')) {
    if (c?.is_accident || c?.accident_id) {
      return 'Workplace Accident & Physical Injury';
    }
    const titleLower = (c?.title || c?.subject || '').toLowerCase();
    if (titleLower.includes('server') || titleLower.includes('damage') || titleLower.includes('property')) {
      return 'Company Property Damage / Negligence';
    }
    return 'General Misconduct / Unprofessional Behavior';
  }
  const foundConduct = CONDUCT_CATEGORIES.find(item => item.value === cat);
  if (foundConduct) return foundConduct.label;
  const foundAccident = ACCIDENT_CATEGORIES.find(item => item.value === cat);
  if (foundAccident) return foundAccident.label;
  return cat.replace(/_/g, ' ');
};

export default function OrgGrievances() {
  const [activeTab, setActiveTab] = useState('file'); // 'file' | 'filed' | 'notices'
  const [data, setData] = useState({
    filedComplaints: [],
    forwardedNotices: [],
    forwardedGrievances: [],
    deployedStudents: [],
    deployedInterns: [],
    categories: []
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  // Form State for filing complaint about an intern
  const [formData, setFormData] = useState({
    student_id: '',
    category: 'misconduct',
    title: '',
    description: '',
    evidence_url: '',
    is_accident: false,
    accident_severity: 'moderate',
    incident_date: new Date().toISOString().slice(0, 16),
    incident_location: '',
    injuries_sustained: '',
    medical_attention_required: false,
    witnesses: '',
    emergency_actions_taken: '',
    preventive_measures: ''
  });

  const fetchGrievanceData = useCallback(async () => {
    try {
      const res = await api.get('/org/grievances');
      if (res.success && res.data) {
        setData({
          filedComplaints: res.data.filedComplaints || [],
          forwardedNotices: res.data.forwardedNotices || res.data.forwardedGrievances || [],
          forwardedGrievances: res.data.forwardedGrievances || res.data.forwardedNotices || [],
          deployedStudents: res.data.deployedStudents || res.data.deployedInterns || [],
          deployedInterns: res.data.deployedInterns || res.data.deployedStudents || [],
          categories: res.data.categories || []
        });
      }
    } catch (err) {
      console.error('Failed to fetch org grievances data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGrievanceData();
  }, [fetchGrievanceData]);

  useRealtimeRefresh(fetchGrievanceData);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const deployedList = data.deployedInterns?.length ? data.deployedInterns : (data.deployedStudents || []);
  const forwardedList = data.forwardedGrievances?.length ? data.forwardedGrievances : (data.forwardedNotices || []);
  const filedList = data.filedComplaints || [];

  const [reportFilter, setReportFilter] = useState('all');
  const conductList = useMemo(() => filedList.filter((c) => !c.is_accident && !c.accident_id), [filedList]);
  const accidentList = useMemo(() => filedList.filter((c) => c.is_accident || c.accident_id), [filedList]);
  const displayedFiledList = useMemo(() => {
    if (reportFilter === 'conduct') return conductList;
    if (reportFilter === 'accident') return accidentList;
    return filedList;
  }, [reportFilter, filedList, conductList, accidentList]);

  const selectedStudent = deployedList.find(
    (s) => String(s.student_id) === String(formData.student_id)
  );

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    if (!formData.student_id) {
      alert('Please select an intern from your deployed students.');
      return;
    }
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please enter a descriptive title and detailed summary of the incident.');
      return;
    }
    if (formData.is_accident) {
      if (!formData.incident_location.trim() || !formData.injuries_sustained.trim()) {
        alert('Accident Reports require Incident Location and Injuries Sustained details.');
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        subject: formData.title,
        title: formData.title,
        accident_details: formData.is_accident
          ? {
              incident_datetime: formData.incident_date,
              location: formData.incident_location,
              severity: formData.accident_severity,
              injury_description: formData.injuries_sustained,
              medical_attention_given: formData.medical_attention_required ? 'Medical attention was required' : 'No external medical attention required',
              witnesses: formData.witnesses,
              immediate_action_taken: formData.emergency_actions_taken,
              preventive_measures: formData.preventive_measures
            }
          : null
      };

      const res = await api.post('/org/complaints', payload);
      if (res.success) {
        showToast(
          formData.is_accident
            ? 'Accident & Incident Report submitted directly to the student’s Academic Institution.'
            : 'Intern Complaint successfully filed and forwarded to the student’s Academic Institution.'
        );
        // Reset form
        setFormData({
          student_id: '',
          category: 'misconduct',
          title: '',
          description: '',
          evidence_url: '',
          is_accident: false,
          accident_severity: 'moderate',
          incident_date: new Date().toISOString().slice(0, 16),
          incident_location: '',
          injuries_sustained: '',
          medical_attention_required: false,
          witnesses: '',
          emergency_actions_taken: '',
          preventive_measures: ''
        });
        setActiveTab('filed');
        fetchGrievanceData();
      } else {
        alert(res.message || 'Failed to submit report');
      }
    } catch (err) {
      console.error('Submit complaint error:', err);
      alert(err.response?.data?.message || err.message || 'Error filing incident report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-on-surface">Incident Reports & Student Grievances</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-vibrant-orange border border-orange-200">
              <span className="w-1.5 h-1.5 rounded-full bg-vibrant-orange animate-pulse"></span>
              OJT Safety & Compliance
            </span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            File workplace incidents or intern conduct reports directly to academic institutions, and review institutional grievance notices.
          </p>
        </div>

        {/* Quick Tabs */}
        <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl border border-outline-variant text-xs font-semibold">
          <button
            onClick={() => setActiveTab('file')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'file'
                ? 'bg-surface-container-lowest text-vibrant-orange shadow-sm font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">add_alert</span>
            <span>File Incident / Complaint</span>
          </button>
          <button
            onClick={() => setActiveTab('filed')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'filed'
                ? 'bg-surface-container-lowest text-vibrant-orange shadow-sm font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">history_edu</span>
            <span>Filed Reports ({filedList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('notices')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'notices'
                ? 'bg-surface-container-lowest text-vibrant-orange shadow-sm font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">announcement</span>
            <span>Institution Notices ({forwardedList.length})</span>
          </button>
        </div>
      </div>

      {/* Toast Banner */}
      {toast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold rounded-2xl flex items-center gap-2 animate-in fade-in duration-200 shadow-sm">
          <span className="material-symbols-outlined text-emerald-600">check_circle</span>
          <span>{toast}</span>
        </div>
      )}

      {/* TAB 1: FILE REPORT */}
      {activeTab === 'file' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 bento-card space-y-6">
            {/* Report Type Selector Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1.5 bg-surface-container rounded-2xl border border-outline-variant">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, is_accident: false, category: prev.is_accident ? 'misconduct' : prev.category }))}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all ${
                  !formData.is_accident
                    ? 'bg-surface-container-lowest text-vibrant-orange shadow-sm border border-outline-variant/60'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">gavel</span>
                <span>Intern Conduct / Misconduct Complaint</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, is_accident: true, category: !prev.is_accident ? 'workplace_accident' : prev.category }))}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all ${
                  formData.is_accident
                    ? 'bg-rose-50 text-rose-700 shadow-sm border border-rose-300'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px] text-rose-600">emergency</span>
                <span>Workplace Accident & Injury Report</span>
              </button>
            </div>

            <div className="border-b border-outline-variant pb-4">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className={`material-symbols-outlined ${formData.is_accident ? 'text-rose-600' : 'text-vibrant-orange'}`}>
                  {formData.is_accident ? 'emergency' : 'edit_document'}
                </span>
                {formData.is_accident ? 'Submit Workplace Accident & Physical Injury Report' : 'Submit Intern Conduct / Misconduct Complaint'}
              </h2>
              <p className="text-xs text-on-surface-variant mt-1">
                {formData.is_accident
                  ? 'Per OJT Safety Policy: All physical injuries and medical emergencies must be documented and transmitted immediately to the academic institution.'
                  : 'Per OJT Governance Policy: Reports are transmitted exclusively to the student\'s Academic Institution for formal review and counseling.'}
              </p>
            </div>

            <form onSubmit={handleSubmitComplaint} className="space-y-5">
              {/* Select Intern */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  Select Deployed Intern <span className="text-error">*</span>
                </label>
                {deployedList.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl">
                    No currently active student interns are deployed at your organization.
                  </div>
                ) : (
                  <select
                    name="student_id"
                    value={formData.student_id}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:border-vibrant-orange"
                  >
                    <option value="">-- Choose Deployed Student Intern --</option>
                    {deployedList.map((intern) => {
                      const internName = intern.student_name || `${intern.first_name || ''} ${intern.last_name || ''}`.trim() || 'Student Intern';
                      const internProg = intern.course || intern.program_name || 'Intern';
                      return (
                        <option key={intern.student_id} value={intern.student_id}>
                          {internName} ({internProg}) — {intern.institution_name}
                        </option>
                      );
                    })}
                  </select>
                )}
                {selectedStudent && (
                  <div className="mt-2 text-[11px] text-on-surface-variant bg-surface-container-low p-2.5 rounded-lg border border-outline-variant flex items-center justify-between">
                    <span>
                      <strong>Institution:</strong> {selectedStudent.institution_name}
                    </span>
                    <span>
                      <strong>Course:</strong> {selectedStudent.course || selectedStudent.program_name || 'N/A'}
                    </span>
                  </div>
                )}
              </div>

              {/* Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">
                    {formData.is_accident ? 'Accident & Injury Category' : 'Incident Category'}{' '}
                    <span className="text-error">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`w-full bg-surface-container border rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:outline-none transition-colors ${
                      formData.is_accident
                        ? 'border-rose-300 focus:border-rose-500'
                        : 'border-outline-variant focus:border-vibrant-orange'
                    }`}
                  >
                    {formData.is_accident ? (
                      ACCIDENT_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))
                    ) : (
                      CONDUCT_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">
                    Incident Title <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Brief description (e.g., Unexcused absence during shift)"
                    required
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:border-vibrant-orange"
                  />
                </div>
              </div>

              {/* Incident Description */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  Detailed Narrative & Observation <span className="text-error">*</span>
                </label>
                <textarea
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Detail the circumstances, exact dates/times, parties involved, and mentor interventions already attempted..."
                  required
                  className="w-full bg-surface-container border border-outline-variant rounded-xl p-3.5 text-sm text-on-surface focus:outline-none focus:border-vibrant-orange resize-none"
                />
              </div>

              {/* Evidence URL */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  Supporting Document or Evidence Link (Optional)
                </label>
                <input
                  type="url"
                  name="evidence_url"
                  value={formData.evidence_url}
                  onChange={handleInputChange}
                  placeholder="https://drive.google.com/... or uploaded incident log"
                  className="w-full bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:border-vibrant-orange"
                />
              </div>

              {/* TOGGLE ACCIDENT REPORT DETAILS */}
              {formData.is_accident && (
                <div className="p-5 bg-gradient-to-br from-rose-500/10 via-surface-container/50 to-surface-container-high/40 border border-rose-500/30 rounded-2xl space-y-4 shadow-xs animate-in fade-in duration-200">
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold text-on-surface flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        <span className="material-symbols-outlined text-[15px]">medical_services</span>
                      </span>
                      <span>Accident & Workplace Injury Specifics</span>
                    </span>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Complete severity, injury details, medical attention, and immediate corrective actions taken.
                    </p>
                  </div>

                  {/* Extended Accident Form Fields */}
                  <div className="pt-4 border-t border-rose-500/20 space-y-4 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-on-surface mb-1.5">
                          Accident Severity <span className="text-rose-500 font-bold">*</span>
                        </label>
                        <select
                          name="accident_severity"
                          value={formData.accident_severity}
                          onChange={handleInputChange}
                          className="w-full bg-surface-container border border-outline-variant focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-on-surface transition-all"
                        >
                          <option value="minor">Minor (First Aid / Superficial Scratch)</option>
                          <option value="moderate">Moderate (Clinic Assessment / Minor Sprain)</option>
                          <option value="severe">Severe (Hospital Emergency / Fracture / Inpatient)</option>
                          <option value="critical">Critical (Intensive Care / Life-Threatening)</option>
                          <option value="fatal">Fatal / Catastrophic</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-on-surface mb-1.5">
                          Exact Incident Date & Time <span className="text-rose-500 font-bold">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          name="incident_date"
                          value={formData.incident_date}
                          onChange={handleInputChange}
                          required
                          className="w-full bg-surface-container border border-outline-variant focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-on-surface transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-on-surface mb-1.5">
                        Incident Location within Facility <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        name="incident_location"
                        value={formData.incident_location}
                        onChange={handleInputChange}
                        placeholder="e.g., 3rd Floor Hardware Lab, Machine 4 area"
                        required={formData.is_accident}
                        className="w-full bg-surface-container border border-outline-variant focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-on-surface transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-on-surface mb-1.5">
                        Injuries Sustained <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <textarea
                        name="injuries_sustained"
                        rows={2}
                        value={formData.injuries_sustained}
                        onChange={handleInputChange}
                        placeholder="Detail physical injuries, cuts, burns, or physical trauma suffered..."
                        required={formData.is_accident}
                        className="w-full bg-surface-container border border-outline-variant focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl p-3 text-xs text-on-surface resize-none transition-all"
                      />
                    </div>

                    <div className="flex items-center gap-2.5 p-2 rounded-lg bg-surface-container/60 border border-outline-variant/40">
                      <input
                        type="checkbox"
                        id="med_att"
                        name="medical_attention_required"
                        checked={formData.medical_attention_required}
                        onChange={handleInputChange}
                        className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 accent-rose-500"
                      />
                      <label htmlFor="med_att" className="text-xs font-medium text-on-surface cursor-pointer select-none">
                        External Medical Attention / Hospital Transport was Required
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-on-surface mb-1.5">
                          Witnesses Present
                        </label>
                        <input
                          type="text"
                          name="witnesses"
                          value={formData.witnesses}
                          onChange={handleInputChange}
                          placeholder="Colleagues or supervisors present"
                          className="w-full bg-surface-container border border-outline-variant focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-on-surface transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-on-surface mb-1.5">
                          Immediate Emergency Actions Taken
                        </label>
                        <input
                          type="text"
                          name="emergency_actions_taken"
                          value={formData.emergency_actions_taken}
                          onChange={handleInputChange}
                          placeholder="First aid administered, emergency contact called"
                          className="w-full bg-surface-container border border-outline-variant focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-on-surface transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-on-surface mb-1.5">
                        Corrective & Preventive Measures
                      </label>
                      <textarea
                        name="preventive_measures"
                        rows={2}
                        value={formData.preventive_measures}
                        onChange={handleInputChange}
                        placeholder="Measures taken to ensure this safety hazard does not reoccur..."
                        className="w-full bg-surface-container border border-outline-variant focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl p-3 text-xs text-on-surface resize-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting || deployedList.length === 0}
                  className={`px-6 py-2.5 text-white text-sm font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 ${
                    formData.is_accident
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-vibrant-orange hover:bg-deep-orange'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{formData.is_accident ? 'emergency' : 'send'}</span>
                  <span>
                    {submitting
                      ? 'Transmitting Report...'
                      : formData.is_accident
                      ? 'File Workplace Accident Report'
                      : 'File Conduct Complaint to Institution'}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Guidelines Sidebar */}
          <div className="space-y-4">
            <div className="bento-card border-l-4 border-l-vibrant-orange space-y-3">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-vibrant-orange">security</span>
                Governance Protocol
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Workplace complaints and incident logs bypass public channels and are routed directly to the student&apos;s designated Institution Coordinator.
              </p>
              <div className="text-xs space-y-2 pt-2 border-t border-outline-variant text-on-surface-variant">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600 mt-0.5">check</span>
                  <span>Direct institutional notification sent in real-time.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600 mt-0.5">check</span>
                  <span>Institution can issue an official Warning Note to the student for conduct violations.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600 mt-0.5">check</span>
                  <span>System Admin maintains read-only oversight of serious accident records.</span>
                </div>
              </div>
            </div>

            <div className="bento-card bg-surface-container-low space-y-2">
              <h4 className="text-xs font-bold text-on-surface">Need Immediate Guidance?</h4>
              <p className="text-[11px] text-on-surface-variant">
                For life-threatening emergencies, immediately contact local emergency services and the institution emergency coordinator hotline before filing written documentation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FILED COMPLAINTS & ACCIDENTS */}
      {activeTab === 'filed' && (
        <div className="bento-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-outline-variant pb-3">
            <div>
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-vibrant-orange">history</span>
                Filed Reports & Workplace Incidents ({filedList.length})
              </h2>
              <p className="text-xs text-on-surface-variant">
                Records of intern misconduct or accident reports filed to partner academic institutions.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setReportFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  reportFilter === 'all'
                    ? 'bg-surface-container-highest text-on-surface border border-outline-variant shadow-xs'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                }`}
              >
                All ({filedList.length})
              </button>
              <button
                type="button"
                onClick={() => setReportFilter('conduct')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  reportFilter === 'conduct'
                    ? 'bg-orange-50 text-vibrant-orange border border-vibrant-orange/30 shadow-xs'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">report_problem</span>
                <span>Conduct ({conductList.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setReportFilter('accident')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  reportFilter === 'accident'
                    ? 'bg-rose-50 text-rose-700 border border-rose-300 shadow-xs'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">emergency</span>
                <span>Accidents ({accidentList.length})</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
            </div>
          ) : displayedFiledList.length === 0 ? (
            <div className="py-12 text-center text-on-surface-variant space-y-2">
              <span className="material-symbols-outlined text-4xl text-outline">verified</span>
              <p className="text-sm font-bold">
                {reportFilter === 'conduct'
                  ? 'No conduct complaints filed'
                  : reportFilter === 'accident'
                  ? 'No accident reports filed'
                  : 'No incident reports filed'}
              </p>
              <p className="text-xs">
                {reportFilter === 'conduct'
                  ? 'Your organization has not filed any conduct complaints regarding deployed interns.'
                  : reportFilter === 'accident'
                  ? 'No workplace accident or injury reports have been submitted.'
                  : 'Your organization has not filed any complaints regarding deployed student interns.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-outline-variant/60">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low/60 text-on-surface-variant text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                    <th className="py-3 px-3.5 min-w-[140px]">Intern Name</th>
                    <th className="py-3 px-3.5 min-w-[160px]">Institution</th>
                    <th className="py-3 px-3.5 min-w-[170px]">Category</th>
                    <th className="py-3 px-3.5 min-w-[180px]">Incident Title</th>
                    <th className="py-3 px-3.5 min-w-[130px]">Type</th>
                    <th className="py-3 px-3.5 min-w-[130px]">Institution Status</th>
                    <th className="py-3 px-3.5 min-w-[130px]">Warning to Student</th>
                    <th className="py-3 px-3.5 min-w-[100px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {displayedFiledList.map((c) => {
                    const internName = c.student_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Student Intern';
                    const incidentTitle = c.title || c.subject || 'Incident Report';
                    const categoryText = getCleanCategoryName(c);
                    const isAccident = Boolean(c.is_accident || c.accident_id);

                    return (
                      <tr key={c.complaint_id} className="hover:bg-surface-container-low/70 transition-colors text-xs group">
                        <td className="py-3.5 px-3.5 font-bold text-sm text-on-surface whitespace-nowrap">
                          <div>{internName}</div>
                          {c.course && (
                            <div className="text-[11px] font-normal text-on-surface-variant truncate max-w-[160px]">
                              {c.course}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-3.5 text-xs text-on-surface-variant max-w-[180px] truncate font-medium" title={c.institution_name}>
                          {c.institution_name || 'Academic Institution'}
                        </td>
                        <td className="py-3.5 px-3.5 text-xs">
                          {isAccident ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold text-[11px] whitespace-nowrap max-w-[200px] truncate shadow-xs"
                              title={categoryText}
                            >
                              <span className="material-symbols-outlined text-[13px] text-rose-400 shrink-0">medical_services</span>
                              <span className="truncate">{categoryText}</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold text-[11px] whitespace-nowrap max-w-[200px] truncate shadow-xs"
                              title={categoryText}
                            >
                              <span className="material-symbols-outlined text-[13px] text-amber-400 shrink-0">gavel</span>
                              <span className="truncate">{categoryText}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3.5 text-xs max-w-[220px]">
                          <div className="font-semibold text-on-surface truncate" title={incidentTitle}>
                            {incidentTitle}
                          </div>
                          <div className="text-[10px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[11px]">event</span>
                            <span>
                              {c.incident_datetime
                                ? new Date(c.incident_datetime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                : c.filed_at || c.created_at
                                ? new Date(c.filed_at || c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                : 'Recent'}
                            </span>
                            {c.accident_location && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[100px]" title={c.accident_location}>{c.accident_location}</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-3.5 text-xs whitespace-nowrap">
                          {isAccident ? (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              c.accident_severity === 'critical' || c.accident_severity === 'fatal'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : c.accident_severity === 'severe'
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            }`}>
                              <span className="material-symbols-outlined text-[13px]">emergency</span>
                              Accident ({c.accident_severity || 'Reported'})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/60 text-[11px] font-medium">
                              <span className="material-symbols-outlined text-[13px]">gavel</span>
                              Conduct Report
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3.5 text-xs whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider border ${
                              c.status === 'resolved'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : c.status === 'under_investigation'
                                ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                : c.status === 'admin_review'
                                ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {c.status?.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-3.5 text-xs whitespace-nowrap">
                          {c.warning_note_to_student ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px] bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                              <span className="material-symbols-outlined text-[13px]">task_alt</span>
                              Warning Sent
                            </span>
                          ) : isAccident ? (
                            <span className="text-on-surface-variant text-[11px] px-2.5 py-0.5 rounded-full bg-surface-container border border-outline-variant/40 italic">
                              N/A (Accident)
                            </span>
                          ) : (
                            <span className="text-on-surface-variant text-[11px] px-2.5 py-0.5 rounded-full bg-surface-container border border-outline-variant/40">
                              Pending Review
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedItem({ type: 'complaint', data: { ...c, category_name: categoryText, incident_category: categoryText } })}
                            className="px-3 py-1.5 bg-surface-container text-on-surface hover:bg-vibrant-orange hover:text-white rounded-lg text-xs font-bold transition-all border border-outline-variant hover:border-vibrant-orange inline-flex items-center gap-1 shadow-xs"
                          >
                            <span>View Details</span>
                            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INSTITUTION NOTICES (Forwarded Student Grievances) */}
      {activeTab === 'notices' && (
        <div className="bento-card space-y-4">
          <div className="border-b border-outline-variant pb-3">
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-vibrant-orange">forward_to_inbox</span>
              Formal Inquiries & Notices from Institutions
            </h2>
            <p className="text-xs text-on-surface-variant">
              When an academic institution reviews a student grievance implicating workplace conditions, they forward official inquiries here. Student identities are protected unless expressly authorized.
            </p>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
            </div>
          ) : forwardedList.length === 0 ? (
            <div className="py-12 text-center text-on-surface-variant space-y-2">
              <span className="material-symbols-outlined text-4xl text-outline">thumb_up</span>
              <p className="text-sm font-bold">No grievances forwarded</p>
              <p className="text-xs">No institution grievance notices have been issued to your organization.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-outline-variant/60">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low/60 text-on-surface-variant text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                    <th className="py-3 px-3.5 min-w-[130px]">Date Forwarded</th>
                    <th className="py-3 px-3.5 min-w-[200px]">Originating Institution</th>
                    <th className="py-3 px-3.5 min-w-[250px]">Notice / Subject</th>
                    <th className="py-3 px-3.5 min-w-[180px]">Complainant</th>
                    <th className="py-3 px-3.5 min-w-[100px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {forwardedList.map((notice) => {
                    const noticeTitle = notice.title || notice.subject || 'Institution Inquiry';
                    const complainantName = notice.student_name || (notice.first_name ? `${notice.first_name} ${notice.last_name || ''}`.trim() : 'Student Intern');

                    return (
                      <tr key={notice.complaint_id} className="hover:bg-surface-container-low/70 transition-colors text-xs group">
                        <td className="py-3.5 px-3.5 text-on-surface-variant whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-high text-on-surface border border-outline-variant/60 font-semibold text-[11px] shadow-xs">
                            <span className="material-symbols-outlined text-[13px] text-on-surface-variant">calendar_today</span>
                            {new Date(notice.forwarded_to_org_at || notice.created_at || notice.filed_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </td>
                        <td className="py-3.5 px-3.5 font-bold text-sm text-on-surface whitespace-nowrap">
                          {notice.institution_name || 'Academic Institution'}
                        </td>
                        <td className="py-3.5 px-3.5 font-medium text-xs text-on-surface max-w-[250px] truncate" title={noticeTitle}>
                          {noticeTitle}
                        </td>
                        <td className="py-3.5 px-3.5 text-xs text-on-surface-variant font-medium">
                          {complainantName}
                        </td>
                        <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedItem({ type: 'notice', data: { ...notice, title: noticeTitle, student_name: complainantName } })}
                            className="px-3 py-1.5 bg-surface-container text-on-surface hover:bg-vibrant-orange hover:text-white rounded-lg text-xs font-bold transition-all border border-outline-variant hover:border-vibrant-orange inline-flex items-center gap-1 shadow-xs"
                          >
                            <span>Read Inquiry</span>
                            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-2xl w-full rounded-2xl p-6 shadow-2xl border border-outline-variant space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-outline-variant pb-3">
              <div>
                <span className="text-xs font-bold text-vibrant-orange uppercase tracking-wider">
                  {selectedItem.type === 'complaint' ? 'Filed Incident Record' : 'Institution Formal Notice'}
                </span>
                <h3 className="text-lg font-bold text-on-surface mt-0.5">
                  {selectedItem.data.title || selectedItem.data.subject}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {selectedItem.type === 'complaint' && (() => {
              const item = selectedItem.data;
              const isAccident = Boolean(item.is_accident || item.accident_id);
              const cleanCategory = getCleanCategoryName(item);

              return (
                <div className="space-y-4 text-xs">
                  {/* Type Banner */}
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/60">
                    <span className="inline-flex items-center gap-1.5 font-bold">
                      <span className={`material-symbols-outlined text-[18px] ${isAccident ? 'text-rose-500' : 'text-vibrant-orange'}`}>
                        {isAccident ? 'emergency' : 'gavel'}
                      </span>
                      <span className="text-on-surface">
                        {isAccident ? 'Workplace Accident & Physical Injury Report' : 'Intern Conduct / Misconduct Complaint'}
                      </span>
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider border ${
                      item.status === 'resolved'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : item.status === 'under_investigation'
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        : item.status === 'admin_review'
                        ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    }`}>
                      {item.status?.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant/40">
                    <div>
                      <span className="text-on-surface-variant block text-[11px]">Subject Intern:</span>
                      <strong className="text-on-surface text-sm">
                        {item.student_name || `${item.first_name || ''} ${item.last_name || ''}`.trim()}
                      </strong>
                      {item.student_number && (
                        <div className="text-[10.5px] text-on-surface-variant">ID: {item.student_number}</div>
                      )}
                    </div>
                    <div>
                      <span className="text-on-surface-variant block text-[11px]">Academic Institution:</span>
                      <strong className="text-on-surface text-sm">{item.institution_name}</strong>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block text-[11px]">Incident Category:</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 mt-0.5 rounded-md text-[11px] font-semibold border ${
                        isAccident
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}>
                        <span className="material-symbols-outlined text-[13px]">{isAccident ? 'medical_services' : 'gavel'}</span>
                        <span>{cleanCategory}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block text-[11px]">Date & Time Reported:</span>
                      <strong className="text-on-surface">
                        {new Date(item.filed_at || item.created_at || item.incident_datetime).toLocaleString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-on-surface mb-1">Narrative Description:</h4>
                    <p className="p-3 bg-surface-container-low rounded-xl text-on-surface leading-relaxed whitespace-pre-wrap border border-outline-variant/40">
                      {item.description}
                    </p>
                  </div>

                  {/* Supporting Document / Evidence */}
                  {item.evidence_url && (
                    <div>
                      <h4 className="font-bold text-on-surface mb-1">Supporting Document / Evidence:</h4>
                      <a
                        href={item.evidence_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 p-2.5 bg-surface-container-low rounded-xl text-vibrant-orange hover:underline text-xs break-all border border-outline-variant/60 w-full"
                      >
                        <span className="material-symbols-outlined text-[16px]">attach_file</span>
                        <span className="truncate flex-1">{item.evidence_url}</span>
                        <span className="material-symbols-outlined text-[14px] shrink-0">open_in_new</span>
                      </a>
                    </div>
                  )}

                  {/* Accident Report Details if applicable */}
                  {isAccident && (
                    <div className="p-4 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl space-y-2.5">
                      <h4 className="font-bold text-rose-800 dark:text-rose-200 flex items-center gap-1.5 text-sm">
                        <span className="material-symbols-outlined text-[18px] text-rose-600 dark:text-rose-400">medical_services</span>
                        Workplace Accident & Physical Injury Details
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-800 dark:text-slate-200">
                        <div>
                          <span className="text-rose-700 dark:text-rose-300 font-semibold">Severity:</span>{' '}
                          <span className="uppercase font-bold text-slate-900 dark:text-slate-100">{item.accident_severity || 'Reported'}</span>
                        </div>
                        <div>
                          <span className="text-rose-700 dark:text-rose-300 font-semibold">Location:</span>{' '}
                          <span>{item.accident_location || item.incident_location || 'Facility'}</span>
                        </div>
                        <div className="col-span-1 sm:col-span-2">
                          <span className="text-rose-700 dark:text-rose-300 font-semibold">Injuries Sustained:</span>{' '}
                          <span>{item.injury_description || item.injuries_sustained || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-rose-700 dark:text-rose-300 font-semibold">Medical Attention:</span>{' '}
                          <span>{item.medical_attention_given || (item.medical_attention_required ? 'Required external medical attention' : 'No external medical attention required')}</span>
                        </div>
                        {item.incident_datetime && (
                          <div>
                            <span className="text-rose-700 dark:text-rose-300 font-semibold">Incident Time:</span>{' '}
                            <span>{new Date(item.incident_datetime).toLocaleString()}</span>
                          </div>
                        )}
                        {item.witnesses && (
                          <div className="col-span-1 sm:col-span-2">
                            <span className="text-rose-700 dark:text-rose-300 font-semibold">Witnesses:</span>{' '}
                            <span>{item.witnesses}</span>
                          </div>
                        )}
                        {(item.immediate_action_taken || item.emergency_actions_taken) && (
                          <div className="col-span-1 sm:col-span-2">
                            <span className="text-rose-700 dark:text-rose-300 font-semibold">Emergency Actions Taken:</span>{' '}
                            <span>{item.immediate_action_taken || item.emergency_actions_taken}</span>
                          </div>
                        )}
                        {(item.preventive_measures) && (
                          <div className="col-span-1 sm:col-span-2">
                            <span className="text-rose-700 dark:text-rose-300 font-semibold">Preventive Measures:</span>{' '}
                            <span>{item.preventive_measures}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Institution Warning to Student */}
                  {item.warning_note_to_student && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                      <h4 className="font-bold text-amber-900 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">warning</span>
                        Official Institution Warning Issued to Intern
                      </h4>
                      <p className="text-amber-800 leading-relaxed">
                        {item.warning_note_to_student}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {selectedItem.type === 'notice' && (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-surface-container-low rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-on-surface-variant block">Originating Institution:</span>
                    <strong className="text-on-surface">{selectedItem.data.institution_name}</strong>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block">Complainant:</span>
                    <strong className="text-on-surface">{selectedItem.data.student_name}</strong>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-on-surface mb-1">Official Inquiry Summary:</h4>
                  <p className="p-3 bg-surface-container-low rounded-xl text-on-surface leading-relaxed whitespace-pre-wrap">
                    {selectedItem.data.org_notice_summary || selectedItem.data.description}
                  </p>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl">
                  <p className="text-[11px] leading-relaxed">
                    Please coordinate with the institution&apos;s OJT Coordinator or Dean regarding any corrective actions or clarifications requested.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 bg-surface-container text-on-surface font-bold text-xs rounded-xl hover:bg-surface-container-high"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
