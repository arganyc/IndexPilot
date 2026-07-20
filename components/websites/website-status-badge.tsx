import { Badge } from "@/components/ui/badge";
import { statusLabels, statusValues } from "@/lib/websites/validation";

type WebsiteStatus = (typeof statusValues)[number];

function getWebsiteStatusVariant(status: WebsiteStatus) {
  if (status === "ACTIVE") {
    return "default";
  }

  if (status === "ARCHIVED") {
    return "secondary";
  }

  return "outline";
}

export function WebsiteStatusBadge({ status }: { status: WebsiteStatus }) {
  const label = statusLabels[status];

  return (
    <Badge
      variant={getWebsiteStatusVariant(status)}
      aria-label={`Website status: ${label}`}
    >
      {label}
    </Badge>
  );
}
