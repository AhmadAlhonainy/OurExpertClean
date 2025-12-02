import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calendar as CalendarIcon, Plus, X, Loader2, CreditCard, AlertTriangle } from "lucide-react";
import BackButton from "@/components/BackButton";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface StripeConnectStatus {
  connected: boolean;
  accountId: string | null;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  detailsSubmitted?: boolean;
}

const categories = [
  "تجربة تجارية",
  "تجربة حياتية",
  "تجربة حياتيه",
  "الأعمال",
  "السفر والمغامرة",
  "الفنون الإبداعية",
  "التقنية",
  "الصحة والعافية",
  "المالية",
  "التعليم",
  "الصناعة",
];

const cities = [
  "الكل",
  "الرياض",
  "جدة",
  "الدمام",
  "مكة المكرمة",
  "المدينة المنورة",
  "الخبر",
  "الطائف",
  "تبوك",
  "أبها",
  "القطيف",
  "نجران",
  "الجوف",
  "حائل",
  "الباحة",
  "عرعر",
  "سكاكا",
  "رفحاء",
  "الأحساء",
  "بريدة",
  "حفر الباطن",
];


export default function CreateExperience() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    price: "",
    description: "",
    learningPoints: [""],
    cities: [] as string[],
  });

  const [availableDates, setAvailableDates] = useState<{date: Date, period: 'morning' | 'evening'}[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedPeriod, setSelectedPeriod] = useState<'morning' | 'evening'>('morning');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [skippedStripeCheck, setSkippedStripeCheck] = useState(false);

  // Check Stripe Connect status for mentors
  const { data: stripeStatus, isLoading: stripeLoading } = useQuery<StripeConnectStatus>({
    queryKey: ['/api/stripe/connect/status'],
    enabled: isAuthenticated && user?.role === 'mentor',
  });

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log("⛔ غير مسجل دخول - جاري التحويل لصفحة تسجيل الدخول");
      setLocation("/signin");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  const addLearningPoint = () => {
    setFormData({
      ...formData,
      learningPoints: [...formData.learningPoints, ""],
    });
  };

  const removeLearningPoint = (index: number) => {
    const newPoints = formData.learningPoints.filter((_, i) => i !== index);
    setFormData({ ...formData, learningPoints: newPoints });
  };

  const updateLearningPoint = (index: number, value: string) => {
    const newPoints = [...formData.learningPoints];
    newPoints[index] = value;
    setFormData({ ...formData, learningPoints: newPoints });
  };

  const addAvailableDate = () => {
    if (selectedDate) {
      // Check if this date+period combination already exists
      const exists = availableDates.some(
        d => d.date.toDateString() === selectedDate.toDateString() && d.period === selectedPeriod
      );
      
      if (!exists) {
        // Set time based on period: morning = 09:00, evening = 17:00
        const dateWithTime = new Date(selectedDate);
        dateWithTime.setHours(selectedPeriod === 'morning' ? 9 : 17, 0, 0, 0);
        
        setAvailableDates([...availableDates, { date: dateWithTime, period: selectedPeriod }]);
        setSelectedDate(undefined);
      }
    }
  };

  const removeAvailableDate = (index: number) => {
    setAvailableDates(availableDates.filter((_, i) => i !== index));
  };

  // Create experience mutation
  const createExperienceMutation = useMutation({
    mutationFn: async (data: typeof formData & { availableDates: {date: Date, period: 'morning' | 'evening'}[] }) => {
      // First, convert to mentor if not already
      if (user && user.role !== 'mentor' && user.role !== 'admin') {
        await apiRequest('POST', `/api/users/${user.id}/become-mentor`);
        // Refresh user data after becoming mentor
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        // Wait a bit for the session to update
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Validate at least one city is selected
      if (!data.cities || data.cities.length === 0) {
        throw new Error('يجب اختيار مدينة واحدة على الأقل');
      }

      // Create the experience
      const response = await apiRequest('POST', '/api/experiences', {
        title: data.title,
        category: data.category,
        price: parseFloat(data.price),
        description: data.description,
        learningPoints: data.learningPoints.filter(p => p.trim() !== ''),
        cities: data.cities,
      });
      
      const experience = await response.json();
      
      // Create availability slots
      if (data.availableDates.length > 0) {
        await Promise.all(
          data.availableDates.map(slot =>
            apiRequest('POST', `/api/experiences/${experience.id}/availability`, {
              date: slot.date.toISOString(),
            })
          )
        );
      }
      
      return experience;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "تم إرسال التجربة بنجاح!",
        description: "سيتم مراجعتها من قبل الإدارة وإشعارك عند الموافقة عليها",
      });
      setLocation('/dashboard/mentor');
    },
    onError: (error: Error) => {
      toast({
        title: "حدث خطأ",
        description: error.message || "فشل إنشاء التجربة، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title || !formData.category || !formData.price || !formData.description) {
      toast({
        title: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }
    
    // Minimum price validation (2 SAR)
    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 2) {
      toast({
        title: "السعر غير صالح",
        description: "الحد الأدنى للسعر هو 2 ريال سعودي",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.learningPoints.filter(p => p.trim() !== '').length === 0) {
      toast({
        title: "يرجى إضافة نقطة تعلم واحدة على الأقل",
        variant: "destructive",
      });
      return;
    }
    
    if (availableDates.length === 0) {
      toast({
        title: "يرجى إضافة تاريخ واحد على الأقل",
        variant: "destructive",
      });
      return;
    }
    
    createExperienceMutation.mutate({ ...formData, availableDates });
  };

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-pulse text-4xl">⏳</div>
            <p className="text-muted-foreground text-lg">جاري التحقق من تسجيل الدخول...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Show redirect message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="text-6xl">🔒</div>
            <p className="text-xl font-semibold">يجب تسجيل الدخول أولاً</p>
            <p className="text-muted-foreground">جاري التحويل لصفحة تسجيل الدخول...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Show loading while checking Stripe status for mentors
  if (user?.role === 'mentor' && stripeLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground text-lg">جاري التحقق من حالة حساب الدفع...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Show Stripe Connect requirement for mentors (including when status check failed)
  // Allow skipping if user chose to skip
  if (user?.role === 'mentor' && (!stripeStatus || !stripeStatus.connected) && !skippedStripeCheck) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mb-4">
                  <CreditCard className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-2xl">ربط حساب الدفع مطلوب</CardTitle>
                <CardDescription className="text-base">
                  قبل إنشاء تجربة جديدة، يجب عليك ربط حسابك في Stripe لاستلام المدفوعات من المتعلمين
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/50 rounded-lg p-4 text-right">
                  <h4 className="font-medium mb-2">لماذا أحتاج لربط Stripe؟</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>- لاستلام 80% من قيمة كل جلسة مباشرة في حسابك</li>
                    <li>- التحويلات تتم تلقائياً بعد انتهاء الجلسة</li>
                    <li>- حماية أموالك من خلال نظام الضمان</li>
                  </ul>
                </div>
                
                <Link href="/mentor/stripe-connect">
                  <Button size="lg" className="w-full" data-testid="button-connect-stripe-create">
                    <CreditCard className="h-5 w-5 ml-2" />
                    ربط حساب Stripe الآن
                  </Button>
                </Link>
                
                <p className="text-sm text-muted-foreground">
                  العملية تستغرق دقائق قليلة فقط
                </p>
                
                <Button 
                  variant="ghost" 
                  className="w-full text-muted-foreground"
                  onClick={() => setSkippedStripeCheck(true)}
                  data-testid="button-skip-stripe"
                >
                  تخطي الآن وإكمال لاحقاً
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <div className="mb-4">
            <BackButton />
          </div>
          
          <div className="mb-8">
            <h1 className="font-display font-bold text-3xl sm:text-4xl mb-2">
              شارك تجربتك
            </h1>
            <p className="text-muted-foreground text-lg">
              ساعد الآخرين على التعلم من خبرتك العملية في لقاء وجهاً لوجه
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>معلومات التجربة الأساسية</CardTitle>
                <CardDescription>
                  أخبرنا عن تجربتك وما يمكن للآخرين تعلمه منها
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">عنوان التجربة *</Label>
                  <Input
                    id="title"
                    placeholder='مثال: "تجربتي في افتتاح محل عطور في الرياض"'
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="text-right"
                    required
                    data-testid="input-title"
                  />
                  <p className="text-sm text-muted-foreground">
                    اجعل العنوان واضحاً ومحدداً ليجذب المتعلمين
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">التصنيف *</Label>
                  {!isCustomCategory ? (
                    <Select
                      value={formData.category}
                      onValueChange={(value) => {
                        if (value === "custom") {
                          setIsCustomCategory(true);
                          setFormData({ ...formData, category: "" });
                        } else {
                          setFormData({ ...formData, category: value });
                        }
                      }}
                      required
                    >
                      <SelectTrigger id="category" data-testid="select-category">
                        <SelectValue placeholder="اختر التصنيف المناسب" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom" className="text-primary font-semibold">
                          + إضافة تصنيف جديد
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        id="custom-category"
                        placeholder="اكتب التصنيف الجديد..."
                        value={customCategory}
                        onChange={(e) => {
                          setCustomCategory(e.target.value);
                          setFormData({ ...formData, category: e.target.value });
                        }}
                        className="text-right flex-1"
                        required
                        data-testid="input-custom-category"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCustomCategory(false);
                          setCustomCategory("");
                          setFormData({ ...formData, category: "" });
                        }}
                        data-testid="button-cancel-custom-category"
                      >
                        إلغاء
                      </Button>
                    </div>
                  )}
                  {isCustomCategory && (
                    <p className="text-sm text-muted-foreground">
                      اكتب تصنيفاً يصف تجربتك بدقة
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">وصف التجربة *</Label>
                  <Textarea
                    id="description"
                    placeholder="اكتب وصفاً تفصيلياً عن تجربتك... ماذا فعلت؟ ما التحديات التي واجهتها؟ ما الذي تعلمته؟"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="min-h-[150px] text-right resize-none"
                    required
                    data-testid="textarea-description"
                  />
                  <p className="text-sm text-muted-foreground">
                    اكتب على الأقل 200 كلمة لمساعدة المتعلمين على فهم قيمة تجربتك
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>ما الذي سيتعلمه المشارك؟ *</Label>
                  <div className="space-y-3">
                    {formData.learningPoints.map((point, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder={`نقطة تعليمية ${index + 1}`}
                          value={point}
                          onChange={(e) => updateLearningPoint(index, e.target.value)}
                          className="text-right"
                          required
                          data-testid={`input-learning-point-${index}`}
                        />
                        {formData.learningPoints.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeLearningPoint(index)}
                            data-testid={`button-remove-point-${index}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addLearningPoint}
                      className="w-full"
                      data-testid="button-add-learning-point"
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      إضافة نقطة تعليمية
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>الموقع</CardTitle>
                <CardDescription>
                  اختر المدن التي ستقام فيها التجربة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>المدن *</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {cities.map((city) => (
                      <div key={city} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`city-${city}`}
                          checked={formData.cities.includes(city)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                cities: [...formData.cities, city]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                cities: formData.cities.filter(c => c !== city)
                              });
                            }
                          }}
                          data-testid={`checkbox-city-${city}`}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={`city-${city}`} className="font-normal cursor-pointer">
                          {city}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {formData.cities.length === 0 && (
                    <p className="text-sm text-destructive">يجب اختيار مدينة واحدة على الأقل</p>
                  )}
                  {formData.cities.length > 0 && (
                    <div className="mt-4 p-3 bg-primary/10 rounded-md">
                      <p className="text-sm font-medium mb-2">المدن المختارة:</p>
                      <div className="flex flex-wrap gap-2">
                        {formData.cities.map((city) => (
                          <span key={city} className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm">
                            {city}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>السعر والتوفر</CardTitle>
                <CardDescription>
                  حدد سعر الجلسة والأوقات المتاحة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="price">سعر الجلسة (ريال سعودي) *</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="250"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="text-right"
                    required
                    min="2"
                    data-testid="input-price"
                  />
                  <p className="text-sm text-muted-foreground">
                    الحد الأدنى 2 ريال. السعر المقترح للجلسات يتراوح بين 150-500 ريال حسب التخصص
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>الأيام المتاحة</Label>
                  <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="justify-start text-right font-normal"
                          data-testid="button-select-date"
                        >
                          <CalendarIcon className="ml-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP", { locale: ar }) : "اختر تاريخ"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={(date) => date < new Date()}
                          locale={ar}
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <Select
                      value={selectedPeriod}
                      onValueChange={(value: 'morning' | 'evening') => setSelectedPeriod(value)}
                    >
                      <SelectTrigger className="w-[140px]" data-testid="select-period">
                        <SelectValue placeholder="اختر الفترة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">صباحاً (9:00)</SelectItem>
                        <SelectItem value="evening">مساءً (5:00)</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button
                      type="button"
                      onClick={addAvailableDate}
                      disabled={!selectedDate}
                      data-testid="button-add-date"
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      إضافة التاريخ
                    </Button>
                  </div>
                  
                  {availableDates.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium">الأيام المتاحة:</p>
                      <div className="flex flex-wrap gap-2">
                        {availableDates.map((slot, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-md text-sm"
                            data-testid={`badge-date-${index}`}
                          >
                            {format(slot.date, "dd MMMM yyyy", { locale: ar })} - {slot.period === 'morning' ? 'صباحاً' : 'مساءً'}
                            <button
                              type="button"
                              onClick={() => removeAvailableDate(index)}
                              className="hover:bg-primary/20 rounded-full p-0.5"
                              data-testid={`button-remove-date-${index}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <Button
                type="button"
                variant="outline"
                size="lg"
                data-testid="button-save-draft"
              >
                حفظ كمسودة
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={createExperienceMutation.isPending}
                data-testid="button-publish"
              >
                {createExperienceMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                نشر التجربة
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
