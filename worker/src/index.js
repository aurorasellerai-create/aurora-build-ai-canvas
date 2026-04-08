require("dotenv").config();
const express = require("express");
const { Queue } = require("bullmq");
const IORedis = require("ioredis");
const { startWorker } = require("./worker");

const app = express();
app.use(express.json());

const WORKER_SECRET = process.env.WORKER_SECRET;
const PORT = process.env.PORT || 3333;

// Redis connection
const redis = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
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

// Health check
app.get("/health", async (req, res) => {
  try {
    const waiting = await convertQueue.getWaitingCount();
    const active = await convertQueue.getActiveCount();
    const completed = await convertQueue.getCompletedCount();
    const failed = await convertQueue.getFailedCount();
    const redisOk = redis.status === "ready";

    res.json({
      status: redisOk ? "ok" : "degraded",
      uptime: Math.floor(process.uptime()),
      redis: redisOk ? "connected" : redis.status,
      queue: {
        name: "convert-aab",
        waiting,
        active,
        completed,
        failed,
      },
      memory: {
        rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heap_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({ status: "error", error: err.message });
  }
});

// Start worker + server
startWorker(redis);
app.listen(PORT, () => {
  console.log(`[SERVER] Aurora Worker running on port ${PORT}`);
});
