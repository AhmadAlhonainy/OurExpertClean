import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Calendar,
  MapPin,
  Clock,
  Star,
  MessageSquare,
  User,
  ChevronRight,
  Loader2,
  CreditCard,
} from "lucide-react";
import BackButton from "@/components/BackButton";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import type { Booking, Experience, Review } from "@shared/schema";

export default function LearnerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch learner bookings
  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings/learner"],
  });

  // Fetch experiences for bookings
  const experienceIds = Array.from(new Set(bookings.map((b: Booking) => b.experienceId)));
  const { data: experiences = [] } = useQuery<Experience[]>({
    queryKey: ["/api/experiences"],
    select: (data: Experience[]) => data.filter((exp: Experience) => experienceIds.includes(exp.id)),
  });

  const handleReviewSubmit = async () => {
    if (!selectedBooking) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          rating,
          comment,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit review");
      }

      toast({
        title: "✓ تم إرسال التقييم",
        description: "شكراً لتقييمك!",
      });

      setIsReviewDialogOpen(false);
      setSelectedBooking(null);
      setRating(5);
      setComment("");
      
      // Refresh bookings
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "خطأ في إرسال التقييم",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getExperience = (experienceId: string) => {
    return experiences.find(exp => exp.id === experienceId);
  };

  const upcomingBookings = bookings.filter((b: Booking) => 
    b.status === 'confirmed' || b.status === 'pending'
  );
  
  const pastBookings = bookings.filter((b: Booking) => 
    b.status === 'completed' || b.status === 'refunded'
  );

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; text: string }> = {
      pending: { variant: "secondary", text: "قيد الانتظار" },
      confirmed: { variant: "default", text: "مؤكد" },
      completed: { variant: "outline", text: "مكتمل" },
      refunded: { variant: "destructive", text: "مسترجع" },
    };
    
    const config = statusMap[status] || { variant: "secondary", text: status };
    return <Badge variant={config.variant} data-testid={`badge-status-${status}`}>{config.text}</Badge>;
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const statusMap: Record<string, { variant: any; text: string }> = {
      pending: { variant: "secondary", text: "في انتظار الدفع" },
      held: { variant: "default", text: "محجوز" },
      released: { variant: "outline", text: "تم الإطلاق" },
      refunded: { variant: "destructive", text: "مسترجع" },
    };
    
    const config = statusMap[paymentStatus] || { variant: "secondary", text: paymentStatus };
    return <Badge variant={config.variant} data-testid={`badge-payment-${paymentStatus}`}>{config.text}</Badge>;
  };

  const canReview = (booking: Booking) => {
    if (booking.status !== 'completed') return false;
    const now = new Date();
    return now <= booking.reviewDeadline;
  };

  if (isLoading) {
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

  return (
    <div className="min-h-screen" dir="rtl">
      <Navbar />
      
      <main className="pt-16 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Back Button */}
          <div className="mb-4">
            <BackButton />
          </div>
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Sora' }} data-testid="heading-dashboard">
              لوحة التحكم
            </h1>
            <p className="text-muted-foreground">
              مرحباً {user?.email || ""}! تابع جلساتك القادمة والسابقة
            </p>
          </div>

          <Tabs defaultValue="upcoming" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="upcoming" data-testid="tab-upcoming">
                الجلسات القادمة ({upcomingBookings.length})
              </TabsTrigger>
              <TabsTrigger value="past" data-testid="tab-past">
                الجلسات السابقة ({pastBookings.length})
              </TabsTrigger>
            </TabsList>

            {/* Upcoming Sessions */}
            <TabsContent value="upcoming" className="space-y-4">
              {upcomingBookings.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-2">لا توجد جلسات قادمة</p>
                    <p className="text-muted-foreground mb-4">
                      ابدأ بحجز تجربة جديدة
                    </p>
                    <Button onClick={() => window.location.href = "/"} data-testid="button-browse">
                      تصفح التجارب
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                upcomingBookings.map((booking) => {
                  const experience = getExperience(booking.experienceId);
                  if (!experience) return null;

                  return (
                    <Card key={booking.id} className="hover-elevate" data-testid={`card-booking-${booking.id}`}>
                      <CardContent className="p-6">
                        <div className="flex gap-6">
                          <div className="flex-shrink-0">
                            <Avatar className="h-20 w-20">
                              <AvatarFallback>
                                <User className="h-10 w-10" />
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div>
                                <h3 className="text-xl font-semibold mb-1" data-testid={`text-experience-${booking.id}`}>
                                  {experience.title}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {experience.category}
                                </p>
                              </div>
                              <div className="flex flex-col gap-2 items-end">
                                {getStatusBadge(booking.status)}
                                {getPaymentStatusBadge(booking.paymentStatus)}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span data-testid={`text-date-${booking.id}`}>
                                  {format(new Date(booking.createdAt), "d MMMM yyyy", { locale: ar })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{experience.cities?.join(", ") || "—"}</span>
                              </div>
                            </div>

                            <Separator className="my-4" />

                            <div className="flex items-center justify-between">
                              <div className="text-lg font-bold" data-testid={`text-amount-${booking.id}`}>
                                {booking.totalAmount} ريال
                              </div>
                              <div className="flex gap-2">
                                {booking.paymentStatus === 'pending' && (
                                  <Button 
                                    size="sm" 
                                    onClick={() => window.location.href = `/payment/${booking.id}`}
                                    data-testid={`button-pay-${booking.id}`}
                                  >
                                    <CreditCard className="h-4 w-4 ml-2" />
                                    الدفع الآن
                                  </Button>
                                )}
                                <Button variant="outline" size="sm" data-testid={`button-details-${booking.id}`}>
                                  التفاصيل
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            {/* Past Sessions */}
            <TabsContent value="past" className="space-y-4">
              {pastBookings.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-2">لا توجد جلسات سابقة</p>
                    <p className="text-muted-foreground">
                      ستظهر جلساتك المكتملة هنا
                    </p>
                  </CardContent>
                </Card>
              ) : (
                pastBookings.map((booking) => {
                  const experience = getExperience(booking.experienceId);
                  if (!experience) return null;

                  return (
                    <Card key={booking.id} className="hover-elevate" data-testid={`card-past-${booking.id}`}>
                      <CardContent className="p-6">
                        <div className="flex gap-6">
                          <div className="flex-shrink-0">
                            <Avatar className="h-20 w-20">
                              <AvatarFallback>
                                <User className="h-10 w-10" />
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div>
                                <h3 className="text-xl font-semibold mb-1" data-testid={`text-past-experience-${booking.id}`}>
                                  {experience.title}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {experience.category}
                                </p>
                              </div>
                              <div className="flex flex-col gap-2 items-end">
                                {getStatusBadge(booking.status)}
                                {getPaymentStatusBadge(booking.paymentStatus)}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span data-testid={`text-past-date-${booking.id}`}>
                                  {format(new Date(booking.createdAt), "d MMMM yyyy", { locale: ar })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{experience.cities?.join(", ") || "—"}</span>
                              </div>
                            </div>

                            <Separator className="my-4" />

                            <div className="flex items-center justify-between">
                              <div className="text-lg font-bold" data-testid={`text-past-amount-${booking.id}`}>
                                {booking.totalAmount} ريال
                              </div>
                              <div className="flex gap-2">
                                {canReview(booking) && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedBooking(booking);
                                      setIsReviewDialogOpen(true);
                                    }}
                                    data-testid={`button-review-${booking.id}`}
                                  >
                                    <MessageSquare className="h-4 w-4 ml-2" />
                                    تقييم الجلسة
                                  </Button>
                                )}
                                <Button variant="outline" size="sm" data-testid={`button-past-details-${booking.id}`}>
                                  التفاصيل
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تقييم الجلسة</DialogTitle>
            <DialogDescription>
              شاركنا تجربتك مع هذه الجلسة
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div>
              <Label className="mb-3 block">التقييم</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                    data-testid={`button-star-${star}`}
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="comment">التعليق (اختياري)</Label>
              <Textarea
                id="comment"
                placeholder="شاركنا رأيك في الجلسة..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                data-testid="textarea-comment"
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 text-sm">
              <p className="text-blue-900 dark:text-blue-100">
                <strong>ملاحظة:</strong> التقييمات التي تقل عن 3 نجوم ستؤدي إلى استرجاع المبلغ كاملاً. التقييمات 3 نجوم أو أكثر تعني إطلاق الدفع للمرشد.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsReviewDialogOpen(false);
                setSelectedBooking(null);
                setRating(5);
                setComment("");
              }}
              disabled={isSubmitting}
              data-testid="button-cancel-review"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleReviewSubmit}
              disabled={isSubmitting}
              data-testid="button-submit-review"
            >
              {isSubmitting ? "جاري الإرسال..." : "إرسال التقييم"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
