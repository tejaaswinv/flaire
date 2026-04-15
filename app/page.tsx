"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "../components/layout/app-shell";
import Chat from "../components/Chat";
import { createEmptyVault } from "../lib/vault";
import { loadFromStorage, saveToStorage } from "../lib/storage";
import type { FlaireVault } from "../types/flaire-vault";

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatPrettyDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function HomePage() {
  const [vault, setVault] = useState<FlaireVault | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const existing = await loadFromStorage<FlaireVault>();

      if (cancelled) return;

      if (existing) {
        setVault(existing);
        return;
      }

      const fresh = createEmptyVault("San");
      await saveToStorage(fresh);

      if (cancelled) return;
      setVault(fresh);
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  const analytics = useMemo(() => {
    if (!vault) {
      return {
        todayCheckin: null as FlaireVault["checkins"][number] | null,
        symptomsToday: 0,
        mealsToday: 0,
        medsTakenToday: 0,
        medsTrackedToday: 0,
        activeFlare: false,
        latestSymptom: null as FlaireVault["symptoms"][number] | null,
        recentNotes: [] as FlaireVault["symptoms"],
        avgPain7d: 0,
        avgSleep7d: 0,
        avgStress7d: 0,
      };
    }

    const todayKey = getTodayKey();

    const todayCheckin =
      [...vault.checkins]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .find((checkin) => checkin.date.slice(0, 10) === todayKey) ?? null;

    const symptomsToday = vault.symptoms.filter(
      (symptom) => symptom.occurredAt.slice(0, 10) === todayKey
    ).length;

    const mealsToday = vault.foodLogs.filter(
      (food) => food.eatenAt.slice(0, 10) === todayKey
    ).length;

    const medicationLogsToday = vault.medicationLogs.filter(
      (log) => log.scheduledFor.slice(0, 10) === todayKey
    );

    const medsTakenToday = medicationLogsToday.filter(
      (log) => log.status === "taken"
    ).length;

    const medsTrackedToday = medicationLogsToday.filter((log) =>
      ["taken", "missed", "skipped", "pending"].includes(log.status)
    ).length;

    const activeFlare =
      Boolean(todayCheckin?.isFlareDay) ||
      vault.symptoms.some(
        (symptom) =>
          symptom.occurredAt.slice(0, 10) === todayKey && symptom.severity >= 8
      );

    const latestSymptom =
      [...vault.symptoms].sort(
        (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      )[0] ?? null;

    const recentNotes = [...vault.symptoms]
      .filter((symptom) => symptom.note && symptom.note.trim().length > 0)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 3);

    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().slice(0, 10);
    });

    const checkins7d = vault.checkins.filter((checkin) =>
      last7.includes(checkin.date.slice(0, 10))
    );

    const avgPain7d =
      checkins7d.length === 0
        ? 0
        : Number(
            (
              checkins7d.reduce((sum, item) => sum + item.pain, 0) /
              checkins7d.length
            ).toFixed(1)
          );

    const avgSleep7d =
      checkins7d.length === 0
        ? 0
        : Number(
            (
              checkins7d.reduce((sum, item) => sum + item.sleepHours, 0) /
              checkins7d.length
            ).toFixed(1)
          );

    const avgStress7d =
      checkins7d.length === 0
        ? 0
        : Number(
            (
              checkins7d.reduce((sum, item) => sum + item.stress, 0) /
              checkins7d.length
            ).toFixed(1)
          );

    return {
      todayCheckin,
      symptomsToday,
      mealsToday,
      medsTakenToday,
      medsTrackedToday,
      activeFlare,
      latestSymptom,
      recentNotes,
      avgPain7d,
      avgSleep7d,
      avgStress7d,
    };
  }, [vault]);

  if (!vault) {
    return <main className="p-8">Loading Flaire...</main>;
  }

  return (
    <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="rounded-[30px] border-2 border-[#ef9ea0] bg-white px-10 py-12">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-4xl font-semibold text-slate-800">Today</p>
            <p className="mt-2 text-2xl text-slate-500">
              {formatPrettyDate(new Date())}
            </p>

            <h2 className="mt-10 text-5xl font-semibold text-slate-800">
              Hey there {vault.profile.displayName}!
            </h2>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-[#f7f3f8] p-5">
                <p className="text-sm text-slate-500">Energy</p>
                <p className="mt-2 text-2xl font-semibold text-slate-800">
                  {analytics.todayCheckin?.energy ?? "Not logged"}
                </p>
              </div>

              <div className="rounded-2xl bg-[#fff6ee] p-5">
                <p className="text-sm text-slate-500">Pain</p>
                <p className="mt-2 text-2xl font-semibold text-slate-800">
                  {analytics.todayCheckin ? `${analytics.todayCheckin.pain}/10` : "Not logged"}
                </p>
              </div>

              <div className="rounded-2xl bg-[#fff3f3] p-5">
                <p className="text-sm text-slate-500">Flare</p>
                <p className="mt-2 text-2xl font-semibold text-slate-800">
                  {analytics.activeFlare ? "Yes" : "No"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <Chat />

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[30px] border-2 border-[#7c9dc9] bg-white px-8 py-8">
            <h3 className="text-3xl font-semibold text-slate-800">Quick Check-in</h3>
            <p className="mt-2 text-slate-500">
              Log today’s health signals from the Symptoms, Diet, and Medications sections.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Link
                href="/symptoms"
                className="rounded-2xl bg-[#7c9dc9] px-6 py-5 text-center text-lg font-semibold text-white"
              >
                Log symptoms
              </Link>

              <Link
                href="/diet"
                className="rounded-2xl bg-[#cfa9d2] px-6 py-5 text-center text-lg font-semibold text-slate-800"
              >
                Log meals
              </Link>

              <Link
                href="/medications"
                className="rounded-2xl bg-[#e5eef8] px-6 py-5 text-center text-lg font-semibold text-slate-800"
              >
                Track medication
              </Link>

              <Link
                href="/insights"
                className="rounded-2xl bg-[#f7f3f8] px-6 py-5 text-center text-lg font-semibold text-slate-800"
              >
                View insights
              </Link>
            </div>
          </div>

          <div className="rounded-[30px] border-2 border-[#ef9ea0] bg-[#fff8f8] px-8 py-8">
            <h3 className="text-3xl font-semibold text-slate-800">Today’s Summary</h3>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-4">
                <span className="text-slate-600">Symptoms logged</span>
                <span className="text-xl font-semibold text-slate-800">
                  {analytics.symptomsToday}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-4">
                <span className="text-slate-600">Meals logged</span>
                <span className="text-xl font-semibold text-slate-800">
                  {analytics.mealsToday}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-4">
                <span className="text-slate-600">Medication taken</span>
                <span className="text-xl font-semibold text-slate-800">
                  {analytics.medsTakenToday}/{analytics.medsTrackedToday}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-4">
                <span className="text-slate-600">Current state</span>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    analytics.activeFlare
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {analytics.activeFlare ? "Flare" : "Stable"}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Avg pain (7 days)</p>
            <p className="mt-3 text-4xl font-semibold text-slate-800">
              {analytics.avgPain7d}/10
            </p>
          </div>

          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Avg sleep (7 days)</p>
            <p className="mt-3 text-4xl font-semibold text-slate-800">
              {analytics.avgSleep7d}h
            </p>
          </div>

          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Avg stress (7 days)</p>
            <p className="mt-3 text-4xl font-semibold text-slate-800">
              {analytics.avgStress7d}/10
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <h3 className="text-2xl font-semibold text-slate-800">Latest Symptom</h3>

            {analytics.latestSymptom ? (
              <div className="mt-5 rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-3">
                  <p className="text-2xl font-semibold text-slate-800">
                    {analytics.latestSymptom.symptomName}
                  </p>
                  <span className="rounded-full bg-[#fff1dd] px-3 py-1 text-sm font-medium text-[#b96d00]">
                    {analytics.latestSymptom.severity}/10
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  {new Date(analytics.latestSymptom.occurredAt).toLocaleString()}
                </p>

                {analytics.latestSymptom.triggers.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {analytics.latestSymptom.triggers.map((trigger) => (
                      <span
                        key={trigger}
                        className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600"
                      >
                        {trigger}
                      </span>
                    ))}
                  </div>
                )}

                {analytics.latestSymptom.note && (
                  <p className="mt-4 text-slate-600">{analytics.latestSymptom.note}</p>
                )}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-5 text-slate-500">
                No symptoms logged yet.
              </div>
            )}
          </div>

          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <h3 className="text-2xl font-semibold text-slate-800">Recent Notes</h3>

            {analytics.recentNotes.length > 0 ? (
              <div className="mt-5 space-y-4">
                {analytics.recentNotes.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold text-slate-800">{item.symptomName}</p>
                      <span className="text-sm text-slate-500">
                        {new Date(item.occurredAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-2 text-slate-600">{item.note}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-5 text-slate-500">
                No symptom notes yet.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-6 shadow-sm">
          <h3 className="text-2xl font-semibold text-slate-800">Support Actions</h3>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Link
              href="/records"
              className="rounded-2xl bg-[#f7f3f8] px-5 py-5 text-center font-medium text-slate-800"
            >
              View records
            </Link>

            <Link
              href="/calendar"
              className="rounded-2xl bg-[#eef4fb] px-5 py-5 text-center font-medium text-slate-800"
            >
              Open calendar
            </Link>

            <Link
              href="/community"
              className="rounded-2xl bg-[#eef8ef] px-5 py-5 text-center font-medium text-slate-800"
            >
              Visit community
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}