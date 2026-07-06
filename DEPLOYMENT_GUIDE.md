# Sports Turf Booking Platform: Enterprise Production Deployment Guide

This document outlines standard architectural setups, manual build processes, database migrations, and cloud provisioning steps required to deploy the full-stack application into a high-availability production cloud infrastructure.

---

## 🗺️ Architectural Topology Overview

In a typical cloud-native production deployment, the architecture transitions from a local Docker Compose structure to a distributed cloud topology:

```text
                  +-----------------------------------+
                  |         Internet Gateway          |
                  +-----------------------------------+
                                    |
                                    v (Port 443 HTTPS)
                  +-----------------------------------+
                  |      Application Load Balancer    | (SSL/TLS Termination)
                  +-----------------------------------+
                                    |
                  +-----------------+-----------------+
                  | (Port 80 HTTP)                    | (Port 80 HTTP)
                  v                                   v
    +---------------------------+       +---------------------------+
    |   Frontend Static Host    |       |     Spring Boot REST      |
    | (AWS S3/CloudFront, GCS/  |       |   Service (ECS / Cloud    |
    |  Cloud CDN, or CDN Nginx) |       |   Run / App Engine / K8s) |
    +---------------------------+       +---------------------------+
                  |                                   |
                  |                                   v (Port 5432)
                  |                     +---------------------------+
                  |                     |     Managed PostgreSQL    |
                  |                     |   with pgvector Enabled   |
                  |                     | (Cloud SQL, Aurora, RDS)  |
                  |                     +---------------------------+
                  |                                   |
                  +---------------->------------------+ (Direct REST APIs)
```

---

## 📂 1. Core Service Configurations

### A. Managed Database Provisioning (PostgreSQL & pgvector)
Ensure your cloud database supports PostgreSQL 15+ and the `pgvector` extension.
* **GCP Cloud SQL**: Supports pgvector 0.4.x and 0.5.x by default.
* **AWS RDS / Aurora**: Supported on PostgreSQL versions 15.2-R2 and above.

#### Manual Migrations & Seed Initialization
Connect to your production PostgreSQL server using standard DB clients (e.g., `psql` or `pgAdmin`) and execute the SQL scripts in this exact order:
1. **`schema.sql`**: Configures tables, constraints, primary/foreign key mappings, and creates HNSW vector similarity indexes.
2. **`sample-data.sql`**: Seeds reference records, generates mock vector arrays using the custom PostgreSQL function, and resets the sequence counters.

To execute via command line from a shell containing `psql`:
```bash
psql -h <DB_HOST_IP> -U postgres -d turfbooking -f schema.sql
psql -h <DB_HOST_IP> -U postgres -d turfbooking -f sample-data.sql
```

### B. Vertex AI / Google Gemini API Setup
The backend utilizes the Google Vertex AI Gemini API via Spring AI.
1. Enable the **Vertex AI API** in your Google Cloud Console.
2. Create a service account with **Vertex AI User** permission.
3. Supply credentials to the backend either through:
   * **`GEMINI_API_KEY`**: A plain API key if using standard Google AI Studio developer keys.
   * **Google Application Default Credentials (ADC)**: Recommeded for production. The service container automatically detects the Google Service Account key or Cloud Run/GKE system identity.

---

## 🐳 2. Containerized Production Builds

If you are not using automated CI/CD pipelines, you can build and push production-ready Docker images to registries (like Google Artifact Registry or AWS ECR) manually.

### Build & Push Frontend Image
```bash
# Define your cloud container registry path
REGISTRY_URL="us-central1-docker.pkg.dev/my-gcp-project/turf-registry"

# Build React + Nginx frontend image
docker build -t $REGISTRY_URL/turf-frontend:latest -f Dockerfile.frontend .

# Push image to registry
docker push $REGISTRY_URL/turf-frontend:latest
```

### Build & Push Backend Image
```bash
# Build compiled Maven JRE Spring Boot image
docker build -t $REGISTRY_URL/turf-backend:latest -f Dockerfile.backend .

# Push image to registry
docker push $REGISTRY_URL/turf-backend:latest
```

---

## ☁️ 3. Cloud Provider Provisioning Paths

