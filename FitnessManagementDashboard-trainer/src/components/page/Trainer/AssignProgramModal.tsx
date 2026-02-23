import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Search,
  Check,
  Info,
  Users,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

// --- Interfaces ---

interface Client {
  id: string; // or number depending on your DB, keeping string for UI consistency
  name: string;
  email: string;
  avatar_url?: string;
  status?: "active" | "paused" | "inactive";
  current_program_id?: number | null; // Used for conflict detection
  current_program_name?: string; // Optional: for display in conflict dialog
}

interface AssignProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  programId: number | null;
  programName: string;
  preSelectedClientId?: string; // รองรับกรณีเปิดจากหน้า Client
  onSuccess?: () => void;
}

interface ProgramDetails {
  duration_weeks: number;
  days_per_week: number;
}

export default function AssignProgramModal({
  isOpen,
  onClose,
  programId,
  programName,
  preSelectedClientId,
  onSuccess,
}: AssignProgramModalProps) {
  // --- State ---
  const [clients, setClients] = useState<Client[]>([]);
  const [programDetails, setProgramDetails] = useState<ProgramDetails | null>(
    null,
  );

  // Selection
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Settings
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [defaultStartTime, setDefaultStartTime] = useState<string>("10:00");
  const [defaultEndTime, setDefaultEndTime] = useState<string>("11:00");

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingClients, setIsFetchingClients] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // --- Effects ---

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      if (programId) {
        fetchProgramDetails(programId);
      }

      // Reset & Setup
      setStartDate(new Date());
      setSearchTerm("");

      if (preSelectedClientId) {
        setSelectedClientIds([preSelectedClientId]);
      } else {
        setSelectedClientIds([]);
      }
    }
  }, [isOpen, programId, preSelectedClientId]);

  // --- API Calls ---

  const fetchClients = async () => {
    setIsFetchingClients(true);
    try {
      const res = await api.get("/clients");
      // Map response to fit interface if necessary
      const mappedClients = res.data.map((c: any) => ({
        ...c,
        id: c.id.toString(), // Ensure ID matches selectedClientIds type
        status: c.status || "inactive", // Default status if missing
        avatar_url: c.avatar_url || c.avatar,
      }));
      setClients(mappedClients);
    } catch (error) {
      console.error(error);
      toast.error("ไม่สามารถโหลดรายชื่อลูกค้าได้");
    } finally {
      setIsFetchingClients(false);
    }
  };
  const fetchProgramDetails = async (id: number) => {
    try {
      const res = await api.get(`/programs/${id}`);
      setProgramDetails(res.data);
    } catch (error) {
      console.error("Failed to fetch program details", error);
    }
  };

  const performAssignment = async () => {
    if (!programId || selectedClientIds.length === 0 || !startDate) return;

    setIsLoading(true);
    try {
      const formattedDate = format(startDate, "yyyy-MM-dd");

      // Use the correct bulk assignment endpoint
      await api.post(`/programs/${programId}/assign`, {
        client_ids: selectedClientIds.map((id) => parseInt(id, 10)),
        start_date: formattedDate,
        start_time: defaultStartTime,
        end_time: defaultEndTime,
      });

      // Toast Success
      // Calculate End Date for Toast
      let dateRangeStr = "";
      if (startDate && programDetails) {
        const end = new Date(startDate);
        const totalDays = programDetails.duration_weeks * 7 - 1;
        end.setDate(end.getDate() + totalDays);
        dateRangeStr = ` (${format(startDate, "d MMM", {
          locale: th,
        })} - ${format(end, "d MMM yyyy", { locale: th })})`;
      }

      toast.success(`มอบหมายโปรแกรมสำเร็จ${dateRangeStr}`);

      // Reset Form & Close
      setSelectedClientIds([]);
      setStartDate(new Date());
      setShowConfirmDialog(false);

      onClose(); // Close Dialog

      // Trigger OnSuccess (Navigate)
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error(error);
      const msg =
        error.response?.data?.error || "เกิดข้อผิดพลาดในการมอบหมายโปรแกรม";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ... (Logic & Helpers) ...

  const handleToggleClient = (clientId: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId],
    );
  };

  const handleAssignClick = () => {
    if (selectedClientIds.length === 0) {
      toast.error("กรุณาเลือกลูกเทรนอย่างน้อย 1 คน");
      return;
    }
    if (!startDate) {
      toast.error("กรุณาเลือกวันเริ่มต้น");
      return;
    }

    // Check for conflicts (Clients who already have an active program)
    const conflicts = clients.filter(
      (c) => selectedClientIds.includes(c.id) && c.current_program_id,
    );

    if (conflicts.length > 0) {
      setShowConfirmDialog(true);
    } else {
      performAssignment();
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Calculate End Date for Preview
  const endDatePreview = useMemo(() => {
    if (!startDate || !programDetails) return null;
    const end = new Date(startDate);
    const totalDays = programDetails.duration_weeks * 7 - 1;
    end.setDate(end.getDate() + totalDays);
    return end;
  }, [startDate, programDetails]);

  // Clients with active programs for Conflict Dialog
  const clientsWithConflicts = clients.filter(
    (c) => selectedClientIds.includes(c.id) && c.current_program_id,
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* ... (Header and Left Column Code remains same) ... */}
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b bg-white">
            <DialogTitle className="text-xl">มอบหมายโปรแกรม</DialogTitle>
            <DialogDescription>
              โปรแกรม:{" "}
              <span className="font-semibold text-primary">{programName}</span>
            </DialogDescription>
          </DialogHeader>

          {/* Body Grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-5 min-h-0 divide-x bg-slate-50/50">
            {/* Left Column: Client List (2/5) */}
            <div className="md:col-span-2 flex flex-col bg-white min-h-[400px]">
              <div className="p-4 border-b">
                <Label className="mb-2 block">ค้นหาลูกเทรน</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาด้วยชื่อหรืออีเมล..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {isFetchingClients ? (
                    <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      กำลังโหลดรายชื่อ...
                    </div>
                  ) : filteredClients.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center">
                      <Users className="h-8 w-8 mb-2 opacity-20" />
                      ไม่พบรายชื่อลูกค้า
                    </div>
                  ) : (
                    filteredClients.map((client) => {
                      const isSelected = selectedClientIds.includes(client.id);
                      return (
                        <div
                          key={client.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border",
                            isSelected
                              ? "bg-[#002140] border-[#002140] text-white shadow-md"
                              : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-100 text-slate-700",
                          )}
                          onClick={() => handleToggleClient(client.id)}
                        >
                          <div className="relative">
                            <Avatar className="h-10 w-10 border border-white/20">
                              <AvatarImage src={client.avatar_url} />
                              <AvatarFallback
                                className={
                                  isSelected ? "bg-white/20 text-white" : ""
                                }
                              >
                                {client.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 bg-[#FF6B35] text-white rounded-full p-0.5">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {client.name}
                            </p>
                            <p
                              className={cn(
                                "text-xs truncate",
                                isSelected
                                  ? "text-white/70"
                                  : "text-muted-foreground",
                              )}
                            >
                              {client.email}
                            </p>
                          </div>

                          {client.status && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] h-5",
                                isSelected ? "border-white/30 text-white" : "",
                              )}
                            >
                              {client.status === "active"
                                ? "Active"
                                : "Inactive"}
                            </Badge>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              <div className="p-3 bg-slate-50 border-t text-xs text-muted-foreground text-center">
                ลูกค้าทั้งหมด {clients.length} คน
              </div>
            </div>

            {/* Right Column: Settings & Summary (3/5) */}
            <div className="md:col-span-3 flex flex-col bg-slate-50 p-6 space-y-6 overflow-y-auto">
              {/* Selected Clients Badge Area */}
              <div className="space-y-3">
                <Label className="text-slate-500 uppercase text-xs font-bold tracking-wider flex justify-between">
                  <span>ลูกค้าที่เลือก ({selectedClientIds.length})</span>
                  {selectedClientIds.length > 0 && (
                    <span
                      className="text-primary cursor-pointer hover:underline normal-case font-normal"
                      onClick={() => setSelectedClientIds([])}
                    >
                      ล้างทั้งหมด
                    </span>
                  )}
                </Label>
                <div className="bg-white rounded-xl border p-4 min-h-[100px]">
                  {selectedClientIds.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm py-4 border-2 border-dashed rounded-lg">
                      <Users className="h-8 w-8 mb-2 opacity-20" />
                      <span className="mb-1">ยังไม่ได้เลือกลูกค้า</span>
                      <span className="text-xs">เลือกจากรายการทางด้านซ้าย</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedClientIds.map((id) => {
                        const c = clients.find((cl) => cl.id === id);
                        if (!c) return null;
                        return (
                          <Badge
                            key={id}
                            variant="secondary"
                            className="pl-1 pr-2 py-1 h-8 bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 gap-2"
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={c.avatar_url} />
                              <AvatarFallback className="text-[10px]">
                                {c.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            {c.name}
                            <div
                              className="h-5 w-5 rounded-full hover:bg-red-100 flex items-center justify-center cursor-pointer transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleClient(id);
                              }}
                            >
                              <X className="h-3 w-3 text-slate-400 hover:text-red-500" />
                            </div>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Schedule Settings */}
              <div className="space-y-4">
                <Label className="text-slate-500 uppercase text-xs font-bold tracking-wider">
                  ตั้งค่าตารางนัดหมาย
                </Label>
                <div className="bg-white rounded-xl border p-6 space-y-6 shadow-sm">
                  {/* Start Date */}
                  <div className="space-y-2">
                    <Label>วันที่เริ่มโปรแกรม</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !startDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? (
                            format(startDate, "PPP", { locale: th })
                          ) : (
                            <span>เลือกวันที่</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                          modifiers={{
                            programRange:
                              endDatePreview && startDate
                                ? { from: startDate, to: endDatePreview }
                                : [],
                          }}
                          modifiersStyles={{
                            programRange: {
                              color: "#002140",
                              backgroundColor: "#f0f9ff",
                              fontWeight: "bold",
                            },
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Time Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-time">เวลาเริ่มต้น</Label>
                      <Input
                        id="start-time"
                        type="time"
                        className="w-full min-w-[130px] pr-2 sm:pr-3"
                        value={defaultStartTime}
                        onChange={(e) => setDefaultStartTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-time">เวลาสิ้นสุด</Label>
                      <Input
                        id="end-time"
                        type="time"
                        className="w-full min-w-[130px] pr-2 sm:pr-3"
                        value={defaultEndTime}
                        onChange={(e) => setDefaultEndTime(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Program Details Preview */}
                  {programDetails && startDate && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 text-[#002140]">
                        <Info className="h-4 w-4" />
                        <span className="font-medium">รายละเอียด</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">ระยะเวลา</p>
                          <p className="font-medium">
                            {programDetails.duration_weeks} สัปดาห์
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">
                            วันสิ้นสุด (ประมาณ)
                          </p>
                          <p className="font-medium">
                            {endDatePreview
                              ? format(endDatePreview, "d MMM yyyy", {
                                  locale: th,
                                })
                              : "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reminder Settings Removed (Not Supported by Backend yet) */}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="p-4 border-t bg-white flex justify-end gap-3 z-10">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleAssignClick}
              disabled={isLoading || selectedClientIds.length === 0}
              className="bg-[#FF6B35] hover:bg-[#FF6B35]/90 min-w-[140px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                  กำลังบันทึก...
                </>
              ) : (
                `มอบหมายโปรแกรม (${selectedClientIds.length})`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Conflicts */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-orange-600 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <AlertDialogTitle>
                คำเตือน: โปรแกรมซ้ำซ้อน / เปลี่ยนโปรแกรม
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-4">
              <p>
                ลูกค้าบางคนมีโปรแกรมที่กำลังใช้งานอยู่ การมอบหมายใหม่จะ
                <strong className="text-red-600">
                  {" "}
                  ยกเลิกโปรแกรมปัจจุบันและนัดหมายที่เหลือทั้งหมด
                </strong>
              </p>

              <div className="border rounded-lg p-3 bg-slate-50 max-h-[200px] overflow-y-auto">
                {clientsWithConflicts.map((client) => {
                  const isDuplicate = client.current_program_id === programId;
                  return (
                    <div
                      key={client.id}
                      className="flex justify-between items-start text-sm py-2 border-b last:border-0"
                    >
                      <span className="font-medium text-slate-700">
                        {client.name}
                      </span>
                      <div className="text-right">
                        <span
                          className={cn(
                            "text-xs block",
                            isDuplicate
                              ? "text-red-600 font-bold"
                              : "text-amber-600",
                          )}
                        >
                          {isDuplicate
                            ? "⚠️ กำลังทำโปรแกรมนี้อยู่ (ซ้ำ)"
                            : `กำลังทำ: ${client.current_program_name || "โปรแกรมอื่น"}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="font-medium text-slate-800">
                ยืนยันที่จะดำเนินการต่อหรือไม่?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={performAssignment}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "ยืนยันและแทนที่"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
