const { io } = require("socket.io-client");
const axios = require("axios");

const BASE_URL = "http://localhost:3000/api";
const SOCKET_URL = "http://localhost:3000";

async function testLazyConnection() {
    console.log("🚀 Starting Hybrid HTTP/WebSocket Test...\n");

    try {
        // --- STEP 1: HTTP PRE-WORK ---
        console.log("1️⃣  [HTTP] Registering User...");
        let userId, token;
        
        try {
            const userRes = await axios.post(`${BASE_URL}/users/register`, {
                displayName: "Lazy_Cat", 
                email: `lazy_${Date.now()}@cat.com`, 
                password: "password123"
            });
            userId = userRes.data._id;
            token = userRes.data.token; // <--- CAPTURE TOKEN
        } catch(e) { 
            console.error("Registration failed:", e.response?.data || e.message);
            process.exit(1);
        }

        console.log("2️⃣  [HTTP] Creating Game Lobby...");
        const createRes = await axios.post(`${BASE_URL}/games/create`, 
            { maxPlayers: 2 },
            { headers: { Authorization: `Bearer ${token}` } } // <--- AUTH HEADER
        );
        const gameId = createRes.data._id;
        console.log(`   ✅ Game Created via HTTP: ${gameId}`);
        
        console.log("3️⃣  [HTTP] Joining Game (Reservation)...");
        await axios.post(`${BASE_URL}/games/join`, 
            { gameId },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log("   ✅ Joined DB successfully. Now connecting socket...");


        // --- STEP 2: OPEN SOCKET (Authenticated) ---
        console.log("\n🔌 [WS] Opening WebSocket Connection...");
        
        // <--- FIX: Must send Token in Handshake
        const socket = io(SOCKET_URL, {
            auth: { token: token } 
        });

        socket.on("connect", () => {
            console.log("   ✅ Socket Connected!");
            
            // <--- FIX: Use correct event name 'join_game'
            socket.emit("join_game", { gameId });
        });

        // <--- FIX: Listen for 'game_pulse' (not game_update)
        socket.on("game_pulse", (game) => {
            console.log(`\n📥 [WS] Received Game Pulse!`);
            console.log(`   Players in Lobby: ${game.playerStates.length}`);
            
            // Prove the socket works by sending an action
            const me = game.playerStates.find(p => p.userId._id === userId || p.userId === userId);
            
            if (me && me.roads.length === 0) {
                 console.log("   🏗️  [WS] Sending Build Action...");
                 
                 // <--- FIX: Match server.js handleClientStream signature
                 socket.emit("game_action", { 
                     gameId, 
                     actionType: "build_road", 
                     payload: { u: 0, v: 1 } // correct payload keys for road
                 });
            } else {
                 console.log("   ✅ Action processed! (Road count updated)");
                 socket.disconnect();
                 process.exit(0);
            }
        });

        socket.on("error", (data) => {
            console.error("   ❌ Server Error:", data);
        });

    } catch (err) {
        console.error("❌ Test Failed:", err.message);
        if(err.response) console.error("   Response:", err.response.data);
    }
}

testLazyConnection();