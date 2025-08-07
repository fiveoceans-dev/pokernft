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
    "px-4 py-2 font-semibold transition-transform duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    primary: "bg-accent rounded-md hover:scale-105 hover:shadow-lg",
    secondary:
      "bg-primary text-background rounded-md hover:scale-105 hover:shadow-lg",
    ghost:
      "bg-transparent text-accent border border-border rounded-md hover:bg-accent/10",
    pill: "bg-accent text-white rounded-full hover:scale-105 hover:shadow-lg",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
