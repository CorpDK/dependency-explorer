import * as d3 from "d3";

export interface PackageNode extends d3.SimulationNodeDatum {
  id: string;
  explicit: boolean;
  version: string;
  depends_on: string[];
  required_by: string[];
  broken?: boolean; // True if this is a missing dependency
}

export interface PackageLink extends d3.SimulationLinkDatum<PackageNode> {
  source: string | PackageNode;
  target: string | PackageNode;
  type: PackageLinkType;
}

export type PackageLinkType = "explicit" | "dependency" | "broken";

export interface GraphInfo {
  os: string;
  hostname: string;
  timestamp: string;
  shell: string;
}

export interface RawGraphData {
  info?: GraphInfo;
  nodes: {
    [packageName: string]: PackageInfo;
  };
}

export interface PackageInfo {
  explicit: boolean;
  version: string;
  depends_on: string[];
  required_by: string[];
}

export type ViewMode = "graph" | "list" | "orphaned" | "investigate";

export interface ViewProps {
  nodes: PackageNode[];
  loading: boolean;
  error: string;
}

// Selection state
export interface SelectedPackage {
  id: string;
  type: "explicit" | "dependency";
}

// Filter types
export type InvestigateFilterType = "all" | "explicit" | "dependency";
export type ColumnVariant = "explicit" | "dependency";
export type DependencyDirection = "forward" | "reverse" | "both";

// Package status
export type PackageStatus = "explicit" | "dependency" | "orphaned";

// Tab navigation
export interface TabProps {
  label: string;
  value: ViewMode;
}
