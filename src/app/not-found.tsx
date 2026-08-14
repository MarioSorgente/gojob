import { getT } from "@/lib/i18n/server";
import { ErrorScreen } from "@/components/ErrorScreen";

export default async function NotFound() {
  const t = await getT();
  return (
    <ErrorScreen
      icon="search"
      title={t("error.notFoundTitle")}
      hint={t("error.notFoundHint")}
    />
  );
}
