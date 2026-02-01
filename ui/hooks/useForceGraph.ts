import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { PackageNode, PackageLink } from "@/types/package";

interface UseForceGraphProps {
  svgRef: React.RefObject<SVGSVGElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  nodes: PackageNode[];
  links: PackageLink[];
  onNodeClick: (node: PackageNode) => void;
  highlightedNodeId?: string;
}

export function useForceGraph({
  svgRef,
  containerRef,
  nodes,
  links,
  onNodeClick,
  highlightedNodeId,
}: UseForceGraphProps) {
  const simulationRef = useRef<d3.Simulation<PackageNode, PackageLink> | null>(
    null,
  );

  useEffect(() => {
    if (
      !svgRef.current ||
      !containerRef.current ||
      nodes.length === 0
    )
      return;

    // Stop existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
      simulationRef.current.on("tick", null);
      simulationRef.current = null;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Links
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("class", (d) =>
        d.type === "explicit" ? "link link-explicit" : "link link-dependency",
      );

    // Nodes
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGCircleElement, PackageNode>("circle")
      .data(nodes)
      .join("circle")
      .attr("class", (d) => (d.explicit ? "node explicit" : "node dependency"))
      .attr("r", (d) => (highlightedNodeId && d.id === highlightedNodeId ? 10 : 6))
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeClick(d);
      })
      .call(
        d3
          .drag<SVGCircleElement, PackageNode>()
          .on("start", (event) => {
            if (!event.active && simulationRef.current)
              simulationRef.current.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
          })
          .on("drag", (event) => {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
          })
          .on("end", (event) => {
            if (!event.active && simulationRef.current)
              simulationRef.current.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
          }),
      );

    node.append("title").text((d) => `${d.id}\nv${d.version}`);

    // Force simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(80),
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(20));

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as PackageNode).x || 0)
        .attr("y1", (d) => (d.source as PackageNode).y || 0)
        .attr("x2", (d) => (d.target as PackageNode).x || 0)
        .attr("y2", (d) => (d.target as PackageNode).y || 0);

      node.attr("cx", (d) => d.x || 0).attr("cy", (d) => d.y || 0);
    });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
      simulation.on("tick", null);
      svg.selectAll("*").remove();
    };
  }, [svgRef, containerRef, nodes, links, onNodeClick, highlightedNodeId]);

  return simulationRef;
}
