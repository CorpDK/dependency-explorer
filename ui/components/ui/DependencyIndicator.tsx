import { usePackageStatus } from "@/hooks/usePackageStatus";
import { PackageNode } from "@/types/package";
import { memo } from "react";

interface DependencyIndicatorProps {
  pkg: PackageNode;
}

const DependencyIndicator = memo(function DependencyIndicator({
  pkg,
}: Readonly<DependencyIndicatorProps>) {
  const { color, title } = usePackageStatus(pkg);

  return (
    <span
      className={`absolute top-2 right-2 w-2 h-2 rounded-full ${color}`}
      title={title}
      aria-label={title}
    ></span>
  );
});

export default DependencyIndicator;
