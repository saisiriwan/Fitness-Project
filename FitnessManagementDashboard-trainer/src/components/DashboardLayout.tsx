import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Dumbbell,
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  Bell,
  TrendingUp,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "./page/Trainer/AuthContext";

// Define Navigation Items
const trainerNavigation = [
  { name: "แดชบอร์ด", href: "/trainer/dashboard", icon: LayoutDashboard },
  { name: "ลูกเทรน", href: "/trainer/clients", icon: Users },
  { name: "ปฏิทิน", href: "/trainer/calendar", icon: Calendar },
  { name: "โปรแกรม", href: "/trainer/programs", icon: Dumbbell },
  { name: "คลังท่า", href: "/trainer/library/exercises", icon: BookOpen },
  { name: "รายงาน", href: "/trainer/reports", icon: BarChart3 },
  { name: "ตั้งค่า", href: "/trainer/settings", icon: Settings },
];

const traineeNavigation = [
  { name: "แดชบอร์ด", href: "/trainee/dashboard", icon: LayoutDashboard },
  { name: "ตารางนัดหมาย", href: "/trainee/schedule", icon: Calendar },
  { name: "ความก้าวหน้า", href: "/trainee/progress", icon: TrendingUp },
  { name: "สรุปผลการฝึก", href: "/trainee/sessions", icon: FileText },
  { name: "ตั้งค่า", href: "/trainee/settings", icon: Settings },
];

interface SidebarContentProps {
  collapsed?: boolean;
  onToggle?: () => void;
  navigation: typeof trainerNavigation;
  title: string;
}

function SidebarContent({
  collapsed = false,
  onToggle,
  navigation,
  title,
}: SidebarContentProps) {
  const location = useLocation();

  return (
    <>
      <div className="sidebar-container">
        {/* Header */}
        <div
          className={`sidebar-header ${
            collapsed ? "collapsed" : "expanded"
          } border-b border-navy-800`}
        >
          {!collapsed && (
            <span className="brand-title text-white">{title}</span>
          )}
          {onToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="toggle-btn text-slate-400 hover:text-white hover:bg-navy-800"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Navigation */}
        <div className="nav-container">
          <TooltipProvider delayDuration={0}>
            {navigation.map((item) => {
              const isActive = location.pathname.startsWith(item.href);

              const LinkContent = (
                <Link
                  to={item.href}
                  className={`
                    nav-link ${collapsed ? "collapsed" : ""} 
                    ${
                      isActive
                        ? "bg-orange-600 text-white shadow-lg shadow-orange-900/20"
                        : "text-slate-400 hover:bg-navy-800 hover:text-white"
                    }
                    group
                  `}
                >
                  <item.icon
                    className={`nav-icon ${
                      isActive
                        ? "text-white"
                        : "text-slate-400 group-hover:text-white"
                    } ${!collapsed ? "with-margin" : ""}`}
                  />
                  {!collapsed && <span className="nav-text">{item.name}</span>}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>{LinkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="tooltip-content">
                      {item.name}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={item.name}>{LinkContent}</div>;
            })}
          </TooltipProvider>
        </div>
      </div>
    </>
  );
}

function MobileBottomNav({
  navigation,
}: {
  navigation: typeof trainerNavigation;
}) {
  const location = useLocation();
  const mainNavigation = navigation.slice(0, 5);

  return (
    <>
      <nav className="mobile-nav">
        <div className="mobile-nav-grid">
          {mainNavigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`mobile-nav-item ${
                  isActive ? "active" : "inactive"
                }`}
              >
                <item.icon
                  className={`mobile-nav-icon ${isActive ? "active" : ""}`}
                />
                <span className="mobile-nav-text">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  userType: "trainer" | "trainee";
}

export default function DashboardLayout({
  children,
  userType,
}: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const navigation =
    userType === "trainer" ? trainerNavigation : traineeNavigation;
  const appTitle = userType === "trainer" ? "Trainer Pro" : "Fitness App";

  const currentPage = navigation.find((item) =>
    location.pathname.startsWith(item.href),
  );

  return (
    <>
      <div className="layout-container">
        {/* Desktop Sidebar */}
        <aside
          className={`sidebar-desktop ${
            sidebarCollapsed ? "collapsed" : ""
          } bg-navy-900 border-r-navy-800`}
        >
          <SidebarContent
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            navigation={navigation}
            title={appTitle}
          />
        </aside>

        {/* Main Content Wrapper */}
        <div
          className={`main-content-wrapper ${
            sidebarCollapsed ? "collapsed" : ""
          }`}
        >
          {/* Desktop Header */}
          <header className="header-desktop bg-white/80 backdrop-blur-md border-b border-slate-100">
            <div className="flex items-center gap-4 ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="avatar-btn">
                    <Avatar className="avatar-img">
                      <AvatarImage src={user?.picture} alt={user?.name} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                        {user?.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="user-info-container">
                    <div className="user-details">
                      <p className="user-name">
                        {user?.name ||
                          (userType === "trainer"
                            ? "Trainer User"
                            : "Trainee User")}
                      </p>
                      <p className="user-email">
                        {user?.email || "user@example.com"}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {userType === "trainer" && (
                    <>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link
                          to="/trainer/settings"
                          className="menu-item-content"
                        >
                          <Settings className="menu-icon" />
                          <span>ตั้งค่าบัญชี</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="menu-icon" />
                    <span>ออกจากระบบ</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Mobile Header */}
          <header className="header-mobile">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="p-0 w-[280px] bg-navy-900 border-r-navy-800"
              >
                <SidebarContent navigation={navigation} title={appTitle} />
              </SheetContent>
            </Sheet>

            <h1 className="page-title-mobile">
              {currentPage?.name || appTitle}
            </h1>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="-mr-2">
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarImage src={user?.picture} alt={user?.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {user?.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="user-info-container">
                  <div className="user-details">
                    <p className="user-name">{user?.name}</p>
                    <p className="user-email">{user?.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-destructive"
                >
                  <LogOut className="menu-icon" />
                  <span>ออกจากระบบ</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          {/* Page Content */}
          <main className="page-content">
            <div className="content-container">{children}</div>
          </main>

          {/* Mobile Bottom Navigation */}
          <div className="mobile-nav-wrapper">
            <MobileBottomNav navigation={navigation} />
          </div>
        </div>
      </div>
    </>
  );
}
