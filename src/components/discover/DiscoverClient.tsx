"use client";

import { useState, useCallback } from "react";
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
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchNavigate = useCallback((query: string) => {
    setSearchQuery(query);
    setActiveSection("people");
  }, []);

  const handleSectionChange = useCallback((id: string) => {
    setActiveSection(id);
    // Clear search when manually switching sections
    if (id !== "people") {
      setSearchQuery("");
    }
  }, []);

  return (
    <div className="disc-wrapper">
      <DiscoverSidebar 
        activeSection={activeSection} 
        onSectionChange={handleSectionChange}
        userId={userId}
        initialActivity={initialData.initialActivity} 
      />
      {activeSection === "people" ? (
        <DiscoverPeople initialData={initialData} userId={userId} initialSearchQuery={searchQuery} />
      ) : (
        <DiscoverFeed initialData={initialData} userId={userId} onSearchNavigate={handleSearchNavigate} />
      )}
      <DiscoverRightPanel initialData={initialData} userId={userId} />
    </div>
  );
}
