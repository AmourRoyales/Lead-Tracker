"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "All Leads" },
  { href: "/good_leads", label: "Good Leads" },
  { href: "/order", label: "Order" },
  { href: "/follow-up", label: "Follow-up" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="flex items-center gap-1 border-b border-line bg-surface px-4 py-3">
      <h1 className="mr-4 text-lg font-semibold text-ink">Jeni Diam · Lead Tracker</h1>
      <nav className="flex items-center gap-1">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              pathname === link.href
                ? "bg-brand text-white"
                : "text-ink-soft hover:bg-surface2"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
