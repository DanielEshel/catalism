const { io } = require("socket.io-client");
const axios = require("axios");

const BASE_URL = "http://localhost:3000/api";
const SOCKET_URL = "http://localhost:3000";

async function testLazyConnection() {
    console.log("🚀 Starting Hybrid HTTP/WebSocket Test...\n");

    try {
        // --- STEP 1: HTTP PRE-WORK ---
        console.log("1️⃣  [HTTP] Registering User...");
        let userId;
        try {
            const userRes = await axios.post(`${BASE_URL}/users/register`, {
                displayName: "Lazy_Cat", email: `lazy_${Date.now()}@cat.com`, password: "123"
            });
            userId = userRes.data.userId;
        } catch(e) { userId = "658f1234567890abcdef1234"; } // Fallback ID

        console.log("2️⃣  [HTTP] Creating Game Lobby...");
        const createRes = await axios.post(`${BASE_URL}/games/create`, {
            hostId: userId, maxPlayers: 2
        });
        const gameId = createRes.data._id;
        console.log(`   ✅ Game Created via HTTP: ${gameId}`);
        
        console.log("3️⃣  [HTTP] Joining Game...");
        // This validates rules (is full? is started?) without opening a socket yet
        await axios.post(`${BASE_URL}/games/join`, { gameId, userId });
        console.log("   ✅ Joined DB successfully. Now connecting socket...");


        // --- STEP 2: OPEN SOCKET (On Demand) ---
        console.log("\n🔌 [WS] Opening WebSocket Connection...");
        const socket = io(SOCKET_URL);

        socket.on("connect", () => {
            console.log("   ✅ Socket Connected!");
            
            // Only NOW do we subscribe to the room
            socket.emit("enter_game_room", { gameId, userId });
        });

        socket.on("game_update", (game) => {
            console.log(`\n📥 [WS] Received Game Update!`);
            console.log(`   Players in Lobby: ${game.playerIds.length}`);
            
            // Prove the socket works by sending an action
            if (game.playerStates[0].roads.length === 0) {
                 console.log("   🏗️  [WS] Sending Build Action...");
                 socket.emit("send_action", { 
                     gameId, userId, actionType: "build_road", payload: { location: "0,0|0,1" } 
                 });
            } else {
                 console.log("   ✅ Road built successfully via Socket!");
                 process.exit(0);
            }
        });

    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}

testLazyConnection();