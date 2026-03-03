import { useState, useEffect } from "react";
import api from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "src/components/ui/alert-dialog";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import { Textarea } from "src/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";
import { toast } from "sonner";

interface ClientData {
  id: string | number;
  name: string;
  email?: string;
  phone?: string;
  goal?: string;
  injuries?: string;
  gender?: string;
  weight?: number;
  height?: number;
  medicalConditions?: string;
  avatar?: string;
  status?: string;
  joinDate?: string;
  targetWeight?: number;
  targetDate?: string;
}

interface EditClientModalProps {
  client: ClientData;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EditClientModal({
  client,
  onSuccess,
  onCancel,
}: EditClientModalProps) {
  const [loading, setLoading] = useState(false);
  const [existingClients, setExistingClients] = useState<
    { id: string; name: string }[]
  >([]);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);

  const PREDEFINED_GOALS = [
    "ลดน้ำหนัก",
    "เพิ่มกล้ามเนื้อ",
    "เพิ่มความแข็งแรง",
    "สุขภาพทั่วไป",
  ];

  const [isCustomGoal, setIsCustomGoal] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    goal: "",
    notes: "",
    gender: "",
    weight: "",
    height: "",
    status: "",
    targetWeight: "",
    targetDate: "",
  });

  useEffect(() => {
    // Fetch existing clients for duplicate check
    const fetchClients = async () => {
      try {
        const res = await api.get("/clients");
        const data = res.data || [];
        setExistingClients(
          data.map((c: any) => ({ id: c.id.toString(), name: c.name })),
        );
      } catch (err) {
        console.error("Failed to fetch clients list", err);
      }
    };
    fetchClients();
  }, []);

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        email: client.email || "",
        phone: client.phone || "",
        goal: client.goal || "",
        notes: client.injuries || "",
        gender: client.gender || "",
        weight: client.weight?.toString() || "",
        height: client.height?.toString() || "",
        status: client.status || "active",
        targetWeight: client.targetWeight?.toString() || "",
        targetDate: client.targetDate
          ? new Date(client.targetDate).toISOString().split("T")[0]
          : "",
      });

      // Check if goal is custom
      if (client.goal && !PREDEFINED_GOALS.includes(client.goal)) {
        setIsCustomGoal(true);
      } else {
        setIsCustomGoal(false);
      }
    }
  }, [client]);

  /* ฟังก์ชัน: handleGoalChange — จัดการเป้าหมาย (preset หรือ custom) */
  const handleGoalChange = (value: string) => {
    if (value === "other") {
      setIsCustomGoal(true); // เปิดให้พิมพ์เอง
      handleChange("goal", ""); // ล้างค่าเดิม
    } else {
      setIsCustomGoal(false);
      handleChange("goal", value); // ใช้ค่า preset
    }
  };

  /* ฟังก์ชัน: handleChange — อัปเดต formData ตาม field name */
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  /* ฟังก์ชัน: formatTargetDate — แปลงวันที่ YYYY-MM-DD จาก input → RFC3339 string (เทียงคืน) */
  const formatTargetDate = (dateStr: string) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    // Use toRFC3339String or manual ISO with offset if needed.
    // Since we don't import toRFC3339String here (to avoid changing imports if not necessary),
    // we can use a simple trick or import it if avail.
    // Let's assume we want to strictly follow the pattern used elsewhere.
    // But since I verified utils.ts has toRFC3339String, I should use it.
    // I need to add import first.
    // For now, let's use the manual construction to be safe within this function scope or just use ISO string of the local date.
    const pad = (n: number) => (n < 10 ? "0" + n : n);
    const timezoneOffset = -date.getTimezoneOffset();
    const diff = timezoneOffset >= 0 ? "+" : "-";
    const absOffset = Math.abs(timezoneOffset);
    const hoursOffset = Math.floor(absOffset / 60);
    const minutesOffset = absOffset % 60;

    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate()) +
      "T" +
      "00:00:00" + // Default to Start of Day
      diff +
      pad(hoursOffset) +
      ":" +
      pad(minutesOffset)
    );
  };

  /* ฟังก์ชัน: submitData — ส่งข้อมูลแก้ไขไป API (PUT) */
  const submitData = async () => {
    try {
      setLoading(true);
      // สร้าง payload ตามโครงสร้างที่ backend คาดหวัง
      const payload = {
        name: formData.name,
        email: formData.email,
        phone_number: formData.phone,
        goal: formData.goal,
        weight_kg: formData.weight ? parseFloat(formData.weight) : 0,
        height_cm: formData.height ? parseFloat(formData.height) : 0,
        target_weight: formData.targetWeight
          ? parseFloat(formData.targetWeight)
          : null,
        target_date: formatTargetDate(formData.targetDate),
        gender: formData.gender || "Not Specified",
        injuries: formData.notes, // UI "หมายเหตุ" → เก็บใน injuries
        notes: (client as any).notes || "", // เก็บ notes เดิมไว้
        medical_conditions: client.medicalConditions || "",
        avatar_url: client.avatar,
        status: formData.status,
        join_date: client.joinDate,
      };

      await api.put(`/clients/${client.id}`, payload); // PUT อัปเดต
      toast.success("แก้ไขข้อมูลเรียบร้อยแล้ว");
      onSuccess(); // callback ปิด modal + reload
    } catch (err: any) {
      console.error("Error updating client:", err);
      toast.error(
        err.response?.data?.error || "เกิดข้อผิดพลาดในการแก้ไขข้อมูล",
      );
    } finally {
      setLoading(false);
      setShowDuplicateAlert(false);
    }
  };

  /* ฟังก์ชัน: handleSubmit — ตรวจสอบฟอร์ม + เช็คชื่อซ้ำ ก่อนส่ง */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validation: ต้องมีชื่อ + email
    if (!formData.name || !formData.email) {
      toast.error("กรุณากรอกข้อมูลที่จำเป็น (ชื่อ, อีเมล)");
      return;
    }
    // เช็คชื่อซ้ำ (ยกเว้นตัวเอง)
    const isDuplicate = existingClients.some(
      (c) =>
        c.name.toLowerCase() === formData.name.toLowerCase() &&
        c.id !== client.id.toString(),
    );
    if (isDuplicate) {
      setShowDuplicateAlert(true); // แสดง alert ชื่อซ้ำ
      return;
    }
    await submitData(); // ส่งข้อมูล
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">ชื่อ *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="กรอกชื่อลูกเทรน"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">อีเมล *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="กรอกอีเมล"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="08x-xxx-xxxx"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">เพศ</Label>
            <Select
              value={formData.gender}
              onValueChange={(value) => handleChange("gender", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="ระบุเพศ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">ชาย</SelectItem>
                <SelectItem value="Female">หญิง</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="weight">น้ำหนัก (kg)</Label>
            <Input
              id="weight"
              type="number"
              value={formData.weight}
              onChange={(e) => handleChange("weight", e.target.value)}
              placeholder="เช่น 60"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">ส่วนสูง (cm)</Label>
            <Input
              id="height"
              type="number"
              value={formData.height}
              onChange={(e) => handleChange("height", e.target.value)}
              placeholder="เช่น 170"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="goal">เป้าหมาย</Label>
          <Select
            value={
              isCustomGoal
                ? "other"
                : PREDEFINED_GOALS.includes(formData.goal)
                  ? formData.goal
                  : formData.goal
                    ? "other"
                    : ""
            }
            onValueChange={handleGoalChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกเป้าหมาย" />
            </SelectTrigger>
            <SelectContent>
              {PREDEFINED_GOALS.map((goal) => (
                <SelectItem key={goal} value={goal}>
                  {goal}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isCustomGoal && (
            <Input
              className="mt-2"
              placeholder="ระบุเป้าหมาย..."
              value={formData.goal}
              onChange={(e) => handleChange("goal", e.target.value)}
              autoFocus
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">สถานะ</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => handleChange("status", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกสถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active (กำลังเทรน)</SelectItem>
              <SelectItem value="paused">Paused (พักชั่วคราว)</SelectItem>
              <SelectItem value="inactive">Inactive (เลิกเทรน)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">หมายเหตุ / อาการบาดเจ็บ</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="ข้อมูลเพิ่มเติม เช่น ประวัติการบาดเจ็บ"
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            ยกเลิก
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-navy-900 text-white hover:bg-navy-800"
          >
            {loading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
          </Button>
        </div>
      </form>

      <AlertDialog
        open={showDuplicateAlert}
        onOpenChange={setShowDuplicateAlert}
      >
        <AlertDialogContent aria-describedby="duplicate-client-description">
          <AlertDialogHeader>
            <AlertDialogTitle>พบรายชื่อซ้ำในระบบ</AlertDialogTitle>
            <AlertDialogDescription id="duplicate-client-description">
              มีลูกเทรนชื่อ "{formData.name}" อยู่ในระบบแล้ว
              <br />
              หากเป็นคนเดียวกัน แนะนำให้ใช้ชื่อเดิม หรือเติม (2)
              ต่อท้ายหากเป็นคนละคน
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>กลับไปแก้ไข</AlertDialogCancel>
            <AlertDialogAction onClick={submitData}>
              ยืนยัน (บันทึก)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
