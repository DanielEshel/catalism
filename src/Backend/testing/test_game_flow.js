const axios = require('axios');
const { io } = require("socket.io-client");

const API_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000';

const CLR = {
    green: '\x1b[32m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    reset: '\x1b[0m'
};

// --- HELPER: AUTHENTICATED SOCKET ---
const connectSocket = (token, gameId, role) => {
    return new Promise((resolve, reject) => {
        const socket = io(SOCKET_URL, {
            auth: { token: token } // 🔒 Sending JWT in Handshake
        });

        socket.on("connect", () => {
            console.log(`   🔌 [${role}] Socket Connected!`);
            socket.emit("join_game", { gameId });
        });

        // Listen for the personal update
        socket.on("game_pulse", (game) => {
            // Check if this pulse belongs to our game
            if (game._id === gameId) {
                // We resolve the promise so the test knows connection is stable
                // But we DON'T disconnect, we keep listening.
                resolve(socket); 
            }
        });

        socket.on("connect_error", (err) => {
            console.log(`   ❌ [${role}] Connection Refused:`, err.message);
            reject(err);
        });

        socket.on("error", (err) => {
             console.log(`   ⚠️ [${role}] Logic Error:`, err);
        });
    });
};

async function runFullTest() {
    console.log(`${CLR.cyan}🚀 STARTING SECURE JWT TEST (2 PLAYERS)...${CLR.reset}\n`);

    try {
        // ==========================================
        // 1. REGISTER HOST
        // ==========================================
        console.log("1️⃣  Registering Host...");
        const hostReg = await axios.post(`${API_URL}/users/register`, {
            displayName: "Captain_Secure",
            email: `host_${Date.now()}@cat.com`,
            password: "password123"
        });
        const hostToken = hostReg.data.token;
        console.log(`${CLR.green}   🔑 Host Token Received.${CLR.reset}`);

        // ==========================================
        // 2. CREATE GAME (Protected Route)
        // ==========================================
        console.log("\n2️⃣  Creating Game...");
        const createRes = await axios.post(`${API_URL}/games/create`, 
            { maxPlayers: 2 },
            { headers: { Authorization: `Bearer ${hostToken}` } }
        );
        const gameId = createRes.data._id;
        console.log(`${CLR.green}   ✅ Game Created: ${gameId}${CLR.reset}`);

        // ==========================================
        // 3. HOST CONNECTS SOCKET
        // ==========================================
        console.log("\n3️⃣  Host Connecting Socket...");
        const hostSocket = await connectSocket(hostToken, gameId, "HOST");

        // 🛑 LISTEN FOR START EVENT *BEFORE* P2 JOINS
        // This ensures we don't miss the event while P2 is logging in
        const gameStartPromise = new Promise((resolve) => {
            hostSocket.on("game_event", (event) => {
                if (event.type === 'GAME_STARTED') {
                    console.log(`${CLR.yellow}\n🎉 EVENT RECEIVED: GAME_STARTED${CLR.reset}`);
                    console.log(`   First Turn User ID: ${event.payload.firstTurn}`);
                    resolve(true);
                }
            });
        });

        // ==========================================
        // 4. PLAYER 2 JOIN FLOW
        // ==========================================
        console.log("\n4️⃣  Player 2 Joining...");
        
        // A. Register P2
        const p2Reg = await axios.post(`${API_URL}/users/register`, {
            displayName: "First_Mate", 
            email: `p2_${Date.now()}@cat.com`, 
            password: "password123"
        });
        const p2Token = p2Reg.data.token;

        // B. HTTP Reservation (Protected)
        console.log(`   📡 P2 Reserving Slot...`);
        await axios.post(`${API_URL}/games/join`, 
            { gameId },
            { headers: { Authorization: `Bearer ${p2Token}` } }
        );

        // C. Socket Connect (Triggers the Start)
        console.log(`   🔌 P2 Connecting Socket...`);
        const p2Socket = await connectSocket(p2Token, gameId, "P2");

        // ==========================================
        // 5. WAIT FOR RESULT
        // ==========================================
        console.log("\n5️⃣  Waiting for Game Start Broadcast...");
        await gameStartPromise;

        console.log(`\n${CLR.green}✅ SECURE INTEGRATION TEST PASSED!${CLR.reset}`);
        
        // Cleanup
        hostSocket.disconnect();
        p2Socket.disconnect();
        process.exit(0);

    } catch (err) {
        console.error(`\n${CLR.red}❌ TEST FAILED:${CLR.reset}`);
        if (err.response) {
             console.error(`   Status: ${err.response.status}`);
             console.error(`   Data:`, err.response.data);
        } else {
             console.error(`   Error: ${err.message}`);
        }
        process.exit(1);
    }
}

runFullTest();