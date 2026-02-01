import { PackageNode } from "@/types/package";
import { isOrphaned } from "@/lib/utils";

interface DependencyIndicatorProps {
  pkg: PackageNode;
}

export default function DependencyIndicator({
  pkg,
}: Readonly<DependencyIndicatorProps>) {
  const orphaned = isOrphaned(pkg);

  let color: string;
  let title: string;

  if (pkg.explicit) {
    color = "bg-green-500";
    title = "Explicitly installed";
  } else if (orphaned) {
    color = "bg-orange-500";
    title = "Orphaned dependency";
  } else {
    color = "bg-blue-500";
    title = "Dependency";
  }

  return (
    <span
      className={`absolute top-2 right-2 w-2 h-2 rounded-full ${color}`}
      title={title}
    ></span>
  );
}
