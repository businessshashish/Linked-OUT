"use server";

import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import prisma from "@/lib/prisma";

import {
  createSession,
  destroySession,
  hashPassword,
  requireAdmin,
  requireUser,
  verifyPassword
} from "@/lib/session";

import {
  signupSchema,
  storySchema
} from "@/lib/validation";

import {
  combinedStoryFlags,
  moderationFlags
} from "@/lib/moderation";

import {
  DEMO_DATA_COOKIE,
  isDemoDataEnabled
} from "@/lib/demo-data";

export async function toggleDemoDataAction(formData: FormData) {
  const nextValue = (await isDemoDataEnabled()) ? "off" : "on";

  (await cookies()).set(DEMO_DATA_COOKIE, nextValue, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });

  revalidatePath("/", "layout");
}

export async function updateProfilePhotoAction(formData: FormData) {
  const user = await requireUser();
  const file = formData.get("profilePhoto");

  if (!(file instanceof File) || file.size === 0) {
    errorRedirect("/account", "Choose an image to upload.");
  }

  if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
    errorRedirect("/account", "Profile photos must be images smaller than 5 MB.");
  }

  const extension = file.type.split("/")[1]?.replace("jpeg", "jpg");
  if (!extension || !["jpg", "png", "gif", "webp"].includes(extension)) {
    errorRedirect("/account", "Use a JPG, PNG, GIF, or WebP image.");
  }

  const filename = `${user.id}.${extension}`;
  const imageBuffer = Buffer.from(await file.arrayBuffer());
  const avatarUrl = process.env.VERCEL
    ? `data:${file.type};base64,${imageBuffer.toString("base64")}`
    : `/uploads/profile/${filename}`;

  if (!process.env.VERCEL) {
    const directory = path.join(process.cwd(), "public", "uploads", "profile");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), imageBuffer);

    if (user.avatarUrl?.startsWith("/uploads/")) {
      await unlink(path.join(process.cwd(), "public", user.avatarUrl.replace(/^\//, ""))).catch(() => undefined);
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl }
  });

  revalidatePath("/", "layout");
  redirect("/account?success=Profile+photo+updated");
}

function errorRedirect(
  path: string,
  message: string
): never {
  redirect(
    `${path}?error=${encodeURIComponent(message)}`
  );
}

