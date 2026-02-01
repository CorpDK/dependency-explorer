import * as d3 from "d3";
import { RefObject } from "react";

interface UseZoomHandlersProps {
  svgRef: RefObject<SVGSVGElement | null>;
  zoomBehaviorRef: RefObject<d3.ZoomBehavior<SVGSVGElement, unknown> | null>;
  currentZoom: number;
  minZoom: number;
  maxZoom: number;
  zoomStep: number;
}

export function useZoomHandlers({
  svgRef,
  zoomBehaviorRef,
  currentZoom,
  minZoom,
  maxZoom,
  zoomStep,
}: UseZoomHandlersProps) {
  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    const newZoom = Math.min(currentZoom + zoomStep, maxZoom);
    svg
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.scaleTo, newZoom);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    const newZoom = Math.max(currentZoom - zoomStep, minZoom);
    svg
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.scaleTo, newZoom);
  };

  const handleZoomChange = (zoom: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(150).call(zoomBehaviorRef.current.scaleTo, zoom);
  };

  const handleZoomReset = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg
      .transition()
      .duration(500)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  return {
    handleZoomIn,
    handleZoomOut,
    handleZoomChange,
    handleZoomReset,
  };
}
