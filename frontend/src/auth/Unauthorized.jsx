import { Link } from "react-router-dom";
import AuthLayout from "./AuthLayout";

export default function Unauthorized() {
  return (
    <AuthLayout
      title="Unauthorized"
      subtitle="You do not have permission to access this workspace."
      footer={<Link to="/">Return to dashboard</Link>}
    >
      <div className="auth-body">
        <p>Please contact your administrator to update your access level.</p>
      </div>
    </AuthLayout>
  );
}
