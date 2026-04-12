"use client";

import { ChevronRight } from "lucide-react";
import { useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import clsx from "clsx";
import { DataContext } from "./layout";

interface Domain {
  key: string;
  name: string;
  count: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const data = useContext(DataContext);

  // Username is extracted fresh from the current URL (same as layout + sidebar)
  const segments = pathname.split("/").filter(Boolean);
  const username = segments[1] || "";

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-lg font-medium text-slate-500">
          Loading your dashboard…
        </p>
      </div>
    );
  }

  const domains: Domain[] = data.domains ?? [];

  const visibleDomains = domains
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);

  const displayedDomains =
    visibleDomains.length <= 2 ? visibleDomains.slice(0, 1) : visibleDomains;

  const isRoot = segments.length <= 2;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-6 py-12 md:px-12 lg:px-20">
      <div className="mx-auto max-w-5xl">
        {/* Page Title */}
        <h1 className="mb-12 text-4xl font-semibold tracking-tight text-slate-900">
          New Videos
        </h1>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {displayedDomains.length === 0 ? (
            <div className="px-12 py-24 text-center">
              <p className="text-xl font-medium text-slate-400">
                No new videos available yet.
              </p>
              <p className="mt-3 text-base text-slate-500">
                Check back soon — fresh content is on the way.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {displayedDomains.map((domain) => {
                const isActive =
                  (isRoot && domain.key === "all") ||
                  pathname.includes(`/${domain.key}`);

                const displayName = toTitleCase(domain.name);

                return (
                  <button
                    key={domain.key}
                    onClick={() => {
                      const currentSegments = window.location.pathname
                        .split("/")
                        .filter(Boolean);
                      const currentUsername = currentSegments[1] || "";

                      const targetPath =
                        domain.key === "all"
                          ? `/dashboard/${currentUsername}/all/all`
                          : `/dashboard/${currentUsername}/${domain.key}/all`;

                      router.push(targetPath);
                    }}
                    className={clsx(
                      "group flex w-full items-center justify-between px-10 py-9 transition-all hover:bg-slate-50 active:bg-slate-100",
                      isActive && "bg-emerald-50",
                    )}
                  >
                    <span className="text-2xl font-medium text-slate-800">
                      {displayName}
                    </span>

                    <div className="flex items-center gap-8">
                      <span className="text-4xl font-semibold tracking-tighter text-slate-900">
                        {domain.count}
                      </span>
                      <ChevronRight className="h-6 w-6 text-slate-400 transition group-hover:text-emerald-600" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function toTitleCase(str: string): string {
  return str
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/(^|\s)\w/g, (m) => m.toUpperCase());
}
