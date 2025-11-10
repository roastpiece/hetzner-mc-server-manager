import { MC_SERVER_IP } from "$env/static/private";
import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async () => {
    return fetch(`https://api.mcsrvstat.us/3/${MC_SERVER_IP}`);
};
