import { Search, Calendar, MessageSquare } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "ابحث عن مرشدك",
    description: "تصفح التجارب وابحث عن مرشدين سلكوا نفس طريقك",
  },
  {
    icon: Calendar,
    title: "احجز جلسة",
    description: "اختر الوقت المناسب لك واحجز مكانك",
  },
  {
    icon: MessageSquare,
    title: "تعلم وتطور",
    description: "احصل على رؤى حقيقية من تجارب واقعية",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-3xl sm:text-4xl mb-4">
            كيف تعمل المنصة
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            ثلاث خطوات بسيطة للتعلم من تجارب حقيقية
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 right-1/2 w-full h-0.5 bg-border z-0" />
              )}
              
              <div className="relative z-10 text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-xl mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
