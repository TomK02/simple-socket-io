export function ProgressBar({ progress, total }) {
  const percentage = total > 0 ? Math.min((progress / total) * 100, 100) : 0;
  const isIndeterminate = total === 0;

  return (
    <div className="w-full flex flex-col gap-1">
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>Processing rows</span>
        <span>
          {isIndeterminate
            ? "Calculating..."
            : `${progress.toLocaleString()} / ${total.toLocaleString()} rows`}
        </span>
      </div>

      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        {isIndeterminate ? (
          <div className="h-full w-1/3 bg-blue-500 rounded-full animate-[slide_1.5s_ease-in-out_infinite]" />
        ) : (
          // determinate bar when total is known
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>

      {!isIndeterminate && (
        <p className="text-xs text-right text-gray-400">
          {percentage.toFixed(1)}%
        </p>
      )}
    </div>
  );
}
