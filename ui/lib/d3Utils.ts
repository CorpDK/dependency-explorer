import * as d3 from "d3";
import { RefObject } from "react";

/**
 * Update node selection state in the SVG
 * Clears all selections and applies "selected" class to the specified node
 */
export function updateNodeSelection(
  svgRef: RefObject<SVGSVGElement | null>,
  selectedNodeId: string | null,
  sidebarHidden: boolean,
): void {
  if (!svgRef.current) return;

  const svg = d3.select(svgRef.current);
  svg.selectAll(".node").classed("selected", false);

  if (selectedNodeId && !sidebarHidden) {
    svg
      .selectAll(".node")
      .filter((d: any) => d.id === selectedNodeId)
      .classed("selected", true);
  }
}

/**
 * Update dual selection state (list selection + graph selection)
 * Used in Investigate view with separate classes for list and graph selection
 */
export function updateDualSelection(
  svgRef: RefObject<SVGSVGElement | null>,
  listSelectedId: string | null,
  graphSelectedId: string | null,
  sidebarHidden: boolean,
): void {
  if (!svgRef.current) return;

  const svg = d3.select(svgRef.current);

  // Clear all selection classes
  svg
    .selectAll(".node")
    .classed("selected", false)
    .classed("list-selected", false);

  // Highlight the node selected from the list (root of the tree)
  if (listSelectedId) {
    svg
      .selectAll(".node")
      .filter((d: any) => d.id === listSelectedId)
      .classed("list-selected", true);
  }

  // Highlight the node clicked in the graph (shown in sidebar)
  if (graphSelectedId && !sidebarHidden) {
    svg
      .selectAll(".node")
      .filter((d: any) => d.id === graphSelectedId)
      .classed("selected", true);
  }
}

/**
 * Clear all selection classes from nodes
 */
export function clearNodeSelection(
  svgRef: RefObject<SVGSVGElement | null>,
): void {
  if (!svgRef.current) return;

  const svg = d3.select(svgRef.current);
  svg
    .selectAll(".node")
    .classed("selected", false)
    .classed("list-selected", false);
}

/**
 * Apply a custom class to specific nodes based on a filter
 */
export function applyNodeClass(
  svgRef: RefObject<SVGSVGElement | null>,
  className: string,
  filter: (d: any) => boolean,
): void {
  if (!svgRef.current) return;

  const svg = d3.select(svgRef.current);
  svg.selectAll(".node").classed(className, filter);
}
