import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  tone?: "default" | "red" | "green" | "yellow" | "blue";
}

export default function Badge({ children, tone = "default" }: BadgeProps) {
  const tones = {
    default: "bg-slate-100 text-slate-700",
    red: "bg-red-100 text-red-700",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-700",
    blue: "bg-[#eef4fb] text-[#4d6f9d]",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-sm font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}