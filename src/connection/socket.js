import { io, Socket as SocketIO } from "socket.io-client";
import "dotenv/config";

/**
 * Establishes a Socket.IO connection with the Bcoins backend.
 * @param {string} token The Bcoins authentication token to use.
 * @returns {SocketIO} The Socket.IO connection.
 */
function Socket(token) {
    // URL with query parameters
    const url = "wss://bconomy.net/";

    // Connection options
    const options = {
        transports: ["websocket"], // Use WebSocket transport explicitly
        extraHeaders: {
            "Origin": "https://bconomy.net",
            "Cookie": `deleteRequestTime=1723561841640; connect.sid=${token}; discordCsrfState=383722jeff`,
        },
        auth: {
            token: "Bconomy Public Web Client"
        }
    };

    // Establish the connection
    const socket = io(url, options);

    socket.on("connect", () => {
        console.log("Connected to the server!");
    });

    socket.on("disconnect", () => {
        console.log("Disconnected from the server.");
    });

    socket.on("connect_error", (err) => {
        console.error("Connection error:", err);
    });

    return socket;
};

export const socket = Socket(process.env.BC_TOKEN);