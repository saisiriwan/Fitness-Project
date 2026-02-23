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
  status: string;
  summary?: boolean; // Mock field for now if not in API
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Stats State ---
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Calculate Date Range for Optimization (e.g. -30 days to +30 days)
      // This covers enough history for "Follow-up" (7 days lookback) and future for "Today/Upcoming"
      const now = new Date();
      const pastDate = new Date();
      pastDate.setDate(now.getDate() - 30);
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + 30);

      const startDateStr = pastDate.toISOString().split("T")[0];
      const endDateStr = futureDate.toISOString().split("T")[0];

      const [clientsRes, sessionsRes, statsRes] = await Promise.all([
        api.get("/clients"),
        api.get(`/schedules?start_date=${startDateStr}&end_date=${endDateStr}`), // Optimized Fetch
        api.get("/dashboard/stats"),
      ]);

      // Map Clients
      const mappedClients = (clientsRes.data || []).map((c: any) => ({
        id: c.id.toString(),
        name: c.name,
        avatar: c.avatar_url,
        goal: c.goal || "General Fitness",
        status: "active",
      }));
      setClients(mappedClients);

      // Map Sessions (For Today's List)
      const mappedSessions = (sessionsRes.data || []).map((s: any) => ({
        id: s.id.toString(),
        clientId: s.client_id.toString(),
        date: s.start_time,
        status: s.status,
        summary: s.summary || false,
      }));
      setSessions(mappedSessions);

      // Set Stats
      setStats(statsRes.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  const getClientById = (id: string) => clients.find((c) => c.id === id);

  // Get today's sessions (Fixed Timezone Logic)
  const todaySessions = sessions.filter((session) => {
    if (session.status !== "scheduled") return false;

    const sessionDate = new Date(session.date);
    const now = new Date();
    return (
      sessionDate.getDate() === now.getDate() &&
      sessionDate.getMonth() === now.getMonth() &&
      sessionDate.getFullYear() === now.getFullYear()
    );
  });

  // Get clients that need follow-up (Keep frontend logic for now as it's complex to move without specific API)
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

  // --- Stats Display Helpers ---
  // Fallback to 0 if stats not loaded yet
  const totalClients = stats?.total_clients || clients.length || 0;
  const completedSessionsCount = stats?.completed_sessions || 0;
  const thisMonthSessionsCount = stats?.monthly_sessions || 0;
  const todaySessionsCount =
    stats?.upcoming_sessions || todaySessions.length || 0; // Use upcoming from stat or local list backup

  // Chart Data from Backend
  const last7DaysData = (stats?.session_history || []).map((d: any) => ({
    date: new Date(d.date).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
    }),
    เทรนแล้ว: d.completed_count,
    นัดไว้: d.scheduled_count,
  }));

  // Pie Data from Backend
  const COLORS = ["#1e40af", "#f97316", "#10b981", "#8b5cf6", "#ef4444"];
  const goalData = (stats?.client_goals || []).map((g: any) => ({
    name: g.goal,
    value: g.count,
  }));

  const handleStartSession = (sessionId: string) => {
    navigate(`/trainer/sessions/${sessionId}/log`); // Updated path to match known routes
  };

  const handleNewClient = (clientId: string) => {
    setShowNewClientModal(false);
    navigate(`/trainer/clients/${clientId}`); // Updated path
  };

  if (loading) {
    return <div className="p-8 text-center">Loading dashboard...</div>;
  }

  // Empty State: ยังไม่มีลูกเทรน
  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-in fade-in zoom-in duration-300">
        <div className="w-full max-w-md p-8 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 flex flex-col items-center">
          <div className="h-20 w-20 rounded-full bg-white shadow-sm flex items-center justify-center mb-6">
            <Users className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            ยังไม่มีข้อมูลลูกเทรน
          </h3>
          <p className="text-slate-500 mb-8 max-w-xs mx-auto">
            เริ่มต้นใช้งานระบบบริหารจัดการด้วยการเพิ่มรายชื่อลูกเทรนคนแรกของคุณ
            เพื่อเริ่มติดตามผลและสร้างโปรแกรมฝึก
          </p>
          <Button
            onClick={() => setShowNewClientModal(true)}
            size="lg"
            className="rounded-full px-8 bg-[#003366] hover:bg-[#002244] text-white shadow-lg shadow-blue-900/10"
          >
            + เพิ่มลูกเทรนใหม่
          </Button>
        </div>

        {/* Modal สำหรับเพิ่มลูกเทรน (ต้องใส่ไว้ที่นี่ด้วยเพื่อให้ทำงานได้) */}
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

  return (
    <div className="space-y-4 p-4 lg:p-6 pb-20">
      {/* 1. 📊 INFO: สถิติภาพรวม */}
      <Card className="shadow-md border-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">สรุปภาพรวม</CardTitle>
          <CardDescription className="text-xs">
            สถิติและข้อมูลสำคัญ
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950 dark:to-blue-900">
              <div className="h-12 w-12 rounded-xl bg-blue-500 flex items-center justify-center shadow-md flex-shrink-0">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  ลูกเทรน
                </p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {totalClients}
                </p>
                <p className="text-xs text-blue-600/60 dark:text-blue-400/60">
                  {totalClients} Active
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950 dark:to-orange-900">
              <div className="h-12 w-12 rounded-xl bg-orange-500 flex items-center justify-center shadow-md flex-shrink-0">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  เดือนนี้
                </p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {thisMonthSessionsCount}
                </p>
                <p className="text-xs text-orange-600/60 dark:text-orange-400/60">
                  การฝึก
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950 dark:to-green-900">
              <div className="h-12 w-12 rounded-xl bg-green-500 flex items-center justify-center shadow-md flex-shrink-0">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-green-600 dark:text-green-400">
                  ทั้งหมด
                </p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {completedSessionsCount}
                </p>
                <p className="text-xs text-green-600/60 dark:text-green-400/60">
                  การฝึก
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950 dark:to-purple-900">
              <div className="h-12 w-12 rounded-xl bg-purple-500 flex items-center justify-center shadow-md flex-shrink-0">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  วันนี้
                </p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {todaySessionsCount || todaySessions.length}
                </p>
                <p className="text-xs text-purple-600/60 dark:text-purple-400/60">
                  นัดหมาย
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. 🚨 URGENT: นัดหมายวันนี้ - แสดงก่อนสุด */}
      <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-950/50 dark:to-orange-900/50 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center shadow-md">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg text-orange-900 dark:text-orange-100">
                  นัดหมายวันนี้
                </CardTitle>
                <CardDescription className="text-xs text-orange-700 dark:text-orange-300">
                  {new Date().toLocaleDateString("th-TH", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="secondary"
              className="text-lg px-3 py-1 bg-orange-500 text-white"
            >
              {todaySessions.length} การฝึก
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {todaySessions.length === 0 ? (
            <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-xl">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3 opacity-70" />
              <p className="text-base font-medium text-muted-foreground mb-2">
                ว่างวันนี้ 🎉
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                ไม่มีนัดหมาย - พักผ่อนหรือวางแผนงานอื่นได้เลย
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/trainer/calendar")}
                >
                  <CalendarDays className="h-4 w-4 mr-1" />
                  ดูปฏิทิน
                </Button>
                <Button size="sm" onClick={() => navigate("/trainer/clients")}>
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
                {
                  hour: "2-digit",
                  minute: "2-digit",
                },
              );

              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-orange-500">
                      <AvatarImage src={client.avatar} alt={client.name} />
                      <AvatarFallback className="text-sm bg-orange-100 dark:bg-orange-900">
                        {client.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{client.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {sessionTime} น.
                        </div>
                        <Badge
                          variant="outline"
                          className="text-xs py-0 bg-primary/10 border-primary/30"
                        >
                          {client.goal}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleStartSession(session.id)}
                    className="flex items-center gap-1 shadow-md bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    <BookOpen className="h-4 w-4" />
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* 3. ⚠️ ACTION REQUIRED: งานค้าง/To-do */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
        {/* ลูกเทรนต้องติดตาม - แบบขยาย */}
        {followUpClients.length > 0 && (
          <Card className="border-blue-200 bg-white dark:bg-gray-800 shadow-md">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-gray-900 dark:text-gray-100">
                      โปรแกรมที่ต้องติดตาม
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      รายชื่อลูกเทรนที่ไม่มีการฝึกซ้อมมานานกว่า 7 วัน
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                >
                  {followUpClients.length} คน
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/trainer/clients/${client.id}`)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar className="h-10 w-10 border-2 border-gray-200 dark:border-gray-700">
                          <AvatarImage src={client.avatar} alt={client.name} />
                          <AvatarFallback className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                            {client.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-blue-600 dark:text-blue-400 truncate">
                            {client.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-red-500"></div>
                            <p className="text-xs text-red-600 dark:text-red-400">
                              {daysSince
                                ? `ไม่มีการฝึก ${daysSince} วัน`
                                : "ยังไม่เคยเทรน"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/trainer/clients/${client.id}`);
                        }}
                      >
                        <TrendingUp className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      {/* 4. 📈 CHARTS: สถิติการฝึก & เป้าหมาย */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* กราฟแท่ง: สถิติการฝึก 7 วันย้อนหลัง */}
        <Card className="lg:col-span-2 shadow-md border-none">
          <CardHeader>
            <CardTitle className="text-base">การฝึก 7 วันย้อนหลัง</CardTitle>
            <CardDescription className="text-xs">
              เปรียบเทียบจำนวนที่นัด vs เทรนจริง
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={last7DaysData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />
                  <Bar
                    dataKey="นัดไว้"
                    name="นัดหมาย"
                    fill="#e5e7eb"
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                  />
                  <Bar
                    dataKey="เทรนแล้ว"
                    name="สำเร็จ"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Donut Chart: Goal Distribution */}
        <Card className="shadow-md border-none">
          <CardHeader>
            <CardTitle className="text-base">เป้าหมายลูกค้า</CardTitle>
            <CardDescription className="text-xs">
              สัดส่วนตามเป้าหมายหลัก
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={goalData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {goalData.map((entry: any, index: number) => (
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
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend ด้านล่าง */}
              <div className="flex flex-col gap-2 mt-4 max-h-[150px] overflow-y-auto">
                {goalData.map((g: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      ></div>
                      <span
                        className="text-xs text-gray-600 truncate max-w-[120px]"
                        title={g.name}
                      >
                        {g.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-800">
                        {g.value}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        ({Math.round((g.value / (clients.length || 1)) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
                {goalData.length === 0 && (
                  <div className="text-center text-gray-400 text-xs py-8">
                    ยังไม่มีข้อมูลเป้าหมาย
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
