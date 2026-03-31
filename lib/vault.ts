import type { FlaireVault } from "../types/flaire-vault";

export function createEmptyVault(displayName = "San"): FlaireVault {
  const now = new Date().toISOString();

  return {
    version: 1,
    profile: {
      id: crypto.randomUUID(),
      displayName,
      createdAt: now,
      updatedAt: now,
    },
    checkins: [],
    symptoms: [],
    medications: [],
    medicationLogs: [],
    foodLogs: [],
    records: [],
    updatedAt: now,
  };
}