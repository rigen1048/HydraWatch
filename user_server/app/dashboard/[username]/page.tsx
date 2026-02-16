"use client";
import { ChevronRight } from "lucide-react";
import { useContext } from "react";
import clsx from "clsx";
import { DataContext } from "./layout";

interface Domain {
  key: string;
  name: string;
  count: number;
}

// Add prop interface — exactly like sidebar
interface DashboardPageProps {
  username: string;
}

function toTitleCase(str: string): string {
  return str
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/(^|\s)\w/g, (m) => m.toUpperCase());
}

export default function DashboardPage({ username }: DashboardPageProps) {
  const data = useContext(DataContext);

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

  const isRoot = !window.location.pathname.split("/")[4]?.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-5 py-10 md:px-8 lg:px-12">
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-xl shadow-slate-200/20">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-7 py-6 md:px-9">
            <h2 className="text-2xl font-semibold text-white">New Videos</h2>
          </div>

          <div className="divide-y divide-slate-100">
            {displayedDomains.length === 0 ? (
              <div className="px-8 py-16 text-center">
                <p className="text-lg font-medium text-slate-400">
                  No new videos available yet.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Check back soon — fresh content is on the way.
                </p>
              </div>
            ) : (
              displayedDomains.map((domain) => {
                const isActive =
                  (isRoot && domain.key === "all") ||
                  window.location.pathname.includes(domain.key);

                const displayName = toTitleCase(domain.name);

                return (
                  <button
                    key={domain.key}
                    onClick={() => {
                      // Now using the prop — exactly like sidebar
                      const base = `/dashboard/${username}`;
                      window.location.href =
                        domain.key === "all" ? base : `${base}/${domain.key}`;
                    }}
                    className={clsx(
                      "group flex w-full items-center justify-between px-7 py-6 transition hover:bg-slate-50 active:bg-slate-100 md:px-9",
                      isActive && "bg-emerald-50/40",
                    )}
                  >
                    <span className="text-xl font-medium text-slate-800">
                      {displayName}
                    </span>
                    <div className="flex items-center gap-5">
                      <span className="text-3xl font-bold tracking-tight text-slate-900">
                        {domain.count}
                      </span>
                      <ChevronRight className="h-5 w-5 text-slate-400 transition group-hover:text-slate-600" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
