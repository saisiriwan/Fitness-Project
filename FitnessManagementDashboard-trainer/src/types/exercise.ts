export interface SharedExercise {
  id: number;
  name: string;
  category: string;       // ประเภทหลัก: "strength" | "cardio" | "hiit" | "flexibility"
  modality: string;       // วิธีฝึก: "weight_training" | "bodyweight" | "machine" ฯลฯ
  muscleGroups: string[];
  movementPattern?: string;
  instructions?: string;
  trackingFields: string[]; // ← source of truth สำหรับ Dynamic Form
  equipment?: string;
  caloriesEstimate?: string;
}

// Standard tracking fields ที่ระบบรองรับ
export const TRACKING_FIELD_OPTIONS = [
  "weight", "reps", "rpe", "rest",          // Weight Training
  "distance", "duration", "pace",            // Cardio
  "work_time", "rest_time",                  // HIIT
  "hold_time", "side",                       // Flexibility
  "notes",
] as const;

// Default fields ต่อ category (fallback ถ้าไม่ได้กำหนด)
export const DEFAULT_TRACKING_FIELDS: Record<string, string[]> = {
  strength:    ["weight", "reps", "rpe", "rest", "notes"],
  cardio:      ["distance", "duration", "pace", "rest"],
  hiit:        ["work_time", "rest_time", "reps", "notes"],
  flexibility: ["hold_time", "reps", "side", "rest"],
};

// KEY_MAP: display key → backend key
export const KEY_MAP: Record<string, string> = {
  "Dist(L)": "distance_long",
  "Dist(S)": "distance_short",
  "%1RM": "one_rm",
  "%HR": "hr_zone",
  "Heart Rate": "heart_rate",
  Watt: "watts",
  Watts: "watts",
  Speed: "speed",
  Cadence: "cadence",
  RPM: "rpm",
  Rounds: "rounds",
};

export const normalizeTrackingFieldKey = (field: string): string => {
  if (!field) return "";
  const lower = field.toLowerCase().trim();
  
  // Custom mappings for variations
  if (lower.includes("dist(l)") || lower.includes("distance-long") || lower === "distance (long)") return "distance_long";
  if (lower.includes("dist(s)") || lower.includes("distance-short") || lower === "distance (short)") return "distance_short";
  if (lower === "time") return "time";
  if (lower === "reps") return "reps";
  if (lower.includes("heart rate")) return "heart_rate";
  if (lower === "%1rm" || lower === "one_rm") return "one_rm";
  if (lower === "%hr" || lower === "hr_zone") return "hr_zone";
  if (lower === "watt" || lower === "watts") return "watts";
  if (lower === "rest time") return "rest_time";
  if (lower === "work time") return "work_time";
  if (lower === "hold time") return "hold_time";
  if (lower === "sets") return "sets";
  
  // Direct mapping using KEY_MAP with case-insensitivity if matched originally
  const matchedKeyMap = Object.keys(KEY_MAP).find(k => k.toLowerCase() === lower);
  if (matchedKeyMap) return KEY_MAP[matchedKeyMap];

  return lower;
};
