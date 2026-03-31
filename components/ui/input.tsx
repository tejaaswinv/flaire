import { InputHTMLAttributes } from "react";

export default function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#7c9dc9] ${props.className ?? ""}`}
    />
  );
}