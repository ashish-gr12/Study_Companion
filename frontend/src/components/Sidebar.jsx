import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutGrid, Library, BarChart3, Target, HelpCircle, LogOut, Sparkles } from "lucide-react";
import { useProfile } from "../context/ProfileContext";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, testid: "nav-dashboard" },
  { to: "/library", label: "Library", icon: Library, testid: "nav-library" },
  { to: "/analysis", label: "Analysis", icon: BarChart3, testid: "nav-analysis" },
  { to: "/practice", label: "Practice", icon: Target, testid: "nav-practice" },
];

export default function Sidebar({ onOpenProfile }) {
  const { profile } = useProfile();
  return (
    <aside
      className="hidden md:flex flex-col w-64 shrink-0 bg-[#0B192C] text-white h-screen sticky top-0 border-r border-white/5"
      data-testid="app-sidebar"
    >
      <div className="px-7 pt-8 pb-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="font-display font-extrabold tracking-[0.18em] text-lg leading-none">STUDYMIND</div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-emerald-400 mt-1">AI Tutor Partner</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            data-testid={item.testid}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors duration-200 ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-300 font-semibold"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-4 pb-6 mt-6 space-y-1">
        <button
          onClick={onOpenProfile}
          data-testid="sidebar-profile-btn"
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors duration-200"
        >
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-bold">
            {(profile?.name || "S").slice(0, 1).toUpperCase()}
          </div>
          <div className="text-left leading-tight">
            <div className="text-white">{profile?.name || "Student"}</div>
            <div className="text-[11px] text-slate-400 capitalize">{profile?.level?.replace("_", " ") || "learner"}</div>
          </div>
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors duration-200" data-testid="nav-help">
          <HelpCircle className="w-4 h-4" />
          <span>Help Center</span>
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors duration-200" data-testid="nav-logout">
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
