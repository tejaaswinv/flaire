"use client";

import { loadFromStorage, saveToStorage } from "./storage";
import type {
  FlaireVault,
  FoodLog,
  Medication,
  MedicationLog,
  Severity,
  SymptomLog,
  DailyCheckin,
  EnergyLevel,
} from "../types/flaire-vault";

export type RoutedLog = {
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

function parseSeverity(sev: string): Severity | null {
  const raw = (sev ?? "").toLowerCase();

  // Word-based mapping (common user phrasing)
  if (/\bmild\b/.test(raw)) return 3 as Severity;
  if (/\bmoderate\b/.test(raw)) return 6 as Severity;
  if (/\bsevere\b/.test(raw)) return 8 as Severity;
  if (/\bextreme\b/.test(raw)) return 10 as Severity;

  const m = raw.match(/(\d{1,2})/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const clamped = Math.max(0, Math.min(10, Math.round(n)));
  return clamped as Severity;
}

function severityFromEntry(entry: RoutedLog["entry"]): Severity | null {
  return (
    parseSeverity(entry.severity || "") ??
    parseSeverity(entry.value || "") ??
    parseSeverity(entry.description || "") ??
    parseSeverity(entry.title || "")
  );
}

function nowIso() {
  return new Date().toISOString();
}

function guessMealType(food: string): FoodLog["mealType"] {
  const f = food.toLowerCase();
  if (/(coffee|tea|juice|soda|water|smoothie|latte)/.test(f)) return "beverage";
  return "snack";
}

function guessEnergyLevel(text: string): EnergyLevel | null {
  const t = text.toLowerCase();
  if (/(exhausted|wiped|very low)/.test(t)) return "very_low";
  if (/(tired|low energy)/.test(t)) return "low";
  if (/(okay|moderate|fine)/.test(t)) return "moderate";
  if (/(good|better)/.test(t)) return "good";
  if (/(great|high energy|energized)/.test(t)) return "high";
  return null;
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function upsertTodayCheckin(vault: FlaireVault, patch: Partial<DailyCheckin>): FlaireVault {
  const now = nowIso();
  const today = getTodayKey();
  const existing = vault.checkins.find((c) => c.date.slice(0, 10) === today);

  if (existing) {
    const updated = vault.checkins.map((c) =>
      c.id === existing.id
        ? {
            ...c,
            ...patch,
            note: patch.note ?? c.note,
            updatedAt: now,
          }
        : c
    );
    return { ...vault, checkins: updated, updatedAt: now };
  }

  const fresh: DailyCheckin = {
    id: crypto.randomUUID(),
    date: now,
    energy: "moderate",
    pain: 5 as Severity,
    stress: 5 as Severity,
    sleepHours: 7,
    isFlareDay: false,
    note: patch.note,
    createdAt: now,
    updatedAt: now,
    ...(patch.energy ? { energy: patch.energy } : {}),
    ...(typeof patch.pain === "number" ? { pain: patch.pain } : {}),
    ...(typeof patch.stress === "number" ? { stress: patch.stress } : {}),
    ...(typeof patch.sleepHours === "number" ? { sleepHours: patch.sleepHours } : {}),
    ...(typeof patch.isFlareDay === "boolean" ? { isFlareDay: patch.isFlareDay } : {}),
  };

  return { ...vault, checkins: [fresh, ...vault.checkins], updatedAt: now };
}

export async function routeHealthLogs(logs: RoutedLog[]) {
  if (typeof window === "undefined") return;
  if (!Array.isArray(logs) || logs.length === 0) return;

  const vault = await loadFromStorage<FlaireVault>();
  if (!vault) return;

  let next: FlaireVault = vault;
  const now = nowIso();

  for (const log of logs) {
    const entry = log.entry;
    const title = (entry.title || entry.value || "").trim();
    const desc = (entry.description || "").trim();
    const sev = severityFromEntry(entry);

    if (log.module === "diet") {
      if (!title) continue;
      const newFood: FoodLog = {
        id: crypto.randomUUID(),
        foodName: title,
        mealType: (entry.metadata?.["mealType"] as any) ?? guessMealType(title),
        eatenAt: now,
        reactionNote: desc || undefined,
        createdAt: now,
        updatedAt: now,
      };
      next = { ...next, foodLogs: [newFood, ...next.foodLogs], updatedAt: now };
      continue;
    }

    if (log.module === "symptoms") {
      if (!title) continue;
      const newSymptom: SymptomLog = {
        id: crypto.randomUUID(),
        symptomName: title,
        severity: (sev ?? (5 as Severity)) as Severity,
        occurredAt: now,
        triggers: [],
        bodyRegions: [],
        note: desc || undefined,
        createdAt: now,
        updatedAt: now,
      };
      next = { ...next, symptoms: [newSymptom, ...next.symptoms], updatedAt: now };
      continue;
    }

    if (log.module === "medications") {
      if (!title) continue;

      const nameLower = title.toLowerCase();
      const existing = next.medications.find((m) => m.name.toLowerCase() === nameLower);
      const timeNow = new Date().toISOString().slice(11, 16);

      let medicationId = existing?.id;
      if (!medicationId) {
        const med: Medication = {
          id: crypto.randomUUID(),
          name: title,
          frequencyType: "daily",
          schedules: [{ id: crypto.randomUUID(), time: timeNow }],
          active: true,
          createdAt: now,
          updatedAt: now,
        };
        next = { ...next, medications: [med, ...next.medications], updatedAt: now };
        medicationId = med.id;
      }

      const newLog: MedicationLog = {
        id: crypto.randomUUID(),
        medicationId,
        scheduledFor: now,
        takenAt: now,
        status: "taken",
        note: desc || undefined,
        createdAt: now,
        updatedAt: now,
      };
      next = { ...next, medicationLogs: [newLog, ...next.medicationLogs], updatedAt: now };
      continue;
    }

    if (log.module === "activity") {
      // You don't currently have a dedicated activity log module in the vault.
      // To keep UI synced, we fold these into today's check-in note and/or sleepHours when obvious.
      const maybeSleepHours =
        typeof entry.metadata?.["sleepHours"] === "number"
          ? (entry.metadata["sleepHours"] as number)
          : (() => {
              const m = (entry.value || entry.description || "").match(/(\d+(\.\d+)?)\s*h(ours?)?/i);
              return m ? Number(m[1]) : null;
            })();

      const noteLine = `Activity: ${title}${desc ? ` — ${desc}` : ""}`;
      next = upsertTodayCheckin(next, {
        ...(typeof maybeSleepHours === "number" && Number.isFinite(maybeSleepHours)
          ? { sleepHours: Math.max(0, Math.min(14, maybeSleepHours)) }
          : {}),
        note: [next.checkins.find((c) => c.date.slice(0, 10) === getTodayKey())?.note, noteLine]
          .filter(Boolean)
          .join("\n"),
      });
      continue;
    }

    if (log.module === "check-in") {
      const combined = `${title} ${entry.value} ${desc}`.trim();
      const energyGuess = guessEnergyLevel(combined);
      const noteLine = `Check-in: ${combined || title || "Update"}`.trim();
      next = upsertTodayCheckin(next, {
        ...(energyGuess ? { energy: energyGuess } : {}),
        ...(sev !== null ? { pain: sev } : {}),
        note: [next.checkins.find((c) => c.date.slice(0, 10) === getTodayKey())?.note, noteLine]
          .filter(Boolean)
          .join("\n"),
      });
      continue;
    }
  }

  await saveToStorage(next);
}

