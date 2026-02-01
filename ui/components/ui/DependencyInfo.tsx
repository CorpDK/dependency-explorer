import { PackageNode } from "@/types/package";
import { isOrphaned } from "@/lib/utils";

interface DependencyInfoProps {
  pkg: PackageNode;
}

export default function DependencyInfo({
  pkg,
}: Readonly<DependencyInfoProps>) {
  const orphaned = isOrphaned(pkg);

  let text: string;

  if (pkg.explicit) {
    text = "Explicitly installed";
  } else if (orphaned) {
    text = "Orphaned dependency";
  } else {
    text = `Required by ${pkg.required_by.length} package${pkg.required_by.length === 1 ? "" : "s"}`;
  }

  return (
    <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-1 italic">
      {text}
    </div>
  );
}
