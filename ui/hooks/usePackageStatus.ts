import { isOrphaned } from "@/lib/packages";
import { PackageNode, PackageStatus } from "@/types/package";
import { useMemo } from "react";

/**
 * Hook to determine package status and related display information
 */
export function usePackageStatus(pkg: PackageNode) {
  return useMemo(() => {
    const orphaned = isOrphaned(pkg);
    const broken = pkg.broken === true;

    let status: PackageStatus;
    let color: string;
    let title: string;
    let text: string;

    if (broken) {
      status = "dependency";
      color = "bg-red-500";
      title = "Broken dependency (missing)";
      text = "Broken dependency (missing)";
    } else if (pkg.explicit) {
      status = "explicit";
      color = "bg-green-500";
      title = "Explicitly installed";
      text = "Explicitly installed";
    } else if (orphaned) {
      status = "orphaned";
      color = "bg-orange-500";
      title = "Orphaned dependency";
      text = "Orphaned dependency";
    } else {
      status = "dependency";
      color = "bg-blue-500";
      title = "Dependency";
      text = `Required by ${pkg.required_by.length} package${pkg.required_by.length === 1 ? "" : "s"}`;
    }

    return {
      status,
      color,
      title,
      text,
      isOrphaned: orphaned,
      isBroken: broken,
    };
  }, [pkg]);
}
