import { createApp } from "./server.js";
import { csvRoutes } from "./routes/csv.routes.js";
import { metricsRoutes } from "./routes/metrics.routes.js";

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  const { app, httpServer, io } = createApp();

  app.use("/api", csvRoutes(io));
  app.use("/api", metricsRoutes(io));
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status ?? 500).json({
      error: err.message ?? "Internal server error",
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
