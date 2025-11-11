import { getState, type ServerSize, type State } from "$lib/state";
import type { RequestHandler } from "@sveltejs/kit";

export interface Status {
    state: State;
    size?: ServerSize;
    running: boolean;
    canStart: boolean;
    canStop: boolean;
}

export const GET: RequestHandler = async () => {
    const status: Status = {
        state: "unknown",
        running: false,
        canStart: false,
        canStop: false,
    };
    const { state, size } = await getState();
    status.state = state;
    status.size = size;

    if (state === "running") {
        status.running = true;
        status.canStop = true;
    }

    if (state === "deleted") {
        status.canStart = true;
    }

    return new Response(JSON.stringify(status));
};
