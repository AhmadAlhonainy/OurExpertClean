import { Button } from "@/components/ui/button";
import ExperienceCard from "./ExperienceCard";
import { Link } from "wouter";
import mentorAvatar1 from "@assets/stock_images/professional_headsho_8531e589.jpg";
import mentorAvatar2 from "@assets/stock_images/professional_headsho_67f92c98.jpg";
import mentorAvatar3 from "@assets/stock_images/professional_headsho_8cd774bb.jpg";

const experiences = [
  {
    id: "1",
    title: "تجربتي في افتتاح محل عطور في باريس",
    mentorName: "صوفي مارتن",
    mentorAvatar: mentorAvatar1,
    category: "الأعمال",
    price: 280,
    rating: 4.9,
    reviewCount: 23,
  },
  {
    id: "2",
    title: "كيف اشتريت معدات ثقيلة من الصين وبنيت شركة إنشاءات",
    mentorName: "جيمس تشن",
    mentorAvatar: mentorAvatar2,
    category: "الصناعة",
    price: 450,
    rating: 5.0,
    reviewCount: 18,
  },
  {
    id: "3",
    title: "رحلتي في بناء مشروع سياحة المغامرات بالطيران الشراعي",
    mentorName: "ماريا رودريغيز",
    mentorAvatar: mentorAvatar3,
    category: "السفر",
    price: 245,
    rating: 4.8,
    reviewCount: 31,
  },
];

export default function FeaturedExperiences() {
  return (
    <section className="py-16 sm:py-20 bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-3xl sm:text-4xl mb-4">
            التجارب المميزة
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            ابدأ التعلم من مرشدين عاشوا التجربة بأنفسهم
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {experiences.map((experience) => (
            <ExperienceCard key={experience.id} {...experience} />
          ))}
        </div>

        <div className="text-center">
          <Button variant="outline" size="lg" asChild data-testid="button-see-all">
            <Link href="/experiences">عرض جميع التجارب</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
