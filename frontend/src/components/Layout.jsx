import React, { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import ProfileDialog from "./ProfileDialog";

export default function Layout({ children }) {
  const [profileOpen, setProfileOpen] = useState(false);
  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900">
      <Sidebar onOpenProfile={() => setProfileOpen(true)} />
      <main className="flex-1 min-w-0 flex flex-col">
        <TopBar onOpenProfile={() => setProfileOpen(true)} />
        <div className="px-8 md:px-12 pb-16 flex-1">{children}</div>
      </main>
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}
