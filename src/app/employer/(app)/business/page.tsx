import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getBusinessByOwner } from "@/lib/repos/businesses";
import { Badge, ButtonLink, Card, PageTitle } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { getI18n } from "@/lib/i18n/server";
import { areaLabel, businessCategoryLabel } from "@/lib/i18n/taxonomy";
import { BusinessVerificationCard } from "@/components/employer/BusinessVerificationCard";

export default async function BusinessPage() {
  const user = await requireRole("employer");
  const b = await getBusinessByOwner(user.uid);
  if (!b) redirect("/employer/onboarding");

  const { locale, t } = await getI18n();

  return (
    <div className="space-y-4">
      <PageTitle
        title={b.name}
        subtitle={businessCategoryLabel(b.category, locale)}
      />

      <Card className="space-y-2 p-5">
        {b.verificationStatus === "verified" ? (
          <Badge tone="green">
            <Icon name="checkBadge" className="h-3.5 w-3.5" />
            {t("job.verifiedBusiness")}
          </Badge>
        ) : (
          <Badge tone="slate">{t("common.unverified")}</Badge>
        )}
        <p className="flex items-center gap-1.5 text-sm">
          <Icon name="mapPin" className="h-4 w-4 text-muted" />
          {areaLabel(b.area, locale)}
          {b.address ? ` · ${b.address}` : ""}
        </p>
        {b.description && (
          <p className="text-sm leading-6 text-subtle">{b.description}</p>
        )}
        <div className="space-y-1 pt-2 text-sm text-muted">
          {b.instagram && (
            <p className="flex items-center gap-1.5">
              <Icon name="share" className="h-4 w-4" />
              {b.instagram}
            </p>
          )}
          {b.website && (
            <p className="flex items-center gap-1.5">
              <Icon name="language" className="h-4 w-4" />
              {b.website}
            </p>
          )}
          {b.googleMapsUrl && (
            <p className="flex items-center gap-1.5">
              <Icon name="mapPin" className="h-4 w-4" />
              Google Maps
            </p>
          )}
        </div>
      </Card>

      <BusinessVerificationCard
        uid={user.uid}
        name={b.name}
        logo={b.logo}
        status={b.verificationStatus}
      />

      <div className="grid grid-cols-2 gap-3">
        <ButtonLink href="/employer/business/edit" variant="outline" className="w-full">
          {t("employer.editVenue")}
        </ButtonLink>
        <ButtonLink href="/employer/plans" variant="outline" className="w-full">
          {t("employer.plansTitle")}
        </ButtonLink>
      </div>
    </div>
  );
}
