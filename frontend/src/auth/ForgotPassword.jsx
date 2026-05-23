import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AuthLayout from "./AuthLayout";
import { useAuth } from "./AuthContext";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [message, setMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    setMessage("");
    await forgotPassword(values.email);
    setMessage("If the email exists, reset instructions were sent.");
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Receive a secure reset link to regain access to your account."
      footer={
        <span>
          Remembered your credentials? <Link to="/login">Back to login</Link>
        </span>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
        <label>
          Email
          <input type="email" {...register("email")} />
          {errors.email && <span className="field-error">{errors.email.message}</span>}
        </label>

        {message && <div className="form-success">{message}</div>}

        <button className="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send reset link"}
        </button>
      </form>
    </AuthLayout>
  );
}
