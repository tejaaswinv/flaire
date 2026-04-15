import OpenAI from "openai";

export const runtime = "nodejs";

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return "";
}

function toBool(value: unknown): boolean {
  return value === true;
}

function normalizeModule(
  value: unknown
): "symptoms" | "diet" | "medications" | "activity" | "check-in" | null {
  if (typeof value !== "string") return null;
  if (value === "symptoms") return "symptoms";
  if (value === "diet") return "diet";
  if (value === "medications") return "medications";
  if (value === "activity") return "activity";
  if (value === "check-in") return "check-in";
  return null;
}

type RoutedLog = {
  module: "symptoms" | "diet" | "medications" | "activity" | "check-in";
  entry: {
    title: string;
    value: string;
    description: string;
    time: string;
    severity: string;
    metadata: Record<string, unknown>;
  };
};

type RoutedChatPayloadStrict = {
  logs: RoutedLog[];
  chat_response: string;
  followup: {
    needed: boolean;
    question: string | null;
  };
};

function normalizePayload(parsed: unknown): RoutedChatPayloadStrict | null {
  if (!isPlainObject(parsed)) return null;

  const logsRaw = parsed["logs"];
  const chat_response = parsed["chat_response"];
  const followupRaw = parsed["followup"];

  if (!Array.isArray(logsRaw)) return null;
  if (typeof chat_response !== "string") return null;
  if (!isPlainObject(followupRaw)) return null;

  const logs: RoutedLog[] = [];
  for (const item of logsRaw) {
    if (!isPlainObject(item)) continue;
    const mod = normalizeModule(item["module"]);
    const entryRaw = item["entry"];
    if (!mod || !isPlainObject(entryRaw)) continue;

    logs.push({
      module: mod,
      entry: {
        title: toText(entryRaw["title"]),
        description: toText(entryRaw["description"]),
        value: toText(entryRaw["value"]),
        time: toText(entryRaw["time"]),
        severity: toText(entryRaw["severity"]),
        metadata: isPlainObject(entryRaw["metadata"]) ? (entryRaw["metadata"] as any) : {},
      },
    });
  }

  return {
    logs,
    chat_response,
    followup: {
      needed: toBool(followupRaw["needed"]),
      question: typeof followupRaw["question"] === "string" ? followupRaw["question"] : null,
    },
  };
}

