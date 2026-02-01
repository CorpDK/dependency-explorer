import { PackageNode, RawGraphData } from "@/types/package";

/**
 * Transform raw graph data to PackageNode array
 */
export function transformData(rawData: RawGraphData): PackageNode[] {
  const nodes: PackageNode[] = [];

  if (!rawData.nodes || typeof rawData.nodes !== "object") {
    throw new Error("Invalid graph.json format: missing nodes object");
  }

  Object.entries(rawData.nodes).forEach(([name, info]) => {
    const node: PackageNode = {
      id: name,
      explicit: info.explicit || false,
      version: info.version || "unknown",
      depends_on: info.depends_on || [],
      required_by: info.required_by || [],
    };
    nodes.push(node);
  });

  return nodes;
}
