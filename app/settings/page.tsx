"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/layout/app-shell";
import PageContainer from "../../components/ui/page-container";
import SectionCard from "../../components/ui/section-card";
import Button from "../../components/ui/button";
import { clearStorage, loadFromStorage, saveToStorage } from "../../lib/storage";
import { downloadFullBackup, importFullBackupFromFile } from "../../lib/vault-transfer";
import type { FlaireVault } from "../../types/flaire-vault";

export default function SettingsPage() {
  const [vault, setVault] = useState<FlaireVault | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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

  const handleExport = async () => {
    if (!vault) return;

    try {
      setBusy(true);
      setError("");
      setMessage("");
      await downloadFullBackup(vault);
      setMessage("Full backup exported successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (file: File | null) => {
    if (!file) return;

    try {
      setBusy(true);
      setError("");
      setMessage("");

      const importedVault = await importFullBackupFromFile(file);
      await saveToStorage(importedVault);
      setVault(importedVault);

      setMessage("Full backup imported successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    await clearStorage();
    setVault(null);
    setMessage("Local vault cleared from browser storage.");
    setError("");
  };

  return (
    <AppShell>
      <PageContainer
        title="Settings & Backup"
        subtitle="Export or import your full local Flaire backup"
      >
        <div className="grid gap-6">
          <SectionCard
            title="Export Full Backup"
            subtitle="Download your vault and uploaded local files in one backup"
          >
            <Button onClick={handleExport} disabled={!vault || busy}>
              {busy ? "Working..." : "Export Full Backup"}
            </Button>
          </SectionCard>

          <SectionCard
            title="Import Full Backup"
            subtitle="Restore a previously exported full backup file"
          >
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => handleImport(e.target.files?.[0] ?? null)}
              className="block w-full rounded-xl border border-slate-200 px-4 py-3"
              disabled={busy}
            />
          </SectionCard>

          <SectionCard
            title="Danger Zone"
            subtitle="This clears the vault stored in browser storage. IndexedDB files remain unless separately overwritten by an import."
            className="border-red-200 bg-red-50"
          >
            <Button variant="danger" onClick={handleClear} disabled={busy}>
              Clear Local Vault
            </Button>
          </SectionCard>

          {(message || error) && (
            <div
              className={`rounded-2xl p-4 ${
                error ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
              }`}
            >
              {error || message}
            </div>
          )}
        </div>
      </PageContainer>
    </AppShell>
  );
}