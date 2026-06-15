const STATUS_COLOR = {
  2: "text-green-700 bg-green-50 border-green-200", // 2xx
  3: "text-blue-700 bg-blue-50 border-blue-200", // 3xx
  4: "text-yellow-700 bg-yellow-50 border-yellow-200", // 4xx
  5: "text-red-700 bg-red-50 border-red-200", // 5xx
};

function getStatusColor(status) {
  const group = Math.floor(status / 100);
  return STATUS_COLOR[group] ?? "text-gray-700 bg-gray-50 border-gray-200";
}

function getDurationColor(duration) {
  const ms = parseFloat(duration);
  if (ms >= 1000) return "text-red-600";
  if (ms >= 500) return "text-yellow-600";
  if (ms >= 200) return "text-blue-600";
  return "text-green-600";
}

export function RequestLog({ requests }) {
  if (requests.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 rounded-xl border border-dashed border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-400">No requests yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
      {requests.map((req) => (
        <div
          key={req.id}
          className="flex flex-col gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50 text-xs"
        >
          {/* top row - method, path, status, duration */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* method */}
            <span className="font-bold text-gray-700 uppercase">
              {req.method}
            </span>

            {/* path */}
            <span className="text-gray-500 flex-1 truncate">{req.path}</span>

            {/* status */}
            <span
              className={[
                "px-2 py-0.5 rounded-full border text-xs font-semibold",
                getStatusColor(req.status),
              ].join(" ")}
            >
              {req.status}
            </span>

            {/* duration */}
            <span
              className={["font-bold", getDurationColor(req.duration)].join(
                " ",
              )}
            >
              {req.duration}
            </span>
          </div>

          {/* bottom row - cpu and memory delta */}
          <div className="flex items-center gap-4 text-gray-400">
            {/* cpu */}
            <div className="flex items-center gap-1">
              <span>⚡</span>
              <span>CPU {req.cpu?.total}</span>
            </div>

            {/* memory delta */}
            <div className="flex items-center gap-1">
              <span>🧠</span>
              <span>Heap {req.memory?.heapUsedDelta}</span>
            </div>

            {/* rss delta */}
            <div className="flex items-center gap-1">
              <span>💾</span>
              <span>RSS {req.memory?.rssDelta}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
