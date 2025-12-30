// Backend/test-api.js
const BASE_URL = 'http://localhost:3000/api';

async function smokeTest() {
  console.log("🚀 Testing CATalism API Connection...");

  try {
    // 1. Create a dummy game lobby
    console.log("📡 Creating a test lobby...");
    const createRes = await fetch(`${BASE_URL}/games/create`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        hostId: "658f1234567890abcdef1234", // Dummy ID just to check DB write
        maxPlayers: 4
      })
    });
    const newGame = await createRes.json();
    console.log("✅ Successfully wrote to DB! Game ID:", newGame._id);

    // 2. Fetch the live games list
    console.log("📡 Fetching live games list...");
    const listRes = await fetch(`${BASE_URL}/games/live`);
    const games = await listRes.json();

    console.log(`✅ Found ${games.length} games in the galaxy.`);
    console.table(games.map(g => ({
      ID: g._id,
      Status: g.status,
      Host: g.hostId ? "Present" : "Missing",
      Start_Time: g.startTime
    })));

  } catch (err) {
    console.error("❌ Test failed! Is the server running on port 3000?");
    console.error(err.message);
  }
}

smokeTest();