CREATE TABLE "CompanyRequest" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "website" TEXT,
  "requesterId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CompanyRequest_status_idx" ON "CompanyRequest"("status");
ALTER TABLE "CompanyRequest" ADD CONSTRAINT "CompanyRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
