import React from "react";

type Option = { label: string; value: string };

type DropdownProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
};

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
}) => (
  <select
    className="w-full bg-transparent border border-border rounded-md px-3 py-2"
    value={value}
    onChange={(e) => onChange(e.target.value)}
  >
    {options.map((opt) => (
      <option
        key={opt.value}
        value={opt.value}
        className="bg-primary text-background"
      >
        {opt.label}
      </option>
    ))}
  </select>
);

export default Dropdown;
