export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { createClient } from "@/lib/supabase-server"
import TopNav from "@/components/TopNav"
import ProfilePageClient from "./ProfilePageClient"
import "../profile.css"

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: profileId } = await params;
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const viewerId = user?.id || null;

  const { getProfileData } = await import('@/lib/server-fetchers');
  const profileData = await getProfileData(profileId, viewerId);

  return (
    <>
      <TopNav />
      <ProfilePageClient profileId={profileId} viewerId={viewerId} initialData={profileData} />
    </>
  )
}
