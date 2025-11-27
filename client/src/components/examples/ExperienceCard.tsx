import ExperienceCard from '../ExperienceCard'
import mentorAvatar from '@assets/stock_images/professional_headsho_8531e589.jpg'

export default function ExperienceCardExample() {
  return (
    <div className="max-w-sm">
      <ExperienceCard
        id="1"
        title="My experience opening a perfume shop in Paris"
        mentorName="Sophie Martin"
        mentorAvatar={mentorAvatar}
        category="Business"
        price={75}
        rating={4.9}
        reviewCount={23}
      />
    </div>
  )
}
