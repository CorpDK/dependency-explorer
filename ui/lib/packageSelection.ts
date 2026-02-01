import { PackageNode, SelectedPackage } from "@/types/package";

/**
 * Check if an explicit package should be highlighted based on selection state
 */
export function isExplicitHighlighted(
  pkg: PackageNode,
  selectedPackage: SelectedPackage | null,
  explicitDependenciesMap: Map<string, Set<string>>
): boolean {
  if (!selectedPackage) return false;

  // Highlight if this is the selected explicit package
  if (selectedPackage.type === "explicit" && selectedPackage.id === pkg.id) {
    return true;
  }

  // Highlight if this explicit package depends on the selected dependency
  if (selectedPackage.type === "dependency") {
    const deps = explicitDependenciesMap.get(pkg.id);
    return deps?.has(selectedPackage.id) ?? false;
  }

  return false;
}

/**
 * Check if a dependency package should be highlighted based on selection state
 */
export function isDependencyHighlighted(
  pkg: PackageNode,
  selectedPackage: SelectedPackage | null,
  explicitDependenciesMap: Map<string, Set<string>>
): boolean {
  if (!selectedPackage) return false;

  // Highlight if this is the selected dependency package
  if (selectedPackage.type === "dependency" && selectedPackage.id === pkg.id) {
    return true;
  }

  // Highlight if the selected explicit package depends on this dependency
  if (selectedPackage.type === "explicit") {
    const deps = explicitDependenciesMap.get(selectedPackage.id);
    return deps?.has(pkg.id) ?? false;
  }

  return false;
}

/**
 * Check if a package should be highlighted in any context
 */
export function isPackageHighlighted(
  pkg: PackageNode,
  selectedPackage: SelectedPackage | null,
  dependencyMap: Map<string, Set<string>>
): boolean {
  if (!selectedPackage) return false;

  // Package is directly selected
  if (pkg.id === selectedPackage.id) return true;

  // Check if package is in the dependency chain
  const deps = dependencyMap.get(selectedPackage.id);
  if (deps?.has(pkg.id)) return true;

  // Check reverse dependency
  const reverseDeps = dependencyMap.get(pkg.id);
  if (reverseDeps?.has(selectedPackage.id)) return true;

  return false;
}
