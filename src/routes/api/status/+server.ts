import { getState, type State } from "$lib/state";
import type { RequestHandler } from "@sveltejs/kit";

export interface Status {
    state: State;
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
    const { state } = await getState();
    status.state = state;

    if (state === "running") {
        status.running = true;
        status.canStop = true;
    }

    if (state === "deleted") {
        status.canStart = true;
    }

    return new Response(JSON.stringify(status));
};
