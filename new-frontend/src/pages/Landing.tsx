import SmoothScrollProvider from '../components/landing/SmoothScrollProvider';
import HeroSection from '../components/landing/HeroSection';
import DNAFeatureJourney from '../components/landing/DNAFeatureJourney';
import ProductPresentation from '../components/landing/ProductPresentation';
import StatisticsSection from '../components/landing/StatisticsSection';
import BentoGrid from '../components/landing/BentoGrid';
import TestimonialsSection from '../components/landing/TestimonialsSection';
import TimelineSection from '../components/landing/TimelineSection';
import FinalCTA from '../components/landing/FinalCTA';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingFooter from '../components/landing/LandingFooter';

export default function Landing() {
  return (
    <SmoothScrollProvider>
      <div className="min-h-screen text-text-primary overflow-x-hidden" style={{ background: 'var(--bg-void)' }}>
        <LandingNavbar />
        <main>
          <HeroSection />
          <DNAFeatureJourney />
          <ProductPresentation />
          <StatisticsSection />
          <BentoGrid />
          <TestimonialsSection />
          <TimelineSection />
          <FinalCTA />
        </main>
        <LandingFooter />
      </div>
    </SmoothScrollProvider>
  );
}
