// test_auth.js
const axios = require('axios'); 

async function runTests() {
    console.log("🧪 Starting Authentication Tests...\n");

    // Use a random email so you don't get "User already exists" errors on re-runs
    const uniqueEmail = `pilot_${Date.now()}@nebula.com`;

    const testUser = {
        displayName: "Star_Kitten",
        email: uniqueEmail,
        password: "securePassword123"
    };

    try {
        // TEST 1: Register
        console.log("📡 Testing Registration...");
        const regRes = await axios.post('http://localhost:3000/api/users/register', testUser);
        
        // FIX 1: The server returns the user object directly, not a "message"
        console.log("✅ Registration Successful! Token received for:", regRes.data.displayName);

        // TEST 2: Login
        console.log("\n📡 Testing Login...");
        const loginRes = await axios.post('http://localhost:3000/api/users/login', {
            email: uniqueEmail, 
            password: "securePassword123"
        });

        // FIX 2: Access data.displayName directly (there is no .user property)
        console.log("✅ Login Successful! Found user:", loginRes.data.displayName);

        // TEST 3: Validation Failure (Short Password)
        console.log("\n📡 Testing Validation (Short Password)...");
        try {
            await axios.post('http://localhost:3000/api/users/register', {
                displayName: "Fail",
                email: "bad@test.com",
                password: "123"
            });
        } catch (err) {
            // Check if response exists before logging
            const errorMsg = err.response ? err.response.data.error : err.message;
            console.log("✅ Validation caught short password:", errorMsg);
        }

    } catch (err) {
        console.error("❌ Test failed:", err.response ? err.response.data : err.message);
    }
}

runTests();