export type ISODateString = string;

export type Severity = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type EnergyLevel = "very_low" | "low" | "moderate" | "good" | "high";
export type ReactionStatus = "positive" | "negative" | "neutral";

export interface VaultProfile {
  id: string;
  displayName: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface DailyCheckin {
  id: string;
  date: ISODateString;
  energy: EnergyLevel;
  pain: Severity;
  stress: Severity;
  sleepHours: number;
  isFlareDay: boolean;
  note?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface SymptomLog {
  id: string;
  symptomName: string;
  severity: Severity;
  occurredAt: ISODateString;
  triggers: string[];
  bodyRegions: string[];
  note?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface MedicationSchedule {
  id: string;
  time: string;
  dayOfWeek?: number;
}

export interface Medication {
  id: string;
  name: string;
  dosageAmount?: number;
  dosageUnit?: string;
  frequencyType: "daily" | "weekly" | "custom";
  instructions?: string;
  schedules: MedicationSchedule[];
  active: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  scheduledFor: ISODateString;
  takenAt?: ISODateString;
  status: "taken" | "missed" | "skipped" | "pending";
  note?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface FoodLog {
  id: string;
  foodName: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "beverage";
  eatenAt: ISODateString;
  reactionStatus?: ReactionStatus;
  reactionNote?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
export interface MedicalRecordRef {
  id: string;
  title: string;
  category: "lab_results" | "imaging" | "notes" | "other";
  sourceName?: string;
  fileId?: string;
  fileName?: string;
  fileType?: string;
  sizeBytes?: number;
  recordDate?: ISODateString;
  localPath?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
export interface FlaireVault {
  version: 1;
  profile: VaultProfile;
  checkins: DailyCheckin[];
  symptoms: SymptomLog[];
  medications: Medication[];
  medicationLogs: MedicationLog[];
  foodLogs: FoodLog[];
  records: MedicalRecordRef[];
  updatedAt: ISODateString;
}