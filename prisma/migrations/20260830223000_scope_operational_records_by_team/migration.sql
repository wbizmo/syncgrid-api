PRAGMA foreign_keys=OFF;

CREATE TABLE "new_ProviderConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "config" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProviderConfig_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProviderConfig" ("config", "createdAt", "id", "name", "provider", "status", "updatedAt") SELECT "config", "createdAt", "id", "name", "provider", "status", "updatedAt" FROM "ProviderConfig";
DROP TABLE "ProviderConfig";
ALTER TABLE "new_ProviderConfig" RENAME TO "ProviderConfig";
CREATE INDEX "ProviderConfig_teamId_idx" ON "ProviderConfig"("teamId");
CREATE INDEX "ProviderConfig_provider_idx" ON "ProviderConfig"("provider");

CREATE TABLE "new_WebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT,
    "provider" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "payload" JSONB NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WebhookEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WebhookEvent" ("event", "id", "payload", "provider", "receivedAt", "status", "updatedAt") SELECT "event", "id", "payload", "provider", "receivedAt", "status", "updatedAt" FROM "WebhookEvent";
DROP TABLE "WebhookEvent";
ALTER TABLE "new_WebhookEvent" RENAME TO "WebhookEvent";
CREATE INDEX "WebhookEvent_teamId_idx" ON "WebhookEvent"("teamId");
CREATE INDEX "WebhookEvent_provider_idx" ON "WebhookEvent"("provider");
CREATE INDEX "WebhookEvent_status_idx" ON "WebhookEvent"("status");

CREATE TABLE "new_RequestLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "apiKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequestLog_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RequestLog" ("apiKey", "createdAt", "id", "method", "path", "responseTime", "statusCode") SELECT "apiKey", "createdAt", "id", "method", "path", "responseTime", "statusCode" FROM "RequestLog";
DROP TABLE "RequestLog";
ALTER TABLE "new_RequestLog" RENAME TO "RequestLog";
CREATE INDEX "RequestLog_teamId_idx" ON "RequestLog"("teamId");
CREATE INDEX "RequestLog_apiKey_idx" ON "RequestLog"("apiKey");
CREATE INDEX "RequestLog_createdAt_idx" ON "RequestLog"("createdAt");

PRAGMA foreign_keys=ON;
