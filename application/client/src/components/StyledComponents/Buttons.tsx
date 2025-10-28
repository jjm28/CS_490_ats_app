import "../../App.css";
import "../../styles/StyledComponents/Buttons.css";

function Button({
  variant = "primary",
  children,
  ...props
}: {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
  [key: string]: any;
}) {
  const base = "btn";
  const variants = {
    primary: "btn-primary",
    secondary: "btn-secondary",
  };
  return (
    <button className={`${base} ${variants[variant]}`} {...props}>
      {children}
    </button>
  );
}

export default Button;