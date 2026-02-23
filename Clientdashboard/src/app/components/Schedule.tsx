import { useState, useEffect } from "react";
import {
  MapPin,
  User,
  Calendar,
  Clock,
  Bell,
  LogOut,
  Settings,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { Sidebar } from "./Sidebar";
import { ProgressView } from "./ProgressView";
import { SessionCardsView } from "./SessionCardsView";
import { DashboardOverview } from "./DashboardOverview";
import { SettingsView } from "./SettingsView";
import { authService } from "@/services/authService";
import { clientService, ClientProfile } from "@/services/clientService";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useWebSocket } from "../../hooks/useWebSocket";

interface DashboardProps {
  onLogout: () => void;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("feed");
  const [user, setUser] = useState<ClientProfile | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- WebSocket Integration ---
  const { lastMessage } = useWebSocket();

  const fetchData = async () => {
    try {
      // Don't set loading on background refresh to avoid flickering
      // setLoading(true);

      // 1. Fetch User
      const currentUser = await clientService.getMe();
      setUser(currentUser);

      // 2. Fetch Client Data (Schedules/Sessions)
      if (currentUser && currentUser.id) {
        try {
          // Use getMySchedules to fetch schedules via token (safer than using ID)
          const sessions = await clientService.getMySchedules();
          setSchedules(sessions || []);

          // 3. Fetch Metrics (Weight History)
          const weightMetrics = await clientService.getClientMetrics(
            currentUser.id,
            "weight",
          );
          setMetrics(weightMetrics || []);
        } catch (error) {
          console.error("Failed to load client data", error);
        }
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn("User login แล้ว แต่ยังไม่มี Profile");
        toast.warning(
          "ไม่พบข้อมูลโปรไฟล์ของคุณ กรุณาติดต่อผู้ดูแลระบบเพื่อสร้างข้อมูล",
          { id: "missing-profile-warning" },
        );
        setLoading(false);
        return;
      }

      console.error("Failed to load user profile", error);
      toast.error("ไม่สามารถโหลดข้อมูลผู้ใช้ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true); // Initial Load
    fetchData();
  }, []);

  // WebSocket Listener
  useEffect(() => {
    if (
      lastMessage &&
      (lastMessage.type === "SESSION_UPDATE" ||
        lastMessage.type === "PROGRAM_UPDATE")
    ) {
      console.log("WebSocket Update Received:", lastMessage);
      fetchData();
      toast.info("ข้อมูลมีการอัปเดต");
    }
  }, [lastMessage]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      onLogout();
    } catch (error) {
      console.error("Logout failed", error);
      onLogout(); // Force logout on frontend anyway
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Format date to Thai format
  const formatDate = (dateString: string) => {
    // If dateString is ISO, parse it. If YYYY-MM-DD, parse it.
    const date = dateString ? new Date(dateString) : new Date();
    return format(date, "EEEE d MMMM", { locale: th });
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return "-";
    return format(parseISO(isoString), "HH:mm");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Wrapper */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen transition-all duration-300 ease-in-out">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-4 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full"
                >
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src={user?.avatar_url} alt={user?.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                      {user?.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">
                    {user?.name || "Trainee User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || "user@example.com"}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>ออกจากระบบ</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
          {activeTab === "feed" && (
            <DashboardOverview
              schedules={schedules}
              metrics={metrics}
              user={user}
              lastMessage={lastMessage}
            />
          )}

          {activeTab === "schedule" && (
            <div className="space-y-4 sm:space-y-6">
              {/* Header */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  ตารางนัดหมายการฝึก
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  รายการกำหนดการที่กำลังจะมาถึง
                </p>
              </div>

              {/* Schedule List */}
              <div className="space-y-3 sm:space-y-4">
                {schedules.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground border rounded-lg">
                    ไม่มีการนัดหมาย
                  </div>
                ) : (
                  schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className={`border rounded-lg p-4 sm:p-6 transition-shadow ${
                        schedule.status === "cancelled"
                          ? "bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-800 opacity-60"
                          : "bg-card border-border hover:shadow-md"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start gap-4">
                        {/* Trainer Avatar */}
                        <div className="flex-shrink-0">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md ${
                              schedule.status === "cancelled"
                                ? "bg-gray-300"
                                : schedule.type === "appointment"
                                  ? "bg-gradient-to-br from-teal-500 to-emerald-600"
                                  : "bg-gradient-to-br from-[#002140] to-[#003d75]"
                            }`}
                          >
                            {schedule.type === "appointment" ? (
                              <Calendar className="w-6 h-6 text-white" />
                            ) : (
                              <User className="w-6 h-6 text-white" />
                            )}
                          </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                          {/* Trainer Info */}
                          <div className="flex items-center gap-3 mb-1">
                            <h3
                              className={`flex items-center gap-2 ${
                                schedule.status === "cancelled"
                                  ? "line-through text-muted-foreground"
                                  : "text-foreground"
                              }`}
                            >
                              <span>{schedule.trainer_name || "Trainer"}</span>
                              {schedule.type === "appointment" && (
                                <span className="px-2 py-0.5 rounded border border-teal-200 text-teal-700 bg-teal-50 text-[10px]">
                                  นัดหมายทั่วไป
                                </span>
                              )}
                            </h3>
                            <span
                              className={`px-3 py-1 rounded-full text-xs ${
                                schedule.status === "cancelled"
                                  ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                  : schedule.status === "completed"
                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
                              }`}
                            >
                              {schedule.status === "cancelled"
                                ? "ยกเลิกนัดหมาย"
                                : schedule.status === "completed"
                                  ? "เสร็จสิ้น"
                                  : "นัดหมาย"}
                            </span>
                          </div>

                          {/* Schedule Details */}
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            {/* Date & Time */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span className="text-sm">
                                  {schedule.start_time
                                    ? formatDate(schedule.start_time)
                                    : schedule.date}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">
                                  {formatTime(schedule.start_time)} (
                                  {schedule.duration || 60} นาที)
                                </span>
                              </div>
                            </div>

                            {/* Location & Type */}
                            <div className="space-y-2">
                              {schedule.location && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <MapPin className="w-4 h-4" />
                                  <span className="text-sm">
                                    {schedule.location}
                                  </span>
                                </div>
                              )}
                              {schedule.title && (
                                <div className="flex items-start gap-2">
                                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs inline-block">
                                    {schedule.title}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "exercises" && <ProgressView user={user} />}

          {/* Note: 'profile' tab in Sidebar currently maps to SessionCardsView in original code */}
          {activeTab === "profile" && (
            // Passing schedules as 'cards' for now, SessionCardsView might need adaptation
            // or we filter schedules to only show completed ones with feedback
            <SessionCardsView
              cards={
                schedules.filter(
                  (s: any) =>
                    (s.status === "completed" || s.status === "reviewed") &&
                    s.type !== "appointment",
                ) as any
              }
            />
          )}

          {activeTab === "settings" && (
            <SettingsView user={user} onLogout={handleLogout} />
          )}
        </main>
      </div>
    </div>
  );
}
