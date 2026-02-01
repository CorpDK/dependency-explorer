import { PackageNode, RawGraphData } from "@/types/package";

// Simple fuzzy search - checks if all characters of query appear in order in the target
export function fuzzyMatch(query: string, target: string): boolean {
  if (!query) return true;

  const lowerQuery = query.toLowerCase();
  const lowerTarget = target.toLowerCase();

  let queryIndex = 0;
  for (
    let i = 0;
    i < lowerTarget.length && queryIndex < lowerQuery.length;
    i++
  ) {
    if (lowerTarget[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === lowerQuery.length;
}

// Format timestamp from YYYY-MM-DD-HHMMSS to readable format
export function formatTimestamp(timestamp: string): string {
  return timestamp
    .replaceAll("-", "/")
    .replace(/(\d{4}\/\d{2}\/\d{2})\/(\d{2})(\d{2})(\d{2})/, "$1 $2:$3:$4");
}

// Transform raw graph data to PackageNode array
export function transformData(rawData: RawGraphData): PackageNode[] {
  const nodes: PackageNode[] = [];

  if (!rawData.nodes || typeof rawData.nodes !== "object") {
    throw new Error("Invalid graph.json format: missing nodes object");
  }

  Object.entries(rawData.nodes).forEach(([name, info]) => {
    const node: PackageNode = {
      id: name,
      explicit: info.explicit || false,
      version: info.version || "unknown",
      depends_on: info.depends_on || [],
      required_by: info.required_by || [],
    };
    nodes.push(node);
  });

  return nodes;
}

// Recursively collect all dependencies of a package
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

// Collect full dependency tree (package and all transitive dependencies)
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

// Check if a package is orphaned (dependency with no parents)
export function isOrphaned(pkg: PackageNode): boolean {
  return !pkg.explicit && pkg.required_by.length === 0;
}

// Sort packages alphabetically by name
export function sortPackagesByName(packages: PackageNode[]): PackageNode[] {
  return packages.sort((a, b) => a.id.localeCompare(b.id));
}

// Count explicit and dependency packages
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
