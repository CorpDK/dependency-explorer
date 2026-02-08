import { PackageLinkType, PackageNode, PackageStatus } from "@/types/package";
import { isOrphaned } from "./packages";

/**
 * Get the link type for a package node
 */
export function getLinkType(
  srcNode: PackageNode,
  destNode: PackageNode,
): PackageLinkType {
  if (srcNode.broken || destNode.broken) {
    return "broken";
  } else if (srcNode.explicit === true || destNode.explicit === true) {
    return "explicit";
  }
  return "dependency";
}

/**
 * Get the display label for a package type
 */
export function getPackageTypeLabel(node: PackageNode): string {
  return node.explicit ? "Explicitly Installed" : "Dependency";
}

/**
 * Get the package status (explicit, dependency, or orphaned)
 */
export function getPackageStatus(pkg: PackageNode): PackageStatus {
  if (pkg.explicit) return "explicit";
  if (isOrphaned(pkg)) return "orphaned";
  return "dependency";
}

/**
 * Get the display label for a package status
 */
export function getStatusLabel(status: PackageStatus): string {
  switch (status) {
    case "explicit":
      return "Explicitly Installed";
    case "orphaned":
      return "Orphaned Package";
    case "dependency":
      return "Dependency";
  }
}

/**
 * Get the color for a package status
 */
export function getStatusColor(status: PackageStatus): string {
  switch (status) {
    case "explicit":
      return "#4CAF50"; // green
    case "orphaned":
      return "#FF5722"; // red
    case "dependency":
      return "#2196F3"; // blue
  }
}
