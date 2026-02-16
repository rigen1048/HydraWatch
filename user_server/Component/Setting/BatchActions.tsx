// src/components/BatchActions.tsx
import { FC, useRef } from "react";
import BatchInput from "./BatchInput";

interface BatchActionsProps {
  selectedCount: number;
  batchApply: (field: "domain" | "subdomain", rawValue: string) => void;
  batchApplyBoth: (domainRaw: string, subdomainRaw: string) => void;
  handleBatchReset: () => void;
  handleBatchDelete: () => void;
  clearSelection: () => void;
  allDomains: string[];
  allSubdomains: string[];
  UNCATEGORIZED: string;
  displayCategory: (cat: string) => string;
}

const BatchActions: FC<BatchActionsProps> = ({
  selectedCount,
  batchApply,
  batchApplyBoth,
  handleBatchDelete,
  clearSelection,
  allDomains,
  allSubdomains,
  UNCATEGORIZED,
  displayCategory,
}) => {
  const domainInputRef = useRef<HTMLInputElement>(null);
  const subdomainInputRef = useRef<HTMLInputElement>(null);

  const clearInputs = () => {
    if (domainInputRef.current) domainInputRef.current.value = "";
    if (subdomainInputRef.current) subdomainInputRef.current.value = "";
  };

  const handleCancel = () => {
    clearInputs();
    clearSelection(); // This makes the batch bar disappear
  };

  return (
    <div className="sticky top-0 z-10 bg-blue-50 border-b border-blue-200 p-4 mb-8 rounded-lg flex flex-wrap gap-4 items-center justify-between">
      {/* Left: count + × cancel */}
      <div className="flex items-center gap-4">
        <div className="font-medium text-blue-800">
          {selectedCount} channel{selectedCount !== 1 ? "s" : ""} selected
        </div>
        <button
          onClick={handleCancel}
          title="Cancel selection and close batch actions"
          aria-label="Cancel batch"
          className="text-blue-700 hover:text-blue-900 text-2xl font-bold w-9 h-9 flex items-center justify-center rounded-full hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          ×
        </button>
      </div>

      {/* Right: inputs + 3 buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <BatchInput
          ref={domainInputRef}
          placeholder="Set domain..."
          listId="batch-domain-list"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              batchApply("domain", e.currentTarget.value.trim());
              e.currentTarget.value = "";
            }
          }}
          categories={allDomains}
          UNCATEGORIZED={UNCATEGORIZED}
          displayCategory={displayCategory}
        />
        <BatchInput
          ref={subdomainInputRef}
          placeholder="Set subdomain..."
          listId="batch-subdomain-list"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              batchApply("subdomain", e.currentTarget.value.trim());
              e.currentTarget.value = "";
            }
          }}
          categories={allSubdomains}
          UNCATEGORIZED={UNCATEGORIZED}
          displayCategory={displayCategory}
        />
        <button
          onClick={() => {
            batchApplyBoth(
              domainInputRef.current?.value.trim() || "",
              subdomainInputRef.current?.value.trim() || "",
            );
            clearInputs();
            clearSelection();
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-1.5 rounded text-sm font-medium min-w-[80px]"
        >
          Apply
        </button>
        <button
          onClick={() => {
            // New behavior: "Reset" now explicitly sets both fields to the uncategorized value
            // (convention change as discussed)
            batchApplyBoth(UNCATEGORIZED, UNCATEGORIZED);
            clearInputs();
            clearSelection();
          }}
          className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-1.5 rounded text-sm font-medium min-w-[90px]"
        >
          Reset
        </button>
        <button
          onClick={() => {
            handleBatchDelete();
            clearInputs();
            clearSelection();
          }}
          className="bg-red-600 hover:bg-red-800 text-white px-5 py-1.5 rounded text-sm font-medium min-w-[90px] border border-red-700 shadow-sm"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default BatchActions;
