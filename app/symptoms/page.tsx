"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/layout/app-shell";
import PageContainer from "../../components/ui/page-container";
import SectionCard from "../../components/ui/section-card";
import Button from "../../components/ui/button";
import Input from "../../components/ui/input";
import Textarea from "../../components/ui/textarea";
import Badge from "../../components/ui/badge";
import { loadFromStorage, saveToStorage } from "../../lib/storage";
import type {
  FlaireVault,
  SymptomLog,
  Severity,
} from "../../types/flaire-vault";

const DEFAULT_TRIGGERS = ["Stress", "Cold Weather", "Poor Sleep", "Diet"];
const BODY_REGIONS = ["Head", "Neck", "Back", "Chest", "Arms", "Legs"];

export default function SymptomsPage() {
  const [vault, setVault] = useState<FlaireVault | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [symptomName, setSymptomName] = useState("");
  const [severity, setSeverity] = useState<Severity>(5 as Severity);
  const [note, setNote] = useState("");
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const data = await loadFromStorage<FlaireVault>();
      if (cancelled) return;
      setVault(data ?? null);
    }

    init();

    async function onVaultUpdated() {
      const latest = await loadFromStorage<FlaireVault>();
      if (cancelled) return;
      setVault(latest ?? null);
    }

    window.addEventListener("flaire:vault-updated", onVaultUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("flaire:vault-updated", onVaultUpdated);
    };
  }, []);

  const recentSymptoms = useMemo(() => {
    return [...(vault?.symptoms ?? [])].sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() -
        new Date(a.occurredAt).getTime()
    );
  }, [vault]);

  if (!vault) {
    return <div className="p-8">Loading...</div>;
  }

  const resetForm = () => {
    setEditingId(null);
    setSymptomName("");
    setSeverity(5 as Severity);
    setNote("");
    setSelectedTriggers([]);
    setSelectedRegions([]);
  };

  const toggleRegion = (region: string) => {
    setSelectedRegions((prev) =>
      prev.includes(region)
        ? prev.filter((r) => r !== region)
        : [...prev, region]
    );
  };

  const saveSymptom = async () => {
    if (!symptomName.trim()) return;

    const now = new Date().toISOString();

    if (editingId) {
      const updatedVault: FlaireVault = {
        ...vault,
        symptoms: vault.symptoms.map((s) =>
          s.id === editingId
            ? {
                ...s,
                symptomName,
                severity,
                triggers: selectedTriggers,
                bodyRegions: selectedRegions,
                note,
                updatedAt: now,
              }
            : s
        ),
        updatedAt: now,
      };

      setVault(updatedVault);
      await saveToStorage(updatedVault);
      resetForm();
      return;
    }

    const newSymptom: SymptomLog = {
      id: crypto.randomUUID(),
      symptomName,
      severity,
      occurredAt: now,
      triggers: selectedTriggers,
      bodyRegions: selectedRegions,
      note,
      createdAt: now,
      updatedAt: now,
    };

    const updatedVault: FlaireVault = {
      ...vault,
      symptoms: [newSymptom, ...vault.symptoms],
      updatedAt: now,
    };

    setVault(updatedVault);
    await saveToStorage(updatedVault);
    resetForm();
  };

  const deleteSymptom = async (id: string) => {
    const updatedVault: FlaireVault = {
      ...vault,
      symptoms: vault.symptoms.filter((s) => s.id !== id),
      updatedAt: new Date().toISOString(),
    };

    setVault(updatedVault);
    await saveToStorage(updatedVault);
  };

  return (
    <AppShell>
      <PageContainer title="Symptoms" subtitle="Track your symptoms">
        <SectionCard title="Log Symptom">
          <div className="space-y-4">
            <Input
              value={symptomName}
              onChange={(e) => setSymptomName(e.target.value)}
              placeholder="Symptom name"
            />

            <div>
              <p>Severity: {severity}/10</p>
              <input
                type="range"
                min={0}
                max={10}
                value={severity}
                onChange={(e) =>
                  setSeverity(Number(e.target.value) as Severity)
                }
              />
            </div>

            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Notes"
            />

            <div>
              {BODY_REGIONS.map((region) => (
                <button
                  key={region}
                  type="button"
                  onClick={() => toggleRegion(region)}
                  className="m-1 border px-2 py-1"
                >
                  {region}
                </button>
              ))}
            </div>

            <Button onClick={saveSymptom}>
              {editingId ? "Update" : "Add Symptom"}
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="Recent Symptoms">
          {recentSymptoms.map((s) => (
            <div key={s.id} className="border p-3 mb-2">
              <p>{s.symptomName}</p>
              <p>{s.severity}/10</p>
              <Button onClick={() => deleteSymptom(s.id)}>
                Delete
              </Button>
            </div>
          ))}
        </SectionCard>
      </PageContainer>
    </AppShell>
  );
}