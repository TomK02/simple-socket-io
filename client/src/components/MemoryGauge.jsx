function GaugeBar({ label, used, total, usedPercent, color }) {
  const percent = parseFloat(usedPercent);

  const colors = {
    blue: {
      bar: "bg-blue-500",
      text: "text-blue-700",
      bg: "bg-blue-100",
    },
    green: {
      bar: "bg-green-500",
      text: "text-green-700",
      bg: "bg-green-100",
    },
    yellow: {
      bar: "bg-yellow-500",
      text: "text-yellow-700",
      bg: "bg-yellow-100",
    },
    red: {
      bar: "bg-red-500",
      text: "text-red-700",
      bg: "bg-red-100",
    },
  };

  // auto color based on usage percent
  function resolveColor() {
    if (color) return colors[color] ?? colors.blue;
    if (percent >= 90) return colors.red;
    if (percent >= 70) return colors.yellow;
    if (percent >= 50) return colors.green;
    return colors.blue;
  }

  const c = resolveColor();

  return (
    <div className="flex flex-col gap-1">
      {/* label and percent */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 font-medium">{label}</span>
        <span className={["font-bold", c.text].join(" ")}>
          {percent.toFixed(1)}%
        </span>
      </div>

      {/* bar track */}
      <div className={["w-full h-3 rounded-full overflow-hidden", c.bg].join(" ")}>
        <div
          className={["h-full rounded-full transition-all duration-500", c.bar].join(" ")}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>

      {/* used / total */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{used} used</span>
        <span>{total} total</span>
      </div>
    </div>
  );
}

export function MemoryGauge({ memory }) {
  if (!memory) {
    return (
      <div className="flex items-center justify-center h-24 rounded-xl border border-dashed border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-400">No memory data yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* V8 heap */}
      <GaugeBar
        label="V8 Heap"
        used={memory.heapUsed}
        total={memory.heapTotal}
        usedPercent={memory.heapUsedPercent}
      />

      {/* system RAM */}
      <GaugeBar
        label="System RAM"
        used={memory.systemUsed}
        total={memory.systemTotal}
        usedPercent={memory.systemUsedPercent}
      />

      {/* RSS */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 font-medium">RSS</span>
          <span className="text-gray-400 font-medium">{memory.rss}</span>
        </div>
        <p className="text-xs text-gray-400">
          Total memory held by the process including C++ heap
        </p>
      </div>
    </div>
  );
}