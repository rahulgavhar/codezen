import { ClientSecretCredential } from "@azure/identity";
import { ComputeManagementClient } from "@azure/arm-compute";
import { ENV } from "../config/env.config.js";

const credential = new ClientSecretCredential(
  ENV.TENANT_ID,
  ENV.CLIENT_ID,
  ENV.CLIENT_SECRET
);

// Azure compute client (created once)
const computeClient = new ComputeManagementClient(
  credential,
  ENV.SUBSCRIPTION_ID
);

const RESOURCE_GROUP = ENV.RESOURCE_GROUP;
const VM_NAME = ENV.VM_NAME;

export { computeClient, RESOURCE_GROUP, VM_NAME };