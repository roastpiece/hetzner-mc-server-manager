import { HETZNER_TOKEN } from "$env/static/private";

const authorizationHeader = `Bearer ${HETZNER_TOKEN}`;
const apiBaseUrl = "https://api.hetzner.cloud/v1";
const labelSelector = "managed-by=hetzner-mc-server-manager";

const baseInit = {
  headers: {
    Authorization: authorizationHeader,
  },
};

async function getServers() {
  const response = await fetch(
    `${apiBaseUrl}/servers?label_selector=${encodeURIComponent(labelSelector)}`,
    baseInit
  );
}

export interface HetznerServer {
  id: number;
  name: string;
  status: string;
  ipv4: string;
  ipv6: string | null;
}

export type HetznerServerStatus =
  | "running"
  | "initializing"
  | "starting"
  | "stopping"
  | "off"
  | "deleting"
  | "migrating"
  | "rebuilding"
  | "unknown";
