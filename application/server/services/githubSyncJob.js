// jobs/githubSyncJob.js
import { getDb } from "../db/connection.js";
import { syncReposForUser, syncActivityForUser } from "../services/github.service.js";

const SYNC_INTERVAL_MS = 1000 * 60 * 60; // every 1 hour
const STALE_HOURS = 24;                  // re-sync users whose data is > 24h old
const MAX_USERS_PER_RUN = 25;            // small batch to avoid rate-limit issues

export function setupGitHubSyncCron() {
  setInterval(async () => {
    try {
      const db = getDb();
      const userstore = db.collection("usergithubrecord");

      const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);

      // Find users with GitHub connected who are stale or never synced
      const candidates = await userstore
        .find({
          "githubAccess.githubAccessToken": { $exists: true, $ne: null },
          $or: [
            { lastReposSyncedAt: { $exists: false } },
            { lastReposSyncedAt: { $lt: cutoff } },
          ],
        })
        .limit(MAX_USERS_PER_RUN)
        .toArray();

      if (!candidates.length) return;

      console.log(
        `[GitHubSync] Found ${candidates.length} users to refresh GitHub data`
      );

      for (const user of candidates) {
        const appUserId = user.userid?.toString();
        if (!appUserId) continue;

        try {
          console.log(`[GitHubSync] Syncing GitHub for user ${appUserId}`);
          await syncReposForUser(appUserId);
          await syncActivityForUser(appUserId);
        } catch (err) {
          console.error(
            `[GitHubSync] Error syncing GitHub for user ${appUserId}:`,
            err
          );
        }
      }
    } catch (err) {
      console.error("[GitHubSync] Cron run failed:", err);
    }
  }, SYNC_INTERVAL_MS);

  console.log(
    `[GitHubSync] Scheduled GitHub sync every ${SYNC_INTERVAL_MS / (1000 * 60)} minutes`
  );
}
