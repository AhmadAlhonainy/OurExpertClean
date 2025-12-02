import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import {
  Star,
  MapPin,
  Clock,
  Coffee,
  Check,
  Calendar as CalendarIcon,
  User,
  Shield,
  Heart,
  ChevronRight,
  ArrowRight
} from "lucide-react";
import BackButton from "@/components/BackButton";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import type { Experience, Availability, Review } from "@shared/schema";

export default function ExperienceDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>();
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);

  // Fetch experience details
  const { data: experience, isLoading: isLoadingExperience } = useQuery<Experience>({
    queryKey: [`/api/experiences/${id}`],
  });

  // Fetch availability
  const { data: availability = [] } = useQuery<Availability[]>({
    queryKey: [`/api/experiences/${id}/availability`],
    enabled: !!id,
  });

  // Fetch mentor details
  const { data: mentor } = useQuery({
    queryKey: [`/api/users/${experience?.mentorId}`],
    enabled: !!experience?.mentorId,
  });

  // Fetch reviews
  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: [`/api/reviews/experience/${id}`],
    enabled: !!id,
  });

  // Create booking mutation
  const createBooking = useMutation({
    mutationFn: async () => {
      if (!selectedSlotId) throw new Error("No slot selected");
      
      const response = await fetch(`/api/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          availabilityId: selectedSlotId,
          experienceId: id,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create booking");
      }
      
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "✓ تم إنشاء الحجز",
        description: "جاري تحويلك إلى صفحة الدفع...",
      });
      // Navigate to payment
      navigate(`/payment/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في إنشاء الحجز",
        description: error.message || "حدث خطأ أثناء إنشاء الحجز",
        variant: "destructive",
      });
    },
  });

  const availableDates = availability
    .filter((slot) => !slot.isBooked)
    .map((slot) => new Date(slot.date));

  const selectedDateSlots = availability.filter((slot) => {
    if (!selectedDate || slot.isBooked) return false;
    const slotDate = new Date(slot.date);
    return (
      slotDate.getDate() === selectedDate.getDate() &&
      slotDate.getMonth() === selectedDate.getMonth() &&
      slotDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  const handleBookClick = () => {
    if (!user) {
      setIsAuthDialogOpen(true);
      return;
    }
    setIsBookingDialogOpen(true);
  };

  const handleConfirmBooking = () => {
    createBooking.mutate();
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  if (isLoadingExperience) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="pt-16 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">جاري التحميل...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="pt-16 flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="text-lg">التجربة غير موجودة</p>
              <Button onClick={() => navigate("/")} className="mt-4" data-testid="button-home">
                العودة للرئيسية
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
      
      <main className="pt-16">
        {/* Back Button */}
        <div className="container mx-auto px-4 pt-4">
          <BackButton />
        </div>
        
        {/* Breadcrumb */}
        <div className="bg-muted/30 border-b">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <a href="/" className="hover:text-foreground" data-testid="link-home">
                الرئيسية
              </a>
              <ChevronRight className="h-4 w-4 rotate-180" />
              <span className="text-foreground">{experience.title}</span>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content - Right Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Title and Basic Info */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" data-testid="badge-category">
                    {experience.category}
                  </Badge>
                </div>
                <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Sora' }} data-testid="text-title">
                  {experience.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold text-foreground" data-testid="text-rating">{avgRating}</span>
                    <span>({reviews.length} تقييم)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span data-testid="text-location">{experience.cities?.join(", ") || "—"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Coffee className="h-4 w-4" />
                    <span>مقهى شريك</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Mentor Profile */}
              <div>
                <h2 className="text-xl font-semibold mb-4">المرشد</h2>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16" data-testid="img-mentor-avatar">
                    <AvatarImage src={(mentor as any)?.profileImage} />
                    <AvatarFallback>
                      <User className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg" data-testid="text-mentor-name">
                      {(mentor as any)?.fullName || (mentor as any)?.email || "مرشد"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {(mentor as any)?.bio || "خبير في مجاله"}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    data-testid="button-view-mentor"
                    onClick={() => navigate(`/mentor/${(mentor as any)?.id}`)}
                  >
                    عرض الملف الشخصي
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div>
                <h2 className="text-xl font-semibold mb-4">عن هذه التجربة</h2>
                <p className="text-base leading-relaxed whitespace-pre-line" data-testid="text-description">
                  {experience.description}
                </p>
              </div>

              <Separator />

              {/* What You'll Learn */}
              <div>
                <h2 className="text-xl font-semibold mb-4">ما ستتعلمه</h2>
                <div className="space-y-3">
                  {experience.learningPoints.map((point, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="rounded-full bg-primary/10 p-1 mt-0.5">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-base" data-testid={`text-learning-point-${index}`}>{point}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Reviews */}
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  التقييمات ({reviews.length})
                </h2>
                
                {reviews.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      لا توجد تقييمات بعد
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {reviews.slice(0, 5).map((review) => (
                      <Card key={review.id} data-testid={`card-review-${review.id}`}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  <User className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">متعلم</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground" data-testid={`text-review-comment-${review.id}`}>
                            {review.comment}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(review.createdAt), "d MMMM yyyy", { locale: ar })}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                    {reviews.length > 5 && (
                      <Button variant="outline" className="w-full" data-testid="button-see-all-reviews">
                        عرض جميع التقييمات
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Booking Card - Left Column (Sticky) */}
            <div className="lg:col-span-1">
              <div className="sticky top-20">
                <Card className="shadow-lg">
                  <CardHeader>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold" data-testid="text-price">
                        {experience.price} ريال
                      </span>
                      <span className="text-muted-foreground text-sm">/ جلسة</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Calendar */}
                    <div>
                      <label className="text-sm font-semibold mb-2 block">
                        اختر التاريخ
                      </label>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          setSelectedSlotId(undefined);
                        }}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          if (date < today) return true;
                          
                          return !availableDates.some(
                            (d) =>
                              d.getDate() === date.getDate() &&
                              d.getMonth() === date.getMonth() &&
                              d.getFullYear() === date.getFullYear()
                          );
                        }}
                        locale={ar}
                        className="rounded-md border w-full"
                        data-testid="calendar-booking"
                      />
                    </div>

                    {/* Time Slots */}
                    {selectedDate && (
                      <div>
                        <label className="text-sm font-semibold mb-2 block">
                          اختر الوقت
                        </label>
                        {selectedDateSlots.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            لا توجد مواعيد متاحة في هذا التاريخ
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {selectedDateSlots.map((slot) => (
                              <Button
                                key={slot.id}
                                variant={selectedSlotId === slot.id ? "default" : "outline"}
                                onClick={() => setSelectedSlotId(slot.id)}
                                className="w-full"
                                data-testid={`button-slot-${slot.id}`}
                              >
                                <Clock className="h-4 w-4 ml-2" />
                                {format(new Date(slot.date), "HH:mm", { locale: ar })}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Book Button */}
                    <Button
                      className="w-full h-12 text-lg"
                      disabled={!selectedSlotId}
                      onClick={handleBookClick}
                      data-testid="button-book-session"
                    >
                      احجز الآن
                    </Button>

                    {/* Trust Elements */}
                    <div className="space-y-2 pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <Shield className="h-4 w-4 text-primary" />
                        <span>ضمان استرجاع الأموال 100%</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        <span>تأكيد فوري</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Heart className="h-4 w-4 text-primary" />
                        <span>دفع آمن عبر Stripe</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Booking Confirmation Dialog */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد الحجز</DialogTitle>
            <DialogDescription>
              تأكد من تفاصيل حجزك قبل المتابعة
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">التجربة:</span>
              <span className="font-semibold">{experience.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">التاريخ:</span>
              <span className="font-semibold">
                {selectedDate && format(selectedDate, "d MMMM yyyy", { locale: ar })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الوقت:</span>
              <span className="font-semibold">
                {selectedSlotId &&
                  format(
                    new Date(availability.find((s) => s.id === selectedSlotId)!.date),
                    "HH:mm",
                    { locale: ar }
                  )}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg">
              <span className="font-semibold">المجموع:</span>
              <span className="font-bold text-primary">{experience.price} ريال</span>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsBookingDialogOpen(false)}
              data-testid="button-cancel-booking"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleConfirmBooking}
              disabled={createBooking.isPending}
              data-testid="button-confirm-booking"
            >
              {createBooking.isPending ? "جاري الحجز..." : "تأكيد وانتقال للدفع"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auth Required Dialog */}
      <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تسجيل الدخول مطلوب</DialogTitle>
            <DialogDescription>
              يجب تسجيل الدخول أولاً لحجز هذه التجربة
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAuthDialogOpen(false)}
              data-testid="button-cancel-auth"
            >
              إلغاء
            </Button>
            <Button
              onClick={() => {
                setIsAuthDialogOpen(false);
                window.location.href = "/api/auth/login";
              }}
              data-testid="button-login"
            >
              تسجيل الدخول
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
