// test-auth.js
const axios = require('axios'); // or use fetch

async function runTests() {
    console.log("🧪 Starting Authentication Tests...\n");

    const testUser = {
        displayName: "Star_Kitten",
        email: "pilot@nebula.com",
        password: "securePassword123"
    };

    try {
        // TEST 1: Register
        console.log("📡 Testing Registration...");
        const regRes = await axios.post('http://localhost:3000/api/users/register', testUser);
        console.log("✅ Registration Successful:", regRes.data.message);

        // TEST 2: Login
        console.log("\n📡 Testing Login...");
        const loginRes = await axios.post('http://localhost:3000/api/users/login', {
            email: "  PILOT@nebula.com  ", // Test trimming and lowercase logic!
            password: "securePassword123"
        });
        console.log("✅ Login Successful! Found user:", loginRes.data.user.displayName);

        // TEST 3: Validation Failure (Short Password)
        console.log("\n📡 Testing Validation (Short Password)...");
        try {
            await axios.post('http://localhost:3000/api/users/register', {
                displayName: "Fail",
                email: "bad@test.com",
                password: "123"
            });
        } catch (err) {
            console.log("✅ Validation caught short password:", err.response.data.error);
        }

    } catch (err) {
        console.error("❌ Test failed:", err.response ? err.response.data : err.message);
    }
}

runTests();