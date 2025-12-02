import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, ArrowRight } from "lucide-react";
import BackButton from "@/components/BackButton";
import { useLocation } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال البريد الإلكتروني",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        toast({
          title: "تم",
          description: data.message,
        });
      } else {
        toast({
          title: "خطأ",
          description: data.message || "حدث خطأ. يرجى المحاولة لاحقاً",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في الاتصال بالخادم",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4" dir="rtl">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-xl font-semibold">تحقق من بريدك الإلكتروني</h2>
              <p className="text-muted-foreground">
                إذا كان البريد الإلكتروني مسجلاً لدينا، ستتلقى رابط لإعادة تعيين كلمة المرور خلال دقائق.
              </p>
              <p className="text-sm text-muted-foreground">
                تأكد من فحص مجلد الرسائل غير المرغوب فيها (Spam)
              </p>
              <Button onClick={() => setLocation("/signin")} className="w-full" data-testid="button-back-signin">
                العودة لتسجيل الدخول
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <div className="mb-4">
          <BackButton />
        </div>
        
        <Card>
          <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary rounded-md flex items-center justify-center mb-2">
            <span className="text-primary-foreground font-bold text-2xl">خ</span>
          </div>
          <CardTitle className="text-2xl" style={{ fontFamily: 'Sora' }}>
            نسيت كلمة المرور؟
          </CardTitle>
          <CardDescription>
            أدخل بريدك الإلكتروني وسنرسل لك رابط لإعادة تعيين كلمة المرور
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                data-testid="input-forgot-email"
                className="text-right"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
              data-testid="button-forgot-submit"
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  <span>جاري الإرسال...</span>
                </>
              ) : (
                "إرسال رابط إعادة التعيين"
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              onClick={() => setLocation("/signin")}
              className="text-muted-foreground gap-2 hover:bg-transparent hover:underline"
              data-testid="link-back-signin"
            >
              <ArrowRight className="h-4 w-4" />
              العودة لتسجيل الدخول
            </Button>
          </div>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
