import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  CalendarDays,
  Users,
  BookOpen,
  Clock,
  TrendingUp,
  CheckCircle2,
  Activity,
  Calendar,
  MapPin,
  AlertCircle,
  StickyNote as _StickyNote,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import NewClientModal from "./NewClientModal";
import api from "@/lib/api";

interface Client {
  id: string;
  name: string;
  avatar?: string;
  goal: string;
  status?: string;
}

interface Session {
  id: string;
  clientId: string;
  date: string;
  endTime?: string;
  status: string;
  summary?: boolean;
  type?: string;
  notes?: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Session | null>(null);

  const [stats, setStats] = useState<any>(null);
  const [unassignedClients, setUnassignedClients] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const now = new Date();
      const pastDate = new Date();
      pastDate.setDate(now.getDate() - 30);
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + 30);

      const startDateStr = pastDate.toISOString().split("T")[0];
      const endDateStr = futureDate.toISOString().split("T")[0];

      const [clientsRes, sessionsRes, statsRes, programsRes] =
        await Promise.all([
          api.get("/clients"),
          api.get(
            `/schedules?start_date=${startDateStr}&end_date=${endDateStr}`,
          ),
          api.get("/dashboard/stats"),
          api.get("/programs"),
        ]);

      const mappedClients = (clientsRes.data || []).map((c: any) => ({
        id: c.id.toString(),
        name: c.name,
        avatar: c.avatar_url,
        goal: c.goal || "General Fitness",
        status: c.status || "active",
      }));
      setClients(mappedClients);

      const mappedSessions = (sessionsRes.data || []).map((s: any) => ({
        id: s.id.toString(),
        clientId: s.client_id.toString(),
        date: s.start_time,
        endTime: s.end_time,
        status: s.status,
        summary: s.summary || false,
        type: s.type || "workout",
        notes: s.location || s.summary || s.feedback || "",
      }));
      setSessions(mappedSessions);

      setStats(statsRes.data);

      const allPrograms = programsRes.data || [];
      const clientIdsWithProgram = new Set(
        allPrograms
          .filter((p: any) => p.client_id)
          .map((p: any) => p.client_id),
      );
      const unassigned = mappedClients.filter(
        (c: any) => !clientIdsWithProgram.has(Number(c.id)),
      );
      setUnassignedClients(unassigned.length);
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  const getClientById = (id: string) => clients.find((c) => c.id === id);

  const todaySessions = sessions.filter((session) => {
    if (session.status !== "scheduled") return false;
    if (session.type === "appointment") return false;
    const sessionDate = new Date(session.date);
    const now = new Date();
    return (
      sessionDate.getDate() === now.getDate() &&
      sessionDate.getMonth() === now.getMonth() &&
      sessionDate.getFullYear() === now.getFullYear()
    );
  });

  const followUpClients = clients.filter((client) => {
    const clientSessions = sessions.filter(
      (s) => s.clientId === client.id && s.status === "completed",
    );
    if (clientSessions.length === 0) return true;
    const lastSession = clientSessions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )[0];
    const daysSinceLastSession = Math.floor(
      (new Date().getTime() - new Date(lastSession.date).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    return daysSinceLastSession >= 7;
  });

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const currentMonthSessions = sessions.filter((s) => {
    if (s.status === "cancelled") return false;
    const sessionDate = new Date(s.date);
    return (
      sessionDate.getMonth() === currentMonth &&
      sessionDate.getFullYear() === currentYear
    );
  });

  const calculatedCompletedThisMonth = currentMonthSessions.filter(
    (s) => s.status === "completed" && s.type !== "appointment",
  ).length;

  const currentMonthWorkouts = currentMonthSessions.filter(
    (s) => s.type !== "appointment",
  );

  const totalClients = stats?.total_clients ?? clients.length ?? 0;
  const activeClients = clients.filter((c) => c.status === "active").length;
  const thisMonthSessionsCount =
    calculatedCompletedThisMonth ?? stats?.monthly_sessions ?? 0;
  const totalMonthlySessionsCount =
    currentMonthWorkouts.length ?? stats?.total_monthly_sessions ?? 0;
  const remainingSessionsCount = sessions.filter(
    (s) => s.status !== "completed" && s.status !== "cancelled",
  ).length;

  const last7DaysData = (stats?.session_history || []).map((d: any) => ({
    date: new Date(d.date).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
    }),
    เทรนแล้ว: d.completed_count,
    นัดไว้: d.scheduled_count,
  }));

  const COLORS = ["#1e40af", "#f97316", "#10b981", "#8b5cf6", "#ef4444"];
  const goalData = (stats?.client_goals || []).map((g: any) => ({
    name: g.goal,
    value: g.count,
  }));

  const handleStartSession = (session: Session) => {
    if (session.type === "appointment") {
      setSelectedAppointment(session);
      return;
    }
    navigate(`/trainer/sessions/${session.id}/log`);
  };

  const handleNewClient = (clientId: string) => {
    setShowNewClientModal(false);
    navigate(`/trainer/clients/${clientId}`);
  };

  /* ========================
     LOADING STATE
  ======================== */
  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {/* Skeleton: Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        {/* Skeleton: Cards */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  /* ========================
     EMPTY STATE
  ======================== */
  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 animate-in fade-in zoom-in duration-300">
        <div className="w-full max-w-sm p-8 border-2 border-dashed border-muted-foreground/20 rounded-3xl bg-muted/30 flex flex-col items-center">
          <div className="h-20 w-20 rounded-full bg-background shadow-sm flex items-center justify-center mb-6">
            <Users className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold mb-2">ยังไม่มีข้อมูลลูกเทรน</h3>
          <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto leading-relaxed">
            เริ่มต้นใช้งานด้วยการเพิ่มรายชื่อลูกเทรนคนแรกเพื่อติดตามผลและสร้างโปรแกรมฝึก
          </p>
          <Button
            onClick={() => setShowNewClientModal(true)}
            size="lg"
            className="rounded-full px-8 shadow-lg w-full sm:w-auto"
          >
            + เพิ่มลูกเทรนใหม่
          </Button>
        </div>

        <Dialog open={showNewClientModal} onOpenChange={setShowNewClientModal}>
          <DialogContent
            className="max-w-md"
            aria-describedby="new-client-empty-description"
          >
            <DialogHeader>
              <DialogTitle>เพิ่มลูกเทรนใหม่</DialogTitle>
              <DialogDescription id="new-client-empty-description">
                กรอกข้อมูลพื้นฐานของลูกเทรนใหม่
              </DialogDescription>
            </DialogHeader>
            <NewClientModal onClientCreated={handleNewClient} />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* ========================
     MAIN DASHBOARD
  ======================== */
  return (
    /* pb-2 extra buffer on top of the global content-mobile-safe in DashboardLayout */
    <div className="space-y-4 p-3 sm:p-4 lg:p-6">
      {/* ─────────────────────────────────────────
          1. STATS ROW
          Mobile: 2 cols | Tablet+: 4 cols
      ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Stat: ลูกเทรนทั้งหมด */}
        <div className="flex items-center gap-2 sm:gap-3 p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950 dark:to-blue-900">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-blue-500 flex items-center justify-center shadow-md flex-shrink-0">
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 leading-tight">
              ลูกเทรนทั้งหมด
            </p>
            <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300 leading-tight">
              {totalClients}
            </p>
            <p className="text-[10px] text-blue-500 dark:text-blue-400 hidden sm:block">
              ใช้งานอยู่ {activeClients} คน
            </p>
          </div>
        </div>

        {/* Stat: สถิติการฝึก */}
        <div className="flex items-center gap-2 sm:gap-3 p-3 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950 dark:to-orange-900">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-orange-500 flex items-center justify-center shadow-md flex-shrink-0">
            <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 leading-tight">
              เดือนนี้
            </p>
            <div className="flex items-baseline gap-1">
              <p className="text-xl sm:text-2xl font-bold text-orange-700 dark:text-orange-300 leading-tight">
                {thisMonthSessionsCount}
              </p>
              <p className="text-xs text-orange-600/70 dark:text-orange-400/70">
                /{totalMonthlySessionsCount}
              </p>
            </div>
            <p className="text-[10px] text-orange-500 dark:text-orange-400 hidden sm:block">
              รอการฝึก {remainingSessionsCount} เซสชัน
            </p>
          </div>
        </div>

        {/* Stat: วันนี้ */}
        <div className="flex items-center gap-2 sm:gap-3 p-3 rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950 dark:to-green-900">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-green-500 flex items-center justify-center shadow-md flex-shrink-0">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 leading-tight">
              นัดวันนี้
            </p>
            <p className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-300 leading-tight">
              {todaySessions.length}
            </p>
            <p className="text-[10px] text-green-500 dark:text-green-400 hidden sm:block">
              เซสชัน
            </p>
          </div>
        </div>

        {/* Stat: ยังไม่มีโปรแกรม (conditional) หรือ Follow-up count */}
        {unassignedClients > 0 ? (
          <div className="flex items-center gap-2 sm:gap-3 p-3 rounded-xl bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950 dark:to-red-900">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-red-500 flex items-center justify-center shadow-md flex-shrink-0">
              <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 leading-tight">
                ไม่มีโปรแกรม
              </p>
              <p className="text-xl sm:text-2xl font-bold text-red-700 dark:text-red-300 leading-tight">
                {unassignedClients}
              </p>
              <p className="text-[10px] text-red-500 dark:text-red-400 hidden sm:block">
                รอมอบหมาย
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3 p-3 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950 dark:to-purple-900">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-purple-500 flex items-center justify-center shadow-md flex-shrink-0">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-purple-600 dark:text-purple-400 leading-tight">
                ต้องติดตาม
              </p>
              <p className="text-xl sm:text-2xl font-bold text-purple-700 dark:text-purple-300 leading-tight">
                {followUpClients.length}
              </p>
              <p className="text-[10px] text-purple-500 dark:text-purple-400 hidden sm:block">
                คน (7+ วัน)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────
          2. TODAY'S SESSIONS
          Full-width card, session rows adapt on mobile
      ───────────────────────────────────────── */}
      <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-950/50 dark:to-orange-900/50 shadow-md">
        <CardHeader className="pb-3 px-4 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-orange-500 flex items-center justify-center shadow-md flex-shrink-0">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg text-orange-900 dark:text-orange-100">
                  นัดหมายวันนี้
                </CardTitle>
                {/* Show full date on desktop, shortened on mobile */}
                <CardDescription className="text-xs text-orange-700 dark:text-orange-300 truncate hidden sm:block">
                  {new Date().toLocaleDateString("th-TH", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </CardDescription>
                <CardDescription className="text-xs text-orange-700 dark:text-orange-300 sm:hidden">
                  {new Date().toLocaleDateString("th-TH", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="secondary"
              className="text-sm px-2.5 py-0.5 sm:text-lg sm:px-3 sm:py-1 bg-orange-500 text-white flex-shrink-0"
            >
              {todaySessions.length}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-2 pt-0 px-4 sm:px-6">
          {todaySessions.length === 0 ? (
            <div className="text-center py-6 sm:py-8 bg-white dark:bg-gray-800 rounded-xl">
              <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-green-500 mx-auto mb-3 opacity-70" />
              <p className="text-sm sm:text-base font-medium text-muted-foreground mb-2">
                ว่างวันนี้ 🎉
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4 px-4">
                ไม่มีนัดหมาย — พักผ่อนหรือวางแผนงานอื่นได้เลย
              </p>
              {/* Stack buttons on mobile, side by side on sm+ */}
              <div className="flex flex-col sm:flex-row gap-2 justify-center px-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[44px] sm:min-h-0"
                  onClick={() => navigate("/trainer/calendar")}
                >
                  <CalendarDays className="h-4 w-4 mr-1" />
                  ดูปฏิทิน
                </Button>
                <Button
                  size="sm"
                  className="min-h-[44px] sm:min-h-0"
                  onClick={() => navigate("/trainer/clients")}
                >
                  <Users className="h-4 w-4 mr-1" />
                  ดูลูกเทรน
                </Button>
              </div>
            </div>
          ) : (
            todaySessions.map((session) => {
              const client = getClientById(session.clientId);
              if (!client) return null;

              const sessionTime = new Date(session.date).toLocaleTimeString(
                "th-TH",
                { hour: "2-digit", minute: "2-digit" },
              );

              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all gap-2"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border-2 border-orange-500 flex-shrink-0">
                      <AvatarImage src={client.avatar} alt={client.name} />
                      <AvatarFallback className="text-xs sm:text-sm bg-orange-100 dark:bg-orange-900">
                        {client.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {client.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          {sessionTime} น.
                        </div>
                        {/* Goal badge hidden on very small screens */}
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 hidden xs:inline-flex"
                        >
                          {session.type === "appointment"
                            ? "ทั่วไป"
                            : client.goal}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {/* Action button with 44px touch target on mobile */}
                  <Button
                    size="sm"
                    onClick={() => handleStartSession(session)}
                    className="flex items-center gap-1 shadow-md bg-accent hover:bg-accent/90 text-accent-foreground flex-shrink-0 min-w-[44px] min-h-[44px]"
                  >
                    {session.type === "appointment" ? (
                      <CalendarDays className="h-4 w-4" />
                    ) : (
                      <BookOpen className="h-4 w-4" />
                    )}
                    {/* Text label only on sm+ */}
                    <span className="hidden sm:inline">เริ่ม</span>
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* ─────────────────────────────────────────
          3. FOLLOW-UP CLIENTS
          Single column on mobile, 2-col grid on md+
      ───────────────────────────────────────── */}
      {followUpClients.length > 0 && (
        <Card className="border-blue-200 bg-white dark:bg-gray-800 shadow-md">
          <CardHeader className="pb-3 px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-sm sm:text-base">
                    ลูกเทรนที่ต้องติดตาม
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                    ไม่มีการฝึกซ้อมมานานกว่า 7 วัน
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant="secondary"
                className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs flex-shrink-0"
              >
                {followUpClients.length} คน
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-0 px-4 sm:px-6">
            {/* 1-col mobile, 2-col md+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {followUpClients.map((client) => {
                const clientSessions = sessions.filter(
                  (s) => s.clientId === client.id && s.status === "completed",
                );
                const lastSession = clientSessions.sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime(),
                )[0];
                const daysSince = lastSession
                  ? Math.floor(
                      (new Date().getTime() -
                        new Date(lastSession.date).getTime()) /
                        (1000 * 60 * 60 * 24),
                    )
                  : null;

                return (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer group min-h-[56px]"
                    onClick={() => navigate(`/trainer/clients/${client.id}`)}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border-2 border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <AvatarImage src={client.avatar} alt={client.name} />
                        <AvatarFallback className="text-xs sm:text-sm bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                          {client.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-blue-600 dark:text-blue-400 truncate">
                          {client.name}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                          <p className="text-xs text-red-600 dark:text-red-400 truncate">
                            {daysSince
                              ? `ไม่มีการฝึก ${daysSince} วัน`
                              : "ยังไม่เคยเทรน"}
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Arrow hint visible on hover (desktop) or always on mobile */}
                    <TrendingUp className="h-4 w-4 text-orange-400 opacity-0 group-hover:opacity-100 sm:transition-opacity flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─────────────────────────────────────────
          4. CHARTS: Bar + Pie
          Mobile: stacked (full-width)
          Desktop lg+: side by side (2/3 + 1/3)
      ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart: 7-day session history */}
        <Card className="lg:col-span-2 shadow-md border-none">
          <CardHeader className="px-4 sm:px-6 pb-2">
            <CardTitle className="text-sm sm:text-base">
              การฝึก 7 วันย้อนหลัง
            </CardTitle>
            <CardDescription className="text-xs">
              เปรียบเทียบจำนวนที่นัด vs เทรนจริง
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-0 pr-2 sm:pr-4">
            {/* 
              Mobile: 220px height to fit narrow screens
              sm+: 260px | lg+: 300px
            */}
            <div className="h-[220px] sm:h-[260px] lg:h-[300px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={last7DaysData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    width={24}
                  />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: "12px", fontSize: "11px" }}
                  />
                  <Bar
                    dataKey="นัดไว้"
                    name="นัดหมาย"
                    fill="#e5e7eb"
                    radius={[4, 4, 0, 0]}
                    barSize={16}
                  />
                  <Bar
                    dataKey="เทรนแล้ว"
                    name="สำเร็จ"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    barSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart: Goal distribution */}
        <Card className="shadow-md border-none">
          <CardHeader className="px-4 sm:px-6 pb-2">
            <CardTitle className="text-sm sm:text-base">
              เป้าหมายลูกค้า
            </CardTitle>
            <CardDescription className="text-xs">
              สัดส่วนตามเป้าหมายหลัก
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {/* Pie: 160px on mobile, 200px on lg+ */}
            <div className="h-[160px] lg:h-[200px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={goalData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {goalData.map((_: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend below pie — scrollable if many items */}
            <div className="flex flex-col gap-1.5 mt-2 max-h-[140px] overflow-y-auto">
              {goalData.map((g: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span
                      className="text-muted-foreground truncate max-w-[100px] sm:max-w-[140px]"
                      title={g.name}
                    >
                      {g.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="font-semibold">{g.value}</span>
                    <span className="text-muted-foreground text-[10px]">
                      ({Math.round((g.value / (clients.length || 1)) * 100)}%)
                    </span>
                  </div>
                </div>
              ))}
              {goalData.length === 0 && (
                <div className="text-center text-muted-foreground text-xs py-4">
                  ยังไม่มีข้อมูลเป้าหมาย
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─────────────────────────────────────────
          View Appointment Details Dialog
          (max-w-sm on mobile, max-w-md on sm+)
      ───────────────────────────────────────── */}
      <Dialog
        open={!!selectedAppointment}
        onOpenChange={(open) => !open && setSelectedAppointment(null)}
      >
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-blue-500 flex-shrink-0" />
              รายละเอียดนัดหมายทั่วไป
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
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
            <div className="space-y-4 py-2">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg text-blue-700 dark:text-blue-300 mt-0.5 flex-shrink-0">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">เวลา</p>
                  <p className="text-sm sm:text-base font-semibold">
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
                <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    สถานที่ / รายละเอียด
                  </p>
                  <p className="text-sm sm:text-base font-medium">
                    {(selectedAppointment as any).notes || "-"}
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
