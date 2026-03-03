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
import { useAuth } from "./AuthContext";
import { NotificationPopover } from "@/components/ui/NotificationPopover";

const navigation = [
  { name: "แดชบอร์ด", href: "/trainer/dashboard", icon: LayoutDashboard },
  { name: "ลูกเทรน", href: "/trainer/clients", icon: Users },
  { name: "ปฏิทิน", href: "/trainer/calendar", icon: Calendar },
  { name: "โปรแกรม", href: "/trainer/programs", icon: Dumbbell },
  { name: "คลังท่า", href: "/trainer/library/exercises", icon: BookOpen },
  { name: "รายงาน", href: "/trainer/reports", icon: BarChart3 },
  { name: "ตั้งค่า", href: "/trainer/settings", icon: Settings },
];

const mainNavigation = navigation.slice(0, 5);

interface SidebarContentProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

function SidebarContent({ collapsed = false, onToggle }: SidebarContentProps) {
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
            <span className="brand-title text-white">Trainer Pro</span>
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

function MobileBottomNav() {
  const location = useLocation();

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

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  React.useEffect(() => {
    if (!user?.picture) return;

    // #region agent log
    fetch(
      "http://127.0.0.1:7288/ingest/7fcceece-6d36-453b-864c-342a0eb56a3b",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "16d09d",
        },
        body: JSON.stringify({
          sessionId: "16d09d",
          runId: "pre-fix",
          hypothesisId: "H3",
          location: "Layout.tsx:171",
          message: "Layout avatar render picture",
          data: {
            picture: user.picture,
          },
          timestamp: Date.now(),
        }),
      },
    ).catch(() => {});
    // #endregion
  }, [user?.picture]);

  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

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
              {/* Notifications */}
              <NotificationPopover />

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
                      <p className="user-name">{user?.name || "Trainer"}</p>
                      <p className="user-email">
                        {user?.email || "trainer@example.com"}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/settings" className="menu-item-content">
                      <Settings className="menu-icon" />
                      <span>ตั้งค่าบัญชี</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
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
                className="p-0 w-72 bg-navy-900 border-r-navy-800 text-white"
              >
                <SidebarContent />
              </SheetContent>
            </Sheet>

            <h1 className="page-title-mobile">
              {currentPage?.name || "Trainer Pro"}
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
            <MobileBottomNav />
          </div>
        </div>
      </div>
    </>
  );
}
