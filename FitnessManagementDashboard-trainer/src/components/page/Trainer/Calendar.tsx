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
  ChevronDown,
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

/* ─── Helpers ─── */
const toLocalDateStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const SESSION_COLORS = [
  "bg-blue-500",
  "bg-pink-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-cyan-500",
];

/* ─── Types ─── */
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
  notes?: string;
  exercises?: any[];
}

interface Client {
  id: string;
  name: string;
  goal: string;
  status: string;
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function Calendar() {
  const navigate = useNavigate();

  /* Data */
  const [sessions, setSessions] = useState<Session[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [calendarNotes, setCalendarNotes] = useState<CalendarNote[]>([]);

  /* UI */
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false); // mobile day-detail panel

  /* Dialog */
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [showRestDayDialog, setShowRestDayDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Session | null>(null);

  /* Conflict */
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictSession, setConflictSession] = useState<any>(null);
  const [pendingSessionPayload, setPendingSessionPayload] = useState<any>(null);
  const [canReplace, setCanReplace] = useState(false);

  /* Form */
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
  }, [currentDate]);

  const fetchData = useCallback(async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = toLocalDateStr(new Date(year, month - 1, 1));
      const endDate = toLocalDateStr(new Date(year, month + 2, 0));

      const [clientsRes, sessionsRes, notesRes] = await Promise.all([
        api.get("/clients"),
        api.get(`/schedules?start_date=${startDate}&end_date=${endDate}`),
        api.get(`/calendar/notes?startDate=${startDate}&endDate=${endDate}`),
      ]);

      setClients(
        (clientsRes.data || []).map((c: any) => ({
          id: c.id.toString(),
          name: c.name,
          goal: c.goal || "General",
          status: c.status || "active",
        })),
      );

      setSessions(
        (sessionsRes.data?.data?.sessions || sessionsRes.data || []).map(
          (s: any) => ({
            id: s.id.toString(),
            clientId: s.client_id.toString(),
            date: s.start_time,
            endTime: s.end_time,
            title: s.title,
            status: s.status,
            type: s.type || "workout",
            notes: s.location || s.summary,
            exercises: s.exercises || [],
          }),
        ),
      );

      setCalendarNotes(
        (notesRes.data || []).map((n: any) => ({
          id: n.id.toString(),
          date: n.date,
          type: n.type,
          title: n.title,
          content: n.content,
        })),
      );
    } catch (error) {
      console.error("Failed to fetch calendar data", error);
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    }
  }, [currentDate]);

  /* ─── Derived ─── */
  const getClientById = (id: string) => clients.find((c) => c.id === id);

  const getMonthDates = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const dates: Date[] = [];
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--)
      dates.push(new Date(year, month, -i));
    for (let i = 1; i <= lastDay.getDate(); i++)
      dates.push(new Date(year, month, i));
    const remaining = 42 - dates.length;
    for (let i = 1; i <= remaining; i++)
      dates.push(new Date(year, month + 1, i));
    return dates;
  };
  const monthDates = getMonthDates(currentDate);

  const getSessionsForDate = (date: Date) => {
    const dateStr = toLocalDateStr(date);
    return sessions.filter((s) => s.date.startsWith(dateStr));
  };

  const getNotesForDate = (dateStr: string) =>
    calendarNotes.filter((n) => n.date.startsWith(dateStr));

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

  const getSessionColor = (clientId: string) => {
    const hash = clientId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return SESSION_COLORS[hash % SESSION_COLORS.length];
  };

  /* ─── Actions ─── */
  const navigateMonth = (direction: "prev" | "next") => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + (direction === "next" ? 1 : -1));
    setCurrentDate(d);
  };

  const handleStartSession = (session: Session) => {
    if (session.type === "rest-day") return;
    if (session.type === "appointment") {
      setSelectedAppointment(session);
      return;
    }
    navigate(`/trainer/sessions/${session.id}/log`, {
      state: { from: "/trainer/calendar" },
    });
  };

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
    const startDateObj = new Date(`${newSession.date}T${newSession.time}:00`);
    const endDateObj = new Date(`${newSession.date}T${newSession.endTime}:00`);
    const payload = {
      client_id: parseInt(newSession.clientId),
      title: newSession.title,
      location: newSession.location,
      start_time: toRFC3339String(startDateObj),
      end_time: toRFC3339String(endDateObj),
      status: "scheduled",
      type: "appointment",
    };
    try {
      await api.post("/sessions", payload);
      toast.success("สร้างนัดหมายสำเร็จ");
      setShowNewSessionDialog(false);
      fetchData();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setConflictSession(err.response.data.conflicting_session);
        setCanReplace(err.response.data.can_replace);
        setPendingSessionPayload(payload);
        setShowConflictDialog(true);
      } else {
        toast.error("สร้างนัดหมายล้มเหลว");
      }
    }
  };

  const handleConfirmReplace = async () => {
    if (!conflictSession || !pendingSessionPayload) return;
    try {
      await api.delete(`/sessions/${conflictSession.id}`);
      await api.post("/sessions", pendingSessionPayload);
      toast.success("แทนที่นัดหมายสำเร็จ");
      setShowConflictDialog(false);
      setShowNewSessionDialog(false);
      setConflictSession(null);
      setPendingSessionPayload(null);
      fetchData();
    } catch (err) {
      toast.error("เกิดข้อผิดพลาดในการแทนที่นัดหมาย");
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const previous = [...sessions];
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setSessionToDelete(null);
    try {
      await api.delete(`/sessions/${sessionId}`);
      toast.success("ลบนัดหมายเรียบร้อย");
    } catch {
      setSessions(previous);
      toast.error("ลบไม่สำเร็จ (กู้คืนข้อมูล)");
    }
  };

  const handleCreateRestDay = async () => {
    if (selectedDateNotes.some((n) => n.type === "rest-day")) {
      toast.error("วันนี้เป็นวันหยุดแล้ว");
      return;
    }
    try {
      const noteDate = new Date(selectedDate);
      noteDate.setHours(12, 0, 0, 0);
      const toCancel = selectedDateSessions.filter(
        (s) => s.status !== "cancelled",
      );
      if (toCancel.length > 0) {
        await Promise.all(
          toCancel.map((s) =>
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
      toast.success(
        toCancel.length > 0
          ? `กำหนดวันหยุดเรียบร้อย (ยกเลิก ${toCancel.length} นัดหมาย)`
          : "กำหนดวันหยุดเรียบร้อย",
      );
      setShowRestDayDialog(false);
      fetchData();
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const note = calendarNotes.find((n) => n.id === noteId);
      if (note?.type === "rest-day") {
        const noteDateStr = toLocalDateStr(new Date(note.date));
        const toRestore = sessions.filter(
          (s) => s.date.startsWith(noteDateStr) && s.status === "cancelled",
        );
        if (toRestore.length > 0) {
          await Promise.all(
            toRestore.map((s) =>
              api.put(`/schedules/${s.id}`, { status: "scheduled" }),
            ),
          );
        }
      }
      await api.delete(`/calendar/notes/${noteId}`);
      setCalendarNotes((prev) => prev.filter((n) => n.id !== noteId));
      setNoteToDelete(null);
      toast.success("ลบโน้ตเรียบร้อย (คืนค่าสถานะนัดหมาย)");
      fetchData();
    } catch {
      toast.error("ลบไม่สำเร็จ");
    }
  };

  /* ─── Day Detail Panel (shared between sidebar + mobile panel) ─── */
  const DayDetailContent = () => (
    <div className="space-y-5">
      {/* Date heading */}
      <div>
        <h2 className="text-xl font-bold text-[#002140]">
          {selectedDate.toLocaleDateString("th-TH", { weekday: "long" })}
        </h2>
        <p className="text-sm text-muted-foreground">
          {selectedDate.toLocaleDateString("th-TH", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex flex-col h-auto py-3 gap-1 min-h-[56px]"
          onClick={openNewSessionDialog}
        >
          <Plus className="h-4 w-4" />
          <span className="text-xs">นัดหมาย</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex flex-col h-auto py-3 gap-1 min-h-[56px]"
          onClick={() => setShowRestDayDialog(true)}
        >
          <Coffee className="h-4 w-4" />
          <span className="text-xs">วันหยุด</span>
        </Button>
      </div>

      {/* Notes */}
      {selectedDateNotes.length > 0 && (
        <div className="space-y-2">
          {selectedDateNotes.map((note) => (
            <div
              key={note.id}
              className={`relative p-3 rounded-lg border group ${
                note.type === "rest-day"
                  ? "bg-green-50 border-green-200"
                  : "bg-yellow-50 border-yellow-200"
              }`}
            >
              <button
                onClick={() => setNoteToDelete(note.id)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 min-w-[32px] min-h-[32px] flex items-center justify-center hover:text-red-600 transition-opacity"
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
                  className={`font-medium text-sm ${note.type === "rest-day" ? "text-green-900" : "text-yellow-900"}`}
                >
                  {note.title}
                </span>
              </div>
              {note.content && (
                <p className="text-sm text-gray-700 ml-6">{note.content}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sessions */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground">
          นัดหมาย ({selectedDateSessions.length})
        </h3>
        {selectedDateSessions.length > 0 ? (
          selectedDateSessions.map((session) => {
            const client = getClientById(session.clientId);
            const time = new Date(session.date).toLocaleTimeString("th-TH", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
            const color = getSessionColor(session.clientId);
            const isCancelled = session.status === "cancelled";
            return (
              <div
                key={session.id}
                className={`p-3 rounded-xl shadow-sm border transition-all group relative ${
                  isCancelled || session.type === "rest-day"
                    ? "bg-gray-50 opacity-60 cursor-default"
                    : "bg-white hover:shadow-md cursor-pointer"
                }`}
                onClick={() =>
                  !isCancelled &&
                  session.type !== "rest-day" &&
                  handleStartSession(session)
                }
              >
                {!isCancelled && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSessionToDelete(session.id);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 min-w-[32px] min-h-[32px] flex items-center justify-center hover:bg-red-50 text-red-500 rounded transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <div className="flex gap-3">
                  <div
                    className={`w-1 rounded-full flex-shrink-0 ${isCancelled ? "bg-gray-300" : color}`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`font-bold text-sm tracking-tight ${isCancelled ? "line-through text-gray-400" : ""}`}
                      >
                        {time}
                      </span>
                      {session.type === "rest-day" ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 border-green-200 text-green-700 bg-green-50"
                        >
                          พักผ่อน (Rest)
                        </Badge>
                      ) : (
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
                      )}
                      {session.type === "appointment" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 border-blue-200 text-blue-700 bg-blue-50"
                        >
                          ทั่วไป
                        </Badge>
                      )}
                    </div>
                    <div
                      className={`font-medium text-sm truncate ${isCancelled ? "line-through text-gray-400" : ""}`}
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
          <div className="text-center py-5 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
            ไม่มีนัดหมายวันนี้
          </div>
        )}
      </div>
    </div>
  );

  /* ─── Calendar Grid ─── */
  const CalendarGrid = () => (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="min-w-[44px] min-h-[44px]"
            onClick={() => navigateMonth("prev")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg sm:text-2xl font-bold text-[#002140] text-center min-w-[9rem] sm:min-w-[12rem]">
            {currentDate.toLocaleDateString("th-TH", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="min-w-[44px] min-h-[44px]"
            onClick={() => navigateMonth("next")}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="min-h-[36px]"
          onClick={() => {
            const now = new Date();
            setCurrentDate(now);
            setSelectedDate(now);
          }}
        >
          วันนี้
        </Button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day) => (
          <div
            key={day}
            className="text-center font-medium text-muted-foreground text-xs sm:text-sm py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 grid-rows-6 gap-1 flex-1">
        {monthDates.map((date, index) => {
          const dateStr = toLocalDateStr(date);
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const isToday = date.toDateString() === new Date().toDateString();
          const isSelected =
            date.toDateString() === selectedDate.toDateString();
          const daySessions = getSessionsForDate(date);
          const dayNotes = getNotesForDate(dateStr);
          const isRestDay = dayNotes.some((n) => n.type === "rest-day");
          const activeCount = daySessions.filter(
            (s) => s.status !== "cancelled",
          ).length;

          return (
            <div
              key={index}
              onClick={() => {
                setSelectedDate(date);
                setMobileDetailOpen(true);
              }}
              className={`
                relative p-1 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col items-start min-h-[2.5rem] sm:min-h-[4rem]
                ${!isCurrentMonth ? "opacity-30 bg-gray-50" : "bg-white"}
                ${isSelected ? "ring-2 ring-[#FF6B35] ring-offset-1 z-10" : "hover:border-blue-200"}
                ${isToday ? "bg-blue-50/50" : ""}
                ${isRestDay ? "bg-green-50/50" : ""}
              `}
            >
              {/* Date number */}
              <div
                className={`
                  w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-xs sm:text-sm font-medium
                  ${isToday ? "bg-[#002140] text-white" : isRestDay ? "text-green-700" : "text-gray-700"}
                `}
              >
                {date.getDate()}
              </div>

              {isRestDay && (
                <Coffee className="absolute top-1 right-1 h-2.5 w-2.5 sm:h-3 sm:w-3 text-green-600" />
              )}

              {/* Desktop: session name pills */}
              <div className="hidden sm:block w-full space-y-0.5 mt-auto overflow-hidden">
                {daySessions
                  .filter((s) => s.status !== "cancelled")
                  .slice(0, 2)
                  .map((s) => {
                    const color = getSessionColor(s.clientId);
                    const client = getClientById(s.clientId);
                    const isRestSession = s.type === "rest-day";
                    return (
                      <div
                        key={s.id}
                        className={`text-[9px] truncate px-1.5 py-0.5 rounded-sm ${isRestSession ? "bg-green-100 text-green-700" : "text-white " + color}`}
                      >
                        {client?.name || "Unknown"}{" "}
                        {isRestSession ? "(Rest)" : ""}
                      </div>
                    );
                  })}
                {activeCount > 2 && (
                  <div className="text-[9px] text-gray-400 pl-1">
                    +{activeCount - 2}
                  </div>
                )}
              </div>

              {/* Mobile: dot indicator */}
              {activeCount > 0 && (
                <div className="sm:hidden absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {Math.min(activeCount, 3) > 0 && (
                    <div
                      className={`w-1 h-1 rounded-full ${daySessions[0].type === "rest-day" ? "bg-green-500" : getSessionColor(daySessions[0].clientId)}`}
                    />
                  )}
                  {activeCount > 1 && (
                    <div
                      className={`w-1 h-1 rounded-full ${daySessions[1].type === "rest-day" ? "bg-green-500" : getSessionColor(daySessions[1].clientId)}`}
                    />
                  )}
                  {activeCount > 2 && (
                    <div className="w-1 h-1 rounded-full bg-gray-400" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════ */
  return (
    <div className="flex flex-col lg:flex-row gap-4 relative h-full pb-3">
      {/* ─────────────────────────────────────────
          DESKTOP Sidebar + toggle button
          Hidden on mobile (< lg)
      ───────────────────────────────────────── */}
      {/* Sidebar collapse toggle — desktop only */}
      <motion.button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="hidden lg:flex absolute top-1/2 -translate-y-1/2 z-50 bg-white hover:shadow-xl shadow-lg rounded-full py-6 px-2.5 items-center justify-center border"
        style={{ left: sidebarCollapsed ? "0rem" : "21rem" }}
        animate={{ left: sidebarCollapsed ? "0rem" : "21rem" }}
        initial={false}
      >
        <ChevronRight
          className={`h-5 w-5 text-primary transition-transform duration-300 ${!sidebarCollapsed ? "rotate-180" : ""}`}
        />
      </motion.button>

      {/* Desktop sidebar */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="hidden lg:block w-[21rem] bg-gradient-to-br from-blue-50/50 to-white border-r p-6 overflow-y-auto shrink-0 rounded-2xl"
          >
            <DayDetailContent />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────
          CALENDAR GRID (all screen sizes)
      ───────────────────────────────────────── */}
      <div className="flex-1 bg-white rounded-2xl p-3 sm:p-5 shadow-sm border overflow-hidden flex flex-col">
        <CalendarGrid />
      </div>

      {/* ─────────────────────────────────────────
          MOBILE Day Detail Panel (< lg)
          Slides down below calendar when a date is tapped
      ───────────────────────────────────────── */}
      <AnimatePresence>
        {mobileDetailOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden bg-white border rounded-2xl shadow-md overflow-hidden"
          >
            {/* Header bar with close */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b">
              <span className="font-semibold text-sm text-[#002140]">
                {selectedDate.toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <button
                onClick={() => setMobileDetailOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground"
                aria-label="ปิด"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[55vh]">
              <DayDetailContent />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
          DIALOGS (all mobile-safe)
      ══════════════════════════════════════ */}

      {/* Delete session */}
      <AlertDialog
        open={!!sessionToDelete}
        onOpenChange={() => setSessionToDelete(null)}
      >
        <AlertDialogContent
          className="w-[calc(100%-2rem)] max-w-sm sm:max-w-md"
          aria-describedby="del-session-desc"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription id="del-session-desc">
              คุณต้องการลบนัดหมายนี้ใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="min-h-[44px] sm:min-h-0">
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                sessionToDelete && handleDeleteSession(sessionToDelete)
              }
              className="bg-red-600 hover:bg-red-700 min-h-[44px] sm:min-h-0"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete note */}
      <AlertDialog
        open={!!noteToDelete}
        onOpenChange={() => setNoteToDelete(null)}
      >
        <AlertDialogContent
          className="w-[calc(100%-2rem)] max-w-sm sm:max-w-md"
          aria-describedby="del-note-desc"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบโน้ต</AlertDialogTitle>
            <AlertDialogDescription id="del-note-desc">
              ดำเนินการนี้ไม่สามารถยกเลิกได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="min-h-[44px] sm:min-h-0">
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => noteToDelete && handleDeleteNote(noteToDelete)}
              className="bg-red-600 hover:bg-red-700 min-h-[44px] sm:min-h-0"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New session */}
      <Dialog
        open={showNewSessionDialog}
        onOpenChange={setShowNewSessionDialog}
      >
        <DialogContent className="w-[calc(100%-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>นัดหมายใหม่</DialogTitle>
            <DialogDescription>
              สร้างนัดหมายใหม่ เลือกข้อมูลลูกค้า วันที่ และเวลา
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>ลูกค้า</Label>
              <Select
                value={newSession.clientId}
                onValueChange={(v) =>
                  setNewSession((p) => ({ ...p, clientId: v }))
                }
              >
                <SelectTrigger className="min-h-[44px] sm:min-h-0 mt-1">
                  <SelectValue placeholder="เลือกลูกค้า..." />
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
            <div>
              <Label>หัวข้อการนัดหมาย</Label>
              <Input
                className="mt-1 min-h-[44px] sm:min-h-0"
                value={newSession.title}
                onChange={(e) =>
                  setNewSession((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="เช่น ปรึกษา, พูดคุยความคืบหน้า"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>วันที่</Label>
                <Input
                  type="date"
                  className="mt-1 min-h-[44px] sm:min-h-0"
                  value={newSession.date}
                  onChange={(e) =>
                    setNewSession((p) => ({ ...p, date: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>เวลาเริ่ม</Label>
                <Input
                  type="time"
                  className="mt-1 min-h-[44px] sm:min-h-0"
                  value={newSession.time}
                  onChange={(e) =>
                    setNewSession((p) => ({ ...p, time: e.target.value }))
                  }
                />
              </div>
              <div className="sm:col-span-1">
                <Label>เวลาสิ้นสุด</Label>
                <Input
                  type="time"
                  className="mt-1 min-h-[44px] sm:min-h-0"
                  value={newSession.endTime}
                  onChange={(e) =>
                    setNewSession((p) => ({ ...p, endTime: e.target.value }))
                  }
                />
              </div>
              <div className="sm:col-span-1">
                <Label>สถานที่</Label>
                <Input
                  className="mt-1 min-h-[44px] sm:min-h-0"
                  value={newSession.location}
                  onChange={(e) =>
                    setNewSession((p) => ({ ...p, location: e.target.value }))
                  }
                  placeholder="เช่น ห้องฟิตเนส A"
                />
              </div>
            </div>
            <Button
              className="w-full min-h-[44px]"
              onClick={handleCreateSession}
            >
              สร้างนัดหมาย
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rest day */}
      <Dialog open={showRestDayDialog} onOpenChange={setShowRestDayDialog}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle>กำหนดวันหยุด</DialogTitle>
            <DialogDescription>
              กำหนดให้วันที่ {selectedDate.toLocaleDateString()}{" "}
              เป็นวันหยุดพักผ่อน
            </DialogDescription>
          </DialogHeader>
          {selectedDateSessions.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-amber-700 font-medium text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
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
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button
              variant="outline"
              className="min-h-[44px] sm:min-h-0"
              onClick={() => setShowRestDayDialog(false)}
            >
              ยกเลิก
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 min-h-[44px] sm:min-h-0"
              onClick={handleCreateRestDay}
            >
              {selectedDateSessions.length > 0
                ? `ยืนยัน (ยกเลิก ${selectedDateSessions.length} นัดหมาย)`
                : "ยืนยัน"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conflict resolution */}
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
        <AlertDialogContent
          className="w-[calc(100%-2rem)] max-w-sm sm:max-w-md"
          aria-describedby="conflict-desc"
        >
          <AlertDialogHeader>
            <div
              className={`flex items-center gap-2 mb-2 ${canReplace ? "text-amber-600" : "text-red-600"}`}
            >
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <AlertDialogTitle>
                {canReplace ? "พบการนัดหมายซ้อนทับกัน" : "เวลาไม่ว่าง"}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription id="conflict-desc" className="space-y-3">
              <p>
                {canReplace
                  ? "มีรายการนัดหมายอื่นในช่วงเวลานี้อยู่แล้ว:"
                  : "ลูกค้ามีนัดหมายกับเทรนเนอร์ท่านอื่นในช่วงเวลานี้:"}
              </p>
              {conflictSession && (
                <div
                  className={`p-3 rounded-md border text-sm ${canReplace ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}
                >
                  <p
                    className={`font-semibold ${canReplace ? "text-amber-900" : "text-red-900"}`}
                  >
                    {conflictSession.title}
                  </p>
                  <p className={canReplace ? "text-amber-800" : "text-red-800"}>
                    เวลา{" "}
                    {new Date(conflictSession.start_time).toLocaleTimeString(
                      "th-TH",
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                    {" - "}
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
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel
              className="min-h-[44px] sm:min-h-0"
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
                className="bg-amber-600 hover:bg-amber-700 min-h-[44px] sm:min-h-0"
                onClick={handleConfirmReplace}
              >
                แทนที่นัดหมายเดิม
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Appointment details */}
      <Dialog
        open={!!selectedAppointment}
        onOpenChange={(open) => !open && setSelectedAppointment(null)}
      >
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm sm:max-w-md">
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
            <div className="space-y-4 py-3">
              {selectedAppointment.title && (
                <div className="flex items-start gap-3">
                  <div className="bg-blue-50 p-2 rounded-lg text-blue-600 mt-0.5 flex-shrink-0">
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
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-700 mt-0.5 flex-shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                    เวลา
                  </p>
                  <p className="text-base font-semibold">
                    {new Date(selectedAppointment.date).toLocaleTimeString(
                      "th-TH",
                      { hour: "2-digit", minute: "2-digit", hour12: false },
                    )}
                    {selectedAppointment.endTime &&
                      ` - ${new Date(selectedAppointment.endTime).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })}`}{" "}
                    น.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-gray-100 p-2 rounded-lg text-gray-700 mt-0.5 flex-shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                    สถานที่ / รายละเอียด
                  </p>
                  <p className="text-base font-medium">
                    {selectedAppointment.notes || "-"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-purple-50 p-2 rounded-lg text-purple-700 mt-0.5 flex-shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                    ลูกค้า
                  </p>
                  <p className="text-base font-medium">
                    {getClientById(selectedAppointment.clientId)?.name ||
                      "Unknown"}
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
