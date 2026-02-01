import { PackageNode } from "@/types/package";

type Variant = "explicit" | "dependency" | "orphaned";

interface PackageItemProps {
  pkg: PackageNode;
  variant: Variant;
  isHighlighted?: boolean;
  onClick?: () => void;
  showOrphanedIndicator?: boolean;
  extraInfo?: React.ReactNode;
}

const variantStyles = {
  explicit: {
    highlighted: "bg-green-100 dark:bg-green-900/40 ring-2 ring-green-500",
    normal: "bg-zinc-50 dark:bg-zinc-700/50 hover:bg-green-50 dark:hover:bg-green-900/20",
  },
  dependency: {
    highlighted: "bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-500",
    normal: "bg-zinc-50 dark:bg-zinc-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20",
  },
  orphaned: {
    highlighted: "bg-orange-100 dark:bg-orange-900/40 ring-2 ring-orange-500",
    normal: "bg-zinc-50 dark:bg-zinc-700/50 hover:bg-orange-50 dark:hover:bg-orange-900/20",
  },
};

export default function PackageItem({
  pkg,
  variant,
  isHighlighted = false,
  onClick,
  showOrphanedIndicator = false,
  extraInfo,
}: Readonly<PackageItemProps>) {
  const styles = variantStyles[variant];
  const isOrphaned = !pkg.explicit && pkg.required_by.length === 0;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-2 rounded transition-colors relative ${
        isHighlighted ? styles.highlighted : styles.normal
      }`}
    >
      {showOrphanedIndicator && isOrphaned && (
        <span
          className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500"
          title="Orphaned package"
        ></span>
      )}
      <div className={`font-mono text-sm text-zinc-900 dark:text-zinc-100 ${showOrphanedIndicator && isOrphaned ? "pr-4" : ""}`}>
        {pkg.id}
      </div>
      <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
        v{pkg.version}
      </div>
      {extraInfo}
    </button>
  );
}
