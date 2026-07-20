import type { Metadata } from "next";

import { HomepageBenefits } from "@/components/marketing/homepage-benefits";
import { HomepageComparison } from "@/components/marketing/homepage-comparison";
import { HomepageHero } from "@/components/marketing/homepage-hero";
import { HomepageHowItWorks } from "@/components/marketing/homepage-how-it-works";
import { HomepageRoadmap } from "@/components/marketing/homepage-roadmap";

export const metadata: Metadata = {
  title: "IndexPilot — Google Indexing Management",
  description:
    "Inspect URLs, monitor Google indexing status, and manage indexing across all your websites from one dashboard.",
};

export default function MarketingHomePage() {
  return (
    <>
      <HomepageHero />
      <HomepageBenefits />
      <HomepageComparison />
      <HomepageHowItWorks />
      <HomepageRoadmap />
    </>
  );
}
