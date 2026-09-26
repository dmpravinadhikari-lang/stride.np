/**
 * The handful of facts the privacy policy and the terms are built from.
 *
 * They live in one place because they are the parts that change when the
 * business changes: where the servers are, who the company is, which address
 * a complaint goes to. A policy with those details scattered through its
 * prose is a policy that quietly goes out of date.
 *
 * EVERY VALUE HERE IS A STATEMENT OF FACT PUBLISHED TO THE WORLD. Check each
 * one before launch, and change it here the day any of it changes.
 */
export const LEGAL = {
  /** The name Stride trades under, until the company is registered. */
  entity: "Stride",
  /** Where the company is run from. */
  place: "Kathmandu, Nepal",

  /**
   * Where the data actually sits.
   *
   * Named rather than waved at, because "the cloud" tells a consultancy
   * nothing about who can reach their students' passports. Change this the
   * day the hosting changes.
   */
  hosting: { provider: "Contabo GmbH", country: "Germany" },

  /** Addresses that must exist and be read by a person before launch. */
  contact: {
    general: "hello@stride.com.np",
    privacy: "privacy@stride.com.np",
    security: "security@stride.com.np",
  },

  /** The day the current wording took effect. */
  updated: "26 September 2026",

  /**
   * Who else touches the data, and for what.
   *
   * Only the ones that are actually wired up. A list padded with services we
   * might use one day is a list nobody can verify, and the point of naming
   * them is that a consultancy can.
   */
  processors: [
    {
      name: "Contabo GmbH",
      country: "Germany",
      what: "The servers Stride runs on, and where the database and documents are stored.",
    },
    {
      name: "Google",
      country: "United States",
      what: "Sign in with Google, for anybody who chooses it. Google is told nothing about what happens afterwards.",
    },
    {
      name: "Google Analytics",
      country: "United States",
      what: "Visitor counts on the public pages only, with the address shortened. Never inside the console, and never on a parent's progress page.",
    },
    {
      name: "Anthropic",
      country: "United States",
      what: "The AI practice tools, when a consultancy has them switched on. It receives what the student wrote in the tool they are using, and nothing else from their file.",
    },
    {
      name: "Sparrow SMS",
      country: "Nepal",
      what: "Text message reminders, if a consultancy turns them on.",
    },
    {
      name: "The email service the deployment is configured with",
      country: "Varies",
      what: "Delivering the product's own email: invitations, the morning list, reminders.",
    },
  ],
} as const;
