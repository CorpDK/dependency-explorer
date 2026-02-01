"use client";

import PackageColumn from "@/components/list/PackageColumn";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import { collectDependencies, fuzzyMatch } from "@/lib/utils";
import { PackageNode, ViewProps } from "@/types/package";
import { useMemo, useState } from "react";

export default function PackageList({
  nodes,
  loading,
  error,
}: Readonly<ViewProps>) {
  const [explicitSearchQuery, setExplicitSearchQuery] = useState("");
  const [dependencySearchQuery, setDependencySearchQuery] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<{
    id: string;
    type: "explicit" | "dependency";
  } | null>(null);

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
        ...dependsOnSelected.sort((a, b) => a.id.localeCompare(b.id)),
        ...others.sort((a, b) => a.id.localeCompare(b.id)),
      ];
    }

    return [...selected, ...remaining.sort((a, b) => a.id.localeCompare(b.id))];
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
        ...isDependencyOf.sort((a, b) => a.id.localeCompare(b.id)),
        ...others.sort((a, b) => a.id.localeCompare(b.id)),
      ];
    }

    return [...selected, ...remaining.sort((a, b) => a.id.localeCompare(b.id))];
  }, [nodes, dependencySearchQuery, selectedPackage, explicitDependenciesMap]);

  const explicitCount = nodes.filter((n) => n.explicit).length;
  const dependencyCount = nodes.length - explicitCount;

  const handleExplicitClick = (pkg: PackageNode) => {
    if (
      selectedPackage?.id === pkg.id &&
      selectedPackage?.type === "explicit"
    ) {
      setSelectedPackage(null);
    } else {
      setSelectedPackage({ id: pkg.id, type: "explicit" });
      setDependencySearchQuery("");
    }
  };

  const handleDependencyClick = (pkg: PackageNode) => {
    if (
      selectedPackage?.id === pkg.id &&
      selectedPackage?.type === "dependency"
    ) {
      setSelectedPackage(null);
    } else {
      setSelectedPackage({ id: pkg.id, type: "dependency" });
      setExplicitSearchQuery("");
    }
  };

  const isExplicitHighlighted = (pkg: PackageNode): boolean => {
    if (!selectedPackage) return false;
    if (selectedPackage.type === "explicit" && selectedPackage.id === pkg.id)
      return true;
    if (selectedPackage.type === "dependency") {
      const deps = explicitDependenciesMap.get(pkg.id);
      return deps?.has(selectedPackage.id) ?? false;
    }
    return false;
  };

  const isDependencyHighlighted = (pkg: PackageNode): boolean => {
    if (!selectedPackage) return false;
    if (selectedPackage.type === "dependency" && selectedPackage.id === pkg.id)
      return true;
    if (selectedPackage.type === "explicit") {
      const deps = explicitDependenciesMap.get(selectedPackage.id);
      return deps?.has(pkg.id) ?? false;
    }
    return false;
  };

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
