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
    <div className="absolute bottom-6 left-6 bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-3 z-50 flex flex-col gap-2 min-w-[180px] pointer-events-auto">
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
        >
          −
        </button>
        <button
          onClick={onReset}
          className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded text-xs font-medium transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-600"
          title="Reset zoom"
        >
          Reset
        </button>
        <button
          onClick={onZoomIn}
          disabled={currentZoom >= maxZoom}
          className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded text-lg font-bold transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zoom in"
        >
          +
        </button>
      </div>

      {/* Zoom slider */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {Math.round(minZoom * 100)}%
        </span>
        <input
          type="range"
          min={minZoom}
          max={maxZoom}
          step={0.1}
          value={currentZoom}
          onChange={(e) => onZoomChange(Number.parseFloat(e.target.value))}
          className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
        />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {Math.round(maxZoom * 100)}%
        </span>
      </div>
    </div>
  );
}
