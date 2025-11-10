import {
    HETZNER_REGION,
    HETZNER_SERVER_TYPE,
    HETZNER_SSH_KEY_ID,
    HETZNER_TOKEN,
} from "$env/static/private";

const authorizationHeader = `Bearer ${HETZNER_TOKEN}`;
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

export async function startServer(serverId: number): Promise<void> {
    const response = await fetch(
        `${apiBaseUrl}/servers/${serverId}/actions/poweron`,
        {
            ...baseInit,
            method: "POST",
        },
    );

    if (!response.ok) {
        throw new Error(
            `Failed to start server: ${response.status} ${response.statusText}`,
        );
    }
}

export async function stopServer(serverId: number): Promise<void> {
    const response = await fetch(
        `${apiBaseUrl}/servers/${serverId}/actions/poweroff`,
        {
            ...baseInit,
            method: "POST",
        },
    );

    if (!response.ok) {
        throw new Error(
            `Failed to stop server: ${response.status} ${response.statusText}`,
        );
    }
}

export async function deleteServer(serverId: number): Promise<void> {
    const response = await fetch(`${apiBaseUrl}/servers/${serverId}`, {
        ...baseInit,
        method: "DELETE",
    });

    if (!response.ok) {
        throw new Error(
            `Failed to delete server: ${response.status} ${response.statusText}`,
        );
    }
}

export async function createSnapshot(
    serverId: number,
    snapshotName: string,
): Promise<void> {
    const response = await fetch(
        `${apiBaseUrl}/servers/${serverId}/actions/create_image`,
        {
            ...baseInit,
            method: "POST",
            headers: {
                ...baseInit.headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                description: snapshotName,
                type: "snapshot",
                labels: {
                    "managed-by": "hetzner-mc-server-manager",
                    "server-id": serverId.toString(),
                },
            }),
        },
    );

    if (!response.ok) {
        if (response.status === 423) {
            return;
        }

        throw new Error(
            `Failed to create snapshot: ${response.status} ${response.statusText}`,
        );
    }
}

export async function listSnapshots(): Promise<HetznerImage[]> {
    const response = await fetch(
        `${apiBaseUrl}/images?label_selector=${encodeURIComponent(
            labelSelector,
        )}`,
        baseInit,
    );

    if (!response.ok) {
        throw new Error(
            `Failed to fetch snapshots: ${response.status} ${response.statusText}`,
        );
    }

    const data = await response.json();
    return data.images as HetznerImage[];
}

export async function getSnapshotForServer(
    serverId: number,
): Promise<HetznerImage | null> {
    const response = await fetch(
        `${apiBaseUrl}/images?label_selector=${encodeURIComponent(
            `${labelSelector},server-id=${serverId}`,
        )}`,
        baseInit,
    );

    if (!response.ok) {
        throw new Error(
            `Failed to fetch snapshots: ${response.status} ${response.statusText}`,
        );
    }

    const data = await response.json();
    const images = data.images as HetznerImage[];

    console.log("Fetched snapshots for server:", serverId, images);

    return images.length > 0 ? images[0] : null;
}

export interface HetznerImage {
    id: number;
    name: string;
    description: string;
    created: string;
    type: "app" | "snapshot" | "backup" | "system";
    status: "available" | "creating" | "unavailable";
}

export async function deleteSnapshot(imageId: number): Promise<void> {
    const response = await fetch(`${apiBaseUrl}/images/${imageId}`, {
        ...baseInit,
        method: "DELETE",
    });

    if (!response.ok) {
        throw new Error(
            `Failed to delete snapshot: ${response.status} ${response.statusText}`,
        );
    }
}

export async function createServer(
    serverName: string,
    imageId: number,
    ipv4id: number,
): Promise<HetznerServer> {
    const response = await fetch(`${apiBaseUrl}/servers`, {
        ...baseInit,
        method: "POST",
        headers: {
            ...baseInit.headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            name: serverName,
            server_type: HETZNER_SERVER_TYPE,
            image: imageId,
            location: HETZNER_REGION,
            labels: {
                "managed-by": "hetzner-mc-server-manager",
                "target-state": "running",
            },
            ssh_keys: [HETZNER_SSH_KEY_ID],
            public_net: {
                enable_ipv4: true,
                enable_ipv6: false,
                ipv4: ipv4id,
            },
        }),
    });

    if (!response.ok) {
        throw new Error(
            `Failed to create server: ${response.status} ${response.statusText}`,
        );
    }

    const data = await response.json();
    return data.server as HetznerServer;
}

export async function getPrimaryIps(): Promise<HetznerPrimaryIp[]> {
    const response = await fetch(
        `${apiBaseUrl}/primary_ips?label_selector=${encodeURIComponent(
            labelSelector,
        )}`,
        baseInit,
    );

    if (!response.ok) {
        throw new Error(
            `Failed to fetch primary IPs: ${response.status} ${response.statusText}`,
        );
    }

    const data = await response.json();
    return data.primary_ips as HetznerPrimaryIp[];
}

export interface HetznerPrimaryIp {
    id: number;
    ip: string;
    type: "ipv4" | "ipv6";
}

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
