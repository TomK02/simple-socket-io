import { createWriteStream, readFileSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { io } from "socket.io-client";
import os from "node:os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVER_URL = "http://localhost:3000";
const ROWS_PER_FILE = 100_000;
const CONCURRENT_UPLOADS = parseInt(process.argv[2]) || 10;
const USE_JITTER = process.argv.includes("--jitter");
const MAX_JITTER_MS = 2000;

// ── RAM snapshot ─────────────────────────────────────────────────────────────

function getRamSnapshot() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    used: (used / 1024 / 1024).toFixed(1),
    total: (total / 1024 / 1024).toFixed(1),
    percent: ((used / total) * 100).toFixed(1),
  };
}

// ── Generate test CSV ────────────────────────────────────────────────────────

async function createTestFile(rows) {
  const filePath = join(__dirname, "test.csv");

  await new Promise((resolve, reject) => {
    const writer = createWriteStream(filePath);

    writer.write("id,name,email\n");

    for (let i = 0; i < rows; i++) {
      if (i % 20 === 0) {
        writer.write(`,missing-name,bad-email\n`);
      } else {
        writer.write(`${i},User-${i},user_${i}@test.com\n`);
      }
    }

    writer.end();
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  console.log(`✅ Generated test CSV: ${rows.toLocaleString()} rows`);
  return filePath;
}

// ── Single upload worker ─────────────────────────────────────────────────────

async function runUpload(uploadId, fileBuffer, onComplete) {
  if (USE_JITTER) {
    const jitter = Math.floor(Math.random() * MAX_JITTER_MS);
    await new Promise((r) => setTimeout(r, jitter));
  }

  return new Promise((resolve) => {
    const socket = io(SERVER_URL, {
      transports: ["websocket"], // skip polling, go straight to WebSocket
    });

    const result = {
      uploadId,
      socketId: null,
      startedAt: Date.now(),
      completedAt: null,
      duration: null,
      stats: null,
      error: null,
    };

    socket.on("connect", async () => {
      result.socketId = socket.id;

      try {
        const blob = new Blob([fileBuffer], { type: "text/csv" });
        const formData = new FormData();
        formData.append("file", blob, "test.csv");

        const res = await fetch(`${SERVER_URL}/api/parse-csv`, {
          method: "POST",
          body: formData,
          headers: {
            "x-socket-id": socket.id,
          },
        });

        if (!res.ok) {
          const { error } = await res.json();
          throw new Error(error);
        }
      } catch (err) {
        result.error = err.message;
        result.completedAt = Date.now();
        result.duration = result.completedAt - result.startedAt;
        onComplete();
        socket.disconnect();
        resolve(result);
      }
    });

    socket.on("ingestion:complete", (data) => {
      result.completedAt = Date.now();
      result.duration = result.completedAt - result.startedAt;
      result.stats = data.stats;
      onComplete();
      socket.disconnect();
      resolve(result);
    });

    socket.on("ingestion:failed", (data) => {
      result.error = data.error;
      result.completedAt = Date.now();
      result.duration = result.completedAt - result.startedAt;
      onComplete();
      socket.disconnect();
      resolve(result);
    });

    setTimeout(() => {
      if (!result.completedAt) {
        result.error = "Timeout";
        result.duration = Date.now() - result.startedAt;
        onComplete();
        socket.disconnect();
        resolve(result);
      }
    }, 300_000);
  });
}

// ── Run stress test ──────────────────────────────────────────────────────────

async function runStressTest() {
  console.log(`
╔══════════════════════════════════════════════════════╗
║                   CSV STRESS TEST                    ║
╠══════════════════════════════════════════════════════╣
║  Server:      ${SERVER_URL.padEnd(37)}║
║  Concurrent:  ${String(CONCURRENT_UPLOADS.toLocaleString()).padEnd(37)}║
║  Rows/file:   ${String(ROWS_PER_FILE.toLocaleString()).padEnd(37)}║
║  Mode:        ${String(USE_JITTER ? "Jitter (realistic traffic)" : "Thundering herd (max spike)").padEnd(37)}║
╚══════════════════════════════════════════════════════╝
  `);

  const filePath = await createTestFile(ROWS_PER_FILE);
  const fileBuffer = readFileSync(filePath);
  console.log(
    `📦 File size: ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB\n`,
  );

  const ramBefore = getRamSnapshot();
  console.log(`📊 RAM before: ${ramBefore.used}MB (${ramBefore.percent}%)\n`);

  let completedCount = 0;

  function onComplete() {
    completedCount++;
    const ram = getRamSnapshot();
    process.stdout.write(
      `\r   Progress: ${completedCount}/${CONCURRENT_UPLOADS} completed | RAM: ${ram.used}MB (${ram.percent}%)`,
    );
  }

  const startTime = Date.now();

  const results = await Promise.allSettled(
    Array.from({ length: CONCURRENT_UPLOADS }, (_, i) =>
      runUpload(i + 1, fileBuffer, onComplete),
    ),
  );

  process.stdout.write("\n\n");

  const totalDuration = Date.now() - startTime;
  const ramAfter = getRamSnapshot();

  // ── Analyze results ────────────────────────────────────────────────────────

  const succeeded = results.filter(
    (r) => r.status === "fulfilled" && !r.value.error,
  );

  const failed = results.filter(
    (r) => r.status === "rejected" || r.value?.error,
  );

  const durations = succeeded
    .map((r) => r.value.duration)
    .filter(Boolean)
    .sort((a, b) => a - b);

  const avgDuration =
    durations.reduce((a, b) => a + b, 0) / (durations.length || 1);
  const minDuration = durations[0] ?? 0;
  const maxDuration = durations[durations.length - 1] ?? 0;
  const p50 = durations[Math.floor(durations.length * 0.5)] ?? 0;
  const p95 = durations[Math.floor(durations.length * 0.95)] ?? 0;
  const p99 = durations[Math.floor(durations.length * 0.99)] ?? 0;

  const totalRowsProcessed = succeeded.reduce(
    (sum, r) => sum + (r.value.stats?.total ?? 0),
    0,
  );

  const totalValidRows = succeeded.reduce(
    (sum, r) => sum + (r.value.stats?.valid ?? 0),
    0,
  );

  const totalFailedRows = succeeded.reduce(
    (sum, r) => sum + (r.value.stats?.failed ?? 0),
    0,
  );

  const ramDelta = (
    parseFloat(ramAfter.used) - parseFloat(ramBefore.used)
  ).toFixed(1);

  // ── Print report ───────────────────────────────────────────────────────────

  console.log(`
╔══════════════════════════════════════════════════════╗
║                  STRESS TEST REPORT                  ║
╠══════════════════════════════════════════════════════╣
║ UPLOADS
║   Total:        ${String(CONCURRENT_UPLOADS).padEnd(34)}║
║   Succeeded:    ${String(succeeded.length).padEnd(34)}║
║   Failed:       ${String(failed.length).padEnd(34)}║
║   Success Rate: ${String(((succeeded.length / CONCURRENT_UPLOADS) * 100).toFixed(1) + "%").padEnd(34)}║
╠══════════════════════════════════════════════════════╣
║ RAM USAGE (system level)
║   Before:  ${String(ramBefore.used + "MB (" + ramBefore.percent + "%)").padEnd(40)}║
║   After:   ${String(ramAfter.used + "MB (" + ramAfter.percent + "%)").padEnd(40)}║
║   Delta:   ${String("+" + ramDelta + "MB").padEnd(40)}║
╠══════════════════════════════════════════════════════╣
║ TIMING
║   Total wall time: ${String((totalDuration / 1000).toFixed(2) + "s").padEnd(32)}║
║   Avg per upload:  ${String((avgDuration / 1000).toFixed(2) + "s").padEnd(32)}║
║   Min:             ${String((minDuration / 1000).toFixed(2) + "s").padEnd(32)}║
║   Max:             ${String((maxDuration / 1000).toFixed(2) + "s").padEnd(32)}║
║   p50:             ${String((p50 / 1000).toFixed(2) + "s").padEnd(32)}║
║   p95:             ${String((p95 / 1000).toFixed(2) + "s").padEnd(32)}║
║   p99:             ${String((p99 / 1000).toFixed(2) + "s").padEnd(32)}║
╠══════════════════════════════════════════════════════╣
║ ROWS
║   Total processed: ${String(totalRowsProcessed.toLocaleString()).padEnd(32)}║
║   Valid:           ${String(totalValidRows.toLocaleString()).padEnd(32)}║
║   Failed:          ${String(totalFailedRows.toLocaleString()).padEnd(32)}║
║   Rows/sec:        ${String(Math.round(totalRowsProcessed / (totalDuration / 1000)).toLocaleString()).padEnd(32)}║
╠══════════════════════════════════════════════════════╣
║ ERRORS
${
  failed.length === 0
    ? "║   None ✅"
    : failed
        .slice(0, 5)
        .map(
          (r) =>
            `║   ❌ Upload ${r.value?.uploadId}: ${String(r.value?.error ?? "unknown").slice(0, 35)}`,
        )
        .join("\n")
}
╚══════════════════════════════════════════════════════╝
  `);

  // cleanup temp test file
  try {
    await unlink(filePath);
    console.log(`🗑️  Cleaned up test file: ${filePath}`);
  } catch (err) {
    console.error(`⚠️  Failed to clean up test file: ${err.message}`);
  }

  process.exit(0);
}

runStressTest().catch((err) => {
  console.error("Stress test failed:", err);
  process.exit(1);
});
