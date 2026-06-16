import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import cors from "cors";
import { metricsMiddleware } from "./middleware/metrics.js";
import { getServerMetrics } from "./metrics.js";

const METRICS_INTERVAL = 1_000;

export function createApp() {
  const app = express();

  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  app.use(
    cors({
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
    }),
  );

  app.use(express.json());
  app.use(metricsMiddleware(io));

  // ONE timer for the whole server
  // calls getServerMetrics() once every 1s
  // broadcasts to ALL connected clients simultaneously
  const metricsTimer = setInterval(() => {
    io.emit("metrics:update", {
      ...getServerMetrics(),
      timestamp: new Date().toISOString(),
    });
  }, METRICS_INTERVAL);

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // send immediate snapshot to new tab only
    // so they don't wait 3s for first update
    socket.emit("metrics:update", {
      ...getServerMetrics(),
      timestamp: new Date().toISOString(),
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
      // no timer to clear, global timer keeps running
    });
  });

  // clean up when server shuts down
  process.on("SIGTERM", () => clearInterval(metricsTimer));
  process.on("SIGINT", () => clearInterval(metricsTimer));

  return { app, httpServer, io };
}
