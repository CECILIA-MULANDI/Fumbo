import { SiteNav } from "@/components/landing/site-nav";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { RevealMoment } from "@/components/landing/reveal-moment";
import { PrivacyColumns } from "@/components/landing/privacy-columns";
import { DevSection } from "@/components/landing/dev-section";
import { Faq } from "@/components/landing/faq";
import { SiteFooter } from "@/components/landing/site-footer";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <HowItWorks />
        <RevealMoment />
        <PrivacyColumns />
        <DevSection />
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}
