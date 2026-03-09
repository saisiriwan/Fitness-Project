import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Circle,
  User,
  Dumbbell,
  FileText,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  BookOpen,
  Trash2,
  MoreHorizontal,
  Activity,
  Loader2,
  Edit,
  Flame,
  Target,
  Wind,
  Settings,
  Search,
  X,
  Repeat,
  SlidersHorizontal,
  Calendar,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import SessionSummaryCard from "./SessionSummaryCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import api from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { KEY_MAP, normalizeTrackingFieldKey } from "@/types/exercise";

const FIELD_CONFIG: Record<
  string,
  { label: string; placeholder: string; type: string }
> = {
  reps: { label: "REPS", placeholder: "10", type: "number" },
  weight: { label: "WEIGHT", placeholder: "0", type: "number" },
  distance: { label: "Dist", placeholder: "0", type: "text" },
  pace: { label: "Pace", placeholder: "6:00", type: "text" },
  duration: { label: "Dur", placeholder: "0", type: "text" },
  hold_time: { label: "Hold", placeholder: "30", type: "text" },
  tempo: { label: "Tempo", placeholder: "3-1-1", type: "text" },
  rest: { label: "REST", placeholder: "00:00", type: "text" },
  rpe: { label: "RPE", placeholder: "1-10", type: "number" },
  side: { label: "Side", placeholder: "L/R", type: "text" },
  time: { label: "Time", placeholder: "00:00", type: "text" },
  speed: { label: "Speed", placeholder: "0", type: "number" },
  cadence: { label: "Cadence", placeholder: "0", type: "number" },
  distance_long: { label: "Dist(L)", placeholder: "0", type: "number" },
  distance_short: { label: "Dist(S)", placeholder: "0", type: "number" },
  one_rm: { label: "%1RM", placeholder: "0", type: "number" },
  rir: { label: "RIR", placeholder: "0", type: "number" },
  heart_rate: { label: "Heart Rate", placeholder: "0", type: "number" },
  hr_zone: { label: "%HR", placeholder: "0", type: "number" },
  watts: { label: "Watts", placeholder: "0", type: "number" },
  rpm: { label: "RPM", placeholder: "0", type: "number" },
  rounds: { label: "Rounds", placeholder: "0", type: "number" },
};

// Fields ที่ backend อาจส่งมาเป็น direct field บน set (array หรือ scalar)
const ADVANCED_FIELDS = [
  "time",
  "speed",
  "cadence",
  "distance_long",
  "distance_short",
  "one_rm",
  "rir",
  "heart_rate",
  "hr_zone",
  "watts",
  "rpm",
  "rounds",
  "tempo",
  "hold_time",
  "side",
  "pace",
  "duration",
  "distance",
];

// Fields ที่เป็น time-seconds
const TIME_FIELDS = ["time", "duration", "hold_time"];

// KEY_MAP and normalizeTrackingFieldKey have been moved to @/types/exercise

const SECTION_TYPES = [
  { value: "warmup", label: "Warm-up", icon: Flame, color: "text-orange-500" },
  { value: "main", label: "Main Work", icon: Dumbbell, color: "text-blue-500" },
  { value: "skill", label: "Skill", icon: Target, color: "text-purple-500" },
  {
    value: "cooldown",
    label: "Cool-down",
    icon: Wind,
    color: "text-green-500",
  },
  { value: "custom", label: "Custom", icon: Settings, color: "text-gray-500" },
];

interface ExerciseSet {
  id?: number;
  setNumber: number;
  reps: number;
  weight: number;
  rpe?: number;
  completed: boolean;
  duration?: number;
  distance?: number;
  restDuration?: number;
  targetReps?: number;
  targetWeight?: number;
  targetRPE?: number;
  targetDuration?: number;
  targetDistance?: number;
  targetMetadata?: Record<string, any>;
  actualMetadata?: Record<string, any>;
  [key: string]: any; // allow dynamic keys from spread
}

interface SessionExercise {
  id?: number;
  exerciseId: string | number;
  name: string;
  category?: string;
  sets: ExerciseSet[];
  notes: string;
  completed: boolean;
  sectionName?: string;
  sectionOrder?: number;
  trackingFields?: string[];
}

interface SessionData {
  id: number;
  title?: string;
  status: string;
  start_time?: string;
  date?: string;
  notes?: string;
  rating?: number;
  feedback?: string;
  client_id?: number;
  logs?: any[];
}

interface ClientData {
  id: number;
  name: string;
  description?: string;
}

interface AvailableExercise {
  id: number;
  name: string;
  category?: string;
  tracking_fields?: string[];
}

