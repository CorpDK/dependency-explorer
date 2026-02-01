import { PackageNode, SelectedPackage } from "@/types/package";
import {
  isExplicitHighlighted,
  isDependencyHighlighted,
} from "@/lib/packageSelection";
import { useCallback } from "react";

/**
 * Hook to manage package highlighting logic
 */
export function usePackageHighlighting(
  selectedPackage: SelectedPackage | null,
  explicitDependenciesMap: Map<string, Set<string>>
) {
  const checkIsExplicitHighlighted = useCallback(
    (pkg: PackageNode): boolean =>
      isExplicitHighlighted(pkg, selectedPackage, explicitDependenciesMap),
    [selectedPackage, explicitDependenciesMap]
  );

  const checkIsDependencyHighlighted = useCallback(
    (pkg: PackageNode): boolean =>
      isDependencyHighlighted(pkg, selectedPackage, explicitDependenciesMap),
    [selectedPackage, explicitDependenciesMap]
  );

  return {
    isExplicitHighlighted: checkIsExplicitHighlighted,
    isDependencyHighlighted: checkIsDependencyHighlighted,
  };
}
