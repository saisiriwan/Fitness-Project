-- Enable UUID extension (kept for utility, though IDs are now SERIAL)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to update 'updated_at' column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. Users Table (Authentication Only)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'trainer' CHECK (role IN ('trainer', 'trainee')),
    avatar_url TEXT,
    settings JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 0. Notifications Table (ย้ายมาหลัง users)
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50),
    title VARCHAR(255),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Trainers Table (Trainer Profile)
CREATE TABLE IF NOT EXISTS trainers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    phone_number VARCHAR(50),
    avatar_url TEXT,
    bio TEXT,
    specialization VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_trainers_updated_at BEFORE UPDATE ON trainers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Clients Table (Trainee Profile)
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER REFERENCES users(id),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone_number VARCHAR(50),
    avatar_url TEXT,
    gender VARCHAR(20),
    height_cm FLOAT,
    weight_kg FLOAT,
    goal TEXT,
    injuries TEXT,
    activity_level VARCHAR(50),
    medical_conditions TEXT,
    target_weight FLOAT,
    target_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',
    birth_date DATE,
    fitness_level VARCHAR(50),
    join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    preferred_workout_days TEXT[],
    workout_frequency_per_week INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE clients ADD CONSTRAINT unique_email_per_trainer UNIQUE (trainer_id, email);

-- 4. Exercises Table
CREATE TABLE IF NOT EXISTS exercises (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    muscle_groups TEXT[],
    movement_pattern VARCHAR(100),
    modality VARCHAR(50),
    instructions TEXT,
    description TEXT,
    tracking_type VARCHAR(50),
    tracking_fields TEXT[],
    calories_estimate VARCHAR(50),
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON exercises FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Programs Table
CREATE TABLE IF NOT EXISTS programs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_weeks INTEGER,
    days_per_week INTEGER,
    trainer_id INTEGER REFERENCES users(id),
    client_id INTEGER REFERENCES clients(id),
    parent_program_id INTEGER REFERENCES programs(id),
    is_template BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'paused', 'cancelled')),
    start_date DATE,
    end_date DATE,
    current_week INTEGER DEFAULT 1,
    total_weeks INTEGER,
    target_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_programs_client_status
ON programs(client_id, status) WHERE status = 'active';

