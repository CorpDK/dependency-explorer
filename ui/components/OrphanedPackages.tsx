"use client";

import { useState, useMemo } from "react";

interface PackageNode {
  id: string;
  explicit: boolean;
  version: string;
  depends_on: string[];
  required_by: string[];
}

interface OrphanedPackagesProps {
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

export default function OrphanedPackages({ nodes, loading, error }: OrphanedPackagesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<PackageNode | null>(null);

  // Filter orphaned packages: dependencies with no parents (required_by is empty)
  const orphanedPackages = useMemo(() => {
    return nodes.filter(
      (node) => !node.explicit && node.required_by.length === 0
    );
  }, [nodes]);

  // Filter and sort orphaned packages based on search query
  const sortedOrphanedPackages = useMemo(() => {
    return orphanedPackages
      .filter((pkg) => fuzzyMatch(searchQuery, pkg.id))
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [orphanedPackages, searchQuery]);

  // Get the dependencies of the selected package (as full PackageNode objects)
  const selectedPackageDependencies = useMemo(() => {
    if (!selectedPackage) return [];

    return selectedPackage.depends_on
      .map((depId) => nodes.find((n) => n.id === depId))
      .filter((node): node is PackageNode => node !== undefined)
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [selectedPackage, nodes]);

  const handlePackageClick = (pkg: PackageNode) => {
    if (selectedPackage?.id === pkg.id) {
      setSelectedPackage(null);
    } else {
      setSelectedPackage(pkg);
    }
  };

  const handleDependencyClick = (pkg: PackageNode) => {
    setSelectedPackage(pkg);
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
          Please select a data file from the dropdown above to view orphaned packages.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto p-6 bg-zinc-50 dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Orphaned Packages List */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>{" "}
              Orphaned Dependency Packages{" "}
              <span className="text-sm font-normal text-zinc-600 dark:text-zinc-400">
                ({sortedOrphanedPackages.length}/{orphanedPackages.length})
              </span>
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
              Dependency packages that are not required by any other package
            </p>
            <input
              type="text"
              placeholder="Search orphaned packages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 mb-3 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <div className="overflow-y-auto max-h-[calc(100vh-380px)]">
              {sortedOrphanedPackages.length === 0 ? (
                <div className="text-center text-zinc-500 dark:text-zinc-500 italic text-sm py-8">
                  {searchQuery ? "No orphaned packages match your search" : "No orphaned packages found"}
                </div>
              ) : (
                <ul className="space-y-1">
                  {sortedOrphanedPackages.map((pkg) => {
                    const isSelected = selectedPackage?.id === pkg.id;
                    return (
                      <li key={pkg.id}>
                        <button
                          onClick={() => handlePackageClick(pkg)}
                          className={`w-full text-left p-2 rounded transition-colors ${
                            isSelected
                              ? "bg-orange-100 dark:bg-orange-900/40 ring-2 ring-orange-500"
                              : "bg-zinc-50 dark:bg-zinc-700/50 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                          }`}
                        >
                          <div className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
                            {pkg.id}
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                            v{pkg.version}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                            {pkg.depends_on.length} {pkg.depends_on.length === 1 ? "dependency" : "dependencies"}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Dependencies of Selected Orphaned Package */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>{" "}
              Dependencies{" "}
              {selectedPackage && (
                <span className="text-sm font-normal text-zinc-600 dark:text-zinc-400">
                  ({selectedPackageDependencies.length})
                </span>
              )}
            </h2>
            {selectedPackage ? (
              <>
                <div className="mb-3 p-3 bg-zinc-100 dark:bg-zinc-700 rounded">
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Selected package:</div>
                  <div className="font-mono text-sm text-zinc-900 dark:text-zinc-100 font-semibold">
                    {selectedPackage.id}
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                    v{selectedPackage.version}
                  </div>
                </div>
                <div className="overflow-y-auto max-h-[calc(100vh-480px)]">
                  {selectedPackageDependencies.length === 0 ? (
                    <div className="text-center text-zinc-500 dark:text-zinc-500 italic text-sm py-8">
                      This package has no dependencies
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {selectedPackageDependencies.map((dep) => {
                        const isOrphaned = !dep.explicit && dep.required_by.length === 0;
                        return (
                          <li key={dep.id}>
                            <button
                              onClick={() => handleDependencyClick(dep)}
                              className="w-full text-left p-2 rounded transition-colors bg-zinc-50 dark:bg-zinc-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    dep.explicit
                                      ? "bg-green-500"
                                      : isOrphaned
                                      ? "bg-orange-500"
                                      : "bg-blue-500"
                                  }`}
                                ></span>
                                <div className="flex-1">
                                  <div className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
                                    {dep.id}
                                  </div>
                                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                                    v{dep.version}
                                  </div>
                                  <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-1 italic">
                                    {dep.explicit
                                      ? "Explicitly installed"
                                      : isOrphaned
                                      ? "Orphaned dependency"
                                      : `Required by ${dep.required_by.length} package${dep.required_by.length === 1 ? "" : "s"}`}
                                  </div>
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center text-zinc-500 dark:text-zinc-500 italic text-sm py-8">
                Select an orphaned package to view its dependencies
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
