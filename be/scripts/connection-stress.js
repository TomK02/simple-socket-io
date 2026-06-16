import { io } from "socket.io-client";
import os from "node:os";

const SERVER_URL = "http://localhost:3000";
const TARGET_CONNECTIONS = parseInt(process.argv[2]) || 10;
const HOLD_DURATION = 15_000; // hold connections for 15s to observe RAM
const CONNECTION_DELAY = 50; // ms stagger, more breathing room
const BATCH_SIZE = 1_000; // connect in batches to avoid thundering herd

// ── Snapshot system RAM ──────────────────────────────────────────────────────

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

// ── Single connection ────────────────────────────────────────────────────────

function createConnection(id) {
  return new Promise((resolve) => {
    const result = {
      id,
      connectedAt: null,
      latency: null,
      metricsReceived: 0,
      error: null,
    };

    const pingStart = Date.now();

    const socket = io(SERVER_URL, {
      reconnection: false,
      timeout: 15_000,
      transports: ["websocket"], // skip HTTP polling → go straight to WebSocket
    });

    socket.on("connect", () => {
      result.connectedAt = Date.now();
      result.latency = result.connectedAt - pingStart;
      resolve({ socket, result });
    });

    socket.on("metrics:update", () => {
      result.metricsReceived++;
    });

    socket.on("connect_error", (err) => {
      result.error = err.message;
      resolve({ socket: null, result });
    });

    setTimeout(() => {
      if (!result.connectedAt && !result.error) {
        result.error = "Connection timeout";
        resolve({ socket: null, result });
      }
    }, 15_000);
  });
}

// ── Run stage ────────────────────────────────────────────────────────────────

