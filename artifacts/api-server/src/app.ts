import express from "express";

const app = express();

// ... boshqa middlewarelar ...

// 404 handler — noto'g'ri route uchun
app.use((_req, res) => {
  res.status(404).json({ error: "NOT_FOUND", message: "Route not found" });
});

// Global error handler — barcha kutilmagan xatolar uchun
app.use((err, req, res, _next) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  req.log?.error({ err }, "Unhandled error");
  res.status(500).json({ error: "INTERNAL_ERROR", message });
});

export default app;
