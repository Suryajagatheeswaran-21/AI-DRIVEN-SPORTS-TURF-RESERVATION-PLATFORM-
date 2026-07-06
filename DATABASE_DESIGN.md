# Enterprise Sports Turf Booking Platform: Database Design Document

This document defines the physical schema, relationships, vector operations, and index configurations of our PostgreSQL database, designed to operate alongside our Spring Boot + Spring Security architecture.

---

## 1. Entity-Relationship (ER) Diagram

```text
       +------------------+
       |      USERS       |
       +------------------+
       | PK  id           |<-------------+
       |     full_name    |              |
       |     email (UQ)   |              |
       |     password     |              |
       |     role         |              |
       |     refresh_token|              |
       +------------------+              |
                 |                       |
                 | (1)                   | (1)
                 |                       |
                 v (0..1)                |
       +------------------+              |
       |      ADMINS      |              |
       +------------------+              |
       | PK  id           |              |
       | FK  user_id (UQ) |              |
       |     department   |              |
       |     access_level |              |
       +------------------+              |
                                         |
                 +-----------------------+--------+
                 | (1)                            | (1)
                 |                                |
                 v (0..*)                         v (0..*)
       +------------------+             +-------------------+
       |     BOOKINGS     |             |   CHAT_HISTORY    |
       +------------------+             +-------------------+
       | PK  id           |             | PK  id            |
       | FK  turf_id      |             | FK  user_id (Null)|
       | FK  user_id      |<----+       |     session_id    |
       |     start_time   |     |       |     sender        |
       |     end_time     |     |       |     message       |
       |     total_price  |     |       +-------------------+
       |     status       |     |
       +------------------+     |
                 |              |
                 | (1)          |
                 |              |
                 v (0..1)       | (1)
       +------------------+     |
       |     PAYMENTS     |     |
       +------------------+     |
       | PK  id           |     |
       | FK  booking_id   |     |
       | FK  user_id      |-----+
       |     amount       |
       |     payment_meth |
       |     transaction_i|
       |     status       |
       +------------------+

                 +--------------------------------+
                 | (1)                            | (1)
                 |                                |
                 v (0..*)                         v (0..*)
       +------------------+             +-------------------+
       |      TURFS       |             |      REVIEWS      |
       +------------------+             +-------------------+
       | PK  id           |             | PK  id            |
       |     name         |<------------| FK  turf_id       |
       |     location     |             | FK  user_id       |
       |     sports_type  |             |     rating        |
       |     description  |             |     comment       |
       |     price_per_hr |             +-------------------+
       |     is_active    |
       |     desc_embed   | (1536 vec)
       +------------------+

       +------------------+
       |    DOCUMENTS     |
       +------------------+
       | PK  id           |<-------------+
       |     title        |              | (1)
       |     content      |              |
       |     category     |              |
       +------------------+              |
                                         |
                                         v (1..*)
                               +--------------------+
                               | DOCUMENT_EMBEDDING |
                               +--------------------+
                               | PK  id             |
                               | FK  document_id    |
                               |     chunk_content  |
                               |     embedding      | (1536 vec)
                               +--------------------+
```

---

## 2. Table Schemas & Attributes

### 2.1. `users` Table
Stores registered sport enthusiasts and administrators credentials.
* **id** (`BIGINT`, PK, Auto-increment): Unique identifier for each user profile.
* **full_name** (`VARCHAR(100)`, Not Null): Full legal name.
* **email** (`VARCHAR(100)`, Not Null, Unique): Used as username for Spring Security credentials extraction.
* **password** (`VARCHAR(255)`, Not Null): Cryptographic BCrypt representation of user credentials.
* **role** (`VARCHAR(20)`, Default `'ROLE_USER'`): Defines granular request authorization flags (`ROLE_USER` or `ROLE_ADMIN`).
* **refresh_token** (`VARCHAR(255)`, Nullable): Used to re-validate expired client access tokens stateless-ly.
* **created_at** / **updated_at** (`TIMESTAMP`, Not Null): Profile timelines tracking.

### 2.2. `admins` Table
Extends the users profiles with operations information.
* **id** (`BIGINT`, PK, Auto-increment): Unique identifier for the administrator mapping.
* **user_id** (`BIGINT`, Unique, FK referencing `users.id` ON DELETE CASCADE): Ties back to the core credentials profile.
* **department** (`VARCHAR(100)`): Operations department (e.g., 'Facility Booking Management').
* **access_level** (`INT`, Default `1`): Interleaved hierarchical permissions mapping.

### 2.3. `turfs` Table
Maintains catalog data and geographical coordinates/descriptions of turf spaces.
* **id** (`BIGINT`, PK, Auto-increment): Unique identifier for turf arena.
* **name** (`VARCHAR(150)`, Not Null): Descriptive turf label (e.g. 'Starfire Arena Turf A').
* **location** (`VARCHAR(255)`, Not Null): Physical address.
* **sports_type** (`VARCHAR(50)`, Not Null): Sport category (e.g. `'FOOTBALL'`, `'CRICKET'`, `'TENNIS'`).
* **description** (`TEXT`): Extended overview details.
* **price_per_hour** (`NUMERIC(10,2)`, Not Null): Price mapping for calculating total reservations.
* **is_active** (`BOOLEAN`, Default `TRUE`): Soft-activation toggle flag.
* **description_embedding** (`vector(1536)`, Nullable): A 1536-dimensional vector representing the semantic characteristics of the field (generated via `text-embedding-004`).

