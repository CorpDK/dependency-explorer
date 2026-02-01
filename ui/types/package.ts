import * as d3 from "d3";

export interface PackageNode extends d3.SimulationNodeDatum {
  id: string;
  explicit: boolean;
  version: string;
  depends_on: string[];
  required_by: string[];
}

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

export type ViewMode = "graph" | "list" | "orphaned";

export interface ViewProps {
  nodes: PackageNode[];
  loading: boolean;
  error: string;
}
