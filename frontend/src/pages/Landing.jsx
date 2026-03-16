import LandingNavbar from "../components/landing/LandingNavbar";
import LandingHero from "../components/landing/LandingHero";
import LandingPricing from "../components/landing/LandingPricing";
import LandingFooter from "../components/landing/LandingFooter";

export default function Landing() {
  return (
    <div className="relative min-h-screen w-full font-sans bg-black selection:bg-blue-500/30">
      <LandingNavbar />

      {/* Scrollable Content Area */}
      <div className="relative z-10 w-full h-screen overflow-y-auto overflow-x-hidden scroll-smooth">
        <LandingHero />
        <LandingPricing />
        <LandingFooter />
      </div>

      {/* Animated Light Orbs for depth */}
      <div className="fixed top-[20%] left-[10%] w-[30vw] h-[30vw] min-w-[300px] min-h-[300px] bg-blue-500/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none opacity-50 animate-pulse z-0"></div>
      <div className="fixed bottom-[10%] right-[5%] w-[40vw] h-[40vw] min-w-[400px] min-h-[400px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none opacity-40 z-0"></div>
    </div>
  );
}
