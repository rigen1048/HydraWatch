// src/components/BatchInput.tsx
import { forwardRef } from "react";

interface BatchInputProps {
  placeholder: string;
  listId: string;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  categories: string[];
  UNCATEGORIZED: string;
  displayCategory: (cat: string) => string;
}

const BatchInput = forwardRef<HTMLInputElement, BatchInputProps>(
  (
    {
      placeholder,
      listId,
      onKeyDown,
      categories,
      UNCATEGORIZED,
      displayCategory,
    },
    ref,
  ) => {
    return (
      <>
        <input
          ref={ref}
          placeholder={placeholder}
          className="border rounded px-3 py-1.5 text-sm w-48"
          list={listId}
          onKeyDown={onKeyDown}
        />
        <datalist id={listId}>
          <option value="All" />
          {categories
            .filter((d) => d !== UNCATEGORIZED)
            .sort()
            .map((d) => (
              <option key={d} value={displayCategory(d)} />
            ))}
        </datalist>
      </>
    );
  },
);

BatchInput.displayName = "BatchInput";

export default BatchInput;
