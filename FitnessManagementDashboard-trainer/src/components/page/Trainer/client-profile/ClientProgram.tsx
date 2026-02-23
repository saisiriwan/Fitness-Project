import React, { useState, useEffect } from "react";
import {
  Plus,
  Dumbbell,
  Calendar,
  Users,
  Clock,
  BookOpen,
  Trash,
} from "lucide-react";
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

  // Fetch all data (Programs, Details, Sessions)
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch programs and sessions in parallel
      const [programsRes, sessionsRes] = await Promise.all([
        api.get("/programs"),
        api.get(`/schedules?client_id=${client.id}`),
      ]);

      const allPrograms: Program[] = programsRes.data || [];
      const allSchedules = sessionsRes.data || [];

      setPrograms(allPrograms);

      // Find program assigned to THIS client
      const assigned = allPrograms.find((p) => p.client_id === client.id);

      if (assigned) {
        setCurrentProgram(assigned);

        // Fetch details for the assigned program
        const detailsRes = await api.get(`/programs/${assigned.id}`);
        setProgramDetails(detailsRes.data);

        // Calculate Progress
        calculateProgress(assigned, detailsRes.data, allSchedules);
      } else {
        setCurrentProgram(null);
        setProgramDetails(null);
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
      toast.error("โหลดข้อมูลโปรแกรมไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (
    program: any,
    details: any,
    allSchedules: any[],
  ) => {
    if (!program || !details) return;

    // Filter schedules for this program (or fallback to linking by date if needed)
    // Assuming backend populates program_id in schedules as confirmed
    const programSchedules = allSchedules.filter(
      (s: any) => s.program_id === program.id,
    );

    // 1. Calculate Total Sessions
    // Use program days length (actual planned days) if available, else fallback to frequency * duration
    let total = 0;

    // Filter training days (exclude rest days if marked, or just count defined days)
    // Structure: details.days is array of days in the program
    // If it's a template week (days 1-7), we multiply by duration.
    // If it's a full schedule (days 1-30), we just count.
    // Based on `getStructuredWeeks`, it seems to be flattened days.
    // Let's check if 'days' has 'week_number'.
    // If max week_number > 1, it's likely a full schedule.

    if (details.days && details.days.length > 0) {
      // Check if it looks like a template (max week == 1 and duration > 1)
      // But usually 'assign' expands it.
      // Let's assume details.days is the full expanded schedule if assigned.
      // Or if it used a template, it might be just the template.
      // However, for progress, we usually care about "Planned Sessions".
      // If backend `schedules` table is populated upon assignment, we should count `schedules` table!
      // WAIT. If `schedules` rows are created upfront, then `programSchedules.length` IS the total!
      // Let's verify if `schedules` are created upfront.
      // `AssignProgramToClients` usually creates schedules.
      // If so, Total = programSchedules.length.

      // BUT, the user prompt said "Ensure totalSessions ... use programDetails.days.length".
      // Let's stick to user request: use programDetails.days.length.
      total = details.days.filter((d: any) => !d.is_rest).length;

      // Fallback if is_rest not present, just count all days that have exercises?
      // details.days usually are training days.
      if (total === 0 && details.days.length > 0) total = details.days.length;
    } else {
      // Fallback
      total = (program.duration_weeks || 4) * (program.days_per_week || 3);
    }

    // 2. Calculate Completed Sessions
    const completed = programSchedules.filter(
      (s: any) => s.status && s.status.toLowerCase() === "completed",
    ).length;

    // 3. Adherence
    // Count schedules that should have been done by now (start_time < now)
    const now = new Date();
    const pastSchedules = programSchedules.filter(
      (s: any) => new Date(s.start_time) < now,
    );
    const pastCount = pastSchedules.length;

    // Adherence = completed / past_due_sessions
    const adherence =
      pastCount > 0 ? Math.round((completed / pastCount) * 100) : 0;

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
  }, [client.id]);

  const availablePrograms = programs.filter((p) => p.is_template);

  const handleAssignProgram = async (programId: number) => {
    try {
      // API call to clone program for client
      // Fix: Backend expects 'client_ids' as an array, not 'client_id'
      await api.post(`/programs/${programId}/assign`, {
        client_ids: [client.id],
      });
      toast.success("มอบหมายโปรแกรมเรียบร้อยแล้ว");
      setShowProgramSelector(false);
      toast.success("มอบหมายโปรแกรมเรียบร้อยแล้ว");
      setShowProgramSelector(false);
      fetchData(); // Refresh to see the new assigned program
    } catch (err: any) {
      console.error(err);
      const msg =
        err.response?.data?.error || "เกิดข้อผิดพลาดในการมอบหมายโปรแกรม";
      toast.error(msg);
    }
  };

  const handleRemoveProgram = async () => {
    if (!currentProgram) return;
    if (
      !confirm(
        "คุณแน่ใจหรือไม่ที่จะยกเลิกโปรแกรมนี้? การดำเนินการนี้จะลบข้อมูลโปรแกรมของลูกค้า",
      )
    )
      return;

    try {
      await api.delete(`/programs/${currentProgram.id}`);
      toast.success("ยกเลิกโปรแกรมเรียบร้อยแล้ว");
      setCurrentProgram(null);
      setProgramDetails(null);
      // fetchPrograms(); // Optional, local state cleared is enough or refresh
    } catch (err) {
      toast.error("เกิดข้อผิดพลาดในการลบโปรแกรม");
    }
  };

  // Helper to structure 'days' array from backend into 'weeks'
  const getStructuredWeeks = () => {
    if (!programDetails?.days) return [];

    const days: any[] = programDetails.days;
    // Group by week
    const weeks: Record<number, any[]> = {};
    days.forEach((d) => {
      if (!weeks[d.week_number]) weeks[d.week_number] = [];
      weeks[d.week_number].push(d);
    });

    return Object.entries(weeks).map(([weekNum, weekDays]) => ({
      weekNumber: parseInt(weekNum),
      days: weekDays.map((d: any) => ({
        dayNumber: d.day_number,
        name: d.name,
        // Flatten exercises from sections (CamelCase: sections -> exercises)
        exercises: d.sections
          ? d.sections.flatMap((s: any) => s.exercises || [])
          : [],
      })),
    }));
  };

  const weeks = getStructuredWeeks();

  return (
    <div className="space-y-6">
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
                <div className="flex gap-2">
                  <Dialog
                    open={showProgramSelector}
                    onOpenChange={setShowProgramSelector}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        เปลี่ยนโปรแกรม
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>เลือกโปรแกรมใหม่</DialogTitle>
                        <DialogDescription>
                          เลือกโปรแกรมที่ต้องการมอบหมายให้ {client.name}{" "}
                          (โปรแกรมเดิมจะถูกลบ)
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
                                    if (currentProgram) {
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveProgram}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    ยกเลิกโปรแกรม
                  </Button>
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
                  <Badge className="bg-green-100 text-green-700 border-0">
                    กำลังใช้งาน
                  </Badge>
                </div>
              </div>
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
                            className="border border-slate-100 rounded-xl p-3 md:p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                              <div className="font-semibold text-sm text-navy-900">
                                วันที่ {day.dayNumber}: {day.name}
                              </div>
                              <div className="text-[10px] font-bold text-navy-600 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center justify-center shadow-sm">
                                {day.exercises?.length || 0} ท่า
                              </div>
                            </div>
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
              <DialogContent className="max-w-2xl">
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
    </div>
  );
}