export default function SessionLog() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from;

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<ClientData | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [availableExercises, setAvailableExercises] = useState<
    AvailableExercise[]
  >([]);
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>(
    [],
  );
  const [sessionNotes, setSessionNotes] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [expandedExercises, setExpandedExercises] = useState<Set<number>>(
    new Set([0]),
  );
  const [showExerciseDialog, setShowExerciseDialog] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [exerciseSets, setExerciseSets] = useState(3);
  const [exerciseReps, setExerciseReps] = useState(10);
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState("");
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showSummaryCard, setShowSummaryCard] = useState(false);
  const [sessionRating, setSessionRating] = useState(0);
  const [sessionComment, setSessionComment] = useState("");
  const [sessionNextGoals, setSessionNextGoals] = useState("");

  // --- Add Section Modal States ---
  // --- Add Section Modal States ---
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [showSectionExercisePicker, setShowSectionExercisePicker] =
    useState(false);
  const [sectionExerciseSearchTerm, setSectionExerciseSearchTerm] =
    useState("");
  const [newSection, setNewSection] = useState<any>({
    sectionType: "warmup",
    sectionFormat: "regular",
    name: "",
    duration: 10,
    rounds: 3,
    workTime: 30,
    restTime: 15,
    exercises: [],
    notes: "",
  });
  const [newSectionExercises, setNewSectionExercises] = useState<
    {
      exerciseId: string;
      trackingFields?: string[];
      sets: any[];
    }[]
  >([]);
  const [swapExerciseIndex, setSwapExerciseIndex] = useState<number | null>(
    null,
  );

  // --- Day Navigation States ---
  const [siblingsSessions, setSiblingsSessions] = useState<
    {
      id: number;
      title: string;
      status: string;
      start_time: string;
      program_day_id: number | null;
    }[]
  >([]);
  const [programInfo, setProgramInfo] = useState<{
    id: number;
    name: string;
    start_date: string | null;
    end_date: string | null;
    duration_weeks: number;
  } | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const { lastMessage } = useWebSocket();

  const fetchSession = useCallback(async () => {
    if (!id) return;
    try {
      const response = await api.get(`/sessions/${id}`);
      const data = response.data;

      setSessionData(data);
      setSessionDate(data.start_time || data.date || new Date().toISOString());
      setSessionNotes(data.notes || "");
      setSessionRating(data.rating || 0);

      if (data.feedback) {
        if (data.feedback.includes("Comment:")) {
          const parts = data.feedback.split("\nNext Goals: ");
          setSessionComment(parts[0].replace("Comment: ", "").trim());
          if (parts.length > 1) setSessionNextGoals(parts[1].trim());
        } else {
          setSessionComment(data.feedback);
        }
      }

      if (data.client_id) {
        try {
          const clientRes = await api.get(`/clients/${data.client_id}`);
          setClient(clientRes.data);
        } catch (e) {
          console.warn("Could not fetch client", e);
        }
      }

      try {
        const exRes = await api.get("/exercises");
        setAvailableExercises(exRes.data);
      } catch (e) {
        console.warn("Could not fetch exercises list", e);
      }

      // Fetch sibling sessions + program info for Day Navigation
      if (data.program_id) {
        try {
          const schedulesRes = await api.get("/schedules");
          const siblings = (schedulesRes.data || [])
            .filter((s: any) => s.program_id === data.program_id)
            .sort(
              (a: any, b: any) =>
                new Date(a.start_time).getTime() -
                new Date(b.start_time).getTime(),
            );
          setSiblingsSessions(siblings);
        } catch (e) {
          console.warn("Could not fetch sibling sessions", e);
        }
        try {
          const progRes = await api.get(`/programs/${data.program_id}`);
          setProgramInfo(progRes.data);
        } catch (e) {
          console.warn("Could not fetch program info", e);
        }
      }

      const mappedExercises: SessionExercise[] = (data.logs || []).map(
        (log: any) => ({
          id: log.id,
          exerciseId: log.exercise_id || log.id,
          name: log.exercise_name || "Unknown Exercise",
          category: log.category || "General",
          notes: log.notes || "",
          completed: false,
          sectionName: log.section_name,
          sectionOrder: log.section_order,
          trackingFields: (log.tracking_fields || []).map((f: string) =>
            normalizeTrackingFieldKey(f),
          ),

          sets: (log.sets || []).map((s: any, setIdx: number) => {
            /* Helper: pickVal — รับ Array/comma-string แล้วแตก index (สำหรับค่า per-set) */
            const pickVal = (v: any): any => {
              if (v === undefined || v === null) return undefined;
              if (Array.isArray(v))
                return v[setIdx] !== undefined ? v[setIdx] : v[v.length - 1];
              if (typeof v === "string" && v.includes(",")) {
                const parts = v.split(",").map((p) => p.trim());
                return parts[setIdx] !== undefined
                  ? parts[setIdx]
                  : parts[parts.length - 1];
              }
              return v;
            };

            // 1. Direct fields บน s (backend อาจส่ง time/speed/rir ฯลฯ เป็น Array หรือ scalar)
            const directVals: Record<string, any> = {};
            for (const key of ADVANCED_FIELDS) {
              // ✅ แก้ตรงนี้: ให้ลองดึงค่า s[key] (ปกติ) หรือ s[key.toLowerCase()] (ตัวพิมพ์เล็ก)
              const valRaw = (s as any)[key] || (s as any)[key.toLowerCase()];
              if (valRaw !== undefined && valRaw !== null) {
                const val = pickVal(valRaw);
                if (val !== undefined && val !== null) directVals[key] = val;
              }
            }

            // 2. planned_metadata per-set (อาจเป็น null จาก backend)
            const perSetPlanned: Record<string, any> = {};
            for (const key of Object.keys(s.planned_metadata || {})) {
              const val = pickVal(s.planned_metadata[key]);
              if (val !== undefined && val !== null) perSetPlanned[key] = val;
            }

            // 3. actual_metadata per-set (อาจเป็น null จาก backend)
            const perSetActual: Record<string, any> = {};
            for (const key of Object.keys(s.actual_metadata || {})) {
              const val = pickVal(s.actual_metadata[key]);
              if (val !== undefined && val !== null) perSetActual[key] = val;
            }

            // ✅ KEY FIX: Backend เก็บ time ใน planned_duration_seconds (ไม่ใช่ metadata)
            // planned_metadata = null → ต้องอ่านจาก named fields โดยตรง
            const actualDurationSec =
              s.actual_duration_seconds && s.actual_duration_seconds > 0
                ? s.actual_duration_seconds
                : undefined;
            const plannedDurationSec =
              s.planned_duration_seconds && s.planned_duration_seconds > 0
                ? s.planned_duration_seconds
                : undefined;

            // time = actual ก่อน, ถ้าไม่มีใช้ planned (pre-fill)
            const timeVal = actualDurationSec ?? plannedDurationSec;
            // rest = rest_duration_seconds
            const restVal = s.rest_duration_seconds ?? 0;

            // Merge: actual > planned > direct
            const merged: Record<string, any> = {
              ...directVals,
              ...perSetPlanned,
              ...perSetActual,
            };

            // ✅ KEY FIX: Use metadata value if available, else fallback to timeVal
            const finalTime =
              merged.time && merged.time !== "0" ? merged.time : timeVal;
            const finalDuration =
              merged.duration ?? actualDurationSec ?? plannedDurationSec;

            // targetMetadata สำหรับ placeholder — รวม planned named fields ด้วย
            const targetMetadata: Record<string, any> = {
              ...directVals,
              ...perSetPlanned,
            };
            if (plannedDurationSec) targetMetadata.time = plannedDurationSec;
            if (restVal) targetMetadata.rest = restVal;

            return {
              id: s.id,
              setNumber: s.set_number,
              reps:
                s.actual_reps && s.actual_reps > 0
                  ? s.actual_reps
                  : (pickVal(s.planned_reps) ?? 0),
              weight:
                s.actual_weight_kg && s.actual_weight_kg > 0
                  ? s.actual_weight_kg
                  : (pickVal(s.planned_weight_kg) ?? 0),
              rpe:
                s.actual_rpe && s.actual_rpe > 0
                  ? s.actual_rpe
                  : (pickVal(s.planned_rpe) ?? 0),

              ...merged,

              // ✅ Explicit: map named backend fields → display fields
              time: finalTime, // planned_duration_seconds → time column
              duration: finalDuration,
              distance:
                merged.distance ??
                (s.actual_distance && s.actual_distance > 0
                  ? s.actual_distance
                  : s.planned_distance || undefined),
              restDuration: restVal,
              rest: restVal, // sync

              completed: s.completed || false,

              targetReps: pickVal(s.planned_reps) ?? 0,
              targetWeight: pickVal(s.planned_weight_kg) ?? 0,
              targetRPE: pickVal(s.planned_rpe) ?? 0,
              targetDuration: plannedDurationSec ?? 0,
              targetDistance: pickVal(s.planned_distance) ?? 0,

              targetMetadata,
              actualMetadata: perSetActual,
            } as ExerciseSet;
          }),
        }),
      );

      mappedExercises.forEach((ex) => {
        ex.completed = ex.sets.length > 0 && ex.sets.every((s) => s.completed);
      });

      setSessionExercises(mappedExercises);
    } catch (err) {
      console.error(err);
      toast.error("ไม่สามารถโหลดข้อมูลเซสชันได้");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSession();
  }, [id]);

  useEffect(() => {
    if (
      lastMessage?.type === "SESSION_UPDATE" &&
      lastMessage.sessionId === Number(id)
    ) {
      fetchSession();
    }
  }, [lastMessage, id]);

  const isCompleted = sessionData?.status === "completed";
  const completedExercisesCount = sessionExercises.filter(
    (ex) => ex.completed,
  ).length;

  /* Helper: formatDate — แปลงวันที่เป็น ภาษาไทย */
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        full: date.toLocaleDateString("th-TH", {
          day: "numeric",
          month: "long",
          year: "numeric",
          weekday: "long",
        }),
        time: date.toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      };
    } catch {
      return { full: "-", time: "-" };
    }
  };

  /* ฟังก์ชัน: toggleExercise — เปิด/ปิดการแสดงท่า (expand/collapse) */
  const toggleExercise = (idx: number) => {
    setExpandedExercises((prev) => {
      const s = new Set(prev);
      s.has(idx) ? s.delete(idx) : s.add(idx);
      return s;
    });
  };

  /* Helper: formatDuration — แปลงวินาที → mm:ss */
  const formatDuration = (seconds?: number | string): string => {
    if (seconds === undefined || seconds === null || seconds === "") return "";
    // ถ้าเป็น string แบบ "12:22" แล้ว return เลย
    if (typeof seconds === "string" && seconds.includes(":")) return seconds;
    const num = Number(seconds);
    if (isNaN(num) || num <= 0) return "";
    const m = Math.floor(num / 60);
    const s = num % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  /* Helper: parseDuration — แปลง mm:ss → วินาที */
  const parseDuration = (str: string): number => {
    if (!str) return 0;
    if (str.includes(":")) {
      const [m, s] = str.split(":");
      return (parseInt(m) || 0) * 60 + (parseInt(s) || 0);
    }
    return parseInt(str) || 0;
  };

  /* Helper: getSetDisplayValue — อ่านค่าจาก set สำหรับแสดงผล (รองรับหลาย field types) */
  const getSetDisplayValue = (
    set: ExerciseSet,
    field: string,
  ): string | number => {
    const backendKey = KEY_MAP[field] || field;
    const isTimeField = TIME_FIELDS.includes(field);

    // Priority: direct prop → actualMetadata → targetMetadata
    const lowerCaseKey = field.toLowerCase();
    const lowerCaseBackendKey = backendKey.toLowerCase();

    const candidates = [
      (set as any)[field],
      (set as any)[backendKey],
      (set as any)[lowerCaseKey],
      (set as any)[lowerCaseBackendKey],
      set.actualMetadata?.[field],
      set.actualMetadata?.[backendKey],
      set.actualMetadata?.[lowerCaseKey],
      set.targetMetadata?.[field],
      set.targetMetadata?.[backendKey],
      set.targetMetadata?.[lowerCaseKey],
    ];

    let raw: any = undefined;
    for (const c of candidates) {
      // ยอมรับค่า 0 เฉพาะ non-time field (0 วินาที = ไม่แสดง)
      if (c !== undefined && c !== null && c !== "") {
        if (isTimeField && c === 0) continue; // 0 วินาที = ว่าง
        raw = c;
        break;
      }
    }

    if (raw === undefined || raw === null || raw === "") return "";

    if (isTimeField) {
      return formatDuration(raw);
    }

    return raw;
  };

  /* ฟังก์ชัน: updateSetValue — อัปเดตค่า field ของ set (เช่น reps, weight, duration ฯลฯ) */
  const updateSetValue = (
    exerciseIdx: number,
    setIdx: number,
    field: string,
    value: string,
  ) => {
    setSessionExercises((prev) => {
      const updated = [...prev];
      const exercise = { ...updated[exerciseIdx] };
      exercise.sets = [...exercise.sets];
      const set = { ...exercise.sets[setIdx] };
      const config = FIELD_CONFIG[field];
      const isNumber = config?.type === "number";
      const numValue = isNumber ? parseFloat(value) || 0 : value;

      if (field === "reps") set.reps = Number(numValue);
      else if (field === "weight") set.weight = Number(numValue);
      else if (field === "rpe") set.rpe = Number(numValue);
      else if (field === "duration") set.duration = parseDuration(value);
      else if (field === "distance") set.distance = Number(numValue);
      else if (field === "rest" || field === "restDuration") {
        set.restDuration = parseDuration(value);
        set.rest = parseDuration(value); // sync direct prop
      } else {
        if (!set.actualMetadata) set.actualMetadata = {};
        const backendKey = KEY_MAP[field] || field;
        set.actualMetadata[backendKey] = numValue;
        (set as any)[field] = numValue;
        if (backendKey !== field) (set as any)[backendKey] = numValue;
      }

      exercise.sets[setIdx] = set;
      updated[exerciseIdx] = exercise;
      return updated;
    });
  };

  /* ฟังก์ชัน: toggleSetCompleted — toggle สถานะ completed ของ set */
  const toggleSetCompleted = (exerciseIdx: number, setIdx: number) => {
    setSessionExercises((prev) => {
      const updated = [...prev];
      const exercise = { ...updated[exerciseIdx] };
      exercise.sets = [...exercise.sets];
      exercise.sets[setIdx] = {
        ...exercise.sets[setIdx],
        completed: !exercise.sets[setIdx].completed,
      };
      exercise.completed = exercise.sets.every((s) => s.completed);
      updated[exerciseIdx] = exercise;
      return updated;
    });
  };

  /* ฟังก์ชัน: toggleExerciseCompleted — toggle สถานะ completed ของท่าทั้งหมด + ทุก set */
  const toggleExerciseCompleted = (exerciseIdx: number) => {
    setSessionExercises((prev) => {
      const updated = [...prev];
      const exercise = { ...updated[exerciseIdx] };
      const newState = !exercise.completed;
      exercise.completed = newState;
      exercise.sets = exercise.sets.map((set) => ({
        ...set,
        completed: newState,
      }));
      updated[exerciseIdx] = exercise;
      return updated;
    });
  };

  /* ฟังก์ชัน: updateExerciseNotes — อัปเดตโน้ตของท่า */
  const updateExerciseNotes = (exerciseIdx: number, notes: string) => {
    setSessionExercises((prev) => {
      const updated = [...prev];
      updated[exerciseIdx] = { ...updated[exerciseIdx], notes };
      return updated;
    });
  };

  /* ฟังก์ชัน: handleConfirmComplete — ยืนยันจบเซสชัน + ให้คะแนน + feedback → แสดง Summary Card */
  const handleConfirmComplete = async () => {
    const feedbackText = `Comment: ${sessionComment}\nNext Goals: ${sessionNextGoals}`;
    await handleSave(
      isCompleted ? false : true,
      sessionRating,
      feedbackText,
      true,
    );
    setShowCompleteDialog(false);
    setShowSummaryCard(true);
  };

  /* ฟังก์ชัน: handleSave — บันทึก session logs ทั้งหมดไป API + อัปเดตสถานะ session */
  const handleSave = async (
    markCompleted = false,
    rating?: number,
    feedback?: string,
    skipNavigate = false,
  ) => {
    if (!id) return;
    try {
      const payload: any = {
        notes: sessionNotes,
        status: markCompleted
          ? "completed"
          : sessionData?.status || "scheduled",
        summary: `Completed ${completedExercisesCount}/${sessionExercises.length} exercises`,
        logs: sessionExercises.map((ex) => ({
          id: ex.id,
          exercise_id: Number(ex.exerciseId),
          exercise_name: ex.name,
          category: ex.category,
          notes: ex.notes,
          section_name: ex.sectionName,
          section_order: ex.sectionOrder,
          tracking_fields: ex.trackingFields,
          sets: ex.sets.map((s, i) => {
            const metadata: Record<string, any> = {};
            // 1. Direct props
            for (const key of ADVANCED_FIELDS) {
              const val = (s as any)[key];
              if (val !== undefined && val !== null && val !== "")
                metadata[key] = val;
            }
            // 2. actualMetadata takes priority
            if (s.actualMetadata) Object.assign(metadata, s.actualMetadata);
            // 3. Explicit
            if (s.duration !== undefined) metadata.duration = s.duration;
            if (s.distance !== undefined) metadata.distance = s.distance;

            return {
              id: s.id,
              set_number: i + 1,
              actual_reps: s.reps,
              actual_weight_kg: s.weight,
              actual_rpe: s.rpe,
              actual_distance: s.distance, // Added
              actual_duration_seconds: s.duration, // Added
              planned_reps: s.targetReps,
              planned_weight_kg: s.targetWeight,
              planned_rpe: s.targetRPE || 0,
              planned_duration_seconds: s.targetDuration || 0,
              planned_distance: s.targetDistance || 0,
              rest_duration_seconds: s.restDuration || 0,
              planned_metadata: s.targetMetadata || {},
              actual_metadata: metadata,
              completed: markCompleted ? true : s.completed,
            };
          }),
        })),
      };

      if (rating !== undefined) payload.rating = rating;
      if (feedback !== undefined) payload.feedback = feedback;

      if (markCompleted) {
        await api.post(`/sessions/${id}/complete`, payload);
      } else {
        await api.put(`/sessions/${id}`, payload);
      }

      toast.success(
        markCompleted ? "บันทึกและจบเซสชันเรียบร้อย" : "บันทึกข้อมูลเรียบร้อย",
      );
      if (markCompleted && !skipNavigate) {
        if (fromPath) {
          navigate(fromPath);
        } else {
          navigate(
            client?.id ? `/trainer/clients/${client.id}` : "/trainer/clients",
          );
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("บันทึกข้อมูลล้มเหลว");
    }
  };

  /* ฟังก์ชัน: handleAddExercise — เพิ่มท่าเดี่ยวใน session (ไม่ผ่าน section) */
  const handleAddExercise = () => {
    if (!selectedExerciseId) {
      toast.error("กรุณาเลือกท่าออกกำลังกาย");
      return;
    }
    const exerciseInfo = availableExercises.find(
      (e) => e.id.toString() === selectedExerciseId,
    ) || { name: "New Exercise", category: "General", tracking_fields: [] };
    const sets: ExerciseSet[] = Array.from(
      { length: exerciseSets },
      (_, i) => ({
        setNumber: i + 1,
        reps: exerciseReps,
        weight: 0,
        completed: false,
      }),
    );
    setSessionExercises((prev) => [
      ...prev,
      {
        exerciseId: selectedExerciseId,
        name: exerciseInfo.name,
        category: exerciseInfo.category,
        sets,
        notes: "",
        completed: false,
        trackingFields: exerciseInfo.tracking_fields,
      },
    ]);
    setShowExerciseDialog(false);
    setSelectedExerciseId("");
    setExerciseSets(3);
    setExerciseReps(10);
    setExerciseSearchTerm("");
    toast.success("เพิ่มท่าออกกำลังกายเรียบร้อย");
  };

  /* Helper: formatTimeInput — จัดรูปแบบเวลา mm:ss */
  const formatTimeInput = (value: string) => {
    const clean = value.replace(/[^0-9]/g, "");
    if (clean.length === 3) return `${clean.slice(0, 1)}:${clean.slice(1)}`;
    if (clean.length >= 4) return `${clean.slice(0, 2)}:${clean.slice(2, 4)}`;
    return clean;
  };

  /* Helper: getDefaultTrackingFields — หา tracking fields ตั้งต้นจาก exercise library */
  const getDefaultTrackingFields = (exerciseId: string): string[] => {
    const ex = availableExercises.find((e) => e.id.toString() === exerciseId);
    if (ex?.tracking_fields?.length) return ex.tracking_fields;
    const cat = (ex?.category || "strength").toLowerCase();
    const defaults: Record<string, string[]> = {
      strength: ["reps", "weight", "rpe"],
      "weight training": ["reps", "weight", "rpe"],
      cardio: ["time", "distance", "heart_rate"],
      flexibility: ["hold_time", "reps"],
      plyometrics: ["reps", "rounds"],
    };
    return defaults[cat] || ["reps", "weight", "rpe"];
  };

  /* ฟังก์ชัน: resetSectionForm — ล้างฟอร์มเพิ่ม section ใหม่ */
  const resetSectionForm = () => {
    setNewSection({
      sectionType: "warmup",
      sectionFormat: "regular",
      name: "",
      duration: 10,
      rounds: 3,
      workTime: 30,
      restTime: 15,
      exercises: [],
      notes: "",
    });
    setNewSectionExercises([]);
    setSectionExerciseSearchTerm("");
    setSwapExerciseIndex(null);
  };

  /* ฟังก์ชัน: handleAddExerciseToSection — เพิ่มท่าเข้า section ที่กำลังสร้าง */
  const handleAddExerciseToSection = (exId: string) => {
    const ex = availableExercises.find((e) => e.id.toString() === exId);
    if (!ex) return;
    if (swapExerciseIndex !== null) {
      const updated = [...newSectionExercises];
      updated[swapExerciseIndex] = {
        ...updated[swapExerciseIndex],
        exerciseId: exId,
        trackingFields: getDefaultTrackingFields(exId),
      };
      setNewSectionExercises(updated);
      setSwapExerciseIndex(null);
    } else {
      setNewSectionExercises((prev) => [
        ...prev,
        {
          exerciseId: exId,
          trackingFields: getDefaultTrackingFields(exId),
          sets: Array.from({ length: newSection.rounds || 3 }, (_, i) => ({
            setNumber: i + 1,
            reps: 10,
            weight: 0,
          })),
        },
      ]);
    }
    setShowSectionExercisePicker(false);
    setSectionExerciseSearchTerm("");
  };

  /* ฟังก์ชัน: handleAddSetToSectionExercise — เพิ่ม set ให้ท่าใน section builder */
  const handleAddSetToSectionExercise = (exIdx: number) => {
    setNewSectionExercises((prev) => {
      const updated = [...prev];
      const currentSets = updated[exIdx].sets;
      const lastSet =
        currentSets.length > 0 ? currentSets[currentSets.length - 1] : null;

      const newSet = {
        setNumber: currentSets.length + 1,
        reps: Number(lastSet?.reps) || 10,
        weight: Number(lastSet?.weight) || 0,
        rest: Number(lastSet?.rest) || 60,
        duration: lastSet?.duration || 0,
        distance: Number(lastSet?.distance) || 0,
        hold_time: Number(lastSet?.hold_time) || 0,
        time: Number(lastSet?.time) || 0,
        speed: Number(lastSet?.speed) || 0,
        cadence: Number(lastSet?.cadence) || 0,
        distance_long: Number(lastSet?.distance_long) || 0,
        distance_short: Number(lastSet?.distance_short) || 0,
        one_rm: Number(lastSet?.one_rm) || 0,
        rir: Number(lastSet?.rir) || 0,
        heart_rate: Number(lastSet?.heart_rate) || 0,
        hr_zone: Number(lastSet?.hr_zone) || 0,
        watts: Number(lastSet?.watts) || 0,
        rpm: Number(lastSet?.rpm) || 0,
        rounds: Number(lastSet?.rounds) || 0,
      };

      updated[exIdx] = {
        ...updated[exIdx],
        sets: [...currentSets, newSet],
      };
      return updated;
    });
  };

  /* ฟังก์ชัน: handleUpdateSectionTrackingFields — toggle tracking field ของท่า */
  const handleUpdateSectionTrackingFields = (
    exerciseIndex: number,
    field: string,
    isChecked: boolean,
  ) => {
    setNewSectionExercises((prev) => {
      const updated = [...prev];
      let currentFields =
        updated[exerciseIndex].trackingFields ||
        getDefaultTrackingFields(updated[exerciseIndex].exerciseId);

      if (isChecked) {
        if (!currentFields.includes(field))
          currentFields = [...currentFields, field];
      } else {
        currentFields = currentFields.filter((f) => f !== field);
      }
      updated[exerciseIndex] = {
        ...updated[exerciseIndex],
        trackingFields: currentFields,
      };
      return updated;
    });
  };

  /* ฟังก์ชัน: handleRemoveExerciseFromSection — ลบท่าออกจาก section builder */
  const handleRemoveExerciseFromSection = (idx: number) => {
    setNewSectionExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  /* ฟังก์ชัน: handleConfirmAddSection — ยืนยันเพิ่ม section ใน exercises list */
  const handleConfirmAddSection = () => {
    if (newSectionExercises.length === 0) {
      toast.error("กรุณาเพิ่มท่าออกกำลังกายอย่างน้อย 1 ท่า");
      return;
    }
    const sectionLabel =
      newSection.name ||
      SECTION_TYPES.find((t) => t.value === newSection.sectionType)?.label ||
      "Main Work";

    // Calculate next sectionOrder
    const maxOrder = sessionExercises.reduce(
      (max, ex) => Math.max(max, ex.sectionOrder || 0),
      0,
    );
    const nextOrder = maxOrder + 1;

    const newExercises: SessionExercise[] = newSectionExercises.map((nsEx) => {
      const exInfo = availableExercises.find(
        (e) => e.id.toString() === nsEx.exerciseId,
      ) || { name: "Exercise", category: "General", tracking_fields: [] };

      return {
        exerciseId: nsEx.exerciseId,
        name: exInfo.name,
        category: exInfo.category,
        sets: nsEx.sets.map((s, i) => {
          const mappedSet: any = {
            ...s, // Spread all to keep custom properties if any
            setNumber: i + 1,
            reps: Number(s.reps) || 0,
            weight: Number(s.weight) || 0,
            rest: parseDuration(s.rest),
            duration: parseDuration(s.duration),
            distance: Number(s.distance) || 0,
            hold_time: parseDuration(s.hold_time),
            time: parseDuration(s.time),
            speed: Number(s.speed) || 0,
            cadence: Number(s.cadence) || 0,
            distance_long: Number(s.distance_long) || 0,
            distance_short: Number(s.distance_short) || 0,
            one_rm: Number(s.one_rm) || 0,
            rir: Number(s.rir) || 0,
            heart_rate: Number(s.heart_rate) || 0,
            hr_zone: Number(s.hr_zone) || 0,
            watts: Number(s.watts) || 0,
            rpm: Number(s.rpm) || 0,
            rounds: Number(s.rounds) || 0,
            rpe: s.rpe ? Number(s.rpe) : undefined,
            restDuration:
              parseDuration(s.rest) || parseDuration(s.rest_time) || 0,
            completed: false,
          };
          return mappedSet;
        }),
        notes: "",
        completed: false,
        sectionName: sectionLabel,
        sectionOrder: nextOrder,
        trackingFields: nsEx.trackingFields,
      };
    });

    setSessionExercises((prev) => [...prev, ...newExercises]);
    setShowAddSectionModal(false);
    resetSectionForm();
    toast.success(
      `เพิ่ม ${newExercises.length} ท่าในช่วง "${sectionLabel}" เรียบร้อย`,
    );
  };

  /* ฟังก์ชัน: handleDeleteExercise — ลบท่าออกจาก session */
  const handleDeleteExercise = (exerciseIdx: number) => {
    if (window.confirm("คุณต้องการลบท่านี้ใช่หรือไม่?")) {
      setSessionExercises((prev) =>
        prev.filter((_, idx) => idx !== exerciseIdx),
      );
      toast.success("ลบท่าออกกำลังกายเรียบร้อย");
    }
  };

  /* ฟังก์ชัน: handleAddSet — เพิ่ม set ใหม่ให้ท่าที่เลือก (ใน session view) */
  const handleAddSet = (exerciseIdx: number) => {
    setSessionExercises((prev) => {
      const updated = [...prev];
      const exercise = { ...updated[exerciseIdx] };
      const lastSet = exercise.sets[exercise.sets.length - 1];
      exercise.sets = [
        ...exercise.sets,
        {
          setNumber: exercise.sets.length + 1,
          reps: lastSet?.reps || 10,
          weight: lastSet?.weight || 0,
          rpe: lastSet?.rpe,
          completed: false,
        },
      ];
      updated[exerciseIdx] = exercise;
      return updated;
    });
    toast.success("เพิ่มเซตเรียบร้อย");
  };

  /* ฟังก์ชัน: handleDeleteSet — ลบ set ออกจากท่า (เหลืออย่างน้อย 1 set) */
  const handleDeleteSet = (exerciseIdx: number, setIdx: number) => {
    setSessionExercises((prev) => {
      const updated = [...prev];
      const exercise = { ...updated[exerciseIdx] };
      if (exercise.sets.length > 1) {
        exercise.sets = exercise.sets.filter((_, idx) => idx !== setIdx);
        exercise.completed = exercise.sets.every((s) => s.completed);
        updated[exerciseIdx] = exercise;
      } else {
        toast.error("ต้องมีอย่างน้อย 1 เซต");
      }
      return updated;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#002140]" size={48} />
          <p className="text-slate-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-[#002140] text-white py-6 print:hidden sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => {
                if (fromPath) {
                  navigate(fromPath);
                } else {
                  navigate(
                    client?.id
                      ? `/trainer/clients/${client.id}`
                      : "/trainer/clients",
                  );
                }
              }}
              className="text-white hover:bg-white/10 -ml-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              กลับ
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSave(false)}
                className="text-white hover:bg-white/10"
              >
                <Save className="h-4 w-4 mr-2" />
                บันทึก
              </Button>
              {!isCompleted ? (
                <Button
                  size="sm"
                  onClick={() => setShowCompleteDialog(true)}
                  className="bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white border-none"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  เสร็จสิ้น
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCompleteDialog(true)}
                  className="bg-white/10 hover:bg-white/20 text-white border-none"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  แก้ไขสรุป
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
              <User className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl mb-1 font-bold">
                {client?.name || "Loading..."}
              </h1>
              <p className="text-sm text-white/70">
                {formatDate(sessionDate).full} • {formatDate(sessionDate).time}
              </p>
            </div>
            {isCompleted && (
              <Badge className="bg-green-500 text-white border-none px-3 py-1">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Completed
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Day Navigator */}
      {siblingsSessions.length > 1 &&
        (() => {
          const currentIdx = siblingsSessions.findIndex(
            (s) => s.id === Number(id),
          );
          const prevSession =
            currentIdx > 0 ? siblingsSessions[currentIdx - 1] : null;
          const nextSession =
            currentIdx < siblingsSessions.length - 1
              ? siblingsSessions[currentIdx + 1]
              : null;
          const remainingSessions = siblingsSessions.filter(
            (s) =>
              s.status !== "completed" &&
              s.status !== "cancelled" &&
              s.id !== Number(id),
          );
          return (
            <div className="bg-white border-b border-slate-200 shadow-sm sticky top-[120px] z-40">
              <div className="container mx-auto px-6 max-w-5xl">
                <div className="flex items-center justify-between py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!prevSession}
                    onClick={() =>
                      prevSession &&
                      navigate(`/trainer/sessions/${prevSession.id}/log`)
                    }
                    className="gap-1 text-slate-600 hover:text-[#002140]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Day {currentIdx > 0 ? currentIdx : 1}
                  </Button>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[#002140]" />
                        <span className="font-semibold text-[#002140]">
                          Day {currentIdx + 1} / {siblingsSessions.length}
                        </span>
                      </div>
                      {programInfo && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {programInfo.name}
                        </p>
                      )}
                    </div>
                    {remainingSessions.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCancelDialog(true)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1 text-xs"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        ต้องการยกเลิกโปรแกรม
                      </Button>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!nextSession}
                    onClick={() =>
                      nextSession &&
                      navigate(`/trainer/sessions/${nextSession.id}/log`)
                    }
                    className="gap-1 text-slate-600 hover:text-[#002140]"
                  >
                    Day{" "}
                    {currentIdx + 2 <= siblingsSessions.length
                      ? currentIdx + 2
                      : siblingsSessions.length}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}

      <div className="container mx-auto px-6 py-6 max-w-5xl">
        {/* Progress Card */}
        <Card className="border-[#002140]/20 bg-gradient-to-br from-[#002140]/5 to-transparent mb-6 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-5 w-5 text-[#002140]" />
                  <h2 className="text-lg font-semibold">
                    {sessionData?.title || "Session Log"}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {client?.description || "Training Program"}
                </p>
                {programInfo &&
                  (programInfo.start_date || programInfo.end_date) && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {programInfo.start_date
                          ? `เริ่ม: ${new Date(programInfo.start_date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}`
                          : ""}
                        {programInfo.start_date && programInfo.end_date
                          ? " → "
                          : ""}
                        {programInfo.end_date
                          ? `สิ้นสุด: ${new Date(programInfo.end_date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}`
                          : ""}
                      </span>
                    </div>
                  )}
              </div>
              <Badge variant="outline" className="gap-1 bg-white">
                <Activity className="h-3 w-3" />
                {completedExercisesCount}/{sessionExercises.length} ท่า
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  ความก้าวหน้าในเซสชัน
                </span>
                <span className="font-medium">
                  {sessionExercises.length > 0
                    ? Math.round(
                        (completedExercisesCount / sessionExercises.length) *
                          100,
                      )
                    : 0}
                  %
                </span>
              </div>
              <Progress
                value={
                  sessionExercises.length > 0
                    ? (completedExercisesCount / sessionExercises.length) * 100
                    : 0
                }
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Exercises List */}
        {sessionExercises.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                <Dumbbell className="h-5 w-5 text-[#002140]" />
                ท่าออกกำลังกาย
              </h2>
              {!isCompleted && (
                <Button
                  size="sm"
                  onClick={() => setShowAddSectionModal(true)}
                  className="bg-[#002140]"
                >
                  <Plus className="h-4 w-4 mr-1" /> เพิ่มช่วงฝึก
                </Button>
              )}
            </div>

            {Object.entries(
              sessionExercises.reduce(
                (groups, ex) => {
                  const key = `${ex.sectionOrder || 999}-${ex.sectionName || "General"}`;
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(ex);
                  return groups;
                },
                {} as Record<string, typeof sessionExercises>,
              ),
            )
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([sectionKey, exercises]) => {
                const sectionName = sectionKey.split("-").slice(1).join("-");
                const sectionType =
                  SECTION_TYPES.find(
                    (t) =>
                      t.value === sectionName.toLowerCase() ||
                      t.label.toLowerCase() === sectionName.toLowerCase(),
                  ) ||
                  SECTION_TYPES.find((t) =>
                    sectionName.toLowerCase().includes(t.value),
                  ) ||
                  SECTION_TYPES[4];
                const SectionIcon = sectionType.icon;

                return (
                  <div key={sectionKey} className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 mt-6 first:mt-0">
                      <div
                        className={`p-1.5 rounded-lg bg-white shadow-sm border ${sectionType.color.replace("text-", "border-").replace("500", "200")}`}
                      >
                        <SectionIcon
                          className={`h-4 w-4 ${sectionType.color}`}
                        />
                      </div>
                      <h3 className="font-semibold text-slate-700">
                        {sectionName}
                      </h3>
                      <Badge
                        variant="secondary"
                        className="text-xs bg-slate-100 text-slate-500"
                      >
                        {exercises.length} ท่า
                      </Badge>
                    </div>

                    {exercises.map((sessionEx) => {
                      const exerciseIdx = sessionExercises.findIndex((e) =>
                        e.id !== undefined && sessionEx.id !== undefined
                          ? e.id === sessionEx.id
                          : e.name === sessionEx.name &&
                            e.exerciseId === sessionEx.exerciseId &&
                            e.sectionOrder === sessionEx.sectionOrder,
                      );
                      const isExpanded = expandedExercises.has(exerciseIdx);
                      const displayFields = (
                        sessionEx.trackingFields?.length
                          ? sessionEx.trackingFields
                          : ["reps", "weight", "rpe"]
                      )
                        .map(normalizeTrackingFieldKey)
                        .filter((f) => f !== "sets");

                      return (
                        <Card
                          key={exerciseIdx}
                          className={`border transition-all duration-200 ${sessionEx.completed ? "border-green-200 bg-green-50/20" : "border-slate-200 shadow-sm hover:shadow-md"}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start gap-3 flex-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    toggleExerciseCompleted(exerciseIdx)
                                  }
                                  className="h-8 w-8 p-0 mt-0.5 rounded-full hover:bg-slate-100"
                                  disabled={isCompleted}
                                >
                                  {sessionEx.completed ? (
                                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                                  ) : (
                                    <Circle className="h-6 w-6 text-slate-300" />
                                  )}
                                </Button>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-lg text-slate-800">
                                      {sessionEx.name}
                                    </h3>
                                    {sessionEx.category && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs font-normal"
                                      >
                                        {sessionEx.category}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {sessionEx.sets.length} เซต •{" "}
                                    {displayFields.join(", ")}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExercise(exerciseIdx)}
                                  className="h-8 w-8 p-0"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-5 w-5 text-slate-500" />
                                  ) : (
                                    <ChevronDown className="h-5 w-5 text-slate-500" />
                                  )}
                                </Button>
                                {!isCompleted && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                      >
                                        <MoreHorizontal className="h-5 w-5 text-slate-500" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleAddSet(exerciseIdx)
                                        }
                                      >
                                        <Plus className="h-4 w-4 mr-2" />
                                        เพิ่มเซต
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleDeleteExercise(exerciseIdx)
                                        }
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        ลบท่า
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                                <div className="border rounded-xl overflow-hidden bg-white">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead className="bg-slate-50 border-b">
                                        <tr>
                                          <th className="p-3 text-center w-10 font-medium text-slate-500">
                                            #
                                          </th>
                                          {displayFields.map((field) => (
                                            <th
                                              key={field}
                                              className="p-3 text-center font-medium text-slate-500 min-w-[80px]"
                                            >
                                              {FIELD_CONFIG[field]?.label ||
                                                field}
                                            </th>
                                          ))}
                                          <th className="p-3 text-center w-12 font-medium text-slate-500">
                                            ✓
                                          </th>
                                          {!isCompleted && (
                                            <th className="p-3 w-10"></th>
                                          )}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y">
                                        {sessionEx.sets.map((set, setIdx) => (
                                          <tr
                                            key={setIdx}
                                            className={
                                              set.completed
                                                ? "bg-green-50/50"
                                                : ""
                                            }
                                          >
                                            <td className="p-2 text-center text-slate-500 font-medium">
                                              {setIdx + 1}
                                            </td>

                                            {displayFields.map((field) => {
                                              const displayVal =
                                                field === "rest"
                                                  ? formatDuration(
                                                      set.restDuration,
                                                    )
                                                  : getSetDisplayValue(
                                                      set,
                                                      field,
                                                    );

                                              // Placeholder จาก targetMetadata
                                              const backendKey =
                                                KEY_MAP[field] || field;
                                              const targetRaw =
                                                set.targetMetadata?.[field] ??
                                                set.targetMetadata?.[
                                                  backendKey
                                                ];
                                              const placeholder =
                                                targetRaw !== undefined &&
                                                targetRaw !== null &&
                                                targetRaw !== "" &&
                                                targetRaw !== 0
                                                  ? `Target: ${TIME_FIELDS.includes(field) ? formatDuration(targetRaw) : targetRaw}`
                                                  : FIELD_CONFIG[field]
                                                      ?.placeholder || "0";

                                              return (
                                                <td key={field} className="p-2">
                                                  <Input
                                                    type={
                                                      FIELD_CONFIG[field]
                                                        ?.type === "number"
                                                        ? "number"
                                                        : "text"
                                                    }
                                                    value={displayVal}
                                                    onChange={(e) =>
                                                      updateSetValue(
                                                        exerciseIdx,
                                                        setIdx,
                                                        field,
                                                        e.target.value,
                                                      )
                                                    }
                                                    className="h-9 text-center font-medium"
                                                    disabled={isCompleted}
                                                    placeholder={placeholder}
                                                  />
                                                </td>
                                              );
                                            })}

                                            <td className="p-2 text-center">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  toggleSetCompleted(
                                                    exerciseIdx,
                                                    setIdx,
                                                  )
                                                }
                                                className={`h-9 w-9 p-0 rounded-full ${set.completed ? "bg-green-100 hover:bg-green-200" : "hover:bg-slate-100"}`}
                                                disabled={isCompleted}
                                              >
                                                {set.completed ? (
                                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                ) : (
                                                  <Circle className="h-5 w-5 text-slate-300" />
                                                )}
                                              </Button>
                                            </td>
                                            {!isCompleted && (
                                              <td className="p-2 text-center">
                                                {sessionEx.sets.length > 1 && (
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                      handleDeleteSet(
                                                        exerciseIdx,
                                                        setIdx,
                                                      )
                                                    }
                                                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                  >
                                                    <Trash2 className="h-4 w-4" />
                                                  </Button>
                                                )}
                                              </td>
                                            )}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-xs text-muted-foreground ml-1 mb-1.5 block">
                                    บันทึกช่วยจำ (Notes)
                                  </Label>
                                  <Textarea
                                    value={sessionEx.notes}
                                    onChange={(e) =>
                                      updateExerciseNotes(
                                        exerciseIdx,
                                        e.target.value,
                                      )
                                    }
                                    placeholder="บันทึกเทคนิค หรือความรู้สึกสำหรับท่านี้..."
                                    className="min-h-[80px] bg-slate-50 border-slate-200 focus:bg-white transition-colors resize-none"
                                    disabled={isCompleted}
                                  />
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                );
              })}
          </div>
        ) : (
          <Card className="border-2 border-dashed border-slate-200 bg-slate-50/50">
            <CardContent className="p-12 text-center flex flex-col items-center">
              <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Dumbbell className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                ยังไม่มีท่าออกกำลังกาย
              </h3>
              <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
                เริ่มต้นด้วยการเพิ่มท่าออกกำลังกายใหม่ลงในเซสชันนี้
              </p>
              {!isCompleted && (
                <Button
                  onClick={() => setShowAddSectionModal(true)}
                  className="bg-[#002140]"
                >
                  <Plus className="h-4 w-4 mr-2" /> เพิ่มช่วงฝึกแรก
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {sessionExercises.length > 0 && (
          <Card className="border-[#002140]/20 mt-6 shadow-sm">
            <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText size={18} /> โน้ตสรุปเซสชัน
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="สรุปภาพรวมการฝึกวันนี้..."
                className="min-h-[120px] text-base border-slate-200 focus:border-[#002140] focus:ring-[#002140]"
                disabled={isCompleted}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Exercise Dialog — Searchable Picker (เหมือน ProgramBuilder) */}
      <Dialog
        open={showExerciseDialog}
        onOpenChange={(open) => {
          setShowExerciseDialog(open);
          if (!open) {
            setExerciseSearchTerm("");
            setSelectedExerciseId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มท่าออกกำลังกาย</DialogTitle>
            <DialogDescription>
              {selectedExerciseId
                ? "กำหนดจำนวนเซตและ Reps เริ่มต้น"
                : "ค้นหาและเลือกท่าที่ต้องการ"}
            </DialogDescription>
          </DialogHeader>

          {!selectedExerciseId ? (
            /* ── Step 1: ค้นหาและเลือกท่า ── */
            <div className="space-y-3 py-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาท่าออกกำลังกาย..."
                  value={exerciseSearchTerm}
                  onChange={(e) => setExerciseSearchTerm(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
              <ScrollArea className="h-[300px] border rounded-lg">
                <div className="p-1">
                  {availableExercises
                    .filter((ex) =>
                      ex.name
                        .toLowerCase()
                        .includes(exerciseSearchTerm.toLowerCase()),
                    )
                    .map((ex) => (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => setSelectedExerciseId(ex.id.toString())}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-[#002140]/10 flex items-center justify-center">
                            <Dumbbell className="h-4 w-4 text-[#002140]" />
                          </div>
                          <span className="font-medium text-sm">{ex.name}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-normal"
                        >
                          {ex.category === "weight-training"
                            ? "Weight Training"
                            : ex.category === "cardio"
                              ? "Cardio"
                              : ex.category === "flexibility"
                                ? "Flexibility"
                                : ex.category}
                        </Badge>
                      </div>
                    ))}
                  {availableExercises.filter((ex) =>
                    ex.name
                      .toLowerCase()
                      .includes(exerciseSearchTerm.toLowerCase()),
                  ).length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      ไม่พบท่าที่ค้นหา
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : (
            /* ── Step 2: ตั้งค่าจำนวนเซต / Reps ── */
            (() => {
              const selectedEx = availableExercises.find(
                (e) => e.id.toString() === selectedExerciseId,
              );
              return (
                <div className="space-y-4 py-2">
                  {/* แสดงท่าที่เลือกแล้ว */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-lg bg-[#002140]/10 flex items-center justify-center">
                        <Dumbbell className="h-4 w-4 text-[#002140]" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {selectedEx?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedEx?.category}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setSelectedExerciseId("")}
                    >
                      เปลี่ยนท่า
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>จำนวนเซต</Label>
                      <Input
                        type="number"
                        min="1"
                        value={exerciseSets}
                        onChange={(e) =>
                          setExerciseSets(parseInt(e.target.value) || 1)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Reps เป้าหมาย</Label>
                      <Input
                        type="number"
                        min="1"
                        value={exerciseReps}
                        onChange={(e) =>
                          setExerciseReps(parseInt(e.target.value) || 1)
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })()
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedExerciseId) {
                  setSelectedExerciseId("");
                } else {
                  setShowExerciseDialog(false);
                }
              }}
            >
              {selectedExerciseId ? "← กลับ" : "ยกเลิก"}
            </Button>
            {selectedExerciseId && (
              <Button onClick={handleAddExercise} className="bg-[#002140]">
                เพิ่มท่า
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Add Section Modal — เหมือน ProgramBuilder ═══ */}
      <Dialog open={showAddSectionModal} onOpenChange={setShowAddSectionModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>เพิ่มช่วงการฝึก (Section)</DialogTitle>
            <DialogDescription>
              กำหนดประเภทและเลือกท่าออกกำลังกาย
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ประเภทช่วงฝึก</Label>
                <Select
                  value={newSection.sectionType}
                  onValueChange={(val) =>
                    setNewSection({ ...newSection, sectionType: val })
                  }
                >
                  <SelectTrigger className="border-slate-300 shadow-sm focus:ring-[#002140]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-2">
                          <t.icon className={`w-4 h-4 ${t.color}`} />
                          {t.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>รูปแบบ (Format)</Label>
                <Select
                  value={newSection.sectionFormat || "regular"}
                  onValueChange={(val) =>
                    setNewSection({ ...newSection, sectionFormat: val })
                  }
                >
                  <SelectTrigger className="border-slate-300 shadow-sm focus:ring-[#002140]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="amrap">AMRAP</SelectItem>
                    <SelectItem value="timed">Timed</SelectItem>
                    <SelectItem value="interval">Interval</SelectItem>
                    <SelectItem value="freestyle">Freestyle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>ชื่อช่วงฝึก</Label>
              <Input
                value={newSection.name}
                onChange={(e) =>
                  setNewSection({ ...newSection, name: e.target.value })
                }
                placeholder="เช่น A, Main Lifts, Circuit 1"
                className="border-slate-300 shadow-sm focus-visible:ring-[#002140]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {newSection.sectionFormat === "amrap" && (
                <div className="space-y-2">
                  <Label>ระยะเวลา (นาที)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newSection.duration}
                    onChange={(e) =>
                      setNewSection({
                        ...newSection,
                        duration: parseInt(e.target.value) || 0,
                      })
                    }
                    className="border-slate-300 shadow-sm focus-visible:ring-[#002140]"
                  />
                </div>
              )}
              {newSection.sectionFormat === "timed" && (
                <div className="space-y-2">
                  <Label>จำนวนรอบ</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newSection.rounds}
                    onChange={(e) =>
                      setNewSection({
                        ...newSection,
                        rounds: parseInt(e.target.value) || 1,
                      })
                    }
                    className="border-slate-300 shadow-sm focus-visible:ring-[#002140]"
                  />
                </div>
              )}
            </div>

            <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
              <div className="flex justify-between items-center">
                <Label>ท่าฝึก ({newSectionExercises.length})</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSectionExercisePicker(true)}
                >
                  <Plus className="h-4 w-4 mr-1" /> เพิ่มท่า
                </Button>
              </div>
              <div className="space-y-3">
                {newSectionExercises.map((ex, idx) => {
                  const exData = availableExercises.find(
                    (e) => String(e.id) === String(ex.exerciseId),
                  );
                  const fields =
                    ex.trackingFields ||
                    getDefaultTrackingFields(ex.exerciseId);
                  return (
                    <Card key={idx} className="p-3">
                      <div className="flex justify-between mb-2">
                        <span className="font-semibold text-sm">
                          {exData?.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <Popover modal={true}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <SlidersHorizontal className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-56 p-0">
                              <ScrollArea className="h-[300px] w-full p-3">
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm mb-2 sticky top-0 bg-white z-10 py-1">
                                    ตัวชี้วัด
                                  </h4>
                                  {[
                                    "time",
                                    "rest",
                                    "speed",
                                    "cadence",
                                    "distance_long",
                                    "distance_short",
                                    "reps",
                                    "one_rm",
                                    "weight",
                                    "rpe",
                                    "rir",
                                    "heart_rate",
                                    "hr_zone",
                                    "watts",
                                    "rpm",
                                    "rounds",
                                  ].map((f) => (
                                    <div
                                      key={f}
                                      className="flex items-center space-x-2"
                                    >
                                      <Switch
                                        id={`sec-field-${idx}-${f}`}
                                        checked={fields.includes(f)}
                                        onCheckedChange={(c) =>
                                          handleUpdateSectionTrackingFields(
                                            idx,
                                            f,
                                            c,
                                          )
                                        }
                                      />
                                      <Label
                                        htmlFor={`sec-field-${idx}-${f}`}
                                        className="text-xs cursor-pointer flex-1 user-select-none"
                                      >
                                        {FIELD_CONFIG[f]?.label || f}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </PopoverContent>
                          </Popover>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSwapExerciseIndex(idx);
                                  setShowSectionExercisePicker(true);
                                }}
                              >
                                <Repeat className="h-4 w-4 mr-2" /> เปลี่ยนท่า
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  handleRemoveExerciseFromSection(idx)
                                }
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> ลบท่า
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {ex.sets.map((set, setIdx) => (
                          <div
                            key={setIdx}
                            className="border rounded-lg p-2.5 space-y-2 bg-white relative group"
                          >
                            <div className="flex justify-between items-center">
                              <Badge
                                variant="secondary"
                                className="px-2 py-0.5 text-xs font-normal bg-muted text-muted-foreground"
                              >
                                Set {set.setNumber || setIdx + 1}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  if (ex.sets.length <= 1) {
                                    toast.error("ต้องมีอย่างน้อย 1 เซต");
                                    return;
                                  }
                                  setNewSectionExercises((prev) => {
                                    const u = [...prev];
                                    const newSets = u[idx].sets
                                      .filter((_, i) => i !== setIdx)
                                      .map((s, i) => ({
                                        ...s,
                                        setNumber: i + 1,
                                      }));
                                    u[idx] = { ...u[idx], sets: newSets };
                                    return u;
                                  });
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {fields.map((fieldName) => {
                                const config = FIELD_CONFIG[fieldName];
                                if (!config) return null;
                                return (
                                  <div key={fieldName} className="space-y-1">
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase ml-1">
                                      {config.label}
                                    </span>
                                    <Input
                                      type={config.type}
                                      min={
                                        config.type === "number" ? 0 : undefined
                                      }
                                      className="h-8 text-center border-2 border-gray-300"
                                      placeholder={config.placeholder}
                                      value={(set as any)[fieldName] || ""}
                                      onChange={(e) => {
                                        let val: any = e.target.value;
                                        if (
                                          [
                                            "rest",
                                            "time",
                                            "duration",
                                            "work_time",
                                            "rest_time",
                                            "hold_time",
                                          ].includes(fieldName)
                                        ) {
                                          val = formatTimeInput(val);
                                        }
                                        if (
                                          config.type === "number" &&
                                          val !== "" &&
                                          ![
                                            "rest",
                                            "time",
                                            "duration",
                                            "hold_time",
                                          ].includes(fieldName)
                                        ) {
                                          const p = parseFloat(val);
                                          val = isNaN(p) ? 0 : p;
                                        }
                                        setNewSectionExercises((prev) => {
                                          const u = [...prev];
                                          const newSets = [...u[idx].sets];
                                          newSets[setIdx] = {
                                            ...newSets[setIdx],
                                            [fieldName]: val,
                                          };
                                          u[idx] = { ...u[idx], sets: newSets };
                                          return u;
                                        });
                                      }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-6 text-xs"
                          onClick={() => handleAddSetToSectionExercise(idx)}
                        >
                          + เพิ่ม Set
                        </Button>
                      </div>
                    </Card>
                  );
                })}

                {newSectionExercises.length === 0 && (
                  <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg bg-slate-50">
                    <Dumbbell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    กดปุ่ม "เพิ่มท่า" เพื่อเริ่มเพิ่มท่าออกกำลังกาย
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddSectionModal(false);
                resetSectionForm();
              }}
            >
              ยกเลิก
            </Button>
            <Button onClick={handleConfirmAddSection} className="bg-[#002140]">
              บันทึกช่วงฝึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exercise Picker for Section */}
      <Dialog
        open={showSectionExercisePicker}
        onOpenChange={(open) => {
          setShowSectionExercisePicker(open);
          if (!open) {
            setSwapExerciseIndex(null);
            setSectionExerciseSearchTerm("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {swapExerciseIndex !== null ? "เปลี่ยนท่า" : "เลือกท่าฝึก"}
            </DialogTitle>
            <DialogDescription>
              {swapExerciseIndex !== null ? "เลือกท่าใหม่" : "ค้นหาและเลือกท่า"}
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาท่าออกกำลังกาย..."
              value={sectionExerciseSearchTerm}
              onChange={(e) => setSectionExerciseSearchTerm(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <ScrollArea className="h-[300px]">
            <div className="space-y-1">
              {availableExercises
                .filter((ex) =>
                  ex.name
                    .toLowerCase()
                    .includes(sectionExerciseSearchTerm.toLowerCase()),
                )
                .map((ex) => (
                  <div
                    key={ex.id}
                    className="p-2.5 hover:bg-accent cursor-pointer rounded-lg flex justify-between items-center transition-colors"
                    onClick={() => handleAddExerciseToSection(ex.id.toString())}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-[#002140]/10 flex items-center justify-center">
                        <Dumbbell className="h-4 w-4 text-[#002140]" />
                      </div>
                      <span className="font-medium text-sm">{ex.name}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {ex.category === "weight-training"
                        ? "Weight Training"
                        : ex.category === "cardio"
                          ? "Cardio"
                          : ex.category === "flexibility"
                            ? "Flexibility"
                            : ex.category}
                    </Badge>
                  </div>
                ))}
              {availableExercises.filter((ex) =>
                ex.name
                  .toLowerCase()
                  .includes(sectionExerciseSearchTerm.toLowerCase()),
              ).length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  ไม่พบท่าที่ค้นหา
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Completion Dialog */}
      {/* Completion Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden rounded-2xl">
          {/* Dialog Header — ดีไซน์เหมือน session card header */}
          <div className="bg-gradient-to-br from-[#002140] to-[#003a6b] px-6 pt-6 pb-5">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-full bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-white font-bold text-lg leading-tight">
                  สรุปผลการฝึก
                </h2>
                <p className="text-white/60 text-xs mt-0.5">
                  {formatDate(sessionDate).full} •{" "}
                  {formatDate(sessionDate).time}
                </p>
              </div>
              <Badge className="bg-white/10 border-white/20 text-white text-xs border shrink-0">
                Session Summary
              </Badge>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
            {/* ⭐ Rating Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base">⭐</span>
                <Label className="text-sm font-semibold text-slate-700">
                  ให้คะแนนการฝึก
                </Label>
                <span className="text-xs text-slate-400 ml-auto">
                  {sessionRating > 0
                    ? `${sessionRating}/5`
                    : "ยังไม่ได้ให้คะแนน"}
                </span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSessionRating(star)}
                    className={`
                flex-1 h-10 rounded-xl border-2 text-lg transition-all duration-150
                ${
                  sessionRating >= star
                    ? "bg-yellow-400 border-yellow-400 text-white shadow-sm scale-105"
                    : "bg-slate-50 border-slate-200 text-slate-300 hover:border-yellow-300 hover:text-yellow-400"
                }
              `}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* 💬 Trainer Feedback */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-md bg-blue-100 flex items-center justify-center">
                  <FileText className="h-3 w-3 text-blue-600" />
                </div>
                <Label className="text-sm font-semibold text-slate-700">
                  ความคิดเห็นจากเทรนเนอร์
                </Label>
              </div>
              <div className="relative">
                <Textarea
                  placeholder="เช่น วันนี้ฟอร์มดีมาก ทำ Squat ได้ดีขึ้นเยอะ ให้คงรูปแบบนี้ไว้..."
                  value={sessionComment}
                  onChange={(e) => setSessionComment(e.target.value)}
                  rows={3}
                  className="resize-none bg-slate-50 border-slate-200 focus:border-blue-400 focus:ring-blue-100 rounded-xl text-sm leading-relaxed pl-3 pr-3 pt-3"
                />
                {sessionComment.length > 0 && (
                  <span className="absolute bottom-2 right-3 text-xs text-slate-400">
                    {sessionComment.length} ตัวอักษร
                  </span>
                )}
              </div>
            </div>

            {/* 🎯 Next Goals */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-md bg-orange-100 flex items-center justify-center">
                  <Target className="h-3 w-3 text-orange-600" />
                </div>
                <Label className="text-sm font-semibold text-slate-700">
                  เป้าหมายครั้งต่อไป
                </Label>
              </div>
              <Textarea
                placeholder={`• เพิ่มน้ำหนัก Squat 2.5kg\n• โฟกัสฟอร์มการยก Deadlift\n• เพิ่ม Cardio 10 นาที`}
                value={sessionNextGoals}
                onChange={(e) => setSessionNextGoals(e.target.value)}
                rows={4}
                className="resize-none bg-slate-50 border-slate-200 focus:border-orange-400 focus:ring-orange-100 rounded-xl text-sm leading-relaxed font-mono"
              />
              <p className="text-xs text-slate-400 pl-1">
                ใช้ • นำหน้าแต่ละเป้าหมาย เพื่อแสดงเป็น bullet list ในการ์ดสรุป
              </p>
            </div>

            {/* Session Preview Summary (optional info row) */}
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-[#002140]" />
                <span>
                  {completedExercisesCount}/{sessionExercises.length} ท่า
                  เสร็จสิ้น
                </span>
              </div>
              <div
                className={`font-semibold ${
                  completedExercisesCount === sessionExercises.length
                    ? "text-green-600"
                    : "text-orange-500"
                }`}
              >
                {sessionExercises.length > 0
                  ? Math.round(
                      (completedExercisesCount / sessionExercises.length) * 100,
                    )
                  : 0}
                % สำเร็จ
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCompleteDialog(false)}
              className="flex-1 rounded-xl border-slate-200 text-slate-600 hover:bg-white"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleConfirmComplete}
              className="flex-2 bg-green-600 hover:bg-green-700 text-white rounded-xl px-6 gap-2 shadow-sm shadow-green-200"
            >
              <CheckCircle2 className="h-4 w-4" />
              ยืนยันจบเซสชัน
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Session Summary Card (แสดงหลังจบเซสชัน) */}
      {showSummaryCard && (
        <SessionSummaryCard
          clientName={client?.name || "Client"}
          sessionTitle={sessionData?.title || "Training Session"}
          date={formatDate(sessionDate).full}
          time={formatDate(sessionDate).time}
          rating={sessionRating}
          comment={sessionComment}
          nextGoals={sessionNextGoals}
          exercises={sessionExercises.map((ex) => ({
            name: ex.name,
            setsCount: ex.sets.length,
            completed: ex.completed,
          }))}
          completedCount={completedExercisesCount}
          totalCount={sessionExercises.length}
          onClose={() => {
            setShowSummaryCard(false);
            navigate(
              client ? `/trainer/clients/${client.id}` : "/trainer/calendar",
            );
          }}
        />
      )}

      {/* Cancel Remaining Days Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              ยกเลิกวันที่เหลือ
            </DialogTitle>
            <DialogDescription>
              {(() => {
                const completed = siblingsSessions.filter(
                  (s) => s.status === "completed",
                ).length;
                const remaining = siblingsSessions.filter(
                  (s) => s.status !== "completed" && s.status !== "cancelled",
                ).length;
                return `ฝึกไปแล้ว ${completed} วัน — ยกเลิก ${remaining} วันที่เหลือ? ข้อมูลที่ฝึกไปแล้วจะยังคงเก็บไว้`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={cancelLoading}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              disabled={cancelLoading}
              onClick={async () => {
                setCancelLoading(true);
                try {
                  const toCancel = siblingsSessions.filter(
                    (s) => s.status !== "completed" && s.status !== "cancelled",
                  );
                  await Promise.all(
                    toCancel.map((s) =>
                      api.put(`/sessions/${s.id}`, { status: "cancelled" }),
                    ),
                  );
                  toast.success(`ยกเลิก ${toCancel.length} วันเรียบร้อย`);
                  setShowCancelDialog(false);
                  fetchSession();
                } catch (err) {
                  console.error(err);
                  toast.error("ไม่สามารถยกเลิกได้");
                } finally {
                  setCancelLoading(false);
                }
              }}
            >
              {cancelLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              ยืนยันยกเลิก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
