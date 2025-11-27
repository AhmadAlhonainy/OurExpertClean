import { Card } from "@/components/ui/card";
import { Briefcase, Plane, Palette, Code, Heart, TrendingUp, BookOpen, Wrench } from "lucide-react";

const categories = [
  { name: "الأعمال", icon: Briefcase, count: 127 },
  { name: "السفر والمغامرة", icon: Plane, count: 89 },
  { name: "الفنون الإبداعية", icon: Palette, count: 156 },
  { name: "التقنية", icon: Code, count: 203 },
  { name: "الصحة والعافية", icon: Heart, count: 94 },
  { name: "المالية", icon: TrendingUp, count: 78 },
  { name: "التعليم", icon: BookOpen, count: 112 },
  { name: "الصناعة", icon: Wrench, count: 45 },
];

export default function CategoryShowcase() {
  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-3xl sm:text-4xl mb-4">
            استكشف حسب التصنيف
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            ابحث عن مرشدين لديهم خبرة واقعية في مجال اهتمامك
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {categories.map((category) => (
            <Card
              key={category.name}
              className="p-6 hover-elevate cursor-pointer transition-all"
              data-testid={`card-category-${category.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <category.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">{category.name}</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                    {category.count} تجربة
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
