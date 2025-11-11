export interface MinecraftStatus {
    online: boolean;
    players?: {
        online: number;
        max: number;
        list?: { name: string }[];
    };
}
