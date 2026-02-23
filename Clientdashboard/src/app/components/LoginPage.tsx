import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { ArrowRightIcon } from "lucide-react";
import fitnessBg from "@/assets/fitness-bg.jpg";
import fitnessLogo from "@/assets/fitness-logo.png";

interface LoginPageProps {
  onLogin: () => void;
  onSwitchToSignUp?: () => void;
}

import { useAuth } from "@/context/AuthContext";

export function LoginPage({ onLogin }: LoginPageProps) {
  // onLogin prop might become redundant if App listens to auth state
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // --- LOGIN ---
        await login({ email, password });
        toast.success("เข้าสู่ระบบสำเร็จ");
        // onLogin(); // Handled by AuthContext state change in App
      } else {
        // --- REGISTER ---
        const username = email.split("@")[0];
        await register({
          username,
          firstName,
          lastName,
          email,
          password,
          role: "trainee",
        });
        toast.success("สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ");
        setIsLogin(true); // Switch to login after registration
      }
    } catch (error: any) {
      console.error("Auth failed", error);
      const msg = error.message || "ดำเนินการไม่สำเร็จ กรุณาตรวจสอบข้อมูล";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Set a cookie to indicate the expected role for redirect
    document.cookie = "login_role=trainee; path=/; max-age=300"; // 5 min expiry
    window.location.href =
      "http://localhost:8080/api/v1/auth/google/login?role=trainee";
  };

  const handleGuestAccess = () => {
    console.log("Guest access requested");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Brand (Trainer Style) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${fitnessBg})` }}
        />
        {/* Updated Gradient to match Trainer: primary/90 via primary/80 to accent/90 */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/80 to-accent/90" />

        <div className="relative z-10 flex flex-col justify-center h-full p-12 text-primary-foreground w-full">
          <div className="absolute top-12 left-12 flex items-center gap-3">
            <img src={fitnessLogo} alt="Logo" className="h-12 w-12" />
            <div>
              <h2 className="text-xl font-bold">FitPro Trainee</h2>
              <p className="text-xs text-primary-foreground/80">
                เพื่อนคู่ใจในการออกกำลังกายของคุณ
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-bold leading-tight">
              เปลี่ยนคุณให้เป็นคนใหม่
              <br />
              ทั้งร่างกายและจิตใจ
            </h1>
            <p className="text-lg text-primary-foreground/90">
              ติดตามการฝึกซ้อม, ดูความก้าวหน้า,
              และบรรลุเป้าหมายของคุณด้วยคำแนะนำจากผู้เชี่ยวชาญ
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Form (Trainer Style) */}
      <div className="flex-1 flex items-center justify-center p-8 bg-muted/30">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-4xl font-bold text-foreground">
              {isLogin ? "ยินดีต้อนรับ" : "สร้างบัญชีใหม่"}
            </h2>
            <p className="text-muted-foreground">
              {isLogin ? "ยังไม่มีบัญชี?" : "มีบัญชีอยู่แล้ว?"}{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-accent hover:text-accent/80 font-medium transition-colors"
                type="button"
              >
                {isLogin ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
              </button>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="text"
                  placeholder="ชื่อจริง"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-background border-border"
                  required
                />
                <Input
                  type="text"
                  placeholder="นามสกุล"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-background border-border"
                  required
                />
              </div>
            )}

            <Input
              type="email"
              placeholder="อีเมล (name@example.com)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background border-border"
              required
            />

            <Input
              type="password"
              placeholder="รหัสผ่าน"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background border-border"
              required
            />

            {!isLogin && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreeToTerms}
                  onCheckedChange={(c: boolean | string) =>
                    setAgreeToTerms(c === true)
                  }
                  className="border-border"
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  ฉันยอมรับเงื่อนไขการใช้งาน
                </label>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-6 text-lg"
              disabled={loading || (!isLogin && !agreeToTerms)}
            >
              {loading
                ? "กำลังดำเนินการ..."
                : isLogin
                  ? "เข้าสู่ระบบ"
                  : "สมัครสมาชิก"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-muted/30 px-2 text-muted-foreground">
                หรือเข้าสู่ระบบด้วย
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full bg-background hover:bg-muted/50 border-border py-6"
              onClick={handleGoogleLogin}
              type="button"
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              เข้าสู่ระบบด้วย Google
            </Button>
          </div>

          {/* Mobile Guest Access */}
          <div className="lg:hidden text-center">
            <button
              onClick={handleGuestAccess}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2 mx-auto"
              type="button"
            ></button>
          </div>
        </div>
      </div>
    </div>
  );
}
