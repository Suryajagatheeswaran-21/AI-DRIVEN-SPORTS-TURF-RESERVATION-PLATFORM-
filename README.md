# Enterprise Sports Turf Booking Platform: Full-Stack Production Environment

This project is a high-performance, enterprise-grade Sports Turf Booking Platform featuring a modern React frontend and a robust Spring Boot backend. It includes automated scheduling, admin panel analytics, security controls via JSON Web Tokens (JWT), and a **Gemini AI Arena Scheduler Bot** leveraging a PostgreSQL vector database (`pgvector`) for context-aware Retrieval-Augmented Generation (RAG).

---

## 🚀 Key Architectural & Functional Modules

1. **Vibrant React SPA Frontend**: Built with Vite, Tailwind CSS, and `motion` (Framer motion) for silky smooth micro-transitions. It offers direct UI dashboard interfaces for booking turfs, managing slots, and writing peer reviews.
2. **Spring Boot REST Engine**: Runs a structured three-tier architecture (Controller, Service, Repository, Entity, and DTO) with secure endpoint mapping and global validation middleware.
3. **Automated Database Seeding**: Pre-loaded database tables covering users, administrators, turfs, chat logs, reviews, booking schedules, and document embeddings.
4. **pgvector Semantic Search**: High-performance semantic vector cosine similarity matches on sports turf facilities using PostgreSQL's HNSW index indexing and Gemini vector embeddings.
5. **Admin Operations Board**: Secure admin control views to execute CRUD operations on active facilities, manage active booking schedules, check real-time payments, and compile sales telemetry reports.

---

## 🛠️ Complete Technology Stack

* **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Motion Animations
* **Backend**: Java 21, Spring Boot 3.3, Spring Security (JWT-based state), Spring Data JPA
* **AI integration**: Spring AI, Google Vertex AI / Gemini API
* **Database**: PostgreSQL 16, pgvector (HNSW indexing with vector operators)
* **Orchestration**: Docker, Docker Compose, Nginx (Reverse Proxy & Asset Host)

---

## ⚡ One-Command Instant Boot (Docker Compose)

The entire full-stack ecosystem (PostgreSQL, pgvector, Spring Boot REST app, React SPA, and Nginx proxy) is configured to launch simultaneously with a single Docker command. 

When you boot the container, PostgreSQL starts, registers the `vector` extension, sets up the full database schemas from `schema.sql`, and seeds records (including 1536-dimensional mock vector coordinates) from `sample-data.sql` before launching the backend.

### Prerequisites
* Ensure you have [Docker](https://www.docker.com/) and **Docker Compose** installed.

### Step 1: Clone and Set Environment Variable
Create a `.env` file in the project root or export your Google Gemini API key to your system environment (refer to `.env.example` for reference templates):
```bash
export GEMINI_API_KEY="AIzaSyYourGeminiAPIKeyHere"
```

### Step 2: Boot the Platform
Execute the compose command from the root directory:
```bash
docker-compose up --build
```

### Step 3: Access the Applications
Once the boot sequence concludes, navigate to your browser:
* **Frontend Application Portal**: [http://localhost:3000](http://localhost:3000) (Proxies backend calls automatically)
* **Backend Spring REST Service**: [http://localhost:8080/api/v1/health](http://localhost:8080/api/v1/health)
* **PostgreSQL pgvector database**: `localhost:5432` (User: `postgres`, Password: `postgres`, DB: `turfbooking`)

---

## 🔒 Pre-Seeded Auth Credentials (JWT)

You can log in to the application using any of the following pre-seeded records:

| Full Name | Role | Email | Password (Unencrypted Seed) |
| :--- | :--- | :--- | :--- |
| **Admin David** | `ROLE_ADMIN` | `david.admin@example.com` | `password` |
| **Admin Sarah** | `ROLE_ADMIN` | `sarah.admin@example.com` | `password` |
| **Alex Morgan** | `ROLE_USER` | `alex@example.com` | `password` |
| **Marcus Rashford** | `ROLE_USER` | `marcus@example.com` | `password` |
| **Serena Williams** | `ROLE_USER` | `serena@example.com` | `password` |

---

## 📁 System Repository Structure

```text
├── Dockerfile.backend        # Multi-stage build for Spring Boot JAR
├── Dockerfile.frontend       # Multi-stage build for React SPA & Nginx
├── docker-compose.yml        # Orchestration descriptor for DB, backend, and frontend
├── nginx.conf                # Frontend SPA router and backend API routing proxy
├── schema.sql                # Complete PostgreSQL table and vector indexes DDL
├── sample-data.sql           # Complete mock data and vector mock seeds DML
├── DATABASE_DESIGN.md        # DB Entity-Relationship (ER) & pgvector configuration docs
├── DEPLOYMENT_GUIDE.md       # Production Cloud deployment & manual build guide
├── .env.example              # Documented parameters of env configurations
└── src/                      # Source codebase
    ├── main/java/...         # Core Spring Boot backend application
    └── src/...               # Client dashboard React application
```

---

## 🔍 REST API Endpoint Catalog

All REST calls are mapped under the `/api/v1/` routing baseline:

* **Authentication API**:
  * `POST /api/v1/auth/register` - Create a new user profile
  * `POST /api/v1/auth/login` - Authenticate credentials and receive JWT
  * `POST /api/v1/auth/refresh` - Swap active refresh token for a new API token
* **Turf Registry API**:
  * `GET /api/v1/turfs` - List all active turfs
  * `GET /api/v1/turfs/{id}` - Fetch details of a specific turf
  * `GET /api/v1/turfs/search?query=...&semantic=true` - Execute a pgvector-powered semantic AI turf lookup
  * `POST /api/v1/turfs` - (*Admin*) Register a new turf facility
  * `PUT /api/v1/turfs/{id}` - (*Admin*) Update facility details
  * `DELETE /api/v1/turfs/{id}` - (*Admin*) Delete facility from the catalog
* **Booking Ledger API**:
  * `GET /api/v1/bookings` - (*Admin*) Fetch booking history ledger
  * `POST /api/v1/bookings` - Submit turf rental reservation invoice
  * `PUT /api/v1/bookings/{id}/status` - Modify status of reservations
* **Payments & Billing API**:
  * `POST /api/v1/payments` - Submit financial settlement of booking
  * `GET /api/v1/payments/{id}` - Fetch transaction billing log
