"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/layout/app-shell";
import { loadFromStorage } from "../../lib/storage";
import type { FlaireVault } from "../../types/flaire-vault";

type DaySummary = {
  dateKey: string;
  symptomsCount: number;
  mealsCount: number;
  medicationTrackedCount: number;
  flare: boolean;
};

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function sameMonth(date: Date, year: number, monthIndex: number) {
  return date.getFullYear() === year && date.getMonth() === monthIndex;
}

export default function CalendarPage() {
  const [vault, setVault] = useState<FlaireVault | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const data = await loadFromStorage<FlaireVault>();
      if (!cancelled) {
        setVault(data);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  const year = currentDate.getFullYear();
  const monthIndex = currentDate.getMonth();

  const monthLabel = currentDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, monthIndex, 1);
    const lastDayOfMonth = new Date(year, monthIndex + 1, 0);

    const startOffset = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const cells: Date[] = [];

    for (let i = 0; i < startOffset; i += 1) {
      cells.push(new Date(year, monthIndex, 1 - startOffset + i));
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, monthIndex, day));
    }

    while (cells.length % 7 !== 0) {
      const nextDay = cells.length - (startOffset + daysInMonth) + 1;
      cells.push(new Date(year, monthIndex + 1, nextDay));
    }

    return cells;
  }, [year, monthIndex]);

  const summaries = useMemo(() => {
    if (!vault) return new Map<string, DaySummary>();

    const map = new Map<string, DaySummary>();

    const ensure = (dateKey: string) => {
      if (!map.has(dateKey)) {
        map.set(dateKey, {
          dateKey,
          symptomsCount: 0,
          mealsCount: 0,
          medicationTrackedCount: 0,
          flare: false,
        });
      }
      return map.get(dateKey)!;
    };

    vault.symptoms.forEach((symptom) => {
      const key = symptom.occurredAt.slice(0, 10);
      ensure(key).symptomsCount += 1;
    });

    vault.foodLogs.forEach((food) => {
      const key = food.eatenAt.slice(0, 10);
      ensure(key).mealsCount += 1;
    });

    vault.medicationLogs.forEach((log) => {
      const key = log.scheduledFor.slice(0, 10);
      if (
        log.status === "taken" ||
        log.status === "missed" ||
        log.status === "skipped"
      ) {
        ensure(key).medicationTrackedCount += 1;
      }
    });

    vault.checkins.forEach((checkin) => {
      const key = checkin.date.slice(0, 10);
      if (checkin.isFlareDay) {
        ensure(key).flare = true;
      }
    });

    vault.symptoms.forEach((symptom) => {
      const key = symptom.occurredAt.slice(0, 10);
      if (symptom.severity >= 8) {
        ensure(key).flare = true;
      }
    });

    return map;
  }, [vault]);

  const selectedMonthStats = useMemo(() => {
    const totals = {
      symptoms: 0,
      meals: 0,
      medicationTracked: 0,
      flareDays: 0,
    };

    calendarDays.forEach((date) => {
      if (!sameMonth(date, year, monthIndex)) return;

      const key = getDateKey(date);
      const summary = summaries.get(key);
      if (!summary) return;

      totals.symptoms += summary.symptomsCount;
      totals.meals += summary.mealsCount;
      totals.medicationTracked += summary.medicationTrackedCount;
      if (summary.flare) totals.flareDays += 1;
    });

    return totals;
  }, [calendarDays, summaries, year, monthIndex]);

  if (!vault) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="rounded-[28px] bg-white p-8 shadow-sm">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-slate-800">Health Calendar</h1>
              <p className="mt-1 text-slate-500">
                View symptoms, meals, medication activity, and flare patterns by day
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentDate(new Date(year, monthIndex - 1, 1))}
                className="rounded-xl border border-slate-200 px-4 py-2 text-slate-700"
              >
                ← Prev
              </button>
              <div className="min-w-[180px] text-center text-lg font-semibold text-slate-800">
                {monthLabel}
              </div>
              <button
                onClick={() => setCurrentDate(new Date(year, monthIndex + 1, 1))}
                className="rounded-xl border border-slate-200 px-4 py-2 text-slate-700"
              >
                Next →
              </button>
            </div>
          </div>

          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500">Symptoms logged</p>
              <p className="mt-2 text-3xl font-semibold text-slate-800">
                {selectedMonthStats.symptoms}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500">Meals logged</p>
              <p className="mt-2 text-3xl font-semibold text-slate-800">
                {selectedMonthStats.meals}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500">Medication tracked</p>
              <p className="mt-2 text-3xl font-semibold text-slate-800">
                {selectedMonthStats.medicationTracked}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500">Flare days</p>
              <p className="mt-2 text-3xl font-semibold text-slate-800">
                {selectedMonthStats.flareDays}
              </p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-7 gap-3 text-center text-sm font-medium text-slate-500">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-3">
            {calendarDays.map((date) => {
              const key = getDateKey(date);
              const summary = summaries.get(key);
              const isCurrentMonth = sameMonth(date, year, monthIndex);
              const isToday = key === getDateKey(new Date());

              return (
                <div
                  key={key}
                  className={`min-h-[148px] rounded-2xl border p-3 ${
                    isCurrentMonth
                      ? "border-slate-200 bg-white"
                      : "border-slate-100 bg-slate-50 text-slate-400"
                  } ${isToday ? "ring-2 ring-[#7c9dc9]" : ""}`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      className={`text-sm font-semibold ${
                        isCurrentMonth ? "text-slate-800" : "text-slate-400"
                      }`}
                    >
                      {date.getDate()}
                    </span>

                    {summary?.flare && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Flare
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="rounded-lg bg-[#f5eef7] px-2 py-1 text-slate-700">
                      Symptoms: {summary?.symptomsCount ?? 0}
                    </div>
                    <div className="rounded-lg bg-[#eef4fb] px-2 py-1 text-slate-700">
                      Meds: {summary?.medicationTrackedCount ?? 0}
                    </div>
                    <div className="rounded-lg bg-[#eef8ef] px-2 py-1 text-slate-700">
                      Meals: {summary?.mealsCount ?? 0}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 p-5">
            <h2 className="text-xl font-semibold text-slate-800">Legend</h2>

            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-red-100 px-3 py-1.5 text-red-700">
                Flare day
              </span>
              <span className="rounded-full bg-[#f5eef7] px-3 py-1.5 text-slate-700">
                Symptom count
              </span>
              <span className="rounded-full bg-[#eef4fb] px-3 py-1.5 text-slate-700">
                Medication activity
              </span>
              <span className="rounded-full bg-[#eef8ef] px-3 py-1.5 text-slate-700">
                Meals logged
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}