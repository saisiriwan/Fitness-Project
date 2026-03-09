import { useEffect } from "react";
import {
  Home,
  Dumbbell,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

export interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  /** ส่ง collapsed state กลับให้ parent เพื่อปรับ margin ของ main content */
  onCollapsedChange?: (collapsed: boolean) => void;
}

// ─── Menu Config ──────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { id: "feed", label: "ตารางนัด", icon: Home },
  { id: "exercises", label: "ความก้าวหน้า", icon: Dumbbell },
  { id: "profile", label: "สรุปผล", icon: User },
  { id: "settings", label: "ข้อมูล", icon: Settings },
];

// ─── Sidebar Component ────────────────────────────────────────────────────────

export function Sidebar({
  activeTab,
  onTabChange,
  onCollapsedChange,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    onCollapsedChange?.(isCollapsed);
  }, [isCollapsed, onCollapsedChange]);

  const toggleCollapse = () => setIsCollapsed((prev) => !prev);

  // ─── Desktop nav item renderer ────────────────────────────────────────────

  const renderDesktopNavItem = (item: NavItem, compact: boolean = false) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;

    return (
      <button
        key={item.id}
        onClick={() => onTabChange(item.id)}
        title={compact ? item.label : undefined}
        className={`
          group relative w-full flex items-center rounded-xl font-medium text-sm
          transition-all duration-200
          ${compact ? "justify-center p-3" : "gap-3 px-4 py-3"}
          ${
            isActive
              ? "bg-[#FF6B35] text-white shadow-lg shadow-[#FF6B35]/25"
              : "text-white/65 hover:text-white hover:bg-white/10"
          }
        `}
      >
        <Icon className="shrink-0 h-5 w-5" />

        {!compact && <span className="truncate">{item.label}</span>}

        {/* Active dot — visible in compact mode */}
        {compact && isActive && (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-white/90" />
        )}

        {/* Tooltip for compact mode */}
        {compact && (
          <span
            className="
            absolute left-full ml-3 px-2 py-1 text-xs font-medium whitespace-nowrap
            bg-[#001529] text-white rounded-md border border-white/10
            opacity-0 pointer-events-none
            group-hover:opacity-100
            transition-opacity duration-150 z-50
          "
          >
            {item.label}
          </span>
        )}
      </button>
    );
  };

  // ─── Logo Block ──────────────────────────────────────────────────────────

  const Logo = ({ compact = false }: { compact?: boolean }) => (
    <div
      className={`flex items-center ${compact ? "justify-center" : "gap-2.5"}`}
    >
      {!compact && (
        <div>
          <p className="text-white font-bold text-base leading-none">
            Trainee Pro
          </p>
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ════════════════════════════════
          DESKTOP SIDEBAR (lg+)
      ════════════════════════════════ */}
      <aside
        className={`
          hidden lg:flex flex-col fixed left-0 top-0 h-screen z-40
          bg-[#002140] border-r border-[#003A6B]
          transition-[width] duration-300 ease-in-out overflow-hidden
          ${isCollapsed ? "w-[72px]" : "w-56"}
        `}
      >
        {/* Header: Logo + Toggle button */}
        <div className="flex items-center justify-between h-16 px-3 border-b border-[#003A6B] shrink-0">
          <Logo compact={isCollapsed} />
          <button
            onClick={toggleCollapse}
            className="flex items-center justify-center h-7 w-7 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            aria-label={isCollapsed ? "ขยาย sidebar" : "พับ sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
          {NAV_ITEMS.map((item) => renderDesktopNavItem(item, isCollapsed))}
        </nav>
      </aside>

      {/* ════════════════════════════════
          MOBILE BOTTOM TAB BAR (< lg)
          Native-like bottom navigation
      ════════════════════════════════ */}
      <nav
        aria-label="Mobile navigation"
        className="
          lg:hidden fixed bottom-0 left-0 right-0 z-50
          bg-[#002140] border-t border-[#003A6B]
          flex items-stretch
          shadow-[0_-4px_24px_rgba(0,0,0,0.3)]
        "
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                flex-1 flex flex-col items-center justify-center gap-1
                py-2 px-1 min-h-[60px]
                transition-all duration-200
                relative
                ${isActive ? "text-[#FF6B35]" : "text-white/45 hover:text-white/70"}
              `}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active indicator pill at top */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-[#FF6B35]" />
              )}

              {/* Icon with scale animation */}
              <span
                className={`
                  transition-transform duration-200
                  ${isActive ? "scale-110" : "scale-100"}
                `}
              >
                <Icon
                  className="h-[22px] w-[22px]"
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </span>

              {/* Label */}
              <span
                className={`
                  text-[10px] font-medium leading-none tracking-tight
                  transition-colors duration-200
                  ${isActive ? "text-[#FF6B35]" : "text-white/45"}
                `}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
