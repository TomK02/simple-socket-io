import { startRequestMetrics } from "../metrics.js";

export function metricsMiddleware(io) {
  return function (req, res, next) {
    const end = startRequestMetrics();

    res.on("finish", () => {
      const metrics = end();

      // log to console
      console.log({
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ...metrics,
      });

      // emit to all connected clients
      io.emit("metrics:request", {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ...metrics,
        timestamp: new Date().toISOString(),
      });
    });

    next();
  };
}
