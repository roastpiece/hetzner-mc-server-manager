import { execSync } from "child_process";

const authorizationHeader = `Bearer ${process.env.HETZNER_TOKEN}`;
const apiBaseUrl = "https://api.hetzner.cloud/v1";
const labelSelector = "managed-by=hetzner-mc-server-manager";

const baseInit = {
    headers: {
        Authorization: authorizationHeader,
    },
};

export async function getServers(): Promise<HetznerServer[]> {
    const response = await fetch(
        `${apiBaseUrl}/servers?label_selector=${encodeURIComponent(
            labelSelector,
        )}`,
        baseInit,
    );

    if (!response.ok) {
        throw new Error(
            `Failed to fetch servers: ${response.status} ${response.statusText}`,
        );
    }

    const data = await response.json();
    return data.servers as HetznerServer[];
}

export interface HetznerServer {
    id: number;
    name: string;
    status: HetznerServerStatus;
    public_net: {
        ipv4: {
            ip: string;
        };
    };
    labels: Record<string, string>;
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

export async function setServerLabels(
    serverId: number,
    labels: Record<string, string>,
): Promise<void> {
    const response = await fetch(`${apiBaseUrl}/servers/${serverId}`, {
        ...baseInit,
        method: "PUT",
        headers: {
            ...baseInit.headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            labels: {
                ...labels,
                "managed-by": "hetzner-mc-server-manager",
            },
        }),
    });

    if (!response.ok) {
        throw new Error(
            `Failed to set server labels: ${response.status} ${response.statusText}`,
        );
    }
}

const run = async () => {
    const servers = await getServers();
    let server: HetznerServer | undefined;

    if (servers.length > 0) {
        server = servers[0];
    }

    if (server) {
        switch (server.labels["action"]) {
            case "restart":
                console.log("Restarting Minecraft server on host machine...");
                execSync("systemctl restart minecraft.service");

                await setServerLabels(server.id, {
                    ...server.labels,
                    action: "none",
                });

                break;
        }
    }

    setTimeout(run, 10000);
};

setTimeout(run);
