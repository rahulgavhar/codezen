import { startVM, stopVM, getVMPowerState } from "../controllers/vms.controller.js";
import * as vmsRepo from "../repositories/vms.repo.js";

/**
 * Check if VM should be shut down based on user inactivity
 * Returns true if VM was stopped, false otherwise
 */
export async function checkAndShutdownIfInactive() {
  try {
    console.log("[VM Service] Checking user activity...");

    // Get last user activity from VM record (public)
    const lastActivity = await vmsRepo.getLastUserActivity();
    
    if (!lastActivity) {
      console.log("[VM Service] No user activity found, skipping shutdown check");
      return false;
    }

    // Calculate hours since last activity
    const now = new Date();
    const lastActiveDate = new Date(lastActivity);
    const hoursSinceActivity = (now - lastActiveDate) / (1000 * 60 * 60);

    console.log(`[VM Service] Last activity was ${hoursSinceActivity.toFixed(2)} hours ago`);

    // If inactive for 5+ hours, shut down VM
    if (hoursSinceActivity >= 5) {
      console.log("[VM Service] User inactive for 5+ hours, shutting down VM...");

      // Get current Azure VM power state
      const currentState = await getVMPowerState();
      console.log(`[VM Service] Current VM power state: ${currentState}`);

      // Only stop if VM is running
      if (currentState === "running") {
        await stopVM();
        
        // Update database state
        const vmState = await vmsRepo.getVMState();
        if (vmState) {
          await vmsRepo.updateVMState(vmState.id, "Deallocated");
        }
        
        console.log("[VM Service] VM successfully shut down");
        return true;
      } else {
        console.log("[VM Service] VM is not running, skipping shutdown");
        return false;
      }
    } else {
      console.log("[VM Service] User activity within 5 hours, VM stays running");
      return false;
    }
  } catch (error) {
    console.error("[VM Service] Error checking/shutting down VM:", error);
    return false;
  }
}

/**
 * Start VM and update database state
 */
export async function startVMOnLogin() {
  try {
    console.log("[VM Service] Starting VM on user login...");

    // Get current Azure VM power state
    const currentState = await getVMPowerState();
    console.log(`[VM Service] Current VM power state: ${currentState}`);

    // Only start if VM is stopped/deallocated
    if (currentState === "deallocated" || currentState === "stopped") {
      await startVM();
      
      // Update database state
      const vmState = await vmsRepo.getVMState();
      if (vmState) {
        await vmsRepo.updateVMState(vmState.id, "Running");
      }
      
      console.log("[VM Service] VM successfully started");
      return true;
    } else if (currentState === "running") {
      console.log("[VM Service] VM is already running");
      return true;
    } else {
      console.log(`[VM Service] VM is in transition state: ${currentState}`);
      return false;
    }
  } catch (error) {
    console.error("[VM Service] Error starting VM:", error);
    return false;
  }
}

/**
 * Update user activity timestamp
 */
export async function updateUserActivity() {
  try {
    const result = await vmsRepo.updateUserActivity();
    
    if (result.error) {
      console.error("[VM Service] Error updating user activity:", result.error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("[VM Service] Error updating user activity:", error);
    return false;
  }
}
