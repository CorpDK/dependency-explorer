import { PackageNode } from "@/types/package";
import SearchInput from "@/components/ui/SearchInput";
import PackageItem from "@/components/ui/PackageItem";

type ColumnVariant = "explicit" | "dependency";

interface PackageColumnProps {
  title: string;
  icon: React.ReactNode;
  variant: ColumnVariant;
  packages: PackageNode[];
  totalCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onPackageClick: (pkg: PackageNode) => void;
  isHighlighted: (pkg: PackageNode) => boolean;
  renderExtraInfo?: (pkg: PackageNode) => React.ReactNode;
  searchPlaceholder: string;
  ringColor: string;
}

export default function PackageColumn({
  title,
  icon,
  variant,
  packages,
  totalCount,
  searchQuery,
  onSearchChange,
  onPackageClick,
  isHighlighted,
  renderExtraInfo,
  searchPlaceholder,
  ringColor,
}: Readonly<PackageColumnProps>) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
        {icon} {title}{" "}
        <span className="text-sm font-normal text-zinc-600 dark:text-zinc-400">
          ({packages.length}/{totalCount})
        </span>
      </h2>
      <SearchInput
        placeholder={searchPlaceholder}
        value={searchQuery}
        onChange={onSearchChange}
        ringColor={ringColor}
      />
      <div className="overflow-y-auto max-h-[calc(100vh-380px)]">
        <ul className="space-y-1">
          {packages.map((pkg) => (
            <li key={pkg.id}>
              <PackageItem
                pkg={pkg}
                variant={variant}
                isHighlighted={isHighlighted(pkg)}
                onClick={() => onPackageClick(pkg)}
                showOrphanedIndicator={variant === "dependency"}
                extraInfo={renderExtraInfo?.(pkg)}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
