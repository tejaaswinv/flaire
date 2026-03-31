"use client";

import type { FlaireVault } from "../types/flaire-vault";
import { getFileBlob, saveFileBlob } from "./file-db";
import { base64ToFile, fileToBase64 } from "./file-transfer";

type BackupFileEntry = {
  fileId: string;
  fileName: string;
  fileType: string;
  base64Content: string;
};

type FlaireFullBackup = {
  version: 1;
  exportedAt: string;
  vault: FlaireVault;
  files: BackupFileEntry[];
};

export async function downloadFullBackup(vault: FlaireVault) {
  const files: BackupFileEntry[] = [];

  for (const record of vault.records ?? []) {
    if (!record.fileId || !record.fileName || !record.fileType) continue;

    const file = await getFileBlob(record.fileId);
    if (!file) continue;

    const base64Content = await fileToBase64(file);

    files.push({
      fileId: record.fileId,
      fileName: record.fileName,
      fileType: record.fileType,
      base64Content,
    });
  }

  const backup: FlaireFullBackup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    vault,
    files,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  a.href = url;
  a.download = `flaire-full-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

export async function importFullBackupFromFile(file: File): Promise<FlaireVault> {
  const text = await file.text();
  const parsed = JSON.parse(text) as FlaireFullBackup;

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid backup file.");
  }

  if (parsed.version !== 1) {
    throw new Error("Unsupported backup version.");
  }

  if (!parsed.vault || typeof parsed.vault !== "object") {
    throw new Error("Backup vault is missing.");
  }

  const vault: FlaireVault = {
    ...parsed.vault,
    checkins: parsed.vault.checkins ?? [],
    symptoms: parsed.vault.symptoms ?? [],
    medications: parsed.vault.medications ?? [],
    medicationLogs: parsed.vault.medicationLogs ?? [],
    foodLogs: parsed.vault.foodLogs ?? [],
    records: parsed.vault.records ?? [],
    updatedAt: new Date().toISOString(),
  };

  for (const entry of parsed.files ?? []) {
    const restoredFile = base64ToFile(
      entry.base64Content,
      entry.fileName,
      entry.fileType
    );

    await saveFileBlob(entry.fileId, restoredFile);
  }

  return vault;
}