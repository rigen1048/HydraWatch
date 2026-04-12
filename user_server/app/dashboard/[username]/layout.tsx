// app/dashboard/[username]/layout.tsx
"use client";
import { usePathname } from "next/navigation";
import { createContext, useEffect, useState, useCallback } from "react";
import DashboardHeader from "@/Component/Dashboard/Header";
import DashboardSidebar from "@/Component/Dashboard/Sidebar";

export const DataContext = createContext<any>(null);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [data, setData] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const segments = pathname.split("/").filter(Boolean);

    // This layout only renders under /dashboard/[username]/..., so the path is always valid.
    // No need for the defensive check that synchronously called setData(null).
    const relativePath = segments.join("/");

    fetch(`/api/router/${relativePath}`, { next: { revalidate: 60 } })
      .then((res) => (res.ok ? res.json() : null))
      .then(setData)
      .catch((err) => {
        console.error("Dashboard data fetch failed:", err);
        setData(null);
      });
  }, [pathname, refreshKey]);

  return (
    <DataContext.Provider value={data}>
      <div className="layout-container min-h-screen bg-gray-50">
        <DashboardHeader
          onMenuClick={() => setSidebarOpen((v) => !v)}
          onRefresh={refetch}
        />
        <DashboardSidebar username={pathname.split("/")[2] ?? ""} />
        <main className="pt-[80px] lg:pl-80 transition-all duration-300">
          {children}
        </main>
      </div>
    </DataContext.Provider>
  );
}
