"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { href: "/", label: "Capture" },
//   { href: "/report", label: "Report" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="app-nav" aria-label="Primary">
      <div className="nav-inner">
        <div onClick={()=>router.push("/")} className="nav-brand cursor-pointer">
          <div className="brand-mark">IV</div>
          <div className="brand-text">
            <div className="brand-title">Intraview</div>
            <div className="brand-subtitle">Video Capture Suite</div>
          </div>
        </div>

        <div className="nav-links">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link${isActive ? " active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .app-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          border-bottom: 1px solid rgba(148, 163, 184, 0.16);
          background: rgba(2, 6, 23, 0.72);
          backdrop-filter: blur(18px);
        }
        .nav-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .nav-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .brand-mark {
          width: 40px;
          height: 40px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: #e2e8f0;
          background: linear-gradient(135deg, rgba(20, 184, 166, 0.35), rgba(15, 118, 110, 0.1));
          border: 1px solid rgba(20, 184, 166, 0.4);
          text-transform: uppercase;
        }
        .brand-title {
          font-size: 13px;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: #e2e8f0;
          font-weight: 700;
        }
        .brand-subtitle {
          font-size: 12px;
          color: rgba(226, 232, 240, 0.6);
          margin-top: 2px;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .nav-link {
          padding: 8px 14px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 600;
          color: rgba(226, 232, 240, 0.7);
          text-decoration: none;
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid transparent;
          transition: all 160ms ease;
        }
        .nav-link:hover {
          color: #e2e8f0;
          border-color: rgba(148, 163, 184, 0.35);
          background: rgba(30, 41, 59, 0.55);
        }
        .nav-link.active {
          color: #f8fafc;
          font-weight: 700;
          border-color: rgba(20, 184, 166, 0.45);
          background: linear-gradient(135deg, rgba(20, 184, 166, 0.25), rgba(15, 118, 110, 0.45));
        }
        @media (max-width: 720px) {
          .nav-inner {
            flex-direction: column;
            align-items: flex-start;
          }
          .nav-links {
            width: 100%;
          }
        }
        @media print {
          .app-nav {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
}
