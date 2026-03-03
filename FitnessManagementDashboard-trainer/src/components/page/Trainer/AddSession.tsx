import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  X,
  Plus,
  ChevronLeft,
  ChevronDown,
  AlertTriangle,
  Calendar,
} from "lucide-react";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Constants
/* ==========================================================================
   Config: SECTION_FORMATS
   ใช้สำหรับ: ส่วน Format Selector (ฟอร์มหลัก)
   หน้าที่: กำหนดตัวเลือกรูปแบบการฝึกที่ trainer สามารถเลือกได้
   - straight-sets = เซตปกติ (ค่าเริ่มต้น)
   - circuit = Circuit Training (วนรอบหลายท่า)
   - superset = Superset (สลับท่า)
   - amrap = As Many Reps As Possible
   - emom = Every Minute on the Minute
   ถ้าเลือก circuit/amrap/emom จะแสดง input เพิ่ม (rounds, workTime, restTime)
   ========================================================================== */
const SECTION_FORMATS = [
  { value: "straight-sets", label: "Straight Sets (เซตปกติ)" },
  { value: "circuit", label: "Circuit Training (เซอร์กิต)" },
  { value: "superset", label: "Superset (ซูเปอร์เซต)" },
  { value: "amrap", label: "AMRAP (Max Reps/Rounds)" },
  { value: "emom", label: "EMOM (Every Minute on Minute)" },
];

/* ==========================================================================
   Main Component: AddSession
   เป็นหน้าเต็มจอสำหรับสร้าง Workout Session ใหม่
   เข้าถึงจาก: หน้า Calendar → ปุ่ม "+" หรือ link สร้างนัดหมาย
   รับ query param ?clientId=X เพื่อ pre-select ลูกค้า

   โครงสร้าง UI ประกอบด้วย 5 ส่วนหลัก:
     1. Header           → ปุ่มกลับ + ชื่อหน้า + ปุ่ม "บันทึก"
     2. ฟอร์มหลัก (ScrollArea):
        - Client & Name  → เลือกลูกค้า + ตั้งชื่อ session
        - Format Selector → เลือกรูปแบบ (Straight Sets/Circuit/AMRAP/EMOM)
        - Exercise Builder → สร้างรายการท่า + กำหนด sets
     3. Date Picker Modal → Popup กำหนดวัน/เวลา (เปิดเมื่อกด "บันทึก")
     4. Exercise Picker   → Popup เลือกท่าจาก library
     5. Conflict Dialog   → AlertDialog แจ้งเตือนนัดซ้อนทับ
   ========================================================================== */
