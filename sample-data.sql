-- ============================================================================
-- AI-Driven Sports Turf Booking Platform: Sample Data Script
-- Includes sample records for all tables, complete with 1536-dimensional
-- mock vector embeddings for semantic vector search demo.
-- ============================================================================

-- Ensure pgvector extension is available
CREATE EXTENSION IF NOT EXISTS vector;

-- Clear any existing sample data in reverse dependency order
TRUNCATE TABLE document_embeddings CASCADE;
TRUNCATE TABLE documents CASCADE;
TRUNCATE TABLE chat_history CASCADE;
TRUNCATE TABLE reviews CASCADE;
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE bookings CASCADE;
TRUNCATE TABLE turfs CASCADE;
TRUNCATE TABLE districts CASCADE;
TRUNCATE TABLE admins CASCADE;
TRUNCATE TABLE users CASCADE;

-- 1. SEED USERS (Passwords are hashed representations)
INSERT INTO users (id, full_name, email, password, role, refresh_token, created_at, updated_at) VALUES
(1, 'Alex Morgan', 'alex@example.com', '$2a$10$Y5nCjby8Yv6Fv6Yv6Yv6Yu9pZ4vGqgVfA0S0fS0fS0fS0fS0fS0fS', 'ROLE_USER', 'rf_token_alex_123', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
(2, 'Marcus Rashford', 'marcus@example.com', '$2a$10$Y5nCjby8Yv6Fv6Yv6Yv6Yu9pZ4vGqgVfA0S0fS0fS0fS0fS0fS0fS', 'ROLE_USER', 'rf_token_marcus_456', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),
(3, 'Serena Williams', 'serena@example.com', '$2a$10$Y5nCjby8Yv6Fv6Yv6Yv6Yu9pZ4vGqgVfA0S0fS0fS0fS0fS0fS0fS', 'ROLE_USER', 'rf_token_serena_789', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
(4, 'Admin David', 'david.admin@example.com', '$2a$10$Y5nCjby8Yv6Fv6Yv6Yv6Yu9pZ4vGqgVfA0S0fS0fS0fS0fS0fS0fS', 'ROLE_ADMIN', 'rf_token_david_000', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
(5, 'Admin Sarah', 'sarah.admin@example.com', '$2a$10$Y5nCjby8Yv6Fv6Yv6Yv6Yu9pZ4vGqgVfA0S0fS0fS0fS0fS0fS0fS', 'ROLE_ADMIN', 'rf_token_sarah_111', NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days');

-- Reset users primary key sequence to start after pre-seeded IDs
ALTER SEQUENCE users_id_seq RESTART WITH 6;

-- 2. SEED ADMINS
INSERT INTO admins (id, user_id, department, access_level, created_at) VALUES
(1, 4, 'Operations Management', 3, NOW() - INTERVAL '30 days'),
(2, 5, 'Customer Relations', 2, NOW() - INTERVAL '28 days');

ALTER SEQUENCE admins_id_seq RESTART WITH 3;

-- Helper function to generate an easy mock vector of size 1536
-- All elements are 0.0 except the index, which provides unique semantic clusters
CREATE OR REPLACE FUNCTION generate_mock_vector(seed_val float) 
RETURNS vector AS $$
DECLARE
    arr float[];
    i int;
BEGIN
    arr := array_fill(0.0, ARRAY[1536]);
    -- populate some unique floats based on the seed value
    FOR i IN 1..50 LOOP
        arr[i] := seed_val * (1.0 / i::float);
    END LOOP;
    RETURN arr::vector;
END;
$$ LANGUAGE plpgsql;

-- 2.5. SEED DISTRICTS (All 38 Districts of Tamil Nadu, India)
INSERT INTO districts (id, name, latitude, longitude) VALUES
(1, 'Chennai', 13.0827, 80.2707),
(2, 'Coimbatore', 11.0168, 76.9558),
(3, 'Madurai', 9.9252, 78.1198),
(4, 'Tiruchirappalli', 10.7905, 78.7047),
(5, 'Salem', 11.6643, 78.1460),
(6, 'Tirunelveli', 8.7139, 77.7567),
(7, 'Erode', 11.3410, 77.7172),
(8, 'Vellore', 12.9165, 79.1325),
(9, 'Thoothukudi', 8.7642, 78.1348),
(10, 'Thanjavur', 10.7870, 79.1378),
(11, 'Dindigul', 10.3673, 77.9803),
(12, 'Ranipet', 12.9274, 79.3328),
(13, 'Tirupattur', 12.4934, 78.5678),
(14, 'Tenkasi', 8.9591, 77.3145),
(15, 'Chengalpattu', 12.6841, 79.9836),
(16, 'Kallakurichi', 11.7380, 78.9639),
(17, 'Tiruppur', 11.1085, 77.3411),
(18, 'Kanchipuram', 12.8342, 79.7036),
(19, 'Tiruvallur', 13.1384, 79.9079),
(20, 'Tiruvannamalai', 12.2253, 79.0747),
(21, 'Krishnagiri', 12.5186, 78.2137),
(22, 'Dharmapuri', 12.1211, 78.1582),
(23, 'Namakkal', 11.2189, 78.1674),
(24, 'Karur', 10.9601, 78.0766),
(25, 'The Nilgiris', 11.4102, 76.6950),
(26, 'Theni', 10.0104, 77.4768),
(27, 'Virudhunagar', 9.5680, 77.9624),
(28, 'Ramanathapuram', 9.3639, 78.8395),
(29, 'Sivaganga', 9.8433, 78.4809),
(30, 'Pudukkottai', 10.3797, 78.8208),
(31, 'Nagapattinam', 10.7656, 79.8424),
(32, 'Tiruvarur', 10.7711, 79.6413),
(33, 'Mayiladuthurai', 11.1018, 79.6522),
(34, 'Cuddalore', 11.7480, 79.7680),
(35, 'Viluppuram', 11.9401, 79.4861),
(36, 'Ariyalur', 11.1401, 79.0747),
(37, 'Perambalur', 11.2342, 78.8820),
(38, 'Kanyakumari', 8.0883, 77.5385);

ALTER SEQUENCE districts_id_seq RESTART WITH 39;

-- 3. SEED TURFS (With descriptions and vector embeddings of 1536 dimensions)
INSERT INTO turfs (id, district_id, name, location, address, latitude, longitude, sports_type, description, price_per_hour, availability, is_active, description_embedding, created_at, updated_at) VALUES
(1, 1, 'Nungambakkam Sports Arena', 'Chennai Central, TN', '12 College Rd, Nungambakkam, Chennai, Tamil Nadu 600006', 13.0620, 80.2450, 'FOOTBALL', 'Indoor FIFA-approved premium 5-a-side and 7-a-side football field with professional astroturf, powerful LED floodlights, state-of-the-art locker rooms, and spectator seating.', 120.00, 'AVAILABLE', TRUE, generate_mock_vector(0.85), NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
(2, 2, 'Kovai Cricket Grounds', 'Gandhipuram, Coimbatore, TN', '45 Cross Cut Rd, Gandhipuram, Coimbatore, Tamil Nadu 641012', 11.0185, 76.9642, 'CRICKET', 'Full-sized outdoor turf pitch with specialized grass for spin and bounce. Equipped with practice nets, bowling machine hire, and electronic scoreboard.', 150.00, 'AVAILABLE', TRUE, generate_mock_vector(0.42), NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),
(3, 1, 'Adyar Tennis Club', 'Adyar, Chennai, TN', '88 Sardar Patel Rd, Adyar, Chennai, Tamil Nadu 600020', 13.0012, 80.2565, 'TENNIS', 'Professional indoor hard-court tournament tennis venue. Equipped with accurate court heating, electronic baseline line-calling cameras, and high-quality tennis ball hoppers.', 45.00, 'AVAILABLE', TRUE, generate_mock_vector(0.19), NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
(4, 2, 'Peelamedu Futsal Hub', 'Peelamedu, Coimbatore, TN', 'Avinashi Rd, Peelamedu, Coimbatore, Tamil Nadu 641004', 11.0265, 77.0210, 'FOOTBALL', 'Fast-paced indoor 5-a-side futsal court with shock-absorbing hardwood flooring, premium rebound boards, and mini goals. Ideal for intense training drills.', 80.00, 'LIMITED_SLOTS', TRUE, generate_mock_vector(0.78), NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),
(5, 24, 'Karur Sports Arena', 'Karur Bypass Rd, TN', '102 Karur Bypass Rd, Karur, Tamil Nadu 639002', 10.9650, 78.0820, 'FOOTBALL', 'Premium 7-a-side football turf in Karur. Fully equipped with night lighting, standard turf blades, and highly durable rubber infill. Great for local tournaments.', 90.00, 'AVAILABLE', TRUE, generate_mock_vector(0.82), NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
(6, 3, 'Madurai Cricket Nets', 'Anna Nagar, Madurai, TN', '14 Anna Nagar Main Rd, Madurai, Tamil Nadu 625020', 9.9280, 78.1310, 'CRICKET', 'Excellent practice pitches for cricket enthusiasts in Madurai. Features professional synthetic and clay wickets with modern bowling machine setups.', 100.00, 'AVAILABLE', TRUE, generate_mock_vector(0.39), NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
(7, 4, 'Rockfort Soccer Ground', 'Cantonment, Trichy, TN', '25 Promenade Rd, Cantonment, Tiruchirappalli, Tamil Nadu 620001', 10.8010, 78.6890, 'FOOTBALL', 'A spacious football arena right at the heart of Trichy. Premium shock pad and professional quality fibers to protect joints and provide excellent ball roll.', 110.00, 'LIMITED_SLOTS', TRUE, generate_mock_vector(0.74), NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
(8, 5, 'Salem Indoor Badminton & Tennis', 'Meyyanur, Salem, TN', '56 Junction Rd, Meyyanur, Salem, Tamil Nadu 636004', 11.6690, 78.1320, 'TENNIS', 'Highly rated tennis and multi-sport indoor courts in Salem. Offers high-quality rubberized court surfaces and professional training accessories.', 60.00, 'AVAILABLE', TRUE, generate_mock_vector(0.22), NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days');

ALTER SEQUENCE turfs_id_seq RESTART WITH 9;

-- 4. SEED BOOKINGS
INSERT INTO bookings (id, turf_id, user_id, start_time, end_time, total_price, status, created_at, updated_at) VALUES
(1, 1, 1, '2026-07-05 18:00:00', '2026-07-05 20:00:00', 240.00, 'CONFIRMED', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
(2, 2, 2, '2026-07-06 09:00:00', '2026-07-06 12:00:00', 450.00, 'CONFIRMED', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
(3, 3, 3, '2026-07-07 15:00:00', '2026-07-07 16:30:00', 67.50, 'PENDING', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(4, 1, 2, '2026-07-08 20:00:00', '2026-07-08 21:00:00', 120.00, 'CANCELLED', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours');

ALTER SEQUENCE bookings_id_seq RESTART WITH 5;

-- 5. SEED PAYMENTS
INSERT INTO payments (id, booking_id, user_id, amount, payment_method, transaction_id, status, created_at) VALUES
(1, 1, 1, 240.00, 'STRIPE', 'ch_stripe_9a2b8c7d6e', 'COMPLETED', NOW() - INTERVAL '3 days'),
(2, 2, 2, 450.00, 'UPI', 'upi_pay_883011928374', 'COMPLETED', NOW() - INTERVAL '2 days'),
(3, 3, 3, 67.50, 'CREDIT_CARD', NULL, 'PENDING', NOW() - INTERVAL '1 day'),
(4, 4, 2, 120.00, 'STRIPE', 'ch_stripe_1a2b3c4d5e', 'REFUNDED', NOW() - INTERVAL '11 hours');

ALTER SEQUENCE payments_id_seq RESTART WITH 5;

-- 6. SEED REVIEWS
INSERT INTO reviews (id, turf_id, user_id, rating, comment, created_at) VALUES
(1, 1, 1, 5, 'Absolutely outstanding indoor football turf. The astroturf feels like natural grass and the lighting is perfect for late evening matches!', NOW() - INTERVAL '2 days'),
(2, 2, 2, 4, 'Very well-maintained pitch for cricket. The practice nets were extremely helpful. Deducting one star because canteen facilities are limited.', NOW() - INTERVAL '1 day'),
(3, 1, 3, 5, 'Clean, spacious, and very easy parking access. We held a local friendly match here and everyone loved the facilities.', NOW() - INTERVAL '12 hours');

ALTER SEQUENCE reviews_id_seq RESTART WITH 4;

-- 7. SEED CHAT HISTORY (Enabling context for our scheduling assistant)
INSERT INTO chat_history (id, user_id, session_id, sender, message, created_at) VALUES
(1, 1, 'session_alex_001', 'USER', 'Hi! I am looking for an indoor soccer court around Seattle this Sunday evening.', NOW() - INTERVAL '1 hour'),
(2, 1, 'session_alex_001', 'AI', 'Hello Alex! I found Starfire Arena Turf A which matches your indoor search perfectly. They have open slots on Sunday (July 5th) from 6:00 PM to 8:00 PM at $120/hr. Would you like to reserve it?', NOW() - INTERVAL '58 minutes'),
(3, 1, 'session_alex_001', 'USER', 'Yes, please book that slot for me.', NOW() - INTERVAL '55 minutes'),
(4, 1, 'session_alex_001', 'AI', 'Excellent choice! I have reserved Starfire Arena Turf A for you. Your payment of $240 has been processed securely via Stripe. Enjoy your game!', NOW() - INTERVAL '54 minutes');

ALTER SEQUENCE chat_history_id_seq RESTART WITH 5;

-- 8. SEED DOCUMENTS
INSERT INTO documents (id, title, content, category, created_at) VALUES
(1, 'General Platform Rules & Regulations', 'All players must wear non-marking sports shoes. Cleats are allowed only on natural turf. Food and soft drinks are prohibited on the play area. Cancel at least 24 hours in advance to secure a full refund.', 'RULES', NOW() - INTERVAL '10 days'),
(2, 'Slot Allocation Policy & Overlap Management', 'Slots are allocated on a first-come, first-served basis. AI scheduler holds pending slots for 10 minutes. If multiple reservations collide, the user with a pre-validated payment method takes immediate precedence.', 'SLOT_POLICIES', NOW() - INTERVAL '10 days');

ALTER SEQUENCE documents_id_seq RESTART WITH 3;

-- 9. SEED DOCUMENT EMBEDDINGS (Chunks of policies for RAG integration)
INSERT INTO document_embeddings (id, document_id, chunk_content, embedding, created_at) VALUES
(1, 1, 'All players must wear non-marking sports shoes. Cleats are allowed only on natural turf.', generate_mock_vector(0.91), NOW() - INTERVAL '10 days'),
(2, 1, 'Food and soft drinks are prohibited on the play area. Cancel at least 24 hours in advance to secure a full refund.', generate_mock_vector(0.89), NOW() - INTERVAL '10 days'),
(3, 2, 'Slots are allocated on a first-come, first-served basis. AI scheduler holds pending slots for 10 minutes.', generate_mock_vector(0.75), NOW() - INTERVAL '10 days'),
(4, 2, 'If multiple reservations collide, the user with a pre-validated payment method takes immediate precedence.', generate_mock_vector(0.72), NOW() - INTERVAL '10 days');

ALTER SEQUENCE document_embeddings_id_seq RESTART WITH 5;

-- Cleanup Helper function to avoid namespace pollution
DROP FUNCTION IF EXISTS generate_mock_vector(float);

-- ============================================================================
-- Seeding completed successfully.
-- ============================================================================
