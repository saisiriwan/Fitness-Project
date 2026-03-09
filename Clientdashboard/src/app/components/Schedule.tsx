import { useState, useEffect, useCallback } from "react";
import { LogOut, Bell } from "lucide-react";
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const { lastMessage } = useWebSocket();

  const fetchData = useCallback(async () => {
    try {
      const currentUser = await clientService.getMe();
      setUser(currentUser);

      if (currentUser && currentUser.id) {
        try {
          const sessions = await clientService.getMySchedules();
          setSchedules(sessions || []);

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
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (
      lastMessage &&
      (lastMessage.type === "SESSION_UPDATE" ||
        lastMessage.type === "PROGRAM_UPDATE")
    ) {
      fetchData();
      toast.info("ข้อมูลมีการอัปเดต", { id: "ws-update-toast" });
    }
  }, [lastMessage, fetchData]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      onLogout();
    } catch (error) {
      console.error("Logout failed", error);
      onLogout();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-[#FF6B35]/20 border-t-[#FF6B35]" />
          <span className="text-sm text-muted-foreground font-medium">
            กำลังโหลด...
          </span>
        </div>
      </div>
    );
  }

  const initials = user?.name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar (Desktop only — lg+) */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCollapsedChange={setIsSidebarCollapsed}
      />

      {/* Main Content Wrapper */}
      <div
        className={`
          flex-1 flex flex-col min-h-screen
          transition-[margin] duration-300 ease-in-out
          ${isSidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-56"}
        `}
      >
        {/* ── Desktop sticky header ── */}
        <header className="hidden lg:flex sticky top-0 z-30 h-16 items-center gap-4 border-b bg-background/95 px-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-3 ml-auto">
            {/* Notification bell placeholder */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-9 w-9 text-muted-foreground"
            >
              <Bell className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full"
                >
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src={user?.avatar_url} alt={user?.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {initials}
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

        {/* ── Main Content ── */}
        <main
          className="flex-1 overflow-y-auto"
          style={{
            paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {/* Mobile greeting banner */}
          <div className="lg:hidden sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/60 px-4 py-3 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs text-muted-foreground font-medium leading-none mb-0.5">
                สวัสดี 👋
              </p>
              <p className="text-base font-bold text-foreground leading-none truncate max-w-[200px]">
                {user?.name || "Trainee"}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35]">
                  <Avatar className="h-9 w-9 border-2 border-[#FF6B35]/30">
                    <AvatarImage src={user?.avatar_url} alt={user?.name} />
                    <AvatarFallback className="bg-[#003366] text-white font-semibold text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52" align="end">
                <div className="flex flex-col space-y-0.5 p-2">
                  <p className="text-sm font-medium leading-none">
                    {user?.name || "Trainee User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || ""}
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

          {/* Page content */}
          <div className="p-4 sm:p-6 lg:p-8 space-y-4">
            {activeTab === "feed" && (
              <DashboardOverview
                schedules={schedules}
                metrics={metrics}
                user={user}
                lastMessage={lastMessage}
              />
            )}
            {activeTab === "exercises" && <ProgressView user={user} />}
            {activeTab === "profile" && (
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
          </div>
        </main>
      </div>
    </div>
  );
}
