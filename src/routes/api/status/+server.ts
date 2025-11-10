import type { RequestHandler } from "@sveltejs/kit";

export interface Status {
    running: boolean;
    canStart: boolean;
    canStop: boolean;
};

export const GET: RequestHandler = async () => {
    const status: Status = {
        running: false,
        canStart: false,
        canStop: false
    };
    


    return new Response(JSON.stringify(status));
}