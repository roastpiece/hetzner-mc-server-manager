import { try_start } from "$lib/state";
import type { RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async () => {
    try {
        await try_start();
    } catch (error) {
        return new Response(null, {
            status: 412,
            statusText: (error as Error).message,
        });
    }

    return new Response();
};
