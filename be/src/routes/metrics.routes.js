import { Router } from "express";
import { getServerMetrics } from "../metrics.js";

const router = Router();

export function metricsRoutes(io) {
  // GET /metrics - snapshot of overall server health
  router.get("/metrics", (req, res) => {
    const metrics = getServerMetrics();
    res.json(metrics);
  });

  // GET /metrics/stream - push metrics every N seconds via socket
  router.get("/metrics/stream/start", (req, res) => {
    const interval = parseInt(req.query.interval ?? "5000"); // default 5s

    // guard against too frequent polling
    if (interval < 1000) {
      return res.status(400).json({ error: "Minimum interval is 1000ms" });
    }

    const timer = setInterval(() => {
      io.emit("metrics:update", {
        ...getServerMetrics(),
        timestamp: new Date().toISOString(),
      });
    }, interval);

    // store timer id so we can stop it
    res.json({
      message: `Metrics streaming started every ${interval}ms`,
      interval,
    });

    // clean up if client disconnects
    req.on("close", () => clearInterval(timer));
  });

  // GET /metrics/stream/stop - stop streaming
  router.get("/metrics/stream/stop", (req, res) => {
    io.emit("metrics:stopped", {
      stoppedAt: new Date().toISOString(),
    });
    res.json({ message: "Metrics streaming stopped" });
  });

  return router;
}
