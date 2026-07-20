import { notFound } from "next/navigation";

import { WebsiteForm } from "@/components/websites/website-form";
import { prisma } from "@/lib/prisma";

type EditWebsitePageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function EditWebsitePage({ params }: EditWebsitePageProps) {
  const { id } = await params;
  const website = await prisma.website.findUnique({ where: { id } });

  if (!website) {
    notFound();
  }

  return (
    <WebsiteForm
      mode="edit"
      websiteId={website.id}
      defaultValues={{
        name: website.name,
        domain: website.domain,
        platform: website.platform,
        priority: website.priority,
        status: website.status,
        notes: website.notes ?? "",
      }}
    />
  );
}
