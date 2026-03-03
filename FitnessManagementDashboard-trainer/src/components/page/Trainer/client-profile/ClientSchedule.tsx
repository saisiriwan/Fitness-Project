import { useState, useEffect } from "react";
import {
  Plus,
  Calendar,
  Clock,
  Play,
  Trash2,
  Eye,
  CheckCircle2,
  Filter,
  X,
  Dumbbell,
  AlertTriangle,
  Settings,
  MoreHorizontal,
  Repeat,
  Trash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { toRFC3339String } from "@/lib/utils";
import {
  DEFAULT_TRACKING_FIELDS,
  normalizeTrackingFieldKey,
} from "@/types/exercise";
import type { Client } from "../ClientProfilePage";

interface ClientScheduleProps {
  client: Client;
}

const FIELD_CONFIG: Record<
  string,
  { label: string; placeholder: string; type: string }
> = {
  reps: { label: "REPS", placeholder: "10", type: "text" },
  weight: { label: "WEIGHT", placeholder: "0", type: "number" },
  tempo: { label: "Tempo", placeholder: "3-1-1", type: "text" },
  rest: { label: "REST", placeholder: "00:00", type: "text" },
  rpe: { label: "RPE", placeholder: "1-10", type: "number" },
  time: { label: "Time", placeholder: "00:00", type: "text" },
  speed: { label: "Speed", placeholder: "0", type: "number" },
  cadence: { label: "Cadence", placeholder: "0", type: "number" },
  distance_long: { label: "Distance (L)", placeholder: "0", type: "number" },
  distance_short: { label: "Distance (S)", placeholder: "0", type: "number" },
  one_rm: { label: "%1RM", placeholder: "0", type: "number" },
  rir: { label: "RIR", placeholder: "0", type: "number" },
  heart_rate: { label: "Heart Rate", placeholder: "0", type: "number" },
  hr_zone: { label: "%HR", placeholder: "0", type: "number" },
  watts: { label: "Watts", placeholder: "0", type: "number" },
  rpm: { label: "RPM", placeholder: "0", type: "number" },
  rounds: { label: "Rounds", placeholder: "0", type: "number" },
  sets: { label: "Sets", placeholder: "3", type: "number" },
  notes: { label: "Notes", placeholder: "tempo, technique...", type: "text" },
  work_time: { label: "Work", placeholder: "00:30", type: "text" },
  rest_time: { label: "Rest", placeholder: "00:10", type: "text" },
};

const formatTimeInput = (value: string) => {
  const clean = value.replace(/[^0-9]/g, "");
  if (clean.length === 3) return `${clean.slice(0, 1)}:${clean.slice(1)}`;
  if (clean.length >= 4) return `${clean.slice(0, 2)}:${clean.slice(2, 4)}`;
  return clean;
};

const parseTimeToSeconds = (val: any): number => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  const str = String(val).trim();
  if (str.includes(":")) {
    const parts = str.split(":");
    return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

const getFields = (data: any | undefined) => {
  if (!data) return DEFAULT_TRACKING_FIELDS["strength"];
  if (data.trackingFields && data.trackingFields.length > 0)
    return data.trackingFields;
  return (
    DEFAULT_TRACKING_FIELDS[data.category || "strength"] ||
    DEFAULT_TRACKING_FIELDS["strength"]
  );
};

interface Session {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
}

export default function ClientSchedule({ client }: ClientScheduleProps) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [sessionToReschedule, setSessionToReschedule] =
    useState<Session | null>(null);
  const [newDate, setNewDate] = useState("");
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [exercisesList, setExercisesList] = useState<any[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState("");
  const [swapExerciseIndex, setSwapExerciseIndex] = useState<number | null>(
    null,
  );

  const [newSessionData, setNewSessionData] = useState({
    title: "",
    date: new Date().toISOString().split("T")[0],
    time: "09:00",
    endTime: "10:00",
    format: "straight-sets",
    rounds: 3,
    workTime: 30,
    restTime: 15,
  });

  const [activeSectionIndex, setActiveSectionIndex] = useState<number | null>(
    null,
  );
  const [newSessionSections, setNewSessionSections] = useState<any[]>([]);

  useEffect(() => {
    if (showAddSessionModal && exercisesList.length === 0) {
      api.get("/exercises").then((res) => {
        setExercisesList(res.data || []);
      });
    }
  }, [showAddSessionModal]);

  const fetchSessions = async () => {
    if (!client.id) return;
    try {
      setLoading(true);
      const res = await api.get(`/clients/${client.id}/sessions`);
      const sessionsData =
        res.data?.data?.sessions || res.data?.sessions || res.data || [];
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
    } catch (err) {
      console.error("Failed to fetch schedule", err);
      toast.error("โหลดตารางเวลาไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [client.id]);

  const upcomingSessions = sessions
    .filter((s) => s.status === "scheduled")
    .sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );

  const completedSessions = sessions.filter((s) => s.status === "completed");

  const now = new Date();
  const calculableSessions = sessions.filter(
    (s) =>
      s.status === "completed" ||
      new Date(s.end_time).getTime() < now.getTime(),
  );

  const attendanceRate =
    calculableSessions.length > 0
      ? Math.round((completedSessions.length / calculableSessions.length) * 100)
      : null;

  let filteredSessions = sessions;
  if (statusFilter !== "all") {
    filteredSessions = filteredSessions.filter(
      (s) => s.status === statusFilter,
    );
  }
  filteredSessions = [...filteredSessions].sort((a, b) => {
    const dateA = new Date(a.start_time).getTime();
    const dateB = new Date(b.start_time).getTime();
    return sortBy === "date-asc" ? dateA - dateB : dateB - dateA;
  });

  const resetForm = () => {
    setNewSessionData({
      title: "",
      date: new Date().toISOString().split("T")[0],
      time: "09:00",
      endTime: "10:00",
      format: "straight-sets",
      rounds: 3,
      workTime: 30,
      restTime: 15,
    });
    setNewSessionSections([]);
    setExerciseSearchTerm("");
    setSwapExerciseIndex(null);
    setActiveSectionIndex(null);
  };

  const getDefaultTrackingFields = (
    exerciseId: string,
    category: string,
  ): string[] => {
    const ex = exercisesList.find(
      (e) => e.id.toString() === exerciseId.toString(),
    );
    if (ex?.trackingFields?.length)
      return ex.trackingFields.map(normalizeTrackingFieldKey);
    const cat = (category || ex?.category || "strength").toLowerCase();
    const defaults: Record<string, string[]> = {
      strength: ["reps", "weight", "rpe"],
      "weight-training": ["reps", "weight", "rpe"],
      "weight training": ["reps", "weight", "rpe"],
      cardio: ["time", "distance", "heart_rate"],
      flexibility: ["hold_time", "reps"],
      plyometrics: ["reps", "rounds"],
    };
    return (defaults[cat] || ["reps", "weight", "rpe"]).map(
      normalizeTrackingFieldKey,
    );
  };

  const handleSelectExercise = (exId: string) => {
    const ex = exercisesList.find((e) => e.id === exId);
    if (!ex) return;

    const trackingFields = getDefaultTrackingFields(ex.id, ex.category);

    if (activeSectionIndex === null && swapExerciseIndex === null) return;

    if (swapExerciseIndex !== null && activeSectionIndex !== null) {
      const updated = [...newSessionSections];
      const sec = { ...updated[activeSectionIndex] };
      sec.exercises = [...sec.exercises];
      sec.exercises[swapExerciseIndex] = {
        ...sec.exercises[swapExerciseIndex],
        exerciseId: ex.id,
        name: ex.name,
        category: ex.category || "weight",
        trackingFields,
      };
      updated[activeSectionIndex] = sec;
      setNewSessionSections(updated);
      setSwapExerciseIndex(null);
      setActiveSectionIndex(null);
    } else if (activeSectionIndex !== null) {
      const newExercise = {
        id: Date.now(),
        exerciseId: ex.id,
        name: ex.name,
        category: ex.category || "weight",
        trackingFields,
        sets: [
          {
            setNumber: 1,
            weight: 0,
            reps: 0,
            rpe: 0,
            distance: 0,
            duration: 0,
            pace: 0,
            side: "",
            rest: 60,
            notes: "",
          },
        ],
      };
      const updated = [...newSessionSections];
      const sec = { ...updated[activeSectionIndex] };
      sec.exercises = [...sec.exercises, newExercise];
      updated[activeSectionIndex] = sec;
      setNewSessionSections(updated);
      setActiveSectionIndex(null);
    }
    setShowExercisePicker(false);
    setExerciseSearchTerm("");
  };

  const handleUpdateTrackingFields = (
    sectionIndex: number,
    exerciseIndex: number,
    field: string,
    isChecked: boolean,
  ) => {
    const updated = [...newSessionSections];
    const sec = { ...updated[sectionIndex] };
    sec.exercises = [...sec.exercises];
    const exObj = { ...sec.exercises[exerciseIndex] };

    let currentFields = (exObj.trackingFields || []).map(
      normalizeTrackingFieldKey,
    );
    if (currentFields.length === 0)
      currentFields = getDefaultTrackingFields(
        exObj.exerciseId,
        exObj.category,
      );

    const normalizedField = normalizeTrackingFieldKey(field);
    if (isChecked) {
      if (!currentFields.includes(normalizedField))
        currentFields = [...currentFields, normalizedField];
    } else {
      currentFields = currentFields.filter(
        (f: string) => f !== normalizedField,
      );
    }

    exObj.trackingFields = Array.from(new Set(currentFields));
    sec.exercises[exerciseIndex] = exObj;
    updated[sectionIndex] = sec;
    setNewSessionSections(updated);
  };

  const handleAddSet = (sectionIndex: number, exerciseIndex: number) => {
    const updated = [...newSessionSections];
    const sec = { ...updated[sectionIndex] };
    sec.exercises = [...sec.exercises];
    const ex = { ...sec.exercises[exerciseIndex] };
    const currentSets = ex.sets;
    const lastSet = currentSets[currentSets.length - 1];

    const newSet = {
      ...(lastSet || {}),
      setNumber: currentSets.length + 1,
      weight: lastSet ? lastSet.weight : 0,
      reps: lastSet ? lastSet.reps : 0,
      rpe: lastSet ? lastSet.rpe : 0,
      distance: lastSet ? lastSet.distance : 0,
      duration: lastSet ? lastSet.duration : 0,
      pace: lastSet ? lastSet.pace : 0,
      side: lastSet ? lastSet.side : "",
      rest: lastSet ? lastSet.rest : 60,
      notes: "",
    };
    ex.sets = [...currentSets, newSet];
    sec.exercises[exerciseIndex] = ex;
    updated[sectionIndex] = sec;
    setNewSessionSections(updated);
  };

  const handleRemoveSet = (
    sectionIndex: number,
    exerciseIndex: number,
    setIndex: number,
  ) => {
    const updated = [...newSessionSections];
    const sec = { ...updated[sectionIndex] };
    sec.exercises = [...sec.exercises];
    const ex = { ...sec.exercises[exerciseIndex] };

    ex.sets = ex.sets.filter((_: any, i: number) => i !== setIndex);
    ex.sets.forEach((s: any, i: number) => {
      s.setNumber = i + 1;
    });

    sec.exercises[exerciseIndex] = ex;
    updated[sectionIndex] = sec;
    setNewSessionSections(updated);
  };

  const handleRemoveExercise = (
    sectionIndex: number,
    exerciseIndex: number,
  ) => {
    const updated = [...newSessionSections];
    const sec = { ...updated[sectionIndex] };
    sec.exercises = sec.exercises.filter(
      (_: any, i: number) => i !== exerciseIndex,
    );
    updated[sectionIndex] = sec;
    setNewSessionSections(updated);
  };

  const handleAddSection = () => {
    const newOrder = newSessionSections.length + 1;
    setNewSessionSections([
      ...newSessionSections,
      { id: Date.now(), title: `Section ${newOrder}`, exercises: [] },
    ]);
  };

  const handleRemoveSection = (sectionIndex: number) => {
    setNewSessionSections(
      newSessionSections.filter((_, i) => i !== sectionIndex),
    );
  };

  const handleUpdateSectionTitle = (sectionIndex: number, newTitle: string) => {
    const updated = [...newSessionSections];
    updated[sectionIndex] = { ...updated[sectionIndex], title: newTitle };
    setNewSessionSections(updated);
  };

  const handleSaveSession = async () => {
    const hasExercises = newSessionSections.some(
      (sec) => sec.exercises.length > 0,
    );
    if (!hasExercises) {
      toast.error("กรุณาเพิ่มท่าออกกำลังกายอย่างน้อย 1 ท่า");
      return;
    }

    try {
      setLoading(true);
      const startDateTime = new Date(
        `${newSessionData.date}T${newSessionData.time}:00`,
      );
      const endDateTime = new Date(
        `${newSessionData.date}T${newSessionData.endTime}:00`,
      );

      const sessionRes = await api.post("/sessions", {
        client_id: client.id,
        title: newSessionData.title,
        start_time: toRFC3339String(startDateTime),
        end_time: toRFC3339String(endDateTime),
        status: "scheduled",
        summary:
          newSessionData.format !== "straight-sets"
            ? `Format: ${newSessionData.format}`
            : "",
      });

      const newSessionId = sessionRes.data.id;
      let orderCounter = 1;

      const logPromises = newSessionSections.flatMap((section, secIdx) => {
        return section.exercises.map((ex: any) => {
          const currentOrder = orderCounter++;
          return api.post(`/sessions/${newSessionId}/logs`, {
            exercise_id: parseInt(ex.exerciseId),
            exercise_name: ex.name,
            category: ex.category || "General",
            tracking_fields: ex.trackingFields || [],
            order: currentOrder,
            section_name: section.title,
            section_order: secIdx + 1,
            sets: ex.sets.map((set: any, setIdx: number) => ({
              set_number: setIdx + 1,
              planned_weight_kg: parseFloat(set.weight) || 0,
              planned_reps: parseInt(set.reps) || 0,
              planned_rpe: parseFloat(set.rpe) || 0,
              planned_distance: parseFloat(set.distance) || 0,
              planned_duration_seconds:
                parseTimeToSeconds(set.duration) ||
                parseTimeToSeconds(set.time) ||
                0,
              rest_duration_seconds: parseTimeToSeconds(set.rest) || 60,
              planned_metadata: {
                // Text / time fields
                tempo:          set.tempo     || "",
                hold_time:      set.hold_time || "",
                side:           set.side      || "",
                pace:           set.pace      || "",
                // ✅ FIX: Advanced numeric fields
                speed:          parseFloat(set.speed)          || 0,
                cadence:        parseFloat(set.cadence)        || 0,
                distance_long:  parseFloat(set.distance_long)  || 0,
                distance_short: parseFloat(set.distance_short) || 0,
                one_rm:         parseFloat(set.one_rm)         || 0,
                rir:            parseFloat(set.rir)            || 0,
                heart_rate:     parseFloat(set.heart_rate)     || 0,
                hr_zone:        parseFloat(set.hr_zone)        || 0,
                watts:          parseFloat(set.watts)          || 0,
                rpm:            parseFloat(set.rpm)            || 0,
                rounds:         parseFloat(set.rounds)         || 0,
              },
              notes: set.notes || "",
              completed: false,
            })),
          });
        });
      });

      await Promise.all(logPromises);
      toast.success("บันทึกเซสชันเรียบร้อย");
      setShowAddSessionModal(false);
      resetForm();
      fetchSessions();
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    try {
      await api.delete(`/sessions/${sessionId}`);
      toast.success("ลบนัดหมายเรียบร้อยแล้ว");
      fetchSessions();
    } catch (err) {
      console.error("Failed to delete session", err);
      toast.error("ลบนัดหมายไม่สำเร็จ");
    }
  };

  const handleConfirmReschedule = async () => {
    if (!sessionToReschedule || !newDate) return;
    try {
      const startDateTime = new Date(newDate);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
      await api.patch(`/sessions/${sessionToReschedule.id}`, {
        start_time: toRFC3339String(startDateTime),
        end_time: toRFC3339String(endDateTime),
      });
      toast.success("เปลี่ยนนัดหมายเรียบร้อยแล้ว");
      setIsRescheduleOpen(false);
      fetchSessions();
    } catch (err) {
      console.error("Failed to reschedule", err);
      toast.error("ไม่สามารถเปลี่ยนนัดหมายได้");
    }
  };

  const handleViewSession = (sessionId: number) => {
    navigate(`/trainer/sessions/${sessionId}/log`);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        variant: "default" | "secondary" | "outline" | "destructive";
      }
    > = {
      scheduled: { label: "กำหนดไว้", variant: "default" },
      "in-progress": { label: "กำลังดำเนินการ", variant: "secondary" },
      completed: { label: "เสร็จสิ้น", variant: "outline" },
      cancelled: { label: "ยกเลิก", variant: "destructive" },
    };
    return statusMap[status] || { label: status, variant: "outline" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900 mx-auto mb-4"></div>
          <p className="text-gray-500">กำลังโหลดตารางเวลา...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ===== Quick Stats ===== */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <div className="bg-orange-50/60 md:bg-white rounded-2xl md:rounded-[20px] p-3 md:p-5 border border-orange-100/50 md:border-slate-100 flex flex-col md:shadow-sm transition-all group hover:md:border-orange-200">
          <div className="flex md:flex-row flex-col items-start md:items-center justify-between gap-2 mb-2 md:mb-4">
            <div className="h-8 w-8 md:h-12 md:w-12 rounded-full bg-orange-100/80 md:bg-orange-50 flex items-center justify-center shrink-0 group-hover:md:scale-110 transition-transform">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-orange-600" />
            </div>
            <div className="text-[10px] md:text-sm font-medium text-orange-800 md:text-slate-500 leading-tight">
              นัดที่กำหนดไว้
            </div>
          </div>
          <div className="mt-auto">
            <div className="text-xl md:text-3xl font-bold text-orange-950 md:text-navy-900">
              {upcomingSessions.length}
            </div>
            <p className="text-[9px] md:text-xs text-orange-600/70 md:text-slate-400 font-medium mt-0.5 md:mt-1 truncate">
              นัดที่จะมาถึง
            </p>
          </div>
        </div>

        <div className="bg-blue-50/60 md:bg-white rounded-2xl md:rounded-[20px] p-3 md:p-5 border border-blue-100/50 md:border-slate-100 flex flex-col md:shadow-sm transition-all group hover:md:border-blue-200">
          <div className="flex md:flex-row flex-col items-start md:items-center justify-between gap-2 mb-2 md:mb-4">
            <div className="h-8 w-8 md:h-12 md:w-12 rounded-full bg-blue-100/80 md:bg-blue-50 flex items-center justify-center shrink-0 group-hover:md:scale-110 transition-transform">
              <Clock className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
            </div>
            <div className="text-[10px] md:text-sm font-medium text-blue-800 md:text-slate-500 leading-tight">
              เซสชันที่เสร็จ
            </div>
          </div>
          <div className="mt-auto">
            <div className="text-xl md:text-3xl font-bold text-blue-950 md:text-navy-900">
              {completedSessions.length}
            </div>
            <p className="text-[9px] md:text-xs text-blue-600/70 md:text-slate-400 font-medium mt-0.5 md:mt-1 truncate">
              เซสชันทั้งหมด
            </p>
          </div>
        </div>

        <div className="bg-emerald-50/60 md:bg-white rounded-2xl md:rounded-[20px] p-3 md:p-5 border border-emerald-100/50 md:border-slate-100 flex flex-col md:shadow-sm transition-all group hover:md:border-emerald-200">
          <div className="flex md:flex-row flex-col items-start md:items-center justify-between gap-2 mb-2 md:mb-4">
            <div className="h-8 w-8 md:h-12 md:w-12 rounded-full bg-emerald-100/80 md:bg-emerald-50 flex items-center justify-center shrink-0 group-hover:md:scale-110 transition-transform">
              <div className="h-2 w-2 md:h-3 md:w-3 rounded-full bg-emerald-500" />
            </div>
            <div className="text-[10px] md:text-sm font-medium text-emerald-800 md:text-slate-500 leading-tight">
              อัตราเข้าเรียน
            </div>
          </div>
          <div className="mt-auto">
            <div className="text-xl md:text-3xl font-bold text-emerald-950 md:text-navy-900">
              {attendanceRate !== null ? `${attendanceRate}%` : "N/A"}
            </div>
            <p className="text-[9px] md:text-xs text-emerald-600/70 md:text-slate-400 font-medium mt-0.5 md:mt-1 truncate">
              จากนัดทั้งหมด
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 my-8" />

      {/* ===== Filter Bar ===== */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 text-navy-900 font-medium">
          <Filter className="h-4 w-4 text-slate-500" />
          <span>ตัวกรองประวัติการฝึก</span>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
              <SelectValue placeholder="สถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">สถานะทั้งหมด</SelectItem>
              <SelectItem value="scheduled">กำหนดไว้</SelectItem>
              <SelectItem value="completed">เสร็จสิ้น</SelectItem>
              <SelectItem value="cancelled">ยกเลิก</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
              <SelectValue placeholder="เรียงตาม" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">วันที่ใหม่ - เก่า</SelectItem>
              <SelectItem value="date-asc">วันที่เก่า - ใหม่</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ===== Sessions List ===== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
            <div className="h-6 w-1 bg-navy-900 rounded-full" />
            ประวัติการฝึกทั้งหมด
          </h3>
          <span className="text-sm text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
            ทั้งหมด {filteredSessions.length} รายการ
          </span>
          <Button
            onClick={() => setShowAddSessionModal(true)}
            className="bg-navy-900 hover:bg-navy-800 text-white shadow-lg shadow-navy-900/20 rounded-full px-6 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4 mr-2" />
            นัดหมายใหม่
          </Button>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-12 text-center">
            <div className="h-16 w-16 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-navy-900">ไม่พบตารางฝึก</h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto mt-2">
              ยังไม่มีการนัดหมายในช่วงนี้ กดปุ่ม "นัดหมายใหม่"
              เพื่อสร้างตารางฝึก
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredSessions.map((session) => {
              const sessionDate = new Date(session.start_time);
              const statusBadge = getStatusBadge(session.status);
              const endDate = new Date(session.end_time);
              const durationMinutes = Math.round(
                (endDate.getTime() - sessionDate.getTime()) / 60000,
              );

              return (
                <div
                  key={session.id}
                  className="group bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center gap-5 hover:shadow-lg hover:shadow-slate-200/50 hover:border-orange-100 transition-all duration-300 cursor-default"
                >
                  <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-slate-100 overflow-hidden flex flex-col shadow-sm group-hover:scale-105 transition-transform duration-300">
                    <div className="h-7 bg-navy-900 text-white text-[10px] sm:text-xs font-bold uppercase flex items-center justify-center tracking-wider">
                      {sessionDate.toLocaleDateString("th-TH", {
                        month: "short",
                        year: "2-digit",
                      })}
                    </div>
                    <div className="flex-1 bg-white flex flex-col items-center justify-center">
                      <span className="text-2xl sm:text-3xl font-bold text-navy-900 leading-none">
                        {sessionDate.getDate()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium mt-1">
                        {sessionDate.toLocaleDateString("th-TH", {
                          weekday: "short",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 py-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h4 className="text-lg font-bold text-navy-900 truncate group-hover:text-orange-600 transition-colors">
                        {session.title || "Workout Session"}
                      </h4>
                      <Badge
                        variant={statusBadge.variant}
                        className={
                          session.status === "completed"
                            ? "h-6 px-2.5 bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 gap-1.5"
                            : session.status === "scheduled"
                              ? "h-6 px-2.5 bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100"
                              : "h-6 px-2.5"
                        }
                      >
                        {session.status === "completed" && (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        {statusBadge.label}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
                      <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-md">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span className="font-medium">
                          {sessionDate.toLocaleTimeString("th-TH", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {" - "}
                          {endDate.toLocaleTimeString("th-TH", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {durationMinutes > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          <span>{durationMinutes} นาที</span>
                        </div>
                      )}
                    </div>
                    {session.status === "scheduled" && (
                      <p className="text-xs text-orange-500 mt-2 font-medium flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />{" "}
                        อย่าลืมเช็คอินเมื่อเริ่มฝึก
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 self-end md:self-center ml-auto border-t md:border-t-0 border-slate-100 pt-3 md:pt-0 w-full md:w-auto justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSessionToReschedule(session);
                        setIsRescheduleOpen(true);
                      }}
                      className="h-9 w-9 p-0 rounded-full text-slate-400 hover:text-navy-900 hover:bg-slate-50"
                      title="เลื่อนนัด"
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => e.stopPropagation()}
                          className="h-9 w-9 p-0 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
                          <AlertDialogDescription>
                            คุณแน่ใจหรือไม่ว่าต้องการลบเซสชันนี้?
                            การดำเนินการนี้ไม่สามารถยกเลิกได้
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">
                            ยกเลิก
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteSession(session.id)}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                          >
                            ลบเซสชัน
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <div className="w-px h-6 bg-slate-200 mx-1" />

                    <Button
                      onClick={() => handleViewSession(session.id)}
                      className={`h-9 px-4 rounded-full text-xs font-bold shadow-sm transition-all ${
                        session.status === "completed"
                          ? "bg-slate-100 text-navy-900 hover:bg-slate-200"
                          : "bg-orange-600 text-white hover:bg-orange-700 hover:shadow-orange-200"
                      }`}
                    >
                      {session.status === "completed" ? (
                        <div className="flex items-center gap-2">
                          <Eye className="h-3.5 w-3.5" /> ดูบันทึก
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Play className="h-3.5 w-3.5 fill-current" /> เริ่มฝึก
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== Reschedule Dialog ===== */}
      <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เปลี่ยนนัดหมาย</DialogTitle>
            <DialogDescription>
              เลือกวันและเวลาใหม่สำหรับนัดหมายนี้
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>วันที่และเวลาใหม่</Label>
              <Input
                type="datetime-local"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRescheduleOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleConfirmReschedule}
              disabled={!newDate}
              className="bg-navy-900 text-white hover:bg-navy-800"
            >
              บันทึกการเปลี่ยนแปลง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Add Session Dialog ===== */}
      <Dialog
        open={showAddSessionModal}
        onOpenChange={(open) => {
          setShowAddSessionModal(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="rounded-2xl max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden gap-0">
          <div className="px-6 py-4 border-b border-border shrink-0">
            <DialogHeader>
              <DialogTitle>สร้าง Workout Session ใหม่</DialogTitle>
              <DialogDescription>
                สร้างตารางฝึกซ้อมและกำหนดท่าออกกำลังกายล่วงหน้า
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>วันที่</Label>
                <Input
                  type="date"
                  value={newSessionData.date}
                  onChange={(e) =>
                    setNewSessionData({
                      ...newSessionData,
                      date: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>เวลาเริ่ม</Label>
                <Input
                  type="time"
                  value={newSessionData.time}
                  onChange={(e) =>
                    setNewSessionData({
                      ...newSessionData,
                      time: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>เวลาสิ้นสุด</Label>
                <Input
                  type="time"
                  value={newSessionData.endTime}
                  onChange={(e) =>
                    setNewSessionData({
                      ...newSessionData,
                      endTime: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              {newSessionSections.length === 0 ? (
                <div className="border-2 border-dashed rounded-xl p-8 text-center text-muted-foreground bg-slate-50/50">
                  <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>ยังไม่มีช่วงการฝึกในรายการ</p>
                  <Button variant="link" onClick={handleAddSection}>
                    กดที่นี่เพื่อเพิ่มช่วงการฝึก
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {newSessionSections.map((section, secIdx) => (
                    <div
                      key={section.id || secIdx}
                      className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <Input
                          value={section.title}
                          onChange={(e) =>
                            handleUpdateSectionTitle(secIdx, e.target.value)
                          }
                          className="font-semibold text-sm border-none shadow-none focus-visible:ring-0 p-0 h-auto w-[250px] bg-transparent text-navy-900"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-navy-900"
                            onClick={() => {
                              setActiveSectionIndex(secIdx);
                              setShowExercisePicker(true);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" /> เพิ่มท่าฝึกใน
                            Section
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                            onClick={() => handleRemoveSection(secIdx)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-3">
                        {section.exercises.length === 0 ? (
                          <div className="text-center py-4 text-xs text-slate-400">
                            ยังไม่มีท่าฝึก กดปุ่ม "เพิ่มท่าฝึกใน Section" ด้านบน
                          </div>
                        ) : (
                          section.exercises.map((ex: any, exIdx: number) => {
                            const exData = exercisesList.find(
                              (e) => String(e.id) === String(ex.exerciseId),
                            );
                            const fields: string[] =
                              ex.trackingFields && ex.trackingFields.length > 0
                                ? ex.trackingFields
                                : getFields(exData);

                            return (
                              <Card
                                key={ex.id || exIdx}
                                className="relative overflow-hidden bg-white shadow-sm border-slate-200"
                              >
                                <div className="bg-white border-b border-slate-100 p-3 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="bg-slate-100 font-mono text-xs text-slate-500"
                                    >
                                      #{exIdx + 1}
                                    </Badge>
                                    <span className="font-semibold text-sm">
                                      {ex.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-slate-400 hover:text-navy-900 hover:bg-slate-100"
                                        >
                                          <Settings className="h-4 w-4" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        align="end"
                                        className="w-56 p-0 overflow-hidden"
                                      >
                                        <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                                          <h4 className="font-semibold text-sm text-navy-900">
                                            ตัวชี้วัด
                                          </h4>
                                        </div>

                                        <ScrollArea className="h-[280px] p-3">
                                          <div className="space-y-3 pb-3">
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
                                            ].map((f) => {
                                              const normalized =
                                                normalizeTrackingFieldKey(f);
                                              return (
                                                <div
                                                  key={f}
                                                  className="flex justify-between items-center space-x-2"
                                                >
                                                  <Label
                                                    htmlFor={`field-${secIdx}-${exIdx}-${f}`}
                                                    className="text-xs cursor-pointer flex-1"
                                                  >
                                                    {FIELD_CONFIG[normalized]
                                                      ?.label ||
                                                      FIELD_CONFIG[f]?.label ||
                                                      f}
                                                  </Label>
                                                  <Switch
                                                    id={`field-${secIdx}-${exIdx}-${f}`}
                                                    checked={
                                                      fields.includes(
                                                        normalized,
                                                      ) || fields.includes(f)
                                                    }
                                                    onCheckedChange={(c) =>
                                                      handleUpdateTrackingFields(
                                                        secIdx,
                                                        exIdx,
                                                        f,
                                                        c,
                                                      )
                                                    }
                                                    className="scale-75 data-[state=checked]:bg-navy-900"
                                                  />
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </ScrollArea>
                                      </PopoverContent>
                                    </Popover>

                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-slate-400 hover:text-navy-900 hover:bg-slate-100"
                                        >
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setSwapExerciseIndex(exIdx);
                                            setActiveSectionIndex(secIdx);
                                            setShowExercisePicker(true);
                                          }}
                                        >
                                          <Repeat className="h-4 w-4 mr-2" />{" "}
                                          เปลี่ยนท่า
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleRemoveExercise(secIdx, exIdx)
                                          }
                                          className="text-red-500 hover:text-red-600 focus:text-red-600 focus:bg-red-50"
                                        >
                                          <Trash className="h-4 w-4 mr-2" />{" "}
                                          ลบท่า
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>

                                {/* ===== Set Layout — ProgramBuilder Style ===== */}
                                <div className="p-3 space-y-3 bg-slate-50 border-t border-slate-100">
                                  {ex.sets.map((set: any, setIdx: number) => (
                                    <div
                                      key={setIdx}
                                      className="border p-3 rounded-lg bg-white relative group"
                                    >
                                      <div className="flex justify-between items-center mb-3">
                                        <Badge
                                          variant="secondary"
                                          className="px-2 py-0.5 text-xs font-normal bg-muted text-muted-foreground"
                                        >
                                          Set {setIdx + 1}
                                        </Badge>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-5 w-5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={() =>
                                            handleRemoveSet(secIdx, exIdx, setIdx)
                                          }
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {fields.map((fieldName) => {
                                          let config = FIELD_CONFIG[fieldName];
                                          if (!config) {
                                            const normalized =
                                              normalizeTrackingFieldKey(fieldName);
                                            config = FIELD_CONFIG[normalized] || {
                                              label: fieldName,
                                              placeholder: "-",
                                              type: "text",
                                            };
                                          }
                                          const isTimeField = [
                                            "rest",
                                            "time",
                                            "duration",
                                            "hold_time",
                                            "work_time",
                                            "rest_time",
                                          ].includes(fieldName);

                                          if (fieldName === "notes") {
                                            return (
                                              <div
                                                key={fieldName}
                                                className="col-span-2 sm:col-span-4"
                                              >
                                                <Input
                                                  placeholder={config.placeholder}
                                                  className="h-8 text-xs border-dashed bg-slate-50 focus:bg-white"
                                                  value={set[fieldName] || ""}
                                                  onChange={(e) => {
                                                    const updated = [
                                                      ...newSessionSections,
                                                    ];
                                                    updated[secIdx].exercises[
                                                      exIdx
                                                    ].sets[setIdx][fieldName] =
                                                      e.target.value;
                                                    setNewSessionSections(updated);
                                                  }}
                                                />
                                              </div>
                                            );
                                          }

                                          return (
                                            <div key={fieldName} className="space-y-1">
                                              <span className="text-[10px] text-muted-foreground font-medium uppercase ml-1">
                                                {config.label}
                                              </span>
                                              <Input
                                                className="h-8 text-center border-2 border-gray-300"
                                                placeholder={config.placeholder}
                                                type={config.type}
                                                value={set[fieldName] || ""}
                                                onChange={(e) => {
                                                  let val: any = e.target.value;
                                                  if (isTimeField)
                                                    val = formatTimeInput(val);
                                                  if (
                                                    config.type === "number" &&
                                                    val !== "" &&
                                                    !isTimeField
                                                  ) {
                                                    const p = parseFloat(val);
                                                    val = isNaN(p) ? "" : p;
                                                  }
                                                  const updated = [
                                                    ...newSessionSections,
                                                  ];
                                                  updated[secIdx].exercises[
                                                    exIdx
                                                  ].sets[setIdx][fieldName] = val;
                                                  setNewSessionSections(updated);
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
                                    className="w-full h-8 text-xs font-medium text-slate-500 hover:text-navy-900 hover:bg-slate-200/50 mt-1 bg-slate-100/50 border border-dashed border-slate-200"
                                    onClick={() => handleAddSet(secIdx, exIdx)}
                                  >
                                    <Plus className="h-3.5 w-3.5 mr-1" /> เพิ่ม Set
                                  </Button>
                                </div>
                                {/* ===== End Set Layout ===== */}
                              </Card>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="p-4 border-t border-border flex justify-between gap-2 bg-slate-50/50 shrink-0">
            <Button variant="outline" onClick={handleAddSection}>
              <Plus className="h-4 w-4 mr-1" /> เพิ่ม Section
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddSessionModal(false)}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleSaveSession}
                className="bg-navy-900 hover:bg-navy-800 text-white"
              >
                บันทึกการฝึกซ้อม
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Exercise Picker Dialog ===== */}
      <Dialog open={showExercisePicker} onOpenChange={setShowExercisePicker}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>เลือกท่าออกกำลังกาย</DialogTitle>
            <DialogDescription>
              ค้นหาและเลือกท่าที่ต้องการเพิ่มใน Session
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="ค้นหาท่าฝึก..."
              value={exerciseSearchTerm}
              onChange={(e) => setExerciseSearchTerm(e.target.value)}
            />
            <ScrollArea className="h-[300px] border rounded-md">
              <div className="p-2 space-y-1">
                {exercisesList
                  .filter((ex) =>
                    ex.name
                      .toLowerCase()
                      .includes(exerciseSearchTerm.toLowerCase()),
                  )
                  .map((ex) => (
                    <div
                      key={ex.id}
                      className="flex items-center justify-between p-2 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                      onClick={() => handleSelectExercise(ex.id)}
                    >
                      <span className="font-medium text-sm">{ex.name}</span>
                      <Badge variant="secondary" className="text-[10px]">
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}