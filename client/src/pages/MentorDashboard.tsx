import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
import type { Booking, Experience, User } from "@shared/schema";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ManageAvailabilityDialog from "@/components/ManageAvailabilityDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  Star, 
  Check, 
  X,
  Loader2,
  TrendingUp,
  Users,
  MessageSquare,
  BookOpen,
  MapPin,
  AlertCircle,
  CalendarClock,
  CreditCard,
  ExternalLink,
  AlertTriangle
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BookingWithDetails extends Booking {
  experience?: Experience;
  learner?: User;
}

interface StripeConnectStatus {
  connected: boolean;
  accountId: string | null;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  detailsSubmitted?: boolean;
}

export default function MentorDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [actionType, setActionType] = useState<'accept' | 'reject' | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/signin");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const { data: bookings, isLoading: bookingsLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ['/api/bookings'],
    enabled: isAuthenticated,
  });

  const { data: experiences, isLoading: experiencesLoading } = useQuery<Experience[]>({
    queryKey: ['/api/my-experiences'],
    enabled: isAuthenticated && user?.role === 'mentor',
  });

  const { data: stripeStatus } = useQuery<StripeConnectStatus>({
    queryKey: ['/api/stripe/connect/status'],
    enabled: isAuthenticated && user?.role === 'mentor',
  });

  const acceptMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest('POST', `/api/bookings/${bookingId}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      toast({
        title: "تم قبول الحجز",
        description: "تم قبول الحجز بنجاح وإشعار المتعلم",
      });
      setSelectedBooking(null);
      setActionType(null);
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء قبول الحجز",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest('POST', `/api/bookings/${bookingId}/reject`, { 
        reason: "رفض من قبل المرشد" 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      toast({
        title: "تم رفض الحجز",
        description: "تم رفض الحجز وتحرير الموعد",
      });
      setSelectedBooking(null);
      setActionType(null);
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء رفض الحجز",
        variant: "destructive",
      });
    },
  });

  const handleAccept = (booking: BookingWithDetails) => {
    setSelectedBooking(booking);
    setActionType('accept');
  };

  const handleReject = (booking: BookingWithDetails) => {
    setSelectedBooking(booking);
    setActionType('reject');
  };

  const confirmAction = () => {
    if (!selectedBooking) return;
    
    if (actionType === 'accept') {
      acceptMutation.mutate(selectedBooking.id);
    } else if (actionType === 'reject') {
      rejectMutation.mutate(selectedBooking.id);
    }
  };

  if (authLoading || bookingsLoading || experiencesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">جاري التحميل...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const pendingBookings = bookings?.filter(b => b.status === 'pending') || [];
  const confirmedBookings = bookings?.filter(b => b.status === 'confirmed') || [];
  const completedBookings = bookings?.filter(b => b.status === 'completed') || [];
  const cancelledBookings = bookings?.filter(b => b.status === 'cancelled') || [];

  const pendingExperiences = experiences?.filter(e => e.approvalStatus === 'pending') || [];
  const approvedExperiences = experiences?.filter(e => e.approvalStatus === 'approved') || [];
  const rejectedExperiences = experiences?.filter(e => e.approvalStatus === 'rejected') || [];

  const totalEarnings = completedBookings.reduce((sum, b) => sum + parseFloat(b.mentorAmount), 0);
  const avgRating = 4.8;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "secondary", label: "قيد الانتظار" },
      confirmed: { variant: "default", label: "مؤكد" },
      completed: { variant: "outline", label: "مكتمل" },
      cancelled: { variant: "destructive", label: "ملغي" },
      refunded: { variant: "destructive", label: "مسترد" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getApprovalBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "secondary", label: "قيد المراجعة" },
      approved: { variant: "default", label: "معتمدة" },
      rejected: { variant: "destructive", label: "مرفوضة" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const renderExperienceCard = (experience: Experience) => (
    <Card key={experience.id} className="hover-elevate">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{experience.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {experience.description}
                </p>
              </div>
              {getApprovalBadge(experience.approvalStatus)}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="w-4 h-4" />
                <span>{experience.category}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{experience.city}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                <span>{experience.price} ر.س</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                <span>{experience.isActive ? 'نشط' : 'غير نشط'}</span>
              </div>
            </div>

            {experience.learningPoints.length > 0 && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2">ما ستتعلمه:</p>
                <div className="flex flex-wrap gap-1">
                  {experience.learningPoints.slice(0, 3).map((point, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {point}
                    </Badge>
                  ))}
                  {experience.learningPoints.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{experience.learningPoints.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {experience.approvalStatus === 'approved' && (
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedExperience(experience);
                    setAvailabilityDialogOpen(true);
                  }}
                  data-testid={`button-manage-availability-${experience.id}`}
                >
                  <CalendarClock className="w-4 h-4 ml-1" />
                  إدارة الأوقات المتاحة
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderBookingCard = (booking: BookingWithDetails, showActions: boolean = false) => (
    <Card key={booking.id} className="hover-elevate">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{booking.experience?.title || "تجربة"}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  مع {booking.learner?.name || 'متعلم'}
                </p>
              </div>
              {getStatusBadge(booking.status)}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(booking.sessionDate), "d MMMM yyyy", { locale: ar })}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{format(new Date(booking.sessionDate), "h:mm a", { locale: ar })}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                <span>مبلغك: {booking.mentorAmount} ر.س</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{booking.learner?.email}</span>
              </div>
            </div>

            {showActions && booking.status === 'pending' && (
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => handleAccept(booking)}
                  disabled={acceptMutation.isPending}
                  data-testid={`button-accept-${booking.id}`}
                >
                  <Check className="w-4 h-4 ml-1" />
                  قبول
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(booking)}
                  disabled={rejectMutation.isPending}
                  data-testid={`button-reject-${booking.id}`}
                >
                  <X className="w-4 h-4 ml-1" />
                  رفض
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="font-display font-bold text-3xl sm:text-4xl mb-2">
              لوحة تحكم المرشد
            </h1>
            <p className="text-muted-foreground text-lg">
              إدارة الحجوزات والتجارب الخاصة بك
            </p>
          </div>

          {stripeStatus && !stripeStatus.connected && (
            <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <AlertDescription className="flex items-center justify-between gap-4">
                <span className="text-orange-800 dark:text-orange-200">
                  لاستلام مدفوعاتك من جلسات التوجيه، يجب عليك ربط حسابك في Stripe أولاً
                </span>
                <Link href="/mentor/stripe-connect">
                  <Button size="sm" data-testid="button-connect-stripe-alert">
                    <CreditCard className="h-4 w-4 ml-2" />
                    ربط حساب Stripe
                  </Button>
                </Link>
              </AlertDescription>
            </Alert>
          )}

          {stripeStatus?.connected && (!stripeStatus.payoutsEnabled || !stripeStatus.chargesEnabled) && (
            <Alert className="mb-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertDescription className="flex items-center justify-between gap-4">
                <span className="text-yellow-800 dark:text-yellow-200">
                  حسابك في Stripe متصل لكن يحتاج إلى إكمال بعض البيانات لتفعيل استلام المدفوعات
                </span>
                <Link href="/mentor/stripe-connect">
                  <Button size="sm" variant="outline" data-testid="button-complete-stripe">
                    إكمال البيانات
                    <ExternalLink className="h-4 w-4 mr-2" />
                  </Button>
                </Link>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي الأرباح</p>
                    <p className="text-2xl font-bold mt-1">{totalEarnings.toFixed(2)} ر.س</p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">الحجوزات المكتملة</p>
                    <p className="text-2xl font-bold mt-1">{completedBookings.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">متوسط التقييم</p>
                    <p className="text-2xl font-bold mt-1">{avgRating.toFixed(1)}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center">
                    <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">قيد الانتظار</p>
                    <p className="text-2xl font-bold mt-1">{pendingExperiences.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="bookings" className="w-full" dir="rtl">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="bookings" data-testid="tab-bookings">
                الحجوزات
              </TabsTrigger>
              <TabsTrigger value="experiences" data-testid="tab-experiences">
                تجاربي
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bookings" className="space-y-4">
              <Tabs defaultValue="pending" dir="rtl">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="pending" data-testid="tab-pending">
                    قيد الانتظار ({pendingBookings.length})
                  </TabsTrigger>
                  <TabsTrigger value="confirmed" data-testid="tab-confirmed">
                    مؤكدة ({confirmedBookings.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed" data-testid="tab-completed">
                    مكتملة ({completedBookings.length})
                  </TabsTrigger>
                  <TabsTrigger value="cancelled" data-testid="tab-cancelled">
                    ملغية ({cancelledBookings.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="space-y-4 mt-6">
                  {pendingBookings.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">لا توجد حجوزات قيد الانتظار</p>
                      </CardContent>
                    </Card>
                  ) : (
                    pendingBookings.map(booking => renderBookingCard(booking, true))
                  )}
                </TabsContent>

                <TabsContent value="confirmed" className="space-y-4 mt-6">
                  {confirmedBookings.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <Check className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">لا توجد حجوزات مؤكدة</p>
                      </CardContent>
                    </Card>
                  ) : (
                    confirmedBookings.map(booking => renderBookingCard(booking))
                  )}
                </TabsContent>

                <TabsContent value="completed" className="space-y-4 mt-6">
                  {completedBookings.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <Star className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">لا توجد حجوزات مكتملة</p>
                      </CardContent>
                    </Card>
                  ) : (
                    completedBookings.map(booking => renderBookingCard(booking))
                  )}
                </TabsContent>

                <TabsContent value="cancelled" className="space-y-4 mt-6">
                  {cancelledBookings.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <X className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">لا توجد حجوزات ملغية</p>
                      </CardContent>
                    </Card>
                  ) : (
                    cancelledBookings.map(booking => renderBookingCard(booking))
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="experiences" className="space-y-4">
              <Tabs defaultValue="pending" dir="rtl">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="pending" data-testid="tab-exp-pending">
                    قيد المراجعة ({pendingExperiences.length})
                  </TabsTrigger>
                  <TabsTrigger value="approved" data-testid="tab-exp-approved">
                    معتمدة ({approvedExperiences.length})
                  </TabsTrigger>
                  <TabsTrigger value="rejected" data-testid="tab-exp-rejected">
                    مرفوضة ({rejectedExperiences.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="space-y-4 mt-6">
                  {pendingExperiences.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">لا توجد تجارب قيد المراجعة</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          يتم مراجعة التجربة بعد رفعها من قبل الإدارة والموافقة عليها
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    pendingExperiences.map(exp => renderExperienceCard(exp))
                  )}
                </TabsContent>

                <TabsContent value="approved" className="space-y-4 mt-6">
                  {approvedExperiences.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <Check className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">لا توجد تجارب معتمدة</p>
                      </CardContent>
                    </Card>
                  ) : (
                    approvedExperiences.map(exp => renderExperienceCard(exp))
                  )}
                </TabsContent>

                <TabsContent value="rejected" className="space-y-4 mt-6">
                  {rejectedExperiences.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <X className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">لا توجد تجارب مرفوضة</p>
                      </CardContent>
                    </Card>
                  ) : (
                    rejectedExperiences.map(exp => renderExperienceCard(exp))
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {selectedExperience && (
        <ManageAvailabilityDialog
          experience={selectedExperience}
          open={availabilityDialogOpen}
          onOpenChange={(open) => {
            setAvailabilityDialogOpen(open);
            if (!open) {
              setSelectedExperience(null);
            }
          }}
        />
      )}

      <AlertDialog open={!!selectedBooking && !!actionType} onOpenChange={() => {
        setSelectedBooking(null);
        setActionType(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'accept' ? 'قبول الحجز' : 'رفض الحجز'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'accept' 
                ? 'هل أنت متأكد من قبول هذا الحجز؟ سيتم إشعار المتعلم بالموافقة.'
                : 'هل أنت متأكد من رفض هذا الحجز؟ سيتم تحرير الموعد وإشعار المتعلم.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmAction}
              disabled={acceptMutation.isPending || rejectMutation.isPending}
            >
              {acceptMutation.isPending || rejectMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري التنفيذ...
                </>
              ) : (
                actionType === 'accept' ? 'قبول' : 'رفض'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}
