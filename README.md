# SyncGrid API

A unified integration gateway for payments, email, webhooks, provider routing, API key management, usage analytics, team workspaces, caching, background processing, and third-party service abstraction.

SyncGrid provides a single API layer that sits between applications and external service providers, allowing developers to integrate with multiple payment and email providers through one consistent interface.

---

## Overview

Modern applications often depend on multiple third-party services.

A typical system may integrate:

* Paystack for payments
* Stripe for international payments
* Flutterwave for alternative payment coverage
* Resend for transactional emails
* Mailgun for email infrastructure
* SendGrid for email delivery
* Webhooks from multiple providers
* API keys for developer access
* Usage tracking for visibility
* Background jobs for retries and replay operations

As the number of providers increases, applications become tightly coupled to provider-specific APIs.

SyncGrid introduces a unified abstraction layer that standardizes these integrations behind a single platform.

---

## Core Objectives

SyncGrid was built to demonstrate:

* API gateway architecture
* Provider abstraction
* Service failover strategies
* API key authentication
* Request logging
* Usage analytics
* Team-based workspaces
* Background job processing
* Redis caching
* Modern OpenAPI documentation
* Developer SDK support
* Docker-based setup

---

## Features

### Provider Abstraction

* Unified payment provider interface
* Unified email provider interface
* Provider configuration management
* Provider failover simulation
* Centralized provider routing

### Payments

* Create payment charges
* Verify payment transactions
* Provider failover support
* Unified payment workflow

Supported providers:

* Paystack
* Stripe
* Flutterwave

### Email

* Send transactional emails
* Track message delivery status
* Provider failover support
* Unified email workflow

Supported providers:

* Resend
* Mailgun
* SendGrid

### Webhooks

* Receive provider webhooks
* Store webhook events
* Replay webhook events
* Webhook event history
* Queue-ready replay processing

### API Key Management

* Create API keys
* Revoke API keys
* Protected endpoints
* Authentication middleware
* Request ownership tracking

### Team Workspaces

* Create team workspaces
* Add team members
* Assign member roles
* Foundation for multi-tenant SaaS functionality

### Analytics

* Request logging
* Usage analytics
* Endpoint statistics
* Response time tracking
* Success and failure tracking

### Performance

* Redis caching support
* BullMQ background jobs
* Queue-based webhook replay
* Rate limiting

### Developer Experience

* OpenAPI documentation
* Swagger UI
* JavaScript SDK helper
* Docker support
* Modular project structure

---

## Tech Stack

### Backend

* Node.js
* TypeScript
* Fastify

### Database

* Prisma ORM
* SQLite for development
* PostgreSQL-ready architecture

### Caching

* Redis
* ioredis

### Background Jobs

* BullMQ

### Documentation

* OpenAPI
* Swagger UI

### Infrastructure

* Docker
* Docker Compose

---

## Technical Architecture

SyncGrid is organized around independent modules. Each module owns a specific part of the platform and is registered through the Fastify application bootstrap.

```txt
Client Application
        |
        v
SyncGrid API
        |
        |-- API Key Authentication
        |-- Rate Limiting
        |-- Request Logging
        |
        |-- Providers Module
        |-- Payments Module
        |-- Email Module
        |-- Webhooks Module
        |-- Provider Configs Module
        |-- Teams Module
        |-- Logs / Analytics Module
        |
        |-- Prisma Data Layer
        |-- Redis Cache Layer
        |-- BullMQ Job Layer
```

---

## Project Structure

```txt
src
├── config
├── jobs
├── modules
│   ├── api-keys
│   ├── email
│   ├── health
│   ├── logs
│   ├── payments
│   ├── provider-configs
│   ├── providers
│   ├── teams
│   └── webhooks
├── shared
└── server.ts

sdk
prisma
```

---

## Installation

Clone the repository:

```bash
git clone https://github.com/wbizmo/syncgrid-api.git
cd syncgrid-api
```

Install dependencies:

```bash
npm install
```

