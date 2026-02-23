import { useState, useEffect } from "react";
import { User, Search, Dumbbell, Settings } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { useAuth } from "../page/Trainer/AuthContext";
import { useNavigate } from "react-router-dom";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    clients: any[];
    programs: any[];
  }>({ clients: [], programs: [] });
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    const search = async () => {
      if (!query || query.length < 2 || !user) {
        setResults({ clients: [], programs: [] });
        return;
      }

      try {
        const res = await api.get(`/search?q=${query}&trainer_id=${user.id}`);
        setResults(res.data);
      } catch (error) {
        console.error("Search failed", error);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query, user]);

  const handleSelect = (url: string) => {
    setOpen(false);
    navigate(url);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-slate-500 hover:text-orange-600 hover:bg-orange-50"
        onClick={() => setOpen(true)}
      >
        <Search className="h-5 w-5" />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="ค้นหาลูกเทรน หรือ โปรแกรม..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>ไม่พบข้อมูล</CommandEmpty>

          {results.clients.length > 0 && (
            <CommandGroup heading="ลูกเทรน (Clients)">
              {results.clients.map((client) => (
                <CommandItem
                  key={client.id}
                  onSelect={() => handleSelect(`/trainer/clients/${client.id}`)}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>{client.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({client.email})
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results.programs.length > 0 && (
            <CommandGroup heading="โปรแกรม (Programs)">
              {results.programs.map((program) => (
                <CommandItem
                  key={program.id}
                  onSelect={() =>
                    handleSelect(`/trainer/programs/${program.id}`)
                  }
                  className="cursor-pointer"
                >
                  <Dumbbell className="mr-2 h-4 w-4" />
                  <span>{program.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Default suggestions if query is empty */}
          {query === "" && (
            <CommandGroup heading="เมนูลัด">
              <CommandItem onSelect={() => handleSelect("/trainer/dashboard")}>
                <LayoutDashboardIcon className="mr-2 h-4 w-4" />
                <span>แดชบอร์ด</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect("/trainer/clients")}>
                <User className="mr-2 h-4 w-4" />
                <span>ลูกเทรนทั้งหมด</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect("/trainer/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>ตั้งค่า</span>
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

function LayoutDashboardIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}
