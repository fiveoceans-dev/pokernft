import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "pill";
};

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  className = "",
  children,
  ...props
}) => {
  const base =
    "relative px-4 py-2 font-semibold transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    primary:
      "bg-[var(--color-accent)] text-[var(--color-primary)] rounded-md hover:scale-105 hover:shadow-neon",
    secondary:
      "bg-[var(--color-secondary)] text-[var(--color-primary)] rounded-md hover:scale-105 hover:shadow-neon-red",
    ghost:
      "bg-transparent text-[var(--color-accent)] border border-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent)]/10",
    pill: "bg-[var(--color-accent)] text-[var(--color-primary)] rounded-full hover:scale-105 hover:shadow-neon",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
