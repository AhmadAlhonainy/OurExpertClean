import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ExpertSearch from "@/components/ExpertSearch";
import FeaturedExperiences from "@/components/FeaturedExperiences";
import HowItWorks from "@/components/HowItWorks";
import MentorSpotlight from "@/components/MentorSpotlight";
import Stats from "@/components/Stats";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-16">
        <Hero />
        <ExpertSearch />
        <FeaturedExperiences />
        <HowItWorks />
        <Stats />
        <MentorSpotlight />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