function fallbackLogsFromMessage(message: string): RoutedLog[] {
  const text = message.toLowerCase();
  const logs: RoutedLog[] = [];

  const mentionsDiet =
    /(ate|eating|meal|breakfast|lunch|dinner|snack|food|drink|coffee|tea|pasta|rice|bread|dairy|milk|cheese|yogurt|spicy|sugar)/.test(
      text
    );
  const mentionsMeds =
    /(took|take|taking|missed|pill|tablet|capsule|dose|dosage|mg|ibuprofen|advil|tylenol|acetaminophen|naproxen)/.test(
      text
    );
  const mentionsSymptoms =
    /(pain|headache|fatigue|nausea|flare|sick|discomfort|cramp|anxious|anxiety|stressed|stress)/.test(
      text
    );
  const mentionsActivity =
    /(sleep|slept|insomnia|walk|walking|run|running|workout|exercise|rest|yoga)/.test(text);

  if (mentionsDiet) {
    logs.push({
      module: "diet",
      entry: {
        title: "Food / drink",
        value: message,
        description: "Auto-log from chat (fallback router).",
        time: "",
        severity: "",
        metadata: {},
      },
    });
  }

  if (mentionsMeds) {
    logs.push({
      module: "medications",
      entry: {
        title: "Medication",
        value: message,
        description: "Auto-log from chat (fallback router).",
        time: "",
        severity: "",
        metadata: {},
      },
    });
  }

  if (mentionsSymptoms) {
    logs.push({
      module: "symptoms",
      entry: {
        title: "Symptom / feeling",
        value: message,
        description: "Auto-log from chat (fallback router).",
        time: "",
        severity: "",
        metadata: {},
      },
    });
  }

  if (mentionsActivity) {
    logs.push({
      module: "activity",
      entry: {
        title: "Activity / sleep",
        value: message,
        description: "Auto-log from chat (fallback router).",
        time: "",
        severity: "",
        metadata: {},
      },
    });
  }

  if (logs.length === 0) {
    logs.push({
      module: "check-in",
      entry: {
        title: "Check-in",
        value: message,
        description: "Auto-log from chat (fallback router).",
        time: "",
        severity: "",
        metadata: {},
      },
    });
  }

  return logs;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Missing OPENAI_API_KEY environment variable." },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message = typeof (body as any)?.message === "string" ? (body as any).message : "";
  if (!message.trim()) {
    return Response.json({ error: "Missing `message`." }, { status: 400 });
  }

  const client = new OpenAI({ apiKey });

  const systemPrompt = [
    'You are "Flaire", a friendly, calm, supportive health assistant for people managing autoimmune conditions.',
    "You are a REAL-TIME HEALTH DATA ENGINE.",
    "Primary objective: ALWAYS create logs first if any health info exists. Secondary objective: generate a supportive chat response.",
    "Return ONLY valid JSON (no markdown, no extra text).",
    "",
    "You MUST return ONLY this JSON shape (no extra keys):",
    "",
    "{",
    '  "logs": [',
    "    {",
    '      "module": "symptoms | diet | medications | activity | check-in",',
    '      "entry": {',
    '        "title": "",',
    '        "value": "",',
    '        "description": "",',
    '        "time": "",',
    '        "severity": "",',
    '        "metadata": {}',
    "      }",
    "    }",
    "  ],",
    '  "chat_response": "friendly supportive reply",',
    '  "followup": { "needed": true/false, "question": "string or null" }',
    "}",
    "",
    "Routing rules (choose one or more logs):",
    "- symptoms: pain, headache, fatigue, nausea, flare, sickness, any symptom mention",
    "- diet: any food or drink mention (pasta, rice, coffee, dairy, sugar, spicy, meals, eating)",
    "- medications: drugs, pills, dosage, timing, took/missed meds",
    "- activity: sleep, exercise, movement, rest",
    "- check-in: general feelings or unclear states (when not clearly symptoms/diet/meds/activity)",
    "",
    "Critical rules:",
    "- DO NOT ask follow-up before logging. ALWAYS log first if any health info exists.",
    "- A single user message may produce MULTIPLE logs in different modules.",
    "- Even if followup is needed, still create logs from whatever is known.",
    "- `time` should be a simple phrase (e.g. 'this morning', '9am', 'today') or empty string if unknown.",
    "- `severity` should be '0-10' style if implied/known; otherwise empty string.",
    "- If a key detail is missing (severity, dose, meal details), set followup.needed=true and ask ONE short followup.question.",
    "- chat_response must be friendly, calm, supportive, and include the follow-up question if followup.needed=true.",
    "- Do NOT diagnose. If urgent red flags (chest pain, trouble breathing, fainting, severe allergic reaction), advise urgent care.",
  ].join("\n");

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
    });

    const content = completion.choices?.[0]?.message?.content ?? "";
    const parsed = safeJsonParse(content);
    const normalized = normalizePayload(parsed);

    if (!normalized) {
      return Response.json(
        {
          error: "Model returned invalid router JSON.",
          raw: content,
        },
        { status: 502 }
      );
    }

    // Guarantee "log-first": if model returns empty logs, use a simple fallback router.
    if (normalized.logs.length === 0) {
      normalized.logs = fallbackLogsFromMessage(message);
    }

    return Response.json(normalized);
  } catch (err: any) {
    return Response.json(
      {
        error: "OpenAI request failed.",
        details: typeof err?.message === "string" ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
