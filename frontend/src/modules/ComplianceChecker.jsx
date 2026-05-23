import { useState } from "react";
import "./ComplianceChecker.css";
import { apiFetch } from "../auth/authApi";

export default function ComplianceChecker() {
  const [contractFile, setContractFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCheckCompliance = async () => {
    if (!contractFile) return;

    const formData = new FormData();

    formData.append("file", contractFile);

    try {
      setLoading(true);

      const data = await apiFetch("/analyze-contract", {
        method: "POST",
        body: formData,
      });

      setAnalysis(data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const complianceScore =
    analysis?.summary?.complianceScore ?? 82;
  const complianceStatus =
    analysis?.summary?.status ||
    (complianceScore >= 80
      ? "Compliant"
      : complianceScore >= 60
      ? "Partially Compliant"
      : "Non-Compliant");

  const statusClass = complianceStatus
    .toLowerCase()
    .replace(/\s+/g, "-");

  const checklist =
    analysis?.checklist || [
      { label: "GDPR Data Retention", ok: true },
      { label: "NDA Protection", ok: true },
      { label: "Arbitration Clause Missing", ok: false },
      { label: "Employee Disclosure Requirement", ok: false },
    ];

  const criticalRisks =
    analysis?.critical_violations || [
      {
        level: "High Risk",
        detail: "Missing GDPR consent handling",
      },
      {
        level: "Medium Risk",
        detail: "Incomplete employee confidentiality language",
      },
    ];

  const recommendations =
    analysis?.recommendations || [
      "Add arbitration clause",
      "Update data retention policy",
      "Include mandatory disclosure section",
    ];

  return (
    <div className="compliance-page">
      <header className="compliance-hero">
        <div>
          <span className="eyebrow">AI Legal Compliance Intelligence</span>
          <h1>Compliance Checker</h1>
          <p>
            Upload a contract to scan for regulatory issues, surface compliance
            gaps, and generate actionable recommendations.
          </p>

          <div className="upload-row">
            <label className="upload-btn">
              Upload Contract PDF
              <input
                type="file"
                accept=".pdf"
                hidden
                onChange={(e) => setContractFile(e.target.files[0])}
              />
            </label>

            {contractFile && (
              <div className="uploaded-file">{contractFile.name}</div>
            )}

            <button
              className="analyze-btn"
              onClick={handleCheckCompliance}
              disabled={loading}
            >
              {loading ? "Checking..." : "Check Compliance"}
            </button>
          </div>

          {analysis?.error && (
            <div className="error-banner">{analysis.error}</div>
          )}
        </div>

        <div className={`status-card ${statusClass}`}>
          <span className="status-label">{complianceStatus}</span>
          <div className="status-score">
            <span>{complianceScore}%</span>
            <p>Overall Compliance</p>
          </div>
          <div className="status-bar">
            <span style={{ width: `${complianceScore}%` }} />
          </div>
        </div>
      </header>

      <section className="compliance-grid">
        <div className="panel">
          <h2>Regulation Checklist</h2>
          <div className="checklist">
            {checklist.map((item, index) => (
              <div key={index} className="check-item">
                <span
                  className={`check-icon ${item.ok ? "ok" : "bad"}`}
                >
                  {item.ok ? "✓" : "✕"}
                </span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Critical Violations</h2>
          <div className="risk-list">
            {criticalRisks.map((risk, index) => (
              <div
                key={index}
                className={`risk-card ${risk.level
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
              >
                <span>{risk.level}</span>
                <p>{risk.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>AI Recommendations</h2>
          <ul className="recommendations">
            {recommendations.map((rec, index) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}