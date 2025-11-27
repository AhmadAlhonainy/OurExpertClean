import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiGoogle } from "react-icons/si";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function SignIn() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Sign In form state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);
  
  // Sign Up form state
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");
  const [signUpRole, setSignUpRole] = useState("learner");
  const [signUpLoading, setSignUpLoading] = useState(false);
  
  // Google auth state
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const { toast } = useToast();
  
  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  const handleGoogleAuth = () => {
    console.log("🔐 بدء عملية تسجيل الدخول عبر Google...");
    setGoogleLoading(true);
    window.location.href = "/api/login";
  };

  // ⚠️ TESTING MODE: Email-only login - RESTORE PASSWORD CHECK BEFORE PRODUCTION!
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signInEmail) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال البريد الإلكتروني",
        variant: "destructive",
      });
      return;
    }

    setSignInLoading(true);
    try {
      const response = await fetch("/api/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signInEmail }),
      });

      if (response.ok) {
        toast({
          title: "تم",
          description: "تم تسجيل الدخول بنجاح",
        });
        setLocation("/");
      } else {
        const data = await response.json();
        toast({
          title: "خطأ",
          description: data.message || "بيانات الدخول غير صحيحة",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Sign in error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في الاتصال بالخادم",
        variant: "destructive",
      });
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signUpName || !signUpEmail || !signUpPassword || !signUpConfirmPassword) {
      toast({
        title: "خطأ",
        description: "الرجاء ملء جميع الحقول",
        variant: "destructive",
      });
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      toast({
        title: "خطأ",
        description: "كلمات المرور غير متطابقة",
        variant: "destructive",
      });
      return;
    }

    if (signUpPassword.length < 6) {
      toast({
        title: "خطأ",
        description: "يجب أن تكون كلمة المرور 6 أحرف على الأقل",
        variant: "destructive",
      });
      return;
    }

    setSignUpLoading(true);
    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signUpName,
          email: signUpEmail,
          password: signUpPassword,
          role: signUpRole,
        }),
      });

      if (response.ok) {
        toast({
          title: "تم",
          description: "تم إنشاء الحساب بنجاح، جاري تسجيل الدخول...",
        });
        setLocation("/");
      } else {
        const data = await response.json();
        toast({
          title: "خطأ",
          description: data.message || "فشل إنشاء الحساب",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Sign up error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في الاتصال بالخادم",
        variant: "destructive",
      });
    } finally {
      setSignUpLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary rounded-md flex items-center justify-center mb-2">
            <span className="text-primary-foreground font-bold text-2xl">خ</span>
          </div>
          <CardTitle className="text-2xl" style={{ fontFamily: 'Sora' }}>
            منصة الخبرات
          </CardTitle>
          <CardDescription>
            سجّل دخولك أو أنشئ حساباً جديداً
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin" data-testid="tab-signin">
                تسجيل دخول
              </TabsTrigger>
              <TabsTrigger value="signup" data-testid="tab-signup">
                إنشاء حساب
              </TabsTrigger>
            </TabsList>

            {/* Sign In Tab - TESTING MODE: Email only */}
            <TabsContent value="signin" className="space-y-4 mt-4">
              {/* ⚠️ Testing Mode Notice */}
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm">
                <p className="text-yellow-800 dark:text-yellow-200 text-center">
                  <strong>وضع الاختبار:</strong> تسجيل الدخول بالبريد الإلكتروني فقط
                </p>
              </div>
              
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">البريد الإلكتروني</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    disabled={signInLoading || googleLoading}
                    data-testid="input-signin-email"
                    className="text-right"
                  />
                </div>

                {/* Password field hidden for testing - RESTORE BEFORE PRODUCTION! */}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={signInLoading || googleLoading}
                  data-testid="button-signin-submit"
                >
                  {signInLoading ? (
                    <>
                      <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                      <span>جاري التسجيل...</span>
                    </>
                  ) : (
                    "تسجيل دخول"
                  )}
                </Button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">أو</span>
                </div>
              </div>

              <Button
                className="w-full bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700"
                size="lg"
                onClick={handleGoogleAuth}
                disabled={signInLoading || googleLoading}
                data-testid="button-google-signin"
              >
                {googleLoading ? (
                  <>
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                    <span>جاري التحويل...</span>
                  </>
                ) : (
                  <>
                    <SiGoogle className="ml-2 h-5 w-5 text-[#4285F4]" />
                    <span>Google</span>
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Sign Up Tab */}
            <TabsContent value="signup" className="space-y-4 mt-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">الاسم الكامل</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="أحمد محمد"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    disabled={signUpLoading}
                    data-testid="input-signup-name"
                    className="text-right"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">البريد الإلكتروني</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    disabled={signUpLoading}
                    data-testid="input-signup-email"
                    className="text-right"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-role">نوع الحساب</Label>
                  <Select value={signUpRole} onValueChange={setSignUpRole} disabled={signUpLoading}>
                    <SelectTrigger id="signup-role" data-testid="select-signup-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="learner">متعلم</SelectItem>
                      <SelectItem value="mentor">مرشد/مستشار</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">كلمة المرور</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    disabled={signUpLoading}
                    data-testid="input-signup-password"
                    className="text-right"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">تأكيد كلمة المرور</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={signUpConfirmPassword}
                    onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                    disabled={signUpLoading}
                    data-testid="input-signup-confirm-password"
                    className="text-right"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={signUpLoading}
                  data-testid="button-signup-submit"
                >
                  {signUpLoading ? (
                    <>
                      <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                      <span>جاري الإنشاء...</span>
                    </>
                  ) : (
                    "إنشاء حساب"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 text-sm mt-4">
            <p className="text-blue-900 dark:text-blue-100 text-center">
              <strong>ملاحظة:</strong> إذا كنت مسؤولاً، ستحصل على الصلاحيات تلقائياً بمجرد تسجيل الدخول
            </p>
          </div>

          <div className="pt-4 border-t mt-4">
            <p className="text-xs text-center text-muted-foreground">
              بتسجيل دخولك، أنت توافق على{" "}
              <a href="/terms" className="text-primary hover:underline">
                شروط الخدمة
              </a>{" "}
              و{" "}
              <a href="/privacy" className="text-primary hover:underline">
                سياسة الخصوصية
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
