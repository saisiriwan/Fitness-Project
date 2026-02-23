import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  Activity,
  Target,
  Dumbbell,
  Weight,
  Ruler,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Loader2,
  Heart,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import api from "@/lib/api";
import { format, startOfWeek, isSameWeek, parseISO } from "date-fns";
import { th } from "date-fns/locale";

// --- Constants & Config ---
const PRIMARY_COLOR = "#002140";
const ACCENT_COLOR = "#FF6B35";

// Goal Configuration
const TRAINING_GOALS: any = {
  weight_loss: {
    label: "ลดน้ำหนัก",
    labelEn: "Weight Loss",
    icon: <Weight className="h-6 w-6 text-emerald-500" />,
    description: "เน้นการเผาผลาญไขมันและลดน้ำหนักตัว",
  },
  muscle_building: {
    label: "สร้างกล้ามเนื้อ",
    labelEn: "Hypertrophy",
    icon: <Dumbbell className="h-6 w-6 text-blue-500" />,
    description: "เน้นการเพิ่มขนาดและมวลกล้ามเนื้อ",
  },
  strength: {
    label: "เพิ่มความแข็งแรง",
    labelEn: "Strength",
    icon: <TrendingUp className="h-6 w-6 text-orange-500" />,
    description: "เน้นการเพิ่มพละกำลังและ 1RM",
  },
  general_health: {
    label: "สุขภาพทั่วไป",
    labelEn: "General Health",
    icon: <Activity className="h-6 w-6 text-purple-500" />,
    description: "เน้นสุขภาพองค์รวมและความฟิต",
  },
};

