"use client";

import { useState } from "react";
import DiscoverSidebar from "@/components/discover/DiscoverSidebar";
import DiscoverFeed from "@/components/discover/DiscoverFeed";
import DiscoverPeople from "@/components/discover/DiscoverPeople";
import DiscoverRightPanel from "@/components/discover/DiscoverRightPanel";

interface Props {
  initialData: any;
  userId: string;
}

export default function DiscoverClient({ initialData, userId }: Props) {
  const [activeSection, setActiveSection] = useState("foryou");

  return (
    <div className="disc-wrapper">
      <DiscoverSidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection}
        userId={userId}
        initialActivity={initialData.initialActivity} 
      />
      {activeSection === "people" ? (
        <DiscoverPeople initialData={initialData} userId={userId} />
      ) : (
        <DiscoverFeed initialData={initialData} userId={userId} />
      )}
      <DiscoverRightPanel initialData={initialData} userId={userId} />
    </div>
  );
}
