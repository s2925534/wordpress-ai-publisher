-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WordPressSite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "siteProtocol" TEXT NOT NULL DEFAULT 'https',
    "siteHostname" TEXT,
    "timezone" TEXT,
    "username" TEXT,
    "encryptedApplicationPassword" TEXT,
    "encryptedPluginToken" TEXT,
    "defaultStatus" TEXT NOT NULL DEFAULT 'draft',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_WordPressSite" ("createdAt", "defaultStatus", "encryptedApplicationPassword", "encryptedPluginToken", "id", "name", "siteKey", "siteUrl", "status", "updatedAt", "username") SELECT "createdAt", "defaultStatus", "encryptedApplicationPassword", "encryptedPluginToken", "id", "name", "siteKey", "siteUrl", "status", "updatedAt", "username" FROM "WordPressSite";
DROP TABLE "WordPressSite";
ALTER TABLE "new_WordPressSite" RENAME TO "WordPressSite";
CREATE UNIQUE INDEX "WordPressSite_siteKey_key" ON "WordPressSite"("siteKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
