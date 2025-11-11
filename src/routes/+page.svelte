<script lang="ts">
    import type { Status } from "./api/status/+server";
    import { onMount } from "svelte";
    import type { MinecraftStatus } from "$lib/mc-status";
    import type { ServerSize } from "$lib/state";

    let serverStatus = $state<Status>();
    let serverPollInterval: number|undefined = undefined;
    let isLoading = $state<boolean>(false);

    let mcStatus = $state<MinecraftStatus|undefined>();
    let mcStatusPollInterval: number|undefined = undefined;

    let errorText = $state<string|undefined>();
    let warnOnExit = false;
    
    let serverSize = $state<ServerSize>('pp');
    
    $effect(() => {
        if (serverStatus?.state === 'deleted' || serverStatus?.state === 'running') {
            clearInterval(serverPollInterval);
            isLoading = false;
            warnOnExit = false;
        }
    });
    
    $effect(() => {
        if (serverStatus?.state === 'running') {
            startMcStatusPoll();
        } else {
            clearInterval(mcStatusPollInterval);
        }
    });
    
    $effect(() => {
        if (serverStatus?.state !== 'deleted') {
            serverSize = serverStatus?.size ?? 'pp';
        }
    });

    async function updateStatus() {
        const newStatus = await fetch('/api/status');
        const newStatusJson = await newStatus.json().then((data: Status) => data);
        serverStatus = newStatusJson;
    }
    
    async function stopServer() {
        if (serverStatus != null) {
            serverStatus.canStop = false;
            serverStatus.state = 'stopping';
        }

        const res = await fetch('/api/server/stop', {
            method: 'POST',
        });
        if (!res.ok) {
            const error = await res.text();
            errorText += `Error stopping server: ${res.status} ${res.statusText}\n${error}\n`;
            await updateStatus();
        }
        
        startWaitForServerDeleted();
    }
    
    async function startServer() {
        if (serverStatus != null) {
            serverStatus.canStart = false;
            serverStatus.state = 'starting';
        }

        const res = await fetch('/api/server/start', {
            method: 'POST',
            body: JSON.stringify({
                size: serverSize,
            }),
        });
        if (!res.ok) {
            const errorText = await res.text();
            await updateStatus();
        }
        
        startPollStatus();
    }
    
    async function startWaitForServerDeleted() {
        clearInterval(serverPollInterval);
        // @ts-ignore
        serverPollInterval = setInterval(async () => {
            const res = await fetch('/api/server/wait');
            const newStatus = await res.json().then((data: Status) => data);
            serverStatus = newStatus;
        }, 5000);
        isLoading = true;
    }
    
    async function startPollStatus() {
        clearInterval(serverPollInterval);
        // @ts-ignore
        serverPollInterval = setInterval(async () => {
            await updateStatus();
        }, 5000);
        isLoading = true;
        warnOnExit = true;
    }
    
    async function startMcStatusPoll() {
        clearInterval(mcStatusPollInterval);

        updateMcStatus();
        // @ts-ignore
        mcStatusPollInterval = setInterval(async () => {
            await updateMcStatus();
        }, 30000);
    }
    
    async function updateMcStatus() {
        const res = await fetch('/api/minecraft/status');
        if (res.ok) {
            const data = await res.json();
            mcStatus = data;
        } else {
            mcStatus = undefined;
        }
    }
    
    async function forceRestart() {
        const res = await fetch('/api/minecraft/restart', {
            method: 'POST',
        });
        if (!res.ok) {
            const error = await res.text();
            errorText += `Error restarting Minecraft server: ${res.status} ${res.statusText}\n${error}\n`;
        }
    }
    
    onMount(async () => {
        await updateStatus();
        
        if (serverStatus == null) {
            return;
        }

        switch (serverStatus.state) {
            case 'starting':
                startPollStatus();
                break;
                
            case "running":
            case "deleted":
            case "unknown":
                break;

            case "stopping":
            case "snapshot-creating":
            case "snapshot-created":
            case "deleting":
            case "stopped":
            case "creating":
            case "created":
            case "upgraded":
                startWaitForServerDeleted();
                break;
        }
        
        
        window.addEventListener("beforeunload", function (event) {
          if (warnOnExit) {
            event.preventDefault();
            event.returnValue = '';
          }
        });
    });
</script>

<style>
    .loading-spinner {
        display: inline-block;
        width: 24px;
        height: 24px;
        animation: spin 1s linear infinite;
        vertical-align: middle;
    }
    
    .loading-spinner svg {
        width: 100%;
        height: 100%;
    }
    
    .loading-spinner circle {
        fill: none;
        stroke: #333;
        stroke-linecap: round;
        stroke-dasharray: 164.93361431346415;
        stroke-dashoffset: 0;
        transform-origin: center;
    }
    
    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
</style>

<h1>Welcome to MC Server Manager</h1>

<p>XXD</p>

{#if serverStatus == null}
    <p>Loading server status...</p>
{:else}
    <h2>Server Status</h2>
    <p>
        Server machine state: {serverStatus.state}
        {#if isLoading}
            <span class="loading-spinner">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="35" stroke-width="10" />
                </svg>
            </span>
        {/if}
    </p>
    {#if mcStatus != undefined}
        <p>
            Minecraft server state: {mcStatus.online ? 'Online' : 'Offline'}
            {#if mcStatus.online && mcStatus.players != null}
                (Players: {mcStatus.players.online} / {mcStatus.players.max})
            {/if}
        </p>
        {#if mcStatus.players?.list != null && mcStatus.players.list.length > 0}
            Online Players:
            <ul>
                {#each mcStatus.players.list as player}
                    <li>{player.name}</li>
                {/each}
            </ul>
        {/if}
    {/if}
    {#if serverStatus.state === 'deleted'}
        <p>The server has been deleted. You can start it again, which will recreate it from the latest snapshot.</p>
    {/if}

    <hr>
    <div>
        <button onclick={stopServer} disabled={!serverStatus.canStop} title="Stop the server">Get that shit outta here</button>
    </div>
    <hr>
    <div>
        <span>Server size</span>
        <select bind:value={serverSize} disabled={!serverStatus.canStart}>
            <option value="pp">Like your pp</option>
            <option value="mid">Pretty mid</option>
            <option value="yomama">Bigger than yo mamma</option>
        </select>
        <button onclick={startServer} disabled={!serverStatus.canStart} title="Start the server">Open the hole</button>
    </div>
    
    {#if serverStatus.state === "running"}
        <button onclick={forceRestart}>Force restart minecraft instance</button>
    {/if}
{/if}

{#if errorText}
    <h3>Errors:</h3>
    <pre>{errorText}</pre>
{/if}
