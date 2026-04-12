// src/components/ChannelsTable.tsx
import { FC, RefObject, Dispatch, SetStateAction } from "react";

interface ChannelsTableProps {
  filteredEntries: ChannelEntry[];
  handleSelect: (id: number) => void;
  handleSelectAll: (checked: boolean, filteredEntries: ChannelEntry[]) => void;
  startEditing: (
    id: number,
    field: "domain" | "subdomain",
    current: string,
  ) => void;
  editingCell: { id: number; field: "domain" | "subdomain" } | null;
  setEditingCell: Dispatch<
    SetStateAction<{ id: number; field: "domain" | "subdomain" } | null>
  >;
  editValue: string;
  setEditValue: (value: string) => void;
  saveEdit: () => void;
  handleReset: (id: number) => void;
  inputRef: RefObject<HTMLInputElement>;
  displayCategory: (cat: string) => string;
}

type ChannelEntry = {
  id: number;
  channelName: string;
  url?: string;
  domain: string;
  subdomain: string;
  selected?: boolean; // client-side only
};

const ChannelsTable: FC<ChannelsTableProps> = ({
  filteredEntries,
  handleSelect,
  handleSelectAll,
  startEditing,
  editingCell,
  setEditingCell,
  editValue,
  setEditValue,
  saveEdit,
  handleReset,
  inputRef,
  displayCategory,
}) => {
  const allFilteredSelected =
    filteredEntries.length > 0 &&
    filteredEntries.every((e) => e.selected ?? false);

  return (
    <div className="overflow-x-auto border rounded-xl">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-4 w-12">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={(e) =>
                  handleSelectAll(e.target.checked, filteredEntries)
                }
              />
            </th>
            <th className="px-6 py-4 text-left font-semibold text-gray-700">
              Channel
            </th>
            <th className="px-6 py-4 text-left font-semibold text-gray-700">
              Domain
            </th>
            <th className="px-6 py-4 text-left font-semibold text-gray-700">
              Subdomain
            </th>
            <th className="px-6 py-4 text-left font-semibold text-gray-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {filteredEntries.map((entry) => (
            <tr key={entry.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <input
                  type="checkbox"
                  checked={entry.selected ?? false}
                  onChange={() => handleSelect(entry.id)}
                />
              </td>
              <td className="px-6 py-4">
                {entry.url?.trim() ? (
                  <a
                    href={entry.url}
                    target="_blank"
                    className="text-blue-600 hover:underline"
                  >
                    {entry.channelName}
                  </a>
                ) : (
                  entry.channelName
                )}
              </td>
              <td
                className="px-6 py-4 cursor-pointer"
                onClick={() => startEditing(entry.id, "domain", entry.domain)}
              >
                {editingCell?.id === entry.id &&
                editingCell.field === "domain" ? (
                  <input
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") {
                        setEditValue(""); // Optional: clear or reset to original
                        setEditingCell(null);
                      }
                    }}
                    className="border border-blue-400 rounded px-2 py-1 w-full"
                  />
                ) : (
                  <span className="text-blue-700 hover:underline">
                    {displayCategory(entry.domain)}
                  </span>
                )}
              </td>
              <td
                className="px-6 py-4 cursor-pointer"
                onClick={() =>
                  startEditing(entry.id, "subdomain", entry.subdomain)
                }
              >
                {editingCell?.id === entry.id &&
                editingCell.field === "subdomain" ? (
                  <input
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") {
                        setEditValue(""); // Optional: clear or reset to original
                        setEditingCell(null);
                      }
                    }}
                    className="border border-blue-400 rounded px-2 py-1 w-full"
                  />
                ) : (
                  <span className="text-blue-700 hover:underline">
                    {displayCategory(entry.subdomain)}
                  </span>
                )}
              </td>
              <td className="px-6 py-4">
                <button
                  onClick={() => handleReset(entry.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  reset
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ChannelsTable;
