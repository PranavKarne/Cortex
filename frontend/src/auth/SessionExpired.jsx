import { Link } from "react-router-dom";
import AuthLayout from "./AuthLayout";

export default function SessionExpired() {
  return (
    <AuthLayout
      title="Session expired"
      subtitle="For your security, please sign in again to continue."
      footer={<Link to="/login">Return to login</Link>}
    >
      <div className="auth-body">
        <p>Your session timed out. Re-authentication is required.</p>
        <Link className="primary" to="/login">Sign in</Link>
      </div>
    </AuthLayout>
  );
}
