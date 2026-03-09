import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

interface NewClientModalProps {
  onClientCreated: (clientId: string) => void;
  existingClients?: { name: string }[];
}

export default function NewClientModal({
  onClientCreated,
  existingClients = [],
}: NewClientModalProps) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    goal: "",
    notes: "",
    gender: "",
    weight: "",
    height: "",
  });

  const PREDEFINED_GOALS = [
    "ลดน้ำหนัก",
    "เพิ่มกล้ามเนื้อ",
    "เพิ่มความแข็งแรง",
    "สุขภาพทั่วไป",
  ];

  const [isCustomGoal, setIsCustomGoal] = useState(false);

  const handleGoalChange = (value: string) => {
    if (value === "other") {
      setIsCustomGoal(true);
      handleChange("goal", ""); // Clear goal to let user type
    } else {
      setIsCustomGoal(false);
      handleChange("goal", value);
    }
  };

  const [loading, setLoading] = useState(false);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);

  const submitData = async () => {
    try {
      setLoading(true);

      const payload = {
        name: formData.name,
        email: formData.email,
        phone_number: formData.phone,
        goal: formData.goal,
        weight_kg: formData.weight ? parseFloat(formData.weight) : 0,
        height_cm: formData.height ? parseFloat(formData.height) : 0,
        gender: formData.gender || "Not Specified",
        injuries: formData.notes,
        notes: "", // Explicitly empty for now to match interface if needed
      };

      const response = await api.post("/clients", payload);

      // Check if response contains a warning (duplicate detected)
      if (response.data.warning) {
        toast.warning(response.data.message, {
          description: response.data.note,
          duration: 5000,
        });

        // Still treat as success since client exists
        if (onClientCreated) {
          onClientCreated(response.data.client?.id || response.data.id);
        } else {
          navigate(`/clients/${response.data.client?.id || response.data.id}`);
        }
      } else {
        toast.success("เพิ่มลูกเทรนใหม่เรียบร้อยแล้ว");

        if (onClientCreated) {
          onClientCreated(response.data.id);
        } else {
          navigate(`/clients/${response.data.id}`);
        }
      }
    } catch (err: any) {
      console.error("Error creating client:", err);

      const rawError: string = err.response?.data?.error ?? "";
      const status: number = err.response?.status;

      const getThaiErrorMessage = (): string => {
        if (
          status === 409 ||
          rawError.includes("duplicate key") ||
          rawError.includes("unique_email")
        ) {
          return "อีเมลนี้ถูกใช้งานแล้วในระบบ กรุณาตรวจสอบรายชื่อลูกเทรนที่มีอยู่ หรือใช้อีเมลอื่น";
        }
        if (status === 400)
          return "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบแบบฟอร์มอีกครั้ง";
        if (status === 401) return "ไม่มีสิทธิ์ดำเนินการ กรุณาเข้าสู่ระบบใหม่";
        return "เกิดข้อผิดพลาดในการเพิ่มลูกเทรน กรุณาลองใหม่อีกครั้ง";
      };

      toast.error(getThaiErrorMessage());
    } finally {
      setLoading(false);
      setShowDuplicateAlert(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.goal) {
      toast.error("กรุณากรอกข้อมูลที่จำเป็น");
      return;
    }

    // Check for duplicates
    const isDuplicate = existingClients.some(
      (c) => c.name.toLowerCase() === formData.name.toLowerCase(),
    );

    if (isDuplicate) {
      setShowDuplicateAlert(true);
      return;
    }

    await submitData();
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="new-client-form-container">
        <div className="new-client-form-group">
          <Label htmlFor="name">ชื่อลูกเทรน *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="กรอกชื่อลูกเทรน"
            required
          />
        </div>

        <div className="new-client-form-group">
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

        <div className="new-client-grid-row">
          <div className="new-client-form-group">
            <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="08x-xxx-xxxx"
            />
          </div>
          <div className="new-client-form-group">
            <Label htmlFor="gender">เพศ</Label>
            <Select onValueChange={(value) => handleChange("gender", value)}>
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

        <div className="new-client-grid-row">
          <div className="new-client-form-group">
            <Label htmlFor="weight">น้ำหนัก (kg)</Label>
            <Input
              id="weight"
              type="number"
              value={formData.weight}
              onChange={(e) => handleChange("weight", e.target.value)}
              placeholder="เช่น 60"
            />
          </div>
          <div className="new-client-form-group">
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

        <div className="new-client-form-group">
          <Label htmlFor="goal">เป้าหมาย *</Label>

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

        <div className="new-client-form-group">
          <Label htmlFor="notes">หมายเหตุ / อาการบาดเจ็บ</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="ข้อมูลเพิ่มเติม เช่น ประวัติการบาดเจ็บ อาหารที่แพ้"
            rows={3}
          />
        </div>

        <div className="new-client-form-actions">
          <Button type="submit" disabled={loading}>
            {loading ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </div>
      </form>

      <AlertDialog
        open={showDuplicateAlert}
        onOpenChange={setShowDuplicateAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>พบรายชื่อซ้ำในระบบ</AlertDialogTitle>
            <AlertDialogDescription>
              มีลูกเทรนชื่อ "{formData.name}" อยู่ในระบบแล้ว
              คุณยืนยันว่าเป็นคนละคนกันหรือไม่?
              <br />
              แนะนำ: หากชื่อซ้ำกัน ควรเติมชื่อเล่นหรือรหัสต่อท้าย เช่น "
              {formData.name} (2)"
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
