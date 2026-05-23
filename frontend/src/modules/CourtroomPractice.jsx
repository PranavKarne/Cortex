import { useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import "./CourtroomPractice.css";
import { apiFetch } from "../auth/authApi";

export default function CourtroomPractice() {
  const [caseFile, setCaseFile] = useState(null);

  const [role, setRole] = useState("defense");

  const [rounds, setRounds] = useState([]);

  const [input, setInput] = useState("");

  const [caseContext, setCaseContext] = useState("");

  const [busyAction, setBusyAction] = useState(null);

  const [error, setError] = useState(null);

  const [finalSummary, setFinalSummary] = useState(null);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef(null);

  const isBusy = !!busyAction;

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target)) {
        setRoleMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const roleOptions = [
    { value: "defense", label: "Defense Counsel" },
    { value: "prosecution", label: "Prosecutor" }
  ];

  const currentRoleOption = roleOptions.find((option) => option.value === role) || roleOptions[0];

  const startSession = async () => {

    if (!caseFile) return;

    const formData = new FormData();

    formData.append("file", caseFile);
    formData.append("role", role);

    let didFallback = false;
    let timeoutId = null;

    try {

      setBusyAction("starting");
      setError(null);

      // If the backend is slow, show a client-side fallback so the user can start typing.
      timeoutId = setTimeout(() => {
        didFallback = true;
        setBusyAction(null);
        setCaseContext("Case Analysis");
        setRounds([
          {
            userArgument: "",
            judgeOpening: "This court is now in session. (Opening pending from server)",
            aiResponse: "AI opponent opening is loading...",
            judgeFeedback: { focusPoints: ["Judge focus points are loading..."] },
            score: null,
            __clientFallback: true
          }
        ]);
      }, 6000);

      const data = await apiFetch("/start-courtroom-session", {
        method: "POST",
        body: formData,
      });

      clearTimeout(timeoutId);

      // If we already showed a client-side fallback, replace it with real server data.
      setCaseContext(data.caseTitle || "Case Analysis");

      setRounds((prev) => {
        const realRound = {
          userArgument: "",
          judgeOpening: data?.judgeOpening?.message || "This court is now in session.",
          aiResponse: data?.openingArgument?.message || "Courtroom session initialized.",
          judgeFeedback: data?.judgeContext?.focusPoints
            ? { focusPoints: data.judgeContext.focusPoints }
            : "Courtroom session initialized.",
          score: null
        };

        if (didFallback && prev.length > 0 && prev[0].__clientFallback) {
          // replace fallback
          return [realRound, ...prev.slice(1)];
        }

        return [realRound];
      });

      setFinalSummary(null);

    } catch (err) {

      setError(`Failed to start courtroom session: ${err.message}`);
      console.error(err);

    } finally {

      clearTimeout(timeoutId);
      setBusyAction(null);

    }
  };

  const sendMessage = async () => {

    if (!input.trim()) return;

    const currentArgument = input;


    const userMessage = input;

    setInput("");

    try {

      setBusyAction("sending");
      setError(null);

      const data = await apiFetch("/courtroom-turn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          role,
          userMessage,
          history: rounds,
          caseContext
        })
      });

      setRounds((prevRounds) => ([
        ...prevRounds,
        {
          userArgument: currentArgument,
          aiResponse: data?.aiResponse?.message || "",
          judgeFeedback: data?.judgeFeedback || "",
          score: data?.judgeFeedback?.score ?? null
        }
      ]));

    } catch (err) {

      setError(`Failed to send argument: ${err.message}`);
      console.error(err);
      // Re-add the message if it failed
      setInput(currentArgument);

    } finally {

      setBusyAction(null);

    }
  };

  const hasUserRounds = rounds.some((r) => (r.userArgument || "").trim().length > 0);

  const resetSession = () => {
    setRounds([]);
    setInput("");
    setCaseContext("");
    setError(null);
    setFinalSummary(null);
    setBusyAction(null);
  };

  const downloadTrial = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 48;
    const contentWidth = pageWidth - margin * 2;
    const lineHeight = 18;
    let cursorY = margin;

    const ensureSpace = (neededHeight) => {
      if (cursorY + neededHeight > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }
    };

    const writeHeading = (text, fontSize = 18) => {
      ensureSpace(fontSize + 14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(fontSize);
      doc.text(text, margin, cursorY);
      cursorY += fontSize + 12;
    };

    const writeLabelValue = (label, value) => {
      const text = `${label}: ${value || "-"}`;
      const lines = doc.splitTextToSize(text, contentWidth);
      ensureSpace(lines.length * lineHeight + 6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(lines, margin, cursorY);
      cursorY += lines.length * lineHeight;
    };

    const writeParagraph = (text, options = {}) => {
      const fontSize = options.fontSize || 11;
      const leading = options.leading || 16;
      const lines = doc.splitTextToSize(text || "-", contentWidth);
      ensureSpace(lines.length * leading + 6);
      doc.setFont("helvetica", options.bold ? "bold" : "normal");
      doc.setFontSize(fontSize);
      doc.text(lines, margin, cursorY);
      cursorY += lines.length * leading;
    };

    const renderJudgeFeedback = (feedback) => {
      if (!feedback) return ["-"];

      if (typeof feedback === "string") {
        return [feedback];
      }

      if (feedback.focusPoints && Array.isArray(feedback.focusPoints)) {
        return ["Judge focus points:", ...feedback.focusPoints.map((point) => `- ${point}`)];
      }

      const lines = [];
      if (feedback.logic) lines.push(`Logic: ${feedback.logic}`);
      if (feedback.evidenceUsage) lines.push(`Evidence usage: ${feedback.evidenceUsage}`);
      if (feedback.legalStrength) lines.push(`Legal strength: ${feedback.legalStrength}`);
      if (feedback.overallFeedback || feedback.feedback) {
        lines.push(`Overall: ${feedback.overallFeedback || feedback.feedback}`);
      }
      if (feedback.roundWinner) lines.push(`Round winner: ${feedback.roundWinner}`);
      return lines.length > 0 ? lines : ["-"];
    };

    doc.setTextColor(17, 17, 17);
    writeHeading("Courtroom Trial Export", 20);
    writeLabelValue("Case file", caseFile?.name || "Unknown file");
    writeLabelValue("Role", role === "defense" ? "Defense Counsel" : "Prosecutor");
    writeLabelValue("Case context", caseContext || "Case Analysis");
    writeLabelValue("Exported at", new Date().toLocaleString());

    if (finalSummary) {
      cursorY += 8;
      writeHeading("Final Summary", 15);
      writeLabelValue("Winner", finalSummary.winner || "-");
      if (typeof finalSummary.score === "number") {
        writeLabelValue("Final score", String(finalSummary.score));
      }
      if (finalSummary.summary) {
        writeParagraph(finalSummary.summary);
      }
      if (Array.isArray(finalSummary.actionableAdvice) && finalSummary.actionableAdvice.length > 0) {
        writeParagraph("Actionable advice:", { bold: true });
        finalSummary.actionableAdvice.forEach((item) => writeParagraph(`- ${item}`));
      }
    }

    rounds.forEach((round, index) => {
      cursorY += 8;
      writeHeading(`Round ${index + 1}`, 15);

      if (round.judgeOpening) {
        writeParagraph(`Judge opening: ${round.judgeOpening}`);
      }
      if (round.userArgument) {
        writeParagraph(`Your argument: ${round.userArgument}`);
      }
      if (round.aiResponse) {
        writeParagraph(`AI opponent: ${round.aiResponse}`);
      }

      const judgeLines = renderJudgeFeedback(round.judgeFeedback);
      writeParagraph("Judge evaluation:", { bold: true });
      judgeLines.forEach((line) => writeParagraph(line));

      if (round.score !== null && round.score !== undefined) {
        writeParagraph(`Score: ${round.score}`);
      }
    });

    doc.save(`courtroom-trial-${Date.now()}.pdf`);
  };

  const endAndSummarize = async () => {
    if (!hasUserRounds || finalSummary) return;

    try {
      setBusyAction("summarizing");
      setError(null);

      const data = await apiFetch("/courtroom-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          role,
          history: rounds,
          caseContext
        })
      });
      setFinalSummary(data);

    } catch (err) {
      setError(`Failed to generate final summary: ${err.message}`);
      console.error(err);
    } finally {
      setBusyAction(null);
    }
  };

  const renderJudgeText = (judgeFeedback) => {
    if (!judgeFeedback) return null;

    if (typeof judgeFeedback === "string") {
      return <div className="judge-text">{judgeFeedback}</div>;
    }

    if (judgeFeedback.focusPoints && Array.isArray(judgeFeedback.focusPoints)) {
      return (
        <div className="judge-text">
          <div>Judge focus points:</div>
          <div>
            {judgeFeedback.focusPoints.map((p, i) => (
              <div key={i}>- {p}</div>
            ))}
          </div>
        </div>
      );
    }

    const logic = judgeFeedback.logic;
    const evidenceUsage = judgeFeedback.evidenceUsage;
    const legalStrength = judgeFeedback.legalStrength;
    const overallFeedback = judgeFeedback.overallFeedback || judgeFeedback.feedback;

    return (
      <div className="judge-text">
        {logic && <div><strong>Logic:</strong> {logic}</div>}
        {evidenceUsage && <div><strong>Evidence usage:</strong> {evidenceUsage}</div>}
        {legalStrength && <div><strong>Legal strength:</strong> {legalStrength}</div>}
        {overallFeedback && <div><strong>Overall:</strong> {overallFeedback}</div>}
        {judgeFeedback.roundWinner && (
          <div><strong>Round winner:</strong> {judgeFeedback.roundWinner}</div>
        )}
      </div>
    );
  };

  return (
    <div className="courtroom-page">

      <div className="courtroom-sidebar">

        <h2>
          Courtroom Practice
        </h2>

        <p>
          Practice live legal arguments against
          AI-generated opposing counsel.
        </p>

        {error && (
          <div style={{
            backgroundColor: "#fee",
            color: "#c33",
            padding: "10px",
            borderRadius: "4px",
            marginBottom: "15px",
            fontSize: "14px",
            border: "1px solid #faa"
          }}>
            ⚠️ {error}
          </div>
        )}

        {rounds.length === 0 && (

          <>

            <div className="role-section" ref={roleMenuRef}>

              <label>
                Select Your Role
              </label>

              <button
                type="button"
                className={`role-select-trigger ${roleMenuOpen ? "is-open" : ""}`}
                onClick={() => setRoleMenuOpen((open) => !open)}
                aria-haspopup="listbox"
                aria-expanded={roleMenuOpen}
              >
                <span className="role-select-text">
                  <span className="role-select-label">{currentRoleOption.label}</span>
                </span>
              </button>

              {roleMenuOpen && (
                <div className="role-select-menu" role="listbox" aria-label="Select your role">
                  {roleOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`role-select-option ${role === option.value ? "is-selected" : ""}`}
                      onClick={() => {
                        setRole(option.value);
                        setRoleMenuOpen(false);
                      }}
                      role="option"
                      aria-selected={role === option.value}
                    >
                      <span className="role-select-option-label">{option.label}</span>
                    </button>
                  ))}
                </div>
              )}

            </div>

            <label className="courtroom-upload">

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

            <div className="sidebar-action-row sidebar-action-row-start">
              <button
                className="summary-button summary-button-start"
                onClick={startSession}
                disabled={isBusy || !caseFile}
              >
                {busyAction === "starting"
                  ? "Starting..."
                  : "Start Courtroom Session"}
              </button>
            </div>

          </>

        )}

        {rounds.length > 0 && caseFile && (
          <>
            <div className="uploaded-case uploaded-case-inline">
              📄 {caseFile.name}
            </div>

            <div className="sidebar-action-row">
              <button
                className="summary-button summary-button-download"
                onClick={downloadTrial}
                disabled={isBusy || rounds.length === 0}
              >
                Download Trial
              </button>
            </div>

            <div className="sidebar-action-row sidebar-action-row-secondary">
              <button
                className="new-session-button"
                onClick={resetSession}
                disabled={isBusy}
              >
                New Session
              </button>
            </div>
          </>
        )}

      </div>

      <div className="courtroom-chat">

        <div className="chat-header">
          Live Courtroom Debate
        </div>

        <div className="messages-container">

          {error && (
            <div style={{
              backgroundColor: "#fee",
              color: "#c33",
              padding: "15px",
              borderRadius: "4px",
              marginBottom: "15px",
              border: "1px solid #faa",
              textAlign: "center"
            }}>
              ⚠️ {error}
            </div>
          )}

          {rounds.length === 0 && (

            <div className="empty-courtroom">

              <h2>
                Courtroom Session Ready
              </h2>

              <p>
                Upload a case file and begin presenting legal arguments against the AI opposing counsel.
              </p>

            </div>

          )}

          {rounds.map((round, index) => (

            <div
              key={index}
              className="court-round"
            >

              {index === 0 && round.judgeOpening && (
                <div className="judge-card">
                  <div className="judge-title">
                    Judge Opens Proceedings
                  </div>
                  <div className="card-text">
                    {round.judgeOpening}
                  </div>
                </div>
              )}

              {round.userArgument && (

                <div className="argument-card user-card">

                  <div className="card-role">
                    Your Argument
                  </div>

                  <div className="card-text">
                    {round.userArgument}
                  </div>

                </div>

              )}

              <div className="argument-card ai-card">

                <div className="card-role">
                  AI Opponent
                </div>

                <div className="card-text">
                  {round.aiResponse}
                </div>

              </div>

              <div className="judge-card">

                <div className="judge-title">
                  Judge Evaluation
                </div>

                {renderJudgeText(round.judgeFeedback)}

                {round.score && (

                  <div className="judge-score">
                    Score: {round.score}
                  </div>

                )}

              </div>

            </div>

          ))}

          {finalSummary && (
            <div className="court-round">
              <div className="judge-card">
                <div className="judge-title">Final Courtroom Summary</div>
                <div className="judge-text">
                  <div><strong>Winner:</strong> {finalSummary.winner}</div>
                  {typeof finalSummary.score === "number" && (
                    <div><strong>Final score:</strong> {finalSummary.score}</div>
                  )}
                  {finalSummary.summary && (
                    <div style={{ marginTop: "8px" }}>{finalSummary.summary}</div>
                  )}
                  {Array.isArray(finalSummary.actionableAdvice) && finalSummary.actionableAdvice.length > 0 && (
                    <div style={{ marginTop: "8px" }}>
                      <div><strong>Actionable advice:</strong></div>
                      {finalSummary.actionableAdvice.map((a, i) => (
                        <div key={i}>- {a}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        <div className="chat-input-section">

          <textarea
            placeholder="Present your legal argument..."
            value={input}
            onChange={(e) =>
              setInput(e.target.value)
            }
            disabled={rounds.length === 0 || isBusy || !!finalSummary}
          />

          <button
            onClick={sendMessage}
            disabled={isBusy || !input.trim() || rounds.length === 0 || !!finalSummary}
          >
            {busyAction === "sending" ? "Sending..." : "Send"}
          </button>

        </div>

      </div>

    </div>
  );
}