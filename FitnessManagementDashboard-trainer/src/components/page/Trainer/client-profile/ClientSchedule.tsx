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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { toRFC3339String } from "@/lib/utils";
import type { Client } from "../ClientProfilePage";

interface ClientScheduleProps {
  client: Client;
}

// Interface สำหรับข้อมูล Session (จาก API)
interface Session {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
}

export default function ClientSchedule({ client }: ClientScheduleProps) {
  const navigate = useNavigate();
  // State เก็บข้อมูลจริง
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Sort State
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");

  // Reschedule State
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [sessionToReschedule, setSessionToReschedule] =
    useState<Session | null>(null);
  const [newDate, setNewDate] = useState("");

  // --- Add Session State ---
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [exercisesList, setExercisesList] = useState<any[]>([]); // For Picker
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState("");

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

  const [newSessionExercises, setNewSessionExercises] = useState<any[]>([]);

  // Fetch Exercises for Picker
  useEffect(() => {
    if (showAddSessionModal && exercisesList.length === 0) {
      api.get("/exercises").then((res) => {
        setExercisesList(res.data || []);
      });
    }
  }, [showAddSessionModal]);

  // 1. Fetch Sessions จาก Backend
  const fetchSessions = async () => {
    if (!client.id) return;
    try {
      setLoading(true);
      const res = await api.get(`/clients/${client.id}/sessions`);
      // Handle potential nested structure
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

  // Derived State
  const upcomingSessions = sessions
    .filter((s) => s.status === "scheduled")
    .sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );

  const pastSessions = sessions.filter((s) => s.status === "completed");

  // Logic for "Sessions List" (History + All)
  let filteredSessions = sessions;

  if (statusFilter !== "all") {
    filteredSessions = filteredSessions.filter(
      (s) => s.status === statusFilter,
    );
  }

  filteredSessions.sort((a, b) => {
    const dateA = new Date(a.start_time).getTime();
    const dateB = new Date(b.start_time).getTime();

    switch (sortBy) {
      case "date-desc":
        return dateB - dateA;
      case "date-asc":
        return dateA - dateB;
      default:
        return 0;
    }
  });

  // --- Add Session Handlers ---

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
    setNewSessionExercises([]);
    setExerciseSearchTerm("");
  };

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
    setNewSessionExercises((prev) => [...prev, newExercise]);
    setShowExercisePicker(false);
    setExerciseSearchTerm("");
  };

  const handleAddSet = (exerciseIndex: number) => {
    const updated = [...newSessionExercises];
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
    setNewSessionExercises(updated);
  };

  const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...newSessionExercises];
    updated[exerciseIndex].sets.splice(setIndex, 1);
    updated[exerciseIndex].sets.forEach((s: any, i: number) => {
      s.setNumber = i + 1;
    });
    setNewSessionExercises(updated);
  };

  const handleRemoveExercise = (exerciseIndex: number) => {
    const updated = [...newSessionExercises];
    updated.splice(exerciseIndex, 1);
    setNewSessionExercises(updated);
  };

  const handleSaveSession = async () => {
    if (!newSessionExercises.length) {
      toast.error("กรุณาเพิ่มท่าออกกำลังกายอย่างน้อย 1 ท่า");
      return;
    }
    if (!newSessionData.title) {
      toast.error("กรุณาระบุชื่อ Workout Session");
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

      // Create Session
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

      // Create Logs
      const logPromises = newSessionExercises.flatMap((ex, exIdx) => {
        return ex.sets.map((set: any) => {
          return api.post(`/sessions/${newSessionId}/logs`, {
            exercise_id: parseInt(ex.exerciseId),
            exercise_name: ex.name,
            category: ex.category,
            set_number: set.setNumber,
            planned_weight_kg: parseFloat(set.weight) || 0,
            planned_reps: parseInt(set.reps) || 0,
            rest_seconds: parseInt(set.rest) || 60,
            rpe: parseFloat(set.rpe) || 0,
            notes: set.notes || "",
            status: "pending",
            order: exIdx + 1,
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
      fetchSessions(); // Reload
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
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {/* Card 1 */}
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

        {/* Card 2 */}
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
              {pastSessions.length}
            </div>
            <p className="text-[9px] md:text-xs text-blue-600/70 md:text-slate-400 font-medium mt-0.5 md:mt-1 truncate">
              เซสชันทั้งหมด
            </p>
          </div>
        </div>

        {/* Card 3 */}
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
              95%
            </div>
            <p className="text-[9px] md:text-xs text-emerald-600/70 md:text-slate-400 font-medium mt-0.5 md:mt-1 truncate">
              จากนัดทั้งหมด
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 my-8" />

      {/* Filters */}
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

      {/* Sessions List (History) */}
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

              // คำนวณระยะเวลา (ถ้ามี end_time)
              const endDate = new Date(session.end_time);
              const durationMinutes = Math.round(
                (endDate.getTime() - sessionDate.getTime()) / 60000,
              );

              return (
                <div
                  key={session.id}
                  className="group bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center gap-5 hover:shadow-lg hover:shadow-slate-200/50 hover:border-orange-100 transition-all duration-300 cursor-default"
                >
                  {/* Date Box */}
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

                  {/* Info */}
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
                        <AlertTriangle className="h-3 w-3" />
                        อย่าลืมเช็คอินเมื่อเริ่มฝึก
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 self-end md:self-center ml-auto border-t md:border-t-0 border-slate-100 pt-3 md:pt-0 w-full md:w-auto justify-end">
                    {/* Reschedule Start */}
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
                          <Eye className="h-3.5 w-3.5" />
                          ดูบันทึก
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Play className="h-3.5 w-3.5 fill-current" />
                          เริ่มฝึก
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

      {/* Reschedule Dialog */}
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

      {/* --- Add Session Dialog --- */}
      <Dialog
        open={showAddSessionModal}
        onOpenChange={(open) => {
          setShowAddSessionModal(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="rounded-2xl max-w-4xl max-h-[90vh] flex flex-col p-0">
          <div className="px-6 py-4 border-b border-border">
            <DialogHeader>
              <DialogTitle>สร้าง Workout Session ใหม่</DialogTitle>
              <DialogDescription>
                สร้างตารางฝึกซ้อมและกำหนดท่าออกกำลังกายล่วงหน้า
              </DialogDescription>
            </DialogHeader>
          </div>

          <ScrollArea className="flex-1 px-6">
            <div className="space-y-6 py-4">
              {/* 1. Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ชื่อ Workout Session</Label>
                  <Input
                    placeholder="เช่น Chest & Triceps"
                    value={newSessionData.title}
                    onChange={(e) =>
                      setNewSessionData({
                        ...newSessionData,
                        title: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

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

              {/* 2. Exercises Area */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold text-navy-900">
                    รายการท่าฝึก ({newSessionExercises.length})
                  </Label>
                  <Button
                    size="sm"
                    onClick={() => setShowExercisePicker(true)}
                    className="bg-navy-900 text-white hover:bg-navy-800"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    เพิ่มท่าฝึก
                  </Button>
                </div>

                {newSessionExercises.length === 0 ? (
                  <div className="border-2 border-dashed rounded-xl p-8 text-center text-muted-foreground bg-slate-50/50">
                    <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>ยังไม่มีท่าฝึกในรายการ</p>
                    <Button
                      variant="link"
                      onClick={() => setShowExercisePicker(true)}
                    >
                      กดที่นี่เพื่อเพิ่มท่าฝึก
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {newSessionExercises.map((ex, exIdx) => (
                      <Card key={ex.id} className="relative overflow-hidden">
                        <div className="bg-slate-50 border-b p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="bg-white font-mono text-xs"
                            >
                              #{exIdx + 1}
                            </Badge>
                            <span className="font-semibold">{ex.name}</span>
                            <Badge
                              variant="secondary"
                              className="text-[10px] uppercase"
                            >
                              {ex.category}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleRemoveExercise(exIdx)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="p-3 space-y-3">
                          {ex.sets.map((set: any, setIdx: number) => (
                            <div
                              key={setIdx}
                              className="flex items-center gap-3 text-sm"
                            >
                              <div className="w-8 flex-shrink-0 text-center font-bold text-slate-400">
                                {setIdx + 1}
                              </div>
                              <div className="grid grid-cols-4 gap-2 flex-1">
                                <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground uppercase">
                                    นน. (kg)
                                  </span>
                                  <Input
                                    className="h-8"
                                    placeholder="0"
                                    type="number"
                                    value={set.weight}
                                    onChange={(e) => {
                                      const updated = [...newSessionExercises];
                                      updated[exIdx].sets[setIdx].weight =
                                        e.target.value;
                                      setNewSessionExercises(updated);
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground uppercase">
                                    ครั้ง (Reps)
                                  </span>
                                  <Input
                                    className="h-8"
                                    placeholder="0"
                                    value={set.reps}
                                    onChange={(e) => {
                                      const updated = [...newSessionExercises];
                                      updated[exIdx].sets[setIdx].reps =
                                        e.target.value;
                                      setNewSessionExercises(updated);
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground uppercase">
                                    พัก (วิ)
                                  </span>
                                  <Input
                                    className="h-8"
                                    placeholder="60"
                                    type="number"
                                    value={set.rest}
                                    onChange={(e) => {
                                      const updated = [...newSessionExercises];
                                      updated[exIdx].sets[setIdx].rest =
                                        e.target.value;
                                      setNewSessionExercises(updated);
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground uppercase">
                                    RPE
                                  </span>
                                  <Input
                                    className="h-8"
                                    placeholder="-"
                                    value={set.rpe}
                                    onChange={(e) => {
                                      const updated = [...newSessionExercises];
                                      updated[exIdx].sets[setIdx].rpe =
                                        e.target.value;
                                      setNewSessionExercises(updated);
                                    }}
                                  />
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-300 hover:text-red-500 mt-4"
                                onClick={() => handleRemoveSet(exIdx, setIdx)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs border-dashed text-slate-500 hover:text-navy-900 hover:border-navy-900"
                            onClick={() => handleAddSet(exIdx)}
                          >
                            <Plus className="h-3 w-3 mr-1" /> เพิ่ม Set
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          <div className="p-4 border-t border-border flex justify-end gap-2 bg-slate-50/50">
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
        </DialogContent>
      </Dialog>

      {/* --- Exercise Picker Dialog --- */}
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
                        {ex.category}
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
