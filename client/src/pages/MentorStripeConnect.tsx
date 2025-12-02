import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, ExternalLink, CreditCard, AlertTriangle, RefreshCw, Building2 } from "lucide-react";
import BackButton from "@/components/BackButton";
import { apiRequest } from "@/lib/queryClient";

interface StripeConnectStatus {
  connected: boolean;
  accountId: string | null;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  detailsSubmitted?: boolean;
  error?: string;
}

export default function MentorStripeConnect() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const success = searchParams.includes("success=true");
  const refresh = searchParams.includes("refresh=true");

  const { data: status, isLoading: statusLoading, refetch } = useQuery<StripeConnectStatus>({
    queryKey: ["/api/stripe/connect/status"],
    enabled: !!user && user.role === "mentor",
  });

  const onboardMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/stripe/connect/onboard");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  const dashboardMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/stripe/connect/dashboard");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
      }
    },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  if (user.role !== "mentor") {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4" dir="rtl">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>غير مسموح</AlertTitle>
          <AlertDescription>
            هذه الصفحة متاحة للمرشدين فقط. يرجى التسجيل كمرشد أولاً.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (statusLoading) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4" dir="rtl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="mr-2">جاري التحقق من حالة الحساب...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4" dir="rtl">
      {/* Back Button */}
      <div className="mb-4">
        <BackButton />
      </div>
      
      <div className="space-y-6">
        <div className="text-center">
          <CreditCard className="h-16 w-16 mx-auto text-primary mb-4" />
          <h1 className="text-3xl font-bold">ربط حساب الدفع</h1>
          <p className="text-muted-foreground mt-2">
            اربط حسابك في Stripe لاستلام المدفوعات من جلسات التوجيه
          </p>
        </div>

        {success && (
          <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-800 dark:text-green-200">تم بنجاح!</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              تم ربط حسابك في Stripe. يمكنك الآن استلام المدفوعات.
            </AlertDescription>
          </Alert>
        )}

        {refresh && (
          <Alert>
            <RefreshCw className="h-4 w-4" />
            <AlertTitle>يرجى إكمال عملية الربط</AlertTitle>
            <AlertDescription>
              لم تكتمل عملية الربط. يرجى المحاولة مرة أخرى.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              حالة حساب Stripe
            </CardTitle>
            <CardDescription>
              معلومات حول حسابك المرتبط لاستلام المدفوعات
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status?.connected ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">حالة الاتصال</p>
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 ml-1" />
                      متصل
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">استلام المدفوعات</p>
                    {status.payoutsEnabled ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="h-3 w-3 ml-1" />
                        مفعّل
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="h-3 w-3 ml-1" />
                        غير مفعّل
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">قبول المدفوعات</p>
                    {status.chargesEnabled ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="h-3 w-3 ml-1" />
                        مفعّل
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="h-3 w-3 ml-1" />
                        غير مفعّل
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">اكتمال البيانات</p>
                    {status.detailsSubmitted ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="h-3 w-3 ml-1" />
                        مكتمل
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="h-3 w-3 ml-1" />
                        غير مكتمل
                      </Badge>
                    )}
                  </div>
                </div>

                {!status.payoutsEnabled || !status.chargesEnabled || !status.detailsSubmitted ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>يرجى إكمال بيانات الحساب</AlertTitle>
                    <AlertDescription>
                      لاستلام المدفوعات، يجب عليك إكمال جميع البيانات المطلوبة في Stripe.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="flex flex-col gap-3 pt-4">
                  {(!status.payoutsEnabled || !status.chargesEnabled || !status.detailsSubmitted) && (
                    <Button 
                      onClick={() => onboardMutation.mutate()}
                      disabled={onboardMutation.isPending}
                      data-testid="button-complete-onboarding"
                    >
                      {onboardMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      ) : null}
                      إكمال بيانات الحساب
                      <ExternalLink className="h-4 w-4 mr-2" />
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline"
                    onClick={() => dashboardMutation.mutate()}
                    disabled={dashboardMutation.isPending}
                    data-testid="button-stripe-dashboard"
                  >
                    {dashboardMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : null}
                    فتح لوحة تحكم Stripe
                    <ExternalLink className="h-4 w-4 mr-2" />
                  </Button>

                  <Button 
                    variant="ghost"
                    onClick={() => refetch()}
                    data-testid="button-refresh-status"
                  >
                    <RefreshCw className="h-4 w-4 ml-2" />
                    تحديث الحالة
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center py-6 space-y-4">
                  <XCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium">لم يتم ربط حساب Stripe بعد</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      لاستلام مدفوعاتك من جلسات التوجيه، يجب عليك ربط حسابك في Stripe
                    </p>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium">كيف يعمل نظام الدفع؟</h4>
                  <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                    <li>المتعلم يدفع مبلغ الجلسة عند الحجز</li>
                    <li>المبلغ يُحجز حتى انتهاء الجلسة</li>
                    <li>بعد تقييم الجلسة (3 نجوم أو أكثر)، يُحوَّل 80% لك و20% للمنصة</li>
                    <li>في حال تقييم أقل من 3 نجوم، يراجع الأمر من قبل الإدارة</li>
                  </ul>
                </div>

                <Button 
                  className="w-full"
                  size="lg"
                  onClick={() => onboardMutation.mutate()}
                  disabled={onboardMutation.isPending}
                  data-testid="button-connect-stripe"
                >
                  {onboardMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 ml-2" />
                  )}
                  ربط حساب Stripe الآن
                  <ExternalLink className="h-4 w-4 mr-2" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>الأسئلة الشائعة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium">هل Stripe آمن؟</h4>
              <p className="text-sm text-muted-foreground mt-1">
                نعم، Stripe هي منصة دفع عالمية موثوقة تستخدمها ملايين الشركات حول العالم.
              </p>
            </div>
            <div>
              <h4 className="font-medium">متى سأستلم أموالي؟</h4>
              <p className="text-sm text-muted-foreground mt-1">
                يتم تحويل الأموال تلقائياً بعد 24 ساعة من انتهاء الجلسة إذا تم تقييمها بـ 3 نجوم أو أكثر.
              </p>
            </div>
            <div>
              <h4 className="font-medium">كم عمولة المنصة؟</h4>
              <p className="text-sm text-muted-foreground mt-1">
                المنصة تأخذ 20% من قيمة كل جلسة، و80% يذهب لك مباشرة.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