function makeAlias() {
  return `Anonymous Employee • ${randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;
}

export async function signupAction(
  formData: FormData
) {
  const parsed = signupSchema.safeParse({
    email: String(formData.get("email") || "")
      .trim()
      .toLowerCase(),

    password: String(
      formData.get("password") || ""
    )
  });

  if (!parsed.success) {
    errorRedirect(
      "/signup",
      parsed.error.issues[0]?.message ||
        "Invalid signup details"
    );
  }

  const existing = await prisma.user.findUnique({
    where: {
      email: parsed.data.email
    }
  });

  if (existing) {
    errorRedirect(
      "/signup",
      "An account already exists with that email."
    );
  }

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,

      passwordHash: hashPassword(
        parsed.data.password
      ),

      publicIdentity: {
        create: {
          alias: makeAlias()
        }
      }
    }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: "USER_CREATED",
      entityType: "USER",
      entityId: user.id
    }
  });

  await createSession(user.id);

  redirect("/");
}

export async function loginAction(
  formData: FormData
) {
  const email = String(
    formData.get("email") || ""
  )
    .trim()
    .toLowerCase();

  const password = String(
    formData.get("password") || ""
  );

  const user = await prisma.user.findUnique({
    where: {
      email
    }
  });

  if (
    !user ||
    !verifyPassword(password, user.passwordHash)
  ) {
    errorRedirect(
      "/login",
      "Incorrect email or password."
    );
  }

  await createSession(user.id);

  redirect("/");
}

export async function logoutAction() {
  await destroySession();

  redirect("/");
}

export async function createStoryAction(
  formData: FormData
) {
  const user = await requireUser();

  if (!user.publicIdentity) {
    throw new Error(
      "Public identity is missing for this account"
    );
  }

  const primaryReason = String(
    formData.get("primaryReason") || ""
  );

  const secondary = formData
    .getAll("otherReasons")
    .map(String)
    .filter(
      (reason, index, array) =>
        reason !== primaryReason &&
        array.indexOf(reason) === index
    )
    .slice(0, 2);

  const parsed = storySchema.safeParse({
    companyId: String(
      formData.get("companyId") || ""
    ),

    jobTitle: String(
      formData.get("jobTitle") || ""
    ).trim(),

    roleFamily: String(
      formData.get("roleFamily") || ""
    ).trim(),

    location: String(
      formData.get("location") || ""
    ).trim(),

    tenureMonths: Number(
      formData.get("tenureMonths")
    ),

    departureType: String(
      formData.get("departureType") || ""
    ),

    primaryReason,
    otherReasons: secondary,

    managementScore: Number(
      formData.get("managementScore")
    ),

    compensationScore: Number(
      formData.get("compensationScore")
    ),

    workLifeScore: Number(
      formData.get("workLifeScore")
    ),

    careerGrowthScore: Number(
      formData.get("careerGrowthScore")
    ),

    learningScore: Number(
      formData.get("learningScore")
    ),

    cultureScore: Number(
      formData.get("cultureScore")
    ),

    jobSecurityScore: Number(
      formData.get("jobSecurityScore")
    ),

    positiveExperience: String(
      formData.get("positiveExperience") || ""
    ).trim(),

    reasonForLeaving: String(
      formData.get("reasonForLeaving") || ""
    ).trim(),

    wishIKnew: String(
      formData.get("wishIKnew") || ""
    ).trim(),

    recommendCompany: String(
      formData.get("recommendCompany") || ""
    ),

    workHereAgain: String(
      formData.get("workHereAgain") || ""
    )
  });

  if (!parsed.success) {
    errorRedirect(
      "/submit",
      parsed.error.issues[0]?.message ||
        "Invalid story"
    );
  }

  const company = await prisma.company.findUnique({
    where: {
      id: parsed.data.companyId
    }
  });

  if (!company) {
    errorRedirect(
      "/submit",
      "Company does not exist."
    );
  }

  const existingStory =
    await prisma.exitStory.findFirst({
      where: {
        publicIdentityId:
          user.publicIdentity.id,

        companyId: company.id
      }
    });

  if (existingStory) {
    errorRedirect(
      `/company/${company.slug}`,
      "You have already submitted an experience for this company."
    );
  }

  const autoFlags = combinedStoryFlags([
    parsed.data.positiveExperience,
    parsed.data.reasonForLeaving,
    parsed.data.wishIKnew
  ]);

  const imageFile = formData.get("experienceImage");
  let imageUrl: string | undefined;

  if (imageFile instanceof File && imageFile.size > 0) {
    if (!imageFile.type.startsWith("image/") || imageFile.size > 5 * 1024 * 1024) {
      errorRedirect("/submit", "Experience images must be images smaller than 5 MB.");
    }

    const imageName = `${randomBytes(16).toString("hex")}.jpg`;
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

    if (process.env.VERCEL) {
      imageUrl = `data:${imageFile.type};base64,${imageBuffer.toString("base64")}`;
    } else {
      const imageDirectory = path.join(process.cwd(), "public", "uploads", "experience");
      await mkdir(imageDirectory, { recursive: true });
      await writeFile(path.join(imageDirectory, imageName), imageBuffer);
      imageUrl = `/uploads/experience/${imageName}`;
    }
  }

  const story = await prisma.exitStory.create({
    data: {
      companyId: company.id,

      publicIdentityId:
        user.publicIdentity.id,

      authorAlias:
        user.publicIdentity.alias,

      jobTitle: parsed.data.jobTitle,
      roleFamily: parsed.data.roleFamily,
      location: parsed.data.location,
      tenureMonths: parsed.data.tenureMonths,

      departureType:
        parsed.data.departureType,

      primaryReason:
        parsed.data.primaryReason,

      otherReasons:
        parsed.data.otherReasons,

      managementScore:
        parsed.data.managementScore,

      compensationScore:
        parsed.data.compensationScore,

      workLifeScore:
        parsed.data.workLifeScore,

      careerGrowthScore:
        parsed.data.careerGrowthScore,

      learningScore:
        parsed.data.learningScore,

      cultureScore:
        parsed.data.cultureScore,

      jobSecurityScore:
        parsed.data.jobSecurityScore,

      positiveExperience:
        parsed.data.positiveExperience,

      reasonForLeaving:
        parsed.data.reasonForLeaving,

      wishIKnew:
        parsed.data.wishIKnew,

      recommendCompany:
        parsed.data.recommendCompany,

      workHereAgain:
        parsed.data.workHereAgain,

      autoFlags,
      imageUrl
    }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: "STORY_SUBMITTED",
      entityType: "EXIT_STORY",
      entityId: story.id,
      metadata: {
        companyId: company.id,
        autoFlags
      }
    }
  });

  revalidatePath(
    `/company/${company.slug}`
  );

  redirect(
    `/company/${company.slug}?submitted=1`
  );
}

export async function requestVerificationAction(
  formData: FormData
) {
  const user = await requireUser();

  const companyId = String(
    formData.get("companyId") || ""
  );

  const method = String(
    formData.get("method") || ""
  );

  const workEmail = String(
    formData.get("workEmail") || ""
  ).trim();

  const evidenceNote = String(
    formData.get("evidenceNote") || ""
  ).trim();

  if (
    !["WORK_EMAIL", "DOCUMENT", "OTHER"].includes(
      method
    )
  ) {
    errorRedirect(
      "/account",
      "Choose a valid verification method."
    );
  }

  const company = await prisma.company.findUnique({
    where: {
      id: companyId
    }
  });

  if (!company) {
    errorRedirect(
      "/account",
      "Company was not found."
    );
  }

  if (
    method === "WORK_EMAIL" &&
    !workEmail.includes("@")
  ) {
    errorRedirect(
      "/account",
      "Enter the work email you used."
    );
  }

  if (
    method !== "WORK_EMAIL" &&
    evidenceNote.length < 10
  ) {
    errorRedirect(
      "/account",
      "Describe what employment proof you can provide."
    );
  }

  await prisma.employmentVerification.upsert({
    where: {
      userId_companyId: {
        userId: user.id,
        companyId
      }
    },

    create: {
      userId: user.id,
      companyId,
      method: method as
        | "WORK_EMAIL"
        | "DOCUMENT"
        | "OTHER",
      workEmail: workEmail || null,
      evidenceNote: evidenceNote || null
    },

    update: {
      method: method as
        | "WORK_EMAIL"
        | "DOCUMENT"
        | "OTHER",
      workEmail: workEmail || null,
      evidenceNote: evidenceNote || null,
      status: "PENDING",
      moderatorNote: null,
      decidedAt: null
    }
  });

  redirect(
    "/account?success=Verification+request+submitted"
  );
}

export async function reportStoryAction(
  formData: FormData
) {
  const user = await requireUser();

  const storyId = String(
    formData.get("storyId") || ""
  );

  const reason = String(
    formData.get("reason") || ""
  ).trim();

  const details = String(
    formData.get("details") || ""
  ).trim();

  if (reason.length < 3) {
    throw new Error(
      "A report reason is required"
    );
  }

  const story = await prisma.exitStory.findUnique({
    where: {
      id: storyId
    },

    include: {
      company: true,
      publicIdentity: true
    }
  });

  if (!story) {
    throw new Error("Story not found");
  }

  if (
    story.publicIdentity?.userId === user.id
  ) {
    redirect(
      `/company/${story.company.slug}?error=${encodeURIComponent(
        "You cannot report your own story."
      )}`
    );
  }

  await prisma.contentReport.create({
    data: {
      reporterId: user.id,
      storyId,
      reason,
      details: details || null
    }
  });

  redirect(
    `/company/${story.company.slug}?reported=1`
  );
}

export async function submitEmployerClaimAction(
  formData: FormData
) {
  const user = await requireUser();

  const companyId = String(
    formData.get("companyId") || ""
  );

  const workEmail = String(
    formData.get("workEmail") || ""
  )
    .trim()
    .toLowerCase();

  if (!workEmail.includes("@")) {
    errorRedirect(
      "/employer",
      "A corporate email is required."
    );
  }

  const company = await prisma.company.findUnique({
    where: {
      id: companyId
    }
  });

  if (!company) {
    errorRedirect(
      "/employer",
      "Company not found."
    );
  }

  await prisma.employerClaim.upsert({
    where: {
      userId_companyId: {
        userId: user.id,
        companyId
      }
    },

    create: {
      userId: user.id,
      companyId,
      workEmail
    },

    update: {
      workEmail,
      status: "PENDING",
      reviewerNote: null,
      decidedAt: null
    }
  });

  redirect(
    "/employer?success=Company+claim+submitted"
  );
}

export async function submitCompanyResponseAction(
  formData: FormData
) {
  const user = await requireUser();

  const claimId = String(
    formData.get("claimId") || ""
  );

  const storyIdRaw = String(
    formData.get("storyId") || ""
  );

  const body = String(
    formData.get("body") || ""
  ).trim();

  if (body.length < 30 || body.length > 4000) {
    errorRedirect(
      "/employer",
      "Company responses must be between 30 and 4,000 characters."
    );
  }

  const claim = await prisma.employerClaim.findFirst({
    where: {
      id: claimId,
      userId: user.id,
      status: "APPROVED"
    },

    include: {
      company: true
    }
  });

  if (!claim) {
    errorRedirect(
      "/employer",
      "You do not have an approved claim for this company."
    );
  }

  let storyId: string | null = null;

  if (storyIdRaw) {
    const story =
      await prisma.exitStory.findFirst({
        where: {
          id: storyIdRaw,
          companyId: claim.companyId,
          status: "APPROVED"
        }
      });

    if (!story) {
      errorRedirect(
        "/employer",
        "The selected story is invalid."
      );
    }

    storyId = story.id;
  }

  await prisma.companyResponse.create({
    data: {
      companyId: claim.companyId,
      claimId: claim.id,
      storyId,
      body,
      authorLabel:
        `${claim.company.name} representative`,
      autoFlags: moderationFlags(body)
    }
  });

  redirect(
    "/employer?success=Response+sent+for+moderation"
  );
}

export async function moderateStoryAction(
  formData: FormData
) {
  const admin = await requireAdmin();

  const id = String(formData.get("id") || "");
  const decision = String(
    formData.get("decision") || ""
  );

  const note = String(
    formData.get("note") || ""
  ).trim();

  if (
    !["APPROVE", "REJECT"].includes(decision)
  ) {
    throw new Error("Invalid decision");
  }

  const story = await prisma.exitStory.update({
    where: {
      id
    },

    data:
      decision === "APPROVE"
        ? {
            status: "APPROVED",
            publishedAt: new Date(),
            moderationNote: null
          }
        : {
            status: "REJECTED",
            moderationNote:
              note || "Rejected by moderator"
          },

    include: {
      company: true
    }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: admin.id,
      action:
        decision === "APPROVE"
          ? "STORY_APPROVED"
          : "STORY_REJECTED",
      entityType: "EXIT_STORY",
      entityId: id,
      metadata: {
        note
      }
    }
  });

  revalidatePath("/admin");
  revalidatePath(
    `/company/${story.company.slug}`
  );
}

export async function moderateVerificationAction(
  formData: FormData
) {
  const admin = await requireAdmin();

  const id = String(formData.get("id") || "");

  const decision = String(
    formData.get("decision") || ""
  );

  const note = String(
    formData.get("note") || ""
  ).trim();

  await prisma.employmentVerification.update({
    where: {
      id
    },

    data: {
      status:
        decision === "APPROVE"
          ? "APPROVED"
          : "REJECTED",

      moderatorNote: note || null,

      reviewedById: admin.id,
      decidedAt: new Date()
    }
  });

  revalidatePath("/admin");
}

export async function moderateClaimAction(
  formData: FormData
) {
  const admin = await requireAdmin();

  const id = String(formData.get("id") || "");

  const decision = String(
    formData.get("decision") || ""
  );

  const note = String(
    formData.get("note") || ""
  ).trim();

  await prisma.employerClaim.update({
    where: {
      id
    },

    data: {
      status:
        decision === "APPROVE"
          ? "APPROVED"
          : "REJECTED",

      reviewerNote: note || null,

      reviewedById: admin.id,
      decidedAt: new Date()
    }
  });

  revalidatePath("/admin");
  revalidatePath("/employer");
}

export async function moderateResponseAction(
  formData: FormData
) {
  const admin = await requireAdmin();

  const id = String(formData.get("id") || "");

  const decision = String(
    formData.get("decision") || ""
  );

  const note = String(
    formData.get("note") || ""
  ).trim();

  const response =
    await prisma.companyResponse.update({
      where: {
        id
      },

      data: {
        status:
          decision === "APPROVE"
            ? "APPROVED"
            : "REJECTED",

        moderationNote: note || null,
        moderatedById: admin.id
      },

      include: {
        company: true
      }
    });

  revalidatePath("/admin");
  revalidatePath(
    `/company/${response.company.slug}`
  );
}

export async function resolveReportAction(
  formData: FormData
) {
  await requireAdmin();

  const id = String(formData.get("id") || "");

  const decision = String(
    formData.get("decision") || ""
  );

  const note = String(
    formData.get("note") || ""
  ).trim();

  await prisma.contentReport.update({
    where: {
      id
    },

    data: {
      status:
        decision === "DISMISS"
          ? "DISMISSED"
          : "RESOLVED",

      resolutionNote: note || null
    }
  });

  revalidatePath("/admin");
}

export async function deleteAccountAction(
  formData: FormData
) {
  const user = await requireUser();

  const confirmation = String(
    formData.get("confirmation") || ""
  );

  if (confirmation !== "DELETE") {
    errorRedirect(
      "/account",
      "Type DELETE exactly to remove the account."
    );
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: "USER_ACCOUNT_DELETED",
      entityType: "USER",
      entityId: user.id
    }
  });

  await prisma.user.delete({
    where: {
      id: user.id
    }
  });

  await destroySession();

  redirect("/");
}
