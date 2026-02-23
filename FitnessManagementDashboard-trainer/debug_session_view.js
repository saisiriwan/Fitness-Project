
const axios = require('axios');

async function checkSessionLog(sessionId) {
  try {
    const res = await axios.get(`http://localhost:8080/api/v1/sessions/${sessionId}`);
    const data = res.data;
    
    console.log(`Checking Session ${sessionId}...`);
    if (!data.logs || data.logs.length === 0) {
        console.log("No logs found.");
        return;
    }

    data.logs.forEach(log => {
        console.log(`Exercise: ${log.exercise_name} (${log.exercise_id})`);
        console.log("Tracking Fields:", log.tracking_fields);
        if (log.sets && log.sets.length > 0) {
            log.sets.forEach(set => {
                console.log(`  Set ${set.set_number}:`);
                console.log(`    Planned Metadata:`, JSON.stringify(set.planned_metadata));
                console.log(`    Actual Metadata:`, JSON.stringify(set.actual_metadata));
                console.log(`    Planned Reps: ${set.planned_reps}, Planned Weight: ${set.planned_weight_kg}`);
            });
        }
    });

  } catch (err) {
    console.error("Error fetching session:", err.message);
  }
}

// User can run this with: node debug_session_view.js <SESSION_ID>
// I'll default to the one in their URL if I can guess it, but I'll ask them or just pick a recent one if I could.
// For now, I'll put a placeholder ID.
const sessionID = process.argv[2] || 185; 
checkSessionLog(sessionID);
