import React from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../../ui/command";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Dumbbell,
  BookOpen,
  BarChart3,
  Settings,
  ClipboardEdit,
  UserPlus,
  CalendarPlus,
} from "lucide-react";

const navigationCommands = [
  {
    icon: LayoutDashboard,
    label: "แดชบอร์ด",
    href: "/dashboard",
    group: "นำทาง",
  },
  { icon: Users, label: "ลูกเทรน", href: "/clients", group: "นำทาง" },
  { icon: Calendar, label: "ปฏิทิน", href: "/calendar", group: "นำทาง" },
  { icon: Dumbbell, label: "โปรแกรม", href: "/programs", group: "นำทาง" },
  {
    icon: BookOpen,
    label: "คลังท่า",
    href: "/library/exercises",
    group: "นำทาง",
  },
  { icon: BarChart3, label: "รายงาน", href: "/reports", group: "นำทาง" },
  { icon: Settings, label: "ตั้งค่า", href: "/settings", group: "นำทาง" },
];

const actionCommands = [
  {
    icon: UserPlus,
    label: "เพิ่มลูกเทรนใหม่",
    action: "new-client",
    group: "การดำเนินการ",
  },
  {
    icon: CalendarPlus,
    label: "สร้างนัดหมาย",
    action: "new-appointment",
    group: "การดำเนินการ",
  },
  {
    icon: Dumbbell,
    label: "สร้างโปรแกรมใหม่",
    action: "new-program",
    group: "การดำเนินการ",
  },
  {
    icon: ClipboardEdit,
    label: "บันทึกการฝึก",
    action: "new-session",
    group: "การดำเนินการ",
  },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  const handleSelect = (callback: () => void) => {
    onOpenChange(false);
    callback();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="ค้นหาคำสั่ง"
      description="ค้นหาเมนูและการดำเนินการต่างๆ"
    >
      <CommandInput placeholder="ค้นหาเมนู, การดำเนินการ..." />
      <CommandList>
        <CommandEmpty>ไม่พบผลลัพธ์</CommandEmpty>

        <CommandGroup heading="นำทาง">
          {navigationCommands.map((command) => (
            <CommandItem
              key={command.href}
              onSelect={() => handleSelect(() => navigate(command.href))}
              className="flex items-center gap-2"
            >
              <command.icon className="h-4 w-4" />
              <span>{command.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="การดำเนินการ">
          {actionCommands.map((command) => (
            <CommandItem
              key={command.action}
              onSelect={() =>
                handleSelect(() => {
                  if (command.action === "new-client") {
                    navigate("/trainer/clients?action=new-client");
                  } else if (command.action === "new-program") {
                    navigate("/trainer/programs?action=new-program");
                  } else if (
                    command.action === "new-appointment" ||
                    command.action === "new-session"
                  ) {
                    navigate("/trainer/sessions/new");
                  }
                })
              }
              className="flex items-center gap-2"
            >
              <command.icon className="h-4 w-4" />
              <span>{command.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
