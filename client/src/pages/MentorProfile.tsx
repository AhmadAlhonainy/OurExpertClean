import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, MapPin, User, Mail, Briefcase } from "lucide-react";
import BackButton from "@/components/BackButton";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import type { Experience, Review } from "@shared/schema";

export default function MentorProfile() {
  const { id } = useParams();
  const [, navigate] = useLocation();

  // Fetch mentor details
  const { data: mentor, isLoading: mentorLoading } = useQuery<any>({
    queryKey: [`/api/users/${id}`],
    enabled: !!id,
  });

  // Fetch mentor's experiences
  const { data: experiences = [], isLoading: expLoading } = useQuery<Experience[]>({
    queryKey: ["/api/experiences/by-mentor", id],
    queryFn: async () => {
      const response = await fetch(`/api/experiences?mentorId=${id}`);
      if (!response.ok) throw new Error("Failed to fetch experiences");
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch mentor's reviews (all reviews from all experiences)
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: [`/api/reviews/mentor/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/reviews?mentorId=${id}`);
      if (!response.ok) throw new Error("Failed to fetch reviews");
      return response.json();
    },
    enabled: !!id,
  });

  // Calculate mentor rating
  const avgRating =
    reviews.length > 0 ? Math.round((reviews.reduce((sum: number, r: Review) => sum + r.rating, 0) / reviews.length) * 10) / 10 : 0;

  if (mentorLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 py-8">
          <div className="container">جاري التحميل...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 py-8">
          <div className="container">لم يتم العثور على الملف الشخصي</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 py-8">
        <div className="container">
          {/* Back Button */}
          <div className="mb-4">
            <BackButton />
          </div>
          
          {/* Profile Header */}
          <div className="bg-gradient-to-b from-primary/5 to-background rounded-lg border mb-8 p-8">
            <div className="flex items-start gap-6 mb-6">
              <Avatar className="h-24 w-24" data-testid="img-mentor-profile-avatar">
                <AvatarImage src={mentor.profileImage} />
                <AvatarFallback>
                  <User className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2" data-testid="text-mentor-profile-name">
                  {mentor.fullName || mentor.email}
                </h1>
                <p className="text-lg text-muted-foreground mb-4" data-testid="text-mentor-profile-bio">
                  {mentor.bio || "خبير في مجاله"}
                </p>

                {/* Rating */}
                {reviews.length > 0 && (
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.round(avgRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                          }`}
                        />
                      ))}
                      <span className="ml-2 font-semibold">{avgRating}</span>
                    </div>
                    <span className="text-sm text-muted-foreground" data-testid="text-mentor-reviews-count">
                      {reviews.length} تقييم
                    </span>
                  </div>
                )}

                {/* Contact Info */}
                <div className="flex flex-wrap gap-4">
                  {mentor.email && (
                    <div className="flex items-center gap-2 text-sm" data-testid="text-mentor-email">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{mentor.email}</span>
                    </div>
                  )}
                  {mentor.city && (
                    <div className="flex items-center gap-2 text-sm" data-testid="text-mentor-city">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{mentor.city}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Experiences Section */}
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Briefcase className="h-6 w-6" />
              <h2 className="text-2xl font-bold">
                التجارب ({experiences.length})
              </h2>
            </div>

            {expLoading ? (
              <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
            ) : experiences.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  لم ينشر هذا الخبير أي تجارب بعد
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {experiences.map((exp) => (
                  <Card
                    key={exp.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => navigate(`/experience/${exp.id}`)}
                    data-testid={`card-mentor-experience-${exp.id}`}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg line-clamp-2" data-testid="text-experience-title">
                        {exp.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2" data-testid="text-experience-desc">
                        {exp.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">السعر:</span>
                          <span className="font-semibold text-primary" data-testid="text-experience-price">
                            {exp.price} ريال
                          </span>
                        </div>
                        {exp.category && (
                          <Badge variant="outline" data-testid="badge-experience-category">
                            {exp.category}
                          </Badge>
                        )}
                        {exp.city && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{exp.city}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Reviews Section */}
          <div>
            <h2 className="text-2xl font-bold mb-6">
              التقييمات ({reviews.length})
            </h2>

            {reviewsLoading ? (
              <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
            ) : reviews.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  لا توجد تقييمات بعد
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id} data-testid={`card-mentor-review-${review.id}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">متعلم</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2" data-testid={`text-mentor-review-comment-${review.id}`}>
                        {review.comment}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(review.createdAt), "d MMMM yyyy", { locale: ar })}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
