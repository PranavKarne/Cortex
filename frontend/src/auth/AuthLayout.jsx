import { motion } from "framer-motion";
import "./auth.css";

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-shell">
      <div className="auth-backdrop" />
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div className="auth-brand">CORTEX</div>
        <h1>{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>
        <div className="auth-body">{children}</div>
        {footer && <div className="auth-footer">{footer}</div>}
      </motion.div>
    </div>
  );
}
