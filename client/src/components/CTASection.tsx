import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function CTASection() {
  return (
    <section className="py-16 sm:py-20 bg-primary text-primary-foreground">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-display font-bold text-3xl sm:text-4xl mb-4">
          هل أنت مستعد لمشاركة تجربتك؟
        </h2>
        <p className="text-lg mb-8 text-primary-foreground/90 max-w-2xl mx-auto">
          حول رحلتك الفريدة إلى إرشاد قيّم. ساعد الآخرين على التعلم مما عشته بينما تكسب دخلاً حسب جدولك الخاص.
        </p>
        <Button
          size="lg"
          variant="secondary"
          className="text-lg px-8 py-6"
          asChild
          data-testid="button-create-listing"
        >
          <Link href="/become-mentor">أنشئ إعلانك</Link>
        </Button>
        <p className="mt-6 text-sm text-primary-foreground/80">
          الانضمام مجاني • ادفع فقط عند حجز الجلسات
        </p>
      </div>
    </section>
  );
}
