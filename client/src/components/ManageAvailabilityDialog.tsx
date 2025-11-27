import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Experience, Availability } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Clock, Trash2, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

// Generate time slots every 30 minutes (00:00, 00:30, 01:00, ...)
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    slots.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

interface ManageAvailabilityDialogProps {
  experience: Experience;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ManageAvailabilityDialog({
  experience,
  open,
  onOpenChange,
}: ManageAvailabilityDialogProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const { data: availability, isLoading } = useQuery<Availability[]>({
    queryKey: ['/api/experiences', experience.id, 'availability'],
    enabled: open && !!experience.id,
  });

  const addMutation = useMutation({
    mutationFn: async (data: { date: Date }) => {
      return apiRequest('POST', `/api/experiences/${experience.id}/availability`, {
        date: data.date.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/experiences', experience.id, 'availability'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-experiences'] });
      toast({
        title: "تم إضافة الوقت",
        description: "تم إضافة الوقت المتاح بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error?.message || "حدث خطأ أثناء إضافة الوقت",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/availability/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/experiences', experience.id, 'availability'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-experiences'] });
      toast({
        title: "تم الحذف",
        description: "تم حذف الوقت المتاح بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error?.message || "حدث خطأ أثناء حذف الوقت",
        variant: "destructive",
      });
    },
  });

  const handleAddSlot = () => {
    if (!selectedDate || !startTime || !endTime) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار التاريخ ووقت البداية ووقت النهاية",
        variant: "destructive",
      });
      return;
    }

    // Validate that end time is after start time
    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTime.split(":").map(Number);
    const startMinutesTotal = startHours * 60 + startMinutes;
    const endMinutesTotal = endHours * 60 + endMinutes;

    if (endMinutesTotal <= startMinutesTotal) {
      toast({
        title: "خطأ",
        description: "يجب أن يكون وقت النهاية بعد وقت البداية",
        variant: "destructive",
      });
      return;
    }

    // Generate time slots every 30 minutes in the range
    const slots: Date[] = [];
    let currentMinutes = startMinutesTotal;
    
    while (currentMinutes < endMinutesTotal) {
      const hours = Math.floor(currentMinutes / 60);
      const minutes = currentMinutes % 60;
      const dateTime = new Date(selectedDate);
      dateTime.setHours(hours, minutes, 0, 0);
      slots.push(dateTime);
      currentMinutes += 30; // Add 30 minutes
    }

    // Add all slots
    Promise.all(slots.map(date => addMutation.mutateAsync({ date })))
      .then(() => {
        setStartTime("");
        setEndTime("");
        setSelectedDate(undefined);
      })
      .catch(() => {
        // Error already handled by mutation
      });
  };

  const groupedAvailability = availability?.reduce((acc, slot) => {
    const dateKey = format(new Date(slot.date), "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(slot);
    return acc;
  }, {} as Record<string, Availability[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl">إدارة الأوقات المتاحة</DialogTitle>
          <DialogDescription>
            أضف أو احذف الأوقات المتاحة للحجز لتجربة "{experience.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                إضافة وقت متاح جديد
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label>اختر التاريخ</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    locale={ar}
                    className="rounded-md border mt-2"
                    data-testid="calendar-availability"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="start-time">من الساعة</Label>
                    <Select value={startTime} onValueChange={setStartTime}>
                      <SelectTrigger className="mt-2" data-testid="select-start-time">
                        <SelectValue placeholder="البداية" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {TIME_SLOTS.map((slot) => (
                          <SelectItem key={slot} value={slot}>
                            {slot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="end-time">إلى الساعة</Label>
                    <Select value={endTime} onValueChange={setEndTime}>
                      <SelectTrigger className="mt-2" data-testid="select-end-time">
                        <SelectValue placeholder="النهاية" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {TIME_SLOTS.map((slot) => (
                          <SelectItem key={slot} value={slot}>
                            {slot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleAddSlot}
                  disabled={!selectedDate || !startTime || !endTime || addMutation.isPending}
                  className="w-full"
                  data-testid="button-add-slot"
                >
                  {addMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      جاري الإضافة...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 ml-2" />
                      إضافة الوقت
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              الأوقات المتاحة ({availability?.length || 0})
            </h3>

            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !groupedAvailability || Object.keys(groupedAvailability).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">لا توجد أوقات متاحة بعد</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    قم بإضافة أوقات جديدة لتمكين الحجوزات
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {Object.entries(groupedAvailability)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([dateKey, slots]) => (
                    <Card key={dateKey}>
                      <CardContent className="p-4">
                        <div className="font-medium mb-3 flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4" />
                          {format(new Date(dateKey), "d MMMM yyyy", { locale: ar })}
                        </div>
                        <div className="space-y-2">
                          {slots
                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                            .map((slot) => (
                              <div
                                key={slot.id}
                                className={`flex items-center justify-between gap-2 p-2 rounded-md ${
                                  slot.isBooked ? 'bg-muted/30' : 'bg-muted/50'
                                }`}
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <Clock className="w-3 h-3 text-muted-foreground" />
                                  <span className={`text-sm font-medium ${slot.isBooked ? 'text-muted-foreground' : ''}`}>
                                    {format(new Date(slot.date), "h:mm a", { locale: ar })}
                                  </span>
                                  {slot.isBooked && (
                                    <Badge variant="secondary" className="text-xs">
                                      محجوز
                                    </Badge>
                                  )}
                                </div>
                                {!slot.isBooked && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => deleteMutation.mutate(slot.id)}
                                    disabled={deleteMutation.isPending}
                                    data-testid={`button-delete-${slot.id}`}
                                    className="h-7 w-7"
                                  >
                                    <Trash2 className="w-3 h-3 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
