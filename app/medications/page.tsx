"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/layout/app-shell";
import PageContainer from "../../components/ui/page-container";
import SectionCard from "../../components/ui/section-card";
import Button from "../../components/ui/button";
import Input from "../../components/ui/input";
import Textarea from "../../components/ui/textarea";
import Select from "../../components/ui/select";
import Badge from "../../components/ui/badge";
import { loadFromStorage, saveToStorage } from "../../lib/storage";
import type {
  FlaireVault,
  Medication,
  MedicationLog,
  MedicationSchedule,
} from "../../types/flaire-vault";

export default function MedicationsPage() {
  const [vault, setVault] = useState<FlaireVault | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [dosageAmount, setDosageAmount] = useState("");
  const [dosageUnit, setDosageUnit] = useState("mg");
  const [frequencyType, setFrequencyType] = useState<"daily" | "weekly" | "custom">("daily");
  const [instructions, setInstructions] = useState("");
  const [scheduleInput, setScheduleInput] = useState("08:00");

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

  const todaysDate = new Date().toISOString().slice(0, 10);

  const medicationsWithProgress = useMemo(() => {
    if (!vault) return [];

    return vault.medications.map((med) => {
      const todayLogs = vault.medicationLogs.filter(
        (log) =>
          log.medicationId === med.id &&
          log.scheduledFor.slice(0, 10) === todaysDate
      );

      const total = Math.max(med.schedules.length, 1);
      const taken = todayLogs.filter((log) => log.status === "taken").length;
      const percent = Math.round((taken / total) * 100);

      return {
        ...med,
        total,
        taken,
        percent,
        todayLogs,
      };
    });
  }, [vault, todaysDate]);

  if (!vault) {
    return <div className="p-8">Loading...</div>;
  }

  const persist = async (updatedVault: FlaireVault) => {
  setVault(updatedVault);
  await saveToStorage(updatedVault);
};

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDosageAmount("");
    setDosageUnit("mg");
    setFrequencyType("daily");
    setInstructions("");
    setScheduleInput("08:00");
  };

  const addOrUpdateMedication = async() => {
    if (!name.trim()) return;

    const now = new Date().toISOString();

    const schedules: MedicationSchedule[] = [
      {
        id: crypto.randomUUID(),
        time: scheduleInput,
      },
    ];

    if (editingId) {
      const existingMedication = vault.medications.find((m) => m.id === editingId);
      if (!existingMedication) return;

      const updatedMedication: Medication = {
        ...existingMedication,
        name: name.trim(),
        dosageAmount: dosageAmount ? Number(dosageAmount) : undefined,
        dosageUnit: dosageUnit || undefined,
        frequencyType,
        instructions: instructions.trim() || undefined,
        schedules,
        updatedAt: now,
      };

      const filteredLogs = vault.medicationLogs.filter(
        (log) => log.medicationId !== editingId || log.scheduledFor.slice(0, 10) !== todaysDate
      );

      const newTodayLogs: MedicationLog[] = schedules.map((schedule) => {
        const scheduledFor = new Date(`${todaysDate}T${schedule.time}:00`).toISOString();

        return {
          id: crypto.randomUUID(),
          medicationId: editingId,
          scheduledFor,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        };
      });

      await persist({
        ...vault,
        medications: vault.medications.map((m) => (m.id === editingId ? updatedMedication : m)),
        medicationLogs: [...newTodayLogs, ...filteredLogs],
        updatedAt: now,
      });

      resetForm();
      return;
    }

    const medication: Medication = {
      id: crypto.randomUUID(),
      name: name.trim(),
      dosageAmount: dosageAmount ? Number(dosageAmount) : undefined,
      dosageUnit: dosageUnit || undefined,
      frequencyType,
      instructions: instructions.trim() || undefined,
      schedules,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    const logsForToday: MedicationLog[] = schedules.map((schedule) => {
      const scheduledFor = new Date(`${todaysDate}T${schedule.time}:00`).toISOString();

      return {
        id: crypto.randomUUID(),
        medicationId: medication.id,
        scheduledFor,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      };
    });

    await persist({
      ...vault,
      medications: [medication, ...vault.medications],
      medicationLogs: [...logsForToday, ...vault.medicationLogs],
      updatedAt: now,
    });

    resetForm();
  };

  const startEditMedication = (med: Medication) => {
    setEditingId(med.id);
    setName(med.name);
    setDosageAmount(
      typeof med.dosageAmount === "number" ? String(med.dosageAmount) : ""
    );
    setDosageUnit(med.dosageUnit ?? "mg");
    setFrequencyType(med.frequencyType);
    setInstructions(med.instructions ?? "");
    setScheduleInput(med.schedules[0]?.time ?? "08:00");
  };

  const deleteMedication = async (id: string) => {
    const now = new Date().toISOString();

    await persist({
      ...vault,
      medications: vault.medications.filter((m) => m.id !== id),
      medicationLogs: vault.medicationLogs.filter((l) => l.medicationId !== id),
      updatedAt: now,
    });

    if (editingId === id) resetForm();
  };

  const toggleDoseTaken = async (medicationId: string, scheduledFor: string) => {
    const now = new Date().toISOString();

    let found = false;

    const updatedLogs = vault.medicationLogs.map((log) => {
      if (
        log.medicationId === medicationId &&
        log.scheduledFor === scheduledFor
      ) {
        found = true;
        const nextStatus: "pending" | "taken" = log.status === "taken" ? "pending" : "taken";

        return {
          ...log,
          status: nextStatus,
          takenAt: nextStatus === "taken" ? now : undefined,
          updatedAt: now,
        };
      }
      return log;
    });

    if (!found) {
      updatedLogs.unshift({
        id: crypto.randomUUID(),
        medicationId,
        scheduledFor,
        status: "taken",
        takenAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    await persist({
      ...vault,
      medicationLogs: updatedLogs,
      updatedAt: now,
    });
  };

  return (
    <AppShell>
      <PageContainer
        title="Medication Manager"
        subtitle="Track your medications and doses"
        actions={
          <div className="flex gap-3">
            {editingId ? (
              <Button variant="soft" onClick={resetForm}>
                Cancel
              </Button>
            ) : null}
            <Button onClick={addOrUpdateMedication}>
              {editingId ? "Save Changes" : "+ Add Medication"}
            </Button>
          </div>
        }
      >
        <div className="space-y-8">
          <SectionCard title={editingId ? "Edit Medication" : "Add New Medication"}>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Medication name"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  value={dosageAmount}
                  onChange={(e) => setDosageAmount(e.target.value)}
                  placeholder="Dosage"
                />
                <Select
                  value={dosageUnit}
                  onChange={(e) => setDosageUnit(e.target.value)}
                >
                  <option value="mg">mg</option>
                  <option value="ml">ml</option>
                  <option value="tablet">tablet</option>
                  <option value="capsule">capsule</option>
                </Select>
              </div>

              <Select
                value={frequencyType}
                onChange={(e) =>
                  setFrequencyType(e.target.value as "daily" | "weekly" | "custom")
                }
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Custom</option>
              </Select>

              <Input
                type="time"
                value={scheduleInput}
                onChange={(e) => setScheduleInput(e.target.value)}
              />
            </div>

            <div className="mt-4">
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Instructions, e.g. Take with food"
                rows={3}
              />
            </div>
          </SectionCard>

          <SectionCard title="Today's Medications">
            {medicationsWithProgress.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-slate-500">
                No medications added yet.
              </div>
            ) : (
              <div className="space-y-5">
                {medicationsWithProgress.map((med) => (
                  <div key={med.id} className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="text-2xl font-semibold text-slate-800">{med.name}</p>
                          <Badge>{med.frequencyType}</Badge>
                        </div>

                        <p className="mt-1 text-slate-500">
                          {med.dosageAmount
                            ? `${med.dosageAmount} ${med.dosageUnit ?? ""}`
                            : "No dosage specified"}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="soft" onClick={() => startEditMedication(med)}>
                          Edit
                        </Button>
                        <button
                          onClick={() => deleteMedication(med.id)}
                          className="text-2xl text-slate-500 hover:text-red-500"
                          aria-label="Delete medication"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {med.instructions && (
                      <div className="mt-4 rounded-xl border border-[#f0d486] bg-[#fff9e8] px-4 py-3 text-[#b36b00]">
                        {med.instructions}
                      </div>
                    )}

                    <div className="mt-4 space-y-3">
                      {med.schedules.map((schedule) => {
                        const scheduledFor = new Date(
                          `${todaysDate}T${schedule.time}:00`
                        ).toISOString();

                        const existingLog = vault.medicationLogs.find(
                          (log) =>
                            log.medicationId === med.id &&
                            log.scheduledFor === scheduledFor
                        );

                        const isTaken = existingLog?.status === "taken";

                        return (
                          <div
                            key={schedule.id}
                            className="flex items-center justify-between rounded-xl bg-[#f7f3f8] px-4 py-3"
                          >
                            <p className="text-slate-700">{schedule.time}</p>

                            <Button
                              variant={isTaken ? "secondary" : "soft"}
                              onClick={() => toggleDoseTaken(med.id, scheduledFor)}
                              className={isTaken ? "text-white bg-green-600" : ""}
                            >
                              {isTaken ? "Taken ✓" : "Mark as taken"}
                            </Button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                        <span>Today's progress</span>
                        <span>
                          {med.taken}/{med.total}
                        </span>
                      </div>

                      <div className="h-3 w-full rounded-full bg-[#eadff0]">
                        <div
                          className="h-3 rounded-full bg-[#7c9dc9] transition-all"
                          style={{ width: `${med.percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </PageContainer>
    </AppShell>
  );
}