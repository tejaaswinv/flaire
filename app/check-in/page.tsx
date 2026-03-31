"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/layout/app-shell";
import PageContainer from "../../components/ui/page-container";
import SectionCard from "../../components/ui/section-card";
import Button from "../../components/ui/button";
import Textarea from "../../components/ui/textarea";
import Badge from "../../components/ui/badge";
import { loadFromStorage, saveToStorage } from "../../lib/storage";
import type {
  DailyCheckin,
  EnergyLevel,
  FlaireVault,
  Severity,
} from "../../types/flaire-vault";

const energyOptions: EnergyLevel[] = [
  "very_low",
  "low",
  "moderate",
  "good",
  "high",
];

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function CheckInPage() {
  const [vault, setVault] = useState<FlaireVault | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [energy, setEnergy] = useState<EnergyLevel>("moderate");
  const [pain, setPain] = useState<Severity>(5 as Severity);
const [stress, setStress] = useState<Severity>(5 as Severity);
  const [sleepHours, setSleepHours] = useState(7);
  const [isFlareDay, setIsFlareDay] = useState(false);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  function fillForm(checkin: DailyCheckin) {
    setEditingId(checkin.id);
    setEnergy(checkin.energy);
    setPain(checkin.pain);
    setStress(checkin.stress);
    setSleepHours(checkin.sleepHours);
    setIsFlareDay(checkin.isFlareDay);
    setNote(checkin.note ?? "");
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const data = await loadFromStorage<FlaireVault>();
      if (!data || cancelled) return;

      setVault(data);

      const todayKey = getTodayKey();
      const existingToday = data.checkins.find(
        (checkin) => checkin.date.slice(0, 10) === todayKey
      );

      if (existingToday && !cancelled) {
        fillForm(existingToday);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  const sortedCheckins = useMemo(() => {
    if (!vault) return [];
    return [...vault.checkins].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [vault]);

  if (!vault) {
    return <div className="p-8">Loading...</div>;
  }

  function resetForm() {
  if (!vault) return;

  const todayKey = getTodayKey();
  const existingToday = vault.checkins.find(
    (checkin) => checkin.date.slice(0, 10) === todayKey
  );

  if (existingToday) {
    fillForm(existingToday);
    return;
  }

  setEditingId(null);
  setEnergy("moderate");
  setPain(5 as Severity);
  setStress(5 as Severity);
  setSleepHours(7);
  setIsFlareDay(false);
  setNote("");
}

  const saveCheckin = async () => {
    const now = new Date().toISOString();

    let updatedCheckins: DailyCheckin[];

    if (editingId) {
      updatedCheckins = vault.checkins.map((checkin) =>
        checkin.id === editingId
          ? {
              ...checkin,
              energy,
              pain: pain as Severity,
              stress: stress as Severity,
              sleepHours,
              isFlareDay,
              note: note.trim() || undefined,
              updatedAt: now,
            }
          : checkin
      );
    } else {
      const newCheckin: DailyCheckin = {
        id: crypto.randomUUID(),
        date: now,
        energy,
        pain: pain as Severity,
        stress: stress as Severity,
        sleepHours,
        isFlareDay,
        note: note.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };

      updatedCheckins = [newCheckin, ...vault.checkins];
      setEditingId(newCheckin.id);
    }

    const updatedVault: FlaireVault = {
      ...vault,
      checkins: updatedCheckins,
      updatedAt: now,
    };

    setVault(updatedVault);
    await saveToStorage(updatedVault);
    setMessage("Check-in saved.");
  };

  const editCheckin = (checkin: DailyCheckin) => {
    fillForm(checkin);
    setMessage("");
  };

  const deleteCheckin = async (id: string) => {
    const updatedVault: FlaireVault = {
      ...vault,
      checkins: vault.checkins.filter((checkin) => checkin.id !== id),
      updatedAt: new Date().toISOString(),
    };

    setVault(updatedVault);
    await saveToStorage(updatedVault);

    if (editingId === id) {
      setEditingId(null);
      setEnergy("moderate");
      setPain(5 as Severity);
      setStress(5);
      setSleepHours(7);
      setIsFlareDay(false);
      setNote("");
    }

    setMessage("Check-in deleted.");
  };

  return (
    <AppShell>
      <PageContainer
        title="Daily Check-in"
        subtitle="Capture today’s condition in one place"
        actions={
          <div className="flex gap-3">
            <Button variant="soft" onClick={resetForm}>
              Reset
            </Button>
            <Button onClick={saveCheckin}>
              {editingId ? "Save Check-in" : "Create Check-in"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <SectionCard title="Energy level">
              <div className="flex flex-wrap gap-3">
                {energyOptions.map((option) => {
                  const active = energy === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setEnergy(option)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        active
                          ? "bg-[#7c9dc9] text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {option.replace("_", " ")}
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title={`Pain level: ${pain}/10`}>
              <input
                type="range"
                min={0}
                max={10}
                value={pain}
                onChange={(e) => setPain(Number(e.target.value) as Severity)}
                className="w-full"
              />
            </SectionCard>

            <SectionCard title={`Stress level: ${stress}/10`}>
              <input
                type="range"
                min={0}
                max={10}
                value={stress}
                onChange={(e) => setStress(Number(e.target.value) as Severity)}
                className="w-full"
              />
            </SectionCard>

            <SectionCard title={`Sleep hours: ${sleepHours}`}>
              <input
                type="range"
                min={0}
                max={14}
                step={0.5}
                value={sleepHours}
                onChange={(e) => setSleepHours(Number(e.target.value))}
                className="w-full"
              />
            </SectionCard>

            <SectionCard>
              <label className="flex items-center gap-3 text-lg font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={isFlareDay}
                  onChange={(e) => setIsFlareDay(e.target.checked)}
                  className="h-5 w-5"
                />
                Mark as flare day
              </label>
            </SectionCard>

            <SectionCard title="Daily note">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything important about today?"
                rows={4}
              />
            </SectionCard>

            {message ? (
              <div className="rounded-2xl bg-green-100 px-4 py-3 text-green-700">
                {message}
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <SectionCard title="Recent Check-ins" subtitle="Review and edit past entries">
              {sortedCheckins.length === 0 ? (
                <p className="text-slate-500">No check-ins logged yet.</p>
              ) : (
                <div className="space-y-4">
                  {sortedCheckins.slice(0, 8).map((checkin) => (
                    <div
                      key={checkin.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-800">
                              {new Date(checkin.date).toLocaleDateString()}
                            </p>
                            {checkin.isFlareDay ? (
                              <Badge tone="red">Flare</Badge>
                            ) : (
                              <Badge tone="green">Stable</Badge>
                            )}
                          </div>

                          <div className="mt-3 grid gap-2 text-sm text-slate-600">
                            <p>Energy: {checkin.energy.replace("_", " ")}</p>
                            <p>Pain: {checkin.pain}/10</p>
                            <p>Stress: {checkin.stress}/10</p>
                            <p>Sleep: {checkin.sleepHours}h</p>
                          </div>

                          {checkin.note ? (
                            <p className="mt-3 text-sm text-slate-600">{checkin.note}</p>
                          ) : null}
                        </div>

                        <div className="flex gap-2">
                          <Button variant="soft" onClick={() => editCheckin(checkin)}>
                            Edit
                          </Button>
                          <button
                            onClick={() => deleteCheckin(checkin.id)}
                            className="text-2xl text-slate-500 hover:text-red-500"
                            aria-label="Delete check-in"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}