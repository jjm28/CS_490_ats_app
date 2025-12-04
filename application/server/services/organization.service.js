import Organization from "../models/Org/Organization.js";

/**
 * Get branding for the org of the current user.
 * If no organizationId, return default ATS branding.
 */
export async function getBrandingForOrg(organizationId) {
  if (!organizationId) {
    return {
      orgName: "ATS for Candidates",
      logoUrl: "/default-logo.png",
      primaryColor: "#2563eb",
      secondaryColor: "#e5e7eb",
      poweredBy: true,
      isOrgBranded: false,
    };
  }

  const org = await Organization.findById(organizationId).lean();
  if (!org) {
    return {
      orgName: "ATS for Candidates",
      logoUrl: "/default-logo.png",
      primaryColor: "#2563eb",
      secondaryColor: "#e5e7eb",
      poweredBy: true,
      isOrgBranded: false,
    };
  }
console.log(org)
  return {
    orgName: org.name,
    logoUrl: org.logoUrl || "/default-logo.png",
    primaryColor: org.primaryColor || "#2563eb",
    secondaryColor: org.secondaryColor || "#e5e7eb",
    poweredBy: true,
    isOrgBranded: true,
    backgroundcolor: org.backgroundcolor || "#F6F4EF",
    navbarbg: org.navbarbg ||"bg-white"
  };
}

/**
 * Update branding — allowed for super_admin and org_admin.
 */
export async function updateBrandingForOrg(organizationId, updatedFields) {
  const allowed = ["name", "logoUrl", "primaryColor", "secondaryColor"];

  const safe = {};
  for (const field of allowed) {
    if (updatedFields[field] !== undefined) safe[field] = updatedFields[field];
  }

  const org = await Organization.findByIdAndUpdate(
    organizationId,
    { $set: safe },
    { new: true }
  ).lean();

  if (!org) {
    const err = new Error("Organization not found");
    err.statusCode = 404;
    throw err;
  }

  return org;
}
