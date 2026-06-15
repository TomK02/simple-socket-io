import { useIngestion } from "./hooks/useIngestion";
import { FileUpload } from "./components/FileUpload";
import { ProgressBar } from "./components/ProgressBar";
import { StatsDisplay } from "./components/StatsDisplay";
import { EventLog } from "./components/EventLog";

const STATUS_LABEL = {
  idle: "Ready",
  uploading: "Uploading...",
  processing: "Processing...",
  complete: "Complete",
  failed: "Failed",
};

const STATUS_COLOR = {
  idle: "text-gray-500",
  uploading: "text-blue-600",
  processing: "text-blue-600",
  complete: "text-green-600",
  failed: "text-red-600",
};

export default function App() {
  const { status, progress, stats, events, error, uploadFile } = useIngestion();

  const isProcessing = status === "uploading" || status === "processing";
  const showProgress = isProcessing || status === "complete";
  const showStats =
    (isProcessing && (progress.processed > 0 || progress.valid > 0)) ||
    status === "complete";

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-gray-900">CSV Ingestion</h1>
          <div className="flex items-center gap-2">
            <div
              className={[
                "w-2 h-2 rounded-full",
                status === "complete"
                  ? "bg-green-500"
                  : status === "failed"
                    ? "bg-red-500"
                    : isProcessing
                      ? "bg-blue-500 animate-pulse"
                      : "bg-gray-400",
              ].join(" ")}
            />
            <p
              className={["text-sm font-medium", STATUS_COLOR[status]].join(
                " ",
              )}
            >
              {STATUS_LABEL[status]}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Upload
          </h2>
          <FileUpload onUpload={uploadFile} disabled={isProcessing} />
        </div>

        {showProgress && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Progress
            </h2>
            <ProgressBar
              progress={progress.processed ?? 0}
              total={stats?.total ?? 0}
            />
          </div>
        )}
        {showStats && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Stats
            </h2>
            <StatsDisplay stats={stats} progress={progress} status={status} />
          </div>
        )}

        {status === "failed" && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-sm font-medium text-red-700">❌ {error}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Event Log
            </h2>
            {events.length > 0 && (
              <span className="text-xs text-gray-400">
                {events.length} events
              </span>
            )}
          </div>
          <EventLog events={events} />
        </div>
      </div>
    </div>
  );
}