export default function AddSession() {
  const navigate = useNavigate(); // สำหรับนำทางไปหน้าอื่น
  const location = useLocation(); // สำหรับอ่าน query params (clientId)

  // State สำหรับ: ส่วน Client & Name (ฟอร์มหลัก)
  const [sessionTitle, setSessionTitle] = useState(""); // ชื่อ Workout Session
  const [selectedClientId, setSelectedClientId] = useState(""); // ID ลูกค้าที่เลือก
  const [clients, setClients] = useState<any[]>([]); // รายชื่อลูกค้าทั้งหมดจาก API

  // State สำหรับ: ส่วน Format Selector (ฟอร์มหลัก)
  const [sectionFormat, setSectionFormat] = useState("straight-sets"); // รูปแบบการฝึก
  const [rounds, setRounds] = useState(3); // จำนวนรอบ (ใช้กับ circuit/amrap/emom)
  const [workTime, setWorkTime] = useState(30); // เวลาทำ (วินาที)
  const [restTime, setRestTime] = useState(15); // เวลาพัก (วินาที)

  // State สำหรับ: ส่วน Exercise Builder (ฟอร์มหลัก) + Exercise Picker Dialog
  const [exercises, setExercises] = useState<any[]>([]); // ท่าฝึกที่เพิ่มใน session (พร้อม sets)
  const [exercisesList, setExercisesList] = useState<any[]>([]); // รายการท่าทั้งหมดจาก API (สำหรับ Exercise Picker)
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState(""); // คำค้นหาใน Exercise Picker

  // State สำหรับ: เปิด/ปิด Popup ต่างๆ
  const [showExercisePicker, setShowExercisePicker] = useState(false); // เปิด Exercise Picker Dialog
  const [showDatePicker, setShowDatePicker] = useState(false); // เปิด Date Picker Modal

  // State สำหรับ: Date Picker Modal
  const [scheduleDate, setScheduleDate] = useState(""); // วันที่นัด
  const [scheduleTime, setScheduleTime] = useState("09:00"); // เวลาเริ่ม
  const [scheduleEndTime, setScheduleEndTime] = useState("10:00"); // เวลาสิ้นสุด

  // State สำหรับ: Conflict Dialog (แจ้งเตือนนัดซ้อนทับ)
  const [showConflictDialog, setShowConflictDialog] = useState(false); // เปิด/ปิด dialog
  const [conflictSession, setConflictSession] = useState<any>(null); // ข้อมูล session ที่ซ้อนทับ
  const [canReplace, setCanReplace] = useState(false); // อนุญาตให้แทนที่ได้หรือไม่

  /* useEffect: fetchData — โหลดข้อมูลเริ่มต้น
     ใช้สำหรับ: ส่วน Client & Name + Exercise Picker
     หน้าที่:
       1. ดึงรายชื่อลูกค้า (GET /clients) → แสดงใน dropdown เลือกลูกค้า
       2. ดึงรายการท่าออกกำลังกาย (GET /exercises) → ใช้ใน Exercise Picker
       3. ถ้ามี query param ?clientId=X → pre-select ลูกค้าอัตโนมัติ
       4. ถ้าไม่มี → เลือกลูกค้าตัวแรกเป็นค่าเริ่มต้น */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientRes, exRes] = await Promise.all([
          api.get("/clients"),
          api.get("/exercises"),
        ]);

        const clientData = clientRes.data || [];
        setClients(clientData);
        setExercisesList(exRes.data || []);

        const params = new URLSearchParams(location.search);
        const paramClientId = params.get("clientId");
        if (paramClientId) {
          setSelectedClientId(paramClientId);
        } else if (clientData.length > 0) {
          setSelectedClientId(clientData[0].id.toString());
        }
      } catch (err) {
        console.error("Failed to fetch data", err);
        toast.error("ไม่สามารถโหลดข้อมูลได้");
      }
    };
    fetchData();
  }, [location.search]);

  /* ฟังก์ชัน: handleSelectExercise
     ใช้สำหรับ: Exercise Picker Dialog → เมื่อกดเลือกท่าออกกำลังกาย
     หน้าที่: สร้าง exercise object พร้อม 1 set เริ่มต้น (weight/reps/rpe/distance/duration/pace/side/rest/notes)
     แล้วเพิ่มเข้าลิสต์ exercises ของ session → ปิด picker + reset คำค้นหา */
  const handleSelectExercise = (exId: string) => {
    const ex = exercisesList.find((e) => e.id === exId);
    if (!ex) return;

    const newExercise = {
      id: Date.now(),
      exerciseId: ex.id,
      name: ex.name,
      category: ex.category || "weight",
      sets: [
        {
          setNumber: 1,
          weight: "",
          reps: "",
          rpe: "",
          distance: "",
          duration: "",
          pace: "",
          side: "",
          rest: 60,
          notes: "",
        },
      ],
    };
    setExercises((prev) => [...prev, newExercise]);
    setShowExercisePicker(false);
    setExerciseSearchTerm(""); // Reset search
  };

  /* ฟังก์ชัน: handleAddSet
     ใช้สำหรับ: Exercise Builder → ปุ่ม "+ เพิ่ม Set" ใต้แต่ละท่า
     หน้าที่: เพิ่ม set ใหม่ในท่าที่เลือก โดย copy ค่าจาก set ล่าสุด
     (เพื่อให้ trainer ไม่ต้องกรอกซ้ำ ถ้าค่าเหมือนกัน) */
  const handleAddSet = (exerciseIndex: number) => {
    const updated = [...exercises];
    const currentSets = updated[exerciseIndex].sets;
    const lastSet = currentSets[currentSets.length - 1];

    const newSet = {
      setNumber: currentSets.length + 1,
      weight: lastSet ? lastSet.weight : "",
      reps: lastSet ? lastSet.reps : "",
      rpe: lastSet ? lastSet.rpe : "",
      distance: lastSet ? lastSet.distance : "",
      duration: lastSet ? lastSet.duration : "",
      pace: lastSet ? lastSet.pace : "",
      side: lastSet ? lastSet.side : "",
      rest: lastSet ? lastSet.rest : 60,
      notes: "",
    };
    updated[exerciseIndex].sets.push(newSet);
    setExercises(updated);
  };

  /* ฟังก์ชัน: handleRemoveSet
     ใช้สำหรับ: Exercise Builder → ปุ่ม X ข้างแต่ละ set (แสดงเมื่อ hover)
     หน้าที่: ลบ set ออก + renumber ลำดับ set ที่เหลือ */
  const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...exercises];
    updated[exerciseIndex].sets.splice(setIndex, 1);
    updated[exerciseIndex].sets.forEach((s: any, i: number) => {
      s.setNumber = i + 1;
    });
    setExercises(updated);
  };

  /* ฟังก์ชัน: handleRemoveExercise
     ใช้สำหรับ: Exercise Builder → ปุ่ม X มุมขวาบนของการ์ดท่า
     หน้าที่: ลบท่าออกกำลังกายออกจากรายการ */
  const handleRemoveExercise = (exerciseIndex: number) => {
    const updated = [...exercises];
    updated.splice(exerciseIndex, 1);
    setExercises(updated);
  };

  /* ฟังก์ชัน: getSimplifiedCategory
     ใช้สำหรับ: Exercise Builder → กำหนด input fields ที่แสดงในแต่ละ set
     หน้าที่: แปลง category จริง (เช่น "Running", "Weight Training") ให้เป็น 4 กลุ่มหลัก
     แต่ละกลุ่มแสดง input fields ที่แตกต่างกัน:
       - "cardio"      → ระยะทาง, เวลา, Pace
       - "hiit"        → Work (วินาที) + notes
       - "flexibility" → เวลา (วินาที), ครั้ง, ด้าน (L/R)
       - "weight"      → น้ำหนัก (kg), จำนวนครั้ง, RPE + notes */
  const getSimplifiedCategory = (cat: string = "") => {
    const lower = cat.toLowerCase();
    if (
      ["cardio", "running", "cycling", "swimming", "rowing", "aerobic"].some(
        (k) => lower.includes(k),
      )
    )
      return "cardio";
    if (
      ["hiit", "metabolic", "conditioning", "tabata", "interval"].some((k) =>
        lower.includes(k),
      )
    )
      return "hiit";
    if (
      [
        "flexibility",
        "stretching",
        "mobility",
        "balance",
        "yoga",
        "pilates",
      ].some((k) => lower.includes(k))
    )
      return "flexibility";
    return "weight";
  };

  /* ฟังก์ชัน: parseDuration
     ใช้สำหรับ: createSessionLogs (ภายใน)
     หน้าที่: แปลงค่าเวลาจาก string เป็นวินาที
     รองรับ 2 รูปแบบ: "5:30" → 330 วินาที, "120" → 120 วินาที */
  const parseDuration = (str: string | number): number => {
    if (!str) return 0;
    const s = str.toString();
    if (s.includes(":")) {
      const [m, sec] = s.split(":");
      return (parseInt(m) || 0) * 60 + (parseInt(sec) || 0);
    }
    return parseInt(s) || 0;
  };

  /* ฟังก์ชัน: createSessionLogs
     ใช้สำหรับ: handleConfirmSchedule (เรียกหลังสร้าง session)
     หน้าที่: วนลูปสร้าง exercise logs สำหรับแต่ละท่า + sets
     ส่ง POST /sessions/:id/logs ไป API พร้อมข้อมูล:
       - exercise_id, exercise_name, category, order
       - sets: weight, reps, rpe, distance, duration, pace, rest, notes */
  const createSessionLogs = async (sessionId: number) => {
    for (const [index, ex] of exercises.entries()) {
      const logPayload = {
        schedule_id: sessionId,
        exercise_id: ex.exerciseId,
        exercise_name: ex.name,
        category: ex.category,
        notes: "",
        status: "pending",
        order: index + 1,
        sets: ex.sets.map((s: any, setIndex: number) => ({
          set_number: setIndex + 1,
          planned_weight_kg: parseFloat(s.weight) || 0,
          planned_reps: parseInt(s.reps) || 0,
          planned_rpe: parseFloat(s.rpe) || 0,
          planned_distance: parseFloat(s.distance) || 0,
          planned_duration_seconds: parseDuration(s.duration),
          planned_pace: s.pace || "",
          rest_duration_seconds: parseDuration(s.rest),
          planned_metadata: {
            notes: s.notes || "",
            side: s.side || "",
          },
          completed: false,
        })),
      };
      await api.post(`/sessions/${sessionId}/logs`, logPayload);
    }
  };

  /* ฟังก์ชัน: handleConfirmSchedule
     ใช้สำหรับ: Date Picker Modal → ปุ่ม "ยืนยัน"
     หน้าที่: สร้าง session ใหม่ + exercise logs
     ขั้นตอน:
       1. ตรวจสอบข้อมูล (ลูกค้า, ชื่อ, วัน/เวลา)
       2. POST /sessions สร้าง session
       3. เรียก createSessionLogs สร้าง exercise logs
       4. นำทางไปหน้า Session Log (/trainer/sessions/:id/log)
     ถ้า API ตอบ 409 (ซ้อนทับ) → เปิด Conflict Dialog แทน */
  const handleConfirmSchedule = async () => {
    if (!selectedClientId) return toast.error("กรุณาเลือกลูกค้า");
    if (!sessionTitle) return toast.error("กรุณาระบุชื่อ Workout Session");
    if (!scheduleDate || !scheduleTime)
      return toast.error("กรุณาระบุวันและเวลา");

    try {
      const startDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`);
      let endDateTime;
      if (scheduleEndTime) {
        endDateTime = new Date(`${scheduleDate}T${scheduleEndTime}:00`);
      } else {
        endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
      }

      const payload = {
        title: sessionTitle,
        client_id: parseInt(selectedClientId),
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: "scheduled",
        summary:
          sectionFormat !== "straight-sets" ? `Format: ${sectionFormat}` : "",
      };

      const res = await api.post("/sessions", payload);
      const newSessionId = res.data.id;

      await createSessionLogs(newSessionId);

      toast.success("สร้างนัดหมายเรียบร้อยแล้ว");
      setShowDatePicker(false);
      navigate(`/trainer/sessions/${newSessionId}/log`, { replace: true });
    } catch (err: any) {
      if (err.response && err.response.status === 409) {
        setConflictSession(err.response.data.conflicting_session);
        setCanReplace(err.response.data.can_replace);
        setShowConflictDialog(true);
      } else {
        console.error("Failed to create session", err);
        toast.error("ไม่สามารถสร้างนัดหมายได้");
      }
    }
  };

  /* ฟังก์ชัน: handleConfirmReplace
     ใช้สำหรับ: Conflict Dialog → ปุ่ม "แทนที่"
     หน้าที่: ลบ session เดิมที่ซ้อนทับ (DELETE /sessions/:id)
     แล้วเรียก handleConfirmSchedule อีกครั้งเพื่อสร้าง session ใหม่ */
  const handleConfirmReplace = async () => {
    if (!conflictSession) return;
    try {
      await api.delete(`/sessions/${conflictSession.id}`);
      setShowConflictDialog(false);
      setConflictSession(null);
      handleConfirmSchedule();
    } catch (err) {
      console.error("Failed to replace", err);
      toast.error("เกิดข้อผิดพลาดในการแทนที่นัดหมาย");
    }
  };

  /* Derived: filteredExercises
     ใช้สำหรับ: Exercise Picker Dialog
     หน้าที่: กรองรายการท่าจาก exercisesList ตามคำค้นหา exerciseSearchTerm */
  const filteredExercises = exercisesList.filter((ex) =>
    ex.name.toLowerCase().includes(exerciseSearchTerm.toLowerCase()),
  );

  /* ===================================================================
     JSX Return — โครงสร้าง UI หลักมี 5 ส่วน:
     1. Header           → ปุ่มกลับ (ไป Calendar) + ชื่อหน้า + ปุ่ม "บันทึก" (เปิด Date Picker)
     2. ฟอร์มหลัก (ScrollArea):
        - Client & Name  → dropdown เลือกลูกค้า + input ชื่อ session
        - Format Selector → dropdown รูปแบบ + input rounds/work/rest (ถ้าเลือก circuit/amrap/emom)
        - Exercise Builder → รายการท่าฝึก + sets + ปุ่มเพิ่มท่า/set
     3. Date Picker Modal → Popup กำหนดวัน/เวลา → กด "ยืนยัน" → handleConfirmSchedule
     4. Exercise Picker   → Popup ค้นหา/เลือกท่า → handleSelectExercise
     5. Conflict Dialog   → AlertDialog นัดซ้อนทับ → handleConfirmReplace
     =================================================================== */
  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col text-navy-900 pb-24">
      {/* ===== ส่วน 1: Header — ปุ่มกลับ (Calendar) + ชื่อหน้า + ปุ่ม "บันทึก" (เปิด Date Picker) ===== */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 h-14 flex items-center justify-between shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/trainer/calendar")}
          className="hover:bg-slate-100 -ml-2 rounded-full"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-base font-bold text-navy-900 tracking-tight">
          สร้าง Workout Session ใหม่
        </h1>
        <Button
          onClick={() => setShowDatePicker(true)}
          className="bg-navy-900 hover:bg-navy-800 rounded-full px-6 h-9 text-sm font-semibold shadow-sm"
        >
          บันทึก
        </Button>
      </div>

      <ScrollArea className="flex-1 w-full max-w-3xl mx-auto p-4 sm:p-6">
        <div className="space-y-4">
          {/* ===== ส่วน 2a: Client & Name — dropdown เลือกลูกค้า + input ชื่อ session ===== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>เลือกลูกค้า (Client)</Label>
              <div className="relative">
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>
                    -- Client --
                  </option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id.toString()}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>ชื่อ Workout Session</Label>
              <Input
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="เช่น Chest & Triceps"
              />
            </div>
          </div>

          {/* ===== ส่วน 2b: Format Selector — เลือกรูปแบบการฝึก
             Straight Sets (ค่าเริ่มต้น) / Circuit / Superset / AMRAP / EMOM
             ถ้าเลือก circuit/amrap/emom → แสดง input เพิ่มเติม: Rounds, Work (วินาที), Rest (วินาที) ===== */}
          <div className="space-y-4 border p-3 rounded-lg bg-slate-50">
            <div className="space-y-2">
              <Label>รูปแบบ (Format)</Label>
              <Select
                value={sectionFormat}
                onValueChange={(v) => setSectionFormat(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTION_FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(sectionFormat === "circuit" ||
              sectionFormat === "amrap" ||
              sectionFormat === "emom") && (
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs">จำนวนรอบ (Rounds)</Label>
                  <Input
                    type="number"
                    value={rounds}
                    onChange={(e) => setRounds(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">ทำ (วินาที)</Label>
                  <Input
                    type="number"
                    value={workTime}
                    onChange={(e) => setWorkTime(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">พัก (วินาที)</Label>
                  <Input
                    type="number"
                    value={restTime}
                    onChange={(e) => setRestTime(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ===== ส่วน 2c: Exercise Builder — สร้างรายการท่าฝึก + กำหนด sets
             แต่ละท่าแสดง input fields ตาม category (getSimplifiedCategory):
               - weight:      น้ำหนัก (kg), ครั้ง, RPE, พัก (วินาที), หมายเหตุ
               - cardio:      ระยะทาง, เวลา, Pace, พัก (วินาที)
               - hiit:        Work (วินาที), พัก (วินาที), หมายเหตุ
               - flexibility:  เวลา (วินาที), ครั้ง, ด้าน (L/R), พัก (วินาที)
             ทุก category แสดง "พัก (วินาที)" เสมอ
             ปุ่ม "เพิ่มท่า" → เปิด Exercise Picker
             ปุ่ม "+ เพิ่ม Set" → เรียก handleAddSet
             ปุ่ม X ลบท่า → handleRemoveExercise
             ปุ่ม X ลบ set → handleRemoveSet ===== */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
            <div className="flex justify-between items-center">
              <Label>ท่าฝึกใน Section ({exercises.length})</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExercisePicker(true)}
              >
                <Plus className="h-4 w-4 mr-1" /> เพิ่มท่า
              </Button>
            </div>

            <div className="space-y-3">
              {exercises.map((ex, idx) => {
                const simpleCategory = getSimplifiedCategory(ex.category);

                return (
                  <Card key={idx} className="p-3">
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold text-sm">{ex.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => handleRemoveExercise(idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {ex.sets.map((set: any, setIdx: number) => (
                        <div
                          key={setIdx}
                          className="border rounded-lg p-3 space-y-3 bg-white relative group"
                        >
                          {/* Header */}
                          <div className="flex justify-between items-center">
                            <Badge
                              variant="secondary"
                              className="px-2 py-0.5 text-xs font-normal bg-muted text-muted-foreground"
                            >
                              Set {set.setNumber}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemoveSet(idx, setIdx)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* INPUTS GRID — แสดง input fields ตาม category ของท่า
                             ใช้ getSimplifiedCategory() แปลง category เป็น 4 กลุ่ม
                             แต่ละกลุ่มแสดง input fields ที่แตกต่างกัน */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {/* Case 1: Cardio — แสดง: ระยะทาง, เวลา, Pace */}
                            {simpleCategory === "cardio" && (
                              <>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground font-medium uppercase ml-1">
                                    ระยะทาง (ม.)
                                  </span>
                                  <Input
                                    className="h-8 text-center border-2 border-gray-300"
                                    value={set.distance}
                                    onChange={(e) => {
                                      const updated = [...exercises];
                                      updated[idx].sets[setIdx].distance =
                                        e.target.value;
                                      setExercises(updated);
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground font-medium uppercase ml-1">
                                    เวลา (นาที)
                                  </span>
                                  <Input
                                    className="h-8 text-center border-2 border-gray-300"
                                    value={set.duration}
                                    onChange={(e) => {
                                      const updated = [...exercises];
                                      updated[idx].sets[setIdx].duration =
                                        e.target.value;
                                      setExercises(updated);
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground font-medium uppercase ml-1">
                                    Pace
                                  </span>
                                  <Input
                                    className="h-8 text-center border-2 border-gray-300"
                                    placeholder="เช่น 6:00"
                                    value={set.pace}
                                    onChange={(e) => {
                                      const updated = [...exercises];
                                      updated[idx].sets[setIdx].pace =
                                        e.target.value;
                                      setExercises(updated);
                                    }}
                                  />
                                </div>
                              </>
                            )}

                            {/* Case 2: HIIT — แสดง: Work (วินาที) เท่านั้น */}
                            {simpleCategory === "hiit" && (
                              <div className="space-y-1">
                                <span className="text-[10px] text-muted-foreground font-medium uppercase ml-1">
                                  Work (วิ)
                                </span>
                                <Input
                                  className="h-8 text-center border-2 border-gray-300"
                                  value={set.duration}
                                  onChange={(e) => {
                                    const updated = [...exercises];
                                    updated[idx].sets[setIdx].duration =
                                      e.target.value;
                                    setExercises(updated);
                                  }}
                                />
                              </div>
                            )}

                            {/* Case 3: Flexibility — แสดง: เวลา (วินาที), ครั้ง, ด้าน (L/R) */}
                            {simpleCategory === "flexibility" && (
                              <>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground font-medium uppercase ml-1">
                                    เวลา (วิ)
                                  </span>
                                  <Input
                                    className="h-8 text-center border-2 border-gray-300"
                                    value={set.duration}
                                    onChange={(e) => {
                                      const updated = [...exercises];
                                      updated[idx].sets[setIdx].duration =
                                        e.target.value;
                                      setExercises(updated);
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground font-medium uppercase ml-1">
                                    ครั้ง
                                  </span>
                                  <Input
                                    className="h-8 text-center border-2 border-gray-300"
                                    value={set.reps}
                                    onChange={(e) => {
                                      const updated = [...exercises];
                                      updated[idx].sets[setIdx].reps =
                                        e.target.value;
                                      setExercises(updated);
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground font-medium uppercase ml-1">
                                    ด้าน
                                  </span>
                                  <Input
                                    className="h-8 text-center border-2 border-gray-300"
                                    placeholder="L/R"
                                    value={set.side}
                                    onChange={(e) => {
                                      const updated = [...exercises];
                                      updated[idx].sets[setIdx].side =
                                        e.target.value;
                                      setExercises(updated);
                                    }}
                                  />
                                </div>
                              </>
                            )}

                            {/* Case 4: Weight (ค่าเริ่มต้น) — แสดง: น้ำหนัก (kg), จำนวนครั้ง, RPE */}
                            {simpleCategory === "weight" && (
                              <>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground font-medium uppercase ml-1">
                                    นน. (กก.)
                                  </span>
                                  <Input
                                    type="number"
                                    className="h-8 text-center border-2 border-gray-300"
                                    value={set.weight}
                                    onChange={(e) => {
                                      const updated = [...exercises];
                                      updated[idx].sets[setIdx].weight =
                                        e.target.value;
                                      setExercises(updated);
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground font-medium uppercase ml-1">
                                    จำนวน (ครั้ง)
                                  </span>
                                  <Input
                                    className="h-8 text-center border-2 border-gray-300"
                                    value={set.reps}
                                    onChange={(e) => {
                                      const updated = [...exercises];
                                      updated[idx].sets[setIdx].reps =
                                        e.target.value;
                                      setExercises(updated);
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground font-medium uppercase ml-1">
                                    RPE
                                  </span>
                                  <Input
                                    className="h-8 text-center border-2 border-gray-300"
                                    placeholder="1-10"
                                    value={set.rpe}
                                    onChange={(e) => {
                                      const updated = [...exercises];
                                      updated[idx].sets[setIdx].rpe =
                                        e.target.value;
                                      setExercises(updated);
                                    }}
                                  />
                                </div>
                              </>
                            )}

                            {/* พักระหว่าง set (แสดงเสมอทุก category) */}
                            <div className="space-y-1">
                              <span className="text-[10px] text-muted-foreground font-medium uppercase ml-1">
                                พัก (วิ)
                              </span>
                              <Input
                                type="number"
                                min={0}
                                className="h-8 text-center border-2 border-gray-300"
                                value={set.rest}
                                onChange={(e) => {
                                  let val = parseInt(e.target.value);
                                  if (val < 0) val = 0;
                                  const updated = [...exercises];
                                  updated[idx].sets[setIdx].rest = isNaN(val)
                                    ? 0
                                    : val;
                                  setExercises(updated);
                                }}
                              />
                            </div>
                          </div>

                          {/* Notes — แสดงเฉพาะท่า weight + hiit (สำหรับจด tempo, technique) */}
                          {(simpleCategory === "weight" ||
                            simpleCategory === "hiit") && (
                            <div>
                              <Input
                                placeholder="หมายเหตุ (tempo, technique...)"
                                className="h-8 text-xs border-2 border-gray-300 bg-transparent"
                                value={set.notes}
                                onChange={(e) => {
                                  const updated = [...exercises];
                                  updated[idx].sets[setIdx].notes =
                                    e.target.value;
                                  setExercises(updated);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ))}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-6 text-xs"
                        onClick={() => handleAddSet(idx)}
                      >
                        + เพิ่ม Set
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* ===== ส่วน 3: Date Picker Modal — Popup กำหนดวัน/เวลานัดหมาย
         เปิดจาก: กดปุ่ม "บันทึก" ใน Header
         มี input: วันที่, เวลาเริ่ม, เวลาสิ้นสุด
         ปุ่ม "ยืนยัน" → เรียก handleConfirmSchedule (สร้าง session + logs → ไปหน้า Log)
         ปุ่ม "ยกเลิก" → ปิด popup ===== */}
      {showDatePicker && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <Card className="w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-lg text-navy-900 flex items-center gap-2">
              <Calendar className="w-5 h-5" /> กำหนดวันและเวลา
            </h3>
            <div className="space-y-2">
              <Label>วันที่</Label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>เวลาเริ่ม</Label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>เวลาสิ้นสุด</Label>
                <Input
                  type="time"
                  value={scheduleEndTime}
                  onChange={(e) => setScheduleEndTime(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowDatePicker(false)}
              >
                ยกเลิก
              </Button>
              <Button onClick={handleConfirmSchedule}>ยืนยัน</Button>
            </div>
          </Card>
        </div>
      )}

      {/* ===== ส่วน 4: Exercise Picker Dialog — Popup ค้นหาและเลือกท่าออกกำลังกาย
         เปิดจาก: ปุ่ม "เพิ่มท่า" ใน Exercise Builder
         มี Search input สำหรับค้นหาจาก exercisesList
         กดเลือกท่า → เรียก handleSelectExercise → เพิ่มท่าเข้า exercises list ===== */}
      <Dialog open={showExercisePicker} onOpenChange={setShowExercisePicker}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เลือกท่าฝึก</DialogTitle>
            <DialogDescription>
              ค้นหาและเลือกท่าออกกำลังกายจากรายการเพื่อเพิ่มลงในโปรแกรม
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="ค้นหา..."
            value={exerciseSearchTerm}
            onChange={(e) => setExerciseSearchTerm(e.target.value)}
          />
          <ScrollArea className="h-[300px]">
            <div className="space-y-1">
              {filteredExercises.map((ex) => (
                <div
                  key={ex.id}
                  className="p-2 hover:bg-accent cursor-pointer rounded flex justify-between items-center"
                  onClick={() => handleSelectExercise(ex.id)}
                >
                  <span>{ex.name}</span>
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
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ===== ส่วน 5: Conflict Dialog — AlertDialog แจ้งเตือนนัดหมายซ้อนทับ
         เปิดอัตโนมัติ: เมื่อ API ตอบ 409 (conflict) ใน handleConfirmSchedule
         แสดงข้อมูล session ที่ซ้อนทับ (ชื่อ + เวลา)
         ถ้า canReplace = true → แสดงปุ่ม "แทนที่" → เรียก handleConfirmReplace
         ถ้า canReplace = false → แสดงแค่ "ยกเลิก" (ไม่สามารถแทนที่ได้) ===== */}
      <AlertDialog
        open={showConflictDialog}
        onOpenChange={setShowConflictDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" /> พบการนัดหมายซ้อนทับ
            </AlertDialogTitle>
            <AlertDialogDescription>
              {canReplace
                ? "มีนัดหมายเดิมอยู่แล้ว คุณต้องการแทนที่หรือไม่?"
                : "ไม่สามารถลงเวลานี้ได้เนื่องจากติดคิวอื่น"}
              {conflictSession && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 font-medium">
                  {conflictSession.title} (
                  {new Date(conflictSession.start_time).toLocaleTimeString(
                    "th-TH",
                    { hour: "2-digit", minute: "2-digit" },
                  )}
                  )
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowConflictDialog(false);
                setConflictSession(null);
              }}
            >
              ยกเลิก
            </AlertDialogCancel>
            {canReplace && (
              <AlertDialogAction onClick={handleConfirmReplace}>
                แทนที่
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
