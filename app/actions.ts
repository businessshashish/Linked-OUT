"use server";

import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import prisma from "@/lib/prisma";

import {
  createSession,
  destroySession,
  hashPassword,
  requireAdmin,
  requireUser,
  getCurrentUser,
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
  const returnTo = safeReturnTo(String(formData.get("returnTo") || ""));
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
  await trackFunnelEventAction("signup_completed");

  await createSession(user.id);

  redirect(returnTo || "/");
}

export async function loginAction(
  formData: FormData
) {
  const returnTo = safeReturnTo(String(formData.get("returnTo") || ""));
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

  redirect(returnTo || "/");
}

function safeReturnTo(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "";
}

async function enforceActionRateLimit(actorUserId: string, action: string, maximum: number, windowMs: number) {
  const attempts = await prisma.auditLog.count({
    where: { actorUserId, action, createdAt: { gte: new Date(Date.now() - windowMs) } }
  });
  if (attempts >= maximum) {
    throw new Error("Please wait before trying that again.");
  }
}

export async function logoutAction() {
  await destroySession();

  redirect("/");
}

const funnelEvents = new Set(["landing_view", "company_view", "share_started", "ai_interview_started", "ai_interview_completed", "share_form_completed", "signup_started", "signup_completed", "story_submitted", "story_approved"]);

/** Aggregate funnel telemetry only—never tie attribution to an anonymous public story. */
export async function trackFunnelEventAction(event: string, source?: string) {
  if (!funnelEvents.has(event)) return;
  await prisma.auditLog.create({ data: { action: `FUNNEL_${event.toUpperCase()}`, entityType: "FUNNEL", metadata: { source: source?.slice(0, 120) || null } } });
}

export async function requestCompanyAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const website = String(formData.get("website") || "").trim();
  if (name.length < 2 || name.length > 160) errorRedirect("/", "Enter a valid company name.");
  const user = await getCurrentUser();
  await prisma.companyRequest.create({ data: { name, website: website || undefined, requesterId: user?.id } });
  redirect(`/?requested=${encodeURIComponent(name)}`);
}

function parseStoryForm(formData: FormData) {
  const primaryReason = String(formData.get("primaryReason") || "");
  const otherReasons = formData
    .getAll("otherReasons")
    .map(String)
    .filter((reason, index, values) => reason !== primaryReason && values.indexOf(reason) === index);

  return storySchema.safeParse({
    companyId: String(formData.get("companyId") || ""),
    roleFamily: String(formData.get("roleFamily") || "").trim(),
    location: String(formData.get("country") || "").trim() || null,
    primaryReason,
    otherReasons,
    positiveExperience: String(formData.get("positiveExperience") || "").trim(),
    reasonForLeaving: String(formData.get("reasonForLeaving") || "").trim(),
    wishIKnew: String(formData.get("wishIKnew") || "").trim(),
    recommendCompany: String(formData.get("recommendCompany") || ""),
    workHereAgain: String(formData.get("workHereAgain") || "")
  });
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

  await enforceActionRateLimit(user.id, "STORY_SUBMITTED", 5, 60 * 60 * 1000);

  const parsed = parseStoryForm(formData);

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

  const story = await prisma.exitStory.create({
    data: {
      companyId: company.id,

      publicIdentityId:
        user.publicIdentity.id,

      authorAlias:
        user.publicIdentity.alias,

      jobTitle: null,
      roleFamily: parsed.data.roleFamily,
      location: parsed.data.location,
      tenureMonths: null,

      departureType: null,

      primaryReason:
        parsed.data.primaryReason,

      otherReasons:
        parsed.data.otherReasons,

      managementScore: null,
      compensationScore: null,
      workLifeScore: null,
      careerGrowthScore: null,
      learningScore: null,
      cultureScore: null,
      jobSecurityScore: null,

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

      autoFlags
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
  await trackFunnelEventAction("story_submitted");

  revalidatePath(
    `/company/${company.slug}`
  );

  redirect(
    `/company/${company.slug}?submitted=1`
  );
}

export async function updateStoryAction(formData: FormData) {
  const user = await requireUser();
  const storyId = String(formData.get("storyId") || "");
  await enforceActionRateLimit(user.id, "STORY_UPDATED", 10, 60 * 60 * 1000);
  const parsed = parseStoryForm(formData);

  if (!parsed.success) {
    errorRedirect(`/submit?edit=${encodeURIComponent(storyId)}`, parsed.error.issues[0]?.message || "Invalid story");
  }

  const existing = await prisma.exitStory.findFirst({
    where: {
      id: storyId,
      publicIdentity: { userId: user.id }
    },
    include: { company: true }
  });

  if (!existing) {
    errorRedirect("/account", "That experience is no longer available to edit.");
  }

  const company = await prisma.company.findUnique({ where: { id: parsed.data.companyId } });
  if (!company) {
    errorRedirect(`/submit?edit=${encodeURIComponent(storyId)}`, "Company does not exist.");
  }

  const duplicate = await prisma.exitStory.findFirst({
    where: {
      id: { not: existing.id },
      publicIdentityId: existing.publicIdentityId,
      companyId: company.id
    }
  });
  if (duplicate) {
    errorRedirect(`/submit?edit=${encodeURIComponent(storyId)}`, "You already have an experience for this company.");
  }

  const autoFlags = combinedStoryFlags([
    parsed.data.positiveExperience,
    parsed.data.reasonForLeaving,
    parsed.data.wishIKnew
  ]);

  await prisma.exitStory.update({
    where: { id: existing.id },
    data: {
      companyId: company.id,
      jobTitle: null,
      roleFamily: parsed.data.roleFamily,
      location: parsed.data.location,
      tenureMonths: null,
      departureType: null,
      primaryReason: parsed.data.primaryReason,
      otherReasons: parsed.data.otherReasons,
      managementScore: null,
      compensationScore: null,
      workLifeScore: null,
      careerGrowthScore: null,
      learningScore: null,
      cultureScore: null,
      jobSecurityScore: null,
      positiveExperience: parsed.data.positiveExperience,
      reasonForLeaving: parsed.data.reasonForLeaving,
      wishIKnew: parsed.data.wishIKnew,
      recommendCompany: parsed.data.recommendCompany,
      workHereAgain: parsed.data.workHereAgain,
      autoFlags,
      status: "PENDING",
      moderationNote: null,
      publishedAt: null
    }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: "STORY_UPDATED",
      entityType: "EXIT_STORY",
      entityId: existing.id,
      metadata: { companyId: company.id, autoFlags }
    }
  });

  revalidatePath(`/company/${existing.company.slug}`);
  revalidatePath(`/company/${company.slug}`);
  revalidatePath("/account");
  redirect("/account?success=Experience+updated+and+sent+back+for+moderation");
}

export async function deleteStoryAction(formData: FormData) {
  const user = await requireUser();
  const storyId = String(formData.get("storyId") || "");
  const story = await prisma.exitStory.findFirst({
    where: { id: storyId, publicIdentity: { userId: user.id } },
    include: { company: true }
  });

  if (!story) {
    errorRedirect("/account", "That experience is no longer available to delete.");
  }

  await prisma.exitStory.delete({ where: { id: story.id } });
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: "STORY_DELETED",
      entityType: "EXIT_STORY",
      entityId: story.id,
      metadata: { companyId: story.companyId }
    }
  });

  revalidatePath(`/company/${story.company.slug}`);
  revalidatePath("/account");
  redirect("/account?success=Experience+deleted");
}

