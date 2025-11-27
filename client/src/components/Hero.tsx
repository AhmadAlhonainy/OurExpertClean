import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import heroImage from "@assets/generated_images/Mentorship_conversation_hero_image_7e52a15a.png";

export default function Hero() {
  return (
    <section className="relative h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-white mb-6">
          تعلم من تجارب الحياة الحقيقية
        </h1>
        <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
          احجز جلسات فردية مع مرشدين ذوي خبرة سلكوا الطريق الذي تسلكه. احصل على رؤى حقيقية لا يمكن أن توفرها سوى الخبرة الواقعية.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            size="lg"
            variant="default"
            className="text-lg px-8 py-6 bg-primary/90 backdrop-blur-sm hover:bg-primary"
            asChild
            data-testid="button-browse-experiences"
          >
            <Link href="/experiences">تصفح التجارب</Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-lg px-8 py-6 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20"
            asChild
            data-testid="button-become-mentor"
          >
            <Link href="/become-mentor">كن مرشداً</Link>
          </Button>
        </div>
        
        <p className="mt-8 text-white/80 text-sm">
          انضم إلى أكثر من 5,000 متعلم و 500 مرشد
        </p>
      </div>
    </section>
  );
}
