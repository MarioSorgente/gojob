"use client";

import { useMemo, useState, useTransition } from "react";
import { saveCandidateProfile } from "@/app/candidate/onboarding/actions";
import type { CandidateOnboardingInput } from "@/lib/forms";
import {
  AREAS,
  AVAILABILITY_TYPES,
  EMPLOYMENT_TYPES,
  LANGUAGES,
  PROFICIENCY_LEVELS,
  ROLES,
  SALARY_TYPES,
  SKILL_SEED,
  type ProficiencyLevel,
  type SalaryType,
} from "@/lib/taxonomy";
import {
  Alert,
  Button,
  Chip,
  Field,
  Input,
  SectionCard,
  Select,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/Icon";

const ROLE_CATEGORY: Record<string, string[]> = {
  Barista: ["Barista", "General"],
  Bartender: ["Bartender", "General"],
  "Waiter / Waitress": ["Service", "General"],
  "Host / Hostess": ["Service", "General"],
  Cashier: ["Service", "General"],
  Chef: ["Kitchen", "General"],
  "Sous Chef": ["Kitchen", "General"],
  Cook: ["Kitchen", "General"],
  "Kitchen Helper": ["Kitchen", "General"],
  Dishwasher: ["Kitchen", "General"],
  Receptionist: ["Front Office", "General"],
  Housekeeping: ["Housekeeping", "General"],
  "Spa Therapist": ["Spa", "General"],
};

function MultiChips({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Chip key={o} active={selected.includes(o)} onClick={() => onToggle(o)}>
          {o}
        </Chip>
      ))}
    </div>
  );
}

const toNum = (v: string): number | null => {
  const n = Number(v.replace(/[^0-9]/g, ""));
  return v.trim() === "" || Number.isNaN(n) ? null : n;
};

