import { useState, useEffect } from "react";
import "./CaseRiskScore.css";
import { apiFetch } from "../auth/authApi";

export default function CaseRiskScore({ file, setFile, apiBaseUrl }) {
  const [uploaded, setUploaded] = useState(false);
  const [uploadedFilename, setUploadedFilename] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!file) {
      setUploaded(false);
      setUploadedFilename("");
      setResult(null);
    }
  }, [file]);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setUploaded(false);
      setUploadedFilename("");
      setResult(null);
      setError("");
    }
  };

  const uploadIfNeeded = async () => {
    if (!file) return;
    if (uploaded) return;

    const formData = new FormData();
    formData.append("file", file);

    const data = await apiFetch("/upload-document", {
      method: "POST",
      body: formData,
    });

    setUploaded(true);
    setUploadedFilename(data.filename || file.name);
  };

  const handleAnalyze = async () => {
    setError("");
    setResult(null);

    if (!file) {
      setError("Please upload a case PDF before analyzing.");
      return;
    }

    setLoading(true);

    try {
      await uploadIfNeeded();

      const data = await apiFetch("/case-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: uploadedFilename || file.name }),
      });

      setResult(data || {});
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const pct = Math.min(100, Math.max(0, result?.risk_score ?? 0));
  const riskLevel =
    result?.risk_level || (pct >= 70 ? "High" : pct >= 45 ? "Medium" : "Low");

  const scoreOr = (value, fallback) =>
    Number.isFinite(value) ? value : fallback;

  const signalCards = [
    {
      key: "evidence",
      label: "Evidence Strength",
      value: scoreOr(result?.metrics?.evidence_strength, 72),
      severity: (v) => (v >= 70 ? "Strong" : v >= 45 ? "Moderate" : "Weak"),
      positive: true,
    },
    {
      key: "precedent",
      label: "Precedent Match",
      value: scoreOr(result?.metrics?.precedent_match, 61),
      severity: (v) => (v >= 70 ? "Aligned" : v >= 45 ? "Mixed" : "Thin"),
      positive: true,
    },
    {
      key: "contradiction",
      label: "Contradiction Score",
      value: scoreOr(result?.metrics?.contradiction_score, 38),
      severity: (v) => (v >= 70 ? "Severe" : v >= 45 ? "Elevated" : "Low"),
      positive: false,
    },
    {
      key: "complexity",
      label: "Litigation Complexity",
      value: scoreOr(result?.metrics?.litigation_complexity, 56),
      severity: (v) => (v >= 70 ? "High" : v >= 45 ? "Moderate" : "Low"),
      positive: false,
    },
  ];

  const summary = {
    strengths:
      result?.summary?.strengths ||
      "Clear documentary trail and consistent witness timelines.",
    weaknesses:
      result?.summary?.weaknesses ||
      "Limited corroboration for key allegations and procedural exposure.",
    strategy:
      result?.summary?.recommended_strategy ||
      "Pursue early motion on admissibility while preparing negotiated resolution.",
    settlement:
      result?.summary?.settlement_probability || "62% likelihood of settlement",
  };

  return (
    <div className="case-risk-container">
      <div className="case-risk-hero">
        <div className="hero-copy">
          <span className="eyebrow">AI Litigation Risk Intelligence</span>
          <h2>Case Risk Score</h2>
          <p className="sub">
            Upload a case PDF, run analysis, and review structured risk insights
            with precedent matching, evidence strength, and litigation strategy.
          </p>

          <div className="controls">
            <label className="upload-btn">
              Upload Case
              <input type="file" accept=".pdf" onChange={handleFileChange} hidden />
            </label>

            {file && <div className="filename">{file.name}</div>}

            <button
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? "Analyzing..." : "Analyze Risk"}
            </button>
          </div>

          {loading && (
            <div className="loading-banner">
              Extracting case text, retrieving precedents, and generating
              assessment...
            </div>
          )}
          {error && <div className="error-text">{error}</div>}
        </div>

        <div className="hero-score">
          <div
            className="risk-circle"
            style={{
              background: `conic-gradient(#111111 ${pct}%, #e5e5e5 ${pct}% 100%)`,
            }}
          >
            <div className="risk-number">{pct}%</div>
          </div>
          <div className="risk-meta">
            <div className={`risk-badge ${riskLevel.toLowerCase()}`}>
              {riskLevel} Risk
            </div>
            <div className="predicted-strength">
              <span>Predicted Case Strength</span>
              <strong>{result?.case_strength || "Moderate"}</strong>
            </div>
            <div className="risk-note">
              Based on evidence consistency, precedent match, and litigation
              exposure.
            </div>
          </div>
        </div>
      </div>

      <section className="signal-grid">
        {signalCards.map((card) => {
          const value = Math.min(100, Math.max(0, card.value));
          const tag = card.severity(value);
          const tone = card.positive
            ? value >= 70
              ? "good"
              : value >= 45
              ? "mid"
              : "bad"
            : value >= 70
            ? "bad"
            : value >= 45
            ? "mid"
            : "good";

          return (
            <div key={card.key} className="signal-card">
              <div className="signal-top">
                <div>
                  <p className="signal-label">{card.label}</p>
                  <h3>{value}%</h3>
                </div>
                <span className={`signal-tag ${tone}`}>{tag}</span>
              </div>
              <div className="signal-bar">
                <span style={{ width: `${value}%` }} />
              </div>
            </div>
          );
        })}
      </section>

      <div className="case-risk-body">
        <div className="left-column">
          <div className="key-factors">
            <h4>Key Risk Factors</h4>
            <div className="factors-grid">
              {(result?.key_risk_factors || [])[0] ? (
                result.key_risk_factors.map((f, i) => (
                  <div key={i} className="factor-card">
                    <div className="factor-title">
                      {f.title || `Factor ${i + 1}`}
                    </div>
                    <div className="factor-desc">{f.description || f}</div>
                  </div>
                ))
              ) : (
                <div className="empty">Key risk factors will appear here.</div>
              )}
            </div>
          </div>

          <div className="evidence-strength">
            <h4>Evidence Strength Indicators</h4>
            <div className="evidence-list">
              {result?.evidence_strength ? (
                Object.entries(result.evidence_strength).map(([k, v]) => (
                  <div key={k} className="evidence-row">
                    <div className="evidence-key">{k}</div>
                    <div className="evidence-value">{v}</div>
                  </div>
                ))
              ) : (
                <div className="empty">
                  Evidence strength indicators will appear here.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="right-column">
          <div className="similar-precedents">
            <h4>Similar Legal Precedents</h4>
            {result?.similar_precedents?.length > 0 ? (
              result.similar_precedents.map((p, i) => (
                <div key={i} className="precedent-card">
                  <div className="precedent-header">
                    <div>
                      <div className="precedent-title">{p.title || p.case}</div>
                      <div className="precedent-meta">
                        {p.citation || p.cite || "Citation pending"}
                      </div>
                    </div>
                    <div className="precedent-score">
                      {p.similarity || p.similarity_pct || "--"}%
                    </div>
                  </div>
                  <div className="precedent-outcome">
                    Outcome: {p.outcome || "Unknown"}
                  </div>
                  <div className="precedent-reasoning">
                    {p.reasoning ||
                      "Key reasoning will appear after analysis."}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty">Similar precedents will be listed here.</div>
            )}
          </div>

          <div className="ai-analysis">
            <h4>AI Legal Analysis</h4>
            <div className="analysis-text">
              {result?.analysis_summary ||
                "AI analysis summary will appear here after running analysis."}
            </div>
          </div>
        </div>
      </div>

      <section className="summary-panel">
        <div className="summary-card">
          <h4>AI Litigation Summary</h4>
          <div className="summary-grid">
            <div className="summary-block">
              <span>Strengths</span>
              <p>{summary.strengths}</p>
            </div>
            <div className="summary-block">
              <span>Weaknesses</span>
              <p>{summary.weaknesses}</p>
            </div>
            <div className="summary-block">
              <span>Recommended Strategy</span>
              <p>{summary.strategy}</p>
            </div>
            <div className="summary-block">
              <span>Settlement Probability</span>
              <p>{summary.settlement}</p>
            </div>
          </div>
        </div>

        <div className="recommendations">
          <h4>Recommendation</h4>
          <div className="recommendation-text">
            {result?.recommendations ||
              "Recommendations will be suggested by the AI after analysis."}
          </div>
        </div>
      </section>
    </div>
  );
}

