import { PackageNode, PackageLink } from "@/types/package";
import ZoomControls from "@/components/graph/ZoomControls";

interface GraphPanelProps {
  selectedPackage: PackageNode | null;
  subGraphData: { nodes: PackageNode[]; links: PackageLink[] };
  containerRef: React.RefObject<HTMLDivElement>;
  svgRef: React.RefObject<SVGSVGElement>;
  currentZoom: number;
  minZoom: number;
  maxZoom: number;
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
