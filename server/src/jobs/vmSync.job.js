import cron from "node-cron";
import { checkAndShutdownIfInactive } from "../services/vm.service.js";

//  VM Sync Job
//  Runs every 5 hours to check user activity and shutdown VM if inactive
//  Cron pattern: "0 */5 * * *" = every 5 hours at minute 0

export function startVMSyncJob() {
  console.log("[VM Sync Job] Starting VM sync cron job (runs every 5 hours)");

  // Run every 5 hours
  cron.schedule("0 */5 * * *", async () => {
    console.log("[VM Sync Job] Running scheduled VM sync check...");
    
    try {
      const wasShutDown = await checkAndShutdownIfInactive();
      
      if (wasShutDown) {
        console.log("[VM Sync Job] VM was shut down due to inactivity");
      } else {
        console.log("[VM Sync Job] VM remains active or was already stopped");
      }
    } catch (error) {
      console.error("[VM Sync Job] Error during sync:", error);
    }
  });

  console.log("[VM Sync Job] Cron job registered successfully");
}
