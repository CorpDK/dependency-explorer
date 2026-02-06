import { PackageNode } from "@/types/package";

/**
 * Recursively collect all dependencies of a package
 */
export function collectDependencies(
  packageId: string,
  nodes: PackageNode[],
  visited: Set<string>,
  result: Set<string>,
): void {
  if (visited.has(packageId)) return;
  visited.add(packageId);

  const pkg = nodes.find((n) => n.id === packageId);
  if (!pkg) return;

  pkg.depends_on.forEach((dep) => {
    result.add(dep);
    collectDependencies(dep, nodes, visited, result);
  });
}

/**
 * Collect full dependency tree (package and all transitive dependencies)
 */
export function collectPackageTree(
  packageId: string,
  nodes: PackageNode[],
  result: Set<string>,
): void {
  if (result.has(packageId)) return;
  result.add(packageId);

  const pkg = nodes.find((n) => n.id === packageId);
  if (!pkg) return;

  pkg.depends_on.forEach((dep) => {
    collectPackageTree(dep, nodes, result);
  });
}

/**
 * Check if a package is orphaned (dependency with no parents)
 */
export function isOrphaned(pkg: PackageNode): boolean {
  return !pkg.explicit && pkg.required_by.length === 0;
}

/**
 * Sort packages alphabetically by name
 */
export function sortPackagesByName(packages: PackageNode[]): PackageNode[] {
  return packages.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Count explicit and dependency packages
 */
export function countPackages(nodes: PackageNode[]): {
  explicit: number;
  dependency: number;
  total: number;
} {
  const explicit = nodes.filter((n) => n.explicit).length;
  return {
    explicit,
    dependency: nodes.length - explicit,
    total: nodes.length,
  };
}
