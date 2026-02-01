interface ZoomSliderProps {
  currentZoom: number;
  minZoom: number;
  maxZoom: number;
  onZoomChange: (zoom: number) => void;
}

export default function ZoomSlider({
  currentZoom,
  minZoom,
  maxZoom,
  onZoomChange,
}: Readonly<ZoomSliderProps>) {
  return (
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
        aria-label="Adjust zoom level"
        aria-valuemin={Math.round(minZoom * 100)}
        aria-valuemax={Math.round(maxZoom * 100)}
        aria-valuenow={Math.round(currentZoom * 100)}
        aria-valuetext={`${Math.round(currentZoom * 100)}%`}
        className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
      />
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        {Math.round(maxZoom * 100)}%
      </span>
    </div>
  );
}
