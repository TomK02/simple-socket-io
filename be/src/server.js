import { createServer } from "node:http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";

import { metricsMiddleware } from "./middleware/metrics.js";

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

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return { app, httpServer, io };
}
