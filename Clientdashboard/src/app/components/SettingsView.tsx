import { useState, useEffect } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { User, Mail, Calendar, CheckCircle2, LogOut, Info } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { clientService, ClientProfile } from "@/services/clientService";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface SettingsViewProps {
  user?: ClientProfile | null;
  onLogout?: () => void;
}

export function SettingsView({ user, onLogout }: SettingsViewProps) {
  const navigate = useNavigate();
  const auth = useAuth();
  const logout = onLogout || auth?.logout;

  const [metricsData, setMetricsData] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadMetrics = async () => {
      if (!user?.id) return;
      try {
        const data = await clientService.getClientMetrics(user.id);
        if (data && Array.isArray(data)) {
          const sorted = [...data].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          );
          const latest: Record<string, number> = {};
          sorted.forEach((m) => {
            if (latest[m.type] === undefined) {
              latest[m.type] = m.value;
            }
          });
          setMetricsData(latest);
        }
      } catch (e) {
        console.error("Failed to load metrics", e);
      }
    };
    loadMetrics();
  }, [user?.id]);

  // Use latest metrics or fallback to user profile data
  const weight = metricsData.weight || user?.weight_kg;
  const height = metricsData.height || user?.height_cm;
  const bodyFat = metricsData.body_fat;
  const muscle = metricsData.muscle;

  const bmi =
    metricsData.bmi ||
    (weight && height ? (weight / Math.pow(height / 100, 2)).toFixed(1) : "-");

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
      }
      navigate("/login");
      toast.success("ออกจากระบบสำเร็จ");
    } catch (error) {
      console.error("Logout failed", error);
      toast.error("เกิดข้อผิดพลาดในการออกจากระบบ");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            ข้อมูลส่วนตัว
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            ดูข้อมูลบัญชีของคุณ
          </p>
        </div>
        <Button
          variant="outline"
          className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          ออกจากระบบ
        </Button>
      </div>

      {!user ? (
        <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
          ไม่พบข้อมูลผู้ใช้
        </div>
      ) : (
        <>
          {/* แจ้งเตือน: Read-Only Mode */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm text-blue-900 dark:text-blue-100 mt-0.5">
                โหมดแสดงผลเท่านั้น
              </p>
              <p className="text-sm text-blue-800/80 dark:text-blue-200/80 mt-1">
                รายละเอียดบัญชีและข้อมูลร่างกายของคุณ
                นำมาจากการวิเคราะห์และอัปเดตผ่านระบบของเทรนเนอร์
                หากต้องการเปลี่ยนแปลงข้อมูล กรุณาติดต่อเทรนเนอร์โดยตรง
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-8">
            {/* รูปโปรไฟล์และข้อมูลหลัก */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-24 h-24 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center text-white text-3xl font-bold shrink-0 overflow-hidden shadow-sm">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name || "User"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (user.name || "U").charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
                  {user.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  เป็นสมาชิกตั้งแต่{" "}
                  {user.join_date || user.created_at
                    ? (() => {
                        const d = new Date(user.join_date || user.created_at);
                        const bYear = d.getFullYear() + 543;
                        return `${format(d, "dd MMM", { locale: th })} ${bYear}`;
                      })()
                    : "-"}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge
                    variant="secondary"
                    className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-100"
                  >
                    <User className="w-3 h-3 mr-1" />
                    ลูกเทรน
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-xs bg-green-50 text-green-700 border-green-200"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    บัญชียืนยันแล้ว
                  </Badge>
                </div>
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* ข้อมูลการติดต่อ */}
            <div>
              <h4 className="font-semibold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                <Mail className="w-4 h-4 text-primary" />
                ข้อมูลติดต่อ
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">อีเมล</p>
                  <p className="font-medium text-slate-700 dark:text-slate-300">
                    {user.email || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    เบอร์โทรศัพท์
                  </p>
                  <p className="font-medium text-slate-700 dark:text-slate-300">
                    {user.phone_number || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    เทรนเนอร์ส่วนตัว
                  </p>
                  <p className="font-medium text-slate-700 dark:text-slate-300">
                    {user.trainer_name || "ไม่ระบุ"}
                  </p>
                </div>
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* ข้อมูลส่วนบุคคล (ดึงจาก ClientProgress API) */}
            <div>
              <h4 className="font-semibold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                <Calendar className="w-4 h-4 text-primary" />
                ข้อมูลส่วนบุคคล
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">ส่วนสูง</p>
                  <p className="font-medium text-lg text-slate-800 dark:text-white">
                    {height ? `${height} cm` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    น้ำหนักปัจจุบัน
                  </p>
                  <p className="font-medium text-lg text-slate-800 dark:text-white">
                    {weight ? `${weight} kg` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">BMI</p>
                  <p className="font-medium text-lg text-slate-800 dark:text-white">
                    {bmi}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    เปอร์เซ็นต์ไขมัน
                  </p>
                  <p className="font-medium text-lg text-slate-800 dark:text-white">
                    {bodyFat ? `${bodyFat} %` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    มวลกล้ามเนื้อ
                  </p>
                  <p className="font-medium text-lg text-slate-800 dark:text-white">
                    {muscle ? `${muscle} kg` : "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">เพศ</p>
                  <p className="font-medium text-slate-800 dark:text-white">
                    {user.gender || "-"}
                  </p>
                </div>
                <div className="col-span-2 md:col-span-4 mt-2">
                  <p className="text-xs text-muted-foreground mb-1">
                    เป้าหมายหลัก
                  </p>
                  <p className="font-medium text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800 inline-block px-3 py-1 rounded-md">
                    {user.goal || "เพื่อสุขภาพทั่วไป"}
                  </p>
                </div>
                <div className="col-span-2 md:col-span-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    ปัญหาสุขภาพ / อาการบาดเจ็บ
                  </p>
                  <p className="font-medium text-slate-700 dark:text-slate-300">
                    {user.injuries ||
                      user.medical_conditions ||
                      "- ไม่มีอัปเดต -"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
