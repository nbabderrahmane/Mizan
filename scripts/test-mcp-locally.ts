
import { spawn } from "child_process";
import path from "path";

const serverPath = path.resolve(process.cwd(), "scripts/mcp-server.ts");

console.log("Starting MCP Server from:", serverPath);

const server = spawn("npx", ["tsx", serverPath], {
    env: process.env,
    stdio: ["pipe", "pipe", "inherit"], // Keep stderr for logs
});

let buffer = "";

server.stdout.on("data", (data) => {
    const chunk = data.toString();
    buffer += chunk;

    // Try to find a complete JSON line
    const lines = buffer.split("\n");
    // If the last line is incomplete, put it back in buffer
    buffer = lines.pop() || "";

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Ignore non-JSON lines (like dotenv logs if any leak to stdout)
        if (!trimmed.startsWith("{")) {
            console.log("Ignored stdout:", trimmed);
            continue;
        }

        try {
            const json = JSON.parse(trimmed);

            // Log formatted JSON for debugging
            // console.log("Received Valid JSON-RPC:", JSON.stringify(json, null, 2));

            // Check if it's the response we want
            if (json.id === 1 && json.result) {
                console.log("Success! Tool list received:");
                console.log(JSON.stringify(json.result, null, 2));
                server.kill();
                process.exit(0);
            }
        } catch (e) {
            console.log("Received partial/invalid JSON:", trimmed);
        }
    }
});

// Construct JSON-RPC Request
const request = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {},
};

// Wait a bit for server to init before sending
setTimeout(() => {
    console.log("Sending request:", JSON.stringify(request));
    server.stdin.write(JSON.stringify(request) + "\n");
}, 2000);

server.on("close", (code) => {
    console.log(`Server process exited with code ${code}`);
});

server.on("error", (err) => {
    console.error("Failed to start server subprocess:", err);
});
