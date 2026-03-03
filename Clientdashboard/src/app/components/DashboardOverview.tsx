import React, { useMemo, useState, useRef, useCallback } from "react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  ChevronDown,
  ChevronUp,
  X,
  Dumbbell,
  Loader2,
  AlertCircle,
  Phone,
  Check,
} from "lucide-react";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { th } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import {
  Session,
  ClientMetric,
  ClientProfile,
  clientService,
} from "@/services/clientService";

// --- Interfaces for UI ---
interface ExerciseSet {
  set: number;
  values: Record<string, any>;
  completed: boolean;
}

interface ExerciseUI {
  id: string | number;
  name: string;
  type: string;
  sets: ExerciseSet[];
  note?: string;
  trackingFields?: string[];
}

export interface DashboardOverviewProps {
  schedules: Session[];
  metrics: ClientMetric[];
  user: ClientProfile | null;
  lastMessage?: any;
}

// --- Constants ---
const FIELD_CONFIG: Record<
  string,
  { label: string; placeholder: string; type: string }
> = {
  reps: { label: "REPS", placeholder: "10", type: "number" },
  weight: { label: "WEIGHT", placeholder: "0", type: "number" },
  distance: { label: "Dist", placeholder: "0", type: "text" },
  pace: { label: "Pace", placeholder: "6:00", type: "text" },
  duration: { label: "Time", placeholder: "0", type: "text" },
  hold_time: { label: "Hold", placeholder: "30", type: "text" },
  tempo: { label: "Tempo", placeholder: "3-1-1", type: "text" },
  rest: { label: "REST", placeholder: "00:00", type: "text" },
  rpe: { label: "RPE", placeholder: "1-10", type: "number" },
  time: { label: "Time", placeholder: "00:00", type: "text" },
  speed: { label: "Speed", placeholder: "0", type: "number" },
  cadence: { label: "Cadence", placeholder: "0", type: "number" },
  heart_rate: { label: "Heart Rate", placeholder: "0", type: "number" },
  watts: { label: "Watt", placeholder: "0", type: "number" },
  rounds: { label: "Rounds", placeholder: "0", type: "number" },
  distance_long: { label: "Dist(L)", placeholder: "0", type: "number" },
  distance_short: { label: "Dist(S)", placeholder: "0", type: "number" },
  one_rm: { label: "%1RM", placeholder: "0", type: "number" },
  rir: { label: "RIR", placeholder: "0", type: "number" },
  hr_zone: { label: "%HR", placeholder: "0", type: "number" },
  rpm: { label: "RPM", placeholder: "0", type: "number" },
};

// --- Helper Functions ---
const getLocationString = (
  location?:
    | string
    | {
        name: string;
        address?: string;
        type?: string;
        coordinates?: { lat: number; lng: number };
      },
) => {
  if (!location) return "ศูนย์ออกกำลังกายคณะศึกษาศาสตร์ มหาวิทยาลัยศิลปากร";
  if (typeof location === "string") return location;
  return location.name;
};

const formatThaiDate = (dateString?: string) => {
  if (!dateString) return "ไม่ระบุวันที่";
  const date = parseISO(dateString);

  if (isToday(date)) return "วันนี้";
  if (isTomorrow(date)) return "พรุ่งนี้";

  return format(date, "d MMM yyyy", { locale: th });
};

const getTime = (session: Session) => {
  if (session.start_time) {
    return format(parseISO(session.start_time), "HH:mm");
  }
  return "ไม่ระบุ";
};

// Convert time-like values to minutes string (heuristic):
// - if numeric and > 60 -> assume seconds, convert to minutes (rounded)
// - else treat as minutes already
const formatMinutes = (value?: number) => {
  const totalSeconds = Number(value)

  if (!totalSeconds || totalSeconds <= 0) return "-"

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const parts: string[] = []

  if (hours > 0) {
    parts.push(`${hours} `)
  }

  if (minutes > 0) {
    parts.push(`${minutes} `)
  }

  if (seconds > 0) {
    parts.push(`${seconds} `)
  }

  return parts.join(": ")
}

// --- Sub-Components ---

