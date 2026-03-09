import { useMemo, useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";
import {
  Calendar,
  Dumbbell,
  Scale,
  CalendarDays,
  Weight,
  TrendingUp,
  Activity,
  Target,
  Flame,
  Heart,
  TrendingDown,
  Zap,
  Loader2,
  Award,
} from "lucide-react";
import {
  subMonths,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  format,
  parseISO,
} from "date-fns";
import { th } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  ClientProfile,
  clientService,
  TrainingProgram,
  ExerciseHistoryRecord,
  ProgramStats,
  MetricsResponse,
  MetricItem,
  Session,
} from "@/services/clientService";

// ===================================
// FIELD CONFIGURATION
// ===================================
const FIELD_CONFIG: Record<
  string,
  { label: string; placeholder: string; type: string }
> = {
  reps: { label: "REPS", placeholder: "10", type: "text" },
  weight: { label: "WEIGHT", placeholder: "0", type: "number" },
  distance: { label: "Dist", placeholder: "0", type: "text" },
  pace: { label: "Pace", placeholder: "6:00", type: "text" },
  duration: { label: "Time", placeholder: "0", type: "text" },
  hold_time: { label: "Hold", placeholder: "30", type: "text" },
  tempo: { label: "Tempo", placeholder: "3-1-1", type: "text" },
  rest: { label: "REST", placeholder: "00:00", type: "text" },
  rpe: { label: "RPE", placeholder: "1-10", type: "number" },
  side: { label: "Side", placeholder: "L/R", type: "text" },
  time: { label: "Time", placeholder: "00:00", type: "text" },
  speed: { label: "Speed", placeholder: "0", type: "number" },
  cadence: { label: "Cadence", placeholder: "0", type: "number" },
  distance_long: { label: "Dist(L)", placeholder: "0", type: "number" },
  distance_short: {
    label: "Dist(S)",
    placeholder: "0",
    type: "number",
  },
  one_rm: { label: "%1RM", placeholder: "0", type: "number" },
  rir: { label: "RIR", placeholder: "0", type: "number" },
  heart_rate: { label: "Heart Rate", placeholder: "0", type: "number" },
  hr_zone: { label: "%HR", placeholder: "0", type: "number" },
  watts: { label: "Watt", placeholder: "0", type: "number" },
  rpm: { label: "RPM", placeholder: "0", type: "number" },
  rounds: { label: "Rounds", placeholder: "0", type: "number" },
  sets: { label: "Sets", placeholder: "3", type: "number" },
  notes: { label: "Notes", placeholder: "...", type: "text" },
  work_time: { label: "Work", placeholder: "00:30", type: "text" },
  rest_time: { label: "Rest", placeholder: "00:10", type: "text" },
};

interface ProgressViewProps {
  user: ClientProfile | null;
}

// ===================================
// GOAL CONFIGURATION
// ===================================
const GOAL_CONFIG = {
  weight_loss: {
    label: "ลดน้ำหนัก",
    labelEn: "Weight Loss",
    icon: Weight,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
    chartColor: "#10b981",
    description: "เน้นการเผาผลาญไขมันและลดน้ำหนักตัว",
    metrics: ["weight", "body_fat", "bmi"],
  },
  muscle_building: {
    label: "สร้างกล้ามเนื้อ",
    labelEn: "Muscle Building",
    icon: Dumbbell,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    chartColor: "#3b82f6",
    description: "เน้นการเพิ่มขนาดและมวลกล้ามเนื้อ",
    metrics: ["weight", "chest_circumference", "arm_circumference"],
  },
  strength: {
    label: "เพิ่มความแข็งแรง",
    labelEn: "Strength",
    icon: TrendingUp,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    chartColor: "#f97316",
    description: "เน้นการเพิ่มพละกำลังและ 1RM",
    metrics: ["one_rm", "bmi"],
  },
  general_health: {
    label: "สุขภาพทั่วไป",
    labelEn: "General Health",
    icon: Activity,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
    chartColor: "#a855f7",
    description: "เน้นสุขภาพองค์รวมและความฟิต",
    metrics: ["vo2_max", "resting_hr", "bmi"],
  },
} as const;

type GoalKey = keyof typeof GOAL_CONFIG;

// ===================================
// MAP GOAL FROM API
// ===================================
const mapGoalKey = (apiGoal?: string): GoalKey => {
  if (!apiGoal) return "general_health";
  const lower = apiGoal.toLowerCase();

  // Weight Loss
  if (
    lower.includes("weight") ||
    lower.includes("fat") ||
    lower.includes("ลดน้ำหนัก") ||
    lower.includes("ลดความอ้วน")
  )
    return "weight_loss";

  // Muscle Building
  if (
    lower.includes("muscle") ||
    lower.includes("hypertrophy") ||
    lower.includes("build") ||
    lower.includes("สร้างกล้าม") ||
    lower.includes("เพิ่มกล้าม")
  )
    return "muscle_building";

  // Strength
  if (
    lower.includes("strength") ||
    lower.includes("power") ||
    lower.includes("strong") ||
    lower.includes("แข็งแรง") ||
    lower.includes("พละกำลัง")
  )
    return "strength";

  // General Health (Explicit check + Default)
  if (
    lower.includes("health") ||
    lower.includes("สุขภาพ") ||
    lower.includes("general")
  )
    return "general_health";

  return "general_health";
};

// ===================================
// EXERCISE TYPE CONFIGURATION
// ===================================
const EXERCISE_TYPE_CONFIG = {
  weight_training: {
    label: "💪 เวทเทรนนิ่ง",
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    chartColor: "#3b82f6",
    icon: Dumbbell,
    frequency: "2-4 ครั้ง/สัปดาห์",
    description: "พัฒนาความแข็งแรง, มวลกล้ามเนื้อ, เพิ่มอัตราการเผาผลาญ",
  },
  cardio: {
    label: "🏃 คาร์ดิโอ",
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    badgeColor:
      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    chartColor: "#10b981",
    icon: Heart,
    frequency: "3-5 ครั้ง/สัปดาห์",
    description: "พัฒนาระบบหัวใจและหลอดเลือด, เผาผลาญไขมัน, เพิ่มความทนทาน",
  },
  flexibility: {
    label: "🧘 เฟล็กซ์",
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
    badgeColor:
      "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    chartColor: "#a855f7",
    icon: Activity,
    frequency: "ทุกวัน หรือ 3-5 ครั้ง/สัปดาห์",
    description: "ป้องกันการบาดเจ็บ, เพิ่มช่วงการเคลื่อนไหว, ช่วยการฟื้นตัว",
  },
} as const;

const getTypeConfig = (type: string) => {
  return (
    EXERCISE_TYPE_CONFIG[type as keyof typeof EXERCISE_TYPE_CONFIG] ||
    EXERCISE_TYPE_CONFIG.weight_training
  );
};

// ===================================
// EXERCISE TYPE CONFIGURATION
// ===================================
// ... (Keep existing config)

