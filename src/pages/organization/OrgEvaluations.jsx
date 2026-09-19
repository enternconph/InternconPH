import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { useRealtimeRefresh } from '../../contexts/SocketContext';

const COMPETENCY_CRITERIA = [
  {
    id: 'score_instructions',
    num: 1,
    title: 'Ability to Follow Instructions',
    icon: 'assignment_turned_in',
    description: 'Comprehension, diligence, and strict compliance with workplace directives, SOPs, and supervisor guidelines.'
  },
  {
    id: 'score_appearance',
    num: 2,
    title: 'Appearance',
    icon: 'checkroom',
    description: 'Professional grooming, adherence to company dress code, proper identification badge wear, and workplace decorum.'
  },
  {
    id: 'score_attitude',
    num: 3,
    title: 'Attitude',
    icon: 'sentiment_very_satisfied',
    description: 'Positive disposition, emotional maturity, enthusiasm, respect towards peers and superiors, and receptiveness to constructive feedback.'
  },
  {
    id: 'score_interpersonal',
    num: 4,
    title: 'Interpersonal Relations',
    icon: 'groups',
    description: 'Teamwork, collaborative spirit, communication with colleagues, active listening, and building harmonious relationships.'
  },
  {
    id: 'score_quality',
    num: 5,
    title: 'Quality of Work',
    icon: 'verified',
    description: 'Accuracy, thoroughness, neatness, attention to detail, and meeting high standards of workplace execution.'
  },
  {
    id: 'score_motivation',
    num: 6,
    title: 'Self Motivation',
    icon: 'bolt',
    description: 'Drive, resourcefulness, taking personal initiative, consistent productivity, and performing tasks without needing constant supervision.'
  },
  {
    id: 'score_learning',
    num: 7,
    title: 'Willingness to Learn',
    icon: 'school',
    description: 'Curiosity, eagerness to acquire new technical and soft skills, adaptability, and applying learned concepts quickly.'
  }
];

const getRatingDescriptor = (val) => {
  switch (val) {
    case 5:
      return { label: 'Exceptional', color: 'text-pinoy-green bg-green-tint' };
    case 4:
      return { label: 'Very Satisfactory', color: 'text-blue-600 bg-blue-50' };
    case 3:
      return { label: 'Satisfactory', color: 'text-vibrant-orange bg-orange-tint' };
    case 2:
      return { label: 'Fair', color: 'text-amber-600 bg-amber-50' };
    case 1:
    default:
      return { label: 'Needs Improvement', color: 'text-red-500 bg-red-50' };
  }
};

const parseScoreDetails = (details, fallbackRating = 5) => {
  if (!details) {
    const rounded = Math.round(Number(fallbackRating) || 5);
    return {
      score_instructions: rounded,
      score_appearance: rounded,
      score_attitude: rounded,
      score_interpersonal: rounded,
      score_quality: rounded,
      score_motivation: rounded,
      score_learning: rounded
    };
  }
  if (typeof details === 'string') {
    try {
      return JSON.parse(details);
    } catch {
      return {};
    }
  }
  return details;
};