Create a `.env` file:

```env
DATABASE_URL="file:./dev.db"
REDIS_URL=""
PORT=3000
```

Generate Prisma client:

```bash
npx prisma generate
```

Run database migrations:

```bash
npx prisma migrate dev
```

Start the development server:

```bash
npm run dev
```

---

## API Documentation

Swagger UI is available at:

```txt
http://localhost:3000/docs
```

The documentation includes endpoint groups for:

* System
* Providers
* Provider Configs
* Payments
* Email
* Webhooks
* API Keys
* Teams
* Logs
* Analytics

---

## Authentication

Most endpoints require an API key.

Send the API key using the `x-api-key` header:

```http
x-api-key: sg_live_xxxxxxxxx
```

Public endpoints:

```txt
GET /
GET /health
GET /docs
```

---

## API Examples

### Create API Key

```bash
curl -X POST \
"http://localhost:3000/api-keys" \
-H "Content-Type: application/json" \
-H "x-api-key: YOUR_API_KEY" \
-d '{
  "name": "Production Key"
}'
```

### List Providers

```bash
curl \
"http://localhost:3000/providers" \
-H "x-api-key: YOUR_API_KEY"
```

### Filter Providers

```bash
curl \
"http://localhost:3000/providers?category=payments&status=active" \
-H "x-api-key: YOUR_API_KEY"
```

### Create Provider Configuration

```bash
curl -X POST \
"http://localhost:3000/provider-configs" \
-H "Content-Type: application/json" \
-H "x-api-key: YOUR_API_KEY" \
-d '{
  "provider": "paystack",
  "name": "Production Paystack",
  "config": {
    "secretKey": "sk_test_xxx",
    "publicKey": "pk_test_xxx",
    "webhookSecret": "whsec_xxx"
  }
}'
```

### Create Payment

```bash
curl -X POST \
"http://localhost:3000/payments/charges" \
-H "Content-Type: application/json" \
-H "x-api-key: YOUR_API_KEY" \
-d '{
  "provider": "paystack",
  "amount": 500000,
  "currency": "NGN",
  "email": "customer@example.com"
}'
```

### Create Payment With Failover Simulation

```bash
curl -X POST \
"http://localhost:3000/payments/charges" \
-H "Content-Type: application/json" \
-H "x-api-key: YOUR_API_KEY" \
-d '{
  "provider": "paystack",
  "amount": 500000,
  "currency": "NGN",
  "email": "customer@example.com",
  "simulateFailure": true
}'
```

Example failover response:

```json
{
  "success": true,
  "message": "Payment charge created using fallback provider",
  "data": {
    "requestedProvider": "paystack",
    "usedProvider": "stripe",
    "attemptedProviders": ["paystack", "stripe"],
    "failedOver": true,
    "status": "pending"
  }
}
```

### Verify Payment

```bash
curl \
"http://localhost:3000/payments/charges/SG-demo-reference?provider=paystack" \
-H "x-api-key: YOUR_API_KEY"
```

### Send Email

```bash
curl -X POST \
"http://localhost:3000/emails/send" \
-H "Content-Type: application/json" \
-H "x-api-key: YOUR_API_KEY" \
-d '{
  "provider": "resend",
  "from": "noreply@example.com",
  "to": "customer@example.com",
  "subject": "Welcome",
  "html": "<h1>Hello from SyncGrid</h1>"
}'
```

### Send Email With Failover Simulation

```bash
curl -X POST \
"http://localhost:3000/emails/send" \
-H "Content-Type: application/json" \
-H "x-api-key: YOUR_API_KEY" \
-d '{
  "provider": "resend",
  "from": "noreply@example.com",
  "to": "customer@example.com",
  "subject": "Welcome",
  "html": "<h1>Hello from SyncGrid</h1>",
  "simulateFailure": true
}'
```

### Receive Webhook

