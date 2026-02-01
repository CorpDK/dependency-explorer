"use client";

import { PackageNode, ViewProps } from "@/types/package";
import { fuzzyMatch } from "@/lib/utils";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import SearchInput from "@/components/ui/SearchInput";
import PackageItem from "@/components/ui/PackageItem";
import Sidebar from "@/components/graph/Sidebar";
import { useMemo, useRef, useState, useEffect } from "react";
import * as d3 from "d3";

type FilterType = "all" | "explicit" | "dependency";

interface PackageLink extends d3.SimulationLinkDatum<PackageNode> {
  source: string | PackageNode;
  target: string | PackageNode;
  type: "explicit" | "dependency";
}

// Collect full dependency tree (only downward dependencies, not dependents)
function collectPackageTree(
  packageId: string,
  nodes: PackageNode[],
  result: Set<string>,
): void {
  if (result.has(packageId)) return;
  result.add(packageId);

  const pkg = nodes.find((n) => n.id === packageId);
  if (!pkg) return;

  // Collect all dependencies recursively (transitive dependencies)
  pkg.depends_on.forEach((dep) => {
    collectPackageTree(dep, nodes, result);
  });
}

function FilterButton({
  active,
  onClick,
  children,
}: Readonly<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}>) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
        active
          ? "bg-blue-500 text-white"
          : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
      }`}
    >
      {children}
    </button>
  );
}

export default function Investigate({
  nodes,
  loading,
  error,
}: Readonly<ViewProps>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedPackage, setSelectedPackage] = useState<PackageNode | null>(
    null,
  );
  const [selectedGraphNode, setSelectedGraphNode] =
    useState<PackageNode | null>(null);
  const [sidebarHidden, setSidebarHidden] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<PackageNode, PackageLink> | null>(
    null,
  );

  // Filter packages based on search and type filter
  const filteredPackages = useMemo(() => {
    let filtered = nodes.filter((n) => fuzzyMatch(searchQuery, n.id));

    if (filterType === "explicit") {
      filtered = filtered.filter((n) => n.explicit);
    } else if (filterType === "dependency") {
      filtered = filtered.filter((n) => !n.explicit);
    }

    return filtered.sort((a, b) => a.id.localeCompare(b.id));
  }, [nodes, searchQuery, filterType]);

  // Get the sub-graph for the selected package
  const subGraphData = useMemo(() => {
    if (!selectedPackage) return { nodes: [], links: [] };

    const treePackageIds = new Set<string>();
    collectPackageTree(selectedPackage.id, nodes, treePackageIds);

    const subNodes = nodes.filter((n) => treePackageIds.has(n.id));
    const subLinks: PackageLink[] = [];

    subNodes.forEach((node) => {
      node.depends_on.forEach((dep) => {
        if (treePackageIds.has(dep)) {
          subLinks.push({
            source: node.id,
            target: dep,
            type: node.explicit ? "explicit" : "dependency",
          });
        }
      });
    });

    return { nodes: subNodes, links: subLinks };
  }, [selectedPackage, nodes]);

  // Render D3 sub-graph
  useEffect(() => {
    if (
      !svgRef.current ||
      !containerRef.current ||
      !selectedPackage ||
      subGraphData.nodes.length === 0
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

    // Simple zoom behavior
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
      .data(subGraphData.links)
      .join("line")
      .attr("class", (d) =>
        d.type === "explicit" ? "link link-explicit" : "link link-dependency",
      );

    // Nodes
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGCircleElement, PackageNode>("circle")
      .data(subGraphData.nodes)
      .join("circle")
      .attr("class", (d) => (d.explicit ? "node explicit" : "node dependency"))
      .attr("r", (d) => (d.id === selectedPackage.id ? 10 : 6))
      .on("click", (event, d) => {
        event.stopPropagation();
        setSelectedGraphNode(d);
        setSidebarHidden(false);
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

    // Highlight the selected package
    svg
      .selectAll(".node")
      .filter((d: any) => d.id === selectedPackage.id)
      .classed("selected", true);

    // Force simulation
    const simulation = d3
      .forceSimulation(subGraphData.nodes)
      .force(
        "link",
        d3
          .forceLink(subGraphData.links)
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
  }, [selectedPackage, subGraphData]);

  // Update selected node visual indicators
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    // Clear all selection classes
    svg.selectAll(".node").classed("selected", false).classed("list-selected", false);

    // Highlight the node selected from the list (root of the tree)
    if (selectedPackage) {
      svg
        .selectAll(".node")
        .filter((d: any) => d.id === selectedPackage.id)
        .classed("list-selected", true);
    }

    // Highlight the node clicked in the graph (shown in sidebar)
    if (selectedGraphNode && !sidebarHidden) {
      svg
        .selectAll(".node")
        .filter((d: any) => d.id === selectedGraphNode.id)
        .classed("selected", true);
    }
  }, [selectedGraphNode, sidebarHidden, selectedPackage]);

  const handleGraphPackageClick = (packageName: string) => {
    const node = subGraphData.nodes.find((n) => n.id === packageName);
    if (node) {
      setSelectedGraphNode(node);
      setSidebarHidden(false);
    }
  };

  const handleSidebarClose = () => {
    setSidebarHidden(true);
    setSelectedGraphNode(null);
  };

  if (loading) {
    return <LoadingState message="Loading packages..." />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (nodes.length === 0) {
    return (
      <EmptyState message="Please select a data file from the dropdown above to investigate packages." />
    );
  }

  return (
    <div className="h-full flex overflow-hidden bg-zinc-50 dark:bg-zinc-900">
      {/* Left Panel - Package List */}
      <div className="w-96 flex flex-col border-r border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800">
        <div className="p-4 border-b border-zinc-300 dark:border-zinc-700">
          <h2 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-zinc-100">
            Investigate Packages
          </h2>

          {/* Search Input */}
          <SearchInput
            placeholder="Search packages..."
            value={searchQuery}
            onChange={setSearchQuery}
            ringColor="ring-blue-500"
          />

          {/* Filter Buttons */}
          <div className="flex gap-2 mt-3">
            <FilterButton
              active={filterType === "all"}
              onClick={() => setFilterType("all")}
            >
              All ({nodes.length})
            </FilterButton>
            <FilterButton
              active={filterType === "explicit"}
              onClick={() => setFilterType("explicit")}
            >
              Explicit ({nodes.filter((n) => n.explicit).length})
            </FilterButton>
            <FilterButton
              active={filterType === "dependency"}
              onClick={() => setFilterType("dependency")}
            >
              Dependencies ({nodes.filter((n) => !n.explicit).length})
            </FilterButton>
          </div>
        </div>

        {/* Package List */}
        <div className="flex-1 overflow-y-auto">
          {filteredPackages.length === 0 ? (
            <div className="text-center text-zinc-500 dark:text-zinc-500 italic text-sm py-8">
              No packages match your criteria
            </div>
          ) : (
            <ul className="p-2 space-y-1">
              {filteredPackages.map((pkg) => (
                <li key={pkg.id}>
                  <PackageItem
                    pkg={pkg}
                    variant={pkg.explicit ? "explicit" : "dependency"}
                    isHighlighted={selectedPackage?.id === pkg.id}
                    onClick={() => setSelectedPackage(pkg)}
                    extraInfo={
                      <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                        {pkg.depends_on.length} deps, {pkg.required_by.length}{" "}
                        parents
                      </div>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Center Panel - Sub-Graph */}
      <div className="flex-1 flex flex-col">
        {selectedPackage ? (
          <>
            <div className="p-4 border-b border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Dependency Tree: {selectedPackage.id}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Showing {subGraphData.nodes.length} packages in the tree (
                {subGraphData.links.length} connections)
              </p>
            </div>
            <div className="flex-1 relative" ref={containerRef}>
              <svg
                className="w-full h-full cursor-grab active:cursor-grabbing"
                ref={svgRef}
              ></svg>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-zinc-500 dark:text-zinc-500">
              <p className="text-lg mb-2">Select a package to investigate</p>
              <p className="text-sm">
                The dependency tree will show all connected packages
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Sidebar */}
      {selectedPackage && (
        <Sidebar
          isHidden={sidebarHidden}
          selectedNode={selectedGraphNode}
          onClose={handleSidebarClose}
          onPackageClick={handleGraphPackageClick}
        />
      )}
    </div>
  );
}
