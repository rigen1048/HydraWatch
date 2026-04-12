"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import ChannelFilters from "@/Component/Setting/ChannelFilters";
import BatchActions from "@/Component/Setting/BatchActions";
import ChannelsTable from "@/Component/Setting/ChannelTable";

// ── Types ────────────────────────────────────────────────────────────────────
type RawChannel = {
  id: number;
  channelName: string;
  url?: string;
  domain?: string | null;
  subdomain?: string | null;
};

type ChannelEntry = {
  id: number;
  channelName: string;
  url?: string;
  domain: string;
  subdomain: string;
  selected?: boolean;
};

// ── Constants & Helpers ─────────────────────────────────────────────────────
const UNCATEGORIZED = "uncategorized";
const toTitleCase = (str: string): string =>
  str
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\w/g, (letter) => letter.toUpperCase());
const displayCategory = (cat: string): string =>
  cat === UNCATEGORIZED ? "Uncategorized" : toTitleCase(cat);
const normalizeCategory = (raw?: string | null): string => {
  const v = (raw ?? "").trim().toLowerCase();
  return v === "" ? UNCATEGORIZED : v;
};

// ── Main Component ───────────────────────────────────────────────────────────
export default function ChannelsPage() {
  const { username } = useParams<{ username: string }>();
  if (!username) throw new Error("username param is required");

  const api = useMemo(
    () => ({
      list: `/api/router/setting/${username}`,
      assign: (d: string, s: string, id: number) =>
        `/api/router/setting/${username}/assign/${encodeURIComponent(d)}/${encodeURIComponent(s)}/${id}`,
      reset: (id: number) =>
        `/api/router/setting/${username}/assign/${UNCATEGORIZED}/${UNCATEGORIZED}/${id}`,
      delete: (id: number) =>
        `/api/router/setting/${username}/delete/individual/${id}`,
    }),
    [username],
  );

  const [entries, setEntries] = useState<ChannelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState("all");
  const [subdomainFilter, setSubdomainFilter] = useState("all");
  const [editing, setEditing] = useState<{
    id: number;
    field: "domain" | "subdomain";
    draft: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null!);

  // ── Data Loading ───────────────────────────────────────────────────────────
  const loadChannels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(api.list, { next: { revalidate: 60 } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json();

      let list: RawChannel[] = [];
      if (Array.isArray(data)) {
        list = data as RawChannel[];
      } else if (
        data &&
        typeof data === "object" &&
        "channels" in data &&
        Array.isArray((data as any).channels)
      ) {
        list = (data as any).channels;
      }

      setEntries(
        list.map(
          (ch): ChannelEntry => ({
            id: ch.id,
            channelName: ch.channelName,
            url: ch.url,
            domain: normalizeCategory(ch.domain),
            subdomain: normalizeCategory(ch.subdomain),
            selected: false,
          }),
        ),
      );
    } catch (err: any) {
      setError(err.message || "Failed to load channels");
    } finally {
      setLoading(false);
    }
  }, [api.list]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // ── Derived / Memoized ─────────────────────────────────────────────────────
  const { allDomains, allSubdomains, filteredEntries } = useMemo(() => {
    const domains = new Set(entries.map((e) => e.domain));
    const subdomains = new Set(entries.map((e) => e.subdomain));
    const filtered = entries.filter((e) => {
      const dMatch = domainFilter === "all" || e.domain === domainFilter;
      const sMatch =
        subdomainFilter === "all" || e.subdomain === subdomainFilter;
      return dMatch && sMatch;
    });
    return {
      allDomains: [...domains].sort((a, b) =>
        displayCategory(a).localeCompare(displayCategory(b)),
      ),
      allSubdomains: [...subdomains].sort((a, b) =>
        displayCategory(a).localeCompare(displayCategory(b)),
      ),
      filteredEntries: filtered,
    };
  }, [entries, domainFilter, subdomainFilter]);

  const filteredSubdomains = useMemo(() => {
    if (domainFilter === "all") return allSubdomains;
    return [
      ...new Set(
        entries
          .filter((e) => e.domain === domainFilter)
          .map((e) => e.subdomain),
      ),
    ].sort((a, b) => displayCategory(a).localeCompare(displayCategory(b)));
  }, [entries, domainFilter, allSubdomains]);

  const selectedCount = useMemo(
    () => entries.filter((e) => e.selected).length,
    [entries],
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  const toggleSelect = useCallback((id: number) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e)),
    );
  }, []);

  const selectAllInView = useCallback(
    (checked: boolean) => {
      const visible = new Set(filteredEntries.map((e) => e.id));
      setEntries((prev) =>
        prev.map((e) => (visible.has(e.id) ? { ...e, selected: checked } : e)),
      );
    },
    [filteredEntries],
  );

  const clearSelection = useCallback(() => {
    setEntries((prev) => prev.map((e) => ({ ...e, selected: false })));
  }, []);

  const resetCategory = useCallback(
    async (id: number) => {
      const oldEntry = entries.find((e) => e.id === id);
      if (!oldEntry) return;
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, domain: UNCATEGORIZED, subdomain: UNCATEGORIZED }
            : e,
        ),
      );
      try {
        await fetch(api.reset(id));
      } catch {
        setEntries((prev) => prev.map((e) => (e.id === id ? oldEntry : e)));
      }
    },
    [entries, api.reset],
  );

  // ── Inline editing ─────────────────────────────────────────────────────────
  const startEditing = useCallback(
    (id: number, field: "domain" | "subdomain", current: string) => {
      setEditing({ id, field, draft: displayCategory(current) });
      setTimeout(() => inputRef.current!.focus(), 0);
    },
    [],
  );

  const saveEdit = useCallback(async () => {
    if (!editing) return;
    const { id, field, draft } = editing;
    const value =
      draft.trim() === "" ? UNCATEGORIZED : draft.trim().toLowerCase();
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    const newDomain = field === "domain" ? value : entry.domain;
    const newSubdomain = field === "subdomain" ? value : entry.subdomain;
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, domain: newDomain, subdomain: newSubdomain } : e,
      ),
    );
    try {
      await fetch(api.assign(newDomain, newSubdomain, id));
    } catch {
      setEntries((prev) => prev.map((e) => (e.id === id ? entry : e)));
    } finally {
      setEditing(null);
    }
  }, [editing, entries, api.assign]);

  useEffect(() => {
    if (!editing) return;
    const onClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        saveEdit();
      }
    };
    document.addEventListener("pointerdown", onClickOutside);
    return () => document.removeEventListener("pointerdown", onClickOutside);
  }, [editing, saveEdit]);

  // ── Batch operations ──────────────────────────────────────────────────────
  const batchUpdate = useCallback(
    async (updates: { id: number; domain: string; subdomain: string }[]) => {
      if (updates.length === 0) return;
      setEntries((prev) =>
        prev.map((e) => {
          const upd = updates.find((u) => u.id === e.id);
          return upd
            ? { ...e, domain: upd.domain, subdomain: upd.subdomain }
            : e;
        }),
      );
      const promises = updates.map((upd) =>
        fetch(api.assign(upd.domain, upd.subdomain, upd.id)),
      );
      await Promise.allSettled(promises);
    },
    [api.assign],
  );

  const batchUpdateSingleField = useCallback(
    (field: "domain" | "subdomain", raw: string) => {
      const value =
        raw.trim() === "" ? UNCATEGORIZED : raw.trim().toLowerCase();
      const selected = entries.filter((e) => e.selected);
      if (!selected.length) return;
      const updates: { id: number; domain: string; subdomain: string }[] =
        selected.map((e) => ({
          id: e.id,
          domain: field === "domain" ? value : e.domain,
          subdomain: field === "subdomain" ? value : e.subdomain,
        }));
      batchUpdate(updates);
    },
    [entries, batchUpdate],
  );

  const batchUpdateBoth = useCallback(
    (domainRaw: string, subdomainRaw: string) => {
      const domainInput = domainRaw.trim().toLowerCase();
      const subdomainInput = subdomainRaw.trim().toLowerCase();
      if (domainInput === "" && subdomainInput === "") return;

      const newDomain = domainInput || undefined;
      const newSubdomain = subdomainInput || undefined;

      const selected = entries.filter((e) => e.selected);
      if (!selected.length) return;

      const updates: { id: number; domain: string; subdomain: string }[] =
        selected.map((e) => ({
          id: e.id,
          domain: newDomain ?? e.domain,
          subdomain: newSubdomain ?? e.subdomain,
        }));
      batchUpdate(updates);
    },
    [entries, batchUpdate],
  );

  const handleBatchReset = useCallback(() => {
    const selected = entries.filter((e) => e.selected);
    if (selected.length === 0) return;

    const updates: { id: number; domain: string; subdomain: string }[] =
      selected.map((e) => ({
        id: e.id,
        domain: UNCATEGORIZED,
        subdomain: UNCATEGORIZED,
      }));
    batchUpdate(updates);
  }, [entries, batchUpdate]);

  const batchDelete = useCallback(async () => {
    const selected = entries.filter((e) => e.selected);
    if (!selected.length) return;
    if (
      !confirm(
        `Delete ${selected.length} channel${selected.length > 1 ? "s" : ""}?`,
      )
    )
      return;
    const ids = selected.map((e) => e.id);
    setEntries((prev) => prev.filter((e) => !ids.includes(e.id)));
    const promises = selected.map((e) => fetch(api.delete(e.id)));
    await Promise.allSettled(promises);
  }, [entries, api.delete]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading)
    return <div className="text-center py-20">Loading channels…</div>;
  if (error)
    return <div className="bg-red-50 p-6 text-red-800">Error: {error}</div>;

  const channelsTableProps = {
    filteredEntries,
    handleSelect: toggleSelect,
    handleSelectAll: selectAllInView,
    startEditing,
    editing,
    editDraft: editing?.draft ?? "",
    setEditDraft: (v: string) =>
      setEditing((prev) => prev && { ...prev, draft: v }),
    saveEdit,
    handleReset: resetCategory,
    inputRef,
    displayCategory,
  };

  return (
    <div className="max-w-7xl mx-auto p-6 pb-24">
      <h1 className="text-3xl font-bold mb-8">Channel Categorization</h1>
      <ChannelFilters
        domainFilter={domainFilter}
        setDomainFilter={setDomainFilter}
        subdomainFilter={subdomainFilter}
        setSubdomainFilter={setSubdomainFilter}
        allDomains={allDomains}
        filteredSubdomains={filteredSubdomains}
        displayCategory={displayCategory}
      />
      {(domainFilter !== "all" || subdomainFilter !== "all") && (
        <div className="mb-6">
          <button
            onClick={() => {
              setDomainFilter("all");
              setSubdomainFilter("all");
            }}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Reset filters
          </button>
        </div>
      )}
      {selectedCount > 0 && (
        <BatchActions
          selectedCount={selectedCount}
          batchApply={batchUpdateSingleField}
          batchApplyBoth={batchUpdateBoth}
          handleBatchDelete={batchDelete}
          handleBatchReset={handleBatchReset}
          clearSelection={clearSelection}
          allDomains={allDomains}
          allSubdomains={allSubdomains}
          displayCategory={displayCategory}
          UNCATEGORIZED={UNCATEGORIZED}
        />
      )}
      <ChannelsTable {...(channelsTableProps as any)} />
      {entries.length === 0 && (
        <div className="text-center py-16 text-gray-500">No channels found</div>
      )}
    </div>
  );
}
