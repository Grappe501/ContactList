import { registerSchema } from "./validate";

export function registerCoreSchemas() {
  // ContactMetadata schema is embedded in ContactCreate/ContactPatch for now.
  const contactMetadata = {
    type: "object",
    required: ["alt_names", "nicknames", "socials", "custom_fields", "flags"],
    additionalProperties: false,
    properties: {
      alt_names: { type: "array", items: { type: "string" } },
      nicknames: { type: "array", items: { type: "string" } },
      socials: { type: "object", additionalProperties: { type: "string" } },
      custom_fields: { type: "object", additionalProperties: { type: ["string", "number", "boolean", "null"] } },
      flags: {
        type: "object",
        required: ["needs_review", "do_not_contact"],
        additionalProperties: false,
        properties: {
          needs_review: { type: "boolean" },
          do_not_contact: { type: "boolean" },
        },
      },
    },
  };

  registerSchema("ContactCreate", {
    type: "object",
    additionalProperties: false,
    required: ["full_name"],
    properties: {
      full_name: { type: "string", minLength: 1 },
      first_name: { type: ["string", "null"] },
      middle_name: { type: ["string", "null"] },
      last_name: { type: ["string", "null"] },
      suffix: { type: ["string", "null"] },
      primary_email: { type: ["string", "null"] },
      primary_phone: { type: ["string", "null"] },
      emails: { type: "array", items: { type: "string" }, default: [] },
      phones: { type: "array", items: { type: "string" }, default: [] },
      street: { type: ["string", "null"] },
      street2: { type: ["string", "null"] },
      city: { type: ["string", "null"] },
      state: { type: ["string", "null"] },
      postal_code: { type: ["string", "null"] },
      country: { type: "string", default: "USA" },
      company: { type: ["string", "null"] },
      title: { type: ["string", "null"] },
      organization: { type: ["string", "null"] },
      website: { type: ["string", "null"] },
      birthday: { type: ["string", "null"] },
      metadata: contactMetadata,
    },
  });

  registerSchema("ContactPatch", {
    type: "object",
    additionalProperties: false,
    properties: {
      full_name: { type: "string", minLength: 1 },
      first_name: { type: ["string", "null"] },
      middle_name: { type: ["string", "null"] },
      last_name: { type: ["string", "null"] },
      suffix: { type: ["string", "null"] },
      primary_email: { type: ["string", "null"] },
      primary_phone: { type: ["string", "null"] },
      emails: { type: "array", items: { type: "string" } },
      phones: { type: "array", items: { type: "string" } },
      street: { type: ["string", "null"] },
      street2: { type: ["string", "null"] },
      city: { type: ["string", "null"] },
      state: { type: ["string", "null"] },
      postal_code: { type: ["string", "null"] },
      country: { type: "string" },
      company: { type: ["string", "null"] },
      title: { type: ["string", "null"] },
      organization: { type: ["string", "null"] },
      website: { type: ["string", "null"] },
      birthday: { type: ["string", "null"] },
      metadata: contactMetadata,
    },
  });
}
