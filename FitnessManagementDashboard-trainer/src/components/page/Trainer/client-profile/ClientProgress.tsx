import { useState, useEffect } from "react";
import {
  Scale,
  Activity,
  Zap,
  Ruler,
  Dumbbell,
  LineChart as LineChartIcon,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Heart,
  Trophy,
  Calculator,
  Save,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import api from "@/lib/api";
import { toast } from "sonner";
import { toRFC3339String } from "@/lib/utils";

import type { Client } from "../ClientProfilePage";

interface ClientProgressProps {
  client: Client;
}

interface ProgressRecord {
  date: string;
  value: number;
}

interface MetricFormData {
  [key: string]: string;
}

// --- Configuration (แบบใหม่ เพื่อรองรับ UI) ---
const METRIC_CONFIG: Record<
  string,
  { label: string; unit: string; icon: any }
> = {
  // Basic
  weight: { label: "น้ำหนัก", unit: "kg", icon: Scale },
  height: { label: "ส่วนสูง", unit: "cm", icon: Ruler },
  bmi: { label: "BMI", unit: "", icon: Activity },
  body_fat: { label: "ไขมัน", unit: "%", icon: Activity },
  muscle: { label: "กล้ามเนื้อ", unit: "kg", icon: Zap },

  // Cardio
  vo2_max: { label: "VO₂ Max", unit: "ml/kg/min", icon: Heart },
  distance_12min: { label: "ระยะวิ่ง 12min", unit: "m", icon: Activity },
  resting_heart_rate: { label: "Resting HR", unit: "bpm", icon: Heart },

  // Strength (1RM)
  one_rm_bench: { label: "1RM Bench", unit: "kg", icon: Dumbbell },
  one_rm_squat: { label: "1RM Squat", unit: "kg", icon: Dumbbell },
  one_rm_deadlift: { label: "1RM Deadlift", unit: "kg", icon: Dumbbell },

  // Body Parts
  shoulder: { label: "ไหล่", unit: "cm", icon: Ruler },
  chest: { label: "รอบอก", unit: "cm", icon: Ruler },
  waist: { label: "รอบเอว", unit: "cm", icon: Ruler },
  abdomen: { label: "หน้าท้อง", unit: "cm", icon: Ruler },
  hip: { label: "สะโพก", unit: "cm", icon: Ruler },
  arm_left: { label: "แขนซ้าย", unit: "cm", icon: Dumbbell }, // Keep Dumbbell for legacy support if needed, or switch to Ruler
  arm_right: { label: "แขนขวา", unit: "cm", icon: Ruler },
  thigh_left: { label: "ต้นขาซ้าย", unit: "cm", icon: Ruler },
  thigh_right: { label: "ต้นขาขวา", unit: "cm", icon: Ruler },
};

const TABS = [
  { id: "basic", label: "ร่างกาย & BMI", icon: Scale },
  { id: "body", label: "สัดส่วน", icon: Ruler },
  { id: "cardio", label: "หัวใจ-ปอด (VO₂)", icon: Heart },
  { id: "strength", label: "ความแข็งแรง (1RM)", icon: Trophy },
];

// Mapping เป้าหมายกับค่าที่ต้องกรอก
const GOAL_METRICS: any = {
  weight_loss: {
    primary: ["weight", "body_fat"],
    secondary: ["waist", "hip", "bmi"],
  },
  muscle_building: {
    primary: ["weight", "muscle"],
    secondary: ["chest", "arm_right", "thigh_right"],
  },
  strength: {
    primary: ["weight", "muscle"],
    secondary: ["body_fat"],
  },
  general_health: {
    primary: ["weight", "bmi"],
    secondary: ["body_fat", "waist"],
  },
};

// --- Main Component ---
export default function ClientProgress({ client }: ClientProgressProps) {
  // State Management
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [recordDate, setRecordDate] = useState(
    toRFC3339String(new Date()).split("T")[0],
  );
  const [formData, setFormData] = useState<MetricFormData>({});
  const [calculatedBMI, setCalculatedBMI] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [metricsData, setMetricsData] = useState<
    Record<string, ProgressRecord[]>
  >({});
  const [activeGraphMetric, setActiveGraphMetric] = useState<string | null>(
    null,
  );

  // New State for Advanced Features
  const [currentView, setCurrentView] = useState("overview");
  const [activeTab, setActiveTab] = useState("basic");
  const [calculatedVO2, setCalculatedVO2] = useState<number | null>(null);
  const [calculated1RM, setCalculated1RM] = useState<number | null>(null);
  const [cooperDist, setCooperDist] = useState("");
  const [strengthInput, setStrengthInput] = useState({
    exercise: "", // Will be set after loading
    weight: "",
    reps: "",
  });
  const [strengthExercises, setStrengthExercises] = useState<
    { id: string; label: string; unit: string }[]
  >([]);

  // [NEW] State for selected manual metrics
  const [selectedManualMetrics, setSelectedManualMetrics] = useState<string[]>(
    [],
  );

  // [NEW] Helper Functions for managing manual metrics list
  const handleAddManualMetric = (id: string) => {
    if (!id) return;
    if (!selectedManualMetrics.includes(id)) {
      setSelectedManualMetrics([...selectedManualMetrics, id]);
    }
  };

  const handleRemoveManualMetric = (idToRemove: string) => {
    setSelectedManualMetrics(
      selectedManualMetrics.filter((id) => id !== idToRemove),
    );
    // Optional: Remove from formData as well
    const newFormData = { ...formData };
    delete newFormData[idToRemove];
    setFormData(newFormData);
  };

  // Guard Clause: ถ้าไม่มี Client ให้แสดง Loading
  if (!client) {
    return (
      <div className="p-8 text-center text-gray-500">
        กำลังโหลดข้อมูลลูกค้า...
      </div>
    );
  }

  // --- Effects ---

  // 1. Load Initial Data
  useEffect(() => {
    const loadData = async () => {
      setDataLoading(true);
      try {
        const response = await api.get(`/clients/${client.id}/metrics`);
        const metrics = response.data || [];

        // แปลง response เป็น format ที่ component ต้องการ
        const organized: Record<string, ProgressRecord[]> = {};

        metrics.forEach((metric: any) => {
          if (!organized[metric.type]) {
            organized[metric.type] = [];
          }
          organized[metric.type].push({
            date: metric.date,
            value: metric.value,
          });
        });

        // Sort by date
        Object.keys(organized).forEach((key) => {
          organized[key].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );
        });

        setMetricsData(organized);
      } catch (error) {
        console.error("Load data failed", error);
        toast.error("โหลดข้อมูลไม่สำเร็จ");
        // ถ้าไม่มีข้อมูล ใช้ demo data
        generateDemoData();
      } finally {
        setDataLoading(false);
      }
    };
    if (client.id) loadData();
  }, [client.id]);

  // 1.1 Load Exercises for 1RM
  // 1.1 Load Exercises for 1RM (Filtered by Assigned Program)
  useEffect(() => {
    const fetchExercisesAndProgram = async () => {
      try {
        // A. Fetch All Exercises (Library)
        const res = await api.get("/exercises");
        const allExercises = res.data || [];

        // B. Filter for Weight Training Candidates
        const weightExercises = allExercises.filter((ex: any) => {
          const cat = (ex.category || "").toLowerCase();
          const mod = (ex.modality || "").toLowerCase();
          return (
            cat.includes("weight") ||
            mod.includes("weight") ||
            cat === "strength"
          );
        });

        // C. Fetch Assigned Program to Filter
        let validExerciseIds = new Set<number>();
        let programFound = false;

        // Try using client.currentProgram if available
        let programId = client.currentProgram;

        // If not available on prop, try finding it like ClientProgram.tsx
        if (!programId) {
          try {
            const allProgsRes = await api.get("/programs");
            const assigned = (allProgsRes.data || []).find(
              (p: any) => p.client_id === parseInt(client.id.toString()),
            );
            if (assigned) programId = assigned.id;
          } catch (e) {
            console.warn("Failed to lookup assigned program", e);
          }
        }

        if (programId) {
          try {
            const progRes = await api.get(`/programs/${programId}`);
            const schedule = progRes.data?.schedule || [];

            // Extract Exercise IDs from Schedule -> Sections -> Exercises
            schedule.forEach((day: any) => {
              if (day.Sections) {
                day.Sections.forEach((section: any) => {
                  if (section.Exercises) {
                    section.Exercises.forEach((ex: any) => {
                      // ex.exercise_id is usually the FK to exercises table
                      if (ex.exercise_id) {
                        validExerciseIds.add(ex.exercise_id);
                      }
                      // Fallback if structure differs
                      else if (ex.id) {
                        validExerciseIds.add(ex.id);
                      }
                    });
                  }
                });
              }
            });
            programFound = true;
          } catch (e) {
            console.error("Failed to fetch program details", e);
          }
        }

        // D. Filter Logic
        // If program found, only show exercises in that program.
        // If NO program found, showing NOTHING or ALL?
        // User said: "Show... assigned from the program...".
        // So if no program, likely empty list or maybe keep all 'weight' ones if we want to be lenient.
        // Let's be strict as per request: "Specific only to Weight Training exercises in assigned program".
        let finalExercises = weightExercises;

        if (programFound) {
          finalExercises = weightExercises.filter((ex: any) =>
            validExerciseIds.has(ex.id),
          );
          // If filtering results in empty (e.g. program has no weight exercises), fallback to all
          if (finalExercises.length === 0) {
            finalExercises = weightExercises;
          }
        } else {
          // Fallback: If no program assigned, show ALL weight exercises
          finalExercises = weightExercises;
        }

        // E. Map to Dropdown Format
        const mapped = finalExercises.map((ex: any) => ({
          id: `one_rm_${ex.id}`,
          label: ex.name,
          unit: "kg",
        }));

        setStrengthExercises(mapped);

        // Set default selection
        if (mapped.length > 0) {
          setStrengthInput((prev) => ({ ...prev, exercise: mapped[0].id }));
        }
      } catch (err) {
        console.error("Failed to load exercises", err);
      }
    };
    fetchExercisesAndProgram();
  }, [client.id, client.currentProgram]);

  // 2. Auto-calculate BMI
  useEffect(() => {
    const w = parseFloat(formData.weight);
    const h = parseFloat(formData.height);
    if (w > 0 && h > 0) {
      const bmi = w / Math.pow(h / 100, 2);
      setCalculatedBMI(parseFloat(bmi.toFixed(1)));
    } else {
      setCalculatedBMI(null);
    }
  }, [formData.weight, formData.height]);

  // 3. VO2 Max (Cooper) Calculation
  useEffect(() => {
    const dist = parseFloat(cooperDist);
    if (dist > 0) {
      // Formula: (Distance - 504.9) / 44.73
      const vo2 = (dist - 504.9) / 44.73;
      const result = vo2 > 0 ? parseFloat(vo2.toFixed(1)) : 0;
      setCalculatedVO2(result);
      // Update main form data automatically
      setFormData((prev) => ({
        ...prev,
        vo2_max: result.toString(),
        distance_12min: dist.toString(),
      }));
    } else {
      setCalculatedVO2(null);
    }
  }, [cooperDist]);

  // 4. 1RM Calculation
  useEffect(() => {
    const w = parseFloat(strengthInput.weight);
    const r = parseFloat(strengthInput.reps);
    if (w > 0 && r > 0) {
      // Formula: Weight * (1 + Reps/30)
      const oneRm = w * (1 + r / 30);
      const result = parseFloat(oneRm.toFixed(1));
      setCalculated1RM(result);
      // Update main form data
      setFormData((prev) => ({
        ...prev,
        [strengthInput.exercise]: result.toString(),
      }));
    } else {
      setCalculated1RM(null);
    }
  }, [strengthInput]);

  // --- Helper Functions ---

  const generateDemoData = () => {
    const demo: Record<string, ProgressRecord[]> = {};
    const keys = Object.keys(METRIC_CONFIG);

    keys.forEach((key) => {
      demo[key] = [];
      let baseValue = key === "weight" ? 75 : 50;
      // ปรับค่าเริ่มต้นตามประเภทข้อมูลเพื่อให้กราฟดูสมจริง
      if (key === "body_fat") baseValue = 25;
      if (key === "bmi") baseValue = 24;

      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const val = baseValue + (Math.random() * 2 - 1) + i * 0.2;
        demo[key].push({
          date: d.toISOString(),
          value: parseFloat(val.toFixed(1)),
        });
      }
    });
    setMetricsData(demo);
  };

  const handleInputChange = (key: string, value: string) => {
    if (value.includes("-")) return;
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const getTrendColor = (key: string, diff: number) => {
    if (diff === 0) return "text-gray-500 bg-gray-100";

    // Logic สี: ถ้าลดน้ำหนัก ค่าน้อยลง = ดี (สีเขียว)
    const goal = client.primaryGoal || client.goal || "general_health";
    const minimizeMetrics = ["weight", "body_fat", "waist", "bmi"];

    if (minimizeMetrics.includes(key) && goal === "weight_loss") {
      return diff < 0
        ? "text-green-600 bg-green-100"
        : "text-red-600 bg-red-100";
    }

    // ค่าที่ยิ่งเยอะยิ่งดี (กล้ามเนื้อ)
    const maximizeMetrics = ["muscle", "chest", "arm_left", "arm_right"];
    if (maximizeMetrics.includes(key)) {
      return diff > 0
        ? "text-green-600 bg-green-100"
        : "text-yellow-600 bg-yellow-100";
    }

    return "text-blue-600 bg-blue-100";
  };

  const handleEditMetric = (key: string, value: any) => {
    // 1. Determine Tab
    let tab = "basic";
    if (["weight", "height", "bmi", "body_fat", "muscle"].includes(key))
      tab = "basic";
    else if (
      [
        "waist",
        "hip",
        "chest",
        "shoulder",
        "abdomen",
        "arm_left",
        "arm_right",
        "thigh_left",
        "thigh_right",
      ].includes(key)
    )
      tab = "body";
    else if (["vo2_max", "distance_12min", "resting_heart_rate"].includes(key))
      tab = "cardio";
    else if (key.startsWith("one_rm_") || key.startsWith("strength"))
      tab = "strength";

    // 2. Pre-fill Data
    const valStr = value !== "-" && value !== null ? value.toString() : "";
    setFormData((prev) => ({ ...prev, [key]: valStr }));

    // 3. Handle Special Cases (Manual Strength)
    if (tab === "strength" && key.startsWith("one_rm_")) {
      // If it's a dynamic manual metric, ensure it's in the selected list
      if (!selectedManualMetrics.includes(key)) {
        setSelectedManualMetrics((prev) => [...prev, key]);
      }
      // Also ensure strengthInput dropdown (if used) matches?
      // Actually spread 'one_rm_' id to select might be needed if using the top calculator,
      // but for manual list input it just needs to be in selectedManualMetrics.
    }

    // 4. Open Modal
    setActiveTab(tab);
    setShowUpdateModal(true);
  };

  const handleSubmit = async () => {
    if (Object.keys(formData).length === 0) {
      toast.error("กรุณากรอกข้อมูลอย่างน้อย 1 รายการ");
      return;
    }

    setLoading(true);
    try {
      const payload = Object.entries(formData)
        .filter(([_, val]) => val !== "")
        .map(([key, val]) => ({
          type: key,
          value: parseFloat(val),
          date: toRFC3339String(new Date(recordDate)),
        }));

      if (calculatedBMI) {
        payload.push({
          type: "bmi",
          value: calculatedBMI,
          date: toRFC3339String(new Date(recordDate)),
        });
      }

      // API Call
      await api.post(`/clients/${client.id}/metrics`, payload);

      toast.success("บันทึกข้อมูลเรียบร้อยแล้ว");

      // Update Local State เพื่อให้กราฟขยับทันทีไม่ต้อง Refresh
      const updatedData = { ...metricsData };
      payload.forEach((p) => {
        if (!updatedData[p.type]) updatedData[p.type] = [];
        updatedData[p.type] = [
          ...updatedData[p.type],
          { date: p.date, value: p.value },
        ].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
      });
      setMetricsData(updatedData);

      setTimeout(() => {
        setShowUpdateModal(false);
        setFormData({});
        setCalculatedBMI(null);
      }, 1500);
    } catch (e) {
      console.error("Failed to save metrics", e);
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setLoading(false);
    }
  };

  // --- Render Sub-Components ---

  const renderMiniChart = (metricKey: string) => {
    const data = metricsData[metricKey] || [];
    if (data.length === 0)
      return (
        <div className="p-4 text-center text-xs text-gray-400">ไม่มีข้อมูล</div>
      );

    const min = Math.min(...data.map((d) => d.value)) * 0.95;
    const max = Math.max(...data.map((d) => d.value)) * 1.05;
    const range = max - min || 1;

    return (
      <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 w-48 absolute z-50 mt-2 right-0">
        <div className="flex justify-between mb-2">
          <span className="text-xs font-bold text-gray-600">
            ประวัติย้อนหลัง
          </span>
          <button onClick={() => setActiveGraphMetric(null)}>
            <X size={12} />
          </button>
        </div>
        <div className="h-16 flex items-end gap-1">
          {data.slice(-10).map((d, i) => {
            const h = ((d.value - min) / range) * 100;
            return (
              <div
                key={i}
                className="flex-1 bg-blue-500 rounded-t opacity-80"
                style={{ height: `${Math.max(h, 10)}%` }}
                title={`${d.value}`}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const renderInput = (key: string, required = false) => {
    let config = METRIC_CONFIG[key];

    // If not in static config, check dynamic strength exercises
    if (!config) {
      const dynamicEx = strengthExercises.find((e) => e.id === key);
      if (dynamicEx) {
        config = {
          label: `1RM ${dynamicEx.label}`,
          unit: dynamicEx.unit,
          icon: Dumbbell,
        };
      } else {
        // Fallback
        config = {
          label: key,
          unit: "",
          icon: Activity,
        };
      }
    }
    const Icon = config.icon;
    const history = metricsData[key] || [];
    const lastValue =
      history.length > 0 ? history[history.length - 1].value : null;

    // คำนวณ Trend Real-time
    const currentValue = formData[key] ? parseFloat(formData[key]) : null;
    let trendBadge = null;

    if (currentValue !== null && lastValue !== null) {
      const diff = currentValue - lastValue;
      const colorClass = getTrendColor(key, diff);
      const TrendIcon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;

      trendBadge = (
        <div
          className={`absolute right-14 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${colorClass}`}
        >
          <TrendIcon size={10} />
          {diff > 0 ? "+" : ""}
          {diff.toFixed(1)}
        </div>
      );
    }

    return (
      <div className="relative group">
        <label className="text-sm font-bold text-navy-900 mb-1.5 flex items-center gap-1.5">
          <Icon size={14} className="text-navy-600" />
          {config.label}
          {required && <span className="text-red-500">*</span>}
        </label>

        <div className="relative flex items-center">
          <input
            type="number"
            step="0.1"
            min="0"
            value={formData[key] || ""}
            onChange={(e) => handleInputChange(key, e.target.value)}
            onFocus={() => setActiveGraphMetric(null)}
            placeholder={lastValue ? `${lastValue}` : "0.0"}
            className={`w-full pl-3 pr-16 py-2.5 border rounded-xl text-navy-900 focus:ring-2 focus:ring-navy-900/10 focus:border-navy-900 outline-none transition-all
              ${formData[key] ? "border-navy-900 bg-white shadow-sm" : "border-slate-200 bg-slate-50 focus:bg-white"}
            `}
          />

          {trendBadge}

          <div className="absolute right-2 flex items-center gap-2">
            {!trendBadge && (
              <span className="text-xs text-gray-400 font-medium">
                {config.unit}
              </span>
            )}
            <div className="relative">
              <button
                onClick={() =>
                  setActiveGraphMetric(activeGraphMetric === key ? null : key)
                }
                className={`p-1.5 rounded-md ${history.length > 0 ? "text-blue-400 hover:bg-blue-50" : "text-gray-200"}`}
                disabled={history.length === 0}
              >
                <LineChartIcon size={16} />
              </button>
              {activeGraphMetric === key && renderMiniChart(key)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- Main Render ---

  // --- Helper to Normalize Goal (Thai/English Support) ---
  const normalizeGoal = (g: string | undefined) => {
    if (!g) return "general_health";
    const lower = g.toLowerCase();
    if (
      lower.includes("ลดน้ำหนัก") ||
      lower.includes("weight") ||
      lower.includes("fat loss")
    )
      return "weight_loss";
    if (
      lower.includes("กล้ามเนื้อ") ||
      lower.includes("muscle") ||
      lower.includes("hypertrophy")
    )
      return "muscle_building";
    if (
      lower.includes("แข็งแรง") ||
      lower.includes("strength") ||
      lower.includes("power")
    )
      return "strength";
    return "general_health";
  };

  const goalKey = normalizeGoal(client.primaryGoal || client.goal);
  // Fallback to general health if goal not found
  // --- Render Sub-Components ---

  const renderMainChart = () => {
    // 1. Identify which metrics to chart
    let chartMetrics: string[] = [];
    if (client.primaryGoal === "strength" || client.goal === "strength") {
      // Special logic for strength: Show 1RM of top 3 active exercises
      const activeStrength = Object.keys(metricsData)
        .filter((k) => k.startsWith("one_rm_") || k.startsWith("strength"))
        .sort(
          (a, b) => (metricsData[b].length || 0) - (metricsData[a].length || 0),
        ) // Sort by data points count
        .slice(0, 3);

      if (activeStrength.length > 0) {
        chartMetrics = activeStrength;
      } else {
        // Fallback
        chartMetrics = ["weight", "muscle"];
      }
    } else {
      // Default to primary goal metrics
      chartMetrics = dashboardMetrics.primary;
    }

    if (chartMetrics.length === 0) return null;

    // 2. Prepare Data (Combine by Date)
    const dateMap: Record<string, any> = {};
    chartMetrics.forEach((key) => {
      const history = metricsData[key] || [];
      history.forEach((rec) => {
        const dateStr = rec.date.split("T")[0];
        if (!dateMap[dateStr]) {
          dateMap[dateStr] = {
            date: dateStr,
            displayDate: new Date(rec.date).toLocaleDateString("th-TH", {
              day: "numeric",
              month: "short",
            }),
          };
        }
        dateMap[dateStr][key] = rec.value;
      });
    });

    const chartData = Object.values(dateMap).sort(
      (a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    if (chartData.length < 2) return null; // Not enough data to show a line

    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-6">
        <h3 className="text-lg font-bold text-navy-900 mb-6 flex items-center gap-2">
          <TrendingUp className="text-navy-600" size={20} />
          แนวโน้มพัฒนาการ (
          {chartMetrics
            .map(
              (k) =>
                METRIC_CONFIG[k]?.label ||
                strengthExercises.find((e) => e.id === k)?.label ||
                k,
            )
            .join(", ")}
          )
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E2E8F0"
              />
              <XAxis
                dataKey="displayDate"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94A3B8", fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94A3B8", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Legend wrapperStyle={{ paddingTop: "20px" }} />
              {chartMetrics.map((key, index) => {
                const config = METRIC_CONFIG[key] || { label: key };
                // Try to find dynamic label
                let label = config.label;
                if (!METRIC_CONFIG[key]) {
                  const dyn = strengthExercises.find((e) => e.id === key);
                  if (dyn) label = dyn.label;
                }

                const colors = ["#1e293b", "#ea580c", "#3b82f6", "#10b981"]; // Navy, Orange, Blue, Emerald
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={label}
                    stroke={colors[index % colors.length]}
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      strokeWidth: 2,
                      fill: "#fff",
                      stroke: colors[index % colors.length],
                    }}
                    activeDot={{
                      r: 6,
                      strokeWidth: 0,
                      fill: colors[index % colors.length],
                    }}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const dashboardMetrics = GOAL_METRICS[goalKey] || GOAL_METRICS.general_health;

  // Prepare data for details view
  // Prepare data for details view
  const allMetricKeys = Array.from(
    new Set([
      ...dashboardMetrics.primary,
      ...(dashboardMetrics.secondary || []),
      ...Object.keys(metricsData),
    ]),
  );

  const metricsDetailData = allMetricKeys.map((key) => {
    let config = METRIC_CONFIG[key];

    // Check dynamic strength exercises if not in static config
    if (!config) {
      const dynamicEx = strengthExercises.find((e) => e.id === key);
      if (dynamicEx) {
        config = {
          label: `1RM ${dynamicEx.label}`,
          unit: dynamicEx.unit,
          icon: Dumbbell,
        };
      } else {
        config = { label: key, unit: "", icon: Activity };
      }
    }

    const history = metricsData[key] || [];
    const latest = history.length > 0 ? history[history.length - 1] : null;

    return {
      key: key,
      label: config.label,
      date: latest
        ? `updated on ${new Date(latest.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        : "-",
      value: latest ? latest.value : "-",
      unit: config.unit,
    };
  });

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 bg-gray-50 min-h-screen font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">
            บันทึกพัฒนาการ (Client Progress)
          </h1>
          <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-medium text-xs">
              เป้าหมาย: {client.goal || "ทั่วไป"}
            </span>
            <span>
              • อัปเดตล่าสุด: {new Date().toLocaleDateString("th-TH")}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowUpdateModal(true)}
          className="flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white px-5 py-3 rounded-full shadow-lg shadow-navy-900/20 transition-all active:scale-95 text-sm font-medium"
        >
          <Scale size={18} />
          <span>อัปเดตข้อมูลร่างกาย</span>
        </button>
      </div>
      {/* Dashboard Cards / Metrics Detail Switch */}
      {currentView === "overview" ? (
        <>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2">
              <div className="h-6 w-1 bg-navy-900 rounded-full" />
              Metrics Overview
            </h2>
            <button
              onClick={() => setCurrentView("details")}
              className="text-navy-600 text-xs font-medium hover:underline flex items-center gap-1"
            >
              ดูรายละเอียด <ChevronRight size={14} />
            </button>
          </div>

          {/* Progress Chart */}
          {renderMainChart()}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ...dashboardMetrics.primary,
                ...(dashboardMetrics.secondary || []),
              ].map((key: string) => {
                const config = METRIC_CONFIG[key] || {
                  label: key,
                  unit: "",
                  icon: Activity,
                };
                const Icon = config.icon;
                const history = metricsData[key] || [];
                const latest =
                  history.length > 0 ? history[history.length - 1].value : "-";
                const prev =
                  history.length > 1 ? history[history.length - 2].value : null;

                let trend = null;
                if (typeof latest === "number" && prev) {
                  const diff = latest - prev;
                  const colorClass = getTrendColor(key, diff);
                  trend = (
                    <span
                      className={`text-xs font-bold px-1.5 py-0.5 rounded ${colorClass}`}
                    >
                      {diff > 0 ? "↑" : "↓"} {Math.abs(diff).toFixed(1)}
                    </span>
                  );
                }

                return (
                  <div
                    key={key}
                    className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-orange-100 transition-all group cursor-default"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 text-slate-500">
                        <div className="p-2.5 bg-slate-50 rounded-xl text-navy-600 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                          <Icon size={18} />
                        </div>
                      </div>
                      {trend}
                    </div>
                    <div className="mt-2">
                      <p className="text-sm font-medium text-slate-500">
                        {config.label}
                      </p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-bold text-navy-900">
                          {latest}
                        </span>
                        <span className="text-sm text-slate-400">
                          {config.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* Metrics List View */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <button
              onClick={() => setCurrentView("overview")}
              className="p-1 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-slate-600" />
            </button>
            <h2 className="text-lg font-bold text-navy-900">Metrics Details</h2>
          </div>
          {metricsDetailData.map((item, index) => (
            <div
              key={index}
              onClick={() => handleEditMetric(item.key, item.value)}
              className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                index !== metricsDetailData.length - 1
                  ? "border-b border-gray-100"
                  : ""
              }`}
            >
              <div>
                <p className="text-gray-900 font-bold text-sm">{item.label}</p>
                <p className="text-gray-400 text-xs mt-0.5">{item.date}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-900 font-bold text-base">
                  {item instanceof Object && "value" in item ? item.value : "-"}{" "}
                  <span className="text-sm font-normal text-gray-500">
                    {item.unit}
                  </span>
                </span>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="bg-navy-50 p-2.5 rounded-xl text-navy-900">
                  <Calculator size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-navy-900">
                    บันทึกผลการทดสอบ
                  </h2>
                  <p className="text-xs text-gray-500">
                    เลือกหมวดหมู่ที่ต้องการบันทึก
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="text-sm bg-white border px-2 py-1 rounded-md outline-none"
                  max={new Date().toISOString().split("T")[0]}
                />
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Tabs Header - Metrics H2 removed, Scrollbar hidden, Padding added to prevent clipping */}
            <div className="flex overflow-x-auto border-b border-slate-100 bg-white [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden px-2 pt-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border-b-2 flex-shrink-0 ${
                      activeTab === tab.id
                        ? "border-navy-900 text-navy-900 bg-slate-50"
                        : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
              {/* Tab 1: Basic Info & BMI */}
              {activeTab === "basic" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {renderInput("weight", true)}
                    {renderInput("height", true)}
                  </div>

                  {/* 🆕 Extra Body Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    {renderInput("body_fat")}
                    {renderInput("muscle")}
                  </div>

                  {/* BMI Widget */}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
                        BMI (Auto Calc)
                      </div>
                      {calculatedBMI ? (
                        <div className="flex items-center gap-2">
                          <span className="text-3xl font-bold text-indigo-700">
                            {calculatedBMI}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              calculatedBMI < 18.5
                                ? "bg-amber-200 text-amber-800"
                                : calculatedBMI < 23
                                  ? "bg-emerald-200 text-emerald-800"
                                  : "bg-rose-200 text-rose-800"
                            }`}
                          >
                            {calculatedBMI < 18.5
                              ? "ผอม"
                              : calculatedBMI < 23
                                ? "สมส่วน"
                                : "ท้วม/อ้วน"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-indigo-300 text-sm">
                          กรอกน้ำหนักและส่วนสูง
                        </span>
                      )}
                    </div>
                    <Activity className="text-indigo-200" size={40} />
                  </div>
                </div>
              )}

              {/* Tab 2: Body Proportions */}
              {activeTab === "body" && (
                <div className="space-y-6">
                  <div className="bg-white p-4 rounded-xl border border-gray-100">
                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 pb-2 border-b">
                      ท่อนบน (Upper Body)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {renderInput("shoulder")}
                      {renderInput("chest")}
                      {renderInput("arm_right")}
                      {renderInput("arm_left")}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-100">
                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 pb-2 border-b">
                      ท่อนล่าง (Lower Body)
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {renderInput("waist")}
                      {renderInput("hip")}
                      {renderInput("abdomen")}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      {renderInput("thigh_right")}
                      {renderInput("thigh_left")}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Cardio (VO2 Max) */}
              {activeTab === "cardio" && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4 text-blue-800 font-bold">
                      <Activity size={18} /> Cooper Test Calculator (12 min)
                    </div>

                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="text-xs text-blue-600 font-medium mb-1 block">
                          ระยะทางที่วิ่งได้ (เมตร)
                        </label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          placeholder="เช่น 2400"
                          value={cooperDist}
                          onChange={(e) => setCooperDist(e.target.value)}
                        />
                      </div>
                      <div className="pb-2">
                        <ArrowRight className="text-blue-300" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-blue-600 font-medium mb-1 block">
                          VO₂ Max (Auto)
                        </label>
                        <div className="bg-white px-3 py-2 border border-blue-200 rounded-lg h-[42px] flex items-center font-bold text-blue-700">
                          {calculatedVO2 || "-"}
                        </div>
                      </div>
                    </div>

                    {calculatedVO2 && calculatedVO2 > 0 && (
                      <div className="mt-3 text-xs text-blue-600 bg-blue-100/50 p-2 rounded">
                        สูตรคำนวณ: (ระยะทาง - 504.9) / 44.73
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-gray-50 px-2 text-gray-400">
                        หรือกรอกเอง
                      </span>
                    </div>
                  </div>

                  {renderInput("vo2_max")}
                  {renderInput("resting_heart_rate")}
                </div>
              )}

              {/* Tab 4: Strength (1RM) */}
              {activeTab === "strength" && (
                <div className="space-y-6">
                  <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4 text-orange-900 font-bold">
                      <Dumbbell size={18} /> 1RM Calculator
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-orange-700 font-bold mb-1.5 block">
                          เลือกท่า
                        </label>
                        <select
                          className="w-full px-3 py-2.5 border border-orange-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-orange-500/20 text-navy-900"
                          value={strengthInput.exercise}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            setStrengthInput({
                              ...strengthInput,
                              exercise: selectedId,
                            });
                            handleAddManualMetric(selectedId);
                          }}
                        >
                          {strengthExercises.map((ex) => (
                            <option key={ex.id} value={ex.id}>
                              {ex.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-orange-700 font-bold mb-1.5 block">
                            น้ำหนักที่ยก (kg)
                          </label>
                          <input
                            type="number"
                            className="w-full px-3 py-2.5 border border-orange-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-orange-500/20 text-navy-900"
                            value={strengthInput.weight}
                            onChange={(e) =>
                              setStrengthInput({
                                ...strengthInput,
                                weight: e.target.value,
                              })
                            }
                            placeholder="80"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-orange-700 font-bold mb-1.5 block">
                            จำนวนครั้ง (Reps)
                          </label>
                          <input
                            type="number"
                            className="w-full px-3 py-2.5 border border-orange-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-orange-500/20 text-navy-900"
                            value={strengthInput.reps}
                            onChange={(e) =>
                              setStrengthInput({
                                ...strengthInput,
                                reps: e.target.value,
                              })
                            }
                            placeholder="8"
                          />
                        </div>
                      </div>

                      {calculated1RM && (
                        <div className="mt-2 bg-white p-3 rounded-xl border border-orange-200 shadow-sm flex justify-between items-center animate-in zoom-in duration-300">
                          <span className="text-sm text-orange-700 font-bold">
                            Estimated 1RM:
                          </span>
                          <span className="text-xl font-bold text-orange-600">
                            {calculated1RM} kg
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-xs font-bold text-slate-400 uppercase">
                        บันทึกสถิติท่าอื่น ๆ (Manual Record)
                      </p>
                    </div>

                    {/* Dynamic List */}
                    <div className="space-y-4">
                      {selectedManualMetrics.length > 0 ? (
                        selectedManualMetrics.map((exerciseId) => (
                          <div
                            key={exerciseId}
                            className="flex items-end gap-2 animate-in slide-in-from-top-2 duration-200"
                          >
                            <div className="flex-1">
                              {renderInput(exerciseId)}
                            </div>
                            <button
                              onClick={() =>
                                handleRemoveManualMetric(exerciseId)
                              }
                              className="mb-[2px] p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="ลบรายการนี้"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                          <p className="text-sm text-slate-400">
                            ยังไม่มีรายการที่เลือก
                          </p>
                          <p className="text-xs text-slate-300 mt-1">
                            เลือกท่าจากเมนูด้านบนเพื่อบันทึกสถิติเพิ่ม
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="pb-20"></div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => setShowUpdateModal(false)}
                className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-2.5 bg-navy-900 hover:bg-navy-800 text-white font-medium rounded-xl shadow-lg shadow-navy-900/20 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                บันทึกข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
