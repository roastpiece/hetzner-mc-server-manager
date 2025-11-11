import { try_start, type ServerSize } from "$lib/state";
import type { RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async (event) => {
    let serverSize: ServerSize;

    try {
        const data = await event.request.json();
        if (typeof data.size !== "string") {
            return new Response(null, {
                status: 400,
                statusText: "Missing or invalid 'size' field in request body.",
            });
        }
        serverSize = data.size;
    } catch {
        return new Response(null, {
            status: 400,
            statusText: "Missing or invalid 'size' field in request body.",
        });
    }

    try {
        await try_start(serverSize);
    } catch (error) {
        return new Response(null, {
            status: 412,
            statusText: (error as Error).message,
        });
    }

    return new Response();
};
