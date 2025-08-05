import React from "react";

type BadgeProps = {
  label: string;
  variant?: "verified" | "new" | "sale";
};

const styles: Record<string, string> = {
  verified: "bg-accent text-white",
  new: "bg-green-500 text-white",
  sale: "bg-primary text-background",
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = "verified",
}) => (
  <span
    className={`px-2 py-1 text-xs font-medium rounded-full ${styles[variant]}`}
  >
    {label}
  </span>
);

export default Badge;
