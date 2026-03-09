import { useState, useEffect, useCallback } from "react";
import { Plus, Dumbbell, Calendar, Clock, Trash, Coffee } from "lucide-react";
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
import { parseLocalTimestamp } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

import type { Client } from "../ClientProfilePage";

interface ClientProgramProps {
  client: Client;
}

interface Program {
  id: number;
  name: string;
  description?: string;
  duration_weeks: number;
  days_per_week: number;
  client_id?: number;
  is_template: boolean;
  status?: string;
  start_date?: string;
  end_date?: string;
  assignedClients?: any[]; // Mock compatibility if needed
  weeks?: ProgramWeek[]; // Full details
}

interface ProgramWeek {
  weekNumber: number;
  days: ProgramDay[];
}

interface ProgramDay {
  dayNumber: number;
  name: string;
  exercises: ProgramExercise[];
}

interface ProgramExercise {
  name?: string; // Derived?
  sets: number;
  reps: string;
  weight: string;
}

export default function ClientProgram({ client }: ClientProgramProps) {
  const navigate = useNavigate();
  const [showProgramSelector, setShowProgramSelector] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  // Current program tailored for this client
  const [currentProgram, setCurrentProgram] = useState<Program | null>(null);
  // Full details of current program
  const [programDetails, setProgramDetails] = useState<any | null>(null);
  const [programProgress, setProgramProgress] = useState({
    completed: 0,
    total: 0,
    percentage: 0,
    adherence: 0,
  });
  const [loading, setLoading] = useState(false);
  const [programSchedules, setProgramSchedules] = useState<any[]>([]);

  /* ฟังก์ชัน: fetchData
     ใช้สำหรับ: ทุกส่วน (โหลดเริ่มต้น + visibilitychange refetch)
     หน้าที่: ดึงโปรแกรม + ตารางเรียน (schedules) + คำนวณความก้าวหน้า */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // ดึงโปรแกรมทั้งหมด + ตารางเรียนของลูกค้า พร้อมกัน (Promise.all)
      const [programsRes, sessionsRes] = await Promise.all([
        api.get("/programs"),
        api.get(`/schedules?client_id=${client.id}`),
      ]);

      const allPrograms: Program[] = programsRes.data || [];
      const allSchedules = sessionsRes.data || [];
      setPrograms(allPrograms);

      // หาโปรแกรมที่ assign ให้ลูกค้าคนนี้ (client_id ตรงกัน)
      const assigned = allPrograms.find((p) => p.client_id === client.id);

      if (assigned) {
        setCurrentProgram(assigned);
        // ดึงรายละเอียดโปรแกรม (วัน, section, ท่า)
        const detailsRes = await api.get(`/programs/${assigned.id}`);
        setProgramDetails(detailsRes.data);
        // เก็บ schedules ของโปรแกรมนี้
        const progSchedules = allSchedules.filter(
          (s: any) => s.program_id === assigned.id,
        );
        setProgramSchedules(progSchedules);
        // คำนวณความก้าวหน้า
        calculateProgress(assigned, detailsRes.data, allSchedules);
      } else {
        // ไม่มีโปรแกรม
        setCurrentProgram(null);
        setProgramDetails(null);
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
      toast.error("โหลดข้อมูลโปรแกรมไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [client.id]);

  /* ฟังก์ชัน: calculateProgress
     ใช้สำหรับ: Card "ความก้าวหน้าโปรแกรม"
     หน้าที่: คำนวณ % ความก้าวหน้า + adherence
     *** total = จำนวน schedule จริงที่ยังมีอยู่ (ไม่ใช้จำนวนวันจาก DB) *** */
  const calculateProgress = (
    program: any,
    _details: any,
    allSchedules: any[],
  ) => {
    if (!program) return;

    // เฉพาะ schedule ที่ยังมีอยู่ (ไม่ถูกยกเลิก) = total ที่แท้จริง
    const active = allSchedules.filter(
      (s: any) =>
        s.program_id === program.id &&
        s.status !== "cancelled" &&
        s.type !== "rest-day",
    );
    const total = active.length;
    const completed = active.filter(
      (s: any) => s.status && s.status.toLowerCase() === "completed",
    ).length;

    const now = new Date();
    const past = active.filter((s: any) => new Date(s.start_time) < now);
    const adherence =
      past.length > 0 ? Math.round((completed / past.length) * 100) : 0;

    setProgramProgress({
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      adherence,
    });
  };

  useEffect(() => {
    if (client.id) {
      fetchData();
    }
  }, [client.id, fetchData]);

  // Auto-refetch when user navigates back from another tab/page (e.g. Calendar)
  // so that session deletions are immediately reflected in progress
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && client.id) {
        fetchData();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [client.id, fetchData]);

  const availablePrograms = programs.filter((p) => p.is_template);
  const pastPrograms = programs.filter(
    (p) =>
      p.client_id === client.id &&
      (!currentProgram || p.id !== currentProgram.id),
  );

  /* ฟังก์ชัน: handleAssignProgram
     ใช้สำหรับ: Dialog เลือกโปรแกรม → ปุ่ม "เลือกโปรแกรมนี้"
     หน้าที่: clone template โปรแกรมให้ลูกค้าผ่าน API /assign */
  const handleAssignProgram = async (programId: number) => {
    try {
      // ส่ง client_ids เป็น array (ตามที่ backend คาดหวัง)
      await api.post(`/programs/${programId}/assign`, {
        client_ids: [client.id],
      });
      toast.success("มอบหมายโปรแกรมเรียบร้อยแล้ว");
      setShowProgramSelector(false); // ปิด dialog
      fetchData(); // โหลดใหม่เพื่อแสดงโปรแกรมที่ assign ใหม่
    } catch (err: any) {
      console.error(err);
      const msg =
        err.response?.data?.error || "เกิดข้อผิดพลาดในการมอบหมายโปรแกรม";
      toast.error(msg);
    }
  };

  /* ฟังก์ชัน: handleRemoveProgram
     ใช้สำหรับ: ปุ่ม "ยกเลิกโปรแกรม" → เปิด AlertDialog
     หน้าที่: เปิด confirmation dialog แล้วลบโปรแกรมจาก API (DELETE) */
  const handleRemoveProgram = () => {
    if (!currentProgram) return;
    setConfirmRemoveOpen(true);
  };

  const confirmRemoveProgram = async () => {
    if (!currentProgram) return;
    try {
      await api.delete(`/programs/${currentProgram.id}`);
      toast.success("ยกเลิกโปรแกรมเรียบร้อยแล้ว");
      setCurrentProgram(null);
      setProgramDetails(null);
      setProgramSchedules([]);
      setProgramProgress({
        completed: 0,
        total: 0,
        percentage: 0,
        adherence: 0,
      });
    } catch (err) {
      toast.error("เกิดข้อผิดพลาดในการลบโปรแกรม");
    } finally {
      setConfirmRemoveOpen(false);
    }
  };

  /* ฟังก์ชัน: getStructuredWeeks
     ใช้สำหรับ: Card "โครงสร้างโปรแกรม"
     หน้าที่: แปลง flat array ของวันจาก backend → จัดกลุ่มตามสัปดาห์ */
  const getStructuredWeeks = () => {
    if (!programDetails?.days) return []; // ถ้าไม่มีข้อมูล → array ว่าง

    const days: any[] = programDetails.days;
    // จัดกลุ่มวันตาม week_number
    const weeks: Record<number, any[]> = {};
    days.forEach((d) => {
      if (!weeks[d.week_number]) weeks[d.week_number] = [];
      weeks[d.week_number].push(d);
    });

    // แปลงเป็น array ของสัปดาห์ + flatten exercises จาก sections
    return Object.entries(weeks).map(([weekNum, weekDays]) => ({
      weekNumber: parseInt(weekNum),
      days: weekDays.map((d: any) => ({
        dayId: d.id,
        dayNumber: d.day_number,
        name: d.name,
        // รวมท่าจากทุก section เข้าด้วยกัน (flatMap)
        exercises: d.sections
          ? d.sections.flatMap((s: any) => s.exercises || [])
          : [],
      })),
    }));
  };

  const weeks = getStructuredWeeks();

  // สร้าง helper เพื่อเช็คว่าโปรแกรมจบหรือยัง
  const isProgramCompleted = () => {
    // 1. เช็คว่า "เซสชันของวันสุดท้ายในโปรแกรม" ถูกตั้งสถานะเป็น "completed" หรือยัง
    // (ดูจาก schedule ล่าสุด/ตัวสุดท้ายของโปรแกรมนี้)
    if (programSchedules && programSchedules.length > 0) {
      // เรียงลำดับตารางเวลาจากเริ่มไปจบ (เกรงว่า API อาจไม่ได้ส่งมาเรียงเวลา 100%)
      const sortedSchedules = [...programSchedules].sort(
        (a: any, b: any) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      );

      const lastSchedule = sortedSchedules[sortedSchedules.length - 1];

      // ถ้าเซสชันสุดท้าย (คิวสุดท้ายของโปรแกรม) เพิ่งทำเสร็จ ถือว่าจบโปรแกรมเลยไม่ต้องรอวันอื่น
      if (
        lastSchedule?.status &&
        lastSchedule.status.toLowerCase() === "completed"
      ) {
        return true;
      }
    }

    // 2. ถ้าเซสชันสุดท้ายยังไม่เสร็จ (หรือลูกค้าสมัครโปรแกรมไว้แต่ไม่ได้ทำ)
    // ให้ fallback ไปเช็คจากวันที่สิ้นสุด
    if (programDetails?.end_date) {
      const endDate = new Date(programDetails.end_date);
      const today = new Date();
      endDate.setHours(23, 59, 59, 999);
      return today > endDate;
    }

    return false;
  };

  const programCompleted = isProgramCompleted();

  // สร้าง mapping: program_day_id → schedule (วันที่จริง + status)
  const dayScheduleMap: Record<number, any> = {};
  programSchedules.forEach((s: any) => {
    if (s.program_day_id) {
      dayScheduleMap[s.program_day_id] = s;
    }
  });

  /* -- Live date range: computed from programSchedules, not DB dates ---
     ถ้าลบ session ออก → effective end date ขยับอัตโนมัติ */
  const activeSchedulesSorted = [...programSchedules]
    .filter((s: any) => s.status !== "cancelled")
    .sort(
      (a: any, b: any) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );

  const effectiveStartDate: string | null =
    activeSchedulesSorted[0]?.start_time ?? programDetails?.start_date ?? null;
  const effectiveEndDate: string | null =
    (activeSchedulesSorted.length > 0
      ? activeSchedulesSorted[activeSchedulesSorted.length - 1]?.start_time
      : null) ??
    programDetails?.end_date ??
    null;

  const nextSession = activeSchedulesSorted.find(
    (s: any) => new Date(s.start_time) > new Date() && s.status !== "completed",
  );

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  /* getDayStatus — ประเมินสถานะแต่ละวันในโครงสร้างโปรแกรม */
  const getDayStatus = (dayId: number | undefined) => {
    if (!dayId) return "no-schedule";
    const s = dayScheduleMap[dayId];
    if (!s) return "deleted"; // session ถูกลบออกจาก Calendar
    if (s.type === "rest-day") return "rest";
    if (s.status === "completed") return "completed";
    if (s.status === "cancelled") return "cancelled";
    if (new Date(s.start_time) < new Date()) return "missed";
    return "scheduled";
  };

  return (
    <div className="space-y-5 pb-4">
      {/* ── Remove Program Confirmation Dialog ── */}
      <AlertDialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <AlertDialogContent
          className="w-[calc(100%-2rem)] max-w-sm sm:max-w-md"
          aria-describedby="remove-program-desc"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการยกเลิกโปรแกรม</AlertDialogTitle>
            <AlertDialogDescription id="remove-program-desc">
              คุณแน่ใจหรือไม่ที่จะยกเลิกโปรแกรม{" "}
              <span className="font-semibold text-navy-900">
                "{currentProgram?.name}"
              </span>
              ? การดำเนินการนี้จะลบข้อมูลโปรแกรมของลูกค้า
              และไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="min-h-[44px] sm:min-h-0">
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveProgram}
              className="bg-red-600 hover:bg-red-700 min-h-[44px] sm:min-h-0"
            >
              ยืนยันการลบโปรแกรม
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {currentProgram ? (
        <>
          {/* Current Program Info */}
          <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden ring-1 ring-slate-100">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100/50 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Dumbbell className="h-5 w-5" />
                    {currentProgram.name}
                  </CardTitle>
                  <CardDescription>
                    {currentProgram.description}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Dialog
                    open={showProgramSelector}
                    onOpenChange={setShowProgramSelector}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={
                          programCompleted
                            ? "bg-navy-900 border-navy-900 text-white hover:bg-navy-800 hover:text-white"
                            : ""
                        }
                      >
                        {programCompleted
                          ? "มอบหมายโปรแกรมใหม่"
                          : "เปลี่ยนโปรแกรม"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[calc(100%-2rem)] max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>เลือกโปรแกรมใหม่</DialogTitle>
                        <DialogDescription>
                          เลือกโปรแกรมที่ต้องการมอบหมายให้ {client.name}{" "}
                          {programCompleted ? "" : "(โปรแกรมเดิมจะถูกลบ)"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                        {availablePrograms.map((program) => (
                          <Card
                            key={program.id}
                            className="cursor-pointer hover:bg-slate-50 transition-colors"
                          >
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg">
                                {program.name}
                              </CardTitle>
                              <CardDescription className="text-sm line-clamp-2">
                                {program.description}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <p className="text-gray-500">ระยะเวลา</p>
                                    <p className="font-medium">
                                      {program.duration_weeks} สัปดาห์
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">ความถี่</p>
                                    <p className="font-medium">
                                      {program.days_per_week} วัน/สัปดาห์
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  className="w-full bg-navy-900 hover:bg-navy-800"
                                  onClick={async () => {
                                    // Remove old first? Or let backend handle?
                                    // Safest to remove old first or have backend handle replacement.
                                    // For now, let's just assign new.
                                    if (currentProgram && !programCompleted) {
                                      await api.delete(
                                        `/programs/${currentProgram.id}`,
                                      );
                                    }
                                    handleAssignProgram(program.id);
                                  }}
                                >
                                  เลือกโปรแกรมนี้
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                  {!programCompleted && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveProgram}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      ยกเลิกโปรแกรม
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">ระยะเวลา</p>
                  <p className="font-medium">
                    {currentProgram.duration_weeks} สัปดาห์
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">ความถี่</p>
                  <p className="font-medium">
                    {currentProgram.days_per_week} วัน/สัปดาห์
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">สถานะ</p>
                  {programCompleted ? (
                    <Badge className="bg-slate-100 text-slate-700 border-0">
                      เสร็จสิ้นแล้ว
                    </Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-700 border-0">
                      กำลังใช้งาน
                    </Badge>
                  )}
                </div>
              </div>
              {/* Live date range — computed from remaining active schedules */}
              {(effectiveStartDate || effectiveEndDate) && (
                <div className="space-y-2 mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="h-4 w-4 text-[#002140] flex-shrink-0" />
                    <span>
                      {effectiveStartDate
                        ? `เริ่ม: ${formatDate(effectiveStartDate)}`
                        : ""}
                      {effectiveStartDate && effectiveEndDate ? " → " : ""}
                      {effectiveEndDate
                        ? `สิ้นสุด: ${formatDate(effectiveEndDate)}`
                        : ""}
                    </span>
                  </div>
                  {nextSession && (
                    <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg">
                      <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>
                        <strong>นัดถัดไป:</strong>{" "}
                        {new Date(nextSession.start_time).toLocaleDateString(
                          "th-TH",
                          {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          },
                        )}{" "}
                        เวลา{" "}
                        {new Date(nextSession.start_time).toLocaleTimeString(
                          "th-TH",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          },
                        )}{" "}
                        น.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Program Progress */}
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
                  <p className="text-sm font-medium">ความก้าวหน้าโดยรวม</p>
                  <p className="text-sm text-gray-600">
                    {programProgress.percentage}%
                  </p>
                </div>
                <Progress value={programProgress.percentage} className="h-2" />
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
                  <p className="text-sm text-gray-500 mb-2">อัตราการเข้าร่วม</p>
                  <div className="text-2xl font-bold">
                    {programProgress.adherence}%
                  </div>
                  <p className="text-xs text-gray-500">จากเซสชันที่ผ่านมา</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Program Structure */}
          <Card className="border-none shadow-sm rounded-2xl bg-white ring-1 ring-slate-100">
            <CardHeader className="pb-3">
              <CardTitle>โครงสร้างโปรแกรม</CardTitle>
              <CardDescription>รายละเอียดการออกแบบโปรแกรม</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weeks.length > 0 ? (
                  weeks.slice(0, 2).map((week: any) => (
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
                        {week.days.map((day: any) => (
                          <div
                            key={day.dayNumber}
                            className={`border border-slate-100 rounded-xl p-3 md:p-4 bg-slate-50/50 transition-colors ${
                              day.dayId &&
                              dayScheduleMap[day.dayId] &&
                              dayScheduleMap[day.dayId].type !== "rest-day"
                                ? "cursor-pointer hover:bg-blue-50/60 hover:border-blue-200 hover:shadow-sm"
                                : "hover:bg-slate-50"
                            }`}
                            onClick={() => {
                              const sched = day.dayId
                                ? dayScheduleMap[day.dayId]
                                : null;
                              if (sched?.id && sched.type !== "rest-day") {
                                navigate(`/trainer/sessions/${sched.id}/log`);
                              }
                            }}
                          >
                            {/* Day header with live status */}
                            {(() => {
                              const status = getDayStatus(day.dayId);
                              const schedule = day.dayId
                                ? dayScheduleMap[day.dayId]
                                : null;
                              const isDeleted = status === "deleted";
                              return (
                                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                                  <div className="min-w-0">
                                    <div
                                      className={`font-semibold text-sm ${
                                        isDeleted
                                          ? "line-through text-slate-400"
                                          : "text-navy-900"
                                      }`}
                                    >
                                      วันที่ {day.dayNumber}: {day.name}
                                    </div>
                                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                                      {isDeleted && (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">
                                          ⏭ ข้ามแล้ว
                                        </span>
                                      )}
                                      {status === "rest" && (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                                          <Coffee className="h-2.5 w-2.5" /> พัก
                                          (Rest Day)
                                        </span>
                                      )}
                                      {status === "completed" && (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                                          ✅ เสร็จแล้ว
                                        </span>
                                      )}
                                      {status === "cancelled" && (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                                          ❌ ยกเลิก
                                        </span>
                                      )}
                                      {status === "missed" && (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">
                                          ⚠ ยังไม่ได้ทำ
                                        </span>
                                      )}
                                      {status === "scheduled" && schedule && (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                                          <Calendar className="h-2.5 w-2.5" />
                                          {new Date(
                                            schedule.start_time,
                                          ).toLocaleDateString("th-TH", {
                                            day: "numeric",
                                            month: "short",
                                          })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {!isDeleted && (
                                    <div className="text-[10px] font-bold text-navy-600 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center justify-center shadow-sm flex-shrink-0">
                                      {day.exercises?.length || 0} ท่า
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                            <div className="space-y-2">
                              {day.exercises && day.exercises.length > 0 ? (
                                <>
                                  {day.exercises
                                    .slice(0, 3)
                                    .map((exercise: any, idx: number) => (
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
                                    ))}
                                  {day.exercises.length > 3 && (
                                    <div className="text-[10px] text-gray-400 italic mt-1 ml-5">
                                      และอีก {day.exercises.length - 3} ท่า...
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="text-xs text-muted-foreground italic">
                                  พัก / ไม่มีท่าฝึก
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    กำลังโหลดรายละเอียด...
                  </div>
                )}

                {weeks.length > 2 && (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm">
                      และอีก {weeks.length - 2} สัปดาห์...
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        /* No Program Assigned */
        <Card className="border-none shadow-sm rounded-2xl bg-white ring-1 ring-slate-100">
          <CardContent className="text-center py-16 px-4">
            <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-5 shadow-sm border border-slate-100">
              <Dumbbell className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-semibold mb-2">ยังไม่มีโปรแกรม</h3>
            <p className="text-gray-500 mb-6">
              {client.name} ยังไม่ได้รับมอบหมายโปรแกรมการออกกำลังกาย
            </p>

            <Dialog
              open={showProgramSelector}
              onOpenChange={setShowProgramSelector}
            >
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 bg-navy-900 text-white hover:bg-navy-800">
                  <Plus className="h-4 w-4" />
                  มอบหมายโปรแกรม
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100%-2rem)] max-w-2xl">
                <DialogHeader>
                  <DialogTitle>เลือกโปรแกรม</DialogTitle>
                  <DialogDescription>
                    เลือกโปรแกรมที่ต้องการมอบหมายให้ {client.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {availablePrograms.length === 0 ? (
                    <div className="col-span-2 text-center py-8">
                      <p className="text-gray-500 mb-4">
                        ยังไม่มีแม่แบบโปรแกรม
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => navigate("/trainer/programs")}
                      >
                        ไปที่ตัวจัดการโปรแกรมเพื่อสร้างใหม่
                      </Button>
                    </div>
                  ) : (
                    availablePrograms.map((program) => (
                      <Card
                        key={program.id}
                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">
                            {program.name}
                          </CardTitle>
                          <CardDescription className="text-sm line-clamp-2">
                            {program.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-gray-500">ระยะเวลา</p>
                                <p className="font-medium">
                                  {program.duration_weeks} สัปดาห์
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">ความถี่</p>
                                <p className="font-medium">
                                  {program.days_per_week} วัน/สัปดาห์
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className="w-full bg-navy-900 hover:bg-navy-800"
                              onClick={() => handleAssignProgram(program.id)}
                            >
                              เลือกโปรแกรมนี้
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {/* Program History */}
      {pastPrograms.length > 0 && (
        <Card className="border-none shadow-sm rounded-2xl bg-white ring-1 ring-slate-100">
          <CardHeader className="pb-3 border-b border-slate-100/50">
            <CardTitle className="text-lg">ประวัติโปรแกรม</CardTitle>
            <CardDescription>
              โปรแกรมทั้งหมดที่เคยมอบหมายให้ {client.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {pastPrograms.map((p) => (
              <div
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors gap-3"
                style={{ opacity: p.status === "cancelled" ? 0.7 : 1 }}
              >
                <div>
                  <h4 className="font-semibold text-navy-900">{p.name}</h4>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                    {p.description || "ไม่มีรายละเอียด"}
                  </p>
                </div>
                <div className="flex items-center gap-4 sm:mt-0 text-sm">
                  <div className="flex flex-col sm:items-end">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {p.duration_weeks} สัปดาห์ ({p.days_per_week} วัน/สัปดาห์)
                    </span>
                    {p.start_date && (
                      <span className="text-xs text-slate-400 mt-0.5">
                        เริ่ม:{" "}
                        {new Date(p.start_date).toLocaleDateString("th-TH", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {p.end_date &&
                          ` - ${new Date(p.end_date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}`}
                      </span>
                    )}
                  </div>
                  {p.status === "cancelled" ? (
                    <Badge
                      variant="outline"
                      className="text-red-600 border-red-200 bg-red-50 text-xs"
                    >
                      ยกเลิกแล้ว
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-slate-600 border-slate-200 bg-slate-50 text-xs"
                    >
                      จบแล้ว
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
