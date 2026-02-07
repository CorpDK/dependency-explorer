import ZoomControls from "@/components/graph/ZoomControls";
import { DependencyDirection, PackageLink, PackageNode } from "@/types/package";

interface GraphPanelProps {
  selectedPackage: PackageNode | null;
  subGraphData: { nodes: PackageNode[]; links: PackageLink[] };
  containerRef: React.RefObject<HTMLDivElement | null>;
  svgRef: React.RefObject<SVGSVGElement | null>;
  currentZoom: number;
  minZoom: number;
  maxZoom: number;
  direction: DependencyDirection;
  onDirectionChange: (direction: DependencyDirection) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomChange: (zoom: number) => void;
  onZoomReset: () => void;
}

export default function GraphPanel({
  selectedPackage,
  subGraphData,
  containerRef,
  svgRef,
  currentZoom,
  minZoom,
  maxZoom,
  direction,
  onDirectionChange,
  onZoomIn,
  onZoomOut,
  onZoomChange,
  onZoomReset,
}: Readonly<GraphPanelProps>) {
  return (
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
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onDirectionChange("forward")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  direction === "forward"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                }`}
                title="Show dependencies (packages this depends on)"
              >
                Dependencies
              </button>
              <button
                onClick={() => onDirectionChange("reverse")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  direction === "reverse"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                }`}
                title="Show reverse dependencies (packages that require this)"
              >
                Reverse
              </button>
              <button
                onClick={() => onDirectionChange("both")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  direction === "both"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                }`}
                title="Show both dependencies and reverse dependencies"
              >
                All
              </button>
            </div>
          </div>
          <div className="flex-1 relative" ref={containerRef}>
            <svg
              className="w-full h-full cursor-grab active:cursor-grabbing pointer-events-auto"
              ref={svgRef}
            ></svg>
            <ZoomControls
              currentZoom={currentZoom}
              minZoom={minZoom}
              maxZoom={maxZoom}
              onZoomIn={onZoomIn}
              onZoomOut={onZoomOut}
              onZoomChange={onZoomChange}
              onReset={onZoomReset}
            />
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
  );
}