-- 6. Program Days Table
CREATE TABLE IF NOT EXISTS program_days (
    id SERIAL PRIMARY KEY,
    program_id INTEGER REFERENCES programs(id) ON DELETE CASCADE,
    week_number INTEGER,
    day_number INTEGER,
    name VARCHAR(255),
    is_rest_day BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Program Sections Table
CREATE TABLE IF NOT EXISTS program_sections (
    id SERIAL PRIMARY KEY,
    program_day_id INTEGER REFERENCES program_days(id) ON DELETE CASCADE,
    type VARCHAR(50),
    format VARCHAR(50),
    name VARCHAR(255),
    duration_seconds INTEGER,
    work_seconds INTEGER,
    rest_seconds_section INTEGER,
    rounds INTEGER,
    "order" INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Program Exercises Table
CREATE TABLE IF NOT EXISTS program_exercises (
    id SERIAL PRIMARY KEY,
    program_section_id INTEGER REFERENCES program_sections(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id),
    sets INTEGER,
    reps JSONB DEFAULT '[]'::JSONB,
    weight JSONB DEFAULT '[]'::JSONB,
    distance JSONB DEFAULT '[]'::JSONB,
    pace JSONB DEFAULT '[]'::JSONB,
    side JSONB DEFAULT '[]'::JSONB,
    duration JSONB DEFAULT '[]'::JSONB,
    hold_time JSONB DEFAULT '[]'::JSONB,
    tempo JSONB DEFAULT '[]'::JSONB,
    rest JSONB DEFAULT '[]'::JSONB,
    rpe JSONB DEFAULT '[]'::JSONB,
    time JSONB DEFAULT '[]'::JSONB,
    speed JSONB DEFAULT '[]'::JSONB,
    cadence JSONB DEFAULT '[]'::JSONB,
    distance_long JSONB DEFAULT '[]'::JSONB,
    distance_short JSONB DEFAULT '[]'::JSONB,
    one_rm JSONB DEFAULT '[]'::JSONB,
    rir JSONB DEFAULT '[]'::JSONB,
    heart_rate JSONB DEFAULT '[]'::JSONB,
    hr_zone JSONB DEFAULT '[]'::JSONB,
    watts JSONB DEFAULT '[]'::JSONB,
    rpm JSONB DEFAULT '[]'::JSONB,
    rounds JSONB DEFAULT '[]'::JSONB,
    reps_min INTEGER,
    reps_max INTEGER,
    weight_kg FLOAT,
    weight_percentage FLOAT,
    is_bodyweight BOOLEAN DEFAULT FALSE,
    duration_seconds DECIMAL(10, 2),
    rest_seconds DECIMAL(10, 2),
    rpe_target DECIMAL(4, 1),
    notes TEXT,
    "order" INTEGER,
    tracking_fields TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Schedules Table
CREATE TABLE IF NOT EXISTS schedules (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    trainer_id INTEGER REFERENCES users(id),
    client_id INTEGER REFERENCES clients(id),
    program_id INTEGER REFERENCES programs(id),
    program_day_id INTEGER REFERENCES program_days(id),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    location VARCHAR(255),
    rating INTEGER,
    feedback TEXT,
    status VARCHAR(50),
    summary TEXT,
    notes TEXT,
    total_volume_kg FLOAT DEFAULT 0,
    total_distance_km FLOAT DEFAULT 0,
    actual_duration_minutes INTEGER DEFAULT 0,
    calories_burned INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_schedules_client_date
ON schedules(client_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_schedules_program
ON schedules(program_id) WHERE program_id IS NOT NULL;

-- 10. Session Logs Table
CREATE TABLE IF NOT EXISTS session_logs (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER REFERENCES schedules(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id),
    exercise_name VARCHAR(255),
    category VARCHAR(100),
    muscle_groups TEXT[],
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    "order" INTEGER,
    section_name VARCHAR(255),
    section_order INTEGER DEFAULT 0,
    tracking_fields TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Session Log Sets Table
CREATE TABLE IF NOT EXISTS session_log_sets (
    id SERIAL PRIMARY KEY,
    session_log_id INTEGER REFERENCES session_logs(id) ON DELETE CASCADE,
    set_number INTEGER,
    planned_weight_kg FLOAT,
    planned_reps INTEGER,
    planned_rpe INTEGER,
    planned_distance FLOAT,
    planned_duration_seconds INTEGER,
    planned_pace VARCHAR(50),
    actual_weight_kg FLOAT,
    actual_reps INTEGER,
    actual_distance FLOAT,
    actual_pace VARCHAR(50),
    actual_rpe INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    rest_duration_seconds INTEGER,
    planned_metadata JSONB DEFAULT '{}'::JSONB,
    actual_metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Assignments Table
CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    client_id INTEGER REFERENCES clients(id),
    trainer_id INTEGER REFERENCES users(id),
    due_date TIMESTAMP,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 13. Client Metrics Table
CREATE TABLE IF NOT EXISTS client_metrics (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    date TIMESTAMP,
    type VARCHAR(50),
    value FLOAT,
    exercise_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_metrics_client_type_date
ON client_metrics(client_id, type, date DESC);

-- 14. Client Notes Table
CREATE TABLE IF NOT EXISTS client_notes (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. Calendar Notes Table
CREATE TABLE IF NOT EXISTS calendar_notes (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER REFERENCES users(id),
    date TIMESTAMP NOT NULL,
    type VARCHAR(50),
    title VARCHAR(255),
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. Client Active Programs
CREATE TABLE IF NOT EXISTS client_active_programs (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    current_week INTEGER DEFAULT 1,
    total_weeks INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'active'
        CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    completion_percentage FLOAT DEFAULT 0
        CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    initial_weight_kg FLOAT,
    target_weight_kg FLOAT,
    initial_body_fat FLOAT,
    target_body_fat FLOAT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_program_per_client_idx
ON client_active_programs(client_id)
WHERE status = 'active';

CREATE TRIGGER update_client_active_programs_updated_at
    BEFORE UPDATE ON client_active_programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_active_programs_client_status
    ON client_active_programs(client_id, status);

-- 17. Exercise History Summary (รวม Migration ไว้แล้ว พร้อม extended fields ทั้งหมด)
CREATE TABLE IF NOT EXISTS exercise_history_summary (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    schedule_id INTEGER REFERENCES schedules(id),
    exercise_id INTEGER REFERENCES exercises(id),
    exercise_name VARCHAR(255) NOT NULL,
    exercise_type VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    max_weight_kg FLOAT,
    total_reps INTEGER,
    total_sets INTEGER,
    total_volume_kg FLOAT,
    avg_rpe FLOAT,
    max_rpe INTEGER,
    total_distance_km FLOAT,
    total_duration_minutes INTEGER,
    total_calories INTEGER,
    is_bodyweight BOOLEAN,
    max_reps_per_set INTEGER,
    total_bodyweight_reps INTEGER,
    -- Extended tracking fields (รวม migration แล้ว)
    avg_speed FLOAT DEFAULT 0,
    avg_cadence FLOAT DEFAULT 0,
    avg_heart_rate FLOAT DEFAULT 0,
    avg_hr_zone FLOAT DEFAULT 0,
    avg_watts FLOAT DEFAULT 0,
    avg_rpm FLOAT DEFAULT 0,
    total_rounds INTEGER DEFAULT 0,
    max_one_rm FLOAT DEFAULT 0,
    avg_rir FLOAT DEFAULT 0,
    avg_rest_seconds FLOAT DEFAULT 0,
    total_distance_short FLOAT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_exercise_daily_summary
        UNIQUE(client_id, exercise_id, date)
);

CREATE INDEX IF NOT EXISTS idx_exercise_history_client_exercise_date
    ON exercise_history_summary(client_id, exercise_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_exercise_history_client_type_date
    ON exercise_history_summary(client_id, exercise_type, date DESC);

CREATE INDEX IF NOT EXISTS idx_exercise_history_client_name_date
    ON exercise_history_summary(client_id, exercise_name, date DESC);

-- 18. Client Streaks
CREATE TABLE IF NOT EXISTS client_streaks (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
    current_streak_days INTEGER DEFAULT 0,
    longest_streak_days INTEGER DEFAULT 0,
    last_workout_date DATE,
    total_workouts INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_client_streaks_updated_at
    BEFORE UPDATE ON client_streaks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- VIEWS
-- ==========================================

-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================

CREATE OR REPLACE FUNCTION calculate_workout_volume(
    p_schedule_id INTEGER
)
RETURNS FLOAT AS $$
DECLARE
    v_total_volume FLOAT := 0;
BEGIN
    SELECT COALESCE(SUM(
        sls.actual_weight_kg * sls.actual_reps
    ), 0) INTO v_total_volume
    FROM session_logs sl
    JOIN session_log_sets sls ON sls.session_log_id = sl.id
    WHERE sl.schedule_id = p_schedule_id
    AND sls.completed = TRUE;

    RETURN v_total_volume;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_exercise_history_summary(
    p_schedule_id INTEGER
)
RETURNS VOID AS $$
DECLARE
    v_client_id INTEGER;
    v_date DATE;
    v_record RECORD;
BEGIN
    SELECT client_id, DATE(start_time) INTO v_client_id, v_date
    FROM schedules
    WHERE id = p_schedule_id;

    FOR v_record IN (
        SELECT
            sl.exercise_id,
            sl.exercise_name,
            sl.category as exercise_type,
            MAX(NULLIF(COALESCE(sls.actual_weight_kg, sls.planned_weight_kg), 0)) as max_weight,
            SUM(NULLIF(COALESCE(sls.actual_reps, sls.planned_reps), 0)) as total_reps,
            COUNT(DISTINCT sls.set_number) as total_sets,
            SUM(sls.actual_weight_kg * sls.actual_reps) as total_volume,
            AVG(sls.actual_rpe) as avg_rpe,
            SUM(sls.actual_distance) as total_distance,
            MAX(sls.actual_reps) as max_reps,
            AVG(NULLIF((sls.actual_metadata->>'speed')::FLOAT, 0)) as avg_speed,
            AVG(NULLIF((sls.actual_metadata->>'cadence')::FLOAT, 0)) as avg_cadence,
            AVG(NULLIF((sls.actual_metadata->>'heart_rate')::FLOAT, 0)) as avg_heart_rate,
            AVG(NULLIF((sls.actual_metadata->>'hr_zone')::FLOAT, 0)) as avg_hr_zone,
            AVG(NULLIF((sls.actual_metadata->>'watts')::FLOAT, 0)) as avg_watts,
            AVG(NULLIF((sls.actual_metadata->>'rpm')::FLOAT, 0)) as avg_rpm,
            SUM(COALESCE((sls.actual_metadata->>'rounds')::INTEGER, 0)) as total_rounds,
            MAX(COALESCE((sls.actual_metadata->>'one_rm')::FLOAT, 0)) as max_one_rm,
            AVG(NULLIF((sls.actual_metadata->>'rir')::FLOAT, 0)) as avg_rir,
            AVG(NULLIF(sls.rest_duration_seconds::FLOAT, 0)) as avg_rest_seconds,
            SUM(COALESCE((sls.actual_metadata->>'distance_short')::FLOAT, 0)) as total_distance_short
        FROM session_logs sl
        JOIN session_log_sets sls ON sls.session_log_id = sl.id
        WHERE sl.schedule_id = p_schedule_id
        AND sls.completed = TRUE
        GROUP BY sl.exercise_id, sl.exercise_name, sl.category
    ) LOOP
        INSERT INTO exercise_history_summary (
            client_id, schedule_id, exercise_id, exercise_name, exercise_type, date,
            max_weight_kg, total_reps, total_sets, total_volume_kg, avg_rpe,
            total_distance_km, total_duration_minutes, total_calories,
            max_reps_per_set, total_bodyweight_reps,
            avg_speed, avg_cadence, avg_heart_rate, avg_hr_zone,
            avg_watts, avg_rpm, total_rounds, max_one_rm,
            avg_rir, avg_rest_seconds, total_distance_short
        ) VALUES (
            v_client_id, p_schedule_id, v_record.exercise_id, v_record.exercise_name,
            v_record.exercise_type, v_date,
            v_record.max_weight, v_record.total_reps, v_record.total_sets,
            v_record.total_volume, v_record.avg_rpe,
            v_record.total_distance,
            0, -- total_duration_minutes (removed from sets)
            0, -- total_calories (removed from sets)
            v_record.max_reps,
            CASE WHEN v_record.max_weight IS NULL THEN v_record.total_reps ELSE NULL END,
            COALESCE(v_record.avg_speed, 0),
            COALESCE(v_record.avg_cadence, 0),
            COALESCE(v_record.avg_heart_rate, 0),
            COALESCE(v_record.avg_hr_zone, 0),
            COALESCE(v_record.avg_watts, 0),
            COALESCE(v_record.avg_rpm, 0),
            COALESCE(v_record.total_rounds, 0),
            COALESCE(v_record.max_one_rm, 0),
            COALESCE(v_record.avg_rir, 0),
            COALESCE(v_record.avg_rest_seconds, 0),
            COALESCE(v_record.total_distance_short, 0)
        )
        ON CONFLICT (client_id, exercise_id, date)
        DO UPDATE SET
            max_weight_kg = EXCLUDED.max_weight_kg,
            total_reps = EXCLUDED.total_reps,
            total_sets = EXCLUDED.total_sets,
            total_volume_kg = EXCLUDED.total_volume_kg,
            avg_rpe = EXCLUDED.avg_rpe,
            total_distance_km = EXCLUDED.total_distance_km,
            total_duration_minutes = EXCLUDED.total_duration_minutes,
            total_calories = EXCLUDED.total_calories,
            max_reps_per_set = EXCLUDED.max_reps_per_set,
            total_bodyweight_reps = EXCLUDED.total_bodyweight_reps,
            avg_speed = EXCLUDED.avg_speed,
            avg_cadence = EXCLUDED.avg_cadence,
            avg_heart_rate = EXCLUDED.avg_heart_rate,
            avg_hr_zone = EXCLUDED.avg_hr_zone,
            avg_watts = EXCLUDED.avg_watts,
            avg_rpm = EXCLUDED.avg_rpm,
            total_rounds = EXCLUDED.total_rounds,
            max_one_rm = EXCLUDED.max_one_rm,
            avg_rir = EXCLUDED.avg_rir,
            avg_rest_seconds = EXCLUDED.avg_rest_seconds,
            total_distance_short = EXCLUDED.total_distance_short;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_client_streak(
    p_client_id INTEGER,
    p_workout_date DATE
)
RETURNS VOID AS $$
DECLARE
    v_streak RECORD;
    v_new_streak INTEGER;
BEGIN
    SELECT * INTO v_streak
    FROM client_streaks
    WHERE client_id = p_client_id;

    IF v_streak IS NULL THEN
        INSERT INTO client_streaks (client_id, current_streak_days, longest_streak_days, last_workout_date, total_workouts)
        VALUES (p_client_id, 1, 1, p_workout_date, 1);
        RETURN;
    END IF;

    IF v_streak.last_workout_date IS NULL THEN
        v_new_streak := 1;
    ELSIF p_workout_date = v_streak.last_workout_date THEN
        RETURN;
    ELSIF p_workout_date = v_streak.last_workout_date + 1 THEN
        v_new_streak := v_streak.current_streak_days + 1;
    ELSE
        v_new_streak := 1;
    END IF;

    UPDATE client_streaks
    SET
        current_streak_days = v_new_streak,
        longest_streak_days = GREATEST(v_streak.longest_streak_days, v_new_streak),
        last_workout_date = p_workout_date,
        total_workouts = v_streak.total_workouts + 1
    WHERE client_id = p_client_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_update_schedule_volume()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        NEW.total_volume_kg := calculate_workout_volume(NEW.id);
        PERFORM update_exercise_history_summary(NEW.id);
        PERFORM update_client_streak(NEW.client_id, DATE(NEW.start_time));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_schedule_volume ON schedules;
CREATE TRIGGER update_schedule_volume
    BEFORE UPDATE ON schedules
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION trigger_update_schedule_volume();

-- ==========================================
-- INSERT MOCK DATA
-- ==========================================

INSERT INTO users (name, username, email, password_hash, role, avatar_url, settings) VALUES
('Trainer One', 'trainer1', 'trainer@example.com', 'hashed_password', 'trainer', 'https://images.unsplash.com/photo-1594824476969-51c44d7eccca?w=150&h=150&fit=crop', '{"language": "en", "notifications": {"emailNotifications": true}}'::JSONB),
('Somchai Trainee', 'somchai', 'somchai@example.com', 'hashed_password', 'trainee', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', '{}'::JSONB),
('Malee Suayngam', 'malee', 'malee@example.com', 'hashed_password', 'trainee', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', '{}'::JSONB),
('Thanakorn Khaengkrang', 'thanakorn', 'thanakorn@example.com', 'hashed_password', 'trainee', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', '{}'::JSONB);

INSERT INTO trainers (user_id, avatar_url, bio, specialization) VALUES
(1, 'https://images.unsplash.com/photo-1594824476969-51c44d7eccca?w=150&h=150&fit=crop', 'Certified Personal Trainer with 5 years experience.', 'Strength & Conditioning');

INSERT INTO clients (
    trainer_id, user_id, name, email, phone_number, goal, status, avatar_url, birth_date, join_date, weight_kg, medical_conditions,
    fitness_level, preferred_workout_days, workout_frequency_per_week, notes
) VALUES
(1, 2, 'สมชาย ใจดี', 'somchai@example.com', '081-234-5678', 'ลดน้ำหนัก 5 กิโล', 'active', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', NULL, '2024-01-15', 75.0, 'มีปัญหาเข่าเล็กน้อย ต้องระวัง squat',
 'beginner', ARRAY['Monday', 'Wednesday', 'Friday'], 3, 'ชอบออกกำลังกายตอนเช้า'),
(1, 3, 'มาลี สวยงาม', 'malee@example.com', '082-345-6789', 'เพิ่มกล้ามเนื้อ', 'active', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', NULL, '2024-02-01', 55.0, 'มีประสบการณ์การออกกำลังกายมาบ้างแล้ว',
 'intermediate', ARRAY['Monday', 'Tuesday', 'Thursday', 'Saturday'], 4, 'เป้าหมายชัดเจน'),
(1, 4, 'ธนากร แข็งแรง', 'thanakorn@example.com', '083-456-7890', 'เพิ่มความแข็งแรง', 'paused', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', NULL, '2023-12-01', 80.0, 'พักชั่วคราวเนื่องจากงานยุ่ง',
 'advanced', ARRAY['Monday', 'Tuesday'], 2, 'งานยุ่งมาก');

INSERT INTO exercises
(name, modality, muscle_groups, movement_pattern, instructions, category, tracking_type, tracking_fields, calories_estimate)
VALUES
('Push Up', 'strength', ARRAY['Chest', 'Shoulders', 'Triceps'], 'Push', 'วางมือบนพื้นกว้างเท่าหัวไหล่ ลำตัวตรง ดันตัวขึ้นลง', 'weight-training', 'strength', ARRAY['Reps'], '50-100'),
('Dumbbell Shoulder Press', 'strength', ARRAY['Shoulders', 'Triceps'], 'Push (Vertical)', 'นั่งหลังตรง ถือดัมเบลระดับหู ดันขึ้นเหนือศีรษะ', 'weight-training', 'strength', ARRAY['Weight', 'Reps'], '90-130'),
('Incline Bench Press', 'strength', ARRAY['Chest (Upper)', 'Shoulders'], 'Push', 'นอนบนเบาะเอียง ดันบาร์เบลขึ้นเหนืออก', 'weight-training', 'strength', ARRAY['Weight', 'Reps'], '100-150'),
('Lateral Raise', 'strength', ARRAY['Shoulders (Side)'], 'Isolation', 'ยืนตรงถือดัมเบล กางแขนออกด้านข้างระดับไหล่', 'weight-training', 'strength', ARRAY['Weight', 'Reps'], '60-90'),
('Tricep Dips', 'strength', ARRAY['Triceps', 'Shoulders'], 'Push', 'ใช้มือยันเบาะหรือบาร์ หย่อนตัวลงจนศอกตั้งฉากแล้วดันขึ้น', 'weight-training', 'strength', ARRAY['Reps'], '60-100'),
('Tricep Extension', 'strength', ARRAY['Triceps'], 'Isolation', 'ถือดัมเบลเหนือศีรษะ งอศอกไปด้านหลังแล้วเหยียดขึ้น', 'weight-training', 'strength', ARRAY['Weight', 'Reps'], '50-80'),
('Pull Up', 'strength', ARRAY['Lats', 'Biceps'], 'Pull (Vertical)', 'โหนบาร์ ดึงตัวขึ้นจนคางพ้นบาร์', 'weight-training', 'strength', ARRAY['Reps'], '100-150'),
('Dumbbell Row', 'strength', ARRAY['Back', 'Biceps'], 'Pull', 'วางมือและเข่าบนเบาะ ดึงดัมเบลขึ้นหาระดับเอว', 'weight-training', 'strength', ARRAY['Weight', 'Reps'], '80-120'),
('Lat Pulldown', 'strength', ARRAY['Lats', 'Biceps'], 'Pull (Vertical)', 'นั่งดึงบาร์ลงมาหาหน้าอก', 'weight-training', 'strength', ARRAY['Weight', 'Reps'], '80-110'),
('Seated Cable Row', 'strength', ARRAY['Back', 'Rhomboids'], 'Pull', 'นั่งดึงเคเบิลเข้าหาลำตัว บีบสะบัก', 'weight-training', 'strength', ARRAY['Weight', 'Reps'], '80-110'),
('Bicep Curl', 'strength', ARRAY['Biceps'], 'Isolation', 'ยืนถือดัมเบล พับแขนขึ้นเกร็งหน้าแขน', 'weight-training', 'strength', ARRAY['Weight', 'Reps'], '60-90'),
('Face Pull', 'strength', ARRAY['Rear Delts', 'Rotator Cuff'], 'Pull', 'ดึงเชือกเข้าหาหน้าผาก กางศอกออก', 'weight-training', 'strength', ARRAY['Weight', 'Reps'], '50-80'),
('Goblet Squat', 'strength', ARRAY['Quads', 'Glutes'], 'Squat', 'ถือดัมเบลแนบอก ย่อตัวลงเหมือนนั่งเก้าอี้', 'weight-training', 'strength', ARRAY['Weight', 'Reps'], '100-140'),
('Dumbbell Lunge', 'strength', ARRAY['Quads', 'Glutes'], 'Lunge', 'ก้าวขาไปข้างหน้า ย่อตัวลงจนเข่าเกือบติดพื้น', 'weight-training', 'strength', ARRAY['Weight', 'Reps'], '90-130'),
('Leg Press', 'strength', ARRAY['Quads', 'Glutes'], 'Squat', 'นอนถีบเครื่องด้วยส้นเท้า', 'weight-training', 'strength', ARRAY['Weight', 'Reps'], '100-150'),
('Romanian Deadlift', 'strength', ARRAY['Hamstrings', 'Glutes', 'Lower Back'], 'Hinge', 'ถือบาร์เบล พับสะโพกไปด้านหลัง ขาตึงเล็กน้อย', 'weight-training', 'strength', ARRAY['Weight', 'Reps'], '110-160'),
('Leg Curl', 'strength', ARRAY['Hamstrings'], 'Isolation', 'นอนคว่ำหรือนั่ง พับขาเข้าหาตัวต้านน้ำหนัก', 'weight-training', 'strength', ARRAY['Weight', 'Reps'], '60-90'),
('Calf Raise', 'strength', ARRAY['Calves'], 'Isolation', 'ยืนเขย่งปลายเท้าขึ้นสุดลงสุด', 'weight-training', 'strength', ARRAY['Weight', 'Reps'], '40-70'),
('Plank', 'strength', ARRAY['Core'], 'Isometric', 'นอนคว่ำตั้งศอก เกร็งลำตัวให้ตรงค้างไว้', 'weight-training', 'time', ARRAY['Time'], '3-5/min'),
('Russian Twist', 'strength', ARRAY['Obliques', 'Core'], 'Rotation', 'นั่งยกขา บิดตัวซ้ายขวาถือลูกบอลหรือดัมเบล', 'weight-training', 'strength', ARRAY['Weight', 'Reps'], '50-80'),
('Barbell Squat', 'strength', ARRAY['Quadriceps', 'Glutes', 'Core'], 'Squat', 'ยืนกางขาเท่าไหล่ ค่อยๆ นั่งลงจนต้นขาขนานกับพื้น แล้วยืนขึ้น', 'weight-training', 'strength', ARRAY['Weight (น้ำหนัก)', 'Reps (จำนวนครั้ง)'], '100-150'),
('Bench Press', 'strength', ARRAY['Chest', 'Shoulders', 'Triceps'], 'Push', 'นอนบนเก้าอี้ ดันบาร์เบลขึ้นจากหน้าอกจนแขนตึง', 'weight-training', 'strength', ARRAY['Weight (น้ำหนัก)', 'Reps (จำนวนครั้ง)'], '80-120'),
('Deadlift', 'strength', ARRAY['Hamstrings', 'Glutes', 'Back'], 'Hinge', 'ยืนหลังตรง ค่อยๆ ก้มลงยกบาร์เบลขึ้นมา', 'weight-training', 'strength', ARRAY['Weight (น้ำหนัก)', 'Reps (จำนวนครั้ง)'], '120-180'),
('Jumping Jacks', 'cardio', ARRAY['Full Body'], 'Locomotion', 'กระโดดตบ แยกขาและมือพร้อมกัน', 'cardio', 'time', ARRAY['Time'], '8-12/min'),
('Burpees', 'cardio', ARRAY['Full Body'], 'Plyometric', 'ย่อตัว วิดพื้น แล้วกระโดดขึ้น', 'cardio', 'strength', ARRAY['Reps'], '10-15/min'),
('Mountain Climbers', 'cardio', ARRAY['Core', 'Shoulders'], 'Locomotion', 'ท่านวิดพื้น ดึงเข่าเข้าหาอกสลับซ้ายขวาเร็วๆ', 'cardio', 'time', ARRAY['Time'], '8-12/min'),
('High Knees', 'cardio', ARRAY['Legs', 'Core'], 'Locomotion', 'วิ่งอยู่กับที่ ยกเข่าสูงระดับเอว', 'cardio', 'time', ARRAY['Time'], '7-10/min'),
('Jump Rope', 'cardio', ARRAY['Calves', 'Shoulders'], 'Locomotion', 'กระโดดเชือกต่อเนื่อง', 'cardio', 'time', ARRAY['Time'], '10-16/min'),
('Butt Kicks', 'cardio', ARRAY['Hamstrings'], 'Locomotion', 'วิ่งอยู่กับที่ พับขาให้ส้นเท้าโดนก้น', 'cardio', 'time', ARRAY['Time'], '7-9/min'),
('Skaters', 'cardio', ARRAY['Glutes', 'Legs'], 'Plyometric', 'กระโดดสไลด์ไปด้านข้างสลับซ้ายขวา', 'cardio', 'time', ARRAY['Time'], '8-11/min'),
('Box Jumps', 'cardio', ARRAY['Legs'], 'Plyometric', 'กระโดดขึ้นกล่องด้วยความเร็ว', 'cardio', 'strength', ARRAY['Reps'], '10-14/min'),
('Battle Ropes', 'cardio', ARRAY['Shoulders', 'Core'], 'Upper Body Cardio', 'สะบัดเชือกหนักขึ้นลงต่อเนื่อง', 'cardio', 'time', ARRAY['Time'], '10-15/min'),
('Shadow Boxing', 'cardio', ARRAY['Shoulders', 'Core'], 'Locomotion', 'ชกลมสลับหมัด เคลื่อนไหวเท้าตลอดเวลา', 'cardio', 'time', ARRAY['Time'], '7-10/min'),
('Step Ups', 'cardio', ARRAY['Legs'], 'Locomotion', 'ก้าวขึ้นลงบันไดหรือกล่องด้วยความเร็ว', 'cardio', 'time', ARRAY['Time'], '6-9/min'),
('Cycling (Stationary)', 'cardio', ARRAY['Legs'], 'Locomotion', 'ปั่นจักรยานฟิตเนส', 'cardio', 'distance', ARRAY['Distance', 'Time'], '300-500/hr'),
('Elliptical', 'cardio', ARRAY['Full Body'], 'Locomotion', 'เดินวงรีบนเครื่องลดแรงกระแทก', 'cardio', 'distance', ARRAY['Distance', 'Time'], '300-450/hr'),
('Rowing Machine', 'cardio', ARRAY['Back', 'Legs'], 'Pull', 'ดึงเครื่องกรรเชียงบก', 'cardio', 'distance', ARRAY['Distance', 'Time'], '400-600/hr'),
('Stair Climber', 'cardio', ARRAY['Glutes', 'Calves'], 'Locomotion', 'เดินขึ้นบันไดต่อเนื่องบนเครื่อง', 'cardio', 'time', ARRAY['Time'], '400-500/hr'),
('Swimming', 'cardio', ARRAY['Full Body'], 'Locomotion', 'ว่ายน้ำท่าฟรีสไตล์หรือท่าอื่นๆ', 'cardio', 'distance', ARRAY['Distance', 'Time'], '400-600/hr'),
('Walking (Brisk)', 'cardio', ARRAY['Legs'], 'Locomotion', 'เดินเร็วต่อเนื่อง', 'cardio', 'distance', ARRAY['Distance', 'Time'], '200-300/hr'),
('Jogging', 'cardio', ARRAY['Legs'], 'Locomotion', 'วิ่งเหยาะๆ', 'cardio', 'distance', ARRAY['Distance', 'Time'], '300-400/hr'),
('Sprinting', 'cardio', ARRAY['Legs'], 'Locomotion', 'วิ่งเต็มสปีดระยะสั้น', 'cardio', 'distance', ARRAY['Distance', 'Time'], '500+/hr'),
('Hiking', 'cardio', ARRAY['Legs'], 'Locomotion', 'เดินป่าหรือเดินขึ้นทางชัน', 'cardio', 'time', ARRAY['Time'], '300-400/hr'),
('Treadmill Running', 'cardio', ARRAY['Legs', 'Core'], 'Locomotion', 'วิ่งบนลู่วิ่งด้วยความเร็วและระยะเวลาที่กำหนด', 'cardio', 'distance_long', ARRAY['Distance-Long', 'Time'], '200-300'),
('Hamstring Stretch', 'flexibility', ARRAY['Hamstrings'], 'Stretch', 'ยืนหรือนั่ง ก้มตัวแตะปลายเท้า ขาตึง', 'flexibility', 'time', ARRAY['Time'], '10-20'),
('Quad Stretch', 'flexibility', ARRAY['Quadriceps'], 'Stretch', 'ยืนพับขาไปด้านหลัง ใช้มือจับข้อเท้าดึงเข้าหาก้น', 'flexibility', 'time', ARRAY['Time'], '10-20'),
('Calf Stretch', 'flexibility', ARRAY['Calves'], 'Stretch', 'ดันผนัง ก้าวขาไปด้านหลังให้ส้นเท้าติดพื้น', 'flexibility', 'time', ARRAY['Time'], '10-20'),
('Chest Stretch', 'flexibility', ARRAY['Chest'], 'Stretch', 'ประสานมือด้านหลังแล้วยืดอก หรือใช้แขนยันกรอบประตู', 'flexibility', 'time', ARRAY['Time'], '10-20'),
('Tricep Stretch', 'flexibility', ARRAY['Triceps'], 'Stretch', 'ยกแขนขึ้นงอศอกไปด้านหลังศีรษะ ใช้มืออีกข้างกดศอกลง', 'flexibility', 'time', ARRAY['Time'], '10-20'),
('Shoulder Stretch', 'flexibility', ARRAY['Shoulders'], 'Stretch', 'พาดแขนผ่านหน้าอก ใช้แขนอีกข้างล็อคแล้วดึง', 'flexibility', 'time', ARRAY['Time'], '10-20'),
('Butterfly Stretch', 'flexibility', ARRAY['Hips', 'Inner Thighs'], 'Stretch', 'นั่งฝ่าเท้าประกบกัน ดึงส้นเท้าเข้าหาตัว กดเข่าลง', 'flexibility', 'time', ARRAY['Time'], '10-20'),
('Cat-Cow Stretch', 'flexibility', ARRAY['Back', 'Core'], 'Mobility', 'คุกเข่าโก่งหลังขึ้นและแอ่นหลังลงสลับกัน', 'flexibility', 'time', ARRAY['Time'], '20-30'),
('Child''s Pose', 'flexibility', ARRAY['Back', 'Hips'], 'Stretch', 'นั่งทับส้นเท้า ก้มตัวยืดแขนไปด้านหน้าจนหน้าผากแตะพื้น', 'flexibility', 'time', ARRAY['Time'], '10-20'),
('Cobra Stretch', 'flexibility', ARRAY['Abs', 'Lower Back'], 'Stretch', 'นอนคว่ำ ดันตัวท่อนบนขึ้น แหงนหน้ามองเพดาน', 'flexibility', 'time', ARRAY['Time'], '10-20'),
('Hip Flexor Stretch', 'flexibility', ARRAY['Hip Flexors'], 'Stretch', 'นั่งท่า Lunge ดันสะโพกไปด้านหน้า ลำตัวตรง', 'flexibility', 'time', ARRAY['Time'], '10-20'),
('Glute Stretch (Figure 4)', 'flexibility', ARRAY['Glutes'], 'Stretch', 'นอนหงาย ไขว่ห้างเป็นเลข 4 สอดมือดึงขาเข้าหาตัว', 'flexibility', 'time', ARRAY['Time'], '10-20'),
('Neck Tilt', 'flexibility', ARRAY['Neck'], 'Stretch', 'เอียงคอไปด้านข้าง ใช้มือช่วยกดเบาๆ', 'flexibility', 'time', ARRAY['Time'], '10-20'),
('Seated Forward Bend', 'flexibility', ARRAY['Hamstrings', 'Back'], 'Stretch', 'นั่งเหยียดขาตรง ก้มตัวไปด้านหน้า', 'flexibility', 'time', ARRAY['Time'], '10-20'),
('Downward Dog', 'flexibility', ARRAY['Full Body', 'Calves'], 'Stretch', 'ทำตัวเป็นรูปตัว V คว่ำ ดันสะโพกขึ้น กดส้นเท้าลง', 'flexibility', 'time', ARRAY['Time'], '20-30'),
('Pigeon Pose', 'flexibility', ARRAY['Hips', 'Glutes'], 'Stretch', 'ท่านกพิราบ พับขาหน้า เหยียดขาหลัง ยืดสะโพก', 'flexibility', 'time', ARRAY['Time'], '20-30'),
('Spinal Twist', 'flexibility', ARRAY['Back'], 'Rotation', 'นอนหงาย พับเข่าบิดตัวไปด้านข้าง แขนกางออก', 'flexibility', 'time', ARRAY['Time'], '10-20'),
('Lunge with Twist', 'flexibility', ARRAY['Hips', 'Core'], 'Mobility', 'ก้าวขา Lunge แล้วบิดตัวไปทางขาหน้า', 'flexibility', 'time', ARRAY['Time'], '15-25'),
('Wrist Stretch', 'flexibility', ARRAY['Forearms'], 'Stretch', 'เหยียดแขน ดัดฝ่ามือเข้าหาตัว', 'flexibility', 'time', ARRAY['Time'], '10-15'),
('Side Bend', 'flexibility', ARRAY['Obliques', 'Lats'], 'Stretch', 'ยืนตรง ชูมือขึ้น เอียงตัวไปด้านข้าง', 'flexibility', 'time', ARRAY['Time'], '10-20');

-- Safety Migration: ใช้ modality เป็นตัวกำหนด category (รองรับทั้งภาษาอังกฤษและไทย)
UPDATE exercises SET category = 'weight-training' WHERE modality = 'strength' OR modality LIKE '%Strength%' OR modality LIKE '%เสริมแรง%';
UPDATE exercises SET category = 'cardio' WHERE modality = 'cardio' OR modality LIKE '%Cardio%' OR modality LIKE '%คาร์ดิโอ%';
UPDATE exercises SET category = 'flexibility' WHERE modality = 'flexibility' OR modality LIKE '%Flexibility%' OR modality LIKE '%ยืดหยุ่น%';

INSERT INTO programs (
    name, description, duration_weeks, days_per_week, trainer_id, client_id, created_at,
    status, start_date, end_date, current_week, total_weeks, target_description
) VALUES
('โปรแกรมลดน้ำหนัก 8 สัปดาห์', 'โปรแกรมสำหรับผู้เริ่มต้น เน้นการลดน้ำหนักและสร้างพื้นฐาน', 8, 3, 1, 1, '2024-01-01',
 'active', '2024-01-15', '2024-03-10', 4, 8, 'เป้าหมาย: ลดน้ำหนัก 5 กิโล, ลด Body Fat 3%, เพิ่มความแข็งแรง'),
('โปรแกรมเพิ่มกล้ามเนื้อ 12 สัปดาห์', 'โปรแกรมสำหรับการเพิ่มกล้ามเนื้อและความแข็งแรง', 12, 4, 1, 2, '2024-02-01',
 'active', '2024-02-01', '2024-04-24', 4, 12, 'เป้าหมาย: เพิ่มกล้ามเนื้อ 3-5 กิโล, เพิ่มขนาดแขน 2 ซม.');

INSERT INTO program_days (program_id, week_number, day_number, name) VALUES
(1, 1, 1, 'Upper Body'),
(2, 1, 1, 'Push Day');

INSERT INTO program_sections (program_day_id, type, format, name, duration_seconds, "order") VALUES
(1, 'main', 'straight-sets', 'Main Workout', 3600, 1),
(2, 'main', 'straight-sets', 'Main Workout', 3600, 1);

INSERT INTO program_exercises (
    program_section_id, exercise_id, sets,
    reps, weight, duration, rest, rpe,
    rest_seconds, notes, "order"
) VALUES
(1, 2, 3, '[12, 12, 12]'::jsonb, '[20, 20, 20]'::jsonb, '[0, 0, 0]'::jsonb, '[60, 60, 60]'::jsonb, '[8, 8, 8]'::jsonb, 60.0, 'เน้นท่าถูกต้อง', 1),
(2, 2, 4, '[8, 8, 8, 8]'::jsonb, '[25, 25, 25, 25]'::jsonb, '[0, 0, 0, 0]'::jsonb, '[90, 90, 90, 90]'::jsonb, '[9, 9, 9, 9]'::jsonb, 90.0, 'Progressive overload', 1);

INSERT INTO schedules (
    title, trainer_id, client_id, program_id,
    start_time, end_time, status,
    total_volume_kg, total_distance_km, actual_duration_minutes,
    calories_burned
) VALUES
('Session with Somchai', 1, 1, 1, '2024-09-24 10:00:00', '2024-09-24 11:00:00', 'scheduled', 0, 0, 0, 0),
('Week 1 - Upper Body', 1, 1, 1, '2024-01-18 10:00:00', '2024-01-18 11:00:00', 'completed', 2800, 0, 60, 350),
('Week 1 - Cardio', 1, 1, 1, '2024-01-20 10:00:00', '2024-01-20 10:45:00', 'completed', 0, 3.5, 45, 280),
('Week 2 - Upper Body', 1, 1, 1, '2024-01-25 10:00:00', '2024-01-25 11:05:00', 'completed', 3000, 0, 65, 370),
('Week 2 - Cardio', 1, 1, 1, '2024-01-27 10:00:00', '2024-01-27 10:50:00', 'completed', 0, 4.0, 50, 320),
('Week 3 - Upper Body', 1, 1, 1, '2024-02-02 10:00:00', '2024-02-02 11:10:00', 'completed', 3200, 0, 70, 390),
('Week 3 - Cardio', 1, 1, 1, '2024-02-03 10:00:00', '2024-02-03 11:00:00', 'completed', 0, 4.5, 60, 360),
('Week 4 - Upper Body', 1, 1, 1, '2024-02-09 10:00:00', '2024-02-09 11:15:00', 'completed', 3400, 0, 75, 410);

INSERT INTO session_logs (schedule_id, exercise_id, notes, status, "order") VALUES
(2, 1, 'Squat performance', 'completed', 1);

INSERT INTO session_log_sets (session_log_id, set_number, planned_weight_kg, planned_reps, actual_weight_kg, actual_reps, actual_rpe, completed) VALUES
(1, 1, 40, 15, 40, 15, 7, TRUE),
(1, 2, 40, 12, 40, 12, 8, TRUE),
(1, 3, 40, 10, 40, 10, 9, TRUE);

INSERT INTO client_active_programs (
    client_id, program_id,
    start_date, end_date,
    current_week, total_weeks,
    status, completion_percentage,
    initial_weight_kg, target_weight_kg,
    initial_body_fat, target_body_fat
) VALUES
(1, 1, '2024-01-15', '2024-03-10', 4, 8, 'active', 50.0, 80.0, 75.0, 25.0, 22.0),
(2, 2, '2024-02-01', '2024-04-24', 4, 12, 'active', 33.3, 55.0, 58.0, NULL, NULL);

INSERT INTO client_streaks (client_id, current_streak_days, longest_streak_days, last_workout_date, total_workouts)
VALUES
(1, 3, 5, '2024-02-10', 8),
(2, 2, 4, '2024-02-09', 6);

INSERT INTO client_metrics (client_id, date, type, value, exercise_name, notes) VALUES
(1, '2024-01-15', 'weight', 80.0, NULL, 'ค่าเริ่มต้น'),
(1, '2024-01-15', 'height', 175.0, NULL, NULL),
(1, '2024-01-15', 'bmi', 26.1, NULL, NULL),
(1, '2024-01-15', 'body_fat', 25.0, NULL, NULL),
(1, '2024-01-15', 'muscle', 40.0, NULL, NULL),
(1, '2024-01-22', 'weight', 79.5, NULL, 'หลังเทรน 1 สัปดาห์'),
(1, '2024-01-29', 'weight', 79.0, NULL, NULL),
(1, '2024-02-05', 'weight', 78.5, NULL, NULL),
(1, '2024-02-12', 'weight', 78.0, NULL, NULL),
(1, '2024-02-19', 'weight', 77.5, NULL, NULL),
(1, '2024-01-22', 'body_fat', 24.5, NULL, NULL),
(1, '2024-01-29', 'body_fat', 24.0, NULL, NULL),
(1, '2024-02-05', 'body_fat', 23.5, NULL, NULL),
(1, '2024-02-12', 'body_fat', 23.0, NULL, NULL),
(1, '2024-02-19', 'body_fat', 22.5, NULL, 'ลดลงดีมาก!'),
(1, '2024-01-18', 'one_rm', 70.0, 'Barbell Squat', 'ทดสอบครั้งแรก'),
(1, '2024-01-25', 'one_rm', 75.0, 'Barbell Squat', NULL),
(1, '2024-02-02', 'one_rm', 80.0, 'Barbell Squat', NULL),
(1, '2024-02-09', 'one_rm', 85.0, 'Barbell Squat', 'ฟอร์มดีขึ้นมาก'),
(1, '2024-02-16', 'one_rm', 90.0, 'Barbell Squat', NULL);

INSERT INTO client_notes (client_id, content, type, created_by) VALUES
(1, 'มีปัญหาเข่าเล็กน้อย ต้องระวัง squat', 'general', 'Trainer One'),
(2, 'มีประสบการณ์การออกกำลังกายมาบ้างแล้ว', 'general', 'Trainer One'),
(3, 'พักชั่วคราวเนื่องจากงานยุ่ง', 'general', 'Trainer One');

-- ==========================================
-- Populate history & volume for completed sessions
-- ==========================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM schedules WHERE status = 'completed' LOOP
        PERFORM update_exercise_history_summary(r.id);

        UPDATE schedules
        SET total_volume_kg = calculate_workout_volume(id)
        WHERE id = r.id;

        RAISE NOTICE 'Updated summary for schedule %', r.id;
    END LOOP;
END $$;