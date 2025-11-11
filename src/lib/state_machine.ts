import * as State from "./state.js";
import * as Hetzner from "./hetzner.js";

export async function next(): Promise<{
    state: State.State;
    size?: State.ServerSize;
}> {
    const { state, serverId, size } = await State.getState();

    switch (state) {
        case "running":
            // do nothing
            break;

        case "stopping":
            // wait until stopped
            break;

        case "stopped":
            await State.createSnapshot(serverId!);
            break;

        case "snapshot-creating":
            // wait until snapshot created
            break;

        case "snapshot-created":
            await Hetzner.deleteServer(serverId!);
            break;

        case "deleting":
            // wait until deleted
            break;

        case "deleted":
            // do nothing
            break;

        case "starting":
            // wait until running
            break;

        case "unknown":
            break;
    }

    return { state, size };
}