### 2.4. `bookings` Table
Schedules reservation bounds for users and fields.
* **id** (`BIGINT`, PK, Auto-increment): Reservation identifier.
* **turf_id** (`BIGINT`, FK referencing `turfs.id` ON DELETE CASCADE): The reserved field.
* **user_id** (`BIGINT`, FK referencing `users.id` ON DELETE CASCADE): The booking owner.
* **start_time** (`TIMESTAMP`, Not Null): Time slot start.
* **end_time** (`TIMESTAMP`, Not Null): Time slot end.
* **total_price** (`NUMERIC(10,2)`): Computed total depending on hours and price rates.
* **status** (`VARCHAR(30)`, Default `'PENDING'`): Booking lifecycle status (`'PENDING'`, `'CONFIRMED'`, `'CANCELLED'`).
* **Constraint**: `CHECK (start_time < end_time)` enforces chronological integrity.

### 2.5. `payments` Table
Tracks Stripe, credit cards, or local banking gateways.
* **id** (`BIGINT`, PK, Auto-increment): Payment log identifier.
* **booking_id** (`BIGINT`, Unique, FK referencing `bookings.id` ON DELETE CASCADE): The target booking.
* **user_id** (`BIGINT`, FK referencing `users.id` ON DELETE CASCADE): The paying customer.
* **amount** (`NUMERIC(10,2)`): Amount paid.
* **payment_method** (`VARCHAR(50)`): Payment platform (e.g., `'STRIPE'`, `'CREDIT_CARD'`, `'UPI'`).
* **transaction_id** (`VARCHAR(150)`, Unique, Nullable): Transaction reference code returned by the gateway.
* **status** (`VARCHAR(30)`, Default `'PENDING'`): Gateway lifecycle (`'PENDING'`, `'COMPLETED'`, `'FAILED'`, `'REFUNDED'`).

### 2.6. `reviews` Table
Stores feedback, feedback comments, and star ratings left by sports enthusiasts.
* **id** (`BIGINT`, PK, Auto-increment): Review identifier.
* **turf_id** (`BIGINT`, FK referencing `turfs.id` ON DELETE CASCADE)
* **user_id** (`BIGINT`, FK referencing `users.id` ON DELETE CASCADE)
* **rating** (`INT`, Check: `rating >= 1 AND rating <= 5`): Star rating bounds.
* **comment** (`TEXT`): Customer notes.

### 2.7. `chat_history` Table
Secures a history of user chats with the Google Gemini Scheduling Agent to persist chat contexts.
* **id** (`BIGINT`, PK, Auto-increment)
* **user_id** (`BIGINT`, Nullable, FK referencing `users.id` ON DELETE SET NULL)
* **session_id** (`VARCHAR(100)`, Not Null): Dynamic chat session session key.
* **sender** (`VARCHAR(20)`): Originator of the prompt (`'USER'`, `'AI'`).
* **message** (`TEXT`): Dialogue body.

### 2.8. `documents` & `document_embeddings` Tables
Maintains facility terms and schedules and their corresponding chunk vectors to enable Retrieval-Augmented Generation (RAG).
* **documents.id** (`BIGINT`, PK): Rule document identifier.
* **documents.title** (`VARCHAR(255)`)
* **documents.content** (`TEXT`): Full manual text.
* **document_embeddings.id** (`BIGINT`, PK): Chunk identifier.
* **document_embeddings.document_id** (`BIGINT`, FK referencing `documents.id` ON DELETE CASCADE): Source document.
* **document_embeddings.chunk_content** (`TEXT`): Precise token chunk.
* **document_embeddings.embedding** (`vector(1536)`): Multi-dimensional vector of the chunk content.

---

## 3. High Performance Vector Searching & HNSW Indexing

To run semantic queries across our turfs catalog and system manual documentation at scale, we utilize `pgvector` with **Hierarchical Navigable Small World (HNSW)** indexes.

### 3.1. Similarity Search Operators

```sql
-- 1. Cosine Distance (<=>) - Highly recommended for Text Embeddings (measures angle variance)
SELECT name, location, price_per_hour, (1 - (description_embedding <=> :query_vector)) AS similarity
FROM turfs
ORDER BY description_embedding <=> :query_vector
LIMIT 5;

-- 2. Euclidean Distance (<->) - Measures geometric straight-line separation
SELECT title, chunk_content, (embedding <-> :query_vector) AS L2_distance
FROM document_embeddings
ORDER BY embedding <-> :query_vector
LIMIT 3;
```

### 3.2. Index Construction for Millisecond Speeds

HNSW indexes are created to avoid full-table scans during similarity searches, allowing the system to scale to millions of vectors seamlessly:

```sql
-- Cosine operator HNSW indexing
CREATE INDEX idx_turfs_embedding ON turfs USING hnsw (description_embedding vector_cosine_ops);
CREATE INDEX idx_docs_embedding ON document_embeddings USING hnsw (embedding vector_cosine_ops);
```

---
*Created dynamically for Turf Booking Platform Developer Portal deployment.*
