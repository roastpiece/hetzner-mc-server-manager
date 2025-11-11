import { next } from "$lib/state_machine";
import type { RequestHandler } from "@sveltejs/kit";
import type { Status } from "../../status/+server";

export const GET: RequestHandler = async () => {
    try {
        const status: Status = {
            state: "unknown",
            running: false,
            canStart: false,
            canStop: false,
        };

        const { state, size } = await next();
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
    } catch (error) {
        return new Response(null, {
            status: 500,
            statusText: (error as Error).message,
        });
    }
};
