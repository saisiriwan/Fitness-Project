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
import api from "@/lib/api";
import { toast } from "sonner";
import { toRFC3339String } from "@/lib/utils";

import type { Client } from "../ClientProfilePage";

/* ==========================================================================
   Interface: ClientProgressProps
   ใช้สำหรับ: ทุกหน้า — เป็น props หลักที่รับข้อมูล client เข้ามาใช้ทั้ง component
   ========================================================================== */
interface ClientProgressProps {
  client: Client;
}

/* Interface: ProgressRecord
   ใช้สำหรับ: ทุกหน้า — โครงสร้างข้อมูลบันทึก metric แต่ละจุด (วันที่ + ค่า)
   ใช้ใน: กราฟ Overview, Mini Chart Popup, Metrics Details List */
interface ProgressRecord {
  date: string;
  value: number;
}

/* Interface: MetricFormData
   ใช้สำหรับ: หน้า Update Modal — เก็บค่าที่ผู้ใช้กรอกในฟอร์มบันทึกข้อมูลร่างกาย */
interface MetricFormData {
  [key: string]: string;
}

/* ==========================================================================
   Config: METRIC_CONFIG
   ใช้สำหรับ: ทุกหน้า — กำหนด label (ชื่อ), unit (หน่วย), icon สำหรับ metric แต่ละตัว
   ถูกใช้ใน: Overview Cards, Details List, Update Modal inputs, กราฟ
   ========================================================================== */
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

/* Config: TABS
   ใช้สำหรับ: หน้า Update Modal — แท็บด้านบนของ Modal สำหรับสลับหมวดหมู่
   (ร่างกาย & BMI / สัดส่วน / หัวใจ-ปอด / ความแข็งแรง) */
const TABS = [
  { id: "basic", label: "ร่างกาย & BMI", icon: Scale },
  { id: "body", label: "สัดส่วน", icon: Ruler },
  { id: "cardio", label: "หัวใจ-ปอด (VO₂)", icon: Heart },
  { id: "strength", label: "ความแข็งแรง (1RM)", icon: Trophy },
];

