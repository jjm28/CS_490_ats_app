import "../../App.css";
import "../../styles/StyledComponents/Buttons.css";

function Button({
  variant = "primary",
  disabled = false,
  className = "",
  children,
  ...props
}: {
  variant?: "primary" | "secondary";
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  [key: string]: any;
}) {
  const base = "btn";
  const variants = {
    primary: "btn-primary",
    secondary: "btn-secondary",
  };
  const classes = `${base} ${variants[variant]} ${disabled ? "btn-disabled" : ""} ${className}`;
  return (
    <button disabled={disabled} className={classes} {...props}>
      {children}
    </button>
  );
}

export default Button;