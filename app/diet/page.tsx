"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/layout/app-shell";
import { loadFromStorage, saveToStorage } from "../../lib/storage";
import type { FlaireVault, FoodLog } from "../../types/flaire-vault";

type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "beverage";
type ReactionStatus = "positive" | "negative" | "neutral" | "";

const mealTypes: MealType[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "beverage",
];

export default function DietPage() {
  const [vault, setVault] = useState<FlaireVault | null>(null);

  const [foodName, setFoodName] = useState("");
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [reactionStatus, setReactionStatus] = useState<ReactionStatus>("");
  const [reactionNote, setReactionNote] = useState("");

  // ✅ FIXED: async load
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const data = await loadFromStorage<FlaireVault>();
      if (!data || cancelled) return;

      setVault(data);
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ FIXED: async persist
  const persist = async (updatedVault: FlaireVault) => {
    setVault(updatedVault);
    await saveToStorage(updatedVault);
  };

  const sortedFoodLogs = useMemo(() => {
    if (!vault) return [];
    return [...vault.foodLogs].sort(
      (a, b) => new Date(b.eatenAt).getTime() - new Date(a.eatenAt).getTime()
    );
  }, [vault]);

  const triggerFoods = useMemo(() => {
    if (!vault) return { confirmed: [] as string[], potential: [] as string[] };

    const counts = new Map<string, number>();

    vault.foodLogs.forEach((log) => {
      if (log.reactionStatus === "negative") {
        const key = log.foodName.trim().toLowerCase();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    });

    const confirmed: string[] = [];
    const potential: string[] = [];

    counts.forEach((count, key) => {
      const label = key
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      if (count >= 2) confirmed.push(label);
      else potential.push(label);
    });

    return {
      confirmed: confirmed.sort(),
      potential: potential.sort(),
    };
  }, [vault]);

  if (!vault) {
    return <div className="p-8">Loading...</div>;
  }

  // ✅ FIXED: async
  const addFoodLog = async () => {
    if (!foodName.trim()) return;

    const now = new Date().toISOString();

    const newLog: FoodLog = {
      id: crypto.randomUUID(),
      foodName: foodName.trim(),
      mealType,
      eatenAt: now,
      reactionStatus: reactionStatus || undefined,
      reactionNote: reactionNote.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    await persist({
      ...vault,
      foodLogs: [newLog, ...vault.foodLogs],
      updatedAt: now,
    });

    setFoodName("");
    setMealType("breakfast");
    setReactionStatus("");
    setReactionNote("");
  };

  // ✅ FIXED: async
  const deleteFoodLog = async (id: string) => {
    await persist({
      ...vault,
      foodLogs: vault.foodLogs.filter((log) => log.id !== id),
      updatedAt: new Date().toISOString(),
    });
  };

  const reactionPillClass = (status?: string) => {
    if (status === "positive") return "bg-green-100 text-green-700";
    if (status === "negative") return "bg-red-100 text-red-700";
    if (status === "neutral") return "bg-slate-100 text-slate-700";
    return "bg-slate-100 text-slate-500";
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="rounded-[28px] bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-slate-800">Diet Tracker</h1>
              <p className="mt-1 text-slate-500">
                Log meals and monitor possible trigger foods
              </p>
            </div>

            <button
              onClick={addFoodLog}
              className="rounded-xl bg-[#7c9dc9] px-5 py-3 font-medium text-white"
            >
              + Add Food
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Log Food Entry</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder="e.g. Coffee, Dairy Milk, Pasta"
                className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#7c9dc9]"
              />

              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value as MealType)}
                className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#7c9dc9]"
              >
                {mealTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>

              <select
                value={reactionStatus}
                onChange={(e) => setReactionStatus(e.target.value as ReactionStatus)}
                className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#7c9dc9]"
              >
                <option value="">Reaction status</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>

            <textarea
              value={reactionNote}
              onChange={(e) => setReactionNote(e.target.value)}
              placeholder="What happened after eating this?"
              rows={3}
              className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#7c9dc9]"
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="rounded-2xl border border-slate-200 p-5">
              <h2 className="mb-4 text-2xl font-semibold text-slate-800">Recent Food Logs</h2>

              {sortedFoodLogs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-slate-500">
                  No food entries logged yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedFoodLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-xl font-semibold text-slate-800">
                              {log.foodName}
                            </p>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                              {log.mealType}
                            </span>
                            {log.reactionStatus && (
                              <span
                                className={`rounded-full px-3 py-1 text-sm ${reactionPillClass(
                                  log.reactionStatus
                                )}`}
                              >
                                {log.reactionStatus}
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-sm text-slate-500">
                            {new Date(log.eatenAt).toLocaleString()}
                          </p>

                          {log.reactionNote && (
                            <p className="mt-3 text-slate-600">{log.reactionNote}</p>
                          )}
                        </div>

                        <button
                          onClick={() => deleteFoodLog(log.id)}
                          className="text-2xl text-slate-500 hover:text-red-500"
                          aria-label="Delete food log"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 p-5">
                <h3 className="text-xl font-semibold text-slate-800">Confirmed Trigger Foods</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Foods with repeated negative reactions
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {triggerFoods.confirmed.length === 0 ? (
                    <p className="text-slate-500">None yet.</p>
                  ) : (
                    triggerFoods.confirmed.map((food) => (
                      <span
                        key={food}
                        className="rounded-full bg-red-100 px-3 py-1.5 text-sm text-red-700"
                      >
                        {food}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <h3 className="text-xl font-semibold text-slate-800">Potential Trigger Foods</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Foods with at least one negative reaction
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {triggerFoods.potential.length === 0 ? (
                    <p className="text-slate-500">None yet.</p>
                  ) : (
                    triggerFoods.potential.map((food) => (
                      <span
                        key={food}
                        className="rounded-full bg-yellow-100 px-3 py-1.5 text-sm text-yellow-700"
                      >
                        {food}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <h3 className="text-xl font-semibold text-slate-800">Food Log Summary</h3>
                <div className="mt-4 space-y-2 text-slate-600">
                  <p>Total logs: {vault.foodLogs.length}</p>
                  <p>
                    Negative reactions:{" "}
                    {vault.foodLogs.filter((log) => log.reactionStatus === "negative").length}
                  </p>
                  <p>
                    Positive reactions:{" "}
                    {vault.foodLogs.filter((log) => log.reactionStatus === "positive").length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}