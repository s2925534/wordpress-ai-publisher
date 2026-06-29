-- CreateTable
CREATE TABLE "WordPressSite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "username" TEXT,
    "encryptedApplicationPassword" TEXT,
    "encryptedPluginToken" TEXT,
    "defaultStatus" TEXT NOT NULL DEFAULT 'draft',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WordPressSiteSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wordpressSiteId" TEXT NOT NULL,
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "siteName" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "timezone" TEXT,
    "locale" TEXT,
    "restApiAvailable" BOOLEAN NOT NULL DEFAULT false,
    "canCreatePosts" BOOLEAN NOT NULL DEFAULT false,
    "canPublishPosts" BOOLEAN NOT NULL DEFAULT false,
    "canUploadMedia" BOOLEAN NOT NULL DEFAULT false,
    "canCreateCategories" BOOLEAN NOT NULL DEFAULT false,
    "canCreateTags" BOOLEAN NOT NULL DEFAULT false,
    "availablePostTypes" JSONB,
    "availablePostStatuses" JSONB,
    "categories" JSONB,
    "tags" JSONB,
    "authors" JSONB,
    "jetpackStatus" JSONB,
    "seoPluginStatus" JSONB,
    "mediaSettings" JSONB,
    "recentPosts" JSONB,
    "rawDiscovery" JSONB,
    CONSTRAINT "WordPressSiteSnapshot_wordpressSiteId_fkey" FOREIGN KEY ("wordpressSiteId") REFERENCES "WordPressSite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileKey" TEXT NOT NULL,
    "siteId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "outputOrder" JSONB NOT NULL,
    "brandContext" JSONB,
    "topicFocus" JSONB,
    "writingRules" JSONB,
    "hashtagRules" JSONB,
    "categoryRules" JSONB,
    "imageRules" JSONB,
    "seoRules" JSONB,
    "urlRules" JSONB,
    "qualityRules" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GenerationRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inputText" TEXT NOT NULL,
    "sourceNotes" TEXT,
    "sourceSafetyType" TEXT NOT NULL,
    "contentProfileId" TEXT NOT NULL,
    "wordpressSiteId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GenerationRequest_contentProfileId_fkey" FOREIGN KEY ("contentProfileId") REFERENCES "ContentProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GenerationRequest_wordpressSiteId_fkey" FOREIGN KEY ("wordpressSiteId") REFERENCES "WordPressSite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeneratedPublicationPackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "generationRequestId" TEXT NOT NULL,
    "wordpressSiteId" TEXT NOT NULL,
    "contentProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "linkedinPost" TEXT NOT NULL,
    "articleContent" TEXT,
    "excerpt" TEXT NOT NULL,
    "plainCsvTags" TEXT NOT NULL,
    "recommendedCategories" JSONB NOT NULL,
    "recommendedTags" JSONB NOT NULL,
    "featureImagePrompt" TEXT,
    "featureImageUrl" TEXT,
    "altText" TEXT NOT NULL,
    "suggestedImageFileName" TEXT NOT NULL,
    "seoPackage" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "confirmedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GeneratedPublicationPackage_generationRequestId_fkey" FOREIGN KEY ("generationRequestId") REFERENCES "GenerationRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GeneratedPublicationPackage_wordpressSiteId_fkey" FOREIGN KEY ("wordpressSiteId") REFERENCES "WordPressSite" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GeneratedPublicationPackage_contentProfileId_fkey" FOREIGN KEY ("contentProfileId") REFERENCES "ContentProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeneratedImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "generatedPackageId" TEXT NOT NULL,
    "imagePrompt" TEXT NOT NULL,
    "localImageUrl" TEXT,
    "wordpressMediaId" INTEGER,
    "imageFilename" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "caption" TEXT,
    "description" TEXT,
    "altTextStatus" TEXT NOT NULL DEFAULT 'missing',
    "imageApprovalStatus" TEXT NOT NULL DEFAULT 'pending',
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GeneratedImage_generatedPackageId_fkey" FOREIGN KEY ("generatedPackageId") REFERENCES "GeneratedPublicationPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PublishingAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "generatedPackageId" TEXT NOT NULL,
    "wordpressSiteId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "wordpressStatus" TEXT NOT NULL,
    "wordpressPostId" INTEGER,
    "wordpressPostUrl" TEXT,
    "socialStatus" TEXT NOT NULL,
    "socialProvider" TEXT,
    "selectedSocialConnections" JSONB,
    "socialErrorMessage" TEXT,
    "requestPayloadSnapshot" JSONB NOT NULL,
    "responseSnapshot" JSONB,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PublishingAttempt_generatedPackageId_fkey" FOREIGN KEY ("generatedPackageId") REFERENCES "GeneratedPublicationPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PublishingAttempt_wordpressSiteId_fkey" FOREIGN KEY ("wordpressSiteId") REFERENCES "WordPressSite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ValidationSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "generatedPackageId" TEXT NOT NULL,
    "validationType" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "score" INTEGER,
    "results" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ValidationSnapshot_generatedPackageId_fkey" FOREIGN KEY ("generatedPackageId") REFERENCES "GeneratedPublicationPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LocalSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "WordPressSite_siteKey_key" ON "WordPressSite"("siteKey");

-- CreateIndex
CREATE UNIQUE INDEX "ContentProfile_profileKey_key" ON "ContentProfile"("profileKey");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedPublicationPackage_generationRequestId_key" ON "GeneratedPublicationPackage"("generationRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "PublishingAttempt_idempotencyKey_key" ON "PublishingAttempt"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "LocalSetting_key_key" ON "LocalSetting"("key");