```bash
curl -X POST \
"http://localhost:3000/webhooks/paystack" \
-H "Content-Type: application/json" \
-H "x-api-key: YOUR_API_KEY" \
-d '{
  "event": "charge.success",
  "data": {
    "reference": "SG-demo",
    "amount": 500000,
    "currency": "NGN"
  }
}'
```

### Replay Webhook

```bash
curl -X POST \
"http://localhost:3000/webhooks/WEBHOOK_EVENT_ID/replay" \
-H "x-api-key: YOUR_API_KEY"
```

### Create Team

```bash
curl -X POST \
"http://localhost:3000/teams" \
-H "Content-Type: application/json" \
-H "x-api-key: YOUR_API_KEY" \
-d '{
  "name": "Acme Integrations",
  "ownerEmail": "owner@example.com",
  "plan": "pro"
}'
```

### Add Team Member

```bash
curl -X POST \
"http://localhost:3000/teams/TEAM_ID/members" \
-H "Content-Type: application/json" \
-H "x-api-key: YOUR_API_KEY" \
-d '{
  "email": "dev@example.com",
  "role": "developer"
}'
```

### View Request Logs

```bash
curl \
"http://localhost:3000/logs" \
-H "x-api-key: YOUR_API_KEY"
```

### View Usage Analytics

```bash
curl \
"http://localhost:3000/analytics/usage" \
-H "x-api-key: YOUR_API_KEY"
```

---

## JavaScript SDK

A small JavaScript SDK helper is included in the `sdk` directory.

```javascript
const { SyncGridClient } = require('./sdk/syncgrid-js-sdk');

const client = new SyncGridClient({
  apiKey: 'YOUR_API_KEY',
  baseUrl: 'http://localhost:3000',
});

const providers = await client.providers();

const payment = await client.createPayment({
  provider: 'paystack',
  amount: 500000,
  currency: 'NGN',
  email: 'customer@example.com',
});

const email = await client.sendEmail({
  provider: 'resend',
  from: 'noreply@example.com',
  to: 'customer@example.com',
  subject: 'Welcome',
  html: '<h1>Hello</h1>',
});
```

---

## Docker

Build the container:

```bash
docker compose build
```

Run the application:

```bash
docker compose up
```

The API will be available at:

```txt
http://localhost:3000
```

---

## Database Design

Current Prisma models include:

* Team
* TeamMember
* ApiKey
* ProviderConfig
* WebhookEvent
* RequestLog

These models support:

* Team workspaces
* API key ownership
* Provider configuration storage
* Webhook persistence
* Request logging
* Usage analytics

---

## Redis and BullMQ

Redis is optional in development.

If `REDIS_URL` is not provided:

* The API still runs
* Cache operations are skipped safely
* BullMQ workers are disabled
* Webhook replay is simulated

If `REDIS_URL` is provided:

* Provider responses can be cached
* Analytics responses can be cached
* Webhook replay jobs can be queued
* BullMQ workers can process background jobs

---

## Rate Limiting

Protected endpoints are rate limited per API key.

Responses include rate limit headers:

```txt
x-ratelimit-limit
x-ratelimit-remaining
x-ratelimit-reset
```

---

## Roadmap

Potential future improvements:

* Real provider integrations
* PostgreSQL production deployment
* Role-based permissions
* Usage billing
* Provider health checks
* Provider health dashboard
* Multi-region failover
* Published SDK package
* Hosted management dashboard
* Usage-based pricing plans

---

## What This Project Demonstrates

SyncGrid demonstrates practical backend and platform engineering concepts:

* API platform design
* Backend modular architecture
* Third-party integration abstraction
* Authentication middleware
* Request lifecycle tracking
* Rate limiting
* Caching strategy
* Queue-based background processing
* Database modeling with Prisma
* Webhook ingestion and replay
* Usage analytics
* Team/workspace foundations
* Developer tooling and SDK design
* Docker-based local infrastructure

---

## Author

Williams
GitHub: https://github.com/wbizmo
Email: [wbizmo@gmail.com](mailto:wbizmo@gmail.com)

---

## License

MIT
