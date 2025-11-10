import type { RequestHandler } from "@sveltejs/kit";
import * as State from "$lib/state.js";
import * as Hetzner from "$lib/hetzner.js";

export const POST: RequestHandler = async () => {
    const server = await State.findServer();

    if (server) {
        await Hetzner.setServerLabels(server.id, {
            ...server.labels,
            action: "restart",
        });
    }

    return new Response();
};
