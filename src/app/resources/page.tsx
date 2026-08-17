import type { Metadata } from "next";
import ResourcesPageClient from "./ResourcesPageClient";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Resources — Campus Resource Hub | Kinexis",
  description:
    "Find all essential SNU resources in one place — GPA calculators, campus maps, course guides, professor offices, lab locations, and more.",
  openGraph: {
    title: "Resources — Campus Resource Hub | Kinexis",
    description:
      "Every tool, document, and link you need across your SNU journey.",
    url: "https://kinexis.in/resources",
    siteName: "Kinexis",
    type: "website",
  },
};

export default function ResourcesPage() {
  return <ResourcesPageClient />;
}