const SetRow = ({
  set,
  trackingFields,
}: {
  set: ExerciseSet;
  trackingFields?: string[];
}) => {
  const displayFields =
    trackingFields && trackingFields.length > 0
      ? trackingFields
      : ["reps", "weight", "rpe"];

  return (
    <div
      className="grid gap-3 px-4 py-3 border-b last:border-b-0 text-sm items-center"
      style={{
        gridTemplateColumns: `40px ${displayFields.map(() => "1fr").join(" ")}`,
      }}
    >
      <div className="flex justify-center items-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">
        {set.set}
      </div>
      {displayFields.map((field) => {
        const val = set.values[field];
        return (
          <div key={field} className="flex justify-center">
            <span className="bg-slate-50 text-slate-700 px-3 py-1 rounded-md border border-slate-100 font-medium min-w-[60px] text-center">
              {val !== undefined && val !== null ? val : "-"}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const ExerciseItem = ({
  exercise,
  defaultOpen = false,
}: {
  exercise: ExerciseUI;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const totalSets = exercise.sets.length;

  const displayFields =
    exercise.trackingFields && exercise.trackingFields.length > 0
      ? exercise.trackingFields
      : ["reps", "weight", "rpe"];

  return (
    <div className="border border-slate-100 shadow-sm rounded-xl bg-white overflow-hidden transition-all hover:shadow-md">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isOpen ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"
            }`}
          >
            <Dumbbell className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-base text-slate-800">
                {exercise.name}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Badge
                variant="outline"
                className="text-[10px] h-5 px-1.5 font-normal text-slate-500 border-slate-200"
              >
                {exercise.type}
              </Badge>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500">{totalSets} sets</span>
            </div>
          </div>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>

      {isOpen && (
        <div className="border-t border-slate-100 bg-slate-50/50">
          <div
            className="grid gap-3 px-4 py-2 bg-slate-100/50 text-xs font-semibold text-slate-500 text-center uppercase tracking-wider"
            style={{
              gridTemplateColumns: `40px ${displayFields.map(() => "1fr").join(" ")}`,
            }}
          >
            <div>Set</div>
            {displayFields.map((field) => (
              <div key={field}>{FIELD_CONFIG[field]?.label || field}</div>
            ))}
          </div>

          <div className="bg-white">
            {exercise.sets.map((set) => (
              <SetRow key={set.set} set={set} trackingFields={exercise.trackingFields} />
            ))}
          </div>

          {exercise.note && (
            <div className="px-4 py-3 border-t border-slate-100 bg-amber-50/50 flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed font-medium">Note: {exercise.note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ScheduleCard = ({
  session,
  onClick,
}: {
  session: Session;
  onClick: () => void;
}) => {
  const isCancelled = session.status === "cancelled";
  const isCompleted = session.status === "completed" || session.status === "reviewed";

  const sessionDate = session.start_time ? parseISO(session.start_time) : parseISO(session.date);
  const isMissed =
    !isCompleted &&
    !isCancelled &&
    new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate()).getTime() <
      new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();

  return (
    <Card
      className={`transition-shadow ${
        isCancelled ? "border-l-4 border-l-red-400 opacity-60 cursor-default" : "hover:shadow-md cursor-pointer border-l-4 border-l-primary"
      }`}
      onClick={() => !isCancelled && onClick()}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md ${
                isCancelled ? "bg-gray-300" : session.type === "appointment" ? "bg-gradient-to-br from-teal-500 to-emerald-600" : "bg-gradient-to-br from-[#002140] to-[#003d75]"
              }`}
            >
              {isCancelled ? <X className="w-6 h-6 text-white" /> : session.type === "appointment" ? <Calendar className="w-6 h-6 text-white" /> : <User className="w-6 h-6 text-white" />}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className={`font-semibold line-clamp-1 flex items-center gap-2 ${isCancelled ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  <span className="truncate">{session.trainer_name || "Trainer"}</span>
                  {session.type === "appointment" && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal border-teal-200 text-teal-700 bg-teal-50 shrink-0">
                      นัดหมายทั่วไป
                    </Badge>
                  )}
                </h3>
                <p className={`text-sm line-clamp-1 ${isCancelled ? "line-through text-muted-foreground" : "text-muted-foreground"}`}>{session.title || "Training Session"}</p>
              </div>

              {isCancelled && <Badge variant="destructive" className="text-[10px] h-5 shrink-0">ยกเลิกนัดหมาย</Badge>}
              {isCompleted && (
                <Badge variant="secondary" className="h-5 w-5 shrink-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 p-0 flex items-center justify-center rounded-sm" title="การฝึกเสร็จสมบูรณ์แล้ว">
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </Badge>
              )}
              {isMissed && <Badge variant="outline" className="h-5 shrink-0 bg-orange-50 text-orange-600 border-orange-200 text-[10px] px-1.5">ไม่ได้ฝึก</Badge>}
            </div>

            <div className="grid grid-cols-2 gap-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatThaiDate(session.start_time || session.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                <span>{getTime(session)} น.</span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <MapPin className="w-3.5 h-3.5" />
                <span className="line-clamp-1">{getLocationString(session.location)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="text-center py-12 bg-muted/10 rounded-lg border border-dashed">
    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
      <Calendar className="w-6 h-6 text-muted-foreground" />
    </div>
    <p className="text-muted-foreground text-sm">{message}</p>
  </div>
);

// --- Main Component ---

export function DashboardOverview({ schedules, metrics, user, lastMessage }: DashboardOverviewProps) {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<Session | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const lastFetchedIdRef = useRef<string | null>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDetail = useCallback(async (sessionId: string | number, clientId: string | number) => {
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    setDetailError(null);
    if (lastFetchedIdRef.current !== String(sessionId)) {
      setLoadingDetail(true);
    }
    try {
      const detail = await clientService.getSessionDetail(clientId, sessionId);
      setSelectedSessionDetail(detail);
      lastFetchedIdRef.current = String(sessionId);
    } catch (error) {
      console.error("Failed to fetch session detail", error);
      setDetailError("ไม่สามารถโหลดรายละเอียดได้ กรุณาลองใหม่");
    } finally {
      loadingTimerRef.current = setTimeout(() => setLoadingDetail(false), 300);
    }
  }, []);

  // Fetch detail when selectedSession changes
  React.useEffect(() => {
    if (selectedSession) {
      const clientId = (selectedSession as any).client_id ?? user?.id ?? "";
      if (clientId) {
        fetchDetail((selectedSession as any).id, clientId);
      } else {
        console.warn("No client ID found for session detail fetch");
      }
    } else {
      setSelectedSessionDetail(null);
      setDetailError(null);
    }
  }, [selectedSession, user?.id, fetchDetail]);

  // WebSocket Listener for Real-time Updates
  React.useEffect(() => {
    if (lastMessage && selectedSession && lastMessage.type === "SESSION_UPDATE") {
      if (String((lastMessage as any).sessionId) === String((selectedSession as any).id)) {
        const clientId = (selectedSession as any).client_id ?? user?.id ?? "";
        if (clientId) {
          fetchDetail((selectedSession as any).id, clientId);
        }
      }
    }
  }, [lastMessage, selectedSession, user?.id, fetchDetail]);

  // Helper: get midnight timestamp without mutating the original Date
  const getDateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const { todaySchedules, upcomingSchedules, pastSchedules } = useMemo(() => {
    const todayMs = getDateOnly(new Date());

    const validSchedules = schedules.filter((s) => {
      if ((s as any).type === "appointment") return true;
      return (s as any).logs && (s as any).logs.length > 0;
    });

    const sorted = [...validSchedules].sort((a: any, b: any) => {
      const da = a.start_time ? parseISO(a.start_time) : parseISO(a.date);
      const db = b.start_time ? parseISO(b.start_time) : parseISO(b.date);
      return da.getTime() - db.getTime();
    });

    return {
      todaySchedules: sorted.filter((s: any) => {
        if (s.status === "completed") return false;
        const d = s.start_time ? parseISO(s.start_time) : parseISO(s.date);
        return getDateOnly(d) === todayMs;
      }),
      upcomingSchedules: sorted.filter((s: any) => {
        if (s.status === "completed") return false;
        const d = s.start_time ? parseISO(s.start_time) : parseISO(s.date);
        return getDateOnly(d) > todayMs;
      }),
      pastSchedules: sorted
        .filter((s: any) => {
          if (s.status === "completed") return true;
          const d = s.start_time ? parseISO(s.start_time) : parseISO(s.date);
          return getDateOnly(d) < todayMs;
        })
        .reverse(),
    };
  }, [schedules]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">ตารางนัดหมายการฝึก</h1>
        <p className="text-sm sm:text-base text-muted-foreground">รายการกำหนดการที่กำลังจะมาถึง</p>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="today" className="rounded-lg">
            วันนี้
            {todaySchedules.length > 0 && (
              <Badge variant="destructive" className="ml-2 px-1.5 py-0 h-5 text-[10px]">
                {todaySchedules.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="rounded-lg">
            เร็วๆ นี้
            {upcomingSchedules.length > 0 && (
              <Badge variant="secondary" className="ml-2 px-1.5 py-0 h-5 text-[10px]">
                {upcomingSchedules.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past" className="rounded-lg">
            ประวัติ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4 space-y-3">
          {todaySchedules.length > 0 ? todaySchedules.map((s: any) => <ScheduleCard key={s.id} session={s} onClick={() => setSelectedSession(s)} />) : <EmptyState message="ไม่มีนัดหมายวันนี้ พักผ่อนให้เต็มที่!" />}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcomingSchedules.length > 0 ? upcomingSchedules.map((s: any) => <ScheduleCard key={s.id} session={s} onClick={() => setSelectedSession(s)} />) : <EmptyState message="ไม่มีรายการนัดหมายล่วงหน้า" />}
        </TabsContent>

        <TabsContent value="past" className="mt-4 space-y-3">
          {pastSchedules.length > 0 ? pastSchedules.map((s: any) => <ScheduleCard key={s.id} session={s} onClick={() => setSelectedSession(s)} />) : <EmptyState message="ยังไม่มีประวัติการฝึก" />}
        </TabsContent>
      </Tabs>

      {/* Detailed Modal */}
      <Dialog open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          {selectedSession && (
            <>
              {/* Modal Header */}
              <div className="relative bg-white border-b overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50/50" />
                <div className="relative p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className={selectedSession.type === "appointment" ? "bg-teal-100 text-teal-700 hover:bg-teal-100 border-0" : "bg-blue-100 text-blue-700 hover:bg-blue-100 border-0"}>
                          {selectedSession.type === "appointment" ? "นัดหมายทั่วไป" : "Training Session"}
                        </Badge>
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-1">{selectedSession.title || "Weight Training"}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <User className="w-4 h-4" />
                        <span>Trainer: {selectedSession.trainer_name || "Trainer"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto bg-slate-50 dark:bg-background flex-1">
                {/* Compact Details */}
                <div className="text-xs text-muted-foreground space-y-1.5 pb-3 border-b mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#FF6B35]" />
                    <span>วันที่</span>
                    <span className="font-medium text-foreground ml-auto">{formatThaiDate(selectedSession.start_time || selectedSession.date)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#FF6B35]" />
                    <span>เวลา</span>
                    <span className="font-medium text-foreground ml-auto">
                      {selectedSession.start_time ? format(parseISO(selectedSession.start_time), "HH:mm") : "-"} - {selectedSession.end_time ? format(parseISO(selectedSession.end_time), "HH:mm") : "-"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#002140]" />
                    <span>เบอร์ติดต่อเทรนเนอร์</span>
                    <span className="font-medium text-foreground ml-auto">{(selectedSession as any).trainer_phone || "-"}</span>
                  </div>
                </div>

                {/* Exercises Section */}
                {selectedSession.type !== "appointment" && (
                  <div>
                    <div className="flex items-center justify-between mb-4 px-1">
                      <h4 className="font-bold text-slate-800 text-base">Exercises</h4>
                      <Badge variant="outline" className="text-xs font-normal text-slate-500">
                        {(selectedSessionDetail as any)?.exercises?.length || 0} items
                      </Badge>
                    </div>

                    {loadingDetail ? (
                      <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-sm">กำลังโหลดรายละเอียด...</span>
                      </div>
                    ) : detailError ? (
                      <div className="py-8 flex flex-col items-center justify-center gap-3 bg-red-50 rounded-lg border border-red-100">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                        <p className="text-sm text-red-600 font-medium">{detailError}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            const clientId = (selectedSession as any).client_id ?? user?.id ?? "";
                            if (clientId) fetchDetail((selectedSession as any).id, clientId);
                          }}
                        >
                          ลองใหม่
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(selectedSessionDetail as any)?.exercises && (selectedSessionDetail as any).exercises.length > 0 ? (
                          (selectedSessionDetail as any).exercises.map((ex: any, idx: number) => {
                            // Build ExerciseUI
                            const sets = (ex.sets || []).map((s: any) => {
                              const values: Record<string, any> = {};
                              const fields = ex.tracking_fields && ex.tracking_fields.length > 0 ? ex.tracking_fields : ["reps", "weight", "rpe"];

                              fields.forEach((field: string) => {
                                // Special field name mappings (DB/API names differ from tracking field names)
                                const specialActualMap: Record<string, string> = {
                                  rest: "actual_rest_duration",
                                  weight: "actual_weight",
                                  reps: "actual_reps",
                                  rpe: "actual_rpe",
                                  duration: "actual_duration",
                                };
                                const specialPlannedMap: Record<string, string> = {
                                  rest: "rest_duration",
                                  weight: "target_weight",
                                  reps: "target_reps",
                                  rpe: "target_rpe",
                                  duration: "target_duration",
                                };

                                // actual candidates
                                const actualCandidates = [
                                  specialActualMap[field] ? (s as any)[specialActualMap[field]] : undefined,
                                  (s as any)[`actual_${field}`],
                                  (s as any)[`actual_${field}_kg`],
                                  (s as any).actual_metadata && (s as any).actual_metadata[field],
                                ];

                                // planned/target candidates
                                const plannedCandidates = [
                                  specialPlannedMap[field] ? (s as any)[specialPlannedMap[field]] : undefined,
                                  (s as any)[`planned_${field}`],
                                  (s as any)[`planned_${field}_kg`],
                                  (s as any)[`target_${field}`],
                                  field === "weight" ? (s as any).target_weight : undefined,
                                  (s as any).target_metadata && (s as any).target_metadata[field],
                                ];

                                let actualValue: any = undefined;
                                for (const c of actualCandidates) {
                                  if (c !== undefined) {
                                    actualValue = c;
                                    break;
                                  }
                                }

                                let plannedValue: any = undefined;
                                for (const c of plannedCandidates) {
                                  if (c !== undefined) {
                                    plannedValue = c;
                                    break;
                                  }
                                }

                                // backend sometimes sends 0 as default for numeric fields that are not set
                                const isDefaultZero = !s.completed && actualValue === 0;

                                const hasValidActual = actualValue !== undefined && actualValue !== null && actualValue !== "" && !isDefaultZero;

                                // For time-like fields, format to minutes
                                if (["duration", "rest", "time"].includes(field)) {
                                  if (hasValidActual) {
                                    values[field] = formatMinutes(actualValue);
                                  } else {
                                    values[field] = plannedValue !== undefined && plannedValue !== null ? formatMinutes(plannedValue) : "-";
                                  }
                                } else {
                                  if (hasValidActual) {
                                    values[field] = actualValue;
                                  } else {
                                    values[field] = plannedValue !== undefined && plannedValue !== null ? plannedValue : "-";
                                  }
                                }
                              });

                              return {
                                set: (s as any).set_number ?? (s as any).set ?? 0,
                                values,
                                completed: !!s.completed,
                              };
                            });

                            const exUI: ExerciseUI = {
                              id: ex.id ?? `ex_${idx}`,
                              name: ex.name ?? ex.exercise_name ?? "Unknown Exercise",
                              type: ex.type ?? ex.category ?? "weight_training",
                              trackingFields: ex.tracking_fields ?? ex.trackingFields ?? [],
                              sets,
                              note: ex.notes ?? "",
                            };

                            return <ExerciseItem key={exUI.id || idx} exercise={exUI} defaultOpen={idx === 0} />;
                          })
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4 bg-muted/20 rounded-lg">ไม่มีรายการฝึกซ้อมใน Session นี้</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t bg-white dark:bg-card flex justify-end">
                <Button variant="outline" onClick={() => setSelectedSession(null)}>
                  ปิดหน้าต่าง
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}