import os from "node:os";

export function getServerMetrics() {
  const mem = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return {
    memory: {
      // process level
      heapUsed: formatBytes(mem.heapUsed),
      heapTotal: formatBytes(mem.heapTotal),
      heapUsedPercent: ((mem.heapUsed / mem.heapTotal) * 100).toFixed(1),
      rss: formatBytes(mem.rss),
      external: formatBytes(mem.external),

      // system level
      systemTotal: formatBytes(totalMem),
      systemFree: formatBytes(freeMem),
      systemUsed: formatBytes(usedMem),
      systemUsedPercent: ((usedMem / totalMem) * 100).toFixed(1),
    },
    cpu: {
      loadAvg: os.loadavg().map((l) => l.toFixed(2)), // [1m, 5m, 15m]
      cores: os.cpus().length,
      model: os.cpus()[0].model,
    },
    process: {
      uptime: formatUptime(process.uptime()),
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
    },
  };
}

export function startRequestMetrics() {
  const cpuBefore = process.cpuUsage();
  const memBefore = process.memoryUsage();
  const timeBefore = performance.now();

  return function endRequestMetrics() {
    const cpuDelta = process.cpuUsage(cpuBefore); // pass baseline to get delta
    const memAfter = process.memoryUsage();
    const duration = performance.now() - timeBefore;

    return {
      duration: `${duration.toFixed(2)}ms`,
      cpu: {
        // microseconds → milliseconds
        user: `${(cpuDelta.user / 1000).toFixed(2)}ms`,
        system: `${(cpuDelta.system / 1000).toFixed(2)}ms`,
        total: `${((cpuDelta.user + cpuDelta.system) / 1000).toFixed(2)}ms`,
      },
      memory: {
        heapUsedDelta: formatBytes(memAfter.heapUsed - memBefore.heapUsed),
        heapUsedBefore: formatBytes(memBefore.heapUsed),
        heapUsedAfter: formatBytes(memAfter.heapUsed),
        rssDelta: formatBytes(memAfter.rss - memBefore.rss),
      },
    };
  };
}

function formatBytes(bytes) {
  const abs = Math.abs(bytes); // handle negative deltas
  const sign = bytes < 0 ? "-" : "+";

  if (abs < 1024) return `${bytes}B`;
  if (abs < 1024 ** 2) return `${sign}${(abs / 1024).toFixed(1)}KB`;
  if (abs < 1024 ** 3) return `${sign}${(abs / 1024 ** 2).toFixed(1)}MB`;
  return `${sign}${(abs / 1024 ** 3).toFixed(1)}GB`;
}

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}