// --- Helper Components ---
interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  subtitle?: string;
  color: string;
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  trend,
  subtitle,
  color,
}: StatCardProps) {
  const TrendIcon =
    trend === "up"
      ? ArrowUpRight
      : trend === "down"
        ? ArrowDownRight
        : Activity;

  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div
            className={`h-10 w-10 rounded-lg flex items-center justify-center`}
            style={{ background: color }}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
          {change !== undefined && trend && (
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-sm ${
                trend === "up"
                  ? "bg-emerald-50 text-emerald-700"
                  : trend === "down"
                    ? "bg-rose-50 text-rose-700"
                    : "bg-slate-50 text-slate-700"
              }`}
            >
              <TrendIcon className="h-3 w-3" />
              <span>{isNaN(change) ? "0" : Math.abs(change)}%</span>
            </div>
          )}
        </div>
        <div className="space-y-0.5">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="text-[#002140] text-3xl font-bold">
            {typeof value === "number" ? (isNaN(value) ? 0 : value) : value}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Interfaces ---
interface SessionLogSet {
  id: number;
  actual_weight_kg: number;
  actual_reps: number;
  planned_weight_kg: number;
  planned_reps: number;
  completed: boolean;
}

interface SessionLog {
  id: number;
  schedule_id: number;
  exercise_id: number;
  exercise_name: string;
  category: string;
  created_at: string;
  sets?: SessionLogSet[];
}

interface ClientMetric {
  id: number;
  client_id: number;
  date: string;
  type: string;
  value: number;
}

interface HealthMetric {
  start_time: string;
  vo2_max: number;
  resting_hr: number;
}

interface Client {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  phone: string;
  status: string;
  goal: string;
  currentWeight: number;
  targetWeight: number;
  initial_weight?: number;
  initialWeight?: number;
  metrics:
    | {
        muscle?: string | number;
        bodyFat?: string | number;
      }
    | any[];
  primaryGoal?: string;
}

interface WeeklyVolume {
  weekStart: string;
  totalVolume: number;
  totalSets: number;
  sessions: number;
}

// Helper to map DB goal string to Key
const mapGoalKey = (goal: string): string => {
  if (!goal) return "general_health";
  const g = goal.toLowerCase();
  if (g.includes("weight") || g.includes("fat") || g.includes("ลดน้ำหนัก"))
    return "weight_loss";
  if (
    g.includes("muscle") ||
    g.includes("hypertrophy") ||
    g.includes("เพิ่มกล้ามเนื้อ")
  )
    return "muscle_building";
  if (
    g.includes("strength") ||
    g.includes("power") ||
    g.includes("ความแข็งแรง")
  )
    return "strength";
  return "general_health";
};

// --- Main Component ---
export default function Reports() {
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [clientMetrics, setClientMetrics] = useState<ClientMetric[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  // ✅ FIX 3: Exercise name map สำหรับแสดงชื่อท่าใน 1RM chart
  const [exerciseMap, setExerciseMap] = useState<Map<string, string>>(
    new Map(),
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // ✅ FIX 1 & 3: เพิ่ม exercises fetch เข้ามาด้วย
        const [clientsRes, schedulesRes, logsRes, metricsRes, exercisesRes] =
          await Promise.all([
            api.get("/clients"),
            api.get("/schedules"),
            api.get("/session-logs").catch(() => ({ data: [] })),
            api.get("/client-metrics").catch(() => ({ data: [] })),
            api.get("/exercises").catch(() => ({ data: [] })), // ✅ NEW
          ]);

        const mappedClients = (clientsRes.data || []).map((c: any) => ({
          ...c,
          id: c.id?.toString(),
          metrics: c.metrics || [],
          primaryGoal: mapGoalKey(c.goal),
        }));

        const mappedSessions = (schedulesRes.data || []).map((s: any) => ({
          ...s,
          clientId: s.client_id
            ? s.client_id.toString()
            : s.clientId?.toString() || "",
          date: s.start_time ? new Date(s.start_time) : new Date(),
        }));

        setClients(mappedClients);
        setSessions(mappedSessions);
        setSessionLogs(logsRes.data || []);

        // ✅ FIX 2: Map raw metrics (backend now returns ALL types)
        const mappedMetrics = (metricsRes.data || []).map((m: any) => ({
          ...m,
          client_id: m.client_id || m.ClientID, // Ensure consistent casing
          value: Number(m.value), // Ensure value is number
        }));
        setClientMetrics(mappedMetrics);

        // ✅ FIX 3: สร้าง exercise name map → one_rm_{id} → ชื่อท่า
        const exMap = new Map<string, string>();
        (exercisesRes.data || []).forEach((ex: any) => {
          exMap.set(`one_rm_${ex.id}`, ex.name);
        });
        setExerciseMap(exMap);

        if (mappedClients.length > 0) {
          setSelectedClientId(mappedClients[0].id);
        }
      } catch (err) {
        console.error("Failed to load report data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Duplicate function removed - using top-level helper

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) || clients[0],
    [clients, selectedClientId],
  );

  const clientGoal = selectedClient?.primaryGoal || "general_health";
  const goalMetadata = TRAINING_GOALS[clientGoal];

  // --- Derived Data Calculation ---

  // 1. Filtered Logs & Metrics for Selected Client
  const clientLogs = useMemo(() => {
    if (!sessions.length) return [];
    const scheduleClientMap = new Map();
    sessions.forEach((s) => scheduleClientMap.set(s.id, s.clientId));
    return sessionLogs.filter((log) => {
      const cId = scheduleClientMap.get(log.schedule_id);
      return cId && cId.toString() === selectedClientId;
    });
  }, [sessionLogs, sessions, selectedClientId]);

  const clientBodyMetrics = useMemo(() => {
    return clientMetrics.filter(
      (m) => m.client_id.toString() === selectedClientId,
    );
  }, [clientMetrics, selectedClientId]);

  // 2. ✅ FIX 3: 1RM Calculation — ใช้ exerciseMap แสดงชื่อท่าจริง
  const strengthProgress = useMemo(() => {
    if (clientGoal !== "strength") return [];

    const dailyData: Record<string, any> = {};

    // A. Manual 1RM from Metrics
    clientBodyMetrics.forEach((m) => {
      if (m.type.startsWith("one_rm_")) {
        const date = format(parseISO(m.date), "yyyy-MM-dd");
        if (!dailyData[date]) {
          dailyData[date] = {
            date,
            formattedDate: format(parseISO(m.date), "d MMM", { locale: th }),
          };
        }
        // ✅ FIX 3: ใช้ exerciseMap เพื่อแสดงชื่อท่าจริง แทน ID ตัวเลข
        const label =
          exerciseMap.get(m.type) ||
          m.type.replace("one_rm_", "Exercise #") +
            m.type.replace("one_rm_", "");
        dailyData[date][label] = m.value;
      }
    });

    // B. Estimated from Logs (Fallback or Comparison)
    clientLogs.forEach((log) => {
      const date = format(parseISO(log.created_at), "yyyy-MM-dd");
      let maxLog1RM = 0;

      log.sets?.forEach((set) => {
        const weight =
          set.actual_weight_kg > 0
            ? set.actual_weight_kg
            : set.planned_weight_kg;
        const reps = set.actual_reps > 0 ? set.actual_reps : set.planned_reps;

        if (weight > 0 && reps > 0) {
          const epley = weight * (1 + reps / 30);
          if (epley > maxLog1RM) maxLog1RM = epley;
        }
      });

      if (maxLog1RM > 0) {
        if (!dailyData[date]) {
          dailyData[date] = {
            date,
            formattedDate: format(parseISO(date), "d MMM", { locale: th }),
          };
        }
        // ✅ ใช้ exercise_name จาก log ถ้ามี
        const logLabel = log.exercise_name
          ? `${log.exercise_name} (Est.)`
          : "Estimated";
        if (
          !dailyData[date][logLabel] ||
          maxLog1RM > dailyData[date][logLabel]
        ) {
          dailyData[date][logLabel] = Math.round(maxLog1RM);
        }
      }
    });

    return Object.values(dailyData).sort(
      (a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [clientLogs, clientBodyMetrics, clientGoal, exerciseMap]);

  // 3. Health Metrics (VO2, HR)
  const healthProgress = useMemo(() => {
    if (clientGoal !== "general_health") return [];

    const dailyData: Record<string, any> = {};
    clientBodyMetrics.forEach((m) => {
      if (["vo2_max", "resting_heart_rate"].includes(m.type)) {
        const date = format(parseISO(m.date), "yyyy-MM-dd");
        if (!dailyData[date]) {
          dailyData[date] = {
            date,
            formattedDate: format(parseISO(m.date), "d MMM", { locale: th }),
          };
        }
        dailyData[date][m.type] = m.value;
      }
    });

    return Object.values(dailyData).sort(
      (a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [clientBodyMetrics, clientGoal]);

  // 4. ✅ FIX 2: Body Composition — รวม arm_right/arm_left → arm, thigh_right/thigh_left → thigh
  const bodyCompHistory = useMemo(() => {
    const history: Record<string, any> = {};

    clientBodyMetrics.forEach((m) => {
      if (!m.date) return;
      const date = format(parseISO(m.date), "yyyy-MM-dd");
      if (!history[date]) history[date] = { date, recordedAt: m.date };
      history[date][m.type] = m.value;

      // ✅ FIX 2: Consolidate paired measurements → single chart key
      // arm_right / arm_left → arm (ใช้ค่าล่าสุดที่มี)
      if (m.type === "arm_right" || m.type === "arm_left") {
        // ใช้ arm_right เป็นหลัก, fallback arm_left
        if (!history[date].arm || m.type === "arm_right") {
          history[date].arm = m.value;
        }
      }
      // thigh_right / thigh_left → thigh
      if (m.type === "thigh_right" || m.type === "thigh_left") {
        if (!history[date].thigh || m.type === "thigh_right") {
          history[date].thigh = m.value;
        }
      }
      // muscle metric → muscle (for muscle_building chart)
      if (m.type === "muscle") {
        history[date].muscle = m.value;
      }
    });

    // Fallback: ถ้าไม่มี metrics เลย ใช้ข้อมูลจาก client profile
    if (Object.keys(history).length === 0 && selectedClient) {
      const today = format(new Date(), "yyyy-MM-dd");
      return [
        {
          date: selectedClient.joinDate,
          weight: selectedClient.initialWeight || selectedClient.currentWeight,
          formattedDate: format(
            parseISO(selectedClient.joinDate || new Date().toISOString()),
            "d MMM",
            { locale: th },
          ),
        },
        {
          date: today,
          weight: selectedClient.currentWeight,
          formattedDate: format(new Date(), "d MMM", { locale: th }),
        },
      ];
    }

    return Object.values(history)
      .map((h: any) => ({
        ...h,
        formattedDate: format(parseISO(h.recordedAt), "d MMM", { locale: th }),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [clientBodyMetrics, selectedClient]);

  // 5. Volume Stats
  const volumeByWeek = useMemo<WeeklyVolume[]>(() => {
    if (clientLogs.length === 0) return [];

    const weeks: Record<string, WeeklyVolume> = {};
    clientLogs.forEach((log) => {
      const date = parseISO(log.created_at);
      const weekStart = format(
        startOfWeek(date, { weekStartsOn: 1 }),
        "yyyy-MM-dd",
      );

      if (!weeks[weekStart]) {
        weeks[weekStart] = {
          weekStart,
          totalVolume: 0,
          totalSets: 0,
          sessions: 0,
        };
      }

      let logVolume = 0;
      let logSets = 0;
      log.sets?.forEach((s) => {
        const w = s.actual_weight_kg || s.planned_weight_kg || 0;
        const r = s.actual_reps || s.planned_reps || 0;
        logVolume += w * r;
        logSets += 1;
      });

      weeks[weekStart].totalVolume += logVolume;
      weeks[weekStart].totalSets += logSets;
    });

    const uniqueSchedulesByWeek: Record<string, Set<number>> = {};
    clientLogs.forEach((log) => {
      const date = parseISO(log.created_at);
      const weekStart = format(
        startOfWeek(date, { weekStartsOn: 1 }),
        "yyyy-MM-dd",
      );
      if (!uniqueSchedulesByWeek[weekStart])
        uniqueSchedulesByWeek[weekStart] = new Set();
      uniqueSchedulesByWeek[weekStart].add(log.schedule_id);
    });

    Object.keys(weeks).forEach((week) => {
      weeks[week].sessions = uniqueSchedulesByWeek[week]?.size || 0;
    });

    return Object.values(weeks).sort(
      (a, b) =>
        new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime(),
    );
  }, [clientLogs]);

  // 6. Stats Cards Logic
  const stats = useMemo(() => {
    const latest = bodyCompHistory[bodyCompHistory.length - 1] || {};
    const first = bodyCompHistory[0] || {};

    const calculateChange = (latestVal?: number, firstVal?: number) => {
      if (!latestVal || !firstVal || firstVal === 0) return 0;
      return Number((((latestVal - firstVal) / firstVal) * 100).toFixed(1));
    };

    const totalSessions = volumeByWeek.reduce((sum, w) => sum + w.sessions, 0);
    const avgSessionsPerWeek =
      volumeByWeek.length > 0
        ? (totalSessions / volumeByWeek.length).toFixed(1)
        : "0";

    const baseStats = {
      stat3: {
        title: "จำนวนครั้งที่ฝึก",
        value: totalSessions,
        subtitle: `เฉลี่ย ${avgSessionsPerWeek} ครั้ง/สัปดาห์`,
        icon: Calendar,
        color: PRIMARY_COLOR,
      },
      stat4: {
        title: "BMI",
        value:
          selectedClient?.currentWeight &&
          selectedClient.metrics &&
          (selectedClient as any).height
            ? (
                selectedClient.currentWeight /
                ((selectedClient as any).height / 100) ** 2
              ).toFixed(1)
            : latest.weight
              ? (latest.weight / (175 / 100) ** 2).toFixed(1)
              : "-",
        icon: Activity,
        color: "#3B82F6",
      },
    };

    if (clientGoal === "weight_loss") {
      const wChange = calculateChange(latest.weight, first.weight);
      return {
        ...baseStats,
        stat1: {
          title: "น้ำหนักตัว",
          value: latest.weight ? `${Number(latest.weight).toFixed(1)} kg` : "-",
          change: Math.abs(wChange),
          trend: (wChange < 0 ? "down" : "up") as "up" | "down",
          subtitle:
            wChange !== 0
              ? `${wChange > 0 ? "+" : ""}${(
                  latest.weight - first.weight
                ).toFixed(1)} kg`
              : "ไม่เปลี่ยนแปลง",
          icon: Weight,
          color: "#10B981",
        },
        stat2: {
          title: "% ไขมัน",
          value: latest.body_fat ? `${latest.body_fat}%` : "-",
          icon: Ruler,
          color: ACCENT_COLOR,
        },
      };
    } else if (clientGoal === "muscle_building") {
      // ✅ FIX 2: ใช้ key "arm" ที่รวมแล้ว (จาก arm_right/arm_left)
      const muscleType = latest.chest ? "chest" : latest.arm ? "arm" : "weight";
      const val = latest[muscleType];
      const mChange = calculateChange(val, first[muscleType]);

      return {
        ...baseStats,
        stat1: {
          title:
            muscleType === "chest"
              ? "รอบอก"
              : muscleType === "arm"
                ? "รอบแขน"
                : "น้ำหนักตัว",
          value: val
            ? `${Number(val).toFixed(1)} ${
                muscleType === "weight" ? "kg" : "cm"
              }`
            : "-",
          change: Math.abs(mChange),
          trend: (mChange > 0 ? "up" : "down") as "up" | "down",
          icon: Dumbbell,
          color: "#10B981",
        },
        stat2: {
          title: "Training Volume",
          value:
            volumeByWeek.length > 0
              ? `${(
                  volumeByWeek[volumeByWeek.length - 1].totalVolume / 1000
                ).toFixed(1)}k`
              : "-",
          subtitle: "Volume ล่าสุด (kg)",
          icon: TrendingUp,
          color: ACCENT_COLOR,
        },
      };
    } else if (clientGoal === "strength") {
      const latestData =
        strengthProgress.length > 0
          ? strengthProgress[strengthProgress.length - 1]
          : {};
      const values = Object.entries(latestData)
        .filter(
          ([k, v]) =>
            k !== "date" && k !== "formattedDate" && typeof v === "number",
        )
        .map(([_, v]) => v as number);
      const currentMax = values.length > 0 ? Math.max(...values) : 0;

      return {
        ...baseStats,
        stat1: {
          title: "Max 1RM (ล่าสุด)",
          value: currentMax ? `${currentMax} kg` : "-",
          change: 0,
          trend: "neutral" as "neutral",
          subtitle: "ค่าสูงสุดจากท่าฝึก",
          icon: TrendingUp,
          color: "#F59E0B",
        },
        stat2: {
          title: "Records",
          value: strengthProgress.length,
          subtitle: "บันทึกครั้ง",
          icon: Target,
          color: ACCENT_COLOR,
        },
      };
    }

    // Default / General Health
    const latestHealth =
      healthProgress.length > 0
        ? healthProgress[healthProgress.length - 1]
        : {};

    return {
      ...baseStats,
      stat1: {
        title: "VO2 Max",
        value: latestHealth.vo2_max || "-",
        icon: Heart,
        color: "#EF4444",
      },
      stat2: {
        title: "Resting HR",
        value: latestHealth.resting_heart_rate
          ? `${latestHealth.resting_heart_rate} bpm`
          : "-",
        icon: Activity,
        color: ACCENT_COLOR,
      },
    };
  }, [
    bodyCompHistory,
    clientGoal,
    volumeByWeek,
    selectedClient,
    strengthProgress,
    healthProgress,
  ]);

  // --- Render Chart Logic ---
  const renderMainChart = () => {
    if (clientGoal === "strength") {
      const allKeys = new Set<string>();
      strengthProgress.forEach((d) =>
        Object.keys(d).forEach((k) => {
          if (k !== "date" && k !== "formattedDate") allKeys.add(k);
        }),
      );
      const lines = Array.from(allKeys);
      const colors = ["#F59E0B", "#EF4444", "#3B82F6", "#10B981", "#8B5CF6"];

      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={strengthProgress}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f0f0f0"
            />
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: "8px" }} />
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
                dot={{ r: 4, strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (clientGoal === "muscle_building") {
      // ✅ FIX 2: ใช้ key "arm" ที่รวมแล้ว + เพิ่ม muscle, thigh
      const hasChest = bodyCompHistory.some((h) => h.chest);
      const hasArm = bodyCompHistory.some((h) => h.arm);
      const hasMuscle = bodyCompHistory.some((h) => h.muscle);
      const hasThigh = bodyCompHistory.some((h) => h.thigh);

      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={bodyCompHistory}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f0f0f0"
            />
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              hide={!hasChest && !hasArm && !hasThigh}
            />
            <Tooltip contentStyle={{ borderRadius: "8px" }} />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="weight"
              name="น้ำหนัก (kg)"
              stroke={PRIMARY_COLOR}
              strokeWidth={2}
              dot={false}
            />
            {hasMuscle && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="muscle"
                name="กล้ามเนื้อ (kg)"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            )}
            {hasChest && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="chest"
                name="รอบอก (cm)"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            )}
            {hasArm && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="arm"
                name="รอบแขน (cm)"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            )}
            {hasThigh && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="thigh"
                name="รอบต้นขา (cm)"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (clientGoal === "general_health") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={healthProgress}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f0f0f0"
            />
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              label={{ value: "VO2 Max", angle: -90, position: "insideLeft" }}
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{ value: "HR (bpm)", angle: 90, position: "insideRight" }}
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={{ borderRadius: "8px" }} />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="vo2_max"
              name="VO2 Max"
              stroke="#EF4444"
              strokeWidth={3}
            />
            <Bar
              yAxisId="right"
              dataKey="resting_heart_rate"
              name="Resting HR"
              fill={ACCENT_COLOR}
              opacity={0.6}
              barSize={20}
            />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    // Default: Weight Loss
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={bodyCompHistory}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f0f0f0"
          />
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: "8px" }} />
          <Legend />
          <Line
            type="monotone"
            dataKey="weight"
            name="น้ำหนัก (kg)"
            stroke={PRIMARY_COLOR}
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          {bodyCompHistory.some((d) => d.body_fat) && (
            <Line
              type="monotone"
              dataKey="body_fat"
              name="ไขมัน (%)"
              stroke={ACCENT_COLOR}
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#002140]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#002140]">รายงานผล</h1>
          <p className="text-muted-foreground mt-1">
            วิเคราะห์และติดตามพัฒนาการของลูกเทรน
          </p>
        </div>

        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-[280px] bg-white h-auto py-2">
            <SelectValue placeholder="เลือกลูกเทรน" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-[#002140] text-white">
                      {client.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{client.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedClient ? (
        <>
          {/* Goal Badge */}
          {goalMetadata && (
            <Card
              className="border-l-4 shadow-sm"
              style={{ borderLeftColor: ACCENT_COLOR }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-slate-100">
                    {goalMetadata.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#002140] text-lg">
                        {goalMetadata.label}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({goalMetadata.labelEn})
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {goalMetadata.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Key Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard {...stats.stat1} />
            <StatCard {...stats.stat2} />
            <StatCard {...stats.stat3} />
            <StatCard {...stats.stat4} />
          </div>

          {/* Main Chart */}
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle>
                {clientGoal === "strength" && "ความก้าวหน้า (1RM Progression)"}
                {clientGoal === "muscle_building" &&
                  "ขนาดร่างกาย (Body Measurements)"}
                {clientGoal === "weight_loss" && "พัฒนาการน้ำหนักและไขมัน"}
                {clientGoal === "general_health" &&
                  "สุขภาพองค์รวม (VO2 Max & Heart Rate)"}
              </CardTitle>
              <CardDescription>
                {clientGoal === "strength" &&
                  "คำนวณจากน้ำหนักที่ยกได้สูงสุดในแต่ละวัน (Epley Formula)"}
                {clientGoal === "muscle_building" &&
                  "ติดตามการเปลี่ยนแปลงของสัดส่วนกล้ามเนื้อและน้ำหนัก"}
                {clientGoal === "weight_loss" &&
                  "ติดตามน้ำหนักตัวและเปอร์เซ็นต์ไขมัน"}
                {clientGoal === "general_health" && "ดัชนีชี้วัดสมรรถภาพทางกาย"}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {strengthProgress.length > 0 ||
              bodyCompHistory.length > 0 ||
              (clientGoal === "general_health" && healthProgress.length > 0) ? (
                renderMainChart()
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 bg-slate-50 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-16 w-16 mx-auto mb-3 opacity-20" />
                    <p>ไม่มีข้อมูลสำหรับกราฟนี้</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Volume Chart */}
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle>ความสม่ำเสมอในการฝึก</CardTitle>
              <CardDescription>
                ปริมาณ Sets และ Sessions รายสัปดาห์
              </CardDescription>
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
                        tickFormatter={(val) => format(parseISO(val), "d MMM")}
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "#f8fafc" }}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="totalSets"
                        name="จำนวนเซ็ต (Sets)"
                        fill={ACCENT_COLOR}
                        radius={[4, 4, 0, 0]}
                        barSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400 bg-slate-50 rounded-lg">
                  <div className="text-center">
                    <Calendar className="h-16 w-16 mx-auto mb-3 opacity-20" />
                    <p>ยังไม่มีข้อมูลการฝึก</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-dashed border-2 bg-slate-50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-white p-4 rounded-full mb-4 shadow-sm">
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">ไม่พบข้อมูลลูกเทรน</h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-2">
              กรุณาเพิ่มลูกเทรนในระบบ หรือสร้างตารางการฝึกเพื่อเริ่มดูรายงานผล
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
