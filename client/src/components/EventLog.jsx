const EVENT_CONFIG = {
  connected: {
    label: "Connected",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
    icon: "🔌",
  },
  disconnected: {
    label: "Disconnected",
    color: "text-gray-600",
    bg: "bg-gray-50",
    border: "border-gray-200",
    icon: "🔴",
  },
  uploaded: {
    label: "File Uploaded",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "📤",
  },
  progress: {
    label: "Progress",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "⚙️",
  },
  complete: {
    label: "Complete",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
    icon: "✅",
  },
  failed: {
    label: "Failed",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "❌",
  },
};

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatData(type, data) {
  switch (type) {
    case "connected":
      return `Socket ID: ${data.socketId}`;
    case "uploaded":
      return `File ID: ${data.fileId}`;
    case "progress":
      return `Processed: ${data.processed?.toLocaleString()} | Valid: ${data.valid?.toLocaleString()} | Failed: ${data.failed?.toLocaleString()}`;
    case "complete":
      return `Total: ${data.total?.toLocaleString()} | Valid: ${data.valid?.toLocaleString()} | Failed: ${data.failed?.toLocaleString()}`;
    case "failed":
      return `Error: ${data.error}`;
    case "disconnected":
      return "Connection lost";
    default:
      return JSON.stringify(data);
  }
}

export function EventLog({ events }) {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 rounded-xl border border-dashed border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-400">
          No events yet. Upload a CSV to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {events.length >= 50 && (
        <p className="text-xs text-gray-400 text-center">
          Showing latest 50 events
        </p>
      )}

      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
        {events.map((event) => {
          const config = EVENT_CONFIG[event.type] ?? {
            label: event.type,
            color: "text-gray-700",
            bg: "bg-gray-50",
            border: "border-gray-200",
            icon: "📋",
          };

          return (
            <div
              key={event.id}
              className={[
                "flex items-start gap-3 px-3 py-2 rounded-lg border text-xs",
                config.bg,
                config.border,
              ].join(" ")}
            >
              <span className="text-base shrink-0">{config.icon}</span>

              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={["font-semibold", config.color].join(" ")}>
                    {config.label}
                  </span>
                  <span className="text-gray-400 shrink-0">
                    {formatTime(event.timestamp)}
                  </span>
                </div>
                <p className="text-gray-500 truncate">
                  {formatData(event.type, event.data)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
