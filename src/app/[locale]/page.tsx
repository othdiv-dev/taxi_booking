import { db } from "@/db";
import { zones } from "@/db/schema";
import { eq } from "drizzle-orm";
import Header from "@/components/site/Header";
import Hero from "@/components/site/Hero";
import TrustBar from "@/components/site/TrustBar";
import HowItWorks from "@/components/site/HowItWorks";
import PricingSection from "@/components/site/PricingSection";
import GoogleReviews from "@/components/site/GoogleReviews";
import FAQ from "@/components/site/FAQ";
import Footer from "@/components/site/Footer";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const activeZones = await db.select().from(zones).where(eq(zones.isActive, true));
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <TrustBar />
        <HowItWorks />
        <PricingSection />
        <GoogleReviews />
        <FAQ />
      </main>
      <Footer zones={activeZones} />
    </div>
  );
}