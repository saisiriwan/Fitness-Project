import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import fitnessBg from "@/assets/fitness-bg.jpg";
import fitnessLogo from "@/assets/fitness-logo.png";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/components/page/Trainer/AuthContext";
import { getApiBaseUrl } from "@/lib/api";

const SignIn = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  /* ฟังก์ชัน: handleSubmit
     ใช้สำหรับ: ฟอร์ม Login/Register
     หน้าที่: ส่ง email+password ไป API เพื่อ login หรือ register */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // ป้องกันหน้า reload
    setLoading(true);

    try {
      if (isLogin) {
        // === ล็อกอิน (Trainer) ===
        await api.post("/auth/login", {
          email,
          password,
        });
        toast.success("เข้าสู่ระบบสำเร็จ");
        await checkAuth(); // เช็คสถานะใหม่ → AuthContext จะ redirect ไปหน้า dashboard
      } else {
        // === สมัครสมาชิก (Trainer) ===
        await api.post("/auth/register", {
          username: email.split("@")[0], // ใช้ส่วนหน้า email เป็น username
          firstName: firstName,
          lastName: lastName,
          email,
          password,
          role: "trainer", // ลงทะเบียนเป็น trainer
        });
        toast.success("สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ");
        setIsLogin(true); // สลับไปโหมด login
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      const msg = err.response?.data?.error || "เกิดข้อผิดพลาด กรุณาลองใหม่";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ฟังก์ชัน: handleGoogleLogin
     ใช้สำหรับ: ปุ่ม "Sign in with Google"
     หน้าที่: redirect ไปหน้า Google OAuth (backend จัดการ callback) */
  const handleGoogleLogin = () => {
    // 💥 [CRITICAL FIX FOR ANDROID EMULATOR] 💥
    // บังคับให้หน้าจอ Login ของ Google เปิดผ่าน "localhost" หรือ 10.0.2.2 แบบไดนามิก!
    // เพราะ Google Cloud Console ยอมรับตามสภาพแวดล้อม
    const baseURL = getApiBaseUrl();

    // redirect ไปยัง backend route ที่จัดการ Google OAuth + ส่ง role=trainer
    window.location.href = `${baseURL}/auth/google/login?role=trainer`;
  };

  return (
    <div className="min-h-screen flex">
      {/* -------------------------------------------------------
        🎨 Left Side - Brand (ปรับดีไซน์เป็นสไตล์ Client: สีน้ำเงิน/ส้ม) 
        -------------------------------------------------------
      */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${fitnessBg})` }}
        />
        {/* ✅ ใช้สี Hardcode: น้ำเงินเข้ม -> ส้ม (เหมือน Client) เพื่อทับ Theme เดิม */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#002140] via-[#003d75] to-[#FF6B35] opacity-90" />

        <div className="relative z-10 flex flex-col justify-center h-full p-12 text-white w-full">
          <div className="absolute top-12 left-12 flex items-center gap-3">
            <img
              src={fitnessLogo}
              alt="FitPro Logo"
              className="h-12 w-12 brightness-200"
            />{" "}
            {/* ปรับโลโก้ให้สว่าง */}
            <div>
              <h2 className="text-xl font-bold">FitPro Trainer</h2>
              <p className="text-xs text-blue-100 opacity-90">
                แพลตฟอร์มสำหรับเทรนเนอร์
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-bold leading-tight">
              จัดการและติดตามผลการฝึก
              <br />
              สำหรับเทรนเนอร์
            </h1>
            <p className="text-lg text-blue-100 opacity-90">
              แพลตฟอร์มที่ช่วยให้เทรนเนอร์สามารถจัดการและติดตามผลการฝึกของลูกเทรน
            </p>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------
        📝 Right Side - Form (ปรับ UI ให้ดูสะอาดเหมือน Client)
        -------------------------------------------------------
      */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        {" "}
        {/* พื้นหลังสีอ่อน */}
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-4xl font-bold text-slate-900">
              {isLogin ? "ยินดีต้อนรับ" : "สมัครสมาชิกเทรนเนอร์"}
            </h2>
            <p className="text-slate-500">
              {isLogin ? "ยังไม่มีบัญชี?" : "มีบัญชีอยู่แล้ว?"}{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-[#FF6B35] hover:text-[#e55a2b] font-medium transition-colors"
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
                  className="bg-white border-slate-200 focus:ring-[#003d75]"
                  required
                />
                <Input
                  type="text"
                  placeholder="นามสกุล"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-white border-slate-200 focus:ring-[#003d75]"
                  required
                />
              </div>
            )}

            <Input
              type="email"
              placeholder="อีเมล (name@example.com)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white border-slate-200 focus:ring-[#003d75]"
              required
            />

            <Input
              type="password"
              placeholder="รหัสผ่าน"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white border-slate-200 focus:ring-[#003d75]"
              required
            />

            {!isLogin && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreeToTerms}
                  onCheckedChange={(c) => setAgreeToTerms(c === true)}
                  className="border-slate-300 data-[state=checked]:bg-[#FF6B35] data-[state=checked]:border-[#FF6B35]"
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-slate-500 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  ฉันยอมรับเงื่อนไขการใช้งาน
                </label>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-semibold py-6 text-lg shadow-sm hover:shadow-md transition-all"
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
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-50 px-2 text-slate-400">
                หรือเข้าสู่ระบบด้วย
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full bg-white hover:bg-slate-50 border-slate-200 py-6 text-slate-700"
              onClick={handleGoogleLogin}
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
        </div>
      </div>
    </div>
  );
};

export default SignIn;
