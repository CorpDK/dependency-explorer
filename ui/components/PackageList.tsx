"use client";

import { useState, useMemo } from "react";

interface PackageNode {
  id: string;
  explicit: boolean;
  version: string;
  depends_on: string[];
  required_by: string[];
}

interface PackageListProps {
  nodes: PackageNode[];
  loading: boolean;
  error: string;
}

// Simple fuzzy search - checks if all characters of query appear in order in the target
function fuzzyMatch(query: string, target: string): boolean {
  if (!query) return true;

  const lowerQuery = query.toLowerCase();
  const lowerTarget = target.toLowerCase();

  let queryIndex = 0;
  for (let i = 0; i < lowerTarget.length && queryIndex < lowerQuery.length; i++) {
    if (lowerTarget[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === lowerQuery.length;
}

export default function PackageList({ nodes, loading, error }: PackageListProps) {
  const [explicitSearchQuery, setExplicitSearchQuery] = useState("");
  const [dependencySearchQuery, setDependencySearchQuery] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<{ id: string; type: "explicit" | "dependency" } | null>(null);

  // Compute which explicit packages depend on each dependency package
  const dependencyMap = useMemo(() => {
    const explicitPackages = nodes.filter((n) => n.explicit);
    const depMap = new Map<string, Set<string>>();

    // Helper function to traverse dependencies recursively
    const collectDependencies = (packageId: string, visited: Set<string>, result: Set<string>) => {
      if (visited.has(packageId)) return;
      visited.add(packageId);

      const pkg = nodes.find((n) => n.id === packageId);
      if (!pkg) return;

      pkg.depends_on.forEach((dep) => {
        result.add(dep);
        collectDependencies(dep, visited, result);
      });
    };

    // For each explicit package, collect all its dependencies (transitive)
    explicitPackages.forEach((explicitPkg) => {
      const allDeps = new Set<string>();
      const visited = new Set<string>();
      collectDependencies(explicitPkg.id, visited, allDeps);

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

    const collectDependencies = (packageId: string, visited: Set<string>, result: Set<string>) => {
      if (visited.has(packageId)) return;
      visited.add(packageId);

      const pkg = nodes.find((n) => n.id === packageId);
      if (!pkg) return;

      pkg.depends_on.forEach((dep) => {
        result.add(dep);
        collectDependencies(dep, visited, result);
      });
    };

    nodes.filter((n) => n.explicit).forEach((explicitPkg) => {
      const allDeps = new Set<string>();
      const visited = new Set<string>();
      collectDependencies(explicitPkg.id, visited, allDeps);
      depMap.set(explicitPkg.id, allDeps);
    });

    return depMap;
  }, [nodes]);

  // Filter and sort explicit packages
  const sortedExplicitPackages = useMemo(() => {
    let filtered = nodes.filter((n) => n.explicit && fuzzyMatch(explicitSearchQuery, n.id));

    // Separate the selected package, highlighted packages, and others
    const selected = selectedPackage?.type === "explicit"
      ? filtered.filter((pkg) => pkg.id === selectedPackage.id)
      : [];

    const remaining = filtered.filter((pkg) => pkg.id !== selectedPackage?.id);

    if (selectedPackage?.type === "dependency") {
      // When a dependency is selected, sort remaining explicit packages:
      // 1. Those that depend on this dependency (highlighted)
      // 2. The rest
      const dependsOnSelected = remaining.filter((pkg) => {
        const deps = explicitDependenciesMap.get(pkg.id);
        return deps && deps.has(selectedPackage.id);
      });
      const others = remaining.filter((pkg) => {
        const deps = explicitDependenciesMap.get(pkg.id);
        return !deps || !deps.has(selectedPackage.id);
      });

      return [
        ...selected,
        ...dependsOnSelected.sort((a, b) => a.id.localeCompare(b.id)),
        ...others.sort((a, b) => a.id.localeCompare(b.id))
      ];
    }

    return [
      ...selected,
      ...remaining.sort((a, b) => a.id.localeCompare(b.id))
    ];
  }, [nodes, explicitSearchQuery, selectedPackage, explicitDependenciesMap]);

  // Filter and sort dependency packages
  const sortedDependencyPackages = useMemo(() => {
    let filtered = nodes.filter((n) => !n.explicit && fuzzyMatch(dependencySearchQuery, n.id));

    // Separate the selected package, highlighted packages, and others
    const selected = selectedPackage?.type === "dependency"
      ? filtered.filter((pkg) => pkg.id === selectedPackage.id)
      : [];

    const remaining = filtered.filter((pkg) => pkg.id !== selectedPackage?.id);

    if (selectedPackage?.type === "explicit") {
      // When an explicit package is selected, sort remaining dependencies:
      // 1. Those that are dependencies of this explicit package (highlighted)
      // 2. The rest
      const selectedDeps = explicitDependenciesMap.get(selectedPackage.id);
      const isDependencyOf = remaining.filter((pkg) => selectedDeps && selectedDeps.has(pkg.id));
      const others = remaining.filter((pkg) => !selectedDeps || !selectedDeps.has(pkg.id));

      return [
        ...selected,
        ...isDependencyOf.sort((a, b) => a.id.localeCompare(b.id)),
        ...others.sort((a, b) => a.id.localeCompare(b.id))
      ];
    }

    return [
      ...selected,
      ...remaining.sort((a, b) => a.id.localeCompare(b.id))
    ];
  }, [nodes, dependencySearchQuery, selectedPackage, explicitDependenciesMap]);

  const explicitCount = nodes.filter((n) => n.explicit).length;
  const dependencyCount = nodes.length - explicitCount;

  const handleExplicitClick = (pkg: PackageNode) => {
    if (selectedPackage?.id === pkg.id && selectedPackage?.type === "explicit") {
      setSelectedPackage(null);
    } else {
      setSelectedPackage({ id: pkg.id, type: "explicit" });
      setDependencySearchQuery(""); // Clear dependency search when selecting explicit package
    }
  };

  const handleDependencyClick = (pkg: PackageNode) => {
    if (selectedPackage?.id === pkg.id && selectedPackage?.type === "dependency") {
      setSelectedPackage(null);
    } else {
      setSelectedPackage({ id: pkg.id, type: "dependency" });
      setExplicitSearchQuery(""); // Clear explicit search when selecting dependency package
    }
  };

  const isExplicitHighlighted = (pkg: PackageNode) => {
    if (!selectedPackage) return false;
    if (selectedPackage.type === "explicit" && selectedPackage.id === pkg.id) return true;
    if (selectedPackage.type === "dependency") {
      const deps = explicitDependenciesMap.get(pkg.id);
      return deps && deps.has(selectedPackage.id);
    }
    return false;
  };

  const isDependencyHighlighted = (pkg: PackageNode) => {
    if (!selectedPackage) return false;
    if (selectedPackage.type === "dependency" && selectedPackage.id === pkg.id) return true;
    if (selectedPackage.type === "explicit") {
      const deps = explicitDependenciesMap.get(selectedPackage.id);
      return deps && deps.has(pkg.id);
    }
    return false;
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center text-lg text-zinc-600 dark:text-zinc-400">
          <div className="border-4 border-zinc-300 dark:border-zinc-700 border-t-zinc-800 dark:border-t-zinc-300 rounded-full w-10 h-10 animate-spin mx-auto mb-4"></div>
          <div>Loading package data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-4 rounded max-w-md">
          <strong>Error loading data</strong>
          <br />
          {error}
          <br />
          <br />
          <small>Make sure JSON files exist in the data directory.</small>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center text-lg text-zinc-600 dark:text-zinc-400">
          Please select a data file from the dropdown above to view package lists.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto p-6 bg-zinc-50 dark:bg-zinc-900">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
        {/* Explicitly Installed Packages */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>{" "}
            Explicitly Installed Packages{" "}
            <span className="text-sm font-normal text-zinc-600 dark:text-zinc-400">
              ({sortedExplicitPackages.length}/{explicitCount})
            </span>
          </h2>
          <input
            type="text"
            placeholder="Search explicit packages..."
            value={explicitSearchQuery}
            onChange={(e) => setExplicitSearchQuery(e.target.value)}
            className="w-full px-3 py-2 mb-3 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <div className="overflow-y-auto max-h-[calc(100vh-380px)]">
            <ul className="space-y-1">
              {sortedExplicitPackages.map((pkg) => {
                const isHighlighted = isExplicitHighlighted(pkg);
                return (
                  <li key={pkg.id}>
                    <button
                      onClick={() => handleExplicitClick(pkg)}
                      className={`w-full text-left p-2 rounded transition-colors ${
                        isHighlighted
                          ? "bg-green-100 dark:bg-green-900/40 ring-2 ring-green-500"
                          : "bg-zinc-50 dark:bg-zinc-700/50 hover:bg-green-50 dark:hover:bg-green-900/20"
                      }`}
                    >
                      <div className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
                        {pkg.id}
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                        v{pkg.version}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Dependency Packages */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>{" "}
            Dependency Packages{" "}
            <span className="text-sm font-normal text-zinc-600 dark:text-zinc-400">
              ({sortedDependencyPackages.length}/{dependencyCount})
            </span>
          </h2>
          <input
            type="text"
            placeholder="Search dependency packages..."
            value={dependencySearchQuery}
            onChange={(e) => setDependencySearchQuery(e.target.value)}
            className="w-full px-3 py-2 mb-3 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="overflow-y-auto max-h-[calc(100vh-380px)]">
            <ul className="space-y-1">
              {sortedDependencyPackages.map((pkg) => {
                const explicitParents = dependencyMap.get(pkg.id);
                const parentsList = explicitParents
                  ? Array.from<string>(explicitParents).sort((a, b) => a.localeCompare(b)).join(", ")
                  : "";
                const isHighlighted = isDependencyHighlighted(pkg);
                const isOrphaned = pkg.required_by.length === 0;

                return (
                  <li key={pkg.id}>
                    <button
                      onClick={() => handleDependencyClick(pkg)}
                      className={`w-full text-left p-2 rounded transition-colors relative ${
                        isHighlighted
                          ? "bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-500"
                          : "bg-zinc-50 dark:bg-zinc-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      }`}
                    >
                      {isOrphaned && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500" title="Orphaned package"></span>
                      )}
                      <div className="font-mono text-sm text-zinc-900 dark:text-zinc-100 pr-4">
                        {pkg.id}
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                        v{pkg.version}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-1 italic">
                        Needed by: <span className="font-medium">{parentsList}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
