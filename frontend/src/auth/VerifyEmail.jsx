import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { useAuth } from "./AuthContext";

export default function VerifyEmail() {
  const { verifyEmail, resendVerification } = useAuth();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    const runVerify = async () => {
      if (!token) return;
      try {
        const result = await verifyEmail(token);
        setMessage(result.message || "Email verified.");
      } catch (err) {
        setError(err.message || "Verification failed");
      }
    };

    runVerify();
  }, [token, verifyEmail]);

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="Confirm your address to unlock secure legal analytics."
      footer={
        <span>
          Return to <Link to="/login">Login</Link>
        </span>
      }
    >
      <div className="auth-body">
        {message && <div className="form-success">{message}</div>}
        {error && <div className="form-error">{error}</div>}
        {!token && (
          <div className="auth-action">
            <p>Need a new verification email?</p>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button
              className="ghost-button"
              onClick={async () => {
                setError("");
                setMessage("");
                if (!email) {
                  setError("Enter your email to resend verification.");
                  return;
                }
                const result = await resendVerification(email);
                setMessage(result.message || "Verification email sent.");
              }}
              type="button"
            >
              Resend verification
            </button>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
