// src/config/sidebar.ts
export const SIDEBAR_DOMAINS = [
  {
    key: "anime",
    name: "Anime",
    subdomains: [
      { key: "all", name: "All" },
      { key: "watching", name: "Watching" },
      { key: "completed", name: "Completed" },
    ],
  },
  {
    key: "movies",
    name: "Movies",
    subdomains: [{ key: "all", name: "All" }],
  },
  // add whatever you want — this is YOUR menu
] as const;
