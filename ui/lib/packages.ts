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
 * Collect full reverse dependency tree (package and all packages that require it)
 */
export function collectReversePackageTree(
  packageId: string,
  nodes: PackageNode[],
  result: Set<string>,
): void {
  if (result.has(packageId)) return;
  result.add(packageId);

  const pkg = nodes.find((n) => n.id === packageId);
  if (!pkg) return;

  pkg.required_by.forEach((parent) => {
    collectReversePackageTree(parent, nodes, result);
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
 * Process nodes to detect broken dependencies and clean up "not of concern" reverse dependencies
 * Returns enhanced node list including synthetic broken dependency nodes
 */
export function processBrokenDependencies(nodes: PackageNode[]): PackageNode[] {
  if (nodes.length === 0) return [];

  const nodeMap = new Map<string, PackageNode>();
  const brokenDeps = new Set<string>();

  // Build map of existing nodes
  nodes.forEach((node) => {
    nodeMap.set(node.id, node);
  });

  // Clean up nodes: filter "not of concern" dependencies from required_by
  const cleanedNodes = nodes.map((node) => ({
    ...node,
    required_by: node.required_by.filter((dep) => nodeMap.has(dep)),
  }));

  // Detect broken dependencies
  cleanedNodes.forEach((node) => {
    node.depends_on.forEach((dep) => {
      if (!nodeMap.has(dep)) {
        brokenDeps.add(dep);
      }
    });
  });

  // Create synthetic nodes for broken dependencies (red nodes)
  const syntheticNodes: PackageNode[] = Array.from(brokenDeps).map((dep) => ({
    id: dep,
    explicit: false,
    version: "missing",
    depends_on: [],
    required_by: [],
    broken: true,
  }));

  return [...cleanedNodes, ...syntheticNodes];
}

/**
 * Count explicit, dependency, and broken packages
 */
export function countPackages(nodes: PackageNode[]): {
  explicit: number;
  dependency: number;
  broken: number;
  total: number;
} {
  const explicit = nodes.filter((n) => n.explicit && !n.broken).length;
  const broken = nodes.filter((n) => n.broken).length;
  return {
    explicit,
    dependency: nodes.length - explicit - broken,
    broken,
    total: nodes.length,
  };
}
