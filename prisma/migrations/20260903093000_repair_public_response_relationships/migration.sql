UPDATE "CompanyResponse" AS response
SET "status" = 'REJECTED',
    "moderationNote" = 'Hidden because the response did not have a verified company claim.'
WHERE response."status" = 'APPROVED'
  AND (
    response."claimId" IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM "EmployerClaim" AS claim
      WHERE claim."id" = response."claimId"
        AND claim."companyId" = response."companyId"
        AND claim."status" = 'APPROVED'
    )
  );

UPDATE "CompanyResponse" AS response
SET "status" = 'REJECTED',
    "moderationNote" = 'Hidden because the response was attached to the wrong company.'
FROM "ExitStory" AS story
WHERE response."storyId" = story."id"
  AND response."companyId" <> story."companyId";
