"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

interface SettingsButtonProps {
  settingsPath: string;
}

export default function SettingsButton({ settingsPath }: SettingsButtonProps) {
  const router = useRouter();

  const handleSettingsClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      router.push(settingsPath);
      // Optional: use router.replace(settingsPath) if you don't want to add to history
    },
    [settingsPath, router],
  );

  return (
    <Link
      href={settingsPath}
      onClick={handleSettingsClick}
      className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
      aria-label="Account settings"
    >
      <Settings className="w-6 h-6 text-gray-700" />
    </Link>
  );
}
