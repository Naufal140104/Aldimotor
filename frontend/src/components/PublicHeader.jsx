import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X, Wrench, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { label: "Beranda", href: "/#beranda" },
  { label: "Layanan", href: "/#layanan" },
  { label: "Cara Reservasi", href: "/#cara-reservasi" },
  { label: "Kontak", href: "/#kontak" },
];

export default function PublicHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const isAdminAuthed = !!user;
  const dashboardHref = isAdminAuthed ? "/admin" : "/admin/login";

  return (
    <header
      data-testid="public-header"
      className="glass-header sticky top-0 z-50 border-b border-slate-200"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-white">
            <Wrench strokeWidth={2} className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">
            ALDI <span className="text-blue-600">MOTOR</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((it) => (
            <a
              key={it.href}
              href={it.href}
              data-testid={`nav-${it.label.toLowerCase().replace(/\s/g, "-")}`}
              className="text-sm font-medium text-slate-700 transition-colors hover:text-blue-600"
            >
              {it.label}
            </a>
          ))}
          <Link
            to={dashboardHref}
            data-testid="nav-dashboard"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-700 transition-colors hover:text-blue-600"
          >
            <LayoutDashboard strokeWidth={1.5} className="h-4 w-4" />
            Dashboard
          </Link>
        </nav>

        <div className="hidden md:block">
          <Link to="/reservasi">
            <Button
              data-testid="header-reservasi-btn"
              className="rounded-full bg-blue-600 px-6 hover:bg-blue-700 transition-colors"
            >
              Reservasi Sekarang
            </Button>
          </Link>
        </div>

        <button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          data-testid="mobile-menu-toggle"
          aria-label="menu"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="flex flex-col gap-4 px-4 py-4">
            {navItems.map((it) => (
              <a
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-slate-700"
              >
                {it.label}
              </a>
            ))}
            <Link
              to={dashboardHref}
              onClick={() => setOpen(false)}
              data-testid="mobile-nav-dashboard"
              className="flex items-center gap-2 text-sm font-medium text-slate-700"
            >
              <LayoutDashboard strokeWidth={1.5} className="h-4 w-4" />
              Dashboard {isAdminAuthed ? "" : "(Admin)"}
            </Link>
            <Link to="/reservasi" onClick={() => setOpen(false)}>
              <Button data-testid="mobile-reservasi-btn" className="w-full rounded-full bg-blue-600 hover:bg-blue-700">
                Reservasi Sekarang
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