export default function OrgEvaluations() {
  const [data, setData] = useState({ interns: [], evaluations: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);

  const [formData, setFormData] = useState({
    student_id: '',
    evaluation_period: 'final',
    score_instructions: 5,
    score_appearance: 5,
    score_attitude: 5,
    score_interpersonal: 5,
    score_quality: 5,
    score_motivation: 5,
    score_learning: 5,
    comments: '',
    recommend_for_hire: true
  });

  const fetchEvaluations = useCallback(async () => {
    try {
      const res = await api.get('/org/evaluations');
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Fetch evaluations error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvaluations();
  }, [fetchEvaluations]);

  // Real-time synchronization
  useRealtimeRefresh(fetchEvaluations);

  const overallRating = (
    (formData.score_instructions +
      formData.score_appearance +
      formData.score_attitude +
      formData.score_interpersonal +
      formData.score_quality +
      formData.score_motivation +
      formData.score_learning) /
    7
  ).toFixed(1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const payload = {
      ...formData,
      rating: parseFloat(overallRating),
      score_details: {
        score_instructions: formData.score_instructions,
        score_appearance: formData.score_appearance,
        score_attitude: formData.score_attitude,
        score_interpersonal: formData.score_interpersonal,
        score_quality: formData.score_quality,
        score_motivation: formData.score_motivation,
        score_learning: formData.score_learning
      }
    };

    const res = await api.post('/org/evaluations', payload);
    if (res.success) {
      setMessage(`Evaluation submitted successfully with Overall Composite Score: ${overallRating} / 5.0!`);
      setFormData({
        student_id: '',
        evaluation_period: 'final',
        score_instructions: 5,
        score_appearance: 5,
        score_attitude: 5,
        score_interpersonal: 5,
        score_quality: 5,
        score_motivation: 5,
        score_learning: 5,
        comments: '',
        recommend_for_hire: true
      });
      fetchEvaluations();
    } else {
      alert(res.message || 'Submission failed.');
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Workplace Performance Evaluations</h1>
          <p className="text-sm text-on-surface-variant">
            Evaluate OJT interns across 7 comprehensive competency standards. These verified scores can be viewed by academic institutions and future employers when students apply for jobs.
          </p>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-green-tint text-pinoy-green rounded-lg text-xs font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{message}</span>
        </div>
      )}

      {/* Submission Form Bento */}
      <form onSubmit={handleSubmit} className="bento-card space-y-6">
        <div className="flex justify-between items-center border-b border-outline-variant pb-3 flex-wrap gap-2">
          <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-vibrant-orange text-[22px]">star</span>
            <span>Submit Trainee Performance Scorecard</span>
          </h2>
          <span className="px-3.5 py-1 bg-orange-tint text-vibrant-orange rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <span className="material-symbols-outlined text-[16px]">grade</span>
            <span>Composite Rating:</span>
            <span className="text-sm font-black">{overallRating}</span>
            <span>/ 5.0 ★</span>
          </span>
        </div>

        {/* Evaluation Eligibility & Immutability Rules Notice */}
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
          <span className="material-symbols-outlined text-blue-600 text-[20px] shrink-0 mt-0.5">verified_user</span>
          <div className="space-y-1">
            <p className="font-bold">Evaluation Eligibility & Immutability Policy</p>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              • <strong>Eligibility Condition:</strong> Interns can only be evaluated once they have completed their required OJT hours (Rendered Hours ≥ Required Hours). Ongoing interns cannot be evaluated.
            </p>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              • <strong>One-Time Evaluation Rule:</strong> An organization can evaluate a student <strong>only once</strong>. Submitted scorecards are permanently finalized (read-only) and trigger institutional certificate issuance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">
              Select Completed Intern <span className="text-error">*</span>
            </label>
            <select
              required
              value={formData.student_id}
              onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-xs outline-none focus:ring-2 focus:ring-vibrant-orange font-bold text-on-surface"
            >
              {data.interns?.length === 0 ? (
                <option value="">No completed interns currently awaiting evaluation (must reach required hours first)</option>
              ) : (
                <>
                  <option value="">Choose an eligible intern ({data.interns?.length} completed)...</option>
                  {data.interns?.map((i) => (
                    <option key={i.student_id} value={i.student_id}>
                      {i.first_name} {i.last_name} ({i.student_number}) — {i.rendered_hours || 0}/{i.required_ojt_hours || 600} hrs ({i.institution_name || 'Partner School'})
                    </option>
                  ))}
                </>
              )}
            </select>
            {data.interns?.length === 0 && (
              <p className="text-[11px] text-on-surface-variant mt-1 italic">
                Only interns who have rendered all required hours appear in this dropdown.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Evaluation Milestone</label>
            <select
              value={formData.evaluation_period}
              onChange={(e) => setFormData({ ...formData, evaluation_period: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-xs outline-none text-on-surface font-medium"
            >
              <option value="midterm">Midterm Performance Assessment</option>
              <option value="final">Final End-of-OJT Completion Rating</option>
            </select>
          </div>
        </div>

        {/* 7 Competency Rating Grid */}
        <div className="space-y-3">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-vibrant-orange text-[16px]">fact_check</span>
              <span>7 Competency Standards (1 = Needs Improvement, 5 = Exceptional)</span>
            </h3>
            <span className="text-[11px] text-on-surface-variant">
              Rated on 1 to 5 scale
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {COMPETENCY_CRITERIA.map((crit) => {
              const currentScore = formData[crit.id] || 5;
              const descriptor = getRatingDescriptor(currentScore);

              return (
                <div
                  key={crit.id}
                  className="p-4 bg-surface-container rounded-xl border border-outline-variant space-y-3 hover:border-vibrant-orange/50 transition-all shadow-sm"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-orange-tint flex items-center justify-center text-vibrant-orange flex-shrink-0">
                        <span className="material-symbols-outlined text-[18px]">{crit.icon}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-on-surface uppercase tracking-wide">
                          {crit.num}. {crit.title}
                        </h4>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5 ${descriptor.color}`}>
                          {descriptor.label}
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-orange-tint text-vibrant-orange font-black text-xs flex-shrink-0">
                      {currentScore} / 5
                    </span>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={currentScore}
                    onChange={(e) => setFormData({ ...formData, [crit.id]: parseInt(e.target.value) })}
                    className="w-full accent-vibrant-orange cursor-pointer"
                  />

                  <div className="flex justify-between text-[10px] text-on-surface-variant font-semibold px-0.5">
                    <span>1 (Poor)</span>
                    <span>3 (Satisfactory)</span>
                    <span>5 (Exceptional)</span>
                  </div>

                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    {crit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Mentor Comments & Recommendation</label>
          <textarea
            rows="3"
            placeholder="Describe specific achievements, commendations, or areas for improvement..."
            value={formData.comments}
            onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-xs outline-none focus:ring-2 focus:ring-vibrant-orange"
          ></textarea>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
          <label className="flex items-center gap-2 text-xs font-bold text-on-surface cursor-pointer">
            <input
              type="checkbox"
              checked={formData.recommend_for_hire}
              onChange={(e) => setFormData({ ...formData, recommend_for_hire: e.target.checked })}
              className="rounded text-pinoy-green accent-pinoy-green"
            />
            <span>Recommend this trainee for regular employment upon graduation</span>
          </label>

          <button
            type="submit"
            disabled={!formData.student_id || data.interns?.length === 0}
            className="px-6 py-2.5 bg-vibrant-orange text-white rounded-lg font-bold text-xs hover:bg-deep-orange transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Submit Trainee Scorecard</span>
          </button>
        </div>
      </form>

      {/* History Table */}
      <div className="bento-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-on-surface">Submitted Evaluations History</h2>
            <p className="text-xs text-on-surface-variant">Records of completed intern performance evaluations.</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-surface-container-high text-xs font-bold text-on-surface-variant">
            {data.evaluations?.length || 0} Records
          </span>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-vibrant-orange border-t-transparent"></div>
          </div>
        ) : data.evaluations?.length === 0 ? (
          <p className="text-xs text-on-surface-variant text-center py-4">No evaluations submitted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant text-xs whitespace-nowrap">
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Milestone</th>
                  <th className="py-2.5 px-3">Overall Rating</th>
                  <th className="py-2.5 px-3">7 Competencies</th>
                  <th className="py-2.5 px-3">Comments</th>
                  <th className="py-2.5 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {data.evaluations?.map((ev) => (
                  <tr key={ev.record_id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-2.5 px-3 font-bold text-on-surface">
                      <div>{ev.first_name} {ev.last_name}</div>
                      <div className="text-[10px] text-on-surface-variant font-normal">{ev.student_number}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        <span className="material-symbols-outlined text-[12px]">lock</span>
                        Finalized
                      </span>
                    </td>
                    <td className="py-2.5 px-3 capitalize text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-orange-tint text-vibrant-orange font-bold text-[11px]">
                        {ev.evaluation_period}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-pinoy-green text-xs">
                      ⭐ {ev.rating} / 5.0
                    </td>
                    <td className="py-2.5 px-3 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedEvaluation(ev)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-container hover:bg-orange-tint hover:text-vibrant-orange text-on-surface text-[11px] font-bold transition-colors border border-outline-variant"
                      >
                        <span className="material-symbols-outlined text-[14px]">analytics</span>
                        <span>View Breakdown</span>
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-on-surface-variant max-w-xs truncate">{ev.comments || 'N/A'}</td>
                    <td className="py-2.5 px-3 text-xs text-on-surface-variant">{new Date(ev.evaluated_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Score Breakdown Modal */}
      {selectedEvaluation && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-surface rounded-2xl max-w-2xl w-full p-6 space-y-5 border border-outline-variant shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-outline-variant pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-orange-tint text-vibrant-orange font-bold text-[11px] uppercase tracking-wider">
                  {selectedEvaluation.evaluation_period} Evaluation Scorecard
                </span>
                <h3 className="text-lg font-bold text-on-surface mt-1">
                  {selectedEvaluation.first_name} {selectedEvaluation.last_name}
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Student ID: {selectedEvaluation.student_number} • Evaluated: {new Date(selectedEvaluation.evaluated_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedEvaluation(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Composite Rating Summary Card */}
            <div className="p-4 bg-surface-container-low rounded-xl flex justify-between items-center border border-outline-variant">
              <div>
                <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Overall Composite Rating</span>
                <p className="text-2xl font-black text-pinoy-green flex items-center gap-1.5 mt-0.5">
                  <span>⭐ {selectedEvaluation.rating}</span>
                  <span className="text-xs text-on-surface-variant font-medium">/ 5.0</span>
                </p>
              </div>
              <div className="text-right">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getRatingDescriptor(Math.round(selectedEvaluation.rating)).color}`}>
                  {getRatingDescriptor(Math.round(selectedEvaluation.rating)).label}
                </span>
              </div>
            </div>

            {/* 7 Competency Breakdown List */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-vibrant-orange text-[16px]">equalizer</span>
                <span>7 Competency Standards Assessment</span>
              </h4>

              {(() => {
                const details = parseScoreDetails(selectedEvaluation.score_details, selectedEvaluation.rating);
                return (
                  <div className="space-y-2">
                    {COMPETENCY_CRITERIA.map((crit) => {
                      const score = details[crit.id] || Math.round(Number(selectedEvaluation.rating) || 5);
                      const desc = getRatingDescriptor(score);
                      const pct = (score / 5) * 100;

                      return (
                        <div key={crit.id} className="p-3 bg-surface-container rounded-xl border border-outline-variant space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-on-surface flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-vibrant-orange text-[16px]">{crit.icon}</span>
                              <span>{crit.num}. {crit.title}</span>
                            </span>
                            <span className="font-black text-vibrant-orange">{score} / 5</span>
                          </div>

                          <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-vibrant-orange h-full rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-on-surface-variant">
                            <span>{crit.description}</span>
                            <span className={`px-1.5 py-0.2 rounded font-bold ${desc.color}`}>
                              {desc.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Written Comments */}
            {selectedEvaluation.comments && (
              <div className="p-3.5 bg-surface-container rounded-xl border border-outline-variant space-y-1">
                <h5 className="text-xs font-bold text-on-surface uppercase">Mentor Remarks</h5>
                <p className="text-xs text-on-surface-variant italic">"{selectedEvaluation.comments}"</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedEvaluation(null)}
                className="px-4 py-2 bg-surface-container text-on-surface font-bold text-xs rounded-lg hover:bg-surface-container-high transition-colors"
              >
                Close Scorecard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
