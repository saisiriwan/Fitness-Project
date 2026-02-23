import { useNavigate } from "react-router-dom";
import React, { useState, useRef, useEffect } from "react";
import { User, Camera, Mail, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "./AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Settings() {
  const { user, updateUser, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState({
    // Profile
    name: user?.name || "",
    username: user?.username || "",
    email: user?.email || "",
    phone: user?.phone_number || "",
    avatar: user?.picture || "",

    // Preferences
    language: "th",
    timezone: "Asia/Bangkok",
    weightUnit: "kg",

    // Notifications
    emailNotifications: true,
    pushNotifications: true,
    sessionReminders: true,
    clientUpdates: true,

    // Calendar
    googleCalendar: false,
    defaultSessionDuration: 60,
  });

  useEffect(() => {
    if (user) {
      const userSettings = (user.settings as any) || {};
      const notifications = userSettings.notifications || {};

      setSettings((prev) => ({
        ...prev,
        // Profile
        name: user.name || prev.name,
        username: user.username || prev.username,
        email: user.email || prev.email,
        phone: user.phone_number || prev.phone,
        avatar: user.picture || prev.avatar,

        // Preferences
        language: userSettings.language || prev.language,
        timezone: userSettings.timezone || prev.timezone,
        weightUnit: userSettings.weightUnit || prev.weightUnit,

        // Notifications
        emailNotifications:
          notifications.emailNotifications !== undefined
            ? notifications.emailNotifications
            : prev.emailNotifications,
        pushNotifications:
          notifications.pushNotifications !== undefined
            ? notifications.pushNotifications
            : prev.pushNotifications,
        sessionReminders:
          notifications.sessionReminders !== undefined
            ? notifications.sessionReminders
            : prev.sessionReminders,
        clientUpdates:
          notifications.clientUpdates !== undefined
            ? notifications.clientUpdates
            : prev.clientUpdates,

        // Calendar
        googleCalendar:
          userSettings.googleCalendar !== undefined
            ? userSettings.googleCalendar
            : prev.googleCalendar,
        defaultSessionDuration:
          userSettings.defaultSessionDuration || prev.defaultSessionDuration,
      }));
    }
  }, [user]);

  const handleSave = async () => {
    try {
      if (!user?.id) return;

      await api.put(`/users/${user.id}`, {
        name: settings.name,
        email: settings.email,
        username: settings.username,
        phone_number: settings.phone,
        settings: {
          language: settings.language,
          timezone: settings.timezone,
          weightUnit: settings.weightUnit,
          notifications: {
            emailNotifications: settings.emailNotifications,
            pushNotifications: settings.pushNotifications,
            sessionReminders: settings.sessionReminders,
            clientUpdates: settings.clientUpdates,
          },
          googleCalendar: settings.googleCalendar,
          defaultSessionDuration: settings.defaultSessionDuration,
        },
      });

      updateUser({
        name: settings.name,
        email: settings.email,
        username: settings.username,
        phone_number: settings.phone,
        settings: {
          language: settings.language,
          timezone: settings.timezone,
          weightUnit: settings.weightUnit,
          notifications: {
            emailNotifications: settings.emailNotifications,
            pushNotifications: settings.pushNotifications,
            sessionReminders: settings.sessionReminders,
            clientUpdates: settings.clientUpdates,
          },
          googleCalendar: settings.googleCalendar,
          defaultSessionDuration: settings.defaultSessionDuration,
        },
      });
      toast.success("บันทึกการตั้งค่าเรียบร้อยแล้ว");
    } catch (err) {
      console.error("Failed to save settings", err);
      toast.error("บันทึกการตั้งค่าไม่สำเร็จ");
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("ขนาดไฟล์ต้องไม่เกิน 2MB");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const toastId = toast.loading("กำลังอัปโหลดรูปโปรไฟล์...");

      const response = await api.post("/users/upload-avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const newAvatarUrl = response.data.avatar_url;
      setSettings((prev) => ({ ...prev, avatar: newAvatarUrl }));
      updateUser({ picture: newAvatarUrl });

      toast.dismiss(toastId);
      toast.success("อัปโหลดรูปโปรไฟล์เรียบร้อยแล้ว");
    } catch (err: any) {
      console.error("Upload failed", err);
      const msg = err.response?.data?.error || "อัปโหลดรูปไม่สำเร็จ";
      toast.error(msg);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleLogout = async () => {
    try {
      if (signOut) {
        await signOut();
      }
      navigate("/signin");
    } catch (err) {
      console.error("Logout failed", err);
      toast.error("ออกจากระบบไม่สำเร็จ");
    }
  };

  return (
    <div className="container mx-auto p-4 lg:p-8 max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">ตั้งค่า</h1>
        <p className="text-muted-foreground">
          จัดการข้อมูลส่วนตัวและการตั้งค่าระบบของคุณ
        </p>
      </div>

      <div className="w-full space-y-8">
        {/* Profile Section */}
        <section id="profile" className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle>โปรไฟล์</CardTitle>
              <CardDescription>
                ข้อมูลส่วนตัวที่จะแสดงให้ลูกค้าเห็น
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div
                  className="relative group cursor-pointer"
                  onClick={handleAvatarClick}
                >
                  <Avatar className="h-24 w-24 border-2 border-border group-hover:border-primary transition-colors">
                    <AvatarImage src={settings.avatar} alt={settings.name} />
                    <AvatarFallback className="text-2xl">
                      {settings.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" onClick={handleAvatarClick}>
                      เปลี่ยนรูปโปรไฟล์
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    รองรับไฟล์ JPG, PNG สูงสุด 2MB
                  </p>
                  <p className="text-sm font-medium text-muted-foreground">
                    Member since{" "}
                    {user?.created_at
                      ? format(new Date(user.created_at), "MMMM dd, yyyy")
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="username">ชื่อผู้ใช้ (Username)</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      value={settings.username}
                      onChange={(e) =>
                        handleSettingChange("username", e.target.value)
                      }
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">ชื่อ-นามสกุล</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={settings.name}
                      onChange={(e) =>
                        handleSettingChange("name", e.target.value)
                      }
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">อีเมล</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={settings.email}
                      onChange={(e) =>
                        handleSettingChange("email", e.target.value)
                      }
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={settings.phone}
                      onChange={(e) =>
                        handleSettingChange("phone", e.target.value)
                      }
                      placeholder="081-234-5678"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4">
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => window.location.reload()}>
              ยกเลิก
            </Button>
            <Button onClick={handleSave} className="min-w-[120px]">
              บันทึกการเปลี่ยนแปลง
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
