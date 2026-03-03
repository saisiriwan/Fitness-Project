// Patch init.sql to fix Bug 1 (missing columns) and Bug 2 (conflicting UNIQUE)
const fs = require('fs');
const path = 'c:/src/Final_project/Fitness-project/backend/userdatabase/docker/init.sql';
let c = fs.readFileSync(path, 'utf8');
let n = 0;

// 1a: Add settings to users
c = c.replace(
  '    avatar_url TEXT,\r\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\r\n    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\r\n);\r\n\r\nCREATE TRIGGER update_users_updated_at',
  '    avatar_url TEXT,\r\n    settings JSONB DEFAULT \'{}\'::JSONB,\r\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\r\n    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\r\n);\r\n\r\nCREATE TRIGGER update_users_updated_at'
); if (c.includes('settings JSONB')) { n++; console.log('OK 1a: users.settings'); }

// 1b: Add bio,specialization to trainers
c = c.replace(
  '    avatar_url TEXT,\r\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\r\n    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\r\n);\r\n\r\nCREATE TRIGGER update_trainers_updated_at',
  '    avatar_url TEXT,\r\n    bio TEXT,\r\n    specialization VARCHAR(255),\r\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\r\n    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\r\n);\r\n\r\nCREATE TRIGGER update_trainers_updated_at'
); if (c.includes('bio TEXT')) { n++; console.log('OK 1b: trainers.bio'); }

// 1c: Add birth_date,fitness_level to clients
c = c.replace(
  "    status VARCHAR(50) DEFAULT 'active',\r\n    join_date",
  "    status VARCHAR(50) DEFAULT 'active',\r\n    birth_date DATE,\r\n    fitness_level VARCHAR(50),\r\n    join_date"
); if (c.includes('birth_date DATE')) { n++; console.log('OK 1c: clients.birth_date'); }

// 1d: Add schedule columns
c = c.replace(
  '    total_volume_kg FLOAT DEFAULT 0,\r\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\r\n    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\r\n);\r\n\r\nCREATE TRIGGER update_schedules_updated_at',
  '    total_volume_kg FLOAT DEFAULT 0,\r\n    total_distance_km FLOAT DEFAULT 0,\r\n    actual_duration_minutes INTEGER DEFAULT 0,\r\n    calories_burned INTEGER DEFAULT 0,\r\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\r\n    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\r\n);\r\n\r\nCREATE TRIGGER update_schedules_updated_at'
); if (c.includes('total_distance_km FLOAT')) { n++; console.log('OK 1d: schedules columns'); }

// 1e: Add client_metrics columns
c = c.replace(
  '    value FLOAT,\r\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\r\n);\r\n\r\nCREATE INDEX IF NOT EXISTS idx_client_metrics',
  '    value FLOAT,\r\n    exercise_name VARCHAR(255),\r\n    notes TEXT,\r\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\r\n);\r\n\r\nCREATE INDEX IF NOT EXISTS idx_client_metrics'
); if (c.includes('exercise_name VARCHAR(255)')) { n++; console.log('OK 1e: client_metrics'); }

// 2a: Remove conflicting constraint
c = c.replace(
  '    CONSTRAINT unique_exercise_per_session_log\r\n        UNIQUE(client_id, schedule_id, exercise_id),\r\n    CONSTRAINT unique_exercise_daily_summary',
  '    CONSTRAINT unique_exercise_daily_summary'
); if (!c.includes('unique_exercise_per_session_log')) { n++; console.log('OK 2a: constraint removed'); }

// 2b: Add schedule_id to trigger INSERT columns
c = c.replace(
  '            client_id, exercise_id, exercise_name, exercise_type, date,',
  '            client_id, schedule_id, exercise_id, exercise_name, exercise_type, date,'
); if (c.includes('client_id, schedule_id, exercise_id, exercise_name')) { n++; console.log('OK 2b: INSERT columns'); }

// 2c: Add schedule_id to trigger VALUES
c = c.replace(
  '            v_client_id, v_record.exercise_id, v_record.exercise_name,',
  '            v_client_id, p_schedule_id, v_record.exercise_id, v_record.exercise_name,'
); if (c.includes('v_client_id, p_schedule_id, v_record.exercise_id')) { n++; console.log('OK 2c: VALUES'); }

console.log(`\n${n}/8 OK`);
if (n === 8) { fs.writeFileSync(path, c, 'utf8'); console.log('SAVED!'); }
else { console.log('NOT saved - some replacements failed'); }
