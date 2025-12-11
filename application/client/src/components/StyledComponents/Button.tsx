import "../../App.css";
import "../../styles/StyledComponents/Button.css";

function Button({
  variant = "primary",
  disabled = false,
  className = "",
  children,
  ...props
}: {
  variant?: "primary" | "secondary"| "ghost";
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  [key: string]: any;
}) {
  const base = "btn";
  const variants = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
  };
  const classes = `${base} ${variants[variant]} ${disabled ? "btn-disabled" : ""} ${className}`;
  return (
    <button disabled={disabled} className={classes} {...props}>
      {children}
    </button>
  );
}

export default Button;