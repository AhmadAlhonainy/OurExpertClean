import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  DollarSign,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
} from "lucide-react";
import type { Booking, User, Experience, Complaint } from "@shared/schema";

interface PopulatedBooking extends Booking {
  experience?: Experience;
  learner?: User;
  mentor?: User;
}

interface RevenueStats {
  totalRevenue: number;
  platformRevenue: number;
  mentorRevenue: number;
}

export default function ManagerDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");

  // Check if user is admin
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch all bookings
  const { data: allBookings = [], isLoading: bookingsLoading } = useQuery<PopulatedBooking[]>({
    queryKey: ["/api/admin/bookings"],
  });

  // Fetch all users
  const { data: allUsers = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  // Fetch all experiences
  const { data: allExperiences = [], isLoading: experiencesLoading } = useQuery<Experience[]>({
    queryKey: ["/api/admin/experiences"],
  });

  // Fetch complaints
  const { data: complaints = [], isLoading: complaintsLoading } = useQuery<Complaint[]>({
    queryKey: ["/api/admin/complaints"],
  });

  // Fetch revenue stats
  const { data: revenueStats, isLoading: revenueLoading } = useQuery<RevenueStats>({
    queryKey: ["/api/admin/revenue"],
  });

  // Fetch admin emails
  const { data: adminEmails = [], isLoading: emailsLoading, refetch: refetchEmails } = useQuery<string[]>({
    queryKey: ["/api/admin/admin-emails"],
  });

  // Approve/Reject Experience Mutation
  const approveExperienceMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest('POST', `/api/admin/experiences/${id}/approve`, {
        approvalStatus: status
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/experiences"] });
      toast({ title: "تم تحديث حالة التجربة بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل تحديث حالة التجربة", variant: "destructive" });
    },
  });

  // Update Complaint Status Mutation
  const updateComplaintMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const response = await apiRequest('PATCH', `/api/admin/complaints/${id}`, {
        status,
        adminNotes: notes,
        resolvedAt: status === 'resolved' || status === 'closed' ? new Date().toISOString() : null
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/complaints"] });
      setSelectedComplaint(null);
      setAdminNotes("");
      toast({ title: "تم تحديث حالة الشكوى بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل تحديث حالة الشكوى", variant: "destructive" });
    },
  });

  // Add Admin Email Mutation
  const addAdminEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest('POST', '/api/admin/admin-emails', { email });
      return response.json();
    },
    onSuccess: () => {
      refetchEmails();
      setNewAdminEmail("");
      toast({ title: "تم إضافة البريد الإلكتروني للمسؤول بنجاح" });
    },
    onError: (error: any) => {
      toast({ title: error?.message || "فشل إضافة البريد الإلكتروني", variant: "destructive" });
    },
  });

  // Remove Admin Email Mutation
  const removeAdminEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest('DELETE', `/api/admin/admin-emails/${encodeURIComponent(email)}`);
      return response.json();
    },
    onSuccess: () => {
      refetchEmails();
      toast({ title: "تم إزالة البريد الإلكتروني بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل إزالة البريد الإلكتروني", variant: "destructive" });
    },
  });

  // Cancel Booking Mutation
  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiRequest('POST', `/api/admin/bookings/${bookingId}/cancel`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      toast({ title: "تم إلغاء الحجز بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل إلغاء الحجز", variant: "destructive" });
    },
  });

  // Suspend Booking Mutation
  const suspendBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiRequest('POST', `/api/admin/bookings/${bookingId}/suspend`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      toast({ title: "تم تعليق الحجز قيد المراجعة" });
    },
    onError: () => {
      toast({ title: "فشل تعليق الحجز", variant: "destructive" });
    },
  });

  // Unsuspend Booking Mutation
  const unsuspendBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiRequest('POST', `/api/admin/bookings/${bookingId}/unsuspend`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      toast({ title: "تم فك تعليق الحجز" });
    },
    onError: () => {
      toast({ title: "فشل فك تعليق الحجز", variant: "destructive" });
    },
  });

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">جاري التحميل...</div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4" dir="rtl">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">غير مصرح لك بالوصول</h1>
        <p className="text-muted-foreground">هذه الصفحة متاحة فقط للإداريين</p>
        <Button onClick={() => navigate("/")} data-testid="button-home">
          العودة للصفحة الرئيسية
        </Button>
      </div>
    );
  }

  const pendingBookings = allBookings.filter(b => b.status === 'pending').length;
  const mentorsCount = allUsers.filter(u => u.role === 'mentor').length;
  const learnersCount = allUsers.filter(u => u.role === 'learner').length;
  const pendingComplaints = complaints.filter(c => c.status === 'pending').length;
  const pendingExperiences = allExperiences.filter(e => e.approvalStatus === 'pending').length;

  return (
    <div className="min-h-screen bg-background p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">لوحة التحكم</h1>
            <p className="text-muted-foreground">إدارة شاملة للمنصة</p>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-revenue">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-revenue">
                {revenueLoading ? "..." : `${revenueStats?.totalRevenue.toFixed(2) || 0} ريال`}
              </div>
              <p className="text-xs text-muted-foreground">
                عمولة المنصة: {revenueStats?.platformRevenue.toFixed(2) || 0} ريال
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-users">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المستخدمين</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-users-count">
                {usersLoading ? "..." : allUsers.length}
              </div>
              <p className="text-xs text-muted-foreground">
                {mentorsCount} مرشد، {learnersCount} متعلم
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-bookings">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الحجوزات</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-bookings-count">
                {bookingsLoading ? "..." : allBookings.length}
              </div>
              <p className="text-xs text-muted-foreground">
                {pendingBookings} قيد الانتظار
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-complaints">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الشكاوى</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-complaints-count">
                {complaintsLoading ? "..." : complaints.length}
              </div>
              <p className="text-xs text-muted-foreground">
                {pendingComplaints} تحتاج مراجعة
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="bookings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="bookings" data-testid="tab-bookings">الحجوزات</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">المستخدمين</TabsTrigger>
            <TabsTrigger value="experiences" data-testid="tab-experiences">
              التجارب {pendingExperiences > 0 && <Badge className="mr-2" variant="destructive">{pendingExperiences}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="complaints" data-testid="tab-complaints">
              الشكاوى {pendingComplaints > 0 && <Badge className="mr-2" variant="destructive">{pendingComplaints}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              الإعدادات
            </TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>إدارة الحجوزات</CardTitle>
                <CardDescription>جميع حجوزات المنصة</CardDescription>
              </CardHeader>
              <CardContent>
                {bookingsLoading ? (
                  <div className="text-center py-8">جاري التحميل...</div>
                ) : allBookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">لا توجد حجوزات</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">التجربة</TableHead>
                        <TableHead className="text-right">المتعلم</TableHead>
                        <TableHead className="text-right">المرشد</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                        <TableHead className="text-right">حالة الحجز</TableHead>
                        <TableHead className="text-right">حالة الدفع</TableHead>
                        <TableHead className="text-right">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allBookings.map((booking) => (
                        <TableRow key={booking.id} data-testid={`row-booking-${booking.id}`}>
                          <TableCell className="font-medium">{booking.experience?.title || 'غير معروف'}</TableCell>
                          <TableCell>{booking.learner?.name || 'غير معروف'}</TableCell>
                          <TableCell>{booking.mentor?.name || 'غير معروف'}</TableCell>
                          <TableCell>{new Date(booking.sessionDate).toLocaleDateString('ar-SA')}</TableCell>
                          <TableCell>{booking.totalAmount} ريال</TableCell>
                          <TableCell>
                            <Badge variant={
                              booking.status === 'completed' ? 'default' :
                              booking.status === 'confirmed' ? 'secondary' :
                              booking.status === 'pending' ? 'outline' :
                              booking.status === 'under_review' ? 'secondary' : 'destructive'
                            }>
                              {booking.status === 'pending' ? 'قيد الانتظار' :
                               booking.status === 'confirmed' ? 'مؤكد' :
                               booking.status === 'completed' ? 'مكتمل' :
                               booking.status === 'under_review' ? 'قيد المراجعة' :
                               booking.status === 'cancelled' ? 'ملغي' : 'مسترد'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              booking.paymentStatus === 'released' ? 'default' :
                              booking.paymentStatus === 'held' ? 'secondary' :
                              booking.paymentStatus === 'pending' ? 'outline' : 'destructive'
                            }>
                              {booking.paymentStatus === 'pending' ? 'معلق' :
                               booking.paymentStatus === 'held' ? 'محجوز' :
                               booking.paymentStatus === 'released' ? 'محول' : 'مسترد'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {booking.status === 'under_review' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => unsuspendBookingMutation.mutate(booking.id)}
                                  disabled={unsuspendBookingMutation.isPending}
                                  data-testid={`button-unsuspend-${booking.id}`}
                                >
                                  فك التعليق
                                </Button>
                              ) : (booking.status === 'pending' || booking.status === 'confirmed') ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => suspendBookingMutation.mutate(booking.id)}
                                    disabled={suspendBookingMutation.isPending}
                                    data-testid={`button-suspend-${booking.id}`}
                                  >
                                    تعليق
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => cancelBookingMutation.mutate(booking.id)}
                                    disabled={cancelBookingMutation.isPending}
                                    data-testid={`button-cancel-${booking.id}`}
                                  >
                                    إلغاء
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>إدارة المستخدمين</CardTitle>
                <CardDescription>جميع مستخدمي المنصة</CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="text-center py-8">جاري التحميل...</div>
                ) : allUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">لا يوجد مستخدمين</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الاسم</TableHead>
                        <TableHead className="text-right">البريد الإلكتروني</TableHead>
                        <TableHead className="text-right">الدور</TableHead>
                        <TableHead className="text-right">تاريخ التسجيل</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUsers.map((user) => (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                          <TableCell className="font-medium">{user.name || 'غير معروف'}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={
                              user.role === 'admin' ? 'default' :
                              user.role === 'mentor' ? 'secondary' : 'outline'
                            }>
                              {user.role === 'admin' ? 'إداري' :
                               user.role === 'mentor' ? 'مرشد' : 'متعلم'}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(user.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Experiences Tab */}
          <TabsContent value="experiences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>إدارة التجارب</CardTitle>
                <CardDescription>الموافقة على التجارب الجديدة ومراجعتها</CardDescription>
              </CardHeader>
              <CardContent>
                {experiencesLoading ? (
                  <div className="text-center py-8">جاري التحميل...</div>
                ) : allExperiences.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">لا توجد تجارب</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">العنوان</TableHead>
                        <TableHead className="text-right">الفئة</TableHead>
                        <TableHead className="text-right">السعر</TableHead>
                        <TableHead className="text-right">المدينة</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allExperiences.map((experience) => (
                        <TableRow key={experience.id} data-testid={`row-experience-${experience.id}`}>
                          <TableCell className="font-medium">{experience.title}</TableCell>
                          <TableCell>{experience.category}</TableCell>
                          <TableCell>{experience.price} ريال</TableCell>
                          <TableCell>{experience.city}</TableCell>
                          <TableCell>
                            <Badge variant={
                              experience.approvalStatus === 'approved' ? 'default' :
                              experience.approvalStatus === 'pending' ? 'secondary' : 'destructive'
                            }>
                              {experience.approvalStatus === 'approved' ? 'موافق عليها' :
                               experience.approvalStatus === 'pending' ? 'قيد المراجعة' : 'مرفوضة'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedExperience(experience)}
                                data-testid={`button-view-${experience.id}`}
                              >
                                عرض التفاصيل
                              </Button>
                              {experience.approvalStatus === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      approveExperienceMutation.mutate({ id: experience.id, status: 'approved' });
                                      setSelectedExperience(null);
                                    }}
                                    disabled={approveExperienceMutation.isPending}
                                    data-testid={`button-approve-${experience.id}`}
                                  >
                                    <CheckCircle className="h-4 w-4 ml-2" />
                                    موافقة
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      approveExperienceMutation.mutate({ id: experience.id, status: 'rejected' });
                                      setSelectedExperience(null);
                                    }}
                                    disabled={approveExperienceMutation.isPending}
                                    data-testid={`button-reject-${experience.id}`}
                                  >
                                    <XCircle className="h-4 w-4 ml-2" />
                                    رفض
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Complaints Tab */}
          <TabsContent value="complaints" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>إدارة الشكاوى</CardTitle>
                <CardDescription>مراجعة ومعالجة شكاوى المستخدمين</CardDescription>
              </CardHeader>
              <CardContent>
                {complaintsLoading ? (
                  <div className="text-center py-8">جاري التحميل...</div>
                ) : complaints.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">لا توجد شكاوى</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">العنوان</TableHead>
                        <TableHead className="text-right">الوصف</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {complaints.map((complaint) => (
                        <TableRow key={complaint.id} data-testid={`row-complaint-${complaint.id}`}>
                          <TableCell className="font-medium">{complaint.title}</TableCell>
                          <TableCell className="max-w-xs truncate">{complaint.description}</TableCell>
                          <TableCell>
                            <Badge variant={
                              complaint.status === 'resolved' ? 'default' :
                              complaint.status === 'in_review' ? 'secondary' :
                              complaint.status === 'closed' ? 'outline' : 'destructive'
                            }>
                              {complaint.status === 'pending' ? 'جديدة' :
                               complaint.status === 'in_review' ? 'قيد المراجعة' :
                               complaint.status === 'resolved' ? 'محلولة' : 'مغلقة'}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(complaint.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedComplaint(complaint);
                                setAdminNotes(complaint.adminNotes || "");
                              }}
                              data-testid={`button-review-complaint-${complaint.id}`}
                            >
                              مراجعة
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>إدارة المسؤولين</CardTitle>
                <CardDescription>أضف أو احذف حسابات المسؤولين</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add New Admin Email */}
                <div className="space-y-3">
                  <h3 className="font-semibold">إضافة مسؤول جديد</h3>
                  <p className="text-sm text-muted-foreground">
                    أدخل البريد الإلكتروني للمسؤول الجديد. سيحصل على صلاحيات كاملة عند تسجيل دخوله.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      data-testid="input-new-admin-email"
                      className="flex-1"
                    />
                    <Button
                      onClick={() => {
                        if (newAdminEmail.includes('@')) {
                          addAdminEmailMutation.mutate(newAdminEmail);
                        }
                      }}
                      disabled={addAdminEmailMutation.isPending || !newAdminEmail.includes('@')}
                      data-testid="button-add-admin-email"
                    >
                      إضافة
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-3">المسؤولين الحاليين</h3>
                  {emailsLoading ? (
                    <div className="text-center py-4 text-muted-foreground">جاري التحميل...</div>
                  ) : adminEmails.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">لا توجد حسابات مسؤول</div>
                  ) : (
                    <div className="space-y-2">
                      {adminEmails.map((email) => (
                        <div key={email} className="flex items-center justify-between p-3 bg-muted rounded-md" data-testid={`admin-email-${email}`}>
                          <div>
                            <p className="font-medium text-sm">{email}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeAdminEmailMutation.mutate(email)}
                            disabled={removeAdminEmailMutation.isPending || adminEmails.length === 1}
                            data-testid={`button-remove-admin-${email}`}
                          >
                            إزالة
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Important Note */}
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-2">ملاحظات مهمة:</h4>
                  <ul className="text-sm text-blue-900 dark:text-blue-100 space-y-1">
                    <li>• المسؤول الجديد يحتاج إلى تسجيل دخول باستخدام البريد المضاف</li>
                    <li>• سيحصل على صلاحيات كاملة تلقائياً عند أول دخول</li>
                    <li>• يجب الاحتفاظ بمسؤول واحد على الأقل في النظام</li>
                    <li>• التغييرات تسري فوراً بعد إضافة أو إزالة البريد</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Experience Details Dialog */}
        <Dialog open={!!selectedExperience} onOpenChange={() => setSelectedExperience(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-2xl">تفاصيل التجربة</DialogTitle>
              <DialogDescription>
                مراجعة كامل بيانات التجربة قبل اتخاذ القرار
              </DialogDescription>
            </DialogHeader>
            {selectedExperience && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">العنوان</h4>
                    <p className="font-medium">{selectedExperience.title}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">الفئة</h4>
                    <p>{selectedExperience.category}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">السعر</h4>
                    <p className="text-lg font-bold text-primary">{selectedExperience.price} ريال</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">المدينة</h4>
                    <p>{selectedExperience.city}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">حالة الموافقة</h4>
                    <Badge variant={
                      selectedExperience.approvalStatus === 'approved' ? 'default' :
                      selectedExperience.approvalStatus === 'pending' ? 'secondary' : 'destructive'
                    }>
                      {selectedExperience.approvalStatus === 'approved' ? 'موافق عليها' :
                       selectedExperience.approvalStatus === 'pending' ? 'قيد المراجعة' : 'مرفوضة'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">الوصف</h4>
                  <p className="text-sm leading-relaxed bg-muted p-4 rounded-md">
                    {selectedExperience.description}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">نقاط التعلم</h4>
                  <ul className="list-disc list-inside space-y-1 bg-muted p-4 rounded-md">
                    {selectedExperience.learningPoints.map((point, index) => (
                      <li key={index} className="text-sm">{point}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              {selectedExperience && selectedExperience.approvalStatus === 'pending' && (
                <>
                  <Button
                    onClick={() => {
                      approveExperienceMutation.mutate({ id: selectedExperience.id, status: 'approved' });
                      setSelectedExperience(null);
                    }}
                    disabled={approveExperienceMutation.isPending}
                    data-testid="button-approve-dialog"
                  >
                    <CheckCircle className="h-4 w-4 ml-2" />
                    موافقة على التجربة
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      approveExperienceMutation.mutate({ id: selectedExperience.id, status: 'rejected' });
                      setSelectedExperience(null);
                    }}
                    disabled={approveExperienceMutation.isPending}
                    data-testid="button-reject-dialog"
                  >
                    <XCircle className="h-4 w-4 ml-2" />
                    رفض التجربة
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => setSelectedExperience(null)}>
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Complaint Review Dialog */}
        <Dialog open={!!selectedComplaint} onOpenChange={() => setSelectedComplaint(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>مراجعة الشكوى</DialogTitle>
              <DialogDescription>{selectedComplaint?.title}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">الوصف:</label>
                <p className="text-sm text-muted-foreground mt-1">{selectedComplaint?.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium">ملاحظات الإدارة:</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="أضف ملاحظاتك هنا..."
                  className="mt-1"
                  data-testid="input-admin-notes"
                />
              </div>
              <div>
                <label className="text-sm font-medium">تغيير الحالة:</label>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => selectedComplaint && updateComplaintMutation.mutate({
                      id: selectedComplaint.id,
                      status: 'in_review',
                      notes: adminNotes
                    })}
                    disabled={updateComplaintMutation.isPending}
                    data-testid="button-status-in-review"
                  >
                    قيد المراجعة
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => selectedComplaint && updateComplaintMutation.mutate({
                      id: selectedComplaint.id,
                      status: 'resolved',
                      notes: adminNotes
                    })}
                    disabled={updateComplaintMutation.isPending}
                    data-testid="button-status-resolved"
                  >
                    محلولة
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => selectedComplaint && updateComplaintMutation.mutate({
                      id: selectedComplaint.id,
                      status: 'closed',
                      notes: adminNotes
                    })}
                    disabled={updateComplaintMutation.isPending}
                    data-testid="button-status-closed"
                  >
                    إغلاق
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedComplaint(null)} data-testid="button-cancel">
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
