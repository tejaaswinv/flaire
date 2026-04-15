"use client";

import type { FlaireVault } from "../types/flaire-vault";
import {
  clearVaultFromDb,
  loadVaultFromDb,
  saveVaultToDb,
} from "./vault-db";

const LEGACY_STORAGE_KEY = "flaire_vault";

export async function saveToStorage(value: FlaireVault) {
  await saveVaultToDb(value);

  if (typeof window !== "undefined") {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(value));
    window.dispatchEvent(new Event("flaire:vault-updated"));
  }
}

export async function loadFromStorage<T = FlaireVault>() {
  const dbVault = await loadVaultFromDb();
  if (dbVault) return dbVault as T;

  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as T;

    if (parsed) {
      await saveVaultToDb(parsed as unknown as FlaireVault);
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function clearStorage() {
  await clearVaultFromDb();

  if (typeof window !== "undefined") {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
}