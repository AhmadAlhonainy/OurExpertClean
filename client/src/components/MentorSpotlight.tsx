import { Button } from "@/components/ui/button";
import { Quote } from "lucide-react";
import { Link } from "wouter";
import mentorAvatar1 from "@assets/stock_images/professional_headsho_8d625c14.jpg";
import mentorAvatar2 from "@assets/stock_images/professional_headsho_79e9039c.jpg";

const mentors = [
  {
    id: "1",
    name: "د. سارة جونسون",
    title: "رائدة أعمال في القطاع الصحي",
    image: mentorAvatar1,
    quote: "مشاركة رحلتي من ممرضة إلى صاحبة عيادة كانت تجربة مجزية للغاية. أحب مساعدة الآخرين على تجنب الأخطاء التي ارتكبتها.",
    experienceCount: 12,
  },
  {
    id: "2",
    name: "ماركوس ويليامز",
    title: "مؤسس شركة ناشئة في التقنية",
    image: mentorAvatar2,
    quote: "مررت بثلاث شركات ناشئة - واحدة فشلت، وواحدة استُحوذ عليها، وواحدة مزدهرة. كل منها علمتني شيئاً قيماً أشاركه الآن مع رواد الأعمال الطموحين.",
    experienceCount: 8,
  },
];

export default function MentorSpotlight() {
  return (
    <section className="py-16 sm:py-20 bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-3xl sm:text-4xl mb-4">
            تعرف على مرشدينا
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            أشخاص حقيقيون بتجارب حقيقية، مستعدون لإرشادك
          </p>
        </div>

        <div className="space-y-12">
          {mentors.map((mentor, index) => (
            <div
              key={mentor.id}
              className={`flex flex-col ${
                index % 2 === 0 ? "md:flex-row-reverse" : "md:flex-row"
              } gap-8 items-center`}
            >
              <div className="flex-1">
                <img
                  src={mentor.image}
                  alt={mentor.name}
                  className="w-full max-w-md mx-auto rounded-xl aspect-square object-cover"
                />
              </div>
              
              <div className="flex-1 space-y-4">
                <Quote className="w-12 h-12 text-primary/20" />
                <p className="text-lg italic text-muted-foreground">
                  "{mentor.quote}"
                </p>
                <div>
                  <h3 className="font-display font-bold text-2xl">{mentor.name}</h3>
                  <p className="text-muted-foreground">{mentor.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {mentor.experienceCount} تجربة مشتركة
                  </p>
                </div>
                <Button variant="outline" asChild data-testid={`button-view-profile-${mentor.id}`}>
                  <Link href={`/mentor/${mentor.id}`}>عرض الملف الشخصي</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
