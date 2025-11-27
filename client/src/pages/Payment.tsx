import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  CreditCard,
  Lock,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import type { Booking, Experience, Availability } from "@shared/schema";

interface CheckoutFormProps {
  bookingId: string;
  paymentIntentId: string;
  onSuccess: () => void;
  totalAmount: string;
}

function CheckoutForm({ bookingId, paymentIntentId, onSuccess, totalAmount }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const confirmPaymentOnServer = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/payments/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          bookingId,
          paymentIntentId,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to confirm payment");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/${bookingId}`] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في تأكيد الدفع",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
      setHasSubmitted(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements || hasSubmitted) {
      return;
    }

    setIsProcessing(true);
    setHasSubmitted(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (error) {
        if (error.type === "card_error" || error.type === "validation_error") {
          setErrorMessage(error.message || "حدث خطأ في بيانات البطاقة");
        } else if (error.type === "invalid_request_error" && error.code === "payment_intent_unexpected_state") {
          setErrorMessage("انتهت صلاحية جلسة الدفع. يرجى تحديث الصفحة والمحاولة مرة أخرى.");
        } else {
          setErrorMessage("حدث خطأ غير متوقع أثناء معالجة الدفع");
        }
        setIsProcessing(false);
        setHasSubmitted(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "requires_capture") {
        confirmPaymentOnServer.mutate();
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        confirmPaymentOnServer.mutate();
      } else {
        setErrorMessage("حالة الدفع غير متوقعة. يرجى المحاولة مرة أخرى.");
        setIsProcessing(false);
        setHasSubmitted(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ أثناء معالجة الدفع");
      setIsProcessing(false);
      setHasSubmitted(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 border rounded-lg bg-background">
        <PaymentElement 
          options={{
            layout: "tabs",
          }}
        />
      </div>

      {errorMessage && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5" />
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
        <Lock className="h-5 w-5 text-primary mt-0.5" />
        <div>
          <p className="font-medium text-sm">دفع آمن ومحمي</p>
          <p className="text-xs text-muted-foreground mt-1">
            معلوماتك محمية بتشفير SSL. نحن نستخدم Stripe لمعالجة الدفع الآمن.
          </p>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-12 text-lg"
        disabled={!stripe || isProcessing || hasSubmitted}
        data-testid="button-complete-payment"
      >
        {isProcessing ? (
          <>
            <Loader2 className="ml-2 h-5 w-5 animate-spin" />
            جاري المعالجة...
          </>
        ) : (
          <>
            <Lock className="ml-2 h-5 w-5" />
            إتمام الدفع - {totalAmount} ريال
          </>
        )}
      </Button>
    </form>
  );
}

export default function Payment() {
  const { id: bookingId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [clientSecret, setClientSecret] = useState<string>("");
  const [paymentIntentId, setPaymentIntentId] = useState<string>("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const { data: booking, isLoading } = useQuery<Booking>({
    queryKey: [`/api/bookings/${bookingId}`],
    enabled: !!bookingId,
  });

  const { data: experience } = useQuery<Experience>({
    queryKey: [`/api/experiences/${booking?.experienceId}`],
    enabled: !!booking?.experienceId,
  });

  const { data: availability } = useQuery<Availability>({
    queryKey: [`/api/availability/slot/${booking?.availabilityId}`],
    enabled: !!booking?.availabilityId,
  });

  useEffect(() => {
    const initStripe = async () => {
      try {
        const response = await fetch('/api/stripe/publishable-key', {
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error('Failed to get Stripe configuration');
        }
        const { publishableKey } = await response.json();
        setStripePromise(loadStripe(publishableKey));
      } catch (error) {
        console.error('Error initializing Stripe:', error);
        toast({
          title: "خطأ في تهيئة نظام الدفع",
          description: "يرجى إعادة تحميل الصفحة",
          variant: "destructive",
        });
      }
    };
    
    initStripe();
  }, []);

  const createPaymentIntent = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/payments/create-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          bookingId,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create payment intent");
      }
      
      return response.json();
    },
    onSuccess: (data: any) => {
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في إنشاء الدفع",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (bookingId && !clientSecret && stripePromise) {
      createPaymentIntent.mutate();
    }
  }, [bookingId, stripePromise]);

  const handlePaymentSuccess = () => {
    setPaymentSuccess(true);
    toast({
      title: "تم الدفع بنجاح",
      description: "تم تأكيد حجزك",
    });
    setTimeout(() => {
      navigate("/dashboard/learner");
    }, 3000);
  };

  if (isLoading || !booking) {
    return (
      <div className="min-h-screen" dir="rtl">
        <Navbar />
        <div className="pt-16 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">جاري التحميل...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen" dir="rtl">
        <Navbar />
        <div className="pt-16 flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3 w-16 h-16 mx-auto mb-4">
                <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">تم الدفع بنجاح!</h2>
              <p className="text-muted-foreground mb-6">
                تم تأكيد حجزك بنجاح. سيتم تحويلك إلى لوحة التحكم...
              </p>
              <Button onClick={() => navigate("/dashboard/learner")} className="w-full" data-testid="button-dashboard">
                اذهب إلى لوحة التحكم
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen" dir="rtl">
      <Navbar />
      
      <main className="pt-16 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Sora' }}>
              إكمال الدفع
            </h1>
            <p className="text-muted-foreground">
              قم بإتمام عملية الدفع لتأكيد حجزك
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    معلومات الدفع
                  </CardTitle>
                  <CardDescription>
                    جميع المعاملات مؤمنة ومشفرة
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stripePromise && clientSecret ? (
                    <Elements 
                      stripe={stripePromise} 
                      options={{
                        clientSecret,
                        appearance: {
                          theme: 'stripe',
                          variables: {
                            colorPrimary: '#2563eb',
                          },
                        },
                        locale: 'ar',
                      }}
                    >
                      <CheckoutForm 
                        bookingId={bookingId!}
                        paymentIntentId={paymentIntentId}
                        onSuccess={handlePaymentSuccess}
                        totalAmount={booking.totalAmount}
                      />
                    </Elements>
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                        <p className="mt-4 text-muted-foreground">جاري تحميل نظام الدفع...</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-20">
                <CardHeader>
                  <CardTitle>ملخص الطلب</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {experience && (
                    <>
                      <div>
                        <h3 className="font-semibold mb-2" data-testid="text-experience-title">
                          {experience.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {experience.category}
                        </p>
                      </div>

                      <Separator />

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">التاريخ:</span>
                          <span className="font-medium" data-testid="text-booking-date">
                            {availability &&
                              format(new Date(availability.date), "d MMMM yyyy", { locale: ar })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">الوقت:</span>
                          <span className="font-medium" data-testid="text-booking-time">
                            {availability &&
                              format(new Date(availability.date), "HH:mm", { locale: ar })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">الموقع:</span>
                          <span className="font-medium" data-testid="text-booking-location">
                            {experience.city}
                          </span>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">سعر الجلسة:</span>
                          <span data-testid="text-session-price">{experience.price} ريال</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">رسوم المنصة:</span>
                          <span data-testid="text-platform-fee">
                            {(parseFloat(booking.totalAmount) - parseFloat(booking.mentorAmount)).toFixed(2)} ريال
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-lg font-bold">
                          <span>المجموع:</span>
                          <span data-testid="text-total-amount">{booking.totalAmount} ريال</span>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="text-xs text-blue-900 dark:text-blue-100">
                      <p className="font-medium mb-1">ملاحظة مهمة:</p>
                      <p>
                        سيتم حجز المبلغ فوراً. سيُطلق المبلغ للمرشد بعد إتمام الجلسة أو تلقائياً بعد 24 ساعة إذا لم يتم تقييمها بأقل من 3 نجوم.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