export async function requestVerificationAction(
  formData: FormData
) {
  const user = await requireUser();
  await enforceActionRateLimit(user.id, "VERIFICATION_REQUESTED", 5, 24 * 60 * 60 * 1000);

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

  await prisma.auditLog.create({ data: { actorUserId: user.id, action: "VERIFICATION_REQUESTED", entityType: "EMPLOYMENT_VERIFICATION" } });

  redirect(
    "/account?success=Verification+request+submitted"
  );
}

export async function reportStoryAction(
  formData: FormData
) {
  const user = await requireUser();
  await enforceActionRateLimit(user.id, "STORY_REPORTED", 15, 24 * 60 * 60 * 1000);

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

  await prisma.auditLog.create({ data: { actorUserId: user.id, action: "STORY_REPORTED", entityType: "CONTENT_REPORT", entityId: storyId } });

  redirect(
    `/company/${story.company.slug}?reported=1`
  );
}

export async function submitEmployerClaimAction(
  formData: FormData
) {
  const user = await requireUser();
  await enforceActionRateLimit(user.id, "EMPLOYER_CLAIM_REQUESTED", 5, 24 * 60 * 60 * 1000);

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

  await prisma.auditLog.create({ data: { actorUserId: user.id, action: "EMPLOYER_CLAIM_REQUESTED", entityType: "EMPLOYER_CLAIM" } });

  redirect(
    "/employer?success=Company+claim+submitted"
  );
}

export async function submitCompanyResponseAction(
  formData: FormData
) {
  const user = await requireUser();
  await enforceActionRateLimit(user.id, "COMPANY_RESPONSE_SUBMITTED", 10, 24 * 60 * 60 * 1000);

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

  const response = await prisma.companyResponse.create({
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

  await prisma.auditLog.create({ data: { actorUserId: user.id, action: "COMPANY_RESPONSE_SUBMITTED", entityType: "COMPANY_RESPONSE", entityId: response.id } });

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
  if (decision === "APPROVE") await trackFunnelEventAction("story_approved");

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

  if (!["APPROVE", "REJECT"].includes(decision)) {
    throw new Error("Invalid verification decision");
  }

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
      decidedAt: new Date(),
      ...(decision === "APPROVE" ? { workEmail: null, evidenceNote: null } : {})
    }
  });

  await prisma.auditLog.create({ data: { actorUserId: admin.id, action: decision === "APPROVE" ? "VERIFICATION_APPROVED" : "VERIFICATION_REJECTED", entityType: "EMPLOYMENT_VERIFICATION", entityId: id } });

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

  if (!["APPROVE", "REJECT"].includes(decision)) {
    throw new Error("Invalid claim decision");
  }

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

  await prisma.auditLog.create({ data: { actorUserId: admin.id, action: decision === "APPROVE" ? "CLAIM_APPROVED" : "CLAIM_REJECTED", entityType: "EMPLOYER_CLAIM", entityId: id } });

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

  if (!["APPROVE", "REJECT"].includes(decision)) {
    throw new Error("Invalid response decision");
  }

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

  await prisma.auditLog.create({ data: { actorUserId: admin.id, action: decision === "APPROVE" ? "COMPANY_RESPONSE_APPROVED" : "COMPANY_RESPONSE_REJECTED", entityType: "COMPANY_RESPONSE", entityId: id } });

  revalidatePath("/admin");
  revalidatePath(
    `/company/${response.company.slug}`
  );
}

export async function resolveReportAction(
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

  if (!["DISMISS", "RESOLVE"].includes(decision)) {
    throw new Error("Invalid report decision");
  }

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

  await prisma.auditLog.create({ data: { actorUserId: admin.id, action: decision === "DISMISS" ? "REPORT_DISMISSED" : "REPORT_RESOLVED", entityType: "CONTENT_REPORT", entityId: id } });

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
