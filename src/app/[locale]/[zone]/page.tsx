import { db } from "@/db";
import { zones } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import TrustBar from "@/components/site/TrustBar";
import HowItWorks from "@/components/site/HowItWorks";
import PricingSection from "@/components/site/PricingSection";
import BookingForm from "@/components/BookingForm";

export const dynamic = "force-dynamic";

async function getZone(slug: string) {
  const [zone] = await db.select().from(zones).where(eq(zones.slug, slug));
  if (!zone || !zone.isActive) return null;
  return zone;
}

export async function generateMetadata({ params }: { params: Promise<{ zone: string }> }): Promise<Metadata> {
  const { zone: slug } = await params;
  const zone = await getZone(slug);

  if (!zone) return {};

  return {
    title: zone.metaTitle || `Taxi ${zone.name} | Réservation en ligne`,
    description:
      zone.metaDescription ||
      `Réservez votre taxi pour ${zone.name} en 2 minutes. Prix fixe : 4€ + 2,50€/km. Paiement sécurisé, chauffeurs vérifiés.`,
  };
}

export default async function ZonePage({ params }: { params: Promise<{ zone: string }> }) {
  const { zone: slug } = await params;
  const zone = await getZone(slug);
  if (!zone) notFound();

  const activeZones = await db.select().from(zones).where(eq(zones.isActive, true));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TaxiService",
    name: `CityTaxi ${zone.name}`,
    areaServed: zone.name,
    priceRange: "€€",
  };

  return (
    <div className="min-h-screen bg-white">
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />

      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900 px-4 py-16 text-white sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-block rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-300">
              Service disponible 24h/24
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
              {zone.headline || `Taxi ${zone.name}`}
            </h1>
            <p className="mt-4 max-w-lg text-lg text-slate-300">
              {zone.description ||
                `Réservez votre taxi pour ${zone.name} en 2 minutes. Prix fixe : 4€ de prise en charge + 2,50€/km.`}
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="rounded-full bg-white/10 px-3 py-1">4€ de prise en charge</span>
              <span className="rounded-full bg-white/10 px-3 py-1">2,50€ / km</span>
              <span className="rounded-full bg-white/10 px-3 py-1">{zone.name}</span>
            </div>
          </div>

          <div id="reserver" className="scroll-mt-24">
            <BookingForm zoneSlug={zone.slug} defaultPickup={zone.name} />
          </div>
        </div>
      </section>

      <TrustBar />
      <HowItWorks />
      <PricingSection />
      <Footer zones={activeZones} />
    </div>
  );
}
