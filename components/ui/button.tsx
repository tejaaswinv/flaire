import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "soft" | "danger";
}

export default function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const styles = {
    primary:
      "bg-[#7c9dc9] text-white shadow-[0_10px_24px_rgba(124,157,201,0.30)] hover:brightness-105",
    secondary:
      "bg-[#d7bddf] text-slate-800 shadow-sm hover:brightness-105",
    soft: "bg-white text-slate-800 shadow-sm hover:bg-slate-50",
    danger: "bg-red-500 text-white shadow-sm hover:brightness-105",
  };

  return (
    <button
      className={`rounded-2xl px-5 py-3 font-medium transition-all ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}