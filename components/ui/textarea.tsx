import { TextareaHTMLAttributes } from "react";

export default function Textarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#7c9dc9] ${props.className ?? ""}`}
    />
  );
}