"use client";

import { useMemo, useState } from "react";
import Button from "./ui/button";
import Textarea from "./ui/textarea";
import { routeHealthLogs } from "../lib/healthRouter";

type RoutedChatPayload = {
  logs: Array<{
    module: "symptoms" | "diet" | "medications" | "activity" | "check-in";
    entry: {
      title: string;
      value: string;
      description: string;
      time: string;
      severity: string;
      metadata: Record<string, unknown>;
    };
  }>;
  chat_response: string;
  followup: {
    needed: boolean;
    question: string | null;
  };
};

type ChatMessage =
  | { role: "user"; text: string }
  | { role: "bot"; text: string; routed?: RoutedChatPayload };

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      text: "Hi, I’m Flaire. Tell me what you’re feeling, what you ate, or any meds you took today.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);

  async function onSend() {
    if (!canSend) return;

    const text = input.trim();
    setInput("");
    setIsSending(true);

    setMessages((prev) => [...prev, { role: "user", text }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const json = await res.json();

      if (!res.ok) {
        const errText =
          typeof json?.error === "string"
            ? json.error
            : "Something went wrong talking to the AI.";
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: `Sorry — ${errText}` },
        ]);
        return;
      }

      const routed = json as RoutedChatPayload;
      // UI sync requirement: log first, then respond.
      await routeHealthLogs(routed?.logs ?? []);

      const reply =
        typeof routed?.chat_response === "string"
          ? routed.chat_response
          : "Thanks — I logged that. What would you like to add next?";

      setMessages((prev) => [...prev, { role: "bot", text: reply, routed }]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text:
            "Sorry — I couldn’t reach the chat service. Double-check your `OPENAI_API_KEY` and try again.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold text-slate-800">Flaire Chat</h3>
          <p className="mt-1 text-sm text-slate-500">
            Quick logs for symptoms, meds, food, and mood.
          </p>
        </div>
        <div className="text-xs text-slate-400">Beta</div>
      </div>

      <div className="mt-5 space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`rounded-2xl px-4 py-3 ${
              m.role === "user"
                ? "ml-auto max-w-[85%] bg-[#eef4fb] text-slate-800"
                : "mr-auto max-w-[85%] bg-slate-50 text-slate-800"
            }`}
          >
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</div>

            {"routed" in m && m.routed ? (
              <div className="mt-3 space-y-2">
                <div className="rounded-xl bg-white px-3 py-2 text-xs text-slate-700">
                  <span className="font-medium text-slate-800">Saved to:</span>{" "}
                  {Array.from(new Set(m.routed.logs.map((l) => l.module))).join(", ") || "—"}
                </div>

                <details>
                <summary className="cursor-pointer text-xs text-slate-500">
                  View logging details
                </summary>
                <div className="mt-2 space-y-2">
                  <div className="rounded-xl bg-white p-3 text-xs text-slate-700">
                    <p className="font-medium text-slate-800">Logged to:</p>
                    <ul className="mt-1 list-disc pl-5">
                      {Array.from(new Set(m.routed.logs.map((l) => l.module))).map((mod) => (
                        <li key={mod}>{mod}</li>
                      ))}
                    </ul>
                  </div>
                  <pre className="overflow-auto rounded-xl bg-white p-3 text-xs text-slate-700">
                    {JSON.stringify(m.routed, null, 2)}
                  </pre>
                </div>
                </details>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Try: "Headache since morning" or "Took ibuprofen at 9"'
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void onSend();
            }
          }}
          disabled={isSending}
        />

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Press Enter to send • Shift+Enter for a new line
          </p>
          <Button onClick={onSend} disabled={!canSend} variant="primary">
            {isSending ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
