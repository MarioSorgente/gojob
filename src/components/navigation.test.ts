import { describe, expect, it } from "vitest";
import { activeNavHref, type NavItem } from "./navigation";

/**
 * Detail routes used to highlight nothing, so opening a job or a candidate
 * cleared the whole nav and the user lost their sense of place.
 */

const CANDIDATE: NavItem[] = [
  { href: "/candidate", label: "For you", icon: "search" },
  { href: "/candidate/search", label: "Search", icon: "search" },
  { href: "/candidate/invitations", label: "Invites", icon: "search" },
  { href: "/candidate/matches", label: "Chats", icon: "search" },
  { href: "/candidate/profile", label: "Profile", icon: "search" },
];

const EMPLOYER: NavItem[] = [
  { href: "/employer", label: "Jobs", icon: "search" },
  { href: "/employer/candidates", label: "Find", icon: "search" },
  { href: "/employer/shortlist", label: "Shortlist", icon: "search" },
  { href: "/employer/matches", label: "Chats", icon: "search" },
  { href: "/employer/business", label: "Venue", icon: "search" },
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
      { href: "/employer", label: "Jobs", icon: "search" },
      { href: "/employer/candidates", label: "Find", icon: "search" },
      { href: "/employer/candidates/saved", label: "Saved", icon: "search" },
    ];
    expect(activeNavHref("/employer/candidates/saved/x", items)).toBe(
      "/employer/candidates/saved",
    );
  });

  it("keeps Chats selected while reading a conversation", () => {
    // A conversation lives at /candidate/chat/{id}, outside /candidate/matches.
    // Without `owns` it fell back to the section root and lit up "For you"
    // while the user was mid-conversation.
    const withOwns: NavItem[] = CANDIDATE.map((i) =>
      i.href === "/candidate/matches" ? { ...i, owns: ["/candidate/chat"] } : i,
    );
    expect(activeNavHref("/candidate/chat/abc123", withOwns)).toBe(
      "/candidate/matches",
    );

    const employer: NavItem[] = EMPLOYER.map((i) =>
      i.href === "/employer/matches" ? { ...i, owns: ["/employer/chat"] } : i,
    );
    expect(activeNavHref("/employer/chat/abc123", employer)).toBe(
      "/employer/matches",
    );
  });

  it("prefers a real sub-route over an owned prefix", () => {
    const items: NavItem[] = [
      { href: "/candidate", label: "For you", icon: "search" },
      { href: "/candidate/matches", label: "Chats", icon: "chat", owns: ["/candidate"] },
      { href: "/candidate/search", label: "Search", icon: "search" },
    ];
    expect(activeNavHref("/candidate/search", items)).toBe("/candidate/search");
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
