"use client";

import DependencyIndicator from "@/components/ui/DependencyIndicator";
import DependencyInfo from "@/components/ui/DependencyInfo";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import PackageItem from "@/components/ui/PackageItem";
import SearchInput from "@/components/ui/SearchInput";
import { fuzzyMatch, isOrphaned, sortPackagesByName } from "@/lib/utils";
import { PackageNode, ViewProps } from "@/types/package";
import { useMemo, useState } from "react";

export default function OrphanedPackages({
  nodes,
  loading,
  error,
}: Readonly<ViewProps>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<PackageNode | null>(
    null,
  );

  // Filter orphaned packages: dependencies with no parents
  const orphanedPackages = useMemo(() => {
    return nodes.filter((node) => isOrphaned(node));
  }, [nodes]);

  // Filter and sort orphaned packages based on search query
  const sortedOrphanedPackages = useMemo(() => {
    const filtered = orphanedPackages.filter((pkg) =>
      fuzzyMatch(searchQuery, pkg.id),
    );
    return sortPackagesByName(filtered);
  }, [orphanedPackages, searchQuery]);

  // Get the dependencies of the selected package
  const selectedPackageDependencies = useMemo(() => {
    if (!selectedPackage) return [];

    const deps = selectedPackage.depends_on
      .map((depId) => nodes.find((n) => n.id === depId))
      .filter((node): node is PackageNode => node !== undefined);
    return sortPackagesByName(deps);
  }, [selectedPackage, nodes]);

  const handlePackageClick = (pkg: PackageNode) => {
    if (selectedPackage?.id === pkg.id) {
      setSelectedPackage(null);
    } else {
      setSelectedPackage(pkg);
    }
  };

  if (loading) {
    return <LoadingState message="Loading package data..." />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (nodes.length === 0) {
    return (
      <EmptyState message="Please select a data file from the dropdown above to view orphaned packages." />
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
            <SearchInput
              placeholder="Search orphaned packages..."
              value={searchQuery}
              onChange={setSearchQuery}
              ringColor="focus:ring-orange-500"
            />
            <div className="overflow-y-auto max-h-[calc(100vh-380px)]">
              {sortedOrphanedPackages.length === 0 ? (
                <div className="text-center text-zinc-500 dark:text-zinc-500 italic text-sm py-8">
                  {searchQuery
                    ? "No orphaned packages match your search"
                    : "No orphaned packages found"}
                </div>
              ) : (
                <ul className="space-y-1">
                  {sortedOrphanedPackages.map((pkg) => (
                    <li key={pkg.id}>
                      <PackageItem
                        pkg={pkg}
                        variant="orphaned"
                        isHighlighted={selectedPackage?.id === pkg.id}
                        onClick={() => handlePackageClick(pkg)}
                        extraInfo={
                          <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                            {pkg.depends_on.length}{" "}
                            {pkg.depends_on.length === 1
                              ? "dependency"
                              : "dependencies"}
                          </div>
                        }
                      />
                    </li>
                  ))}
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
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                    Selected package:
                  </div>
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
                      {selectedPackageDependencies.map((dep) => (
                        <li key={dep.id}>
                          <button
                            onClick={() => setSelectedPackage(dep)}
                            className="w-full text-left p-2 rounded transition-colors relative bg-zinc-50 dark:bg-zinc-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <DependencyIndicator pkg={dep} />
                            <div className="font-mono text-sm text-zinc-900 dark:text-zinc-100 pr-4">
                              {dep.id}
                            </div>
                            <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                              v{dep.version}
                            </div>
                            <DependencyInfo pkg={dep} />
                          </button>
                        </li>
                      ))}
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
