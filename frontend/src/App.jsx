import CaseRiskScore from "./modules/CaseRiskScore";
import ReactMarkdown from "react-markdown";
import { useEffect, useMemo, useState } from "react";
import "./App.css";
import JudgmentPrediction from "./modules/JudgmentPrediction";
import CourtroomPractice from "./modules/CourtroomPractice";
import ContractAnalyzer from "./modules/ContractAnalyzer";
import ComplianceChecker from "./modules/ComplianceChecker";
import {
  BrowserRouter,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";

import Login from "./auth/Login";
import Signup from "./auth/Signup";
import ForgotPassword from "./auth/ForgotPassword";
import { apiFetch } from "./auth/authApi";
import ProtectedRoute from "./auth/ProtectedRoute";
import { useAuth } from "./auth/AuthContext";
import { useToast } from "./ui/ToastProvider";

const SidebarIcon = () => (
  <svg
    className="sidebar-toggle-icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8.857 3h6.286c.733 0 1.357 0 1.863.031.522.033 1.007.104 1.469.297a4 4 0 0 1 2.197 2.197c.193.462.264.947.297 1.469C21 7.5 21 8.124 21 8.857v6.286c0 .733 0 1.357-.031 1.863-.033.522-.104 1.007-.297 1.469a4 4 0 0 1-2.197 2.197c-.462.193-.947.264-1.469.297C16.5 21 15.876 21 15.143 21H8.857c-.733 0-1.357 0-1.863-.031-.522-.033-1.007-.104-1.469-.297a4 4 0 0 1-2.197-2.197c-.193-.462-.264-.947-.297-1.469C3 16.5 3 15.876 3 15.143V8.857c0-.733 0-1.357.031-1.863.033-.522.104-1.007.297-1.469A4 4 0 0 1 5.525 3.328c.462-.193.947-.264 1.469-.297C7.5 3 8.124 3 8.857 3ZM5 8.857V15.143c0 .762.001 1.312.027 1.744.026.42.072.636.13.785a2 2 0 0 0 1.098 1.098c.15.058.366.104.786.13C7.473 18.925 8 18.999 9 19H9V5h-.143c-.762 0-1.312.001-1.744.027-.42.026-.636.072-.785.13a2 2 0 0 0-1.098 1.098c-.058.15-.104.366-.13.786C5.001 7.46 5 7.989 5 8.751V8.857ZM11 5v14h4.143c.762 0 1.312-.001 1.744-.027.42-.026.636-.072.785-.13a2 2 0 0 0 1.098-1.098c.058-.15.104-.366.13-.786C18.925 16.54 19 16.011 19 15.25V8.857c0-.762-.001-1.312-.027-1.744-.026-.42-.072-.636-.13-.785a2 2 0 0 0-1.098-1.098c-.15-.058-.366-.104-.786-.13C16.54 5.075 16.011 5 15.25 5H11Z"
      fill="currentColor"
    />
  </svg>
);

const Dashboard = () => {

  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000";

  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isNarrow, setIsNarrow] = useState(false);

  const displayName = user?.full_name || user?.email || "User";
  const profileRole = user?.role || "Member";

  const initials = useMemo(() => {
    const source = displayName.trim();
    if (!source) return "U";
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }, [displayName]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setProfileOpen(false);
      navigate("/login", { replace: true });
    }
  };

  useEffect(() => {
    const handleClose = (event) => {
      if (!event.target.closest(".sidebar-profile")) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) {
      document.addEventListener("click", handleClose);
    }
    return () => document.removeEventListener("click", handleClose);
  }, [profileOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("cortex.sidebarCollapsed");
    if (stored !== null) {
      setSidebarOpen(stored !== "true");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setIsNarrow(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("cortex.sidebarCollapsed", String(!sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    if (!isNarrow || !sidebarOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isNarrow, sidebarOpen]);

  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);
  const [uploaded, setUploaded] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [activeModule, setActiveModule] = useState("Legal Research");

  const selectModule = (moduleName) => {
    setActiveModule(moduleName);
    if (typeof window !== "undefined") {
      const slug = moduleName.toLowerCase().replace(/\s+/g, "-");
      window.history.replaceState(null, "", `#${slug}`);
      window.localStorage.setItem("cortex.activeModule", moduleName);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "").trim();
    const saved = window.localStorage.getItem("cortex.activeModule");
    const fromHash = hash
      ? hash.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
      : "";
    if (fromHash) {
      setActiveModule(fromHash);
    } else if (saved) {
      setActiveModule(saved);
    }
    const onHashChange = () => {
      const updated = window.location.hash.replace("#", "").trim();
      if (!updated) return;
      const normalized = updated
        .replace(/-/g, " ")
        .replace(/\b\w/g, (m) => m.toUpperCase());
      setActiveModule(normalized);
      window.localStorage.setItem("cortex.activeModule", normalized);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const handleSubmit = async () => {
    if (!query.trim()) return;
    if (!file && !uploadedFileName) {
      setError("Please upload a legal PDF first.");
      addToast({
        type: "error",
        title: "Upload required",
        message: "Please upload a PDF before asking questions.",
      });
      return;
    }
    const question = query.trim();
    setMessages((prev) => [...prev, { type: "user", text: question }]);
    try {
      setLoading(true);
      setError("");
      let currentFileName = uploadedFileName;
      if (file && !uploaded) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadData = await apiFetch("/upload-document", {
          method: "POST",
          body: formData,
        });
        console.log(uploadData);
        currentFileName = uploadData.filename;
        setUploadedFileName(currentFileName);
        setUploaded(true);
      }
      const data = await apiFetch("/legal-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: question, source_file: currentFileName }),
      });
      console.log(data);
      setMessages((prev) => [
        ...prev,
        { type: "assistant", answer: data.answer || "", sources: data.sources || [] },
      ]);
      setSources(data.sources || []);
      addToast({ type: "success", title: "Analysis ready", message: "Legal response generated." });
    } catch (err) {
      console.log(err);
      setError(err.message || "Failed to process request.");
      addToast({
        type: "error",
        title: "Request failed",
        message: err.message || "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`layout ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>

      {/* Floating toggle button — only visible when sidebar is closed */}
      {!sidebarOpen && (
        <button
          type="button"
          className="sidebar-toggle sidebar-toggle-floating"
          aria-label="Open sidebar"
          aria-expanded={false}
          onClick={() => setSidebarOpen(true)}
        >
          <SidebarIcon />
        </button>
      )}

      {isNarrow && (
        <button
          type="button"
          className={`sidebar-backdrop ${sidebarOpen ? "is-visible" : ""}`}
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`sidebar ${sidebarOpen ? "is-open" : "is-collapsed"} ${
          isNarrow ? "is-overlay" : ""
        }`}
      >
        {/* Toggle button lives inside sidebar when open */}
        <div className="sidebar-header">
          <button
            type="button"
            className="sidebar-toggle"
            aria-label="Close sidebar"
            aria-expanded={true}
            onClick={() => setSidebarOpen(false)}
          >
            <SidebarIcon />
          </button>
        </div>

        <div className="sidebar-title">CORTEX</div>

        <div className="sidebar-profile">
          <button
            className="sidebar-profile-button"
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
          >
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-profile-meta">
              <div className="sidebar-profile-name">{displayName}</div>
              <div className="sidebar-profile-role">{profileRole}</div>
            </div>
            <span className="sidebar-profile-caret">▾</span>
          </button>

          {profileOpen && (
            <div className="sidebar-profile-menu">
              <button
                className="sidebar-profile-item sidebar-profile-logout"
                type="button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>

        <div className="sidebar-menu">
          {[
            "Legal Research",
            "Case Risk Score",
            "Judgment Prediction",
            "Courtroom Practice",
            "Contract Analyzer",
            "Compliance Checker",
          ].map((module) => (
            <div
              key={module}
              className={`sidebar-menu-item ${activeModule === module ? "active" : ""}`}
              onClick={() => selectModule(module)}
            >
              {module}
            </div>
          ))}
        </div>
      </div>

      <div className="main-content">
        <div className="chat-area">

          {activeModule === "Legal Research" && (
            <>
              {messages.length === 0 && (
                <div className="welcome-section">
                  <h1 className="welcome-title">CORTEX Legal RAG Assistant</h1>
                  <p className="welcome-subtitle">
                    Grounded legal reasoning using uploaded documents, semantic
                    retrieval, and citation-based responses.
                  </p>
                  <div className="suggestions">
                    <div
                      className="suggestion-card"
                      onClick={() => setQuery("Summarize this legal document")}
                    >
                      Summarize this legal document
                    </div>
                    <div
                      className="suggestion-card"
                      onClick={() => setQuery("What are the important sections?")}
                    >
                      What are the important sections?
                    </div>
                    <div
                      className="suggestion-card"
                      onClick={() => setQuery("What legal risks are mentioned?")}
                    >
                      What legal risks are mentioned?
                    </div>
                  </div>
                  {file && (
                    <div className="uploaded-file">
                      📄 {file.name} uploaded and indexed for retrieval
                    </div>
                  )}
                </div>
              )}

              {messages.map((message, index) => {
                if (message.type === "user") {
                  return (
                    <div key={`user-${index}`} className="user-message">
                      {message.text}
                    </div>
                  );
                }
                return (
                  <div key={`assistant-${index}`} className="assistant-message">
                    <div className="retrieval-header">Retrieved Legal Analysis</div>
                    <ReactMarkdown>{message.answer || ""}</ReactMarkdown>
                    {message.sources?.length > 0 && (
                      <div className="sources-section">
                        <h4>Retrieved Sources</h4>
                        <ul>
                          {message.sources.map((source, sourceIndex) => (
                            <li key={sourceIndex}>
                              {source.file} — Chunk {source.chunk}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {activeModule === "Case Risk Score" && (
            <CaseRiskScore file={file} setFile={setFile} apiBaseUrl={apiBaseUrl} />
          )}
          {activeModule === "Judgment Prediction" && <JudgmentPrediction />}
          {activeModule === "Courtroom Practice" && <CourtroomPractice />}
          {activeModule === "Contract Analyzer" && <ContractAnalyzer />}
          {activeModule === "Compliance Checker" && <ComplianceChecker />}

        </div>

        {activeModule === "Legal Research" && (
          <div className="input-section">
            <div className="chat-input-container">
              <label className="upload-button">
                +
                <input
                  type="file"
                  accept=".pdf"
                  hidden
                  onChange={(e) => {
                    setFile(e.target.files[0]);
                    setUploaded(false);
                  }}
                />
              </label>
              <textarea
                placeholder="Ask legal questions grounded in uploaded documents..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={1}
                className="query-box"
              />
              <button onClick={handleSubmit} disabled={loading} className="send-button">
                {loading ? "..." : "→"}
              </button>
            </div>
            {loading && (
              <div className="loading-text">
                Retrieving relevant legal chunks and generating grounded response...
              </div>
            )}
            {error && <div className="error-text">{error}</div>}
          </div>
        )}
      </div>

      {activeModule === "Legal Research" && (
        <div className="retrieval-panel">
          <div className="retrieval-title">Retrieved Context</div>
          {sources.length > 0 ? (
            sources.map((source, index) => (
              <div key={index} className="retrieval-card">
                <div className="retrieval-file">{source.file}</div>
                <div className="retrieval-chunk">Chunk {source.chunk}</div>
                <div className="retrieval-score">Relevance: High</div>
              </div>
            ))
          ) : (
            <div className="empty-retrieval">
              Retrieved legal documents and citations will appear here.
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}