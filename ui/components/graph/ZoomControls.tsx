import ZoomSlider from "../ui/ZoomSlider";

interface ZoomControlsProps {
  currentZoom: number;
  minZoom: number;
  maxZoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomChange: (zoom: number) => void;
  onReset: () => void;
}

export default function ZoomControls({
  currentZoom,
  minZoom,
  maxZoom,
  onZoomIn,
  onZoomOut,
  onZoomChange,
  onReset,
}: Readonly<ZoomControlsProps>) {
  const zoomPercent = Math.round(currentZoom * 100);

  return (
    <div className="absolute bottom-6 left-6 bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-3 z-50 flex flex-col gap-2 min-w-45 pointer-events-auto">
      {/* Zoom percentage display */}
      <div className="text-center text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {zoomPercent}%
      </div>

      {/* Zoom buttons */}
      <div className="flex gap-2">
        <button
          onClick={onZoomOut}
          disabled={currentZoom <= minZoom}
          className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded text-lg font-bold transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zoom out"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          onClick={onReset}
          className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded text-xs font-medium transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-600"
          title="Reset zoom"
          aria-label="Reset zoom to 100%"
        >
          Reset
        </button>
        <button
          onClick={onZoomIn}
          disabled={currentZoom >= maxZoom}
          className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded text-lg font-bold transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zoom in"
          aria-label="Zoom in"
        >
          +
        </button>
      </div>

      {/* Zoom slider */}
      <ZoomSlider
        currentZoom={currentZoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        onZoomChange={onZoomChange}
      />
    </div>
  );
}
