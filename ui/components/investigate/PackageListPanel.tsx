import FilterButton from "@/components/ui/FilterButton";
import PackageItem from "@/components/ui/PackageItem";
import SearchInput from "@/components/ui/SearchInput";
import { InvestigateFilterType, PackageNode } from "@/types/package";

interface PackageListPanelProps {
  nodes: PackageNode[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterType: InvestigateFilterType;
  onFilterChange: (type: InvestigateFilterType) => void;
  filteredPackages: PackageNode[];
  selectedPackage: PackageNode | null;
  onPackageSelect: (pkg: PackageNode) => void;
}

export default function PackageListPanel({
  nodes,
  searchQuery,
  onSearchChange,
  filterType,
  onFilterChange,
  filteredPackages,
  selectedPackage,
  onPackageSelect,
}: Readonly<PackageListPanelProps>) {
  const explicitCount = nodes.filter((n) => n.explicit).length;
  const dependencyCount = nodes.length - explicitCount;

  return (
    <div className="w-96 flex flex-col border-r border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800">
      <div className="p-4 border-b border-zinc-300 dark:border-zinc-700">
        <h2 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-zinc-100">
          Investigate Packages
        </h2>

        {/* Search Input */}
        <SearchInput
          placeholder="Search packages..."
          value={searchQuery}
          onChange={onSearchChange}
          ringColor="ring-blue-500"
        />

        {/* Filter Buttons */}
        <div className="flex gap-2 mt-3">
          <FilterButton
            active={filterType === "all"}
            onClick={() => onFilterChange("all")}
          >
            All ({nodes.length})
          </FilterButton>
          <FilterButton
            active={filterType === "explicit"}
            onClick={() => onFilterChange("explicit")}
          >
            Explicit ({explicitCount})
          </FilterButton>
          <FilterButton
            active={filterType === "dependency"}
            onClick={() => onFilterChange("dependency")}
          >
            Dependencies ({dependencyCount})
          </FilterButton>
        </div>
      </div>

      {/* Package List */}
      <div className="flex-1 overflow-y-auto">
        {filteredPackages.length === 0 ? (
          <div className="text-center text-zinc-500 dark:text-zinc-500 italic text-sm py-8">
            No packages match your criteria
          </div>
        ) : (
          <ul className="p-2 space-y-1">
            {filteredPackages.map((pkg) => (
              <li key={pkg.id}>
                <PackageItem
                  pkg={pkg}
                  variant={pkg.explicit ? "explicit" : "dependency"}
                  isHighlighted={selectedPackage?.id === pkg.id}
                  onClick={() => onPackageSelect(pkg)}
                  extraInfo={
                    <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                      {pkg.depends_on.length} deps, {pkg.required_by.length}{" "}
                      parents
                    </div>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
