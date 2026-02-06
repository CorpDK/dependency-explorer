import { usePackageStatus } from "@/hooks/usePackageStatus";
import { PackageNode } from "@/types/package";
import { memo } from "react";

interface DependencyInfoProps {
  pkg: PackageNode;
}

const DependencyInfo = memo(function DependencyInfo({
  pkg,
}: Readonly<DependencyInfoProps>) {
  const { text } = usePackageStatus(pkg);

  return (
    <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-1 italic">
      {text}
    </div>
  );
});

export default DependencyInfo;
