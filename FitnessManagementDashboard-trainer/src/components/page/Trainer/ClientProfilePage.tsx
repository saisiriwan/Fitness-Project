import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ClipboardEdit,
  Calendar as CalendarIcon,
  TrendingUp,
  StickyNote,
  Dumbbell,
  Edit,
  Mail,
  AlertCircle,
} from "lucide-react";
import api from "@/lib/api";
import { toRFC3339String } from "@/lib/utils";
import ClientSchedule from "./client-profile/ClientSchedule";
import ClientProgram from "./client-profile/ClientProgram";
import ClientProgress from "./client-profile/ClientProgress";
import ClientNotes from "./client-profile/ClientNotes";
import EditClientModal from "./EditClientModal";
import { toast } from "sonner";

export interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  status: "active" | "inactive" | "paused";
  joinDate?: string;
  goal?: string;
  primaryGoal?: string;
  currentProgram?: number;
  initialWeight?: number;
  currentWeight?: number;
  targetWeight?: number;
  notes?: string;
  tags?: string[];
  metrics?: {
    weight?: number;
    bodyFat?: number;
    muscle?: number;
  };
}

export default function ClientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const activeTab = searchParams.get("tab") || "schedule";

  const fetchClientData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      // 1. Fetch Client Details
      const clientRes = await api.get(`/clients/${id}`);
      setClient(clientRes.data);

      // 2. Fetch Sessions for stats
      const sessionRes = await api.get(`/clients/${id}/sessions`);
      // Handle potential nested structure (common API pattern)
      const sessionsData =
        sessionRes.data?.data?.sessions ||
        sessionRes.data?.sessions ||
        sessionRes.data ||
        [];
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
    } catch (err) {
      console.error("Failed to fetch client data", err);
      toast.error("ไม่สามารถโหลดข้อมูลลูกเทรนได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900 mx-auto mb-4"></div>
          <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">ไม่พบข้อมูลลูกเทรน</p>
        <Button onClick={() => navigate("/trainer/clients")} className="mt-4">
          กลับไปรายชื่อลูกเทรน
        </Button>
      </div>
    );
  }

  const handleStartSession = async () => {
    try {
      const now = new Date();
      const startTime = toRFC3339String(now);
      const endTime = toRFC3339String(new Date(now.getTime() + 60 * 60 * 1000)); // Default 1 hour

      const res = await api.post("/sessions", {
        client_id: client.id,
        title: "Workout Session",
        start_time: startTime,
        end_time: endTime,
        status: "in-progress",
        notes: "Started from Client Profile",
      });
      navigate(`/trainer/sessions/${res.data.id}/log`);
    } catch (err) {
      console.error(err);
      toast.error("ไม่สามารถเริ่มเซสชันได้");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      active: { label: "กำลังออกกำลัง", variant: "default" as const },
      paused: { label: "พักชั่วคราว", variant: "secondary" as const },
      inactive: { label: "ไม่ได้ใช้งาน", variant: "outline" as const },
    };

    return (
      statusMap[status as keyof typeof statusMap] || {
        label: status,
        variant: "outline" as const,
      }
    );
  };

  const statusBadge = getStatusBadge(client.status || "active");

  // Get last session date and upcoming session
  const todayForFilter = new Date();
  todayForFilter.setHours(0, 0, 0, 0);

  const upcomingSessions = sessions.filter(
    (s) =>
      s.status === "scheduled" &&
      new Date(s.start_time).getTime() >= todayForFilter.getTime(),
  );

  const nextSession = upcomingSessions.sort(
    (a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  )[0];

  let daysDiff = 0;
  let isOverdue = false;
  let isToday = false;

  if (nextSession) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(nextSession.start_time);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    daysDiff = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) {
      isOverdue = true;
    } else if (daysDiff === 0) {
      isToday = true;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-8">
      {/* App Header */}
      <div className="bg-white px-4 md:px-8 pt-6 pb-4 shadow-sm sticky top-0 z-30">
        <div className="flex items-center justify-between mb-4 max-w-5xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/trainer/clients")}
            className="h-10 w-10 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 text-center font-semibold text-lg" />
          <div className="h-10 w-10 shrink-0 flex items-center justify-end">
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Edit className="h-5 w-5 text-gray-500" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md p-0 overflow-hidden rounded-t-2xl sm:rounded-xl fixed bottom-0 sm:bottom-auto sm:top-[50%] sm:-translate-y-[50%] w-full m-0 translate-y-0 data-[state=closed]:slide-out-to-bottom-full data-[state=open]:slide-in-from-bottom-full sm:data-[state=closed]:fade-out-0 sm:data-[state=open]:fade-in-0 duration-300">
                <DialogHeader className="px-4 py-4 border-b">
                  <DialogTitle>แก้ไขข้อมูลลูกเทรน</DialogTitle>
                </DialogHeader>
                <div className="p-4 max-h-[80vh] overflow-y-auto">
                  <EditClientModal
                    client={client}
                    onSuccess={() => {
                      setShowEditDialog(false);
                      fetchClientData();
                    }}
                    onCancel={() => setShowEditDialog(false)}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Client Identity Block */}
        <div className="flex items-center gap-4 px-2 md:px-0 max-w-5xl mx-auto">
          {/* Avatar Placeholder if none */}
          <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-navy-100 flex items-center justify-center text-navy-600 font-bold text-xl md:text-2xl shrink-0">
            {client.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="text-xl md:text-3xl font-bold tracking-tight text-navy-900 leading-tight">
              {client.name}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-0.5">
              {client.email}
            </p>
            <div className="mt-2 flex gap-2">
              <Badge
                variant={statusBadge.variant}
                className="text-[10px] md:text-xs px-2 md:px-3 py-0.5 md:py-1 rounded-full font-medium"
              >
                {statusBadge.label}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-4 md:py-6 space-y-4 md:space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Quick Action */}
          <Button
            onClick={handleStartSession}
            className="w-full md:w-1/3 min-h-[56px] md:h-auto rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md shadow-orange-500/20 active:scale-[0.98] transition-all flex md:flex-col items-center justify-center md:gap-2"
          >
            <Dumbbell className="h-5 w-5 md:h-6 md:w-6 mr-2 md:mr-0" />
            <span className="font-semibold md:text-lg">
              เริ่มบันทึกการฝึกสอน
            </span>
          </Button>

          {/* 🎯 นัดหมายถัดไป (Mobile Optimized Card) */}
          {nextSession && (
            <div
              className={`w-full md:flex-1 bg-white rounded-2xl border ${isOverdue ? "border-red-100" : "border-gray-100"} p-4 md:p-6 shadow-sm relative overflow-hidden flex items-center`}
            >
              <div
                className={`absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 ${isOverdue ? "bg-red-50" : "bg-orange-50"} rounded-bl-full -z-0 opacity-50`}
              />
              <div className="relative z-10 flex items-center justify-between w-full">
                <div className="flex items-center gap-3 md:gap-5">
                  <div
                    className={`h-12 w-12 md:h-14 md:w-14 rounded-xl ${isOverdue ? "bg-red-100" : "bg-orange-100"} flex items-center justify-center shrink-0`}
                  >
                    {isOverdue ? (
                      <AlertCircle className="h-6 w-6 md:h-7 md:w-7 text-red-600" />
                    ) : (
                      <CalendarIcon className="h-6 w-6 md:h-7 md:w-7 text-orange-600" />
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-[11px] md:text-sm font-semibold uppercase tracking-wider mb-0.5 md:mb-1 ${isOverdue ? "text-red-600" : "text-orange-600"}`}
                    >
                      {isOverdue ? "เกินกำหนด / ขาดเรียน" : "นัดหมายคลาสถัดไป"}
                    </p>
                    <p className="font-bold text-gray-900">
                      {new Date(nextSession.start_time).toLocaleDateString(
                        "th-TH",
                        {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        },
                      )}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {new Date(nextSession.start_time).toLocaleTimeString(
                        "th-TH",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}{" "}
                      น.
                    </p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-center justify-center ml-4 shrink-0">
                  {isOverdue ? (
                    <div className="flex flex-col items-center">
                      <p className="text-xl md:text-2xl font-black text-red-500 leading-none my-1">
                        Overdue
                      </p>
                      <p className="text-[10px] md:text-xs text-red-400 font-medium mt-1">
                        {Math.abs(daysDiff)} วันที่แล้ว
                      </p>
                    </div>
                  ) : isToday ? (
                    <div className="flex flex-col items-center">
                      <p className="text-xl md:text-2xl font-black text-orange-500 leading-none my-1">
                        วันนี้
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-[10px] md:text-xs text-gray-400 uppercase">
                        อีก
                      </p>
                      <p className="text-2xl md:text-4xl font-black text-orange-500 leading-none my-1">
                        {daysDiff}
                      </p>
                      <p className="text-[10px] md:text-xs text-gray-400 uppercase">
                        วัน
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 📋 Tabs - รายละเอียดเพิ่มเติม (Mobile App Style Tabs) */}
        <div className="bg-white rounded-2xl p-2 md:p-4 border border-gray-100 shadow-sm">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              const params = new URLSearchParams(searchParams);
              params.set("tab", value);
              navigate(`/trainer/clients/${id}?${params.toString()}`, {
                replace: true,
              });
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4 bg-slate-50 p-1 md:p-2 rounded-xl h-14 md:h-16 gap-1 md:gap-2">
              <TabsTrigger
                value="schedule"
                className="flex flex-col md:flex-row md:gap-2 items-center justify-center py-1.5 h-full rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-navy-700 transition-all font-medium"
              >
                <CalendarIcon className="h-5 w-5 md:h-4 md:w-4 mb-0.5 md:mb-0" />
                <span className="text-[10px] md:text-sm leading-none">
                  ตาราง
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="program"
                className="flex flex-col md:flex-row md:gap-2 items-center justify-center py-1.5 h-full rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-navy-700 transition-all font-medium"
              >
                <Dumbbell className="h-5 w-5 md:h-4 md:w-4 mb-0.5 md:mb-0" />
                <span className="text-[10px] md:text-sm leading-none">แผน</span>
              </TabsTrigger>
              <TabsTrigger
                value="progress"
                className="flex flex-col md:flex-row md:gap-2 items-center justify-center py-1.5 h-full rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-navy-700 transition-all font-medium"
              >
                <TrendingUp className="h-5 w-5 md:h-4 md:w-4 mb-0.5 md:mb-0" />
                <span className="text-[10px] md:text-sm leading-none">
                  สถิติ
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="flex flex-col md:flex-row md:gap-2 items-center justify-center py-1.5 h-full rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-navy-700 transition-all font-medium"
              >
                <StickyNote className="h-5 w-5 md:h-4 md:w-4 mb-0.5 md:mb-0" />
                <span className="text-[10px] md:text-sm leading-none">
                  โน้ต
                </span>
              </TabsTrigger>
            </TabsList>

            <div className="mt-4 px-1">
              <TabsContent
                value="schedule"
                className="m-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <ClientSchedule client={client} />
              </TabsContent>

              <TabsContent
                value="program"
                className="m-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <ClientProgram client={client} />
              </TabsContent>

              <TabsContent
                value="progress"
                className="m-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <ClientProgress client={client} />
              </TabsContent>

              <TabsContent
                value="notes"
                className="m-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <ClientNotes client={client} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
