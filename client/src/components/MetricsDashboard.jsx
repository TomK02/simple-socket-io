import { useMetrics } from "../hooks/useMetrics";
import { MetricsCard } from "./MetricsCard";
import { MemoryGauge } from "./MemoryGauge";
import { RequestLog } from "./RequestLog";

export function MetricsDashboard() {
  const {
    metrics,
    requestLog,
    // isStreaming,
    error,
    fetchMetrics,
    // startStreaming,
    // stopStreaming,
  } = useMetrics();

  return (
    <div className="w-full flex flex-col gap-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-gray-900">Server Metrics</h2>
          <p className="text-sm text-gray-400">
            {metrics?.timestamp
              ? `Last updated: ${new Date(metrics.timestamp).toLocaleTimeString()}`
              : "Connecting..."}
          </p>
        </div>

        <button
          onClick={fetchMetrics}
          className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          🔄 Refresh
        </button>

        {/* stream toggle */}
        {/* {isStreaming ? (
            <button
              onClick={stopStreaming}
              className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              ⏹ Stop Stream
            </button>
          ) : (
            <button
              onClick={() => startStreaming(3000)}
              className="px-3 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              ▶ Start Stream
            </button>
          )} */}
      </div>

      {/* error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-medium text-red-700">❌ {error}</p>
        </div>
      )}

      {/* stat cards */}
      {metrics && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricsCard
            label="Heap Used"
            value={metrics.memory.heapUsed}
            subValue={`${metrics.memory.heapUsedPercent}% of heap`}
            icon="🧠"
            color="blue"
          />
          <MetricsCard
            label="System RAM"
            value={metrics.memory.systemUsed}
            subValue={`${metrics.memory.systemUsedPercent}% of ${metrics.memory.systemTotal}`}
            icon="💾"
            color="green"
          />
          {/* updated cpu card */}
          <MetricsCard
            label="CPU Usage"
            value={metrics.cpu.totalPercent}
            subValue={`User: ${metrics.cpu.userPercent} | Sys: ${metrics.cpu.systemPercent}`}
            icon="⚡"
            color={
              parseFloat(metrics.cpu.totalPercent) >= 80
                ? "red"
                : parseFloat(metrics.cpu.totalPercent) >= 50
                  ? "yellow"
                  : "green"
            }
          />
          <MetricsCard
            label="Uptime"
            value={metrics.process.uptime}
            subValue={`PID ${metrics.process.pid}`}
            icon="⏱"
            color="gray"
          />
        </div>
      )}

      {/* memory gauges */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Memory Usage
        </h3>
        <MemoryGauge memory={metrics?.memory} />
      </div>

      {/* cpu info */}
      {metrics && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            CPU Info
          </h3>
          <div className="flex flex-col gap-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span className="text-gray-400">Model</span>
              <span className="font-medium truncate ml-4">
                {metrics.cpu.model}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Cores</span>
              <span className="font-medium">{metrics.cpu.cores}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Load Avg (1m/5m/15m)</span>
              <span className="font-medium">
                {metrics.cpu.loadAvg.join(" / ")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Platform</span>
              <span className="font-medium">{metrics.process.platform}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Node.js</span>
              <span className="font-medium">{metrics.process.nodeVersion}</span>
            </div>
          </div>
        </div>
      )}

      {/* request log */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Request Log
          </h3>
          {requestLog.length > 0 && (
            <span className="text-xs text-gray-400">
              Last {requestLog.length} requests
            </span>
          )}
        </div>
        <RequestLog requests={requestLog} />
      </div>
    </div>
  );
}
