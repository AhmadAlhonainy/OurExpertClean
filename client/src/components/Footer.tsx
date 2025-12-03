import { Link } from "wouter";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

const footerLinks = {
  about: [
    { name: "من نحن", href: "/about" },
    { name: "كيف تعمل المنصة", href: "/how-it-works" },
    { name: "الثقة والأمان", href: "/trust-safety" },
    { name: "الوظائف", href: "/careers" },
  ],
  forMentors: [
    { name: "كن مرشداً", href: "/become-mentor" },
    { name: "موارد المرشدين", href: "/mentor-resources" },
    { name: "أفضل الممارسات", href: "/best-practices" },
    { name: "حاسبة الأرباح", href: "/earnings" },
  ],
  forLearners: [
    { name: "تصفح التجارب", href: "/experiences" },
    { name: "كيفية الحجز", href: "/how-to-book" },
    { name: "آراء العملاء", href: "/testimonials" },
    { name: "بطاقات الهدايا", href: "/gift-cards" },
  ],
  support: [
    { name: "مركز المساعدة", href: "/help" },
    { name: "اتصل بنا", href: "/contact" },
    { name: "سياسة الخصوصية", href: "/privacy" },
    { name: "شروط الخدمة", href: "/terms" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-card border-t">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-semibold mb-4">عن المنصة</h3>
            <ul className="space-y-2">
              {footerLinks.about.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-muted-foreground hover:text-foreground text-sm">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">للمرشدين</h3>
            <ul className="space-y-2">
              {footerLinks.forMentors.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-muted-foreground hover:text-foreground text-sm">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">للمتعلمين</h3>
            <ul className="space-y-2">
              {footerLinks.forLearners.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-muted-foreground hover:text-foreground text-sm">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">الدعم</h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-muted-foreground hover:text-foreground text-sm">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg tracking-tighter">eX</span>
              </div>
              <span className="font-display font-bold text-xl tracking-tight">expa</span>
            </div>

            <div className="flex items-center gap-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>

            <p className="text-muted-foreground text-sm">
              © 2024 expa. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