### Path A: Google Cloud Platform (GCP Cloud Run)
Cloud Run is the ideal choice for serverless container deployment. It scales to zero, cold-starts rapidly, and integrates natively with IAM.

1. **Deploy Managed Database**:
   Create a PostgreSQL database on Google Cloud SQL, and ensure pgvector is enabled. Configure Private IP connections using VPC Serverless Connector for security.
2. **Deploy Backend Service**:
   ```bash
   gcloud run deploy turf-backend \
     --image us-central1-docker.pkg.dev/my-gcp-project/turf-registry/turf-backend:latest \
     --platform managed \
     --region us-central1 \
     --vpc-connector my-vpc-connector \
     --set-env-vars="SPRING_DATASOURCE_URL=jdbc:postgresql://<DB_PRIVATE_IP>:5432/turfbooking,SPRING_DATASOURCE_USERNAME=postgres,SPRING_DATASOURCE_PASSWORD=my-secure-password,SPRING_JPA_HIBERNATE_DDL_AUTO=none" \
     --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY_SECRET:latest,JWT_SECRET=JWT_SECRET_TOKEN:latest"
   ```
3. **Deploy Frontend Web Server**:
   Before building, ensure the API URL in `nginx.conf` points to your newly deployed Cloud Run backend address (or configure load balancer URL routing).
   ```bash
   gcloud run deploy turf-frontend \
     --image us-central1-docker.pkg.dev/my-gcp-project/turf-registry/turf-frontend:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

---

### Path B: Amazon Web Services (AWS ECS on Fargate)
ECS on Fargate offers highly scalable serverless container orchestration inside secure private subnets.

1. **Database Provisioning**:
   Spin up an Amazon RDS instance running PostgreSQL 16. Ensure pgvector is configured. Set security groups to accept traffic on port 5432 from your ECS task security group only.
2. **Secrets Storage**:
   Save DB passwords, JWT secrets, and Gemini API keys in **AWS Secrets Manager** or **Systems Manager Parameter Store**.
3. **Task Definition Setup**:
   Create two ECS Task Definitions:
   * **`turf-backend-task`**: Maps port 8080. Inject environment variables referencing the stored Secrets Manager items.
   * **`turf-frontend-task`**: Maps port 3000 (or port 80 if modified).
4. **Service & Load Balancer Orchestration**:
   Place both services behind an AWS Application Load Balancer (ALB). Set up listener rules:
   * `/api/v1/*` routes traffic to `turf-backend` target group.
   * `/*` (default) routes traffic to `turf-frontend` target group.
   * Attach an ACM SSL certificate to the ALB listener for HTTPS termination on port 443.

---

## 🔒 4. Production Security Hardening Checklist

* [ ] **Enforce HTTPS (SSL/TLS)**: Set up SSL certificates on your CDN (Cloudflare, AWS CloudFront) or Load Balancer. Ensure the Nginx container redirects any HTTP request to HTTPS.
* [ ] **Cryptographic Secret Rotation**: Replace the default `jwt.secret` (which is a public placeholder seed) with a secure, 256-bit cryptographically random hex string. Rotate this key periodically.
* [ ] **CORS Configuration**: Restrict the `@CrossOrigin` annotations in the Spring Boot controllers from `*` to the specific DNS domain where your React application is hosted in production.
* [ ] **Disable Hibernate DDL Actions**: Confirm `spring.jpa.hibernate.ddl-auto` is set to `none` (or `validate`). Automated database schema modifications should be handled strictly via migration scripts during database deployment.
* [ ] **Database Connection Pooling**: Ensure `spring.datasource.hikari.maximum-pool-size` is adjusted to fit the connection thresholds of your Cloud Database tier.
* [ ] **Access Control**: Confirm that all endpoints annotated with `@PreAuthorize("hasAuthority('ROLE_ADMIN')")` are protected by Spring Security's `jwtAuthFilter` and verify that unauthorized requests return `403 Forbidden` status payloads.
* [ ] **pgvector Index Optimization**: For larger production datasets (>10,000 turfs/documents), rebuild pgvector HNSW indexes with fine-tuned `m` (maximum connections per node) and `ef_construction` (size of the dynamic candidate list) params to optimize search speed and recall quality.
