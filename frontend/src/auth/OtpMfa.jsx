import { useState } from "react";
import AuthLayout from "./AuthLayout";

export default function OtpMfa() {
  const [code, setCode] = useState("");

  return (
    <AuthLayout
      title="Multi-factor verification"
      subtitle="Enter the one-time code sent to your secure device."
    >
      <div className="auth-body">
        <label>
          One-time code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123 456"
          />
        </label>
        <button className="primary" type="button">
          Verify code
        </button>
      </div>
    </AuthLayout>
  );
}
