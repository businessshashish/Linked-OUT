import "dotenv/config";

import {
  randomBytes,
  scryptSync
} from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import XLSX from "xlsx";

import { PrismaClient } from "../app/generated/prisma/client";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL missing");
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL
});

const prisma = new PrismaClient({
  adapter
});

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");

  const derived = scryptSync(
    password,
    salt,
    64
  ).toString("hex");

  return `${salt}:${derived}`;
}

type DatasetCompany = {
  name: string;
  slug: string;
  industry: string;
  location: string;
  country: string;
  logoUrl: string;
  description: string;
};

const countryLabels: Record<string, string> = {
  US: "United States",
  UK: "United Kingdom",
  India: "India",
  UAE: "United Arab Emirates",
  Australia: "Australia"
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function loadCompanies(): DatasetCompany[] {
  const workbook = XLSX.readFile("linkedout_companies_500_fixed.xlsx");
  const companies: DatasetCompany[] = [];
  const seenSlugs = new Set<string>();

  for (const sheetName of workbook.SheetNames.filter((name) => countryLabels[name])) {
    const rows = XLSX.utils.sheet_to_json<{
      "Company Name": string;
      "Logo URL": string;
      "One-line Description": string;
    }>(workbook.Sheets[sheetName]);

    for (const row of rows) {
      if (!row["Company Name"]) continue;

      const slug = slugify(row["Company Name"]);
      if (seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);

      companies.push({
        name: row["Company Name"].trim(),
        slug,
        industry: "Major employer",
        location: countryLabels[sheetName] || sheetName,
        country: countryLabels[sheetName] || sheetName,
        logoUrl: row["Logo URL"],
        description: row["One-line Description"]
      });
    }
  }

  return companies;
}

const companies = loadCompanies();

const departureReasons = [
  "MANAGEMENT",
  "WORKLOAD",
  "COMPENSATION",
  "CAREER_GROWTH",
  "CULTURE",
  "BETTER_OPPORTUNITY",
  "ROLE_MISMATCH",
  "FLEXIBILITY_RTO"
] as const;

async function main() {
  const adminEmail =
    process.env.ADMIN_EMAIL ||
    "admin@linkedout.local";

  const adminPassword =
    process.env.ADMIN_PASSWORD ||
    "ChangeMe123!";

  const demoPassword =
    process.env.DEMO_PASSWORD ||
    "Demo123!";

  await prisma.company.deleteMany({
    where: {
      slug: {
        in: [
          "acme-technologies",
          "northstar-consulting",
          "orbit-commerce",
          "vertex-financial"
        ]
      }
    }
  });

  await prisma.exitStory.updateMany({
    where: {
      publicIdentity: {
        user: {
          email: {
            startsWith: "seed-"
          }
        }
      }
    },
    data: {
      isDemo: true
    }
  });

  await prisma.companyResponse.updateMany({
    where: {
      authorLabel: "Acme Technologies representative"
    },
    data: {
      isDemo: true
    }
  });

  await prisma.user.upsert({
    where: {
      email: adminEmail
    },

    update: {
      role: "ADMIN"
    },

    create: {
      email: adminEmail,
      passwordHash:
        hashPassword(adminPassword),
      role: "ADMIN",

      publicIdentity: {
        create: {
          alias:
            "Anonymous Administrator"
        }
      }
    }
  });

  const employer =
    await prisma.user.upsert({
      where: {
        email:
          "employer@acme.example"
      },

      update: {},

      create: {
        email:
          "employer@acme.example",

        passwordHash:
          hashPassword(demoPassword),

        publicIdentity: {
          create: {
            alias:
              "Anonymous Employee • EMP001"
          }
        }
      }
    });

  const createdCompanies = [];

  for (const company of companies) {
    const created =
      await prisma.company.upsert({
        where: {
          slug: company.slug
        },

        update: company,

        create: company
      });

    createdCompanies.push(created);
  }

  const existingStoryCount =
    await prisma.exitStory.count();

  if (existingStoryCount === 0) {
    for (const [
      companyIndex,
      company
    ] of createdCompanies.slice(0, 4).entries()) {
      for (let i = 0; i < 8; i++) {
        const email = `seed-${companyIndex}-${i}@linkedout.example`;

        const alias = `Anonymous Employee • ${companyIndex}${i}A${i}`;

        const seedUser =
          await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
              email,

              passwordHash:
                hashPassword(demoPassword),

              publicIdentity: {
                create: {
                  alias
                }
              }
            },

            include: {
              publicIdentity: true
            }
          });

        if (!seedUser.publicIdentity) {
          throw new Error(
            "Seed public identity missing"
          );
        }

        const primaryReason =
          departureReasons[
            (i + companyIndex) %
              departureReasons.length
          ];

        const secondReason =
          departureReasons[
            (i + companyIndex + 1) %
              departureReasons.length
          ];

        const thirdReason =
          departureReasons[
            (i + companyIndex + 3) %
              departureReasons.length
          ];

        await prisma.exitStory.create({
          data: {
            companyId: company.id,

            publicIdentityId:
              seedUser.publicIdentity.id,

            authorAlias: alias,

            jobTitle:
              i % 3 === 0
                ? "Software Engineer"
                : i % 3 === 1
                  ? "Product Manager"
                  : "Operations Analyst",

            roleFamily:
              i % 3 === 0
                ? "Engineering"
                : i % 3 === 1
                  ? "Product"
                  : "Operations",

            location: company.location,

            tenureMonths:
              12 + i * 5,

            departureType:
              i === 6
                ? "LAID_OFF"
                : "RESIGNED",

            primaryReason,

            otherReasons: [
              secondReason,
              thirdReason
            ],

            managementScore:
              2 + (i % 3),

            compensationScore:
              2 + ((i + 1) % 4),

            workLifeScore:
              2 + (i % 3),

            careerGrowthScore:
              3 + (i % 3),

            learningScore:
              3 + (i % 3),

            cultureScore:
              2 + ((i + 2) % 4),

            jobSecurityScore:
              2 + ((i + 1) % 4),

            positiveExperience:
              "The team contained several strong people and the role offered genuine opportunities to learn. I was trusted with meaningful work relatively early.",

            reasonForLeaving:
              i % 2 === 0
                ? "The workload kept increasing and priorities changed frequently. I eventually felt the pace was no longer sustainable relative to the support and compensation available."
                : "I learned a lot, but career progression became difficult to understand. Expectations grew faster than the clarity around promotion, recognition and long-term development.",

            wishIKnew:
              i % 2 === 0
                ? "I wish I had understood how heavily the day-to-day experience depended on the manager and team I was assigned to."
                : "I wish I had asked much more specifically about promotion criteria, workload expectations and how performance was measured.",

            recommendCompany:
              i % 3 === 0
                ? "NO"
                : "MAYBE",

            workHereAgain:
              i % 4 === 0
                ? "NO"
                : "MAYBE",

            autoFlags: [],

            isDemo: true,

            status: "APPROVED",
            publishedAt: new Date(
              2025 + (i % 2),
              i % 12,
              1 + i
            ),

            createdAt: new Date(
              2025 + (i % 2),
              i % 12,
              1 + i
            )
          }
        });

        if (i < 5) {
          await prisma.employmentVerification.create({
            data: {
              userId: seedUser.id,
              companyId: company.id,
              method: "WORK_EMAIL",
              workEmail: `former-${i}@${company.slug}.example`,
              status: "APPROVED",
              decidedAt: new Date()
            }
          });
        }
      }
    }
  }

  const acme =
    createdCompanies.find(
      (company) =>
        company.slug === "acme-technologies"
    ) || createdCompanies[0];

  if (!acme) {
    throw new Error("Company dataset is empty");
  }

  const employerClaim =
    await prisma.employerClaim.upsert({
      where: {
        userId_companyId: {
          userId: employer.id,
          companyId: acme.id
        }
      },

      update: {
        status: "APPROVED"
      },

      create: {
        userId: employer.id,
        companyId: acme.id,
        workEmail:
          "employer@acme.example",
        status: "APPROVED",
        decidedAt: new Date()
      }
    });

  const responseCount =
    await prisma.companyResponse.count({
      where: {
        companyId: acme.id
      }
    });

  if (responseCount === 0) {
    await prisma.companyResponse.create({
      data: {
        companyId: acme.id,
        claimId: employerClaim.id,

        body:
          "We appreciate employees sharing constructive feedback. Over the past year we have introduced clearer workload planning, additional manager training and a revised career progression framework.",

        authorLabel:
          "Acme Technologies representative",

        autoFlags: [],
        isDemo: true,
        status: "APPROVED"
      }
    });
  }

  console.log("");
  console.log("LinkedOut seeded.");
  console.log("");
  console.log(
    `Admin: ${adminEmail}`
  );
  console.log(
    `Admin password: ${adminPassword}`
  );
  console.log("");
  console.log(
    "Employer demo: employer@acme.example"
  );
  console.log(
    `Employer password: ${demoPassword}`
  );
  console.log("");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
