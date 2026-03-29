import { supabase } from "../config/supabase.client.js";

/**
 * Get the most recent last_active_at timestamp from VM record (publicly readable)
 */
export async function getLastUserActivity() {
  const { data, error } = await supabase
    .from("vms")
    .select("last_active_at")
    .limit(1)
    .single();

  if (error) {
    console.error("[VM Repo] Error fetching last activity from vms:", error);
    return null;
  }

  return data?.last_active_at;
}

/**
 * Update last_active_at on VM record (no user lookup needed)
 */
export async function updateUserActivity() {
  // Fetch VM row to target the update
  const { data: vmRow, error: fetchError } = await supabase
    .from("vms")
    .select("id")
    .limit(1)
    .single();

  if (fetchError) {
    console.error("[VM Repo] Error locating VM row for activity update:", fetchError);
    return { error: fetchError };
  }

  if (!vmRow?.id) {
    return { error: new Error("No VM row found to update activity") };
  }

  const { data, error } = await supabase
    .from("vms")
    .update({
      last_active_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", vmRow.id)
    .select()
    .single();

  if (error) {
    console.error("[VM Repo] Error updating VM last_active_at:", error);
    return { error };
  }

  return { data };
}

/**
 * Get VM state from database
 */
export async function getVMState() {
  const { data, error } = await supabase
    .from("vms")
    .select("*")
    .limit(1)
    .single();

  if (error) {
    console.error("[VM Repo] Error fetching VM state:", error);
    return null;
  }

  return data;
}

/**
 * Update VM power state in database
 */
export async function updateVMState(vmId, powerState) {
  const { data, error } = await supabase
    .from("vms")
    .update({
      power_state: powerState,
      last_synced_at: new Date().toISOString()
    })
    .eq("id", vmId)
    .select()
    .single();

  if (error) {
    console.error("[VM Repo] Error updating VM state:", error);
    return { error };
  }

  return { data };
}
