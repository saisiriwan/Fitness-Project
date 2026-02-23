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
