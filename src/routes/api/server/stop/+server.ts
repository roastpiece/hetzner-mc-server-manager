import { try_stop } from "$lib/state";
import type { RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async () => {
    try {
        await try_stop();
    } catch (error) {
        return new Response(null, {
            status: 412,
            statusText: (error as Error).message,
        });
    }
    return new Response();
};
