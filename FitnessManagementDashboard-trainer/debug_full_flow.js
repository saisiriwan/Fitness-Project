
const apiBase = "http://localhost:8080/api/v1";
const token = "YOUR_TOKEN_HERE"; // User needs to fill this? No, I can't.

// Helper to mock fetch if not in browser context, but cleaner to use native fetch if available
// Assuming running in node? No, usually agent runs in environment with some tools.
// I'll write a script the user can run with node if they have axios, or just standard fetch if node 18+.

const runTest = async () => {
  // 1. Create a dummy session or use existing? 
  // Let's assume session ID 1 exists/accessible or create new one.
  // Better: Create Schedule -> Add Log -> Update -> Get.

  const headers = {
    "Content-Type": "application/json",
    // "Authorization": `Bearer ${token}` // Cannot easily automate auth without login flow
  };
  
  // Since I cannot easily authenticate in a script without credentials/manual intervention,
  // I will assume the agent can run this inside the browser console or the user runs it?
  // The agent tools suggest I can run terminal commands.
  // But I don't have the user's JWT.

  console.log("This script requires a valid JWT token. Please run this in the Browser Console while logged in.");
  
  const sessionId = 168; // Based on previous context if available? 
  // Let's use the ID from the user's current session if possible. No way to know.

  // Let's simulate the payload construction logic and print it.
  
  const payload = {
    notes: "Debug Test",
    status: "scheduled",
    summary: "Test Summary",
    logs: [
      {
        exercise_id: 1, // Push Up
        exercise_name: "Push Up",
        category: "Strength",
        notes: "Test Notes",
        section_name: "Main",
        section_order: 1,
        tracking_fields: ["Speed", "Time"], // Capitalized to match user case
        sets: [
          {
            set_number: 1,
            actual_reps: 10,
            actual_weight_kg: 20,
            actual_rpe: 8,
            actual_metadata: {
              speed: 5,
              time: "10:00"
            },
            completed: false
          }
        ]
      }
    ]
  };

  console.log("Sending Payload:", JSON.stringify(payload, null, 2));

  try {
      // Mock fetch
      const res = await fetch(`${apiBase}/sessions/${sessionId}`, {
          method: 'PUT',
          headers: headers,
          body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log("Update Response:", data);

      const getRes = await fetch(`${apiBase}/sessions/${sessionId}`);
      const getData = await getRes.json();
      console.log("Get Response Logs:", JSON.stringify(getData.logs, null, 2));
      
      const log = getData.logs[0];
      const set = log.sets[0];
      
      console.log("---------------------------------------------------");
      console.log("VERIFICATION:");
      console.log("Expected Speed: 5, Actual metadata['speed']:", set.actual_metadata?.speed);
      console.log("Expected Time: '10:00', Actual metadata['time']:", set.actual_metadata?.time);
  } catch (e) {
      console.error(e);
  }
};
