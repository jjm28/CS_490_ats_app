import { Router } from "express";
import os from "os";
import process from "process";

const router = Router();

router.get("/", (req, res) => {
  const memoryUsage = process.memoryUsage();

  res.json({
    status: "ok",
    uptimeSeconds: process.uptime(),
    memory: {
      rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    },
    cpu: {
      cores: os.cpus().length,
      loadAverage: os.loadavg(),
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
