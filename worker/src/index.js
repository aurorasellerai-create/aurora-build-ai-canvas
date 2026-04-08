require("dotenv").config();
const express = require("express");
const { Queue } = require("bullmq");
const IORedis = require("ioredis");
const { startWorker } = require("./worker");

const app = express();
app.use(express.json());

// CORS — allow Edge Functions to call this
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, x-worker-secret");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const WORKER_SECRET = process.env.WORKER_SECRET;
const PORT = process.env.PORT || 3333;

// Redis connection with error handling
const redis = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 500, 5000),
  connectTimeout: 5000,
});

redis.on("error", (err) => {
  console.error("[REDIS] Connection error:", err.message);
});

redis.on("connect", () => {
  console.log("[REDIS] Connected successfully");
});

// BullMQ queue
const convertQueue = new Queue("convert-aab", { connection: redis });

// Webhook endpoint — called by Supabase Edge Function
app.post("/webhook/convert", async (req, res) => {
  const auth = req.headers["x-worker-secret"];
  if (auth !== WORKER_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { job_id, url, user_id } = req.body;
  if (!job_id || !url || !user_id) {
    return res.status(400).json({ error: "Missing job_id, url, or user_id" });
  }

  try {
    await convertQueue.add("build", { job_id, url, user_id }, {
      attempts: 2,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    console.log(`[QUEUE] Job ${job_id} added for ${url}`);
    res.json({ status: "queued", job_id });
  } catch (err) {
    console.error("[QUEUE] Error adding job:", err);
    res.status(500).json({ error: "Failed to queue job" });
  }
});

// Health check — robust with timeout
app.get("/health", async (req, res) => {
  const startTime = Date.now();

  try {
    const redisOk = redis.status === "ready";
    let queueStats = { waiting: 0, active: 0, completed: 0, failed: 0 };

    if (redisOk) {
      // Timeout protection: abort if queue stats take too long
      const statsPromise = Promise.all([
        convertQueue.getWaitingCount(),
        convertQueue.getActiveCount(),
        convertQueue.getCompletedCount(),
        convertQueue.getFailedCount(),
      ]);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Queue stats timeout")), 3000)
      );

      try {
        const [waiting, active, completed, failed] = await Promise.race([
          statsPromise,
          timeoutPromise,
        ]);
        queueStats = { waiting, active, completed, failed };
      } catch (e) {
        console.warn("[HEALTH] Queue stats timeout, using defaults");
      }
    }

    const mem = process.memoryUsage();
    const responseTime = Date.now() - startTime;

    res.json({
      status: redisOk ? "ok" : "degraded",
      uptime: Math.floor(process.uptime()),
      redis: redisOk ? "connected" : redis.status || "disconnected",
      queue: {
        name: "convert-aab",
        ...queueStats,
      },
      memory: {
        rss_mb: Math.round(mem.rss / 1024 / 1024),
        heap_mb: Math.round(mem.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
      },
      response_time_ms: responseTime,
      node_version: process.version,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[HEALTH] Error:", err.message);
    res.status(503).json({
      status: "error",
      error: err.message,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  }
});

// Catch-all for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

// Start worker + server
startWorker(redis);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[SERVER] Aurora Worker running on port ${PORT}`);
});
