"use client";

import PackageColumn from "@/components/list/PackageColumn";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import { useDependencyMaps } from "@/hooks/useDependencyMaps";
import { usePackageHighlighting } from "@/hooks/usePackageHighlighting";
import { fuzzyMatch, sortPackagesByName } from "@/lib/utils";
import { PackageNode, SelectedPackage, ViewProps } from "@/types/package";
import { useCallback, useMemo, useState } from "react";

export default function PackageList({
  nodes,
  loading,
  error,
}: Readonly<ViewProps>) {
  const [explicitSearchQuery, setExplicitSearchQuery] = useState("");
  const [dependencySearchQuery, setDependencySearchQuery] = useState("");
  const [selectedPackage, setSelectedPackage] =
    useState<SelectedPackage | null>(null);

  // Use custom hooks for dependency maps and highlighting
  const { dependencyMap, explicitDependenciesMap } = useDependencyMaps(nodes);
  const { isExplicitHighlighted, isDependencyHighlighted } =
    usePackageHighlighting(selectedPackage, explicitDependenciesMap);

  // Filter and sort explicit packages
  const sortedExplicitPackages = useMemo(() => {
    let filtered = nodes.filter(
      (n) => n.explicit && fuzzyMatch(explicitSearchQuery, n.id),
    );

    const selected =
      selectedPackage?.type === "explicit"
        ? filtered.filter((pkg) => pkg.id === selectedPackage.id)
        : [];

    const remaining = filtered.filter((pkg) => pkg.id !== selectedPackage?.id);

    if (selectedPackage?.type === "dependency") {
      const dependsOnSelected = remaining.filter((pkg) =>
        explicitDependenciesMap.get(pkg.id)?.has(selectedPackage.id),
      );
      const others = remaining.filter(
        (pkg) =>
          !(
            explicitDependenciesMap.get(pkg.id)?.has(selectedPackage.id) ??
            false
          ),
      );

      return [
        ...selected,
        ...sortPackagesByName(dependsOnSelected),
        ...sortPackagesByName(others),
      ];
    }

    return [...selected, ...sortPackagesByName(remaining)];
  }, [nodes, explicitSearchQuery, selectedPackage, explicitDependenciesMap]);

  // Filter and sort dependency packages
  const sortedDependencyPackages = useMemo(() => {
    let filtered = nodes.filter(
      (n) => !n.explicit && fuzzyMatch(dependencySearchQuery, n.id),
    );

    const selected =
      selectedPackage?.type === "dependency"
        ? filtered.filter((pkg) => pkg.id === selectedPackage.id)
        : [];

    const remaining = filtered.filter((pkg) => pkg.id !== selectedPackage?.id);

    if (selectedPackage?.type === "explicit") {
      const selectedDeps = explicitDependenciesMap.get(selectedPackage.id);
      const isDependencyOf = remaining.filter((pkg) =>
        selectedDeps?.has(pkg.id),
      );
      const others = remaining.filter((pkg) => !selectedDeps?.has(pkg.id));

      return [
        ...selected,
        ...sortPackagesByName(isDependencyOf),
        ...sortPackagesByName(others),
      ];
    }

    return [...selected, ...sortPackagesByName(remaining)];
  }, [nodes, dependencySearchQuery, selectedPackage, explicitDependenciesMap]);

  const explicitCount = useMemo(
    () => nodes.filter((n) => n.explicit).length,
    [nodes],
  );
  const dependencyCount = nodes.length - explicitCount;

  const handleExplicitClick = useCallback(
    (pkg: PackageNode) => {
      if (
        selectedPackage?.id === pkg.id &&
        selectedPackage?.type === "explicit"
      ) {
        setSelectedPackage(null);
      } else {
        setSelectedPackage({ id: pkg.id, type: "explicit" });
        setDependencySearchQuery("");
      }
    },
    [selectedPackage],
  );

  const handleDependencyClick = useCallback(
    (pkg: PackageNode) => {
      if (
        selectedPackage?.id === pkg.id &&
        selectedPackage?.type === "dependency"
      ) {
        setSelectedPackage(null);
      } else {
        setSelectedPackage({ id: pkg.id, type: "dependency" });
        setExplicitSearchQuery("");
      }
    },
    [selectedPackage],
  );

  if (loading) {
    return <LoadingState message="Loading package data..." />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (nodes.length === 0) {
    return (
      <EmptyState message="Please select a data file from the dropdown above to view package lists." />
    );
  }

  return (
    <div className="h-full w-full overflow-auto p-6 bg-zinc-50 dark:bg-zinc-900">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
        <PackageColumn
          title="Explicitly Installed Packages"
          icon={<span className="w-3 h-3 rounded-full bg-green-500"></span>}
          variant="explicit"
          packages={sortedExplicitPackages}
          totalCount={explicitCount}
          searchQuery={explicitSearchQuery}
          onSearchChange={setExplicitSearchQuery}
          onPackageClick={handleExplicitClick}
          isHighlighted={isExplicitHighlighted}
          searchPlaceholder="Search explicit packages..."
          ringColor="focus:ring-green-500"
        />
        <PackageColumn
          title="Dependency Packages"
          icon={<span className="w-3 h-3 rounded-full bg-blue-500"></span>}
          variant="dependency"
          packages={sortedDependencyPackages}
          totalCount={dependencyCount}
          searchQuery={dependencySearchQuery}
          onSearchChange={setDependencySearchQuery}
          onPackageClick={handleDependencyClick}
          isHighlighted={isDependencyHighlighted}
          searchPlaceholder="Search dependency packages..."
          ringColor="focus:ring-blue-500"
          renderExtraInfo={(pkg) => {
            const explicitParents = dependencyMap.get(pkg.id);
            const parentsList = explicitParents
              ? Array.from<string>(explicitParents)
                  .sort((a, b) => a.localeCompare(b))
                  .join(", ")
              : "";
            return (
              <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-1 italic">
                Needed by: <span className="font-medium">{parentsList}</span>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
