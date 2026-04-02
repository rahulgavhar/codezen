import { startVM, stopVM, getVMPowerState } from "../controllers/vms.controller.js";
import * as vmsRepo from "../repositories/vms.repo.js";
import { ENV } from "../config/env.config.js";

let vmEnsureInFlight = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function markVMRunningInDb() {
  try {
    const vmState = await vmsRepo.getVMState();
    if (vmState) {
      await vmsRepo.updateVMState(vmState.id, "Running");
    }
  } catch (error) {
    // Best effort only; do not block execution flow on telemetry state sync.
    console.warn("[VM Service] Failed to sync VM DB state:", error.message);
  }
}

/**
 * Ensure execution VM is running before code execution begins.
 * Blocks caller until VM is ready (or timeout).
 */
export async function ensureVMReadyForExecution(options = {}) {
  const {
    timeoutMs = 180000,
    pollIntervalMs = 5000,
  } = options;

  // Local/dev environments typically do not require Azure VM orchestration.
  if (ENV.NODE_ENV !== "production") {
    return true;
  }

  if (vmEnsureInFlight) {
    return vmEnsureInFlight;
  }

  const inFlight = (async () => {
    const deadline = Date.now() + timeoutMs;
    let startAttempted = false;

    while (Date.now() < deadline) {
      const state = await getVMPowerState();
      console.log(`[VM Service] ensureVMReadyForExecution: current state=${state}`);

      if (state === "running") {
        await markVMRunningInDb();
        return true;
      }

      if ((state === "deallocated" || state === "stopped") && !startAttempted) {
        console.log("[VM Service] VM is stopped/deallocated. Starting VM before execution...");
        await startVM();
        startAttempted = true;
        continue;
      }

      await sleep(pollIntervalMs);
    }

    throw new Error("Execution VM is not ready yet. Please retry in a moment.");
  })();

  vmEnsureInFlight = inFlight;

  try {
    return await inFlight;
  } finally {
    if (vmEnsureInFlight === inFlight) {
      vmEnsureInFlight = null;
    }
  }
}

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
