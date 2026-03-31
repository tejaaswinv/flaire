"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/layout/app-shell";
import { loadFromStorage } from "../../lib/storage";
import type { FlaireVault } from "../../types/flaire-vault";

type TriggerStat = {
  label: string;
  value: number;
};

type DailySymptomPoint = {
  date: string;
  count: number;
};

export default function InsightsPage() {
  const [vault, setVault] = useState<FlaireVault | null>(null);

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

  const analytics = useMemo(() => {
    if (!vault) {
      return {
        totalSymptoms: 0,
        avgSeverity: 0,
        topTriggers: [] as TriggerStat[],
        symptomTrend: [] as DailySymptomPoint[],
        adherence: 0,
        recommendationCards: [] as Array<{ title: string; description: string; priority: "low" | "medium" | "high" }>,
      };
    }

    const totalSymptoms = vault.symptoms.length;

    const avgSeverity =
      totalSymptoms === 0
        ? 0
        : Number(
            (
              vault.symptoms.reduce((sum, symptom) => sum + symptom.severity, 0) /
              totalSymptoms
            ).toFixed(1)
          );

    const triggerCounts = new Map<string, number>();
    vault.symptoms.forEach((symptom) => {
      symptom.triggers.forEach((trigger) => {
        const normalized = trigger.trim();
        if (!normalized) return;
        triggerCounts.set(normalized, (triggerCounts.get(normalized) ?? 0) + 1);
      });
    });

    const topTriggers = [...triggerCounts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const trendMap = new Map<string, number>();
    const last7Days: string[] = [];

    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      last7Days.push(key);
      trendMap.set(key, 0);
    }

    vault.symptoms.forEach((symptom) => {
      const key = symptom.occurredAt.slice(0, 10);
      if (trendMap.has(key)) {
        trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
      }
    });

    const symptomTrend = last7Days.map((date) => ({
      date,
      count: trendMap.get(date) ?? 0,
    }));

    const completedLogs = vault.medicationLogs.filter(
      (log) => log.status === "taken" || log.status === "missed" || log.status === "skipped"
    ).length;

    const takenLogs = vault.medicationLogs.filter((log) => log.status === "taken").length;

    const adherence =
      completedLogs === 0 ? 0 : Math.round((takenLogs / completedLogs) * 100);

    const recommendationCards: Array<{
      title: string;
      description: string;
      priority: "low" | "medium" | "high";
    }> = [];

    if (adherence < 70 && vault.medications.length > 0) {
      recommendationCards.push({
        title: "Medication adherence needs attention",
        description:
          "Your logged adherence is below 70%. Try adding a more consistent dose routine or reminders.",
        priority: "high",
      });
    }

    if (avgSeverity >= 7) {
      recommendationCards.push({
        title: "Symptom severity has been high",
        description:
          "Recent symptom severity appears elevated. Track flare patterns closely and consider sharing records with your clinician.",
        priority: "high",
      });
    }

    if (topTriggers.some((trigger) => trigger.label.toLowerCase().includes("stress"))) {
      recommendationCards.push({
        title: "Stress may be a recurring trigger",
        description:
          "Stress appears frequently in your recent logs. Consider tagging sleep and workload alongside symptoms for better pattern detection.",
        priority: "medium",
      });
    }

    if (
      vault.foodLogs.filter((log) => log.reactionStatus === "negative").length >= 2
    ) {
      recommendationCards.push({
        title: "Food-trigger patterns detected",
        description:
          "You have multiple negative food reactions logged. Keep logging meals consistently to confirm possible trigger foods.",
        priority: "medium",
      });
    }

    if (recommendationCards.length === 0) {
      recommendationCards.push({
        title: "Data looks stable",
        description:
          "Keep logging symptoms, medications, and food regularly to unlock stronger insights over time.",
        priority: "low",
      });
    }

    return {
      totalSymptoms,
      avgSeverity,
      topTriggers,
      symptomTrend,
      adherence,
      recommendationCards,
    };
  }, [vault]);

  if (!vault) {
    return <div className="p-8">Loading...</div>;
  }

  const maxTrendCount = Math.max(...analytics.symptomTrend.map((item) => item.count), 1);
  const maxTriggerCount = Math.max(...analytics.topTriggers.map((item) => item.value), 1);

  const priorityClass = (priority: "low" | "medium" | "high") => {
    if (priority === "high") return "bg-red-100 text-red-700";
    if (priority === "medium") return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="rounded-[28px] bg-white p-8 shadow-sm">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-slate-800">Insights</h1>
            <p className="mt-1 text-slate-500">
              Trends, trigger patterns, and medication adherence from your local data
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500">Total symptoms logged</p>
              <p className="mt-2 text-3xl font-semibold text-slate-800">
                {analytics.totalSymptoms}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500">Average severity</p>
              <p className="mt-2 text-3xl font-semibold text-slate-800">
                {analytics.avgSeverity}/10
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500">Medication adherence</p>
              <p className="mt-2 text-3xl font-semibold text-slate-800">
                {analytics.adherence}%
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-5">
              <h2 className="text-xl font-semibold text-slate-800">7-Day Symptom Trend</h2>
              <p className="mt-1 text-sm text-slate-500">
                Number of symptoms logged each day
              </p>

              <div className="mt-6 flex h-[220px] items-end gap-3">
                {analytics.symptomTrend.map((item) => {
                  const height = `${Math.max((item.count / maxTrendCount) * 100, item.count > 0 ? 12 : 4)}%`;

                  return (
                    <div key={item.date} className="flex flex-1 flex-col items-center justify-end">
                      <div className="mb-2 text-xs text-slate-500">{item.count}</div>
                      <div
                        className="w-full rounded-t-xl bg-[#7c9dc9] transition-all"
                        style={{ height }}
                      />
                      <div className="mt-3 text-xs text-slate-500">
                        {new Date(item.date).toLocaleDateString("en-US", { weekday: "short" })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h2 className="text-xl font-semibold text-slate-800">Top Triggers</h2>
              <p className="mt-1 text-sm text-slate-500">
                Most frequently tagged symptom triggers
              </p>

              <div className="mt-6 space-y-4">
                {analytics.topTriggers.length === 0 ? (
                  <p className="text-slate-500">No trigger data yet.</p>
                ) : (
                  analytics.topTriggers.map((trigger) => (
                    <div key={trigger.label}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{trigger.label}</span>
                        <span className="text-slate-500">{trigger.value}</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-slate-100">
                        <div
                          className="h-3 rounded-full bg-[#c89fd4]"
                          style={{ width: `${(trigger.value / maxTriggerCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 p-5">
            <h2 className="text-xl font-semibold text-slate-800">Recommendations</h2>
            <p className="mt-1 text-sm text-slate-500">
              Rules-based suggestions from your recent logs
            </p>

            <div className="mt-5 space-y-4">
              {analytics.recommendationCards.map((item, index) => (
                <div
                  key={`${item.title}-${index}`}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">{item.title}</h3>
                      <p className="mt-2 text-slate-600">{item.description}</p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${priorityClass(
                        item.priority
                      )}`}
                    >
                      {item.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 p-5">
            <h2 className="text-xl font-semibold text-slate-800">What powers this page</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-[#f7f3f8] p-4 text-slate-700">
                Symptom logs and severity
              </div>
              <div className="rounded-2xl bg-[#eef4fb] p-4 text-slate-700">
                Medication dose completion
              </div>
              <div className="rounded-2xl bg-[#eef8ef] p-4 text-slate-700">
                Trigger tags and food reactions
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}