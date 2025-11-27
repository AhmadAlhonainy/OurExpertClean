import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { Link } from "wouter";

interface ExperienceCardProps {
  id: string;
  title: string;
  mentorName: string;
  mentorAvatar: string;
  category: string;
  price: number;
  rating: number;
  reviewCount: number;
  imageUrl?: string;
}

export default function ExperienceCard({
  id,
  title,
  mentorName,
  mentorAvatar,
  category,
  price,
  rating,
  reviewCount,
  imageUrl,
}: ExperienceCardProps) {
  return (
    <Link href={`/experience/${id}`}>
      <Card className="overflow-hidden hover-elevate cursor-pointer transition-all h-full" data-testid={`card-experience-${id}`}>
        <div className="relative aspect-video bg-muted">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute bottom-3 right-3">
            <Avatar className="w-12 h-12 border-2 border-background">
              <AvatarImage src={mentorAvatar} alt={mentorName} />
              <AvatarFallback>{mentorName[0]}</AvatarFallback>
            </Avatar>
          </div>
        </div>
        
        <CardContent className="p-4">
          <Badge variant="secondary" className="mb-2 text-xs">
            {category}
          </Badge>
          
          <h3 className="font-semibold text-lg line-clamp-2 mb-2">
            {title}
          </h3>
          
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium text-sm">{rating.toFixed(1)}</span>
              <span className="text-muted-foreground text-sm">({reviewCount})</span>
            </div>
            
            <div>
              <span className="font-bold text-lg">{price} ريال</span>
              <span className="text-muted-foreground text-sm"> /جلسة</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
