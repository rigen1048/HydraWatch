import { FC } from "react";

interface ChannelFiltersProps {
  domainFilter: string;
  setDomainFilter: (value: string) => void;
  subdomainFilter: string;
  setSubdomainFilter: (value: string) => void;
  allDomains: string[];
  filteredSubdomains: string[];
  displayCategory: (cat: string) => string;
}

const ChannelFilters: FC<ChannelFiltersProps> = ({
  domainFilter,
  setDomainFilter,
  subdomainFilter,
  setSubdomainFilter,
  allDomains,
  filteredSubdomains,
  displayCategory,
}) => {
  return (
    <div className="flex flex-wrap gap-6 mb-10">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Domain
        </label>
        <select
          value={domainFilter}
          onChange={(e) => {
            setDomainFilter(e.target.value);
            setSubdomainFilter("all");
          }}
          className="border border-gray-300 rounded-lg px-4 py-2.5 min-w-[200px] bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="all">All Domains</option>
          {allDomains.map((d) => (
            <option key={d} value={d}>
              {displayCategory(d)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Subdomain
        </label>
        <select
          value={subdomainFilter}
          onChange={(e) => setSubdomainFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2.5 min-w-[200px] bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          disabled={filteredSubdomains.length === 0}
        >
          <option value="all">All Subdomains</option>
          {filteredSubdomains.map((s) => (
            <option key={s} value={s}>
              {displayCategory(s)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default ChannelFilters;
