import { startVMOnLogin, updateUserActivity } from "../services/vm.service.js";
import { ENV } from "../config/env.config.js";

/**
 * Middleware to track user activity and manage VM state
 * Should be applied to protected routes after Clerk authentication
 */
export async function trackActivityAndStartVM(req, res, next) {
  try {
    // Skip if no authenticated user
    if (!req.auth()?.userId || ENV.NODE_ENV !== "production") {
      return next();
    }

      
      
    // Update user's last_active_at timestamp (non-blocking)
    updateUserActivity().catch(error => {
      console.error("[Auth Middleware] Error updating user activity:", error);
    });

    // Start VM if it's stopped (non-blocking)
    // Only on first request or when VM might be down
    startVMOnLogin().catch(error => {
      console.error("[Auth Middleware] Error starting VM:", error);
    });

    next();
  } catch (error) {
    console.error("[Auth Middleware] Unexpected error:", error);
    next(); // Don't block the request even if VM operations fail
  }
}