export function OnboardingForm({
  defaults,
  submitLabel = "Save & see jobs",
  next,
}: {
  defaults?: Partial<CandidateOnboardingInput>;
  submitLabel?: string;
  /** Where to land after saving (carries a shared job link through signup). */
  next?: string;
}) {
  const [firstName, setFirstName] = useState(defaults?.firstName ?? "");
  const [lastName, setLastName] = useState(defaults?.lastName ?? "");
  const [nationality, setNationality] = useState(defaults?.nationality ?? "");
  const [workEligibility, setWorkEligibility] = useState(
    defaults?.workEligibility ?? false,
  );
  const [area, setArea] = useState(defaults?.area ?? AREAS[0]);
  const [roles, setRoles] = useState<string[]>(defaults?.roles ?? []);
  const [customRole, setCustomRole] = useState("");
  const [employmentTypes, setEmploymentTypes] = useState<string[]>(
    defaults?.employmentTypes ?? [],
  );
  const [salaryType, setSalaryType] = useState<SalaryType>(
    (defaults?.salary?.type as SalaryType) ?? "Monthly",
  );
  const [salaryMin, setSalaryMin] = useState(
    defaults?.salary?.min != null ? String(defaults.salary.min) : "",
  );
  const [salaryMax, setSalaryMax] = useState(
    defaults?.salary?.max != null ? String(defaults.salary.max) : "",
  );
  const [availabilityType, setAvailabilityType] = useState(
    defaults?.availability?.type ?? AVAILABILITY_TYPES[0],
  );
  const [availableFrom, setAvailableFrom] = useState(
    defaults?.availability?.availableFrom ?? "",
  );
  const [languages, setLanguages] = useState<
    { language: string; level: ProficiencyLevel }[]
  >(defaults?.languages ?? [{ language: "Indonesian", level: "Native" }]);
  const [skills, setSkills] = useState<string[]>(
    defaults?.skills?.map((s) => s.name) ?? [],
  );
  const [customSkill, setCustomSkill] = useState("");
  const [experiences, setExperiences] = useState(
    defaults?.experiences ?? [
      { companyName: "", role: "", startDate: "", endDate: "", current: false, description: "" },
    ],
  );

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const suggestedSkills = useMemo(() => {
    const cats = new Set<string>(["General"]);
    roles.forEach((r) => (ROLE_CATEGORY[r] ?? ["General"]).forEach((c) => cats.add(c)));
    const names = SKILL_SEED.filter((s) => cats.has(s.category)).map((s) => s.name);
    return [...new Set([...names, ...skills])];
  }, [roles, skills]);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  function addCustom(value: string, list: string[], set: (v: string[]) => void, clear: () => void) {
    const v = value.trim();
    if (v && !list.includes(v)) set([...list, v]);
    clear();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }
    if (roles.length === 0) {
      setError("Select at least one role you're looking for.");
      return;
    }
    const payload: CandidateOnboardingInput = {
      firstName,
      lastName,
      nationality,
      workEligibility,
      area,
      roles,
      employmentTypes,
      salary: { type: salaryType, min: toNum(salaryMin), max: toNum(salaryMax) },
      availability: {
        type: availabilityType,
        availableFrom: availabilityType === "Custom date" ? availableFrom || null : null,
      },
      languages: languages.filter((l) => l.language),
      skills: skills.map((name) => ({ name })),
      experiences: experiences.map((e) => ({
        ...e,
        endDate: e.current ? null : e.endDate || null,
      })),
    };
    startTransition(() => saveCandidateProfile(payload, next));
  }

  return (
    <form onSubmit={submit} className="space-y-4 pb-24">
      <SectionCard title="About you">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </Field>
          <Field label="Last name">
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </Field>
        </div>
        <Field label="Nationality">
          <Input
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            placeholder="Indonesian"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={workEligibility}
            onChange={(e) => setWorkEligibility(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-[var(--brand)]"
          />
          I confirm I&apos;m legally allowed to work in Bali.
        </label>
      </SectionCard>

      <SectionCard title="Location">
        <Field label="Which area are you in?">
          <Select value={area} onChange={(e) => setArea(e.target.value)}>
            {AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </Select>
        </Field>
      </SectionCard>

      <SectionCard title="Desired roles">
        <MultiChips
          options={ROLES.filter((r) => r !== "Other")}
          selected={roles}
          onToggle={(v) => toggle(roles, setRoles, v)}
        />
        <div className="flex gap-2">
          <Input
            value={customRole}
            onChange={(e) => setCustomRole(e.target.value)}
            placeholder="Add another role"
          />
          <Button
            type="button"
            variant="subtle"
            onClick={() => addCustom(customRole, roles, setRoles, () => setCustomRole(""))}
          >
            Add
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Employment type">
        <MultiChips
          options={EMPLOYMENT_TYPES}
          selected={employmentTypes}
          onToggle={(v) => toggle(employmentTypes, setEmploymentTypes, v)}
        />
      </SectionCard>

      <SectionCard title="Salary expectation">
        <Field label="Rate">
          <Select
            value={salaryType}
            onChange={(e) => setSalaryType(e.target.value as SalaryType)}
          >
            {SALARY_TYPES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Minimum (IDR)">
            <Input
              inputMode="numeric"
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value)}
              placeholder="6000000"
            />
          </Field>
          <Field label="Maximum (IDR)">
            <Input
              inputMode="numeric"
              value={salaryMax}
              onChange={(e) => setSalaryMax(e.target.value)}
              placeholder="7000000"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Availability">
        <Select
          value={availabilityType}
          onChange={(e) => setAvailabilityType(e.target.value)}
        >
          {AVAILABILITY_TYPES.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </Select>
        {availabilityType === "Custom date" && (
          <Input
            type="date"
            value={availableFrom}
            onChange={(e) => setAvailableFrom(e.target.value)}
          />
        )}
      </SectionCard>

      <SectionCard title="Languages">
        {languages.map((l, i) => (
          <div key={i} className="flex gap-2">
            <Select
              value={l.language}
              onChange={(e) => {
                const copy = [...languages];
                copy[i] = { ...copy[i], language: e.target.value };
                setLanguages(copy);
              }}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang}>{lang}</option>
              ))}
            </Select>
            <Select
              value={l.level}
              onChange={(e) => {
                const copy = [...languages];
                copy[i] = { ...copy[i], level: e.target.value as ProficiencyLevel };
                setLanguages(copy);
              }}
            >
              {PROFICIENCY_LEVELS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
            <Button
              type="button"
              variant="subtle"
              onClick={() => setLanguages(languages.filter((_, j) => j !== i))}
              aria-label="Remove language"
            >
              <Icon name="close" className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            setLanguages([...languages, { language: "English", level: "Conversational" }])
          }
        >
          + Add language
        </Button>
      </SectionCard>

      <SectionCard title="Skills">
        <MultiChips
          options={suggestedSkills}
          selected={skills}
          onToggle={(v) => toggle(skills, setSkills, v)}
        />
        <div className="flex gap-2">
          <Input
            value={customSkill}
            onChange={(e) => setCustomSkill(e.target.value)}
            placeholder="Add a skill"
          />
          <Button
            type="button"
            variant="subtle"
            onClick={() => addCustom(customSkill, skills, setSkills, () => setCustomSkill(""))}
          >
            Add
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Experience">
        {experiences.map((exp, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-border p-3">
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Venue / business"
                value={exp.companyName}
                onChange={(e) => {
                  const copy = [...experiences];
                  copy[i] = { ...copy[i], companyName: e.target.value };
                  setExperiences(copy);
                }}
              />
              <Input
                placeholder="Job title"
                value={exp.role}
                onChange={(e) => {
                  const copy = [...experiences];
                  copy[i] = { ...copy[i], role: e.target.value };
                  setExperiences(copy);
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-muted">
                Start
                <Input
                  type="date"
                  value={exp.startDate}
                  onChange={(e) => {
                    const copy = [...experiences];
                    copy[i] = { ...copy[i], startDate: e.target.value };
                    setExperiences(copy);
                  }}
                />
              </label>
              <label className={cn("text-xs text-muted", exp.current && "opacity-40")}>
                End
                <Input
                  type="date"
                  value={exp.endDate ?? ""}
                  disabled={exp.current}
                  onChange={(e) => {
                    const copy = [...experiences];
                    copy[i] = { ...copy[i], endDate: e.target.value };
                    setExperiences(copy);
                  }}
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={exp.current}
                onChange={(e) => {
                  const copy = [...experiences];
                  copy[i] = { ...copy[i], current: e.target.checked };
                  setExperiences(copy);
                }}
                className="h-4 w-4 accent-[var(--brand)]"
              />
              I currently work here
            </label>
            <Input
              placeholder="Short description"
              value={exp.description}
              onChange={(e) => {
                const copy = [...experiences];
                copy[i] = { ...copy[i], description: e.target.value };
                setExperiences(copy);
              }}
            />
            {experiences.length > 1 && (
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={() => setExperiences(experiences.filter((_, j) => j !== i))}
              >
                Remove
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            setExperiences([
              ...experiences,
              { companyName: "", role: "", startDate: "", endDate: "", current: false, description: "" },
            ])
          }
        >
          + Add experience
        </Button>
      </SectionCard>

      {error && (
        <Alert tone="danger">{error}</Alert>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-surface/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-md">
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Saving…" : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
