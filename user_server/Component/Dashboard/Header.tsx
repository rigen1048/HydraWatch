// Component/Dashboard/Header.tsx (or wherever your DashboardHeader lives)
"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import clsx from "clsx";
import SettingsButton from "../Icon/Setting";
import UploadCSVButton from "../Icon/UploadCSV";

interface DashboardHeaderProps {
  onMenuClick: () => void;
  onRefresh?: () => void; // ← new optional prop
}

export default function DashboardHeader({
  onMenuClick,
  onRefresh,
}: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const username = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    return segments[1] || "";
  }, [pathname]);

  const dashboardHome = useMemo(
    () => (username ? `/dashboard/${username}` : "/"),
    [username],
  );

  const settingsPath = useMemo(
    () => (username ? `/setting/${username}` : "/setting"),
    [username],
  );

  const handleLogoClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      if (pathname !== dashboardHome) {
        router.push(dashboardHome);
      }
    },
    [pathname, dashboardHome, router],
  );

  const isAtHome =
    pathname === dashboardHome || pathname.startsWith(`${dashboardHome}/`);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 transition-all duration-200">
      <div className="flex items-center justify-between px-5 sm:px-6 py-4 md:py-5 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-4 sm:gap-6">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            aria-label="Toggle sidebar menu"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>

          <Link
            href={dashboardHome}
            onClick={handleLogoClick}
            className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-sm"
            prefetch={false}
          >
            <h1
              className={clsx(
                "text-3xl sm:text-4xl font-bold font-['Oswald'] tracking-tight transition-all duration-200",
                isAtHome
                  ? "text-gray-900"
                  : "text-gray-900 group-hover:text-emerald-600 group-hover:scale-[1.02]",
              )}
            >
              Hydra
              <span className="text-emerald-500">Watch</span>
            </h1>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <UploadCSVButton username={username} onRefresh={onRefresh} />{" "}
          {/* ← pass refresh */}
          <SettingsButton settingsPath={settingsPath} />
        </div>
      </div>
    </header>
  );
}
