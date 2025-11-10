import { MC_SERVER_IP } from "$env/static/private";
import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async () => {
    const status = await fetch(`https://api.mcsrvstat.us/3/${MC_SERVER_IP}`, {
        headers: {
            "User-Agent": "Hetzner-MC-Server-Manager",
        },
    });
    const data = await status.json();

    return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
    });
};
