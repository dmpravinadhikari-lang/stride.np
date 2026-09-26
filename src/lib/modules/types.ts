import type { PlanId } from "@/lib/plans";
import type { Role } from "@/lib/auth/roles";

/**
 * A module manifest. This is the whole "adding features later" story:
 * describe the feature once here, and it appears in the sidebar for the right
 * people, locked behind the right plan, metered, and listed in the admin
 * panel, without another file being edited.
 */
export type ModuleDef = {
  id: string;
  name: string;
  summary: string;
  /** Emoji is deliberate: no icon library to install, renders everywhere. */
  icon: string;
  route: string;
  /** Which plans unlock it. */
  plans: PlanId[];
  /** Who may open it. */
  roles: Role[];
  /** Credits charged per AI action inside the module. */
  credits: Record<string, number>;
  /** "live" is built; "planned" shows in the sidebar as coming, which is how
   *  a consultancy sees the roadmap without you writing a slide about it. */
  status: "live" | "planned";
  phase: number;
  group: "Prepare" | "Apply" | "Decide" | "Manage";

  /**
   * Where this feature is allowed to be used.
   *
   *  "public", a calculation or a lookup. It costs nothing to run, so it is
   *               open to anyone on officeyak.np with no account at all. These are
   *               how a student finds us, and how a consultancy shows a walk-in
   *               something useful in the first two minutes.
   *
   *  "member"  . The real product. Anything that costs money per use, holds a
   *               student's documents, or represents a consultancy's work with
   *               them. Reachable only after logging in through a consultancy.
   *
   *  "staff", the CRM itself. Never visible to a student.
   */
  access: "public" | "member" | "staff";

  /**
   * Whether a consultancy may switch this on and off for an individual
   * student. False for things that are structural rather than optional.
   */
  perStudent?: boolean;
};
