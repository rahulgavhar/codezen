import { computeClient, RESOURCE_GROUP, VM_NAME } from "../config/vm.client.js";

/**
 * Start VM (when deallocated)
 */
export async function startVM() {
  console.log("[Azure] Starting VM");

  await computeClient.virtualMachines.beginStartAndWait(
    RESOURCE_GROUP,
    VM_NAME
  );

  console.log("[Azure] VM started");
}

/**
 * Deallocate VM (stop billing)
 */
export async function stopVM() {
  console.log("[Azure] Deallocating VM");

  await computeClient.virtualMachines.beginDeallocateAndWait(
    RESOURCE_GROUP,
    VM_NAME
  );

  console.log("[Azure] VM deallocated");
}

/**
 * Actual VM power state (desync protection)
 */
export async function getVMPowerState() {
  const vm = await computeClient.virtualMachines.get(
    RESOURCE_GROUP,
    VM_NAME,
    { expand: "instanceView" }
  );

  const state = vm.instanceView.statuses.find(s =>
    s.code.startsWith("PowerState/")
  );

  return state ? state.code.replace("PowerState/", "") : "unknown";
}
