import * as Network from "expo-network";
import { getQueuedJobs, incrementQueueAttempt, dequeueSync, updateJobStatus } from "./db";
import { jobsApi } from "./api";

// Check if device is online
export async function isOnline(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return state.isConnected === true && state.isInternetReachable === true;
}

// Process the offline job queue
export async function processQueue(): Promise<void> {
  const online = await isOnline();
  if (!online) return;

  const queued = await getQueuedJobs();
  if (queued.length === 0) return;

  for (const item of queued) {
    try {
      const payload = JSON.parse(item.payload);

      switch (item.action) {
        case "convert": {
          // Re-attempt server conversion
          if (payload.jobId && payload.convertTo && payload.fileNames) {
            await jobsApi.convert(payload.jobId, payload.convertTo, payload.fileNames);
          }
          break;
        }
        case "delete": {
          if (payload.jobIds) {
            await jobsApi.delete(payload.jobIds);
          }
          break;
        }
      }

      await dequeueSync(item.id);
    } catch (error) {
      console.error(`Queue item ${item.id} failed:`, error);
      await incrementQueueAttempt(item.id);
    }
  }
}

// Sync local jobs with server
export async function syncJobs(userId: number): Promise<void> {
  const online = await isOnline();
  if (!online) return;

  try {
    const response = await jobsApi.list();
    if (response.success && response.jobs) {
      // Update local DB with server data
      // The server is source of truth for completed jobs
      for (const job of response.jobs) {
        await updateJobStatus(String(job.id), job.status);
      }
    }
  } catch (error) {
    console.error("Job sync failed:", error);
  }
}
