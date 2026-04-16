"use client";

import { useState } from "react";
import DiscoverSidebar from "@/components/discover/DiscoverSidebar";
import DiscoverFeed from "@/components/discover/DiscoverFeed";
import DiscoverPeople from "@/components/discover/DiscoverPeople";
import DiscoverRightPanel from "@/components/discover/DiscoverRightPanel";

export default function DiscoverClient() {
  const [activeSection, setActiveSection] = useState("foryou");

  return (
    <div className="disc-wrapper">
      <DiscoverSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      {activeSection === "people" ? <DiscoverPeople /> : <DiscoverFeed />}
      <DiscoverRightPanel />
    </div>
  );
}