// (MOCK DATA REMOVED)

// ===================================
// HELPER FUNCTIONS (OUTSIDE COMPONENT)
// ===================================
function getExerciseIcon(type: string) {
  switch (type) {
    case "weight_training":
      return Dumbbell;
    case "cardio":
      return Heart;
    case "flexibility":
      return Activity;
    default:
      return Activity;
  }
}

function formatMinutes(minutes: number): string {
  if (typeof minutes !== "number") return "0:00";
  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function ProgressView({ user }: ProgressViewProps) {
  // State
  const [currentProgram, setCurrentProgram] = useState<TrainingProgram | null>(
    null,
  );
  const [programDetails, setProgramDetails] = useState<any | null>(null);
  const [exerciseHistory, setExerciseHistory] = useState<
    ExerciseHistoryRecord[]
  >([]);
  const [programStats, setProgramStats] = useState<ProgramStats | null>(null);
  const [metricsResponse, setMetricsResponse] =
    useState<MetricsResponse | null>(null);
  const [loadingProgram, setLoadingProgram] = useState(false);
  const [exerciseMap, setExerciseMap] = useState<Map<string, string>>(
    new Map(),
  );
  const [error, setError] = useState<string | null>(null);
  const [programSchedules, setProgramSchedules] = useState<Session[]>([]);
  const [programProgress, setProgramProgress] = useState({
    completed: 0,
    total: 0,
    percentage: 0,
    adherence: 0,
  });

  const userGoalKey = useMemo(() => mapGoalKey(user?.goal), [user?.goal]);

  // NOTE: Exercise history is fetched in the main data-loading useEffect below.
  // A separate duplicate fetch was removed to prevent race conditions.

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        setLoadingProgram(true);
        const [
          programRes,
          statsRes,
          historyRes,
          metricsRes,
          exercisesRes,
          schedulesRes,
        ] = await Promise.all([
          clientService.getCurrentProgram(user.id.toString()).catch(() => null),
          clientService
            .getProgramStatistics(user.id.toString())
            .catch(() => null),
          clientService
            .getExerciseHistory(user.id.toString())
            .catch(() => null),
          clientService
            .getMetrics(user.id.toString(), { goal: userGoalKey })
            .catch(() => null),
          clientService.getExercises().catch(() => []),
          clientService.getMySchedules().catch(() => []),
        ]);

        setCurrentProgram(programRes);
        setProgramStats(statsRes);
        setExerciseHistory(historyRes?.exercises || []);

        let detailsRes = null;
        if (programRes?.id) {
          detailsRes = await clientService
            .getProgramDetails(programRes.id)
            .catch(() => null);
          setProgramDetails(detailsRes);
        }

        // Calculate program progress from schedules
        if (programRes && schedulesRes) {
          // Use == for loose equality to handle string/number comparison if any
          const progSchedules = schedulesRes.filter(
            (s: Session) => (s as any).program_id == programRes.id,
          );
          setProgramSchedules(progSchedules);

          // Use statsRes if available, otherwise calculate from schedules
          // Backend TotalWorkouts is the count of COMPLETED sessions
          const completed =
            (statsRes as any)?.total_workouts ??
            progSchedules.filter(
              (s: Session) => s.status?.toLowerCase() === "completed",
            ).length;

          let total = 0;
          const progDetails = detailsRes || (programRes as any);

          if (progDetails?.days && progDetails.days.length > 0) {
            // If the backend returns detailed days structure, count non-rest days
            total = progDetails.days.filter((d: any) => !d.is_rest).length;
            if (total === 0 && progDetails.days.length > 0)
              total = progDetails.days.length;
          } else {
            // Otherwise, calculate total based on duration and days_per_week
            const weeks = progDetails.duration_weeks || 4;
            const daysPerWeek = progDetails.days_per_week || 3;
            total = weeks * daysPerWeek;
          }
          // Adherence: completed / past sessions
          const now = new Date();
          const pastCount = progSchedules.filter(
            (s: Session) => new Date(s.start_time) < now,
          ).length;
          const adherence =
            pastCount > 0 ? Math.round((completed / pastCount) * 100) : 0;

          setProgramProgress({
            completed,
            total: total > 0 ? total : 1,
            percentage: (statsRes as any)?.completion_rate
              ? Math.round((statsRes as any).completion_rate)
              : total > 0
                ? Math.round((completed / total) * 100)
                : 0,
            adherence: Math.min(adherence, 100),
          });
        }

        // Map Metrics
        if (metricsRes) {
          if (Array.isArray(metricsRes)) {
            // Group flat metrics array by type
            const groupedMetrics: Record<string, any[]> = {};
            metricsRes.forEach((item: any) => {
              if (!groupedMetrics[item.type]) {
                groupedMetrics[item.type] = [];
              }
              groupedMetrics[item.type].push(item);
            });

            setMetricsResponse({
              goal: userGoalKey,
              metrics: groupedMetrics,
              summary: {}, // Default empty summary
              recommendations: [], // Default empty recommendations
            });
          } else {
            setMetricsResponse(metricsRes);
          }
        }

        // Create Exercise Map
        const exMap = new Map<string, string>();
        if (Array.isArray(exercisesRes)) {
          exercisesRes.forEach((ex: any) => {
            exMap.set(ex.id?.toString(), ex.name);
            exMap.set(`one_rm_${ex.id}`, ex.name);
          });
        }
        setExerciseMap(exMap);
      } catch (err: any) {
        console.error("Error loading progress data:", err);
        setError("ไม่สามารถโหลดข้อมูลโปรแกรมได้");
      } finally {
        setLoadingProgram(false);
      }
    };

    fetchData();
  }, [user?.id, userGoalKey]);

  // ===================================
  // TRANSFORM DATA
  // ===================================
  // Check if program is completed
  const isProgramCompleted = useMemo(() => {
    if (!currentProgram) return false;
    if ((currentProgram as any).end_date) {
      const endDate = new Date((currentProgram as any).end_date);
      endDate.setHours(23, 59, 59, 999);
      if (new Date() > endDate) return true;
    }
    if (
      programProgress.total > 0 &&
      programProgress.completed >= programProgress.total
    )
      return true;
    return false;
  }, [currentProgram, programProgress]);

  // Build weekly structure from program details (mirroring trainer side)
  const structuredWeeks = useMemo(() => {
    if (!currentProgram) return [];
    const prog = currentProgram as any;
    if (!prog.days || !Array.isArray(prog.days)) return [];

    const weeks: Record<number, any[]> = {};
    prog.days.forEach((d: any) => {
      const wn = d.week_number ?? 1;
      if (!weeks[wn]) weeks[wn] = [];
      weeks[wn].push(d);
    });

    return Object.entries(weeks).map(([weekNum, weekDays]) => ({
      weekNumber: parseInt(weekNum),
      days: weekDays.map((d: any) => ({
        dayId: d.id,
        dayNumber: d.day_number,
        name: d.name,
        isRest: d.is_rest ?? false,
        exercises: d.sections
          ? d.sections.flatMap((s: any) => s.exercises || [])
          : [],
      })),
    }));
  }, [currentProgram]);

  // Build day → schedule mapping
  const dayScheduleMap = useMemo(() => {
    const map: Record<number, Session> = {};
    programSchedules.forEach((s: any) => {
      if (s.program_day_id) {
        map[s.program_day_id] = s;
      }
    });
    return map;
  }, [programSchedules]);

  const uiProgram = useMemo(() => {
    if (!currentProgram) return null;

    return {
      name: currentProgram.name,
      description: currentProgram.description,
      duration: `${currentProgram.duration_weeks} สัปดาห์`,
      currentWeek: currentProgram.current_week,
      totalWeeks: currentProgram.duration_weeks,
      startDate: (currentProgram as any).start_date,
      endDate: (currentProgram as any).end_date,
      exercises: (() => {
        if (!programDetails?.days) return [];

        console.log("DEBUG: programDetails.days =", programDetails.days);
        const exercisesMap = new Map();

        programDetails.days.forEach((day: any) => {
          day.sections?.forEach((section: any) => {
            section.exercises?.forEach((ex: any) => {
              console.log("EXERCISE keys:", Object.keys(ex));
              console.log(
                "ex.name:",
                ex.name,
                "ex.exercise_name:",
                ex.exercise_name,
                "ex.exercise:",
                ex.exercise,
              );
              const exerciseName =
                ex.name || ex.exercise_name || ex.exercise || "Unknown";
              if (!exercisesMap.has(exerciseName)) {
                const distanceValStr =
                  ex.target_metadata?.distance ||
                  (ex.distance_long ? `${ex.distance_long}km` : "0km");
                const timeValStr =
                  ex.target_metadata?.duration ||
                  (ex.duration ? `${ex.duration} นาที` : "0 นาที");

                const baseExercise = {
                  name: exerciseName,
                  type: ex.type || "weight_training",
                  icon: getExerciseIcon(ex.type || "weight_training"),
                  sets: ex.sets || 0,
                  reps: ex.reps_max || ex.reps_min || 0,
                  isBodyweight: ex.is_bodyweight || false,
                };

                let combinedExercise = baseExercise as any;

                // Cardio specifics for UI display logic later
                if (baseExercise.type === "cardio") {
                  combinedExercise = {
                    ...baseExercise,
                    distance: distanceValStr,
                    currentTime: timeValStr,
                  } as any;
                } else if (baseExercise.type === "flexibility") {
                  combinedExercise = {
                    ...baseExercise,
                    duration: timeValStr,
                  } as any;
                }

                exercisesMap.set(exerciseName, combinedExercise);
              }
            });
          });
        });

        return Array.from(exercisesMap.values());
      })(),
    };
  }, [currentProgram, programDetails]);

  const uiExerciseHistory = useMemo(() => {
    if (!exerciseHistory) return [];

    return (exerciseHistory || []).map((ex) => {
      // Map native fields to FIELD_CONFIG keys — all 16 possible tracking fields
      const recordMapper = (record: any) => ({
        date: record.date,
        // --- Weight Training --- (use ?? to preserve 0 as valid value)
        weight: record.weight_kg ?? 0,
        reps: record.reps ?? 0,
        sets: record.sets ?? 0,
        rest: record.rest_seconds ?? record.rest ?? 0,
        rpe: record.max_rpe ?? record.rpe ?? 0,
        one_rm: record.one_rm ?? 0,
        rir: record.rir ?? 0,
        // --- Cardio ---
        time: record.duration_minutes ?? 0,
        speed: record.speed ?? 0,
        cadence: record.cadence ?? 0,
        distance_long: record.distance_km ?? 0,
        distance_short: record.distance_short ?? 0,
        heart_rate: record.heart_rate ?? 0,
        hr_zone: record.hr_zone ?? 0,
        watts: record.watts ?? 0,
        rpm: record.rpm ?? 0,
        rounds: record.rounds ?? 0,
        // --- Derived / Extra ---
        distance: record.distance_km ?? 0,
        duration: record.duration_minutes ?? 0,
        pace: record.pace_min_per_km ?? 0,
        calories: record.calories ?? 0,
        totalReps: record.total_reps ?? 0,
        volume: record.volume ?? 0,
      });

      // Determine tracking fields: use provided ones or defaults based on type + bodyweight
      let defaultFields: string[];
      if (ex.type === "weight_training") {
        defaultFields = ex.is_bodyweight
          ? ["reps", "sets"] // BW: no weight column
          : ["weight", "reps", "sets"]; // Equipment: show weight
      } else if (ex.type === "cardio") {
        defaultFields = ["distance_long", "time", "speed", "heart_rate"];
      } else if (ex.type === "flexibility") {
        defaultFields = ["time", "sets"];
      } else {
        defaultFields = ["reps", "sets"];
      }

      // Use trainer-configured fields or defaults
      const rawTrackingFields =
        ex.tracking_fields && ex.tracking_fields.length > 0
          ? ex.tracking_fields
          : defaultFields;

      const mappedData = (ex.history || []).map(recordMapper);

      // Only exclude non-metric fields that shouldn't appear as table columns
      const excludeFields = [
        "notes",
        "side",
        "tempo",
        "hold_time",
        "work_time",
        "rest_time",
      ];

      // Show ALL tracking fields as columns (as configured by trainer)
      const finalFields = rawTrackingFields.filter(
        (field: string) =>
          !excludeFields.includes(field) && FIELD_CONFIG[field],
      );

      return {
        exercise: ex.exercise || ex.exercise_name || "Unknown",
        type: ex.type,
        isBodyweight: ex.is_bodyweight,
        icon: getExerciseIcon(ex.type),
        trackingFields: finalFields.length > 0 ? finalFields : defaultFields,
        data: mappedData,
      };
    });
  }, [exerciseHistory]);
  // ... (Keep existing helper functions)
  // getMetricLabel removed as it is no longer used

  const renderTable = (
    selectedExerciseType: any,
    selectedExerciseData: any[],
  ) => {
    const data = selectedExerciseData;
    if (!selectedExerciseType) return null;

    const trackingFields = selectedExerciseType.trackingFields || [];

    // Universal Thai column labels for all 16 tracking fields
    const COLUMN_LABELS: Record<string, string> = {
      // Weight Training fields
      weight: "Weight",
      reps: "REPS",
      sets: "SETS",
      rest: "REST",
      rpe: "RPE",
      one_rm: "%1RM",
      rir: "RIR",
      // Cardio fields
      time: "Time",
      speed: "Speed",
      cadence: "Cadence",
      distance_long: "Dist(L)",
      distance_short: "Dist(S)",
      heart_rate: "Heart Rate",
      hr_zone: "%HR",
      watts: "Watt",
      rpm: "RPM",
      rounds: "Rounds",
      // Legacy/derived
      distance: "ระยะทาง (km)",
      duration: "เวลา",
      pace: "Pace",
      calories: "แคลอรี",
    };

    const getColumnLabel = (field: string): string => {
      return COLUMN_LABELS[field] || FIELD_CONFIG[field]?.label || field;
    };

    // Value formatting with units
    const getValue = (record: any, field: string): string => {
      const raw = record[field];
      if (raw === undefined || raw === null) return "-";

      // Time/Duration fields → format as mm:ss
      if (field === "duration" || field === "time" || field === "rest") {
        return Number(raw) > 0 ? formatMinutes(Number(raw)) : "0:00";
      }
      // Pace → format as mm:ss
      if (field === "pace") {
        return Number(raw) > 0 ? formatMinutes(Number(raw)) : "0:00";
      }
      // Weight → append kg
      if (field === "weight") {
        return Number(raw) > 0 ? `${Number(raw).toFixed(1)}` : "0";
      }
      // Distance fields → append km
      if (field === "distance" || field === "distance_long") {
        return Number(raw) > 0 ? `${Number(raw).toFixed(2)}` : "0";
      }
      if (field === "distance_short") {
        return Number(raw) > 0 ? `${Number(raw)}` : "0";
      }
      // Heart rate → bpm
      if (field === "heart_rate") {
        return Number(raw) > 0 ? `${Math.round(Number(raw))}` : "0";
      }
      // HR Zone → %
      if (field === "hr_zone") {
        return Number(raw) > 0 ? `${Number(raw)}%` : "0";
      }
      // Watts
      if (field === "watts") {
        return Number(raw) > 0 ? `${Math.round(Number(raw))}` : "0";
      }
      // Cadence / RPM
      if (field === "cadence" || field === "rpm") {
        return Number(raw) > 0 ? `${Math.round(Number(raw))}` : "0";
      }
      // Speed
      if (field === "speed") {
        return Number(raw) > 0 ? `${Number(raw).toFixed(1)}` : "0";
      }
      // 1RM percentage
      if (field === "one_rm") {
        return Number(raw) > 0 ? `${Number(raw)}%` : "0%";
      }
      // RIR
      if (field === "rir") {
        return Number(raw) > 0 ? `${Number(raw)}` : "0";
      }
      // Rounds
      if (field === "rounds") {
        return Number(raw) > 0 ? `${Number(raw)}` : "0";
      }
      // RPE
      if (field === "rpe") {
        return Number(raw) > 0 ? `${Number(raw)}` : "0";
      }

      return String(raw);
    };

    return (
      <div className="w-full overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                วันที่
              </th>
              {trackingFields.map((field: string) => (
                <th
                  key={field}
                  className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider"
                >
                  {getColumnLabel(field)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data
              .slice()
              .reverse()
              .map((record: any, idx: number) => (
                <tr key={idx} className="hover:bg-muted/50">
                  <td className="px-4 py-3 text-sm">
                    {format(parseISO(record.date), "dd MMM yyyy", {
                      locale: th,
                    })}
                  </td>
                  {trackingFields.map((field: string) => (
                    <td key={field} className="px-4 py-3 text-sm text-center">
                      {getValue(record, field)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    );
  };

  // --- Existing code: Process Weight Metrics ---
  // metricsResponse replaces local metrics prop logic
  // keeping empty useMemo to minimize churn if needed or removing entirely
  // const weightProgressData = ... (removing old logic)

  const [selectedExercise, setSelectedExercise] = useState<string>("");

  useEffect(() => {
    if (!selectedExercise && uiExerciseHistory.length > 0) {
      setSelectedExercise(uiExerciseHistory[0].exercise);
    }
  }, [uiExerciseHistory, selectedExercise]);

  const selectedExerciseData = useMemo(() => {
    return (
      uiExerciseHistory.find((e) => e.exercise === selectedExercise)?.data || []
    );
  }, [selectedExercise, uiExerciseHistory]);

  const selectedExerciseType = useMemo(() => {
    return (
      uiExerciseHistory.find((e) => e.exercise === selectedExercise) ||
      uiExerciseHistory[0]
    );
  }, [selectedExercise, uiExerciseHistory]);

  // ===================================
  // NEW: Goal-based logic
  // ===================================
  const goalConfig = GOAL_CONFIG[userGoalKey];

  // Prepare chart data by goal
  const chartDataByGoal = useMemo(() => {
    if (!metricsResponse?.metrics) return [];

    const getMetricsByType = (type: string): MetricItem[] =>
      metricsResponse.metrics[type]
        ? [...metricsResponse.metrics[type]].sort(
            (a: MetricItem, b: MetricItem) =>
              new Date(a.date).getTime() - new Date(b.date).getTime(),
          )
        : [];

    switch (userGoalKey) {
      case "weight_loss": {
        const weightData = getMetricsByType("weight");
        const bodyFatData = getMetricsByType("body_fat");

        return weightData.map((w: any) => {
          const bf = bodyFatData.find((b: any) => b.date === w.date);
          return {
            date: w.date,
            weight: w.value,
            bodyFat: bf?.value || null,
          };
        });
      }
      case "muscle_building": {
        const weightData = getMetricsByType("weight");
        const chestData = getMetricsByType("chest_circumference");
        const armData = [
          ...getMetricsByType("arm_circumference"),
          ...getMetricsByType("arm_right"),
          ...getMetricsByType("arm_left"),
        ];
        const thighData = [
          ...getMetricsByType("thigh_circumference"),
          ...getMetricsByType("thigh_right"),
          ...getMetricsByType("thigh_left"),
        ];
        const muscleData = getMetricsByType("muscle");

        // Normalize Dates
        const allDates = new Set([
          ...weightData.map((d: any) => d.date),
          ...chestData.map((d: any) => d.date),
          ...armData.map((d: any) => d.date),
          ...thighData.map((d: any) => d.date),
          ...muscleData.map((d: any) => d.date),
        ]);

        if (allDates.size > 0) {
          return Array.from(allDates)
            .sort(
              (a: any, b: any) => new Date(a).getTime() - new Date(b).getTime(),
            )
            .map((date) => {
              const w = weightData.find((d: any) => d.date === date);
              const c = chestData.find((d: any) => d.date === date);

              // Prioritize arm_circumference, then use right/left average or max
              const a = armData.filter((d: any) => d.date === date);
              const armVal =
                a.length > 0 ? Math.max(...a.map((x: any) => x.value)) : null;

              // Prioritize thigh_circumference
              const t = thighData.filter((d: any) => d.date === date);
              const thighVal =
                t.length > 0 ? Math.max(...t.map((x: any) => x.value)) : null;

              const m = muscleData.find((d: any) => d.date === date);

              return {
                date,
                weight: w?.value || null,
                chest: c?.value || null,
                arm: armVal,
                thigh: thighVal,
                muscle: m?.value || null,
              };
            });
        }

        // Fallback: Volume
        const dailyVolume = new Map<string, number>();
        exerciseHistory.forEach((ex: any) => {
          if (!ex.history || !Array.isArray(ex.history)) return;

          ex.history.forEach((record: any) => {
            const date = record.date.split("T")[0];
            const vol =
              (Number(record.sets) || 0) *
              (Number(record.reps) || 0) *
              (Number(record.weight_kg) || 0);
            if (vol > 0) {
              dailyVolume.set(date, (dailyVolume.get(date) || 0) + vol);
            }
          });
        });

        return Array.from(dailyVolume.entries())
          .map(([date, volume]) => ({
            date,
            volume: Math.round(volume),
          }))
          .sort(
            (a: any, b: any) =>
              new Date(a.date).getTime() - new Date(b.date).getTime(),
          );
      }
      // falls through to default if no return above — but we always return above.
      // Adding explicit default-safety:
      // eslint-disable-next-line no-fallthrough
      case "strength": {
        const dailyData: Record<string, any> = {};

        // 1. Manual 1RM Metrics
        // const oneRmMetrics = getMetricsByType("one_rm") || []; // Unused
        metricsResponse.metrics &&
          Object.keys(metricsResponse.metrics).forEach((key) => {
            if (key.startsWith("one_rm")) {
              metricsResponse.metrics[key].forEach((m: any) => {
                const date = m.date.split("T")[0];
                if (!dailyData[date]) dailyData[date] = { date };
                const exId = key.replace("one_rm_", "");
                const label =
                  exerciseMap.get(exId) ||
                  exerciseMap.get(key) ||
                  `Exercise #${exId}`;
                dailyData[date][label] = m.value;
              });
            }
          });

        // 2. Estimate 1RM from Session Logs (Epley Formula)
        exerciseHistory.forEach((ex: any) => {
          if (
            ex.type === "weight_training" &&
            ex.history &&
            Array.isArray(ex.history)
          ) {
            ex.history.forEach((record: any) => {
              const date = record.date.split("T")[0];
              if (!dailyData[date]) dailyData[date] = { date };

              const weight = Number(record.weight_kg) || 0;
              const reps = Number(record.reps) || 0;

              if (weight > 0 && reps > 0) {
                const estimated1RM = weight * (1 + reps / 30);

                const label = `${ex.exercise_name} (Est.)`;

                // Keep max estimate for the day
                if (
                  !dailyData[date][label] ||
                  estimated1RM > dailyData[date][label]
                ) {
                  dailyData[date][label] = Math.round(estimated1RM);
                }
              }
            });
          }
        });

        const result = Object.values(dailyData).sort(
          (a: any, b: any) =>
            new Date(a.date).getTime() - new Date(b.date).getTime(),
        );

        // If no data, return empty
        if (result.length === 0) return [];

        return result;
      }
      case "general_health": {
        const vo2Data = getMetricsByType("vo2_max");
        const hrData = getMetricsByType("resting_hr");

        return vo2Data.map((v) => {
          const hr = hrData.find((h) => h.date === v.date);
          return {
            date: v.date,
            vo2Max: v.value,
            restingHr: hr?.value || null,
          };
        });
      }
      default:
        return [];
    }
  }, [userGoalKey, metricsResponse, exerciseHistory, exerciseMap]);

  // Calculate Weekly Volume & Consistency
  const volumeByWeek = useMemo(() => {
    const weeklyData = new Map<string, any>();

    // Initialize last 12 weeks
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    const start = startOfWeek(subMonths(new Date(), 3), { weekStartsOn: 1 });

    const weeks = eachWeekOfInterval({ start, end });
    weeks.forEach((week) => {
      const weekKey = format(week, "yyyy-MM-dd");
      weeklyData.set(weekKey, {
        weekStart: weekKey,
        totalSets: 0,
        totalVolume: 0,
        sessions: 0,
      });
    });

    exerciseHistory.forEach((ex: any) => {
      if (!ex.history || !Array.isArray(ex.history)) return;

      ex.history.forEach((record: any) => {
        const date = parseISO(record.date);
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const weekKey = format(weekStart, "yyyy-MM-dd");

        if (weeklyData.has(weekKey)) {
          const data = weeklyData.get(weekKey);
          data.totalSets += Number(record.sets) || 0;
          const vol =
            (Number(record.sets) || 0) *
            (Number(record.reps) || 0) *
            (Number(record.weight_kg) || 0); // Use weight_kg from raw data
          data.totalVolume += vol;
        } else if (weekKey >= format(start, "yyyy-MM-dd")) {
          // Handle cases where data exists but initialization missed it (should cover via date range though)
          weeklyData.set(weekKey, {
            weekStart: weekKey,
            totalSets: Number(record.sets) || 0,
            totalVolume:
              (Number(record.sets) || 0) *
              (Number(record.reps) || 0) *
              (Number(record.weight_kg) || 0),
            sessions: 0,
          });
        }
      });
    });

    return Array.from(weeklyData.values()).sort(
      (a: any, b: any) =>
        new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime(),
    );
  }, [exerciseHistory]);

  // Render chart based on goal
  const renderGoalChart = () => {
    if (chartDataByGoal.length === 0) {
      return (
        <div className="text-center py-12">
          <Scale className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">ยังไม่มีข้อมูลการวัดผล</p>
          <p className="text-sm text-muted-foreground mt-1">
            เริ่มบันทึกข้อมูลเพื่อติดตามความก้าวหน้า
          </p>
        </div>
      );
    }

    switch (userGoalKey) {
      case "weight_loss":
        return (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartDataByGoal}>
              <defs>
                <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={goalConfig.chartColor}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={goalConfig.chartColor}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => format(parseISO(value), "dd/MM")}
              />
              <YAxis
                yAxisId="left"
                label={{
                  value: "Weight",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                label={{ value: "% ไขมัน", angle: 90, position: "insideRight" }}
              />
              <Tooltip
                labelFormatter={(value) =>
                  format(parseISO(value as string), "dd MMM yyyy", {
                    locale: th,
                  })
                }
              />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="weight"
                stroke={goalConfig.chartColor}
                fillOpacity={1}
                fill="url(#colorWeight)"
                name="Weight"
              />
              {chartDataByGoal.some((d: any) => d.bodyFat) && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="bodyFat"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="% ไขมัน"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        );
      case "muscle_building":
        const hasVolume = chartDataByGoal.some((d: any) => d.volume);
        const hasWeight = chartDataByGoal.some((d: any) => d.weight);
        const hasChest = chartDataByGoal.some((d: any) => d.chest);
        const hasArm = chartDataByGoal.some((d: any) => d.arm);
        const hasThigh = chartDataByGoal.some((d: any) => d.thigh);
        const hasMuscle = chartDataByGoal.some((d: any) => d.muscle);

        return (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartDataByGoal}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => format(parseISO(value), "dd/MM")}
              />
              <YAxis
                yAxisId="left"
                label={{
                  value: hasVolume ? "ปริมาณการฝึก (kg)" : "Weight",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                label={{
                  value: "รอบวง (cm)",
                  angle: 90,
                  position: "insideRight",
                }}
              />
              <Tooltip
                labelFormatter={(value) =>
                  format(parseISO(value as string), "dd MMM yyyy", {
                    locale: th,
                  })
                }
              />
              <Legend />
              {hasWeight && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="weight"
                  stroke={goalConfig.chartColor}
                  strokeWidth={2}
                  name="Weight"
                />
              )}
              {hasVolume && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="volume"
                  stroke={goalConfig.chartColor}
                  strokeWidth={2}
                  name="Total Volume (kg)"
                />
              )}
              {hasMuscle && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="muscle"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="กล้ามเนื้อ (kg)"
                />
              )}
              {hasChest && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="chest"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="รอบอก (cm)"
                />
              )}
              {hasArm && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="arm"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="รอบแขน (cm)"
                />
              )}
              {hasThigh && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="thigh"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="รอบต้นขา (cm)"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );
      case "strength": {
        // Collect all data keys except date
        const allKeys = new Set<string>();
        chartDataByGoal.forEach((d: any) =>
          Object.keys(d).forEach((k) => {
            if (k !== "date") allKeys.add(k);
          }),
        );
        const lines = Array.from(allKeys);
        const colors = ["#F59E0B", "#EF4444", "#3B82F6", "#10B981", "#8B5CF6"];

        return (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartDataByGoal}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => format(parseISO(value), "dd/MM")}
              />
              <YAxis
                label={{
                  value: "1RM (kg)",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip
                labelFormatter={(value) =>
                  format(parseISO(value as string), "dd MMM yyyy", {
                    locale: th,
                  })
                }
              />
              <Legend />
              {lines.map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key}
                  stroke={colors[idx % colors.length]}
                  strokeWidth={key.includes("Est.") ? 2 : 3}
                  strokeDasharray={key.includes("Est.") ? "5 5" : ""}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      }
      case "general_health":
        return (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartDataByGoal}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => format(parseISO(value), "dd/MM")}
              />
              <YAxis
                yAxisId="left"
                label={{ value: "VO2 Max", angle: -90, position: "insideLeft" }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                label={{
                  value: "HR (bpm)",
                  angle: 90,
                  position: "insideRight",
                }}
              />
              <Tooltip
                labelFormatter={(value) =>
                  format(parseISO(value as string), "dd MMM yyyy", {
                    locale: th,
                  })
                }
              />
              <Legend />
              {chartDataByGoal.some((d: any) => d.vo2Max) && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="vo2Max"
                  stroke={goalConfig.chartColor}
                  strokeWidth={2}
                  name="VO2 Max"
                />
              )}
              {chartDataByGoal.some((d: any) => d.restingHr) && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="restingHr"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Resting HR (bpm)"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  // Calculate progress
  const progressStats = useMemo(() => {
    if (chartDataByGoal.length < 2) return null;
    const first: any = chartDataByGoal[0];
    const last: any = chartDataByGoal[chartDataByGoal.length - 1];

    switch (userGoalKey) {
      case "weight_loss": {
        if (!first.weight || !last.weight) return null;
        const weightChange = first.weight - last.weight; // positive = lost weight
        return {
          value: weightChange.toFixed(1),
          label: "น้ำหนักที่ลดไป",
          unit: "kg",
          percentage: ((weightChange / first.weight) * 100).toFixed(1),
        };
      }
      case "muscle_building":
        if (first.weight && last.weight) {
          return {
            value: (last.weight - first.weight).toFixed(1),
            label: "น้ำหนักที่เพิ่มขึ้น",
            unit: "kg",
            percentage: (
              ((last.weight - first.weight) / first.weight) *
              100
            ).toFixed(1),
          };
        }
        if (first.volume && last.volume) {
          return {
            value: (last.volume - first.volume).toFixed(0),
            label: "Volume ที่เพิ่มขึ้น",
            unit: "kg",
            percentage: (
              ((last.volume - first.volume) / first.volume) *
              100
            ).toFixed(1),
          };
        }
        return null;
      case "strength": {
        // Strength chart uses dynamic exercise-name keys (not a fixed "oneRm" field).
        // Find the first numeric key to compute progress.
        const numericKeys = Object.keys(first).filter(
          (k) => k !== "date" && typeof first[k] === "number",
        );
        if (numericKeys.length === 0) return null;
        const primaryKey = numericKeys[0];
        const firstVal = first[primaryKey];
        const lastVal = last[primaryKey];
        if (!firstVal || !lastVal) return null;
        return {
          value: lastVal.toFixed(1),
          label: `1RM ล่าสุด (${primaryKey})`,
          unit: "kg",
          percentage: (((lastVal - firstVal) / firstVal) * 100).toFixed(1),
        };
      }
      case "general_health":
        if (!last.vo2Max) return null;
        return {
          value: last.vo2Max.toFixed(1),
          label: "VO2 Max ล่าสุด",
          unit: "",
          percentage:
            first.vo2Max && last.vo2Max
              ? (((last.vo2Max - first.vo2Max) / first.vo2Max) * 100).toFixed(1)
              : "0",
        };
      default:
        return null;
    }
  }, [chartDataByGoal, userGoalKey]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          ความก้าวหน้าของฉัน
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          ติดตามความก้าวหน้าและสถิติการฝึกของคุณ
        </p>
      </div>

      <div className="space-y-6">
        <Tabs defaultValue="program" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="program">โปรแกรมปัจจุบัน</TabsTrigger>
            <TabsTrigger value="progress">กราฟความก้าวหน้า</TabsTrigger>
          </TabsList>

          {/* ===== TAB: โปรแกรมปัจจุบัน ===== */}
          <TabsContent value="program" className="space-y-6">
            {/* Program Details */}
            {loadingProgram ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
                <p className="text-slate-500">กำลังโหลดโปรแกรม...</p>
              </div>
            ) : error ? (
              <div className="p-12 text-center text-red-500">
                <p>{error}</p>
              </div>
            ) : uiProgram ? (
              <div className="grid grid-cols-1 gap-6">
                {/* 1. Current Program Info */}
                <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden ring-1 ring-slate-100">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100/50 pb-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2 mb-1.5 text-xl text-blue-900">
                          <Dumbbell className="h-5 w-5" />
                          {uiProgram.name}
                        </CardTitle>
                        <CardDescription className="text-blue-600/80">
                          {uiProgram.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5 flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">ระยะเวลา</p>
                        <p className="font-medium">{uiProgram.duration}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">สถานะ</p>
                        {isProgramCompleted ? (
                          <Badge className="bg-slate-100 text-slate-700 border-0">
                            เสร็จสิ้นแล้ว
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 border-0">
                            กำลังใช้งาน
                          </Badge>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">
                          สัปดาห์ปัจจุบัน
                        </p>
                        <p className="font-medium">
                          สัปดาห์ที่ {uiProgram.currentWeek}
                        </p>
                      </div>
                    </div>

                    {(uiProgram.startDate || uiProgram.endDate) && (
                      <div className="flex items-center gap-2 mt-2 pt-3 border-t border-slate-100 text-sm text-slate-600">
                        <Calendar className="h-4 w-4 text-[#002140]" />
                        <span>
                          {uiProgram.startDate
                            ? `เริ่ม: ${new Date(uiProgram.startDate).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}`
                            : ""}
                          {uiProgram.startDate && uiProgram.endDate
                            ? " → "
                            : ""}
                          {uiProgram.endDate
                            ? `สิ้นสุด: ${new Date(uiProgram.endDate).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}`
                            : ""}
                        </span>
                      </div>
                    )}

                    {/* Stats Grid (Achievements) */}
                    {programStats &&
                      programStats?.achievements_this_period &&
                      programStats.achievements_this_period.length > 0 && (
                        <div className="mt-2 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                          <div className="flex items-center gap-2 mb-3">
                            <Award className="w-5 h-5 text-yellow-600" />
                            <h4 className="font-semibold text-yellow-800">
                              ความสำเร็จในช่วงนี้
                            </h4>
                          </div>
                          <div className="space-y-2">
                            {programStats.achievements_this_period.map(
                              (achievement, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2"
                                >
                                  <Badge
                                    variant="secondary"
                                    className="mt-0.5 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200"
                                  >
                                    {achievement.type === "personal_record"
                                      ? "🏆 PR"
                                      : "⭐ Milestone"}
                                  </Badge>
                                  <div>
                                    <p className="text-sm font-medium text-yellow-900">
                                      {achievement.description}
                                    </p>
                                    {achievement.exercise && (
                                      <p className="text-xs text-yellow-700">
                                        {achievement.exercise}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                  </CardContent>
                </Card>

                {/* 2. Program Progress */}
                <Card className="border-none shadow-sm rounded-2xl bg-white ring-1 ring-slate-100">
                  <CardHeader className="pb-3">
                    <CardTitle>ความก้าวหน้าโปรแกรม</CardTitle>
                    <CardDescription>
                      ติดตามความก้าวหน้าตามโปรแกรมที่กำหนด
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">
                          ความก้าวหน้าโดยรวม
                        </p>
                        <p className="text-sm text-gray-600">
                          {programProgress.percentage}%
                        </p>
                      </div>
                      <Progress
                        value={programProgress.percentage}
                        className="h-2"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-2">
                          การฝึกที่เสร็จสิ้น
                        </p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold">
                            {programProgress.completed}
                          </span>
                          <span className="text-sm text-gray-400">
                            / {programProgress.total}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">เซสชันทั้งหมด</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-2">
                          อัตราการเข้าร่วม
                        </p>
                        <div className="text-2xl font-bold">
                          {programProgress.adherence}%
                        </div>
                        <p className="text-xs text-gray-500">
                          จากเซสชันที่ผ่านมา
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 3. Program Structure */}
                {structuredWeeks.length > 0 && (
                  <Card className="border-none shadow-sm rounded-2xl bg-white ring-1 ring-slate-100">
                    <CardHeader className="pb-3">
                      <CardTitle>โครงสร้างโปรแกรม</CardTitle>
                      <CardDescription>
                        รายละเอียดการฝึกรายสัปดาห์
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {structuredWeeks.slice(0, 2).map((week: any) => (
                          <div
                            key={week.weekNumber}
                            className="border border-slate-100 rounded-xl p-4 md:p-5 bg-white shadow-sm"
                          >
                            <h4 className="font-bold text-navy-900 mb-4 flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-navy-50 flex items-center justify-center">
                                <Calendar className="h-4 w-4 text-navy-600" />
                              </div>
                              สัปดาห์ที่ {week.weekNumber}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {week.days.map((day: any) => {
                                const schedule = day.dayId
                                  ? dayScheduleMap[day.dayId]
                                  : null;
                                return (
                                  <div
                                    key={day.dayNumber}
                                    className="border border-slate-100 rounded-xl p-3 md:p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                                  >
                                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                                      <div>
                                        <div className="font-semibold text-sm text-navy-900">
                                          วันที่ {day.dayNumber}: {day.name}
                                        </div>
                                        {schedule && (
                                          <div className="flex items-center gap-1 mt-0.5">
                                            <Calendar className="h-3 w-3 text-slate-400" />
                                            <span className="text-[10px] text-slate-500">
                                              {new Date(
                                                schedule.start_time,
                                              ).toLocaleDateString("th-TH", {
                                                weekday: "short",
                                                day: "numeric",
                                                month: "short",
                                              })}
                                            </span>
                                            {schedule.status ===
                                              "completed" && (
                                              <span className="text-[9px] text-green-600 font-medium">
                                                ✓
                                              </span>
                                            )}
                                            {schedule.status ===
                                              "cancelled" && (
                                              <span className="text-[9px] text-red-500 font-medium">
                                                ยกเลิก
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-[10px] font-bold text-navy-600 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center justify-center shadow-sm">
                                        {day.exercises?.length || 0} ท่า
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      {day.exercises &&
                                      day.exercises.length > 0 ? (
                                        <>
                                          {day.exercises
                                            .slice(0, 3)
                                            .map(
                                              (exercise: any, idx: number) => (
                                                <div
                                                  key={idx}
                                                  className="text-[11px] flex items-center gap-1.5 text-gray-700 font-medium"
                                                >
                                                  <Dumbbell className="h-3.5 w-3.5 text-navy-600 shrink-0" />
                                                  <span className="truncate">
                                                    {exercise.exercise_name ||
                                                      `Exercise ${idx + 1}`}
                                                  </span>
                                                </div>
                                              ),
                                            )}
                                          {day.exercises.length > 3 && (
                                            <div className="text-[10px] text-gray-400 italic mt-1 ml-5">
                                              และอีก {day.exercises.length - 3}{" "}
                                              ท่า...
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <div className="text-xs text-muted-foreground italic">
                                          {day.isRest
                                            ? "วันพัก"
                                            : "ไม่มีท่าฝึก"}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        {structuredWeeks.length > 2 && (
                          <div className="text-center py-4">
                            <p className="text-gray-500 text-sm">
                              และอีก {structuredWeeks.length - 2} สัปดาห์...
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 4. Exercises List (Now a separate Card) */}
                <Card className="border-none shadow-sm rounded-2xl bg-white ring-1 ring-slate-100">
                  <CardHeader className="pb-3 border-b border-slate-100/50">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Dumbbell className="h-5 w-5 text-blue-500" />
                      รายการท่าออกกำลังกายโปรแกรมปัจจุบัน
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="divide-y divide-slate-100">
                      {uiProgram.exercises.map((exercise, idx) => {
                        const ExerciseIcon = exercise.icon;
                        const config = getTypeConfig(exercise.type);

                        return (
                          <div
                            key={idx}
                            className="py-3 hover:bg-slate-50 transition-colors flex items-center justify-between group rounded-lg px-2 -mx-2"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-2 rounded-lg ${config.bgColor} group-hover:scale-105 transition-transform duration-300`}
                              >
                                <ExerciseIcon
                                  className={`h-4 w-4 ${config.color}`}
                                />
                              </div>
                              <div>
                                <h4 className="font-medium text-sm text-slate-700">
                                  {exercise.name}
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge
                                    variant="secondary"
                                    className={`text-[10px] h-4 px-1.5 ${config.badgeColor} border-none`}
                                  >
                                    {config.label}
                                  </Badge>
                                  {exercise.type === "weight_training" && (
                                    <span className="text-xs text-slate-500">
                                      {exercise.sets} เซต
                                    </span>
                                  )}
                                  {exercise.type === "cardio" && (
                                    <span className="text-xs text-slate-500">
                                      {exercise.sets} เซต ×{" "}
                                      {(exercise as any).distance &&
                                      (exercise as any).distance !== "0km"
                                        ? (exercise as any).distance
                                        : (exercise as any).currentTime || "-"}
                                    </span>
                                  )}
                                  {exercise.type === "flexibility" && (
                                    <span className="text-xs text-slate-500">
                                      {exercise.sets} เซต ×{" "}
                                      {(exercise as any).duration || "-"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                ไม่พบข้อมูลโปรแกรม
              </div>
            )}

            {/* ประวัติท่าออกกำลังกาย */}
            <Card>
              <CardHeader>
                <CardTitle>ประวัติท่าออกกำลังกาย</CardTitle>
                <CardDescription>ดูความก้าวหน้าในแต่ละท่า</CardDescription>
              </CardHeader>
              <CardContent>
                {uiExerciseHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                    <div className="p-4 rounded-full bg-slate-50">
                      <Dumbbell className="w-8 h-8 text-slate-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium text-slate-900">
                        ยังไม่มีข้อมูลประวัติการออกกำลังกาย
                      </h3>
                      <p className="text-sm text-slate-500 max-w-sm mx-auto">
                        เทรนเนอร์ยังไม่ได้บันทึกข้อมูลการฝึกของคุณลงในระบบ
                        ข้อมูลจะปรากฏที่นี่เมื่อมีการบันทึกผลการฝึกเสร็จสิ้น
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <label
                        htmlFor="exercise-select"
                        className="block text-sm font-medium mb-2"
                      >
                        เลือกท่าออกกำลังกาย
                      </label>
                      <Select
                        value={selectedExercise}
                        onValueChange={setSelectedExercise}
                      >
                        <SelectTrigger className="w-full md:w-96">
                          <SelectValue placeholder="เลือกท่าออกกำลังกาย" />
                        </SelectTrigger>
                        <SelectContent>
                          {uiExerciseHistory.map((exercise) => {
                            const config = getTypeConfig(exercise.type);
                            const Icon = exercise.icon;
                            return (
                              <SelectItem
                                key={exercise.exercise}
                                value={exercise.exercise}
                                className="cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  {Icon && (
                                    <Icon
                                      className={`w-4 h-4 ${config.color}`}
                                    />
                                  )}
                                  <span>{exercise.exercise}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="mt-6">
                      <h4 className="font-semibold mb-3">
                        ประวัติการฝึก - {selectedExercise}
                      </h4>
                      <div className="border rounded-lg overflow-hidden overflow-x-auto">
                        {renderTable(
                          selectedExerciseType,
                          selectedExerciseData,
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== TAB 2: Goal-Based Progress ===== */}
          <TabsContent value="progress" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const Icon = goalConfig.icon;
                      return <Icon className={`w-6 h-6 ${goalConfig.color}`} />;
                    })()}
                    <div>
                      <CardTitle className="text-xl">
                        กราฟความก้าวหน้า - {goalConfig.label}
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {goalConfig.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    className={`${goalConfig.bgColor} ${goalConfig.color} border-0`}
                  >
                    {goalConfig.labelEn}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Progress Stats Summary */}
                {progressStats && (
                  <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
                    <div className="p-4 border rounded-lg bg-accent/10">
                      <p className="text-xs text-muted-foreground">
                        {progressStats.label}
                      </p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span
                          className={`text-2xl font-bold ${
                            userGoalKey === "weight_loss"
                              ? parseFloat(progressStats.value) < 0
                                ? "text-green-600"
                                : "text-red-600"
                              : parseFloat(progressStats.value) > 0
                                ? "text-green-600"
                                : "text-foreground"
                          }`}
                        >
                          {parseFloat(progressStats.value) > 0 ? "+" : ""}
                          {progressStats.value}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {progressStats.unit}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-accent/10">
                      <p className="text-xs text-muted-foreground">
                        การเปลี่ยนแปลง (%)
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {parseFloat(progressStats.percentage) !== 0 ? (
                          parseFloat(progressStats.percentage) > 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          )
                        ) : (
                          <Activity className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="text-2xl font-bold">
                          {Math.abs(parseFloat(progressStats.percentage))}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Main Chart Area */}
                <div className="min-h-[350px] w-full">{renderGoalChart()}</div>
              </CardContent>
            </Card>

            {/* Volume & Consistency Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-indigo-50 dark:bg-indigo-950/20">
                    <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      ความสม่ำเสมอในการฝึก
                    </CardTitle>
                    <CardDescription>
                      ปริมาณ Sets และ Volume รายสัปดาห์
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {volumeByWeek.length > 0 ? (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={volumeByWeek}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#f0f0f0"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="weekStart"
                          tickFormatter={(val) =>
                            format(parseISO(val), "d MMM")
                          }
                          tick={{ fontSize: 12 }}
                          stroke="#6b7280"
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fontSize: 12 }}
                          stroke="#6b7280"
                          axisLine={false}
                          tickLine={false}
                          label={{
                            value: "Sets",
                            angle: -90,
                            position: "insideLeft",
                          }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 12 }}
                          stroke="#6b7280"
                          axisLine={false}
                          tickLine={false}
                          label={{
                            value: "Volume (kg)",
                            angle: 90,
                            position: "insideRight",
                          }}
                        />
                        <Tooltip
                          cursor={{ fill: "#f8fafc" }}
                          labelFormatter={(value) =>
                            format(parseISO(value as string), "dd MMM yyyy", {
                              locale: th,
                            })
                          }
                        />
                        <Legend />
                        <Bar
                          yAxisId="left"
                          dataKey="totalSets"
                          name="จำนวนเซ็ต (Sets)"
                          fill="#8B5CF6"
                          radius={[4, 4, 0, 0]}
                          barSize={20}
                        />
                        <Bar
                          yAxisId="right"
                          dataKey="totalVolume"
                          name="Total Volume (kg)"
                          fill="#3B82F6"
                          radius={[4, 4, 0, 0]}
                          barSize={20}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-400 bg-slate-50 rounded-lg">
                    <div className="text-center">
                      <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>ยังไม่มีข้อมูลการฝึก</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
