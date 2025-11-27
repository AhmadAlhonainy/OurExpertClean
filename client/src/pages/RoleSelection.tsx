import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Users, Settings } from "lucide-react";
import type { User } from "@shared/schema";

export default function RoleSelection() {
  const [, navigate] = useLocation();

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  useEffect(() => {
    if (!isLoading && user) {
      // If user already has a role (not just learner by default), redirect to home
      if (user.role === 'mentor' || user.role === 'admin') {
        navigate("/");
      }
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-block">
            <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mb-4 mx-auto">
              <span className="text-primary-foreground font-bold text-3xl">خ</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold">مرحباً بك في منصة الخبرات</h1>
          <p className="text-xl text-muted-foreground">اختر دورك للبدء</p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Learner Card */}
          <Card className="relative hover-elevate cursor-pointer border-2 hover:border-primary/50 transition-all" data-testid="card-learner-role">
            <CardHeader>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Users className="h-6 w-6" />
                    متعلم
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    أبحث عن مرشد ذو خبرة
                  </CardDescription>
                </div>
                <Badge className="bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100">
                  للجميع
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">المميزات:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>ابحث عن مرشدين حسب الخبرة والتخصص</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>احجز جلسات مباشرة وآمنة</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>تقيّم المرشدين وشارك تجاربك</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>ادفع بأمان من خلال بطاقتك</span>
                  </li>
                </ul>
              </div>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => navigate("/")}
                data-testid="button-continue-learner"
              >
                متابعة كمتعلم
              </Button>
            </CardContent>
          </Card>

          {/* Advisor/Mentor Card */}
          <Card className="relative hover-elevate cursor-pointer border-2 hover:border-primary/50 transition-all" data-testid="card-advisor-role">
            <CardHeader>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Briefcase className="h-6 w-6" />
                    مرشد خبير
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    شارك خبراتك واكسب دخلاً
                  </CardDescription>
                </div>
                <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">
                  اختياري
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">المميزات:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>أنشئ ملفك الاحترافي وقائمة خبراتك</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>استقبل حجوزات من المتعلمين</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>احصل على تقييمات وتقييمات 5 نجوم</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>تحويل آمن للأموال إلى حسابك</span>
                  </li>
                </ul>
              </div>
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700" 
                onClick={() => navigate("/become-mentor")}
                data-testid="button-become-advisor"
              >
                أصبح مرشداً
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Admin Section */}
        {user?.role === 'admin' && (
          <Card className="border-2 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20" data-testid="card-admin-role">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Settings className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                <div>
                  <CardTitle className="flex items-center gap-2">
                    إدارة المنصة
                    <Badge className="bg-orange-600">مسؤول</Badge>
                  </CardTitle>
                  <CardDescription>
                    لديك صلاحيات إدارية كاملة على المنصة
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button 
                onClick={() => navigate("/dashboard/manager")}
                className="bg-orange-600 hover:bg-orange-700"
                data-testid="button-admin-manager-dashboard"
              >
                لوحة التحكم
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate("/dashboard/admin")}
                data-testid="button-admin-admin-dashboard"
              >
                لوحة الإدارة
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-6 text-center border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>ملاحظة:</strong> يمكنك تحويل دورك في أي وقت من إعدادات حسابك. ستبقى جميع بياناتك محفوظة.
          </p>
        </div>
      </div>
    </div>
  );
}
