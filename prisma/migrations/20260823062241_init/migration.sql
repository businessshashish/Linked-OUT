-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "DepartureType" AS ENUM ('RESIGNED', 'LAID_OFF', 'TERMINATED', 'CONTRACT_ENDED', 'OTHER');

-- CreateEnum
CREATE TYPE "ExitReason" AS ENUM ('MANAGEMENT', 'COMPENSATION', 'WORKLOAD', 'CAREER_GROWTH', 'CULTURE', 'TEAM_POLITICS', 'RECOGNITION', 'JOB_SECURITY', 'LAYOFF_RESTRUCTURING', 'ROLE_MISMATCH', 'FLEXIBILITY_RTO', 'RELOCATION', 'BENEFITS', 'ETHICS_VALUES', 'BETTER_OPPORTUNITY', 'PERSONAL');

-- CreateEnum
CREATE TYPE "ResponseChoice" AS ENUM ('YES', 'MAYBE', 'NO');

-- CreateEnum
CREATE TYPE "StoryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('WORK_EMAIL', 'DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CompanyResponseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicIdentity" (
    "id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "employeeCount" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExitStory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "publicIdentityId" TEXT,
    "authorAlias" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "roleFamily" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "departureType" "DepartureType" NOT NULL,
    "primaryReason" "ExitReason" NOT NULL,
    "otherReasons" "ExitReason"[],
    "managementScore" INTEGER NOT NULL,
    "compensationScore" INTEGER NOT NULL,
    "workLifeScore" INTEGER NOT NULL,
    "careerGrowthScore" INTEGER NOT NULL,
    "learningScore" INTEGER NOT NULL,
    "cultureScore" INTEGER NOT NULL,
    "jobSecurityScore" INTEGER NOT NULL,
    "positiveExperience" TEXT NOT NULL,
    "reasonForLeaving" TEXT NOT NULL,
    "wishIKnew" TEXT NOT NULL,
    "recommendCompany" "ResponseChoice" NOT NULL,
    "workHereAgain" "ResponseChoice" NOT NULL,
    "autoFlags" TEXT[],
    "status" "StoryStatus" NOT NULL DEFAULT 'PENDING',
    "moderationNote" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExitStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "method" "VerificationMethod" NOT NULL,
    "workEmail" TEXT,
    "evidenceNote" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "moderatorNote" TEXT,
    "reviewedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmploymentVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployerClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workEmail" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerNote" TEXT,
    "reviewedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployerClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyResponse" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "claimId" TEXT,
    "storyId" TEXT,
    "body" TEXT NOT NULL,
    "authorLabel" TEXT NOT NULL,
    "autoFlags" TEXT[],
    "status" "CompanyResponseStatus" NOT NULL DEFAULT 'PENDING',
    "moderationNote" TEXT,
    "moderatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT,
    "storyId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PublicIdentity_alias_key" ON "PublicIdentity"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "PublicIdentity_userId_key" ON "PublicIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- CreateIndex
CREATE INDEX "Company_industry_idx" ON "Company"("industry");

-- CreateIndex
CREATE INDEX "Company_country_idx" ON "Company"("country");

-- CreateIndex
CREATE INDEX "ExitStory_companyId_status_idx" ON "ExitStory"("companyId", "status");

-- CreateIndex
CREATE INDEX "ExitStory_createdAt_idx" ON "ExitStory"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExitStory_publicIdentityId_companyId_key" ON "ExitStory"("publicIdentityId", "companyId");

-- CreateIndex
CREATE INDEX "EmploymentVerification_status_idx" ON "EmploymentVerification"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EmploymentVerification_userId_companyId_key" ON "EmploymentVerification"("userId", "companyId");

-- CreateIndex
CREATE INDEX "EmployerClaim_status_idx" ON "EmployerClaim"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EmployerClaim_userId_companyId_key" ON "EmployerClaim"("userId", "companyId");

-- CreateIndex
CREATE INDEX "CompanyResponse_companyId_status_idx" ON "CompanyResponse"("companyId", "status");

-- CreateIndex
CREATE INDEX "CompanyResponse_storyId_idx" ON "CompanyResponse"("storyId");

-- CreateIndex
CREATE INDEX "ContentReport_status_idx" ON "ContentReport"("status");

-- CreateIndex
CREATE INDEX "ContentReport_storyId_idx" ON "ContentReport"("storyId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- AddForeignKey
ALTER TABLE "PublicIdentity" ADD CONSTRAINT "PublicIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExitStory" ADD CONSTRAINT "ExitStory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExitStory" ADD CONSTRAINT "ExitStory_publicIdentityId_fkey" FOREIGN KEY ("publicIdentityId") REFERENCES "PublicIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentVerification" ADD CONSTRAINT "EmploymentVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentVerification" ADD CONSTRAINT "EmploymentVerification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerClaim" ADD CONSTRAINT "EmployerClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerClaim" ADD CONSTRAINT "EmployerClaim_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyResponse" ADD CONSTRAINT "CompanyResponse_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyResponse" ADD CONSTRAINT "CompanyResponse_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "EmployerClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyResponse" ADD CONSTRAINT "CompanyResponse_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "ExitStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "ExitStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
