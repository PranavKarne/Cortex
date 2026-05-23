import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AuthLayout from "./AuthLayout";
import { useAuth } from "./AuthContext";

const schema = z
  .object({
    password: z.string().min(12, "Minimum 12 characters"),
    confirmPassword: z.string().min(12, "Minimum 12 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    setMessage("");
    setError("");
    try {
      await resetPassword(token, values.password);
      setMessage("Password updated. You can log in now.");
    } catch (err) {
      setError(err.message || "Reset failed");
    }
  };

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Create a strong password to secure your legal workspace."
      footer={
        <span>
          Return to <Link to="/login">Login</Link>
        </span>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
        <label>
          New password
          <input type="password" {...register("password")} />
          {errors.password && <span className="field-error">{errors.password.message}</span>}
        </label>

        <label>
          Confirm password
          <input type="password" {...register("confirmPassword")} />
          {errors.confirmPassword && (
            <span className="field-error">{errors.confirmPassword.message}</span>
          )}
        </label>

        {message && <div className="form-success">{message}</div>}
        {error && <div className="form-error">{error}</div>}

        <button className="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Reset password"}
        </button>
      </form>
    </AuthLayout>
  );
}
