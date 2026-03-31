"use client";

import type { FlaireVault } from "../types/flaire-vault";

const DB_NAME = "flaire_vault_db";
const STORE_NAME = "vault_store";
const DB_VERSION = 1;
const VAULT_KEY = "primary_vault";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveVaultToDb(vault: FlaireVault): Promise<void> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(vault, VAULT_KEY);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadVaultFromDb(): Promise<FlaireVault | null> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(VAULT_KEY);

    request.onsuccess = () => resolve((request.result as FlaireVault) ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function clearVaultFromDb(): Promise<void> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(VAULT_KEY);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}