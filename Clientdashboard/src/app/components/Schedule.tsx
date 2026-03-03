import { useState, useEffect } from "react";
import { LogOut } from "lucide-react";
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
      toast.info("ข้อมูลมีการอัปเดต", { id: "ws-update-toast" });
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
