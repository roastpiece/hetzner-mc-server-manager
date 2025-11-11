import type { HetznerServerSize } from "./hetzner.js";
import * as Hetzner from "./hetzner.js";

export type State =
    | "running" // server is running, can be stopped
    | "stopping" // server is stopping, wait until stopped
    | "stopped" // server is stopped, can create snapshot
    | "snapshot-creating" // snapshot is being created, wait until created
    | "snapshot-created" // snapshot created, can delete server
    | "deleting" // server is being deleted, wait until deleted
    | "deleted" // server is deleted, can be started
    | "creating" // server is being created
    | "created" // server created, can be upgraded if needed
    | "upgraded" // server upgraded, can be started
    | "starting" // server is starting
    | "unknown";

export type ServerSize = "pp" | "mid" | "yomama" | "unknown";

export async function getState(): Promise<{
    state: State;
    serverId?: number;
    size?: ServerSize;
    server?: Hetzner.HetznerServer;
}> {
    const server = await findServer();
    let state: State = "unknown";

    if (server == null) {
        state = "deleted";
        return { state };
    }

    switch (server.status) {
        case "running":
            if (server.labels["target-state"] === "deleted") {
                state = "stopping";
            } else {
                state = "running";
            }
            break;

        case "stopping":
            state = "stopping";
            break;

        case "off":
            if (server.labels["target-state"] === "deleted") {
                state = await getSnapshotState(server.id);
            } else if (
                server.labels["target-size"] !== server.server_type.name
            ) {
                state = "created";
            } else {
                state = "upgraded";
            }
            break;

        case "deleting":
            state = "deleting";
            break;

        case "starting":
        case "initializing":
            if (server.labels["target-size"] !== server.server_type.name) {
                state = "creating";
            } else {
                state = "starting";
            }
            break;
    }

    return {
        state,
        serverId: server.id,
        size: fromHetznerServerSize(
            (server.labels["target-size"] as HetznerServerSize) ??
                server.server_type.name,
        ),
        server,
    };
}

function fromHetznerServerSize(size: HetznerServerSize): ServerSize {
    switch (size) {
        case "ccx13":
            return "pp";
        case "ccx23":
            return "mid";
        case "ccx33":
            return "yomama";
        default:
            console.warn(`Unknown Hetzner server size: ${size}`);
            return "unknown";
    }
}

function intoHetznerServerSize(size: ServerSize): HetznerServerSize {
    switch (size) {
        case "pp":
            return "ccx13";
        case "mid":
            return "ccx23";
        case "yomama":
            return "ccx33";
        default:
            throw new Error(`Unknown server size: ${size}`);
    }
}

async function getSnapshotState(serverId: number): Promise<State> {
    const snapshot = await Hetzner.getSnapshotForServer(serverId);

    if (snapshot == null) {
        return "stopped";
    }

    switch (snapshot.status) {
        case "creating":
        case "unavailable":
            return "snapshot-creating";

        case "available":
            return "snapshot-created";
    }
}

async function startServer(serverSize: ServerSize): Promise<void> {
    const snapshots = await Hetzner.listSnapshots();
    if (snapshots.length === 0) {
        throw new Error("No snapshots available to start the server from.");
    }

    const latestSnapshot = snapshots.reduce((latest, current) => {
        return new Date(current.created) > new Date(latest.created)
            ? current
            : latest;
    });

    console.log("Starting server from snapshot:", latestSnapshot);

    const primaryIps = await Hetzner.getPrimaryIps();
    if (primaryIps.length === 0) {
        throw new Error("No primary IPs available to assign to the server.");
    }
    const primaryIp = primaryIps[0];

    await Hetzner.createServer(
        "mc-server",
        latestSnapshot.id,
        primaryIp.id,
        intoHetznerServerSize(serverSize),
    );
}

export async function createSnapshot(serverId: number): Promise<void> {
    const existingSnapshot = await Hetzner.getSnapshotForServer(serverId);

    if (existingSnapshot != null) {
        return; // Snapshot already exists, do nothing
    }

    await Hetzner.createSnapshot(serverId, `Snapshot for server ${serverId}`);
}

export async function try_start(serverSize: ServerSize): Promise<void> {
    const { state } = await getState();

    if (state !== "deleted") {
        throw new Error(`Cannot start server from state: ${state}`);
    }

    await startServer(serverSize);
}

export async function try_stop(): Promise<void> {
    const { state, serverId } = await getState();

    if (state !== "running") {
        throw new Error(`Cannot stop server from state: ${state}`);
    }

    if (serverId == null) {
        throw new Error("Server ID is undefined.");
    }

    await Hetzner.setServerLabels(serverId, {
        "target-state": "deleted",
    });
    await Hetzner.stopServer(serverId);
}

export async function findServer(): Promise<Hetzner.HetznerServer | undefined> {
    const servers = await Hetzner.getServers();

    const server = servers.at(0);
    return server;
}
