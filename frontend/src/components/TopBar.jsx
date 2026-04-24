import React, { useState, useEffect } from "react";
import { Search, Bell, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { listStudySets } from "../lib/api";
import { useProfile } from "../context/ProfileContext";

export default function TopBar({ onOpenProfile }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const { profile } = useProfile();

  useEffect(() => {
    listStudySets().then(setItems).catch(() => {});
  }, []);

  const filtered = q
    ? items.filter((i) => i.title.toLowerCase().includes(q.toLowerCase())).slice(0, 6)
    : [];

  return (
    <div className="flex items-center justify-between gap-6 px-8 md:px-12 pt-8 pb-4">
      <div className="relative flex-1 max-w-2xl">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Search your library..."
          data-testid="global-search-input"
          className="w-full bg-white border border-slate-200 pl-11 pr-4 py-3 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
        />
        {open && filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden z-40">
            {filtered.map((it) => (
              <button
                key={it.id}
                onMouseDown={() => nav(`/set/${it.id}`)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                data-testid={`search-result-${it.id}`}
              >
                <span className="text-sm text-slate-800">{it.title}</span>
                <span className="text-xs text-slate-400 uppercase">{it.source_type}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button className="relative w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors" data-testid="topbar-notifications">
          <Bell className="w-4 h-4 text-slate-600" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500" />
        </button>
        <button onClick={onOpenProfile} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors" data-testid="topbar-settings">
          <Settings className="w-4 h-4 text-slate-600" />
        </button>
        <button onClick={onOpenProfile} className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 flex items-center justify-center text-sm font-bold" data-testid="topbar-avatar">
          {(profile?.name || "S").slice(0, 1).toUpperCase()}
        </button>
      </div>
    </div>
  );
}
