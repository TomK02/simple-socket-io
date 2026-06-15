export function StatsDisplay({ stats, progress, status }) {
  const data = stats ?? progress;

  const cards = [
    {
      label: "Total Processed",
      value: data.processed ?? data.total ?? 0,
      color: "text-gray-800",
      bg: "bg-gray-50",
      border: "border-gray-200",
      icon: "📊",
    },
    {
      label: "Valid Records",
      value: data.valid ?? 0,
      color: "text-green-700",
      bg: "bg-green-50",
      border: "border-green-200",
      icon: "✅",
    },
    {
      label: "Failed Records",
      value: data.failed ?? 0,
      color: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-200",
      icon: "❌",
    },
  ];

  const successRate =
    (data.total ?? data.processed ?? 0) > 0
      ? (
          ((data.valid ?? 0) / (data.total ?? data.processed ?? 1)) *
          100
        ).toFixed(1)
      : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className={[
              "flex flex-col gap-1 p-4 rounded-xl border",
              card.bg,
              card.border,
            ].join(" ")}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{card.icon}</span>
              <span className="text-xs text-gray-500">{card.label}</span>
            </div>
            <p className={["text-2xl font-bold", card.color].join(" ")}>
              {card.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {successRate !== null && (
        <div
          className={[
            "flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium",
            status === "complete"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-blue-50 border-blue-200 text-blue-700",
          ].join(" ")}
        >
          <span>Success Rate</span>
          <span className="text-lg font-bold">{successRate}%</span>
        </div>
      )}
    </div>
  );
}
