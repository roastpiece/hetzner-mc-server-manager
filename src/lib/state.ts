import * as Hetzner from "./hetzner.js";

export type State =
    | "running"
    | "stopping"
    | "stopped"
    | "snapshot-creating"
    | "snapshot-created"
    | "deleting"
    | "deleted"
    | "starting"
    | "unknown";

export async function getState(): Promise<{ state: State; serverId?: number }> {
    const server = await findServer();
    let state: State = "unknown";

    if (server == null) {
        state = "deleted";
        return { state };
    }

    switch (server.status) {
        case "running":
            state = "running";
            break;

        case "stopping":
            state = "stopping";
            break;

        case "off":
            if (server.labels["target-state"] === "deleted")
                state = await getSnapshotState(server.id);
            else state = "starting";
            break;

        case "deleting":
            state = "deleting";
            break;

        case "starting":
        case "initializing":
            state = "starting";
            break;
    }

    return { state, serverId: server.id };
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

async function startServer(): Promise<void> {
    const snapshots = await Hetzner.listSnapshots();
    if (snapshots.length === 0) {
        throw new Error("No snapshots available to start the server from.");
    }

    const latestSnapshot = snapshots.reduce((latest, current) => {
        return new Date(current.created) > new Date(latest.created)
            ? current
            : latest;
    });

    const primaryIps = await Hetzner.getPrimaryIps();
    if (primaryIps.length === 0) {
        throw new Error("No primary IPs available to assign to the server.");
    }
    const primaryIp = primaryIps[0];

    await Hetzner.createServer("mc-server", latestSnapshot.id, primaryIp.id);
}

export async function createSnapshot(serverId: number): Promise<void> {
    const existingSnapshot = await Hetzner.getSnapshotForServer(serverId);

    if (existingSnapshot != null) {
        return; // Snapshot already exists, do nothing
    }

    await Hetzner.createSnapshot(serverId, `Snapshot for server ${serverId}`);
}

export async function try_start(): Promise<void> {
    const { state } = await getState();

    if (state !== "deleted") {
        throw new Error(`Cannot start server from state: ${state}`);
    }

    await startServer();
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