/* ==========================================================================
   Main Component: ClientProgress
   เป็น component หลักของทั้งหน้า — ประกอบด้วย 3 ส่วน UI ใหญ่:
     1. หน้า Overview    → แสดง Metric Cards + กราฟแนวโน้ม (currentView === "overview")
     2. หน้า Details     → แสดงรายการ Metrics ทั้งหมดแบบ List (currentView === "details")
     3. Update Modal     → Popup form สำหรับกรอก/บันทึกข้อมูลร่างกาย (showUpdateModal === true)
   ========================================================================== */
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

  /* ฟังก์ชัน: handleAddManualMetric
     ใช้สำหรับ: หน้า Update Modal → แท็บ "ความแข็งแรง (1RM)"
     หน้าที่: เพิ่ม exercise เข้าลิสต์ "บันทึกสถิติท่าอื่นๆ" (Manual Record) ใน Strength tab */
  const handleAddManualMetric = (id: string) => {
    // ถ้า id ว่าง → ไม่ทำอะไร (ป้องกัน error จาก dropdown ที่ยังไม่ได้เลือก)
    if (!id) return;
    // เช็คว่าท่านี้ถูกเพิ่มไปแล้วยัง → ถ้ายังไม่มีให้เพิ่มเข้า list
    // (ป้องกันเพิ่มท่าซ้ำ)
    if (!selectedManualMetrics.includes(id)) {
      // สร้าง array ใหม่ = ของเดิม + id ที่เพิ่ง → อัปเดต state
      setSelectedManualMetrics([...selectedManualMetrics, id]);
    }
  };

  /* ฟังก์ชัน: handleRemoveManualMetric
     ใช้สำหรับ: หน้า Update Modal → แท็บ "ความแข็งแรง (1RM)"
     หน้าที่: ลบ exercise ออกจากลิสต์ Manual Record + ลบค่าออกจาก formData */
  const handleRemoveManualMetric = (idToRemove: string) => {
    // กรองเอาท่าที่ต้องการลบออกจาก list (เก็บเฉพาะท่าที่ id ไม่ตรงกับ idToRemove)
    setSelectedManualMetrics(
      selectedManualMetrics.filter((id) => id !== idToRemove),
    );
    // ลบค่าออกจาก formData ด้วย เพื่อไม่ให้ค่าเก่าถูกส่งไป API
    const newFormData = { ...formData }; // copy formData เดิม
    delete newFormData[idToRemove]; // ลบ key ของท่าที่ถอดออก
    setFormData(newFormData); // อัปเดต state ใหม่
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

  /* useEffect: loadData (โหลดข้อมูล metric ทั้งหมดจาก API)
     ใช้สำหรับ: ทุกหน้า — ดึงข้อมูล metrics ของลูกค้าจาก backend แล้วจัดเก็บใน state
     ข้อมูลนี้ถูกนำไปใช้ใน: Overview Cards, กราฟแนวโน้ม, Details List, Mini Chart Popup */
  useEffect(() => {
    const loadData = async () => {
      // เปิดสถานะ loading → แสดง spinner ใน UI
      setDataLoading(true);
      try {
        // เรียก API ดึง metrics ทั้งหมดของลูกค้า (weight, body_fat, muscle ฯลฯ)
        const response = await api.get(`/clients/${client.id}/metrics`);
        // ถ้า response ไม่มี data ให้ใช้ array ว่าง (ป้องกัน null)
        const metrics = response.data || [];

        // แปลง response จาก flat array → จัดกลุ่มตาม type
        // เช่น [{type:"weight", value:70}, {type:"weight", value:68}, {type:"body_fat", value:20}]
        // → { weight: [{date, value:70}, {date, value:68}], body_fat: [{date, value:20}] }
        const organized: Record<string, ProgressRecord[]> = {};

        metrics.forEach((metric: any) => {
          // ถ้ายังไม่มี key นี้ใน organized → สร้าง array ว่างก่อน
          if (!organized[metric.type]) {
            organized[metric.type] = [];
          }
          // เพิ่ม { date, value } เข้าไปในกลุ่มที่ตรงกับ type
          organized[metric.type].push({
            date: metric.date,
            value: metric.value,
          });
        });

        // เรียงข้อมูลในแต่ละ metric ตามวันที่ (เก่า → ใหม่)
        // จำเป็นเพราะกราฟต้อง plot จากซ้ายไปขวาตามเวลา
        Object.keys(organized).forEach((key) => {
          organized[key].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );
        });

        // เก็บข้อมูลที่จัดระเบียบแล้วใน state → ทุก UI จะ re-render ด้วยข้อมูลใหม่
        setMetricsData(organized);
      } catch (error) {
        console.error("Load data failed", error);
        toast.error("โหลดข้อมูลไม่สำเร็จ");
        // ถ้า API ล้มเหลว → ใช้ข้อมูลจำลอง (demo) แทน เพื่อไม่ให้หน้าว่างเปล่า
        generateDemoData();
      } finally {
        // ปิดสถานะ loading ไม่ว่าจะสำเร็จหรือ error → ซ่อน spinner
        setDataLoading(false);
      }
    };
    // เรียก loadData เฉพาะเมื่อมี client.id (ป้องกันเรียก API ตอนที่ยังไม่มีข้อมูลลูกค้า)
    if (client.id) loadData();
  }, [client.id]);

  /* useEffect: fetchExercisesAndProgram (โหลด exercises สำหรับ 1RM)
     ใช้สำหรับ: หน้า Update Modal → แท็บ "ความแข็งแรง (1RM)"
     หน้าที่: ดึงรายการท่าออกกำลังกาย (Weight Training) จาก API
     แล้วกรองเฉพาะท่าที่อยู่ในโปรแกรมที่ assign ให้ลูกค้า → ใช้แสดงเป็น dropdown ใน 1RM Calculator */
  useEffect(() => {
    const fetchExercisesAndProgram = async () => {
      try {
        // A. ดึงรายการท่าออกกำลังกายทั้งหมดจาก Exercise Library
        const res = await api.get("/exercises");
        const allExercises = res.data || [];

        // B. กรองเฉพาะท่า Weight Training (เพราะ 1RM ใช้กับการยกน้ำหนักเท่านั้น)
        // เช็คจาก category หรือ modality ว่าเป็น "weight" หรือ "strength"
        const weightExercises = allExercises.filter((ex: any) => {
          const cat = (ex.category || "").toLowerCase();
          const mod = (ex.modality || "").toLowerCase();
          return (
            cat.includes("weight") ||
            mod.includes("weight") ||
            cat === "strength"
          );
        });

        // C. ดึงโปรแกรมที่ assign ให้ลูกค้า เพื่อกรองเฉพาะท่าที่อยู่ในโปรแกรม
        let validExerciseIds = new Set<number>(); // เก็บ ID ของท่าที่อยู่ในโปรแกรม
        let programFound = false; // flag ว่าเจอโปรแกรมหรือยัง

        // ลองใช้ client.currentProgram ก่อน
        let programId = client.currentProgram;

        // ถ้าไม่มีใน prop → ค้นหาจากรายการโปรแกรมทั้งหมด (fallback)
        if (!programId) {
          try {
            const allProgsRes = await api.get("/programs");
            // หาโปรแกรมที่ client_id ตรงกับลูกค้าคนนี้
            const assigned = (allProgsRes.data || []).find(
              (p: any) => p.client_id === parseInt(client.id.toString()),
            );
            if (assigned) programId = assigned.id;
          } catch (e) {
            console.warn("Failed to lookup assigned program", e);
          }
        }

        // ถ้าเจอ programId → ดึงรายละเอียดโปรแกรมเพื่อดึง exercise IDs
        if (programId) {
          try {
            const progRes = await api.get(`/programs/${programId}`);
            const schedule = progRes.data?.schedule || [];

            // วนลูป: schedule → days → sections → exercises → ดึง exercise_id
            schedule.forEach((day: any) => {
              if (day.Sections) {
                day.Sections.forEach((section: any) => {
                  if (section.Exercises) {
                    section.Exercises.forEach((ex: any) => {
                      // เก็บ exercise_id (FK ที่ชี้ไปตาราง exercises)
                      if (ex.exercise_id) {
                        validExerciseIds.add(ex.exercise_id);
                      }
                      // Fallback ถ้าโครงสร้างต่างจากที่คาด
                      else if (ex.id) {
                        validExerciseIds.add(ex.id);
                      }
                    });
                  }
                });
              }
            });
            programFound = true; // พบโปรแกรมแล้ว
          } catch (e) {
            console.error("Failed to fetch program details", e);
          }
        }

        // D. กรองท่าตามโปรแกรม
        let finalExercises = weightExercises;

        if (programFound) {
          // ถ้ามีโปรแกรม → กรองเฉพาะท่าที่อยู่ในโปรแกรม
          finalExercises = weightExercises.filter((ex: any) =>
            validExerciseIds.has(ex.id),
          );
          // ถ้ากรองแล้วว่าง (โปรแกรมไม่มีท่า weight) → ใช้ทั้งหมดแทน
          if (finalExercises.length === 0) {
            finalExercises = weightExercises;
          }
        } else {
          // ไม่มีโปรแกรม → แสดงท่า Weight Training ทั้งหมด
          finalExercises = weightExercises;
        }

        // E. แปลงเป็น format สำหรับ Dropdown (id ใช้คำนำหน้า "one_rm_" เพื่อแยก metric ประเภท 1RM)
        const mapped = finalExercises.map((ex: any) => ({
          id: `one_rm_${ex.id}`, // prefix "one_rm_" + exercise ID
          label: ex.name, // ชื่อท่า เช่น "Bench Press"
          unit: "kg", // หน่วยเป็น kg ทั้งหมด
        }));

        // เก็บรายการท่าเข้า state สำหรับแสดงใน dropdown
        setStrengthExercises(mapped);

        // ตั้งค่าเริ่มต้นใน dropdown เป็นท่าแรกในรายการ
        if (mapped.length > 0) {
          setStrengthInput((prev) => ({ ...prev, exercise: mapped[0].id }));
        }
      } catch (err) {
        console.error("Failed to load exercises", err);
      }
    };
    // เรียกทันทีที่ component mount + เมื่อ client.id หรือ currentProgram เปลี่ยน
    fetchExercisesAndProgram();
  }, [client.id, client.currentProgram]);

  /* useEffect: Auto-calculate BMI
     ใช้สำหรับ: หน้า Update Modal → แท็บ "ร่างกาย & BMI"
     หน้าที่: คำนวณ BMI อัตโนมัติเมื่อผู้ใช้กรอกน้ำหนัก + ส่วนสูง → แสดงผลใน BMI Widget */
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

  /* useEffect: VO2 Max (Cooper) Calculation
     ใช้สำหรับ: หน้า Update Modal → แท็บ "หัวใจ-ปอด (VO₂)"
     หน้าที่: คำนวณ VO₂ Max จากระยะวิ่ง 12 นาที (Cooper Test) → แสดงผลใน Cooper Test Calculator */
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
      setFormData((prev) => {
        const newData = { ...prev };
        delete newData.vo2_max;
        delete newData.distance_12min;
        return newData;
      });
    }
  }, [cooperDist]);

  /* useEffect: 1RM Calculation
     ใช้สำหรับ: หน้า Update Modal → แท็บ "ความแข็งแรง (1RM)"
     หน้าที่: คำนวณ Estimated 1RM จาก น้ำหนัก × (1 + จำนวนครั้ง/30)
     แสดงผลใน 1RM Calculator widget */
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
      setFormData((prev) => {
        const newData = { ...prev };
        if (strengthInput.exercise) {
          delete newData[strengthInput.exercise];
        }
        return newData;
      });
    }
  }, [strengthInput]);

  // --- Helper Functions ---

  /* ฟังก์ชัน: generateDemoData
     ใช้สำหรับ: ทุกหน้า (fallback)
     หน้าที่: สร้างข้อมูลจำลอง (demo data) เมื่อ API โหลดไม่สำเร็จ → ใช้แสดงกราฟและ cards ตัวอย่าง */
  const generateDemoData = () => {
    // สร้าง object เปล่าสำหรับเก็บ demo data ทุก metric
    const demo: Record<string, ProgressRecord[]> = {};
    // ดึงชื่อ metric ทั้งหมดจาก config (weight, body_fat, muscle, bmi ฯลฯ)
    const keys = Object.keys(METRIC_CONFIG);

    // สร้างข้อมูลจำลองสำหรับแต่ละ metric
    keys.forEach((key) => {
      demo[key] = []; // สร้าง array ว่างสำหรับ metric นี้
      // กำหนดค่าเริ่มต้น (base) ให้สมจริงตามประเภท
      let baseValue = key === "weight" ? 75 : 50; // น้ำหนักเริ่ม 75kg, อื่นๆ 50
      if (key === "body_fat") baseValue = 25; // ไขมัน 25%
      if (key === "bmi") baseValue = 24; // BMI 24 (ปกติ)

      // สร้าง 6 จุดข้อมูล (ย้อนหลัง 5 เดือน → ปัจจุบัน)
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i); // เดือนย้อนหลัง i เดือน
        // สุ่มค่า: base + สุ่ม(-1 ถึง +1) + trend ลดเล็กน้อย (i*0.2 ทำให้ค่าอดีตสูงกว่าปัจจุบัน)
        const val = baseValue + (Math.random() * 2 - 1) + i * 0.2;
        demo[key].push({
          date: d.toISOString(), // วันที่ในรูปแบบ ISO
          value: parseFloat(val.toFixed(1)), // ปัดเศษ 1 ตำแหน่ง
        });
      }
    });
    // เก็บ demo data ใน state → UI จะแสดงกราฟตัวอย่าง
    setMetricsData(demo);
  };

  /* ฟังก์ชัน: handleInputChange
     ใช้สำหรับ: หน้า Update Modal → ทุกแท็บ (ทุก input field ในฟอร์ม)
     หน้าที่: อัปเดตค่าใน formData เมื่อผู้ใช้พิมพ์ตัวเลข (ป้องกันค่าติดลบ) */
  const handleInputChange = (key: string, value: string) => {
    // key = ชื่อ metric เช่น "weight", "body_fat"
    // value = ค่าที่ผู้ใช้พิมพ์ เช่น "72.5"

    // ป้องกันค่าติดลบ: ถ้า value มีเครื่องหมาย "-" → ไม่อัปเดต (ไม่มี metric ที่ค่าติดลบ)
    if (value.includes("-")) return;
    // อัปเดต formData: ใช้ spread operator คงค่าเดิม + เพิ่ม/แก้เฉพาะ key ที่เปลี่ยน
    // เช่น prev = {weight:"70"} → key="body_fat", value="20" → result = {weight:"70", body_fat:"20"}
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  /* ฟังก์ชัน: getTrendColor
     ใช้สำหรับ: หน้า Overview (Metric Cards - ลูกศรขึ้น/ลง) + หน้า Update Modal (Trend Badge ข้าง input)
     หน้าที่: กำหนดสีของ trend indicator ตามเป้าหมายลูกค้า
     เช่น ลดน้ำหนัก → น้ำหนักลด = สีเขียว, สร้างกล้ามเนื้อ → กล้ามเนื้อเพิ่ม = สีเขียว */
  const getTrendColor = (key: string, diff: number) => {
    // key = ชื่อ metric ที่ต้องการเช็ค เช่น "weight", "muscle", "body_fat"
    // diff = ผลต่างระหว่างค่าล่าสุดกับค่าก่อนหน้า (เช่น -2 = ลดลง 2, +3 = เพิ่มขึ้น 3)

    // ถ้า diff === 0 (ค่าเท่าเดิม ไม่เปลี่ยนแปลง) → คืนสีเทา (ไม่ดีไม่แย่)
    if (diff === 0) return "text-gray-500 bg-gray-100";

    // ดึงเป้าหมายของลูกค้า: ลอง primaryGoal ก่อน → ถ้าไม่มีใช้ goal → ถ้าไม่มีเลยใช้ "general_health"
    const goal = client.primaryGoal || client.goal || "general_health";

    // กลุ่มที่ 1: metric ที่ "ยิ่งน้อยยิ่งดี" (ลดน้ำหนัก/ไขมัน/รอบเอว/BMI)
    // ใช้เฉพาะกับเป้าหมาย weight_loss เท่านั้น
    const minimizeMetrics = ["weight", "body_fat", "waist", "bmi"];

    // เช็คว่า metric นี้อยู่ในกลุ่ม "ยิ่งน้อยยิ่งดี" + เป้าหมายเป็นลดน้ำหนัก
    if (minimizeMetrics.includes(key) && goal === "weight_loss") {
      return diff < 0
        ? "text-green-600 bg-green-100" // diff < 0 = ค่าลดลง = ดี → สีเขียว ✅
        : "text-red-600 bg-red-100"; // diff > 0 = ค่าเพิ่มขึ้น = ไม่ดี → สีแดง ❌
    }

    // กลุ่มที่ 2: metric ที่ "ยิ่งเยอะยิ่งดี" (กล้ามเนื้อ/รอบอก/แขน)
    // ใช้ได้ทุกเป้าหมาย (ไม่เช็ค goal)
    const maximizeMetrics = ["muscle", "chest", "arm_left", "arm_right"];
    if (maximizeMetrics.includes(key)) {
      return diff > 0
        ? "text-green-600 bg-green-100" // diff > 0 = ค่าเพิ่มขึ้น = ดี → สีเขียว ✅
        : "text-yellow-600 bg-yellow-100"; // diff < 0 = ค่าลดลง = ควรระวัง → สีเหลือง ⚠️ (ไม่ใช่สีแดง เพราะอาจเป็นเรื่องปกติ)
    }

    // กลุ่มที่ 3: metric อื่นๆ ที่ไม่จัดกลุ่ม (เช่น heart_rate, height, thigh)
    // → คืนสีน้ำเงิน = แสดงว่ามีการเปลี่ยนแปลง แต่ไม่ตัดสินว่าดี/แย่
    return "text-blue-600 bg-blue-100";
  };

  /* ฟังก์ชัน: handleEditMetric
     ใช้สำหรับ: หน้า Details → เมื่อกดที่รายการ metric
     หน้าที่: เปิด Update Modal พร้อม pre-fill ค่าเดิม + สลับไปแท็บที่ตรงกับ metric ที่กด
     เช่น กด "รอบเอว" → เปิด Modal ที่แท็บ "สัดส่วน" + กรอกค่ารอบเอวเดิมให้ */
  const handleEditMetric = (key: string, value: any) => {
    // key = ชื่อ metric เช่น "weight", "waist", "one_rm_5"
    // value = ค่าล่าสุดที่บันทึกไว้ เช่น 70 หรือ null

    // 1. กำหนดแท็บที่ตรงกับ metric นี้
    // เพื่อเปิด Modal ไปที่แท็บที่ถูกต้องทันที
    let tab = "basic"; // ค่าเริ่มต้น = basic
    // ถ้าเป็น metric พื้นฐาน (น้ำหนัก/ส่วนสูง/BMI/ไขมัน/กล้ามเนื้อ) → แท็บ basic
    if (["weight", "height", "bmi", "body_fat", "muscle"].includes(key))
      tab = "basic";
    // ถ้าเป็น metric สัดส่วน (รอบเอว/สะโพก/รอบอก/แขน/ต้นขา) → แท็บ body
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
    // ถ้าเป็น metric หัวใจ-ปอด (VO₂/ระยะวิ่ง/ชีพจรหัวใจ) → แท็บ cardio
    else if (["vo2_max", "distance_12min", "resting_heart_rate"].includes(key))
      tab = "cardio";
    // ถ้าชื่อขึ้นต้นด้วย "one_rm_" หรือ "strength" → แท็บ strength
    else if (key.startsWith("one_rm_") || key.startsWith("strength"))
      tab = "strength";

    // 2. Pre-fill ค่าเดิมลงใน formData
    // แปลงค่าเป็น string (ถ้าเป็น "-" หรือ null ให้ใช้ "" แทน)
    const valStr = value !== "-" && value !== null ? value.toString() : "";
    // เพิ่มหรือแก้ค่าใน formData สำหรับ key นี้
    setFormData((prev) => ({ ...prev, [key]: valStr }));

    // 3. กรณีพิเศษ: ถ้าเป็นท่า Strength แบบ Manual (one_rm_xxx)
    if (tab === "strength" && key.startsWith("one_rm_")) {
      // ต้องอยู่ใน selectedManualMetrics ด้วย เพื่อแสดง input field
      if (!selectedManualMetrics.includes(key)) {
        setSelectedManualMetrics((prev) => [...prev, key]);
      }
    }

    // 4. เปิด Modal ที่แท็บที่ถูกต้อง
    setActiveTab(tab); // สลับไปแท็บที่ตรงกับ metric
    setShowUpdateModal(true); // เปิด Modal
  };

  /* ฟังก์ชัน: handleSubmit
     ใช้สำหรับ: หน้า Update Modal → ปุ่ม "บันทึกข้อมูล" (Footer)
     หน้าที่: รวบรวมข้อมูลจาก formData + BMI ที่คำนวณ → ส่ง POST ไป API
     → อัปเดต state ให้กราฟและ cards ขยับทันทีโดยไม่ต้อง refresh หน้า */
  const handleSubmit = async () => {
    // เช็คว่ามีข้อมูลอย่างน้อย 1 รายการหรือไม่ (ป้องกันกดบันทึกโดยไม่กรอกอะไรเลย)
    if (Object.keys(formData).length === 0) {
      toast.error("กรุณากรอกข้อมูลอย่างน้อย 1 รายการ");
      return;
    }

    // เปิด loading state → ปุ่มจะแสดง spinner
    setLoading(true);
    try {
      // ใช้ Map เพื่อป้องกัน key ซ้ำ (เช่น BMI อาจถูกเพิ่มทั้งจาก formData + calculatedBMI)
      const payloadMap = new Map<
        string,
        { type: string; value: number; date: string }
      >();

      // วนลูปทุกค่าที่กรอกในฟอร์ม → แปลงเป็น {type, value, date}
      Object.entries(formData).forEach(([key, val]) => {
        if (val !== "") {
          // ข้าม field ที่ว่าง (ผู้ใช้ไม่ได้กรอก)
          payloadMap.set(key, {
            type: key, // ชื่อ metric
            value: parseFloat(val as string), // แปลง string → number
            date: toRFC3339String(new Date(recordDate)), // วันที่บันทึกในรูปแบบ RFC3339
          });
        }
      });

      // ถ้ามีค่า BMI ที่คำนวณได้ → เพิ่ม/แทนใน payload (อาจทับค่าที่กรอกมือ)
      if (calculatedBMI) {
        payloadMap.set("bmi", {
          type: "bmi",
          value: calculatedBMI,
          date: toRFC3339String(new Date(recordDate)),
        });
      }

      // แปลง Map เป็น Array สำหรับส่ง API
      const payload = Array.from(payloadMap.values());

      // ส่งข้อมูลทั้งหมดไป API ในครั้งเดียว
      await api.post(`/clients/${client.id}/metrics`, payload);

      toast.success("บันทึกข้อมูลเรียบร้อยแล้ว");

      // อัปเดต state โดยตรง (ไม่ต้อง reload หน้า) → กราฟจะขยับทันที
      const updatedData = { ...metricsData };
      payload.forEach((p) => {
        // ถ้ายังไม่มี array สำหรับ metric นี้ → สร้างใหม่
        if (!updatedData[p.type]) updatedData[p.type] = [];
        // เพิ่มค่าใหม่เข้า array + เรียงตามวันที่ใหม่
        updatedData[p.type] = [
          ...updatedData[p.type],
          { date: p.date, value: p.value },
        ].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
      });
      setMetricsData(updatedData); // อัปเดต state → กราฟ re-render

      // หน่วง 1.5 วินาที แล้วปิด Modal + reset ฟอร์ม
      // (หน่วงเพื่อให้ผู้ใช้เห็น toast "บันทึกสำเร็จ" ก่อนปิด)
      setTimeout(() => {
        setShowUpdateModal(false); // ปิด Modal
        setFormData({}); // ล้างฟอร์ม
        setCalculatedBMI(null); // reset BMI
      }, 1500);
    } catch (e) {
      console.error("Failed to save metrics", e);
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setLoading(false); // ปิด loading ไม่ว่าจะสำเร็จหรือ error
    }
  };

  // --- Render Sub-Components ---

  /* ฟังก์ชัน: renderMiniChart
     ใช้สำหรับ: หน้า Update Modal → ทุกแท็บ (ไอคอน 📊 ข้าง input field)
     หน้าที่: แสดง Mini Bar Chart popup ลอยเล็กๆ แสดงประวัติย้อนหลัง 10 จุดของ metric นั้น
     เปิด/ปิดโดยกดไอคอนกราฟข้าง input */
  const renderMiniChart = (metricKey: string) => {
    // ดึงข้อมูลประวัติของ metric นี้ ถ้าไม่มีใช้ array ว่าง
    const data = metricsData[metricKey] || [];
    // ถ้าไม่มีข้อมูลเลย → แสดงข้อความ "ไม่มีข้อมูล"
    if (data.length === 0)
      return (
        <div className="p-4 text-center text-xs text-gray-400">ไม่มีข้อมูล</div>
      );

    // คำนวณ min/max สำหรับ normalize ความสูงของแท่ง
    // *0.95 และ *1.05 เพื่อเว้นช่องว่างบน-ล่างให้กราฟดูสวย
    const min = Math.min(...data.map((d) => d.value)) * 0.95;
    const max = Math.max(...data.map((d) => d.value)) * 1.05;
    const range = max - min || 1; // ป้องกันหาร 0 ถ้า min === max

    return (
      // Container: กล่องลอย (absolute) ด้านขวาของ input
      <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 w-48 absolute z-50 mt-2 right-0">
        {/* Header: ชื่อ + ปุ่มปิด (X) */}
        <div className="flex justify-between mb-2">
          <span className="text-xs font-bold text-gray-600">
            ประวัติย้อนหลัง
          </span>
          {/* กดปุ่ม X → ปิด popup โดยตั้ง activeGraphMetric เป็น null */}
          <button onClick={() => setActiveGraphMetric(null)}>
            <X size={12} />
          </button>
        </div>
        {/* กราฟแท่ง: แสดง 10 จุดล่าสุด */}
        <div className="h-16 flex items-end gap-1">
          {data.slice(-10).map((d, i) => {
            // คำนวณ % ความสูงของแท่ง (normalize เป็น 0-100%)
            const h = ((d.value - min) / range) * 100;
            return (
              <div
                key={i}
                className="flex-1 bg-blue-500 rounded-t opacity-80"
                style={{ height: `${Math.max(h, 10)}%` }} // ขั้นต่ำ 10% ไม่ให้แท่งหายไป
                title={`${d.value}`} // hover แสดงค่าจริง
              />
            );
          })}
        </div>
      </div>
    );
  };

  /* ฟังก์ชัน: renderInput
     ใช้สำหรับ: หน้า Update Modal → ทุกแท็บ
     หน้าที่: render input field สำหรับกรอกค่า metric แต่ละตัว พร้อมด้วย:
       - Label + Icon ด้านบน
       - Placeholder แสดงค่าล่าสุด
       - Trend Badge (ลูกศรขึ้น/ลง + สี) เมื่อกรอกค่าใหม่ เทียบกับค่าเดิม
       - ปุ่มเปิด Mini Chart popup
     ถูกเรียกใช้ซ้ำๆ ในทุกแท็บ (Basic, Body, Cardio, Strength) */
  const renderInput = (key: string, required = false) => {
    // key = ชื่อ metric เช่น "weight", "body_fat", "one_rm_5"
    // required = ถ้า true จะแสดง * สีแดงข้าง label

    // ดึง config (label, unit, icon) จาก METRIC_CONFIG
    let config = METRIC_CONFIG[key];

    // ถ้าไม่มีใน static config → ค้นหาจาก dynamic strength exercises
    // (metric แบบ 1RM ที่สร้างจากโปรแกรม จะไม่อยู่ใน METRIC_CONFIG)
    if (!config) {
      const dynamicEx = strengthExercises.find((e) => e.id === key);
      if (dynamicEx) {
        config = {
          label: `1RM ${dynamicEx.label}`, // เช่น "1RM Bench Press"
          unit: dynamicEx.unit, // "kg"
          icon: Dumbbell, // ไอคอนดัมเบล
        };
      } else {
        // Fallback สุดท้าย ถ้าหาไม่เจอเลย
        config = {
          label: key, // ใช้ชื่อ key ดิบ
          unit: "",
          icon: Activity,
        };
      }
    }
    const Icon = config.icon; // ไอคอนสำหรับแสดงข้าง label
    const history = metricsData[key] || []; // ประวัติทั้งหมดของ metric นี้
    // ดึงค่าล่าสุดจากประวัติ (ใช้แสดงเป็น placeholder)
    const lastValue =
      history.length > 0 ? history[history.length - 1].value : null;

    // คำนวณ Trend Badge แบบ Real-time (เปรียบเทียบค่าที่กำลังกรอก vs ค่าเดิม)
    const currentValue = formData[key] ? parseFloat(formData[key]) : null;
    let trendBadge = null; // เริ่มต้นไม่มี badge

    // ถ้ามีทั้งค่าปัจจุบัน (กรอกอยู่) และค่าเดิม → คำนวณ diff + สร้าง badge
    if (currentValue !== null && lastValue !== null) {
      const diff = currentValue - lastValue; // ผลต่าง
      const colorClass = getTrendColor(key, diff); // สีตามเป้าหมาย
      // เลือกไอคอน: ขึ้น/ลง/เท่าเดิม
      const TrendIcon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;

      // สร้าง Trend Badge (ลอยอยู่ข้าง input)
      trendBadge = (
        <div
          className={`absolute right-14 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${colorClass}`}
        >
          <TrendIcon size={10} />
          {diff > 0 ? "+" : ""}
          {/* ถ้าค่าเพิ่ม แสดง "+" นำหน้า */}
          {diff.toFixed(1)}
          {/* แสดงผลต่าง เช่น +2.5 หรือ -1.3 */}
        </div>
      );
    }

    return (
      <div className="relative group">
        {/* Label: ไอคอน + ชื่อ metric + * (ถ้า required) */}
        <label className="text-sm font-bold text-navy-900 mb-1.5 flex items-center gap-1.5">
          <Icon size={14} className="text-navy-600" />
          {config.label}
          {required && <span className="text-red-500">*</span>}
        </label>

        <div className="relative flex items-center">
          {/* Input field: type=number, step=0.1, min=0 */}
          <input
            type="number"
            step="0.1"
            min="0"
            value={formData[key] || ""}
            onChange={(e) => handleInputChange(key, e.target.value)} // เมื่อพิมพ์ → อัปเดต formData
            onFocus={() => setActiveGraphMetric(null)} // เมื่อ focus → ปิด mini chart ที่เปิดอยู่
            placeholder={lastValue ? `${lastValue}` : "0.0"} // แสดงค่าเดิมเป็น placeholder
            className={`w-full pl-3 pr-16 py-2.5 border rounded-xl text-navy-900 focus:ring-2 focus:ring-navy-900/10 focus:border-navy-900 outline-none transition-all
              ${formData[key] ? "border-navy-900 bg-white shadow-sm" : "border-slate-200 bg-slate-50 focus:bg-white"}
            `}
          />

          {/* Trend Badge ลอยอยู่ข้าง input (ถ้ามี) */}
          {trendBadge}

          {/* ด้านขวาสุด: แสดงหน่วย + ปุ่มเปิด Mini Chart */}
          <div className="absolute right-2 flex items-center gap-2">
            {/* แสดงหน่วย (เช่น "kg") เฉพาะเมื่อไม่มี trendBadge */}
            {!trendBadge && (
              <span className="text-xs text-gray-400 font-medium">
                {config.unit}
              </span>
            )}
            {/* ปุ่มไอคอนกราฟ: กด → เปิด/ปิด Mini Chart popup */}
            <div className="relative">
              <button
                onClick={() =>
                  setActiveGraphMetric(activeGraphMetric === key ? null : key)
                }
                className={`p-1.5 rounded-md ${history.length > 0 ? "text-blue-400 hover:bg-blue-50" : "text-gray-200"}`}
                disabled={history.length === 0} // ถ้าไม่มีข้อมูล → ปิดปุ่ม
              >
                <LineChartIcon size={16} />
              </button>
              {/* แสดง Mini Chart popup ถ้า metric นี้ถูกเลือก */}
              {activeGraphMetric === key && renderMiniChart(key)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const dashboardMetrics: any = {
    primary: ["weight", "bmi"],
    secondary: ["body_fat", "waist"],
  };
  /* ===== เตรียมข้อมูลสำหรับหน้า Details (Metrics Details List) =====
     รวม metrics จาก primary + secondary + ข้อมูลที่เคยบันทึก → แสดงเป็น list view */
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

  /* ===================================================================
     JSX Return — โครงสร้าง UI หลักมี 3 ส่วนใหญ่:
     1. Header (ชื่อหน้า + ปุ่ม "อัปเดตข้อมูลร่างกาย")
     2. Content Area:
        - currentView === "overview" → แสดง Overview Page (กราฟ + Metric Cards)
        - currentView === "details" → แสดง Details Page (รายการ Metrics ทั้งหมด)
     3. Update Modal (popup form บันทึกข้อมูล) — แสดงเมื่อ showUpdateModal === true
     =================================================================== */
  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 bg-gray-50 min-h-screen font-sans">
      {/* ===== ส่วน Header: แสดงชื่อหน้า + เป้าหมายลูกค้า + ปุ่มเปิด Update Modal ===== */}
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
      {/* ===== ส่วน Content Area: สลับระหว่าง Overview กับ Details ===== */}
      {currentView === "overview" ? (
        /* ==========================================
           หน้า Overview Page (currentView === "overview")
           - Metrics Overview header + ปุ่ม "ดูรายละเอียด"
           - กราฟแนวโน้มพัฒนาการ (renderMainChart)
           - Metric Cards แบบ Grid (primary + secondary metrics)
           ========================================== */
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
        /* ==========================================
           หน้า Details Page (currentView === "details")
           - แสดงรายการ Metrics ทั้งหมดในรูปแบบ List
           - กดแต่ละรายการ → เรียก handleEditMetric → เปิด Update Modal
           ========================================== */
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

      {/* ==========================================
           หน้า Update Modal (Popup สำหรับบันทึกข้อมูลร่างกาย)
           - เปิดจากปุ่ม "อัปเดตข้อมูลร่างกาย" (Header) หรือกดรายการจากหน้า Details
           - ประกอบด้วย 4 แท็บ:
             Tab 1 "ร่างกาย & BMI"   → input น้ำหนัก, ส่วนสูง, ไขมัน, กล้ามเนื้อ + BMI Widget
             Tab 2 "สัดส่วน"         → input ไหล่, รอบอก, รอบเอว, สะโพก, แขน, ต้นขา
             Tab 3 "หัวใจ-ปอด (VO₂)" → Cooper Test Calculator + input VO₂ Max, Resting HR
             Tab 4 "ความแข็งแรง (1RM)" → 1RM Calculator + Manual Record List
           - Footer: ปุ่ม "ยกเลิก" + ปุ่ม "บันทึกข้อมูล"
           ========================================== */}
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
              {/* ===== Tab 1: ร่างกาย & BMI =====
                 - Input: น้ำหนัก (required), ส่วนสูง (required), ไขมัน, กล้ามเนื้อ
                 - BMI Widget: คำนวณอัตโนมัติ + แสดงสถานะ (ผอม/สมส่วน/ท้วม) */}
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

              {/* ===== Tab 2: สัดส่วนร่างกาย (Body Proportions) =====
                 - ท่อนบน: ไหล่, รอบอก, แขนขวา, แขนซ้าย
                 - ท่อนล่าง: รอบเอว, สะโพก, หน้าท้อง, ต้นขาขวา, ต้นขาซ้าย */}
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

              {/* ===== Tab 3: หัวใจ-ปอด VO₂ Max (Cardio) =====
                 - Cooper Test Calculator: กรอกระยะวิ่ง 12 นาที → คำนวณ VO₂ Max อัตโนมัติ
                 - หรือกรอก VO₂ Max / Resting HR เอง */}
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

              {/* ===== Tab 4: ความแข็งแรง 1RM (Strength) =====
                 - 1RM Calculator: เลือกท่า → กรอกน้ำหนัก + จำนวนครั้ง → คำนวณ Estimated 1RM
                 - Manual Record: รายการท่าที่เลือกเพิ่มเอง สำหรับบันทึกสถิติ
                 - ท่าในรายการมาจาก exercises ที่ assign ในโปรแกรมของลูกค้า */}
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
                              weight: "",
                              reps: "",
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

            {/* ===== Modal Footer: ปุ่ม "ยกเลิก" + ปุ่ม "บันทึกข้อมูล" (เรียก handleSubmit) ===== */}
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
