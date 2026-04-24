import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Tiny markdown -> HTML (headings, bold, lists, paragraphs)
export function mdToHtml(md = "") {
  if (!md) return "";
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headings
  html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*)$/gm, "<h2>$1</h2>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic
  html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Lists
  const lines = html.split(/\n/);
  const out = [];
  let inUl = false;
  let inOl = false;
  let buf = [];
  const flushPara = () => {
    if (buf.length) {
      out.push(`<p>${buf.join(" ")}</p>`);
      buf = [];
    }
  };
  for (const line of lines) {
    const ulMatch = line.match(/^\s*[-*]\s+(.*)$/);
    const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ulMatch) {
      flushPara();
      if (inOl) { out.push("</ol>"); inOl = false; }
      if (!inUl) { out.push("<ul>"); inUl = true; }
      out.push(`<li>${ulMatch[1]}</li>`);
    } else if (olMatch) {
      flushPara();
      if (inUl) { out.push("</ul>"); inUl = false; }
      if (!inOl) { out.push("<ol>"); inOl = true; }
      out.push(`<li>${olMatch[1]}</li>`);
    } else if (line.trim() === "") {
      if (inUl) { out.push("</ul>"); inUl = false; }
      if (inOl) { out.push("</ol>"); inOl = false; }
      flushPara();
    } else if (line.startsWith("<h2>") || line.startsWith("<h3>")) {
      if (inUl) { out.push("</ul>"); inUl = false; }
      if (inOl) { out.push("</ol>"); inOl = false; }
      flushPara();
      out.push(line);
    } else {
      buf.push(line);
    }
  }
  if (inUl) out.push("</ul>");
  if (inOl) out.push("</ol>");
  flushPara();
  return out.join("\n");
}

export function statusMeta(status) {
  switch (status) {
    case "quiz_ready":
      return { label: "QUIZ READY", chip: "bg-emerald-100 text-emerald-700" };
    case "archived":
      return { label: "ARCHIVED", chip: "bg-slate-100 text-slate-700" };
    default:
      return { label: "IN PROGRESS", chip: "bg-amber-100 text-amber-700" };
  }
}

export function sourceIcon(sourceType) {
  switch (sourceType) {
    case "pdf":
      return "PDF";
    case "notes":
      return "NOTES";
    default:
      return "TOPIC";
  }
}

export function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}
