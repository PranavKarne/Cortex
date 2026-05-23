export default function Button({
  variant = "primary",
  className = "",
  ...props
}) {
  const baseClass = variant === "ghost" ? "ghost-button" : "primary";
  return <button className={`${baseClass} ${className}`.trim()} {...props} />;
}
