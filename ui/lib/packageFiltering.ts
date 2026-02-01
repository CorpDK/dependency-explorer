import { PackageNode } from "@/types/package";
import { fuzzyMatch, sortPackagesByName } from "./utils";

/**
 * Filter and sort packages by search query with optional custom filter
 */
export function filterAndSortPackages(
  packages: PackageNode[],
  query: string,
  filter?: (pkg: PackageNode) => boolean
): PackageNode[] {
  let filtered = packages;

  // Apply custom filter if provided
  if (filter) {
    filtered = filtered.filter(filter);
  }

  // Apply search query
  if (query) {
    filtered = filtered.filter((pkg) => fuzzyMatch(query, pkg.id));
  }

  // Sort alphabetically
  return sortPackagesByName(filtered);
}

/**
 * Filter packages by explicit/dependency type
 */
export function filterByType(
  packages: PackageNode[],
  type: "explicit" | "dependency"
): PackageNode[] {
  return packages.filter((pkg) =>
    type === "explicit" ? pkg.explicit : !pkg.explicit
  );
}

/**
 * Filter orphaned packages (dependencies with no parents)
 */
export function filterOrphaned(packages: PackageNode[]): PackageNode[] {
  return packages.filter((pkg) => !pkg.explicit && pkg.required_by.length === 0);
}

/**
 * Split packages into explicit and dependency arrays
 */
export function splitPackagesByType(packages: PackageNode[]): {
  explicit: PackageNode[];
  dependency: PackageNode[];
} {
  const explicit: PackageNode[] = [];
  const dependency: PackageNode[] = [];

  packages.forEach((pkg) => {
    if (pkg.explicit) {
      explicit.push(pkg);
    } else {
      dependency.push(pkg);
    }
  });

  return { explicit, dependency };
}
