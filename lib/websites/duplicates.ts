type ExistingWebsite = {
  id: string;
};

type DomainLookup = (normalizedDomain: string) => Promise<ExistingWebsite | null>;

export async function getDuplicateDomainMessage({
  normalizedDomain,
  currentWebsiteId,
  findWebsiteByNormalizedDomain,
}: {
  normalizedDomain: string;
  currentWebsiteId?: string;
  findWebsiteByNormalizedDomain: DomainLookup;
}) {
  const existingWebsite = await findWebsiteByNormalizedDomain(normalizedDomain);

  if (!existingWebsite || existingWebsite.id === currentWebsiteId) {
    return null;
  }

  return "A website with this domain already exists.";
}
