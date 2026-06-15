export function MetricsCard({ label, value, subValue, icon, color = "gray" }) {
  const colors = {
    gray: {
      bg: "bg-gray-50",
      border: "border-gray-200",
      label: "text-gray-500",
      value: "text-gray-800",
      sub: "text-gray-400",
    },
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      label: "text-blue-600",
      value: "text-blue-800",
      sub: "text-blue-400",
    },
    green: {
      bg: "bg-green-50",
      border: "border-green-200",
      label: "text-green-600",
      value: "text-green-800",
      sub: "text-green-400",
    },
    red: {
      bg: "bg-red-50",
      border: "border-red-200",
      label: "text-red-600",
      value: "text-red-800",
      sub: "text-red-400",
    },
    yellow: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      label: "text-yellow-600",
      value: "text-yellow-800",
      sub: "text-yellow-400",
    },
  };

  const c = colors[color] ?? colors.gray;

  return (
    <div
      className={[
        "flex flex-col gap-2 p-4 rounded-xl border",
        c.bg,
        c.border,
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        {icon && <span className="text-lg">{icon}</span>}
        <span
          className={[
            "text-xs font-medium uppercase tracking-wide",
            c.label,
          ].join(" ")}
        >
          {label}
        </span>
      </div>

      <p className={["text-2xl font-bold", c.value].join(" ")}>
        {value ?? "—"}
      </p>

      {subValue && <p className={["text-xs", c.sub].join(" ")}>{subValue}</p>}
    </div>
  );
}
