import LandingPageClient from "./LandingPageClient";
import { getLandingPageData } from "@/lib/server-fetchers";

export const revalidate = 3600; // Cache for 1 hour

export default async function Page() {
  const data = await getLandingPageData();
  return <LandingPageClient initialData={data} />;
}
