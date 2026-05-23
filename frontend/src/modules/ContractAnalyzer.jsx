import { useState } from "react";
import "./ContractAnalyzer.css";
import { apiFetch } from "../auth/authApi";

export default function ContractAnalyzer() {
  const [contractFile, setContractFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyzeContract = async () => {

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
  return (
    <div className="contract-page">

    <div className="contract-top">

      <h1 className="contract-title">
        Contract Analyzer
      </h1>

      <p className="contract-subtitle">
        Upload contracts to identify risks,
        obligations, and important clauses.
      </p>

      <div className="contract-upload-section">

        <label className="contract-upload-box">

          Upload Contract PDF

          <input
            type="file"
            accept=".pdf"
            hidden
            onChange={(e) =>
              setContractFile(e.target.files[0])
            }
          />

        </label>

        {contractFile && (
          <div className="uploaded-contract">
            📄 {contractFile.name}
          </div>
        )}

        <button
          className="analyze-button"
          onClick={handleAnalyzeContract}
        >
          {loading ? "Analyzing..." : "Analyze Contract"}
        </button>

      </div>

    </div>


      {analysis?.error && (

        <div className="contract-error">
          {analysis.error}
        </div>

      )}
      
      {analysis && (

        <div className="contract-summary-card">

          <div className="summary-top">

            <h2>AI Contract Summary</h2>

            <span className="summary-status">
              {analysis.summary.status}
            </span>

          </div>

          <div className="summary-grid">

            <div className="summary-item">
              <h3>
                {analysis.summary.clausesDetected}
              </h3>

              <p>Clauses Detected</p>
            </div>

            <div className="summary-item">
              <h3>
                {analysis.summary.criticalRisks}
              </h3>

              <p>Critical Risks</p>
            </div>

            <div className="summary-item">
              <h3>
                {analysis.summary.complianceScore}%
              </h3>

              <p>Compliance Score</p>
            </div>

          </div>

          <div className="summary-points">

            {analysis.points.map((point, index) => (
              <div
                key={index}
                className="summary-point"
              >
                • {point}
              </div>
            ))}

          </div>

        </div>

      )}

      <div className="contract-grid">

        {analysis &&
          analysis.clauses.map((clause, index) => (

            <div
              key={index}
              className="contract-card"
            >

              <div className="card-top">

                <div>

                  <div className="clause-type">
                    {clause.type}
                  </div>

                  <h3>
                    {clause.title}
                  </h3>

                </div>

                <span
                  className={`risk ${clause.risk.toLowerCase()}`}
                >
                  {clause.risk} Risk
                </span>

              </div>

              <p>
                {clause.description}
              </p>

              <div className="contract-meta">

                <span>
                  Section {clause.section}
                </span>

                <span>
                  {clause.status}
                </span>

              </div>

              <div className="risk-bar">

                <div
                  className={`risk-fill ${clause.risk.toLowerCase()}-fill`}
                ></div>

              </div>

            </div>

          ))}

      </div>

    </div>
  );
}
