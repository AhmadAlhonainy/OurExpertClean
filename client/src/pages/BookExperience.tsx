import { Link } from "wouter";
import { useExperienceSearch } from "@/hooks/useExperienceSearch";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { MapPin, Star, User, Search, Sparkles, Lightbulb } from "lucide-react";

export default function BookExperience() {
  const { searchQuery, setSearchQuery, experiences, isLoading, clearSearch } = useExperienceSearch({
    queryKeyPrefix: 'booking'
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Hero Search Section */}
          <div className="mb-12 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
              <h1
                className="text-4xl sm:text-5xl font-bold"
                style={{ fontFamily: "Sora" }}
                data-testid="heading-book"
              >
                ابحث عن خبير
              </h1>
            </div>
            <p className="text-muted-foreground text-lg mb-8">
              اكتب ما تبحث عنه وسنساعدك في إيجاد المرشد المناسب
            </p>

            {/* Smart Search Box */}
            <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder='مثال: "أريد مرشد من روسيا" أو "تجربة في السفر" أو "خبير في الرياض"'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-16 pr-12 text-lg rounded-2xl shadow-lg border-2 hover:border-primary/50 focus:border-primary transition-colors"
                  data-testid="input-search"
                />
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-3">
                <Lightbulb className="w-4 h-4" />
                <p>جرّب البحث عن مدينة، مجال، أو اكتب سؤالك بحرية</p>
              </div>
            </form>
          </div>

          {/* Search Results */}
          <div>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                <p className="text-muted-foreground mt-4">جاري البحث...</p>
              </div>
            ) : experiences.length === 0 ? (
              <Card className="max-w-2xl mx-auto">
                <CardContent className="py-16 text-center">
                  {searchQuery ? (
                    <>
                      <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-xl font-semibold mb-2">
                        لم نجد نتائج لـ "{searchQuery}"
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        جرّب البحث بكلمات مختلفة أو تصفح جميع التجارب المتاحة
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={clearSearch}
                        data-testid="button-clear-search"
                      >
                        عرض جميع التجارب
                      </Button>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary" />
                      <h3 className="text-xl font-semibold mb-2">
                        ابدأ بالبحث عن تجربة
                      </h3>
                      <p className="text-muted-foreground">
                        استخدم مربع البحث أعلاه للعثور على المرشد المثالي
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">
                    {searchQuery ? `نتائج البحث (${experiences.length})` : `جميع التجارب المتاحة (${experiences.length})`}
                  </h2>
                  {searchQuery && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={clearSearch}
                      data-testid="button-clear-filter"
                    >
                      مسح البحث
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {experiences.map((experience) => (
                    <Link key={experience.id} href={`/experience/${experience.id}`}>
                      <Card
                        className="hover-elevate cursor-pointer transition-all"
                        data-testid={`card-experience-${experience.id}`}
                      >
                        <CardHeader>
                          <div className="flex items-start gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback>
                                <User className="h-6 w-6" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg mb-1 line-clamp-2">
                                {experience.title}
                              </CardTitle>
                              <CardDescription className="flex items-center gap-2">
                                <MapPin className="w-3 h-3" />
                                {experience.city}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Badge variant="secondary" className="mb-3">
                            {experience.category}
                          </Badge>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                            {experience.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">5.0</span>
                            </div>
                            <div className="text-lg font-bold text-primary">
                              {experience.price} ريال
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
