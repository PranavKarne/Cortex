import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AuthLayout from "./AuthLayout";
import { useAuth } from "./AuthContext";
import { useToast } from "../ui/ToastProvider";
import Button from "../ui/Button";

const schema = z
  .object({
    fullName: z.string().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(6, "Minimum 6 characters"),
    confirmPassword: z.string().min(6, "Minimum 6 characters"),
    terms: z.boolean().refine((val) => val, "Accept terms to continue"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function Signup() {
  const { signup, user } = useAuth();
  const { addToast } = useToast();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { terms: false },
  });

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const password = watch("password") || "";
  const strength = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 6) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const onSubmit = async (values) => {
    setError("");
    setSuccess("");
    try {
      await signup({
        full_name: values.fullName,
        email: values.email,
        password: values.password,
      });
      const notice = "Account created. Please verify your email, then sign in.";
      setSuccess(notice);
      addToast({
        title: "Signup successful",
        message: "Your account is ready. Please sign in.",
        type: "success",
      });
      navigate("/login", { replace: true, state: { signupSuccess: notice } });
    } catch (err) {
      const message = err.message || "Signup failed";
      setError(message);
      addToast({
        title: "Signup failed",
        message,
        type: "error",
      });
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Enterprise-grade access to litigation intelligence and compliance analytics."
      footer={
        <span>
          Already have an account? <Link to="/login">Log in</Link>
        </span>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
        <label>
          Full name
          <input type="text" placeholder="Enter your full name" {...register("fullName")} />
          {errors.fullName && <span className="field-error">{errors.fullName.message}</span>}
        </label>

        <label>
          Email
          <input type="email" placeholder="you@firm.com" {...register("email")} />
          {errors.email && <span className="field-error">{errors.email.message}</span>}
        </label>

        <label>
          Password
          <div className="input-row">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Create a secure password"
              {...register("password")}
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "Hide" : "Show"}
            </Button>
          </div>
          <div className="strength">
            <span style={{ width: `${(strength / 4) * 100}%` }} />
          </div>
          <small className="auth-helper">Use 6+ characters.</small>
          {errors.password && <span className="field-error">{errors.password.message}</span>}
        </label>

        <label>
          Confirm password
          <div className="input-row">
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Re-enter your password"
              {...register("confirmPassword")}
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowConfirm((prev) => !prev)}
            >
              {showConfirm ? "Hide" : "Show"}
            </Button>
          </div>
          {errors.confirmPassword && (
            <span className="field-error">{errors.confirmPassword.message}</span>
          )}
        </label>

        <label className="checkbox">
          <input type="checkbox" {...register("terms")} />
          I agree to the terms and privacy policy.
        </label>
        {errors.terms && <span className="field-error">{errors.terms.message}</span>}

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
