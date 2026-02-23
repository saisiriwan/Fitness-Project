import React from "react";
import { Home, User, Settings, Dumbbell } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const menuItems = [
    { id: "feed", icon: Home, label: "ตารางนัดหมาย" },
    { id: "exercises", icon: Dumbbell, label: "ความก้าวหน้า" },
    { id: "profile", icon: User, label: "สรุปผลการฝึก" },
    { id: "settings", icon: Settings, label: "ข้อมูลส่วนตัว" },
  ];

  return (
    <>
      {/* Desktop Sidebar - ซ่อนบน mobile */}
      <div className="hidden lg:flex w-56 h-screen bg-[#002140] border-r border-[#003A6B] flex-col p-4 fixed left-0 top-0 z-40">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Trainee</h1>
          <p className="text-xs text-white/60 mt-1">ระบบจัดการการฝึก</p>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#FF6B35] text-white"
                    : "text-white/80 hover:bg-[#003A6B]"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Bottom Navigation - แสดงเฉพาะบน mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#002140] border-t border-[#003A6B] z-50 safe-area-bottom">
        <nav className="flex items-center justify-around px-2 py-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px] ${
                  isActive ? "text-[#FF6B35]" : "text-white/70"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${isActive ? "scale-110" : ""} transition-transform`}
                />
                <span className="text-[10px] font-medium leading-tight text-center">
                  {item.label.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
