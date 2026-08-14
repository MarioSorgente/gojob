"use client";

import { useMemo, useState, useTransition } from "react";
import { createJobAction } from "@/app/employer/actions";
import {
  AREAS,
  EMPLOYMENT_TYPES,
  LANGUAGES,
  PROFICIENCY_LEVELS,
  ROLES,
  SALARY_TYPES,
  type ProficiencyLevel,
  type SalaryType,
} from "@/lib/taxonomy";
import { suggestedSkillsForRoles } from "@/lib/skills";
import type { JobInput } from "@/lib/forms";
import {
  Button,
  Chip,
  Field,
  Input,
  SectionCard,
  Select,
  Textarea,
} from "@/components/ui";
import { Icon } from "@/components/Icon";

const toNum = (v: string): number | null => {
  const n = Number(v.replace(/[^0-9]/g, ""));
  return v.trim() === "" || Number.isNaN(n) ? null : n;
};

export function JobForm({ businessArea }: { businessArea: string }) {
  const [role, setRole] = useState<string>("Barista");
  const [customRole, setCustomRole] = useState("");
  const [area, setArea] = useState(businessArea || AREAS[0]);
  const [employmentType, setEmploymentType] = useState<string>(EMPLOYMENT_TYPES[0]);
  const [salaryType, setSalaryType] = useState<SalaryType>("Monthly");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [minExp, setMinExp] = useState("2");
  const [required, setRequired] = useState<string[]>([]);
  const [preferred, setPreferred] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const [languages, setLanguages] = useState<
    { language: string; minimumLevel: ProficiencyLevel }[]
  >([{ language: "English", minimumLevel: "Conversational" }]);
  const [desiredStartDate, setDesiredStartDate] = useState("");
  const [description, setDescription] = useState("");
  const [pending, start] = useTransition();

  const effectiveRole = role === "Other" ? customRole.trim() || "Other" : role;
  const skillPool = useMemo(
    () => suggestedSkillsForRoles([effectiveRole]),
    [effectiveRole],
  );

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload: JobInput = {
      role: effectiveRole,
      area,
      employmentType,
      salaryType,
      salaryMin: toNum(salaryMin),
      salaryMax: toNum(salaryMax),
      minimumExperience: Number(minExp) || 0,
      skills: [
        ...required.map((name) => ({ name, required: true })),
        ...preferred
          .filter((p) => !required.includes(p))
          .map((name) => ({ name, required: false })),
      ],
      languages: languages.filter((l) => l.language),
      desiredStartDate: desiredStartDate || null,
      description: description.trim(),
    };
    start(() => createJobAction(payload));
  }

  return (
    <form onSubmit={submit} className="space-y-4 pb-24">
      <SectionCard title="Role">
        <Select value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>
        {role === "Other" && (
          <Input
            value={customRole}
            onChange={(e) => setCustomRole(e.target.value)}
            placeholder="Enter the role"
          />
        )}
      </SectionCard>

      <SectionCard title="Location & type">
        <Field label="Area">
          <Select value={area} onChange={(e) => setArea(e.target.value)}>
            {AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </Select>
        </Field>
        <Field label="Employment type">
          <Select
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value)}
          >
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
      </SectionCard>

      <SectionCard title="Salary">
        <Select
          value={salaryType}
          onChange={(e) => setSalaryType(e.target.value as SalaryType)}
        >
          {SALARY_TYPES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
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
              placeholder="8000000"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Experience">
        <Field label="Minimum years">
          <Input
            inputMode="numeric"
            value={minExp}
            onChange={(e) => setMinExp(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="2"
          />
        </Field>
      </SectionCard>

      <SectionCard title="Must-have skills">
        <div className="flex flex-wrap gap-2">
          {skillPool.map((s) => (
            <Chip key={s} active={required.includes(s)} onClick={() => toggle(required, setRequired, s)}>
              {s}
            </Chip>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={customSkill}
            onChange={(e) => setCustomSkill(e.target.value)}
            placeholder="Add a required skill"
          />
          <Button
            type="button"
            variant="subtle"
            onClick={() => {
              const v = customSkill.trim();
              if (v && !required.includes(v)) setRequired([...required, v]);
              setCustomSkill("");
            }}
          >
            Add
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Nice-to-have skills">
        <div className="flex flex-wrap gap-2">
          {skillPool
            .filter((s) => !required.includes(s))
            .map((s) => (
              <Chip
                key={s}
                active={preferred.includes(s)}
                onClick={() => toggle(preferred, setPreferred, s)}
              >
                {s}
              </Chip>
            ))}
        </div>
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
              value={l.minimumLevel}
              onChange={(e) => {
                const copy = [...languages];
                copy[i] = { ...copy[i], minimumLevel: e.target.value as ProficiencyLevel };
                setLanguages(copy);
              }}
            >
              {PROFICIENCY_LEVELS.map((p) => (
                <option key={p}>{p}+</option>
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
            setLanguages([...languages, { language: "Indonesian", minimumLevel: "Conversational" }])
          }
        >
          + Add language
        </Button>
      </SectionCard>

      <SectionCard title="When & details">
        <Field label="Desired start date">
          <Input
            type="date"
            value={desiredStartDate}
            onChange={(e) => setDesiredStartDate(e.target.value)}
          />
        </Field>
        <Field label="Description">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the role, shifts, what you're looking for…"
          />
        </Field>
      </SectionCard>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-surface/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-md">
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Publishing…" : "Post job & see candidates"}
          </Button>
        </div>
      </div>
    </form>
  );
}
