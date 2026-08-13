import { describe, expect, it } from "vitest";
import { activeNavHref, type NavItem } from "./navigation";

/**
 * Detail routes used to highlight nothing, so opening a job or a candidate
 * cleared the whole nav and the user lost their sense of place.
 */

const CANDIDATE: NavItem[] = [
  { href: "/candidate", label: "For you", icon: "" },
  { href: "/candidate/search", label: "Search", icon: "" },
  { href: "/candidate/invitations", label: "Invites", icon: "" },
  { href: "/candidate/matches", label: "Chats", icon: "" },
  { href: "/candidate/profile", label: "Profile", icon: "" },
];

const EMPLOYER: NavItem[] = [
  { href: "/employer", label: "Jobs", icon: "" },
  { href: "/employer/candidates", label: "Find", icon: "" },
  { href: "/employer/shortlist", label: "Shortlist", icon: "" },
  { href: "/employer/matches", label: "Chats", icon: "" },
  { href: "/employer/business", label: "Venue", icon: "" },
];

describe("activeNavHref", () => {
  it("matches a tab exactly", () => {
    expect(activeNavHref("/candidate/search", CANDIDATE)).toBe("/candidate/search");
    expect(activeNavHref("/employer/shortlist", EMPLOYER)).toBe("/employer/shortlist");
  });

  it("keeps the section root selected on its own page", () => {
    expect(activeNavHref("/candidate", CANDIDATE)).toBe("/candidate");
    expect(activeNavHref("/employer", EMPLOYER)).toBe("/employer");
  });

  it("does not let the root swallow its siblings", () => {
    // The bug in reverse: /employer must not win over /employer/candidates.
    expect(activeNavHref("/employer/candidates", EMPLOYER)).toBe("/employer/candidates");
  });

  it("highlights the owning tab on a nested detail route", () => {
    expect(activeNavHref("/employer/candidates/abc123", EMPLOYER)).toBe(
      "/employer/candidates",
    );
    expect(activeNavHref("/candidate/invitations/xyz", CANDIDATE)).toBe(
      "/candidate/invitations",
    );
  });

  it("falls back to the section root for routes with no tab of their own", () => {
    // These are the cases that previously highlighted nothing at all.
    expect(activeNavHref("/employer/jobs/abc123", EMPLOYER)).toBe("/employer");
    expect(activeNavHref("/candidate/jobs/abc123", CANDIDATE)).toBe("/candidate");
    expect(activeNavHref("/candidate/applications", CANDIDATE)).toBe("/candidate");
  });

  it("prefers the longest match when tabs nest", () => {
    const items: NavItem[] = [
      { href: "/employer", label: "Jobs", icon: "" },
      { href: "/employer/candidates", label: "Find", icon: "" },
      { href: "/employer/candidates/saved", label: "Saved", icon: "" },
    ];
    expect(activeNavHref("/employer/candidates/saved/x", items)).toBe(
      "/employer/candidates/saved",
    );
  });

  it("returns null when nothing matches", () => {
    expect(activeNavHref("/admin/users", EMPLOYER)).toBeNull();
    expect(activeNavHref("/login", CANDIDATE)).toBeNull();
  });

  it("does not match a tab that is only a string prefix", () => {
    // "/employer/matches" must not be selected by "/employer/matchesX".
    expect(activeNavHref("/employer/matchesX", EMPLOYER)).toBe("/employer");
  });
});
