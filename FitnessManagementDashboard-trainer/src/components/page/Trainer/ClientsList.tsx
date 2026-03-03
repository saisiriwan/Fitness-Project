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
} from "lucide-react";

export default function ClientsList() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<any[]>([]); // Using any for session for now or define minimal interface
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [goalFilter, setGoalFilter] = useState("all");
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Only fetch clients - sessions endpoint doesn't exist
      // Sessions are fetched per-client via /clients/:id/sessions if needed
      // Only fetch future/recent schedules to optimize performance
      const startDate = new Date().toISOString().split("T")[0]; // From today
      const [clientsRes, sessionsRes] = await Promise.all([
        api.get("/clients"),
        api.get(`/schedules?start_date=${startDate}`),
      ]);
      const clientsData = clientsRes.data || [];
      const normalizedClients = clientsData.map((client: any) => ({
        ...client,
        status: client.status ? client.status.toLowerCase() : "active",
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

  // Listen for query params to trigger actions (e.g. from CommandPalette)
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("action") === "new-client") {
      setShowNewClientModal(true);
      // Clean up URL without refreshing
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  useEffect(() => {
    fetchData();
  }, []);

  // Filter clients
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

  // Calculate stats
  const activeClients = clients.filter((c) => c.status === "active").length;
  const pausedClients = clients.filter((c) => c.status === "paused").length;
  const inactiveClients = clients.filter((c) => c.status === "inactive").length;

  const getNextSession = (clientId: number) => {
    const nextSession = sessions
      .filter(
        (session) =>
          session.client_id === clientId && session.status === "scheduled",
      )
      .sort(
        (a: any, b: any) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      )[0];

    if (!nextSession) return null;

    return new Date(nextSession.start_time).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleNewClient = (clientId: string) => {
    setShowNewClientModal(false);
    navigate(`/trainer/clients/${clientId}`); // Fixed path
    fetchData(); // Refresh list
  };

  const handleDeleteClient = async (clientId: number) => {
    try {
      await api.delete(`/clients/${clientId}`);
      toast.success("ลบลูกเทรนเรียบร้อยแล้ว");
      fetchData(); // Refresh
    } catch (err) {
      console.error(err);
      toast.error("ลบลูกเทรนไม่สำเร็จ");
    }
  };

  const getStatusBadge = (status: string) => {
    // Default to 'active' if status is missing or empty
    const normalizedStatus = status ? status.toLowerCase() : "active";

    const statusMap = {
      active: {
        label: "กำลังออกกำลัง",
        variant: "default" as const,
      },
      paused: {
        label: "พักชั่วคราว",
        variant: "secondary" as const,
      },
      inactive: {
        label: "เลิกเทรน",
        variant: "outline" as const,
      },
    };

    return (
      statusMap[normalizedStatus as keyof typeof statusMap] || {
        label: status || "กำลังออกกำลัง", // Fallback text
        variant: "default" as const, // Fallback variant
      }
    );
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900"></div>
      </div>
    );
  }

  return (
    <Card>
      {/* Clean Header */}
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="ค้นหาชื่อ หรือ อีเมล..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 mr-2"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={goalFilter} onValueChange={setGoalFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="เป้าหมาย" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="ลดน้ำหนัก">ลดน้ำหนัก</SelectItem>
                <SelectItem value="เพิ่มกล้ามเนื้อ">เพิ่มกล้ามเนื้อ</SelectItem>
                <SelectItem value="เพิ่มความแข็งแรง">
                  เพิ่มความแข็งแรง
                </SelectItem>
                <SelectItem value="สุขภาพทั่วไป">สุขภาพทั่วไป</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats + Add Button */}
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            {/* Stats Inline */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">Active:</span>
                <span className="text-sm font-semibold text-green-600">
                  {activeClients}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">Paused:</span>
                <span className="text-sm font-semibold">{pausedClients}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-sm text-muted-foreground">Stop:</span>
                <span className="text-sm font-semibold">{inactiveClients}</span>
              </div>
            </div>

            {/* Add Button */}
            <div className="flex gap-2">
              <Dialog
                open={showNewClientModal}
                onOpenChange={setShowNewClientModal}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="default"
                    className="flex items-center gap-2 whitespace-nowrap bg-navy-900 text-white hover:bg-navy-800"
                  >
                    <Plus className="h-4 w-4" />
                    เพิ่มลูกเทรน
                  </Button>
                </DialogTrigger>
                <DialogContent
                  className="max-w-md"
                  aria-describedby="new-client-manual-description"
                >
                  <DialogHeader>
                    <DialogTitle>เพิ่มลูกเทรนใหม่</DialogTitle>
                    <DialogDescription id="new-client-manual-description">
                      กรอกข้อมูลพื้นฐาน
                      ระบบจะแจ้งเตือนหากชื่อซ้ำกับลูกเทรนที่มีอยู่
                    </DialogDescription>
                  </DialogHeader>
                  <NewClientModal
                    onClientCreated={handleNewClient}
                    existingClients={clients}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Clients Table */}
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ลูกเทรน</TableHead>
                <TableHead>เป้าหมาย</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>นัดถัดไป</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {searchTerm ||
                    statusFilter !== "all" ||
                    goalFilter !== "all"
                      ? "ไม่พบข้อมูลที่ค้นหา"
                      : 'ยังไม่มีลูกเทรน คลิก "เพิ่มลูกเทรน" เพื่อเริ่มต้น'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => {
                  const nextSession = getNextSession(client.id);
                  const statusBadge = getStatusBadge(client.status);

                  return (
                    <TableRow key={client.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Link
                          to={`/trainer/clients/${client.id}`}
                          className="flex items-center gap-3 hover:text-primary transition-colors"
                        >
                          <Avatar className="h-10 w-10">
                            {/* Assuming API might not return avatar yet, or define fallback */}
                            <AvatarImage
                              src={client.avatar_url}
                              alt={client.name}
                            />
                            <AvatarFallback>
                              {client.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {client.email}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{client.goal}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadge.variant}>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {nextSession ? (
                          <div className="flex items-center gap-1 text-sm text-orange-600">
                            <Calendar className="h-4 w-4" />
                            {nextSession}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            ไม่มีนัด
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/trainer/clients/${client.id}`}>
                                <Edit className="mr-2 h-4 w-4" />
                                แก้ไขข้อมูล
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                to={`/trainer/calendar?client=${client.id}`}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                จัดตารางเวลา
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onSelect={() => {
                                setClientToDelete(client.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              ลบลูกเทรน
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent aria-describedby="delete-client-alert-description">
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription id="delete-client-alert-description">
              คุณแน่ใจหรือไม่ว่าต้องการลบ "
              {clients.find((c) => c.id === clientToDelete)?.name ||
                "ลูกเทรนคนนี้"}
              "? การดำเนินการนี้ไม่สามารถยกเลิกได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (clientToDelete) {
                  handleDeleteClient(clientToDelete);
                  setClientToDelete(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
