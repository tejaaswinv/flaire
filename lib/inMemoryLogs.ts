export type HealthModule = "symptoms" | "medications" | "diet" | "activity" | "check-in";

export type HealthLogEntry = {
  title: string;
  description: string;
  value: string;
  time: string;
  severity: string;
};

export type HealthLog = {
  module: HealthModule;
  entry: HealthLogEntry;
};

export type RoutedChatPayload = {
  logs: HealthLog[];
  reply: string;
  needs_followup: boolean;
  followup_question: string | null;
};

type StoreShape = Record<HealthModule, HealthLogEntry[]>;

declare global {
  // eslint-disable-next-line no-var
  var __FLAIRE_LOG_STORE__: StoreShape | undefined;
}

function getStore(): StoreShape {
  if (!globalThis.__FLAIRE_LOG_STORE__) {
    globalThis.__FLAIRE_LOG_STORE__ = {
      symptoms: [],
      medications: [],
      diet: [],
      activity: [],
      "check-in": [],
    };
  }
  return globalThis.__FLAIRE_LOG_STORE__;
}

export function appendLogs(logs: HealthLog[]) {
  const store = getStore();
  for (const log of logs) {
    store[log.module].push(log.entry);
  }
}

export function getAllLogs(): StoreShape {
  return getStore();
}

