import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  StickyNote,
  Coffee,
  AlertTriangle,
  Calendar as CalendarIcon,
  Clock,
  User,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { toRFC3339String } from "@/lib/utils";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";

/* Helper: toLocalDateStr — สร้าง YYYY-MM-DD จาก local date (ไม่ใช้ UTC) */
const toLocalDateStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// Session color mapping based on client goal or type
const SESSION_COLORS = [
  "bg-blue-500",
  "bg-pink-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-cyan-500",
];

interface CalendarNote {
  id: string;
  date: string;
  type: "note" | "rest-day";
  title: string;
  content?: string;
}

interface Session {
  id: string;
  clientId: string;
  date: string;
  endTime?: string;
  status: string;
  type?: string;
  title?: string;
  notes?: string; // used for location
  exercises?: any[];
}

interface Client {
  id: string;
  name: string;
  goal: string;
  status: string;
}

export default function Calendar() {
  const navigate = useNavigate();
  // Data State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [calendarNotes, setCalendarNotes] = useState<CalendarNote[]>([]);
  // UI State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Dialog State
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [showRestDayDialog, setShowRestDayDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Session | null>(null);

  // Conflict Detection State
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictSession, setConflictSession] = useState<any>(null);
  const [pendingSessionPayload, setPendingSessionPayload] = useState<any>(null);
  const [canReplace, setCanReplace] = useState(false);

  // Form State
  const [newSession, setNewSession] = useState({
    clientId: "",
    title: "",
    location: "",
    date: "",
    time: "10:00",
    endTime: "11:00",
  });

  useEffect(() => {
    fetchData();
  }, [currentDate]); // Re-fetch when month changes

  /* ฟังก์ชัน: fetchData — ดึง clients + sessions + notes ตามช่วงเดือนที่แสดง */
  const fetchData = useCallback(async () => {
    try {
      // Calculate date range for current view (Month)
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      // Expanded range: Previous month start to Next month end to cover valid transitions
      const startDate = toLocalDateStr(new Date(year, month - 1, 1));
      const endDate = toLocalDateStr(new Date(year, month + 2, 0));

      const [clientsRes, sessionsRes, notesRes] = await Promise.all([
        api.get("/clients"),
        api.get(`/schedules?start_date=${startDate}&end_date=${endDate}`), // Filter by Range
        api.get(`/calendar/notes?startDate=${startDate}&endDate=${endDate}`),
      ]);

      const mappedClients = (clientsRes.data || []).map((c: any) => ({
        id: c.id.toString(),
        name: c.name,
        goal: c.goal || "General",
        status: c.status || "active",
      }));
      setClients(mappedClients);

      const mappedSessions = (
        sessionsRes.data?.data?.sessions ||
        sessionsRes.data ||
        []
      ).map((s: any) => ({
        id: s.id.toString(),
        clientId: s.client_id.toString(),
        date: s.start_time,
        endTime: s.end_time,
        title: s.title,
        status: s.status,
        type: s.type || "workout",
        notes: s.location || s.summary, // location preferred for appointments
        exercises: s.exercises || [], // Mocking structure if backend doesn't return full details
      }));
      setSessions(mappedSessions);

      const mappedNotes = (notesRes.data || []).map((n: any) => ({
        id: n.id.toString(),
        date: n.date, // API should return ISO string
        type: n.type,
        title: n.title,
        content: n.content,
      }));
      setCalendarNotes(mappedNotes);
    } catch (error) {
      console.error("Failed to fetch calendar data", error);
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
    }
  }, [currentDate]);

  /* Helper: getClientById — หาลูกค้าตาม id */
  const getClientById = (id: string) => clients.find((c) => c.id === id);

  /* Helper: getMonthDates — สร้างตาราง 42 วัน (6 สัปดาห์) สำหรับ grid ปฏิทิน */
  const getMonthDates = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const dates: Date[] = [];

    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      dates.push(new Date(year, month, -i));
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      dates.push(new Date(year, month, i));
    }

    const remainingDays = 42 - dates.length;
    for (let i = 1; i <= remainingDays; i++) {
      dates.push(new Date(year, month + 1, i));
    }
    return dates;
  };
  const monthDates = getMonthDates(currentDate);

  /* Helper: getSessionsForDate — กรอง session ที่ตรงกับวันที่ */
  const getSessionsForDate = (date: Date) => {
    const dateStr = toLocalDateStr(date);
    return sessions.filter((session) => session.date.startsWith(dateStr));
  };

  /* Helper: getNotesForDate — กรอง notes (วันหยุด/โน้ต) ตามวันที่ */
  const getNotesForDate = (dateStr: string) => {
    // Need to handle timezone carefully. Backend likely returns UTC/ISO.
    // Comparing strictly by YYYY-MM-DD string part if properly stored.
    return calendarNotes.filter((n) => n.date.startsWith(dateStr));
  };

  const selectedDateStr = toLocalDateStr(selectedDate);
  const selectedDateSessions = useMemo(
    () =>
      sessions
        .filter((s) => s.date.startsWith(selectedDateStr))
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        ),
    [sessions, selectedDateStr],
  );
  const selectedDateNotes = useMemo(
    () => getNotesForDate(selectedDateStr),
    [calendarNotes, selectedDateStr],
  );

  /* ฟังก์ชัน: navigateMonth — เลื่อนเดือนไปก่อน/หลัง */
  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    setCurrentDate(newDate);
  };

  /* ฟังก์ชัน: handleStartSession — คลิกนัดหมาย → เปิดหน้า log หรือ popup รายละเอียด appointment */
  const handleStartSession = (session: Session) => {
    if (session.type === "appointment") {
      setSelectedAppointment(session);
      return;
    }
    navigate(`/trainer/sessions/${session.id}/log`, {
      state: { from: "/trainer/calendar" },
    });
  };

  /* ฟังก์ชัน: openNewSessionDialog — เปิด dialog สร้างนัดหมายใหม่ (reset form) */
  const openNewSessionDialog = () => {
    setNewSession({
      clientId: "",
      title: "",
      location: "",
      date: selectedDateStr,
      time: "10:00",
      endTime: "11:00",
    });
    setShowNewSessionDialog(true);
  };

  /* ฟังก์ชัน: handleCreateSession — สร้างนัดหมายใหม่ผ่าน API + จัดการ conflict 409 */
  const handleCreateSession = async () => {
    if (
      !newSession.clientId ||
      !newSession.date ||
      !newSession.time ||
      !newSession.endTime
    ) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    // Correctly format with Timezone Offset for Go Backend (RFC3339) using shared utility
    const startDateObj = new Date(`${newSession.date}T${newSession.time}:00`);
    const endDateObj = new Date(`${newSession.date}T${newSession.endTime}:00`);

    const startTime = toRFC3339String(startDateObj);
    const endTime = toRFC3339String(endDateObj);

    const payload = {
      client_id: parseInt(newSession.clientId),
      title: newSession.title,
      location: newSession.location,
      start_time: startTime,
      end_time: endTime,
      status: "scheduled",
      type: "appointment", // Explicitly set as appointment
    };

    try {
      await api.post("/sessions", payload);
      toast.success("สร้างนัดหมายสำเร็จ");
      setShowNewSessionDialog(false);
      fetchData();
    } catch (err: any) {
      if (err.response && err.response.status === 409) {
        // Handle Conflict
        setConflictSession(err.response.data.conflicting_session);
        setCanReplace(err.response.data.can_replace);
        setPendingSessionPayload(payload); // Store payload to retry later
        setShowConflictDialog(true);
      } else {
        toast.error("สร้างนัดหมายล้มเหลว");
      }
    }
  };

  /* ฟังก์ชัน: handleConfirmReplace — ลบนัดหมายเดิม (ที่ชน) + สร้างใหม่แทน */
  const handleConfirmReplace = async () => {
    if (!conflictSession || !pendingSessionPayload) return;

    try {
      // 1. Delete the conflicting session
      await api.delete(`/sessions/${conflictSession.id}`);

      // 2. Create the new session
      await api.post("/sessions", pendingSessionPayload);

      toast.success("แทนที่นัดหมายสำเร็จ");
      setShowConflictDialog(false);
      setShowNewSessionDialog(false);
      setConflictSession(null);
      setPendingSessionPayload(null);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการแทนที่นัดหมาย");
    }
  };

  /* ฟังก์ชัน: handleDeleteSession — ลบนัดหมาย (optimistic + rollback) */
  const handleDeleteSession = async (sessionId: string) => {
    const previousSessions = [...sessions];

    // Optimistic update
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setSessionToDelete(null);

    try {
      await api.delete(`/sessions/${sessionId}`);
      toast.success("ลบนัดหมายเรียบร้อย");
    } catch (err) {
      // Rollback on error
      setSessions(previousSessions);
      toast.error("ลบไม่สำเร็จ (กู้คืนข้อมูล)");
    }
  };

  /* ฟังก์ชัน: handleCreateRestDay — กำหนดวันหยุด + ยกเลิกนัดหมายที่มีในวันนั้น */
  const handleCreateRestDay = async () => {
    const hasRestDay = selectedDateNotes.some((n) => n.type === "rest-day");
    if (hasRestDay) {
      toast.error("วันนี้เป็นวันหยุดแล้ว");
      return;
    }
    try {
      const noteDate = new Date(selectedDate);
      noteDate.setHours(12, 0, 0, 0);

      // Soft delete: เปลี่ยน status เป็น cancelled แทนการลบ
      const sessionsToCancel = selectedDateSessions.filter(
        (s) => s.status !== "cancelled",
      );
      if (sessionsToCancel.length > 0) {
        await Promise.all(
          sessionsToCancel.map((s) =>
            api.put(`/schedules/${s.id}`, { status: "cancelled" }),
          ),
        );
      }

      await api.post("/calendar/notes", {
        date: `${toLocalDateStr(noteDate)}T12:00:00Z`,
        type: "rest-day",
        title: "Rest Day",
        content: "",
      });

      const cancelledCount = sessionsToCancel.length;
      toast.success(
        cancelledCount > 0
          ? `กำหนดวันหยุดเรียบร้อย (ยกเลิก ${cancelledCount} นัดหมาย)`
          : "กำหนดวันหยุดเรียบร้อย",
      );
      setShowRestDayDialog(false);
      fetchData();
    } catch (err) {
      toast.error("บันทึกไม่สำเร็จ");
    }
  };

  /* ฟังก์ชัน: handleDeleteNote — ลบ note/วันหยุด + คืนสถานะนัดหมายที่ถูกยกเลิก */
  const handleDeleteNote = async (noteId: string) => {
    try {
      const noteToDelete = calendarNotes.find((n) => n.id === noteId);

      // Undo Rest Day Logic: Restore cancelled sessions
      if (noteToDelete && noteToDelete.type === "rest-day") {
        // Use the note's date to find sessions.
        // Note: note.date is verified to be ISO string with timezone or at least YYYY-MM-DD prefix match works
        const noteDateStr = toLocalDateStr(new Date(noteToDelete.date));
        const sessionsToRestore = sessions.filter(
          (s) => s.date.startsWith(noteDateStr) && s.status === "cancelled",
        );

        if (sessionsToRestore.length > 0) {
          await Promise.all(
            sessionsToRestore.map((s) =>
              api.put(`/schedules/${s.id}`, { status: "scheduled" }),
            ),
          );
        }
      }

      await api.delete(`/calendar/notes/${noteId}`);
      setCalendarNotes((prev) => prev.filter((n) => n.id !== noteId));
      setNoteToDelete(null);
      toast.success("ลบโน้ตเรียบร้อย (คืนค่าสถานะนัดหมาย)");
      fetchData(); // Refresh to show restored sessions
    } catch (err) {
      toast.error("ลบไม่สำเร็จ");
    }
  };

  /* Helper: getSessionColor — กำหนดสี session ตาม clientId (hash) */
  const getSessionColor = (clientId: string) => {
    const hash = clientId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return SESSION_COLORS[hash % SESSION_COLORS.length];
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6 relative">
      {/* Sidebar Collapse Toggle */}
      <motion.button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="absolute top-1/2 -translate-y-1/2 z-50 bg-white hover:shadow-xl shadow-lg rounded-full py-6 px-2.5 transition-all flex items-center justify-center border"
        style={{ left: sidebarCollapsed ? "0rem" : "21rem" }}
        animate={{ left: sidebarCollapsed ? "0rem" : "21rem" }}
        initial={false}
      >
        <ChevronRight
          className={`h-6 w-6 text-primary transition-transform duration-300 ${
            !sidebarCollapsed ? "rotate-180" : ""
          }`}
        />
      </motion.button>

      {/* Sidebar (Details) */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="w-[21rem] bg-gradient-to-br from-blue-50/50 to-white border-r p-6 overflow-y-auto shrink-0"
          >
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#002140]">
                  {selectedDate.toLocaleDateString("th-TH", {
                    weekday: "long",
                  })}
                </h2>
                <p className="text-muted-foreground">
                  {selectedDate.toLocaleDateString("th-TH", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex flex-col h-auto py-3 gap-1"
                  onClick={openNewSessionDialog}
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-xs">นัดหมาย</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="flex flex-col h-auto py-3 gap-1"
                  onClick={() => setShowRestDayDialog(true)}
                >
                  <Coffee className="h-4 w-4" />
                  <span className="text-xs">วันหยุด</span>
                </Button>
              </div>

              {/* Notes List */}
              {selectedDateNotes.length > 0 && (
                <div className="space-y-2">
                  {selectedDateNotes.map((note) => (
                    <div
                      key={note.id}
                      className={`relative p-3 rounded-lg border ${
                        note.type === "rest-day"
                          ? "bg-green-50 border-green-200"
                          : "bg-yellow-50 border-yellow-200"
                      } group`}
                    >
                      <button
                        onClick={() => setNoteToDelete(note.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="flex items-center gap-2 mb-1">
                        {note.type === "rest-day" ? (
                          <Coffee className="h-4 w-4 text-green-700" />
                        ) : (
                          <StickyNote className="h-4 w-4 text-yellow-700" />
                        )}
                        <span
                          className={`font-medium ${
                            note.type === "rest-day"
                              ? "text-green-900"
                              : "text-yellow-900"
                          }`}
                        >
                          {note.title}
                        </span>
                      </div>
                      {note.content && (
                        <p className="text-sm text-gray-700 ml-6">
                          {note.content}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Sessions List */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground">
                  นัดหมาย
                </h3>
                {selectedDateSessions.length > 0 ? (
                  selectedDateSessions.map((session) => {
                    const client = getClientById(session.clientId);
                    const time = new Date(session.date).toLocaleTimeString(
                      "th-TH",
                      { hour: "2-digit", minute: "2-digit", hour12: false },
                    );
                    const color = getSessionColor(session.clientId);

                    const isCancelled = session.status === "cancelled";

                    return (
                      <div
                        key={session.id}
                        className={`p-3 rounded-xl shadow-sm border transition-all group relative ${
                          isCancelled
                            ? "bg-gray-50 opacity-60 cursor-default"
                            : "bg-white hover:shadow-md cursor-pointer"
                        }`}
                        onClick={() =>
                          !isCancelled && handleStartSession(session)
                        }
                      >
                        {!isCancelled && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSessionToDelete(session.id);
                            }}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-red-500 rounded transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        <div className="flex gap-3">
                          <div
                            className={`w-1 rounded-full ${
                              isCancelled ? "bg-gray-300" : color
                            }`}
                          ></div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`font-bold text-sm tracking-tight ${
                                  isCancelled
                                    ? "line-through text-gray-400"
                                    : ""
                                }`}
                              >
                                {time}
                              </span>
                              <Badge
                                variant={
                                  isCancelled
                                    ? "destructive"
                                    : session.status === "completed"
                                      ? "default"
                                      : "secondary"
                                }
                                className="text-[10px] h-5"
                              >
                                {isCancelled ? "ยกเลิก" : session.status}
                              </Badge>
                              {session.type === "appointment" && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-5 ml-1 border-blue-200 text-blue-700 bg-blue-50"
                                >
                                  ทั่วไป
                                </Badge>
                              )}
                            </div>
                            <div
                              className={`font-medium text-sm ${
                                isCancelled ? "line-through text-gray-400" : ""
                              }`}
                            >
                              {client?.name || "Unknown"}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {client?.goal}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                    ไม่มีนัดหมายวันนี้
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Calendar Area */}
      <div className="flex-1 bg-white rounded-3xl p-6 shadow-sm border overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth("prev")}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-2xl font-bold text-[#002140] w-48 text-center">
              {currentDate.toLocaleDateString("th-TH", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth("next")}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const now = new Date();
              setCurrentDate(now);
              setSelectedDate(now);
            }}
          >
            วันนี้
          </Button>
        </div>

        {/* Grid */}
        <div className="flex-1 grid grid-cols-7 grid-rows-[auto_1fr] gap-2">
          {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day) => (
            <div
              key={day}
              className="text-center font-medium text-muted-foreground text-sm py-2"
            >
              {day}
            </div>
          ))}

          <div className="col-span-7 grid grid-cols-7 grid-rows-6 gap-2 h-full">
            {monthDates.map((date, index) => {
              const dateStr = toLocalDateStr(date);
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const isToday = date.toDateString() === new Date().toDateString();
              const isSelected =
                date.toDateString() === selectedDate.toDateString();

              const daySessions = getSessionsForDate(date);
              const dayNotes = getNotesForDate(dateStr);
              const isRestDay = dayNotes.some((n) => n.type === "rest-day");

              return (
                <div
                  key={index}
                  onClick={() => setSelectedDate(date)}
                  className={`
                                    relative p-2 rounded-xl border transition-all cursor-pointer flex flex-col items-start
                                    ${
                                      !isCurrentMonth
                                        ? "opacity-30 bg-gray-50"
                                        : "bg-white"
                                    }
                                    ${
                                      isSelected
                                        ? "ring-2 ring-[#FF6B35] ring-offset-2 z-10"
                                        : "hover:border-blue-200"
                                    }
                                    ${isToday ? "bg-blue-50/50" : ""}
                                    ${isRestDay ? "bg-green-50/50" : ""}
                                `}
                >
                  <div
                    className={`
                                    w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1
                                    ${
                                      isToday
                                        ? "bg-[#002140] text-white"
                                        : isRestDay
                                          ? "text-green-700"
                                          : "text-gray-700"
                                    }
                                `}
                  >
                    {date.getDate()}
                  </div>

                  {isRestDay && (
                    <Coffee className="absolute top-2 right-2 h-3 w-3 text-green-600" />
                  )}

                  {/* Sessions Dots/Preview */}
                  <div className="w-full space-y-1 mt-auto overflow-hidden">
                    {daySessions
                      .filter((s) => s.status !== "cancelled")
                      .slice(0, 2)
                      .map((s) => {
                        const color = getSessionColor(s.clientId);
                        const client = getClientById(s.clientId);
                        return (
                          <div
                            key={s.id}
                            className={`text-[9px] truncate px-1.5 py-0.5 rounded-sm text-white ${color}`}
                          >
                            {client?.name || "Unknown"}
                          </div>
                        );
                      })}
                    {daySessions.filter((s) => s.status !== "cancelled")
                      .length > 2 && (
                      <div className="text-[9px] text-gray-400 pl-1">
                        +
                        {daySessions.filter((s) => s.status !== "cancelled")
                          .length - 2}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Delete Confirmations */}
      <AlertDialog
        open={!!sessionToDelete}
        onOpenChange={() => setSessionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบนัดหมายนี้ใช่หรือไม่
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                sessionToDelete && handleDeleteSession(sessionToDelete)
              }
              className="bg-red-600"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!noteToDelete}
        onOpenChange={() => setNoteToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบโน้ต</AlertDialogTitle>
            <AlertDialogDescription>
              ดำเนินการนี้ไม่สามารถยกเลิกได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => noteToDelete && handleDeleteNote(noteToDelete)}
              className="bg-red-600"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Session Dialog */}
      <Dialog
        open={showNewSessionDialog}
        onOpenChange={setShowNewSessionDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>นัดหมายใหม่</DialogTitle>
            <DialogDescription>
              สร้างนัดหมายใหม่ เลือกข้อมูลลูกค้า วันที่ และเวลา
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>ลูกค้า</Label>
              <Select
                value={newSession.clientId}
                onValueChange={(v) =>
                  setNewSession((p) => ({ ...p, clientId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือก..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>หัวข้อการนัดหมาย</Label>
                <Input
                  value={newSession.title}
                  onChange={(e) =>
                    setNewSession((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="เช่น ปรึกษา, พูดคุยความคืบหน้า, วัดสัดส่วน"
                />
              </div>
              <div>
                <Label>วันที่</Label>
                <Input
                  type="date"
                  value={newSession.date}
                  onChange={(e) =>
                    setNewSession((p) => ({ ...p, date: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>เวลานัดหมาย</Label>
                <Input
                  type="time"
                  value={newSession.time}
                  onChange={(e) =>
                    setNewSession((p) => ({ ...p, time: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>เวลาสิ้นสุด</Label>
                <Input
                  type="time"
                  value={newSession.endTime}
                  onChange={(e) =>
                    setNewSession((p) => ({ ...p, endTime: e.target.value }))
                  }
                />
              </div>
              <div className="col-span-2">
                <Label>สถานที่ (Location)</Label>
                <Input
                  value={newSession.location}
                  onChange={(e) =>
                    setNewSession((p) => ({ ...p, location: e.target.value }))
                  }
                  placeholder="เช่น ห้องฟิตเนส A"
                />
              </div>
            </div>
            <Button className="w-full" onClick={handleCreateSession}>
              สร้างนัดหมาย
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRestDayDialog} onOpenChange={setShowRestDayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>กำหนดวันหยุด</DialogTitle>
            <DialogDescription>
              กำหนดให้วันที่ {selectedDate.toLocaleDateString()}{" "}
              เป็นวันหยุดพักผ่อน
            </DialogDescription>
          </DialogHeader>

          {/* แจ้งเตือนว่ามีนัดหมายที่จะถูกยกเลิก */}
          {selectedDateSessions.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-amber-700 font-medium text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  มี {selectedDateSessions.length} นัดหมายที่จะถูกยกเลิก
                </span>
              </div>
              <div className="space-y-1 ml-6">
                {selectedDateSessions.map((s) => {
                  const client = getClientById(s.clientId);
                  const time = new Date(s.date).toLocaleTimeString("th-TH", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  });
                  return (
                    <div key={s.id} className="text-sm text-amber-800">
                      • {time} - {client?.name || "Unknown"}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowRestDayDialog(false)}
            >
              ยกเลิก
            </Button>
            <Button className="bg-green-600" onClick={handleCreateRestDay}>
              {selectedDateSessions.length > 0
                ? `ยืนยัน (ยกเลิก ${selectedDateSessions.length} นัดหมาย)`
                : "ยืนยัน"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conflict Resolution Dialog */}
      <AlertDialog
        open={showConflictDialog}
        onOpenChange={(open) => {
          setShowConflictDialog(open);
          if (!open) {
            setPendingSessionPayload(null);
            setConflictSession(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div
              className={`flex items-center gap-2 mb-2 ${
                canReplace ? "text-amber-600" : "text-red-600"
              }`}
            >
              <AlertTriangle className="h-6 w-6" />
              <AlertDialogTitle>
                {canReplace ? "พบการนัดหมายซ้อนทับกัน" : "เวลาไม่ว่าง"}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-4">
              <p>
                {canReplace
                  ? "มีรายการนัดหมายอื่นในช่วงเวลานี้อยู่แล้ว:"
                  : "ลูกค้ามีนัดหมายกับเทรนเนอร์ท่านอื่นในช่วงเวลานี้:"}
              </p>
              {conflictSession && (
                <div
                  className={`p-3 rounded-md border text-sm ${
                    canReplace
                      ? "bg-amber-50 border-amber-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <p
                    className={`font-semibold ${
                      canReplace ? "text-amber-900" : "text-red-900"
                    }`}
                  >
                    {conflictSession.title}
                  </p>
                  <p className={canReplace ? "text-amber-800" : "text-red-800"}>
                    เวลา:{" "}
                    {new Date(conflictSession.start_time).toLocaleTimeString(
                      "th-TH",
                      { hour: "2-digit", minute: "2-digit" },
                    )}{" "}
                    -{" "}
                    {new Date(conflictSession.end_time).toLocaleTimeString(
                      "th-TH",
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                  </p>
                </div>
              )}
              <p>
                {canReplace
                  ? "คุณต้องการยกเลิกนัดหมายเดิม แล้วแทนที่ด้วยนัดหมายใหม่หรือไม่?"
                  : "กรุณาเลือกช่วงเวลาอื่นใหม่"}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowConflictDialog(false);
                setPendingSessionPayload(null);
                setConflictSession(null);
              }}
            >
              {canReplace ? "ยกเลิกการทำรายการ" : "ปิด"}
            </AlertDialogCancel>
            {canReplace && (
              <AlertDialogAction
                className="bg-amber-600 hover:bg-amber-700"
                onClick={handleConfirmReplace}
              >
                แทนที่นัดหมายเดิม
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Appointment Details Dialog */}
      <Dialog
        open={!!selectedAppointment}
        onOpenChange={(open) => !open && setSelectedAppointment(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-blue-500" />
              รายละเอียดนัดหมายทั่วไป
            </DialogTitle>
            <DialogDescription>
              {selectedAppointment
                ? new Date(selectedAppointment.date).toLocaleDateString(
                    "th-TH",
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    },
                  )
                : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4 py-4">
              {/* Title */}
              {selectedAppointment.title && (
                <div className="flex items-start gap-3">
                  <div className="bg-blue-50 p-2 rounded-lg text-blue-600 mt-1">
                    <CalendarIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      หัวข้อการนัดหมาย
                    </p>
                    <p className="text-base font-semibold">
                      {selectedAppointment.title}
                    </p>
                  </div>
                </div>
              )}

              {/* Time */}
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-700 mt-1">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    เวลา
                  </p>
                  <p className="text-base font-semibold">
                    {new Date(selectedAppointment.date).toLocaleTimeString(
                      "th-TH",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      },
                    )}
                    {selectedAppointment.endTime &&
                      ` - ${new Date(
                        selectedAppointment.endTime,
                      ).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}`}{" "}
                    น.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-gray-100 p-2 rounded-lg text-gray-700 mt-1">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    สถานที่ / รายละเอียด
                  </p>
                  <p className="text-base font-medium">
                    {selectedAppointment.notes || "-"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
