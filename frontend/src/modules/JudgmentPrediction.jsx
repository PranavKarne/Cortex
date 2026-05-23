import { useState } from "react";
import "./JudgmentPrediction.css";
import { apiFetch } from "../auth/authApi";

export default function JudgmentPrediction() {
  const [caseFile, setCaseFile] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePredictJudgment = async () => {

    if (!caseFile) return;

    const formData = new FormData();

    formData.append("file", caseFile);

    try {

      setLoading(true);

      const data = await apiFetch("/predict-judgment", {
        method: "POST",
        body: formData,
      });

      setPrediction(data);

    } catch (err) {

      console.log(err);

    } finally {

      setLoading(false);

    }
  };

  return (
    <div className="judgment-page">

      <div className="judgment-top">

        <h1 className="judgment-title">
          Judgment Prediction
        </h1>

        <p className="judgment-subtitle">
          AI-powered legal outcome prediction using
          case reasoning, precedent analysis,
          and risk evaluation.
        </p>

        <div className="judgment-upload-section">

          <label className="judgment-upload-box">

            Upload Case File

            <input
              type="file"
              accept=".pdf"
              hidden
              onChange={(e) =>
                setCaseFile(e.target.files[0])
              }
            />

          </label>

          {caseFile && (
            <div className="uploaded-case">
              📄 {caseFile.name}
            </div>
          )}

          <button
            className="predict-button"
            onClick={handlePredictJudgment}
          >
            {loading
              ? "Predicting..."
              : "Predict Judgment"}
          </button>

        </div>

      </div>

      {prediction && (

        <div className="prediction-container">

          <div className="prediction-summary">

            <div className="prediction-header">

              <div>

                <div className="prediction-type">
                  {prediction.caseType}
                </div>

                <h2>
                  {prediction.predictedOutcome}
                </h2>

              </div>

              <div className="confidence-circle">
                {Math.round(prediction.confidence * 100)}%
              </div>

            </div>

            <div className="risk-level">
              Risk Level:
              <span>
                {prediction.riskLevel}
              </span>
            </div>

          </div>

          <div className="reasoning-section">

            <h3>
              AI Legal Reasoning
            </h3>

            <div className="reasoning-list">

              {prediction.reasoning.map(
                (reason, index) => (
                  <div
                    key={index}
                    className="reason-card"
                  >
                    • {reason}
                  </div>
                )
              )}

            </div>

          </div>

          <div className="precedents-section">

            <h3>
              Similar Precedents
            </h3>

            <div className="precedent-grid">

              {prediction.precedents.map(
                (precedent, index) => (

                  <div
                    key={index}
                    className="precedent-card"
                  >

                    <h4>
                      {precedent.case}
                    </h4>

                    <p>
                      Similarity:
                      {Math.round(precedent.similarity * 100)}%
                    </p>

                    <span>
                      {precedent.outcome}
                    </span>

                  </div>

                )
              )}

            </div>

          </div>

          <div className="factors-section">

            <h3>
              Decision Factors
            </h3>

            <div className="factor-list">

              {prediction.factors.map(
                (factor, index) => (

                  <div
                    key={index}
                    className="factor-card"
                  >

                    <div className="factor-top">

                      <span>
                        {factor.name}
                      </span>

                      <span>
                        {Math.round(factor.score * 100)}%
                      </span>

                    </div>

                    <div className="factor-bar">

                      <div
                        className="factor-fill"
                        style={{
                          width: `${factor.score * 100}%`
                        }}
                      ></div>

                    </div>

                  </div>

                )
              )}

            </div>

          </div>

        </div>

      )}

    </div>
  );
}