"use client";

import clsx from "clsx";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useCallback, useMemo, memo } from "react";

type Subdomain = {
  key: string;
  name: string;
};

type Domain = {
  key: string;
  name: string;
  subdomains: Subdomain[];
};

type ProcessedDomain = {
  key: string;
  name: string;
  subdomains: Subdomain[];
  titleName: string;
  filteredSubdomains: Array<Subdomain & { titleName: string }>;
};

type DashboardSidebarProps = {
  username: string;
};

const toTitleCase = (str: string): string =>
  str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const SidebarDomainItem = memo(
  ({
    domain,
    isActive,
    isOpenThis,
    onDomainClick,
    onSubClick,
    isSubActive,
  }: {
    domain: ProcessedDomain;
    isActive: boolean;
    isOpenThis: boolean;
    onDomainClick: (domainKey: string) => void;
    onSubClick: (domainKey: string, subKey: string) => void;
    isSubActive: (domainKey: string, subKey: string) => boolean;
  }) => {
    const hasDropdown = domain.subdomains.length > 1;

    return (
      <div>
        <div
          className={clsx(
            "flex items-center justify-between px-5 py-2.5 rounded-xl text-[15px] font-medium transition-colors cursor-pointer",
            isActive
              ? "bg-gray-100 text-gray-900"
              : "hover:bg-gray-50 text-gray-800",
          )}
          onClick={() => onDomainClick(domain.key)}
        >
          <span className="flex-1">{domain.titleName}</span>
          {hasDropdown && (
            <div className="ml-3">
              {isOpenThis ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </div>
          )}
        </div>

        {/* Improved buttery-smooth dropdown animation */}
        {hasDropdown && (
          <div
            className={clsx(
              "overflow-hidden transition-all duration-300 ease-out",
              isOpenThis ? "max-h-[640px] opacity-100" : "max-h-0 opacity-0",
            )}
          >
            <div className="pt-1 pb-3">
              <div className="space-y-0.5">
                {domain.filteredSubdomains.map((sub) => {
                  const subActive = isSubActive(domain.key, sub.key);
                  return (
                    <button
                      key={sub.key}
                      onClick={() => onSubClick(domain.key, sub.key)}
                      className={clsx(
                        "w-full text-left pl-12 pr-6 py-2 rounded-lg text-sm transition-colors",
                        subActive
                          ? "bg-gray-100 font-medium text-gray-900"
                          : "text-gray-700 hover:bg-gray-50/80",
                      )}
                    >
                      {sub.titleName}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

SidebarDomainItem.displayName = "SidebarDomainItem";

export default function DashboardSidebar({ username }: DashboardSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [domains, setDomains] = useState<Domain[]>([]);
  const [openDomain, setOpenDomain] = useState<string | null>(null);
  const [pendingDomain, setPendingDomain] = useState<string | null>(null);

  const currentDomainKey = useMemo<string | null>(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (
      parts.length >= 3 &&
      parts[0] === "dashboard" &&
      parts[1] === username
    ) {
      return parts[2];
    }
    return null;
  }, [pathname, username]);

  const effectiveDomainKey = pendingDomain ?? currentDomainKey;

  useEffect(() => {
    if (pendingDomain && currentDomainKey === pendingDomain) {
      setPendingDomain(null);
    }
  }, [currentDomainKey, pendingDomain]);

  useEffect(() => {
    if (pendingDomain) return;
    if (!currentDomainKey) {
      setOpenDomain(null);
      return;
    }
    const domain = domains.find((d) => d.key === currentDomainKey);
    setOpenDomain(
      domain && domain.subdomains.length > 1 ? currentDomainKey : null,
    );
  }, [currentDomainKey, domains, pendingDomain]);

  useEffect(() => {
    if (!username) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/router/dashboard/${username}/sidebar`, {
          next: { revalidate: 60 },
        });
        if (res.ok) {
          const { domains } = await res.json();
          setDomains(domains ?? []);
        }
      } catch (err) {
        console.error("Failed to load sidebar domains:", err);
      }
    };
    load();
  }, [username]);

  const processedDomains = useMemo<ProcessedDomain[]>(() => {
    return domains.map((domain) => ({
      ...domain,
      titleName: toTitleCase(domain.name),
      filteredSubdomains: domain.subdomains
        .filter((sub) => sub.key !== "all")
        .map((sub) => ({
          ...sub,
          titleName: toTitleCase(sub.name),
        })),
    }));
  }, [domains]);

  const navigate = useCallback(
    (domainKey: string, subKey?: string) => {
      setPendingDomain(domainKey);

      const domain = domains.find((d) => d.key === domainKey);
      if (domain && domain.subdomains.length > 1) {
        setOpenDomain(domainKey);
      } else {
        setOpenDomain(null);
      }

      const path = subKey
        ? `/dashboard/${username}/${domainKey}/${subKey}`
        : `/dashboard/${username}/${domainKey}/all`;
      router.push(path);
    },
    [username, router, domains],
  );

  const isDomainActive = useCallback(
    (domainKey: string) => effectiveDomainKey === domainKey,
    [effectiveDomainKey],
  );

  const isSubActive = useCallback(
    (domainKey: string, subKey: string) =>
      pathname === `/dashboard/${username}/${domainKey}/${subKey}`,
    [pathname, username],
  );

  const handleDomainClick = useCallback(
    (domainKey: string) => navigate(domainKey, "all"),
    [navigate],
  );

  const handleSubClick = useCallback(
    (domainKey: string, subKey: string) => navigate(domainKey, subKey),
    [navigate],
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-80 bg-white border-r border-gray-200 pt-16">
      <div className="p-5 space-y-1 overflow-y-auto h-full pb-24">
        {domains.length === 0 ? (
          <p className="text-center text-gray-500 py-10 text-sm">
            No menu items available
          </p>
        ) : (
          processedDomains.map((domain) => {
            const isOpenThis = openDomain === domain.key;
            const isActive = isDomainActive(domain.key);

            return (
              <SidebarDomainItem
                key={domain.key}
                domain={domain}
                isActive={isActive}
                isOpenThis={isOpenThis}
                onDomainClick={handleDomainClick}
                onSubClick={handleSubClick}
                isSubActive={isSubActive}
              />
            );
          })
        )}
      </div>
    </aside>
  );
}
