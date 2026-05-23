import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AuthLayout from "./AuthLayout";
import { useAuth } from "./AuthContext";
import { useToast } from "../ui/ToastProvider";
import Button from "../ui/Button";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(6, "Minimum 6 characters"),
  rememberMe: z.boolean().optional(),
});

export default function Login() {
  const { login, user } = useAuth();
  const { addToast } = useToast();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { rememberMe: true },
  });

  useEffect(() => {
    if (location.state?.signupSuccess) {
      setNotice(location.state.signupSuccess);
    }
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate, location.state]);

  const onSubmit = async (values) => {
    setError("");
    setNotice("");
    try {
      await login({
        email: values.email,
        password: values.password,
        remember_me: values.rememberMe,
      });
      addToast({
        title: "Login successful",
        message: "Welcome back to CORTEX.",
        type: "success",
      });
      const redirectTo = location.state?.from || "/";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message = err.message || "Login failed";
      setError(message);
      addToast({
        title: "Login failed",
        message,
        type: "error",
      });
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Secure access for legal professionals, case intelligence, and compliance teams."
      footer={
        <span>
          New to CORTEX? <Link to="/signup">Create an account</Link>
        </span>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
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
              placeholder="Enter your password"
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
          {errors.password && <span className="field-error">{errors.password.message}</span>}
        </label>

        <div className="auth-row">
          <label className="checkbox">
            <input type="checkbox" {...register("rememberMe")} />
            Remember me
          </label>
          <Link to="/forgot-password" className="inline-link">
            Forgot password?
          </Link>
        </div>

        {notice && <div className="form-success">{notice}</div>}
        {error && <div className="form-error">{error}</div>}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Login"}
        </Button>
      </form>
    </AuthLayout>
  );
}
