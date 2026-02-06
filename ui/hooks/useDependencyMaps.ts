import { collectDependencies } from "@/lib/packages";
import { PackageNode } from "@/types/package";
import { useMemo } from "react";

/**
 * Hook to compute dependency maps for package relationships
 */
export function useDependencyMaps(nodes: PackageNode[]) {
  // Compute which explicit packages depend on each dependency package
  const dependencyMap = useMemo(() => {
    const explicitPackages = nodes.filter((n) => n.explicit);
    const depMap = new Map<string, Set<string>>();

    // For each explicit package, collect all its dependencies (transitive)
    explicitPackages.forEach((explicitPkg) => {
      const allDeps = new Set<string>();
      const visited = new Set<string>();
      collectDependencies(explicitPkg.id, nodes, visited, allDeps);

      // Map each dependency back to this explicit package
      allDeps.forEach((dep) => {
        if (!depMap.has(dep)) {
          depMap.set(dep, new Set());
        }
        depMap.get(dep)!.add(explicitPkg.id);
      });
    });

    return depMap;
  }, [nodes]);

  // Compute reverse dependency map (explicit package -> all its dependencies)
  const explicitDependenciesMap = useMemo(() => {
    const depMap = new Map<string, Set<string>>();

    nodes
      .filter((n) => n.explicit)
      .forEach((explicitPkg) => {
        const allDeps = new Set<string>();
        const visited = new Set<string>();
        collectDependencies(explicitPkg.id, nodes, visited, allDeps);
        depMap.set(explicitPkg.id, allDeps);
      });

    return depMap;
  }, [nodes]);

  return {
    dependencyMap,
    explicitDependenciesMap,
  };
}
