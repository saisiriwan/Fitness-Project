const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'mysecretpassword', // default or check typical password
  port: 5432,
});

async function run() {
  try {
    await client.connect();
    const res = await client.query('SELECT id, schedule_id, exercise_id, exercise_name FROM session_logs ORDER BY id DESC LIMIT 5');
    console.log(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
run();
