import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import NewClientModal from "./NewClientModal";
import { toast } from "sonner";
import api from "@/lib/api";
import type { Client } from "./ClientProfilePage";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Search,
  Plus,
  Calendar,
  Edit,
  Trash2,
  MoreHorizontal,
  SlidersHorizontal,
  X,
} from "lucide-react";

export default function ClientsList() {
  const navigate = useNavigate();
  const location = useLocation();

  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [goalFilter, setGoalFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false); // mobile collapsible filters
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const startDate = new Date().toISOString().split("T")[0];
      const [clientsRes, sessionsRes] = await Promise.all([
        api.get("/clients"),
        api.get(`/schedules?start_date=${startDate}`),
      ]);
      const normalizedClients = (clientsRes.data || []).map((c: any) => ({
        ...c,
        status: c.status ? c.status.toLowerCase() : "active",
      }));
      setClients(normalizedClients);
      setSessions(sessionsRes.data || []);
    } catch (err) {
      console.error("Failed to fetch data", err);
      toast.error("โหลดข้อมูลลูกเทรนไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  // Handle ?action=new-client from CommandPalette
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("action") === "new-client") {
      setShowNewClientModal(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  useEffect(() => {
    fetchData();
  }, []);

  /* ─── Derived data ─── */
  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.email &&
        client.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus =
      statusFilter === "all" || client.status === statusFilter;
    const matchesGoal = goalFilter === "all" || client.goal === goalFilter;
    return matchesSearch && matchesStatus && matchesGoal;
  });

  const activeClients = clients.filter((c) => c.status === "active").length;
  const pausedClients = clients.filter((c) => c.status === "paused").length;
  const inactiveClients = clients.filter((c) => c.status === "inactive").length;
  const hasActiveFilter = statusFilter !== "all" || goalFilter !== "all";

  const getNextSession = (clientId: number) => {
    const next = sessions
      .filter((s) => s.client_id === clientId && s.status === "scheduled")
      .sort(
        (a: any, b: any) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      )[0];
    if (!next) return null;
    return new Date(next.start_time).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleNewClient = (clientId: string) => {
    setShowNewClientModal(false);
    navigate(`/trainer/clients/${clientId}`);
    fetchData();
  };

  const handleDeleteClient = async (clientId: number) => {
    try {
      await api.delete(`/clients/${clientId}`);
      toast.success("ลบลูกเทรนเรียบร้อยแล้ว");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("ลบลูกเทรนไม่สำเร็จ");
    }
  };

  const getStatusBadge = (status: string) => {
    const normalized = status ? status.toLowerCase() : "active";
    const map: Record<
      string,
      { label: string; variant: "default" | "secondary" | "outline" }
    > = {
      active: { label: "กำลังออกกำลัง", variant: "default" },
      paused: { label: "พักชั่วคราว", variant: "secondary" },
      inactive: { label: "เลิกเทรน", variant: "outline" },
    };
    return (
      map[normalized] ?? {
        label: status || "กำลังออกกำลัง",
        variant: "default",
      }
    );
  };

  /* ========================
     LOADING — Skeleton Cards
  ======================== */
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-4 px-4 sm:px-6">
          {/* Skeleton header */}
          <div className="h-10 bg-muted rounded-lg animate-pulse w-full max-w-sm" />
        </CardHeader>
        <CardContent className="px-4 sm:px-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-muted rounded-xl animate-pulse"
              style={{ opacity: 1 - i * 0.15 }}
            />
          ))}
        </CardContent>
      </Card>
    );
  }

  /* ========================
     MAIN RENDER
  ======================== */
  return (
    <Card>
      {/* ─────────────────────────────────────────
          HEADER
          Mobile: Search + Filter toggle + Add btn
          Desktop: Search | Filters inline | Stats + Add
      ───────────────────────────────────────── */}
      <CardHeader className="pb-3 px-4 sm:px-6">
        {/* Row 1: Search + Filter toggle (mobile) + Add button */}
        <div className="flex items-center gap-2">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="ค้นหาชื่อ หรือ อีเมล..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 min-h-[44px]"
            />
          </div>

          {/* Mobile: toggle filters button */}
          <Button
            variant={hasActiveFilter ? "default" : "outline"}
            size="icon"
            className="sm:hidden min-w-[44px] min-h-[44px] flex-shrink-0"
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Toggle filters"
          >
            {showFilters ? (
              <X className="h-4 w-4" />
            ) : (
              <SlidersHorizontal className="h-4 w-4" />
            )}
          </Button>

          {/* Add client button */}
          <Dialog
            open={showNewClientModal}
            onOpenChange={setShowNewClientModal}
          >
            <DialogTrigger asChild>
              <Button
                variant="default"
                className="flex items-center gap-1.5 whitespace-nowrap min-h-[44px] bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0"
              >
                <Plus className="h-4 w-4" />
                {/* Text label — full on sm+, just icon on tiny mobile */}
                <span className="hidden xs:inline sm:inline">เพิ่มลูกเทรน</span>
              </Button>
            </DialogTrigger>
            <DialogContent
              className="w-[calc(100%-2rem)] max-w-md"
              aria-describedby="new-client-description"
            >
              <DialogHeader>
                <DialogTitle>เพิ่มลูกเทรนใหม่</DialogTitle>
                <DialogDescription id="new-client-description">
                  กรอกข้อมูลพื้นฐาน ระบบจะแจ้งเตือนหากชื่อซ้ำ
                </DialogDescription>
              </DialogHeader>
              <NewClientModal
                onClientCreated={handleNewClient}
                existingClients={clients}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Row 2: Filters (always visible on sm+, collapsible on mobile) */}
        <div
          className={`
            flex flex-col sm:flex-row sm:items-center gap-2 mt-2
            ${showFilters ? "flex" : "hidden sm:flex"}
          `}
        >
          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px] min-h-[44px] sm:min-h-0">
              <SelectValue placeholder="สถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {/* Goal filter */}
          <Select value={goalFilter} onValueChange={setGoalFilter}>
            <SelectTrigger className="w-full sm:w-[180px] min-h-[44px] sm:min-h-0">
              <SelectValue placeholder="เป้าหมาย" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              <SelectItem value="ลดน้ำหนัก">ลดน้ำหนัก</SelectItem>
              <SelectItem value="เพิ่มกล้ามเนื้อ">เพิ่มกล้ามเนื้อ</SelectItem>
              <SelectItem value="เพิ่มความแข็งแรง">เพิ่มความแข็งแรง</SelectItem>
              <SelectItem value="สุขภาพทั่วไป">สุขภาพทั่วไป</SelectItem>
            </SelectContent>
          </Select>

          {/* Quick stats — hidden on mobile (shown inline), full on sm+ */}
          <div className="hidden sm:flex items-center gap-3 ml-auto flex-wrap">
            <StatDot
              color="bg-green-500"
              label="Active"
              count={activeClients}
              textColor="text-green-600"
            />
            <StatDot
              color="bg-yellow-500"
              label="Paused"
              count={pausedClients}
            />
            <StatDot color="bg-gray-400" label="Stop" count={inactiveClients} />
          </div>
        </div>

        {/* Mobile inline stats bar (compact) */}
        <div className="flex sm:hidden items-center gap-3 mt-1.5 text-xs">
          <span className="text-muted-foreground">รวม {clients.length} คน</span>
          <span className="text-green-600 font-medium">
            ● {activeClients} active
          </span>
          {pausedClients > 0 && (
            <span className="text-yellow-600 font-medium">
              ● {pausedClients} paused
            </span>
          )}
          {filteredClients.length !== clients.length && (
            <span className="text-muted-foreground ml-auto">
              แสดง {filteredClients.length}
            </span>
          )}
        </div>
      </CardHeader>

      {/* ─────────────────────────────────────────
          MOBILE CARD VIEW  (< sm = 640px)
          Stacked tappable cards, 44px min touch targets
      ───────────────────────────────────────── */}
      <CardContent className="sm:hidden px-3 pb-4">
        {filteredClients.length === 0 ? (
          <EmptyState hasFilter={!!searchTerm || hasActiveFilter} />
        ) : (
          <div className="space-y-2.5">
            {filteredClients.map((client) => {
              const nextSession = getNextSession(client.id);
              const statusBadge = getStatusBadge(client.status);
              return (
                <div
                  key={client.id}
                  className="bg-muted/30 border rounded-xl overflow-hidden"
                >
                  {/* Tap area → profile */}
                  <Link
                    to={`/trainer/clients/${client.id}`}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-11 w-11 flex-shrink-0">
                      <AvatarImage src={client.avatar_url} alt={client.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                        {client.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {client.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {client.email}
                      </p>
                    </div>
                    {/* Status badge inline on far right */}
                    <Badge
                      variant={statusBadge.variant}
                      className="text-[10px] px-1.5 flex-shrink-0"
                    >
                      {statusBadge.label}
                    </Badge>
                  </Link>

                  {/* Bottom row: goal + next session + action */}
                  <div className="flex items-center gap-2 px-3 pb-2.5 pt-0">
                    <Badge variant="outline" className="text-[10px] px-1.5">
                      {client.goal || "—"}
                    </Badge>
                    {nextSession ? (
                      <div className="flex items-center gap-1 text-[10px] text-orange-600 ml-1 flex-1 min-w-0">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{nextSession}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground ml-1 flex-1">
                        ไม่มีนัด
                      </span>
                    )}
                    {/* Action menu — 44px touch target */}
                    <ClientActionMenu
                      clientId={client.id}
                      onDelete={() => {
                        setClientToDelete(client.id);
                        setDeleteDialogOpen(true);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* ─────────────────────────────────────────
          DESKTOP TABLE VIEW  (>= sm = 640px)
          Full table with overflow scroll wrapper
      ───────────────────────────────────────── */}
      <CardContent className="hidden sm:block px-4 sm:px-6">
        <div className="table-responsive rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ลูกเทรน</TableHead>
                <TableHead>เป้าหมาย</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>นัดถัดไป</TableHead>
                <TableHead className="text-right w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-10 text-muted-foreground"
                  >
                    <EmptyState
                      hasFilter={!!searchTerm || hasActiveFilter}
                      inline
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => {
                  const nextSession = getNextSession(client.id);
                  const statusBadge = getStatusBadge(client.status);
                  return (
                    <TableRow key={client.id} className="hover:bg-muted/50">
                      {/* Name + email + avatar */}
                      <TableCell>
                        <Link
                          to={`/trainer/clients/${client.id}`}
                          className="flex items-center gap-3 hover:text-primary transition-colors group"
                        >
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage
                              src={client.avatar_url}
                              alt={client.name}
                            />
                            <AvatarFallback className="text-sm">
                              {client.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium group-hover:underline">
                              {client.name}
                            </p>
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {client.email}
                            </p>
                          </div>
                        </Link>
                      </TableCell>

                      {/* Goal */}
                      <TableCell>
                        <Badge variant="outline" className="whitespace-nowrap">
                          {client.goal}
                        </Badge>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge variant={statusBadge.variant}>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>

                      {/* Next session */}
                      <TableCell>
                        {nextSession ? (
                          <div className="flex items-center gap-1.5 text-sm text-orange-600">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            {nextSession}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            ไม่มีนัด
                          </span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <ClientActionMenu
                          clientId={client.id}
                          onDelete={() => {
                            setClientToDelete(client.id);
                            setDeleteDialogOpen(true);
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* ─────────────────────────────────────────
          Delete Confirmation Dialog
          Mobile-safe width
      ───────────────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent
          className="w-[calc(100%-2rem)] max-w-sm sm:max-w-md"
          aria-describedby="delete-client-description"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription id="delete-client-description">
              คุณแน่ใจหรือไม่ว่าต้องการลบ "
              {clients.find((c) => c.id === clientToDelete)?.name ??
                "ลูกเทรนคนนี้"}
              "? การดำเนินการนี้ไม่สามารถยกเลิกได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="min-h-[44px] sm:min-h-0">
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (clientToDelete) {
                  handleDeleteClient(clientToDelete);
                  setClientToDelete(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white min-h-[44px] sm:min-h-0"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/* ─────────────────────────────────────────
   Sub-components (co-located for clarity)
───────────────────────────────────────── */

/** Small inline stat dot with label and count */
function StatDot({
  color,
  label,
  count,
  textColor = "text-foreground",
}: {
  color: string;
  label: string;
  count: number;
  textColor?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-muted-foreground">{label}:</span>
      <span className={`font-semibold ${textColor}`}>{count}</span>
    </div>
  );
}

/** Reusable action menu for a client row */
function ClientActionMenu({
  clientId,
  onDelete,
}: {
  clientId: number;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="min-h-[44px] min-w-[44px]"
          aria-label="เมนูตัวเลือก"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <Link
            to={`/trainer/clients/${clientId}`}
            className="flex items-center"
          >
            <Edit className="mr-2 h-4 w-4" />
            แก้ไขข้อมูล
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to={`/trainer/calendar?client=${clientId}`}
            className="flex items-center"
          >
            <Calendar className="mr-2 h-4 w-4" />
            จัดตารางเวลา
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
          onSelect={onDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          ลบลูกเทรน
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Empty state display */
function EmptyState({
  hasFilter,
  inline = false,
}: {
  hasFilter: boolean;
  inline?: boolean;
}) {
  if (inline) {
    return (
      <span>
        {hasFilter
          ? "ไม่พบข้อมูลที่ค้นหา"
          : 'ยังไม่มีลูกเทรน คลิก "เพิ่มลูกเทรน" เพื่อเริ่มต้น'}
      </span>
    );
  }
  return (
    <div className="text-center py-10 text-muted-foreground text-sm px-4">
      {hasFilter
        ? "ไม่พบข้อมูลที่ค้นหา ลองเปลี่ยนคำค้นหาหรือ filter"
        : 'ยังไม่มีลูกเทรน กด "เพิ่มลูกเทรน" เพื่อเริ่มต้น'}
    </div>
  );
}
