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
const SECTION_FORMATS = [
  { value: "straight-sets", label: "Straight Sets (เซตปกติ)" },
  { value: "circuit", label: "Circuit Training (เซอร์กิต)" },
  { value: "superset", label: "Superset (ซูเปอร์เซต)" },
  { value: "amrap", label: "AMRAP (Max Reps/Rounds)" },
  { value: "emom", label: "EMOM (Every Minute on Minute)" },
];

export default function AddSession() {
  const navigate = useNavigate();
  const location = useLocation();

  // --- Session State ---
  const [sessionTitle, setSessionTitle] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clients, setClients] = useState<any[]>([]);

  // --- Builder State ---
  const [sectionFormat, setSectionFormat] = useState("straight-sets");
  const [rounds, setRounds] = useState(3);
  const [workTime, setWorkTime] = useState(30);
  const [restTime, setRestTime] = useState(15);

  // Exercises State
  const [exercises, setExercises] = useState<any[]>([]);
  const [exercisesList, setExercisesList] = useState<any[]>([]); // Added for Picker
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState(""); // Added for Picker

  // --- UI State ---
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Schedule State
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduleEndTime, setScheduleEndTime] = useState("10:00");

  // Conflict State
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictSession, setConflictSession] = useState<any>(null);
  const [canReplace, setCanReplace] = useState(false);

  // Fetch Data
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

  // --- Handlers ---
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

  const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...exercises];
    updated[exerciseIndex].sets.splice(setIndex, 1);
    updated[exerciseIndex].sets.forEach((s: any, i: number) => {
      s.setNumber = i + 1;
    });
    setExercises(updated);
  };

  const handleRemoveExercise = (exerciseIndex: number) => {
    const updated = [...exercises];
    updated.splice(exerciseIndex, 1);
    setExercises(updated);
  };

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

  const parseDuration = (str: string | number): number => {
    if (!str) return 0;
    const s = str.toString();
    if (s.includes(":")) {
      const [m, sec] = s.split(":");
      return (parseInt(m) || 0) * 60 + (parseInt(sec) || 0);
    }
    return parseInt(s) || 0;
  };

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
      navigate(`/trainer/sessions/${newSessionId}/log`);
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

  const filteredExercises = exercisesList.filter((ex) =>
    ex.name.toLowerCase().includes(exerciseSearchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col text-navy-900 pb-24">
      {/* Header */}
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
          {/* Top Section: Client & Name */}
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

          {/* Format Selector */}
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

          {/* Exercise Builder Area */}
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

                          {/* INPUTS GRID */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {/* Case 1: Cardio */}
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

                            {/* Case 2: HIIT */}
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

                            {/* Case 3: Flexibility */}
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

                            {/* Case 4: Weight (Default) */}
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

                            {/* Always show Rest */}
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

                          {/* Notes Field */}
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

      {/* Date Picker Modal */}
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

      {/* NEW SIMPLE EXERCISE PICKER */}
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
                    {ex.category}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Conflict Dialog */}
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