async function runStage(targetConnections) {
  console.log(
    `\n📡 Connecting ${targetConnections.toLocaleString()} clients in batches of ${BATCH_SIZE}...`,
  );

  const ramBefore = getRamSnapshot();
  console.log(
    `\n   RAM before: ${ramBefore.used}MB / ${ramBefore.total}MB (${ramBefore.percent}%)`,
  );

  const stageStart = Date.now();
  const connections = [];
  let connectedSoFar = 0;

  // connect in batches instead of all at once
  for (let i = 0; i < targetConnections; i += BATCH_SIZE) {
    const batchSize = Math.min(BATCH_SIZE, targetConnections - i);

    // connect a batch in parallel
    const batch = await Promise.all(
      Array.from({ length: batchSize }, (_, j) => createConnection(i + j + 1)),
    );

    connections.push(...batch);
    connectedSoFar += batchSize;

    const ram = getRamSnapshot();
    process.stdout.write(
      `\r   Progress: ${connectedSoFar.toLocaleString()}/${targetConnections.toLocaleString()} | RAM: ${ram.used}MB (${ram.percent}%)`,
    );

    // pause between batches
    await new Promise((r) => setTimeout(r, CONNECTION_DELAY));
  }

  process.stdout.write("\n");

  const rampDuration = Date.now() - stageStart;
  const connected = connections.filter((c) => c.result.connectedAt).length;
  const failed = connections.filter((c) => c.result.error).length;
  const ramAfterRamp = getRamSnapshot();

  console.log(
    `\n   ✅ Ramp up complete in ${(rampDuration / 1000).toFixed(2)}s`,
  );
  console.log(
    `   Connected: ${connected.toLocaleString()} | Failed: ${failed.toLocaleString()}`,
  );
  console.log(
    `   RAM after ramp: ${ramAfterRamp.used}MB / ${ramAfterRamp.total}MB (${ramAfterRamp.percent}%)`,
  );
  console.log(
    `   RAM delta: +${(parseFloat(ramAfterRamp.used) - parseFloat(ramBefore.used)).toFixed(1)}MB`,
  );
  console.log(`   Holding for ${HOLD_DURATION / 1000}s to observe memory...`);

  // take RAM snapshots during hold
  const ramSnapshots = [];
  const snapshotInterval = setInterval(() => {
    ramSnapshots.push(getRamSnapshot());
  }, 3000);

  await new Promise((r) => setTimeout(r, HOLD_DURATION));
  clearInterval(snapshotInterval);

  const ramAfterHold = getRamSnapshot();
  const peakRam = ramSnapshots.reduce(
    (max, s) => (parseFloat(s.used) > parseFloat(max.used) ? s : max),
    ramBefore,
  );

  // collect metrics stats
  const metricsStats = connections
    .filter((c) => c.result.connectedAt)
    .map((c) => c.result.metricsReceived);

  const avgMetrics =
    metricsStats.reduce((a, b) => a + b, 0) / (metricsStats.length || 1);

  // collect latency stats
  const latencies = connections
    .filter((c) => c.result.latency !== null)
    .map((c) => c.result.latency)
    .sort((a, b) => a - b);

  const avgLatency =
    latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] ?? 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] ?? 0;
  const minLatency = latencies[0] ?? 0;
  const maxLatency = latencies[latencies.length - 1] ?? 0;

  const errors = connections
    .filter((c) => c.result.error)
    .map((c) => c.result.error);

  const uniqueErrors = [...new Set(errors)];

  // disconnect all
  console.log(`\n   Disconnecting all clients...`);
  connections.forEach((c) => c.socket?.disconnect());

  await new Promise((r) => setTimeout(r, 2000));

  const ramAfterDisconnect = getRamSnapshot();

  return {
    targetConnections,
    connected,
    failed,
    successRate: ((connected / targetConnections) * 100).toFixed(1),
    rampDuration,
    ram: {
      before: ramBefore,
      afterRamp: ramAfterRamp,
      peak: peakRam,
      afterHold: ramAfterHold,
      afterDisconnect: ramAfterDisconnect,
      delta: (
        parseFloat(ramAfterRamp.used) - parseFloat(ramBefore.used)
      ).toFixed(1),
    },
    latency: {
      avg: avgLatency.toFixed(2),
      min: minLatency,
      max: maxLatency,
      p50,
      p95,
      p99,
    },
    avgMetricsReceived: avgMetrics.toFixed(1),
    uniqueErrors,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════╗
║         SOCKET CONNECTION STRESS TEST                ║
╠══════════════════════════════════════════════════════╣
║  Server:      ${SERVER_URL.padEnd(37)}║
║  Connections: ${String(TARGET_CONNECTIONS.toLocaleString()).padEnd(37)}║
║  Hold:        ${String(HOLD_DURATION / 1000 + "s").padEnd(37)}║
║  Batch size:  ${String(BATCH_SIZE + " connections per batch").padEnd(37)}║
║  Batch delay: ${String(CONNECTION_DELAY + "ms between batches").padEnd(37)}║
║  Transport:   ${"WebSocket only (no HTTP polling)".padEnd(37)}║
╚══════════════════════════════════════════════════════╝
  `);

  const result = await runStage(TARGET_CONNECTIONS);

  console.log(`
╔══════════════════════════════════════════════════════╗
║              CONNECTION STRESS REPORT                ║
╠══════════════════════════════════════════════════════╣
║ CONNECTIONS
║   Target:        ${String(result.targetConnections.toLocaleString()).padEnd(34)}║
║   Connected:     ${String(result.connected.toLocaleString()).padEnd(34)}║
║   Failed:        ${String(result.failed.toLocaleString()).padEnd(34)}║
║   Success Rate:  ${String(result.successRate + "%").padEnd(34)}║
║   Ramp Duration: ${String((result.rampDuration / 1000).toFixed(2) + "s").padEnd(34)}║
╠══════════════════════════════════════════════════════╣
║ RAM USAGE (system level)
║   Before:           ${String(result.ram.before.used + "MB (" + result.ram.before.percent + "%)").padEnd(31)}║
║   After ramp:       ${String(result.ram.afterRamp.used + "MB (" + result.ram.afterRamp.percent + "%)").padEnd(31)}║
║   Peak:             ${String(result.ram.peak.used + "MB (" + result.ram.peak.percent + "%)").padEnd(31)}║
║   After hold:       ${String(result.ram.afterHold.used + "MB (" + result.ram.afterHold.percent + "%)").padEnd(31)}║
║   After disconnect: ${String(result.ram.afterDisconnect.used + "MB (" + result.ram.afterDisconnect.percent + "%)").padEnd(31)}║
║   Delta:            ${String("+" + result.ram.delta + "MB").padEnd(31)}║
╠══════════════════════════════════════════════════════╣
║ LATENCY (connection time)
║   Min: ${String(result.latency.min + "ms").padEnd(45)}║
║   Avg: ${String(result.latency.avg + "ms").padEnd(45)}║
║   Max: ${String(result.latency.max + "ms").padEnd(45)}║
║   p50: ${String(result.latency.p50 + "ms").padEnd(45)}║
║   p95: ${String(result.latency.p95 + "ms").padEnd(45)}║
║   p99: ${String(result.latency.p99 + "ms").padEnd(45)}║
╠══════════════════════════════════════════════════════╣
║ METRICS DELIVERY
║   Avg received per client: ${String(result.avgMetricsReceived).padEnd(25)}║
║   Expected (~${String(Math.floor(HOLD_DURATION / 3000)).padEnd(2)} updates):  ${String(
    parseFloat(result.avgMetricsReceived) >= Math.floor(HOLD_DURATION / 3000)
      ? "✅ All delivered"
      : "⚠️  Some dropped",
  ).padEnd(24)}║
╠══════════════════════════════════════════════════════╣
║ ERRORS
${
  result.uniqueErrors.length === 0
    ? "║   None ✅"
    : result.uniqueErrors.map((e) => `║   ❌ ${e.slice(0, 47)}`).join("\n")
}
╚══════════════════════════════════════════════════════╝
  `);

  process.exit(0);
}

main().catch((err) => {
  console.error("Connection stress test failed:", err);
  process.exit(1);
});
