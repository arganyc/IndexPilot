import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | IndexPilot",
  description:
    "How IndexPilot handles account information, Search Console data, and service providers.",
};

export default function PrivacyPage() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto grid max-w-3xl gap-8">
        <div className="grid gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            Privacy
          </p>
        <h1 className="text-4xl font-semibold text-foreground">
          Privacy Policy
        </h1>
        <p className="text-lg leading-8 text-muted-foreground">
            IndexPilot uses the information you provide to operate indexing
            visibility workflows, secure your account, and improve the product.
        </p>
        </div>

        <div className="grid gap-6 text-sm leading-7 text-muted-foreground">
          <section className="grid gap-2">
            <h2 className="text-xl font-semibold text-foreground">
              Information we handle
            </h2>
            <p>
              IndexPilot may process account details, website records, Search
              Console properties you authorize, URL inspection records, and
              basic technical logs needed to run the service.
            </p>
          </section>
          <section className="grid gap-2">
            <h2 className="text-xl font-semibold text-foreground">
              Google data
            </h2>
            <p>
              Google Search Console data is used to show connected properties,
              inspect URLs, and store inspection history for your workspace.
              IndexPilot does not sell Google data.
            </p>
          </section>
          <section className="grid gap-2">
            <h2 className="text-xl font-semibold text-foreground">
              Service providers
            </h2>
            <p>
              IndexPilot relies on infrastructure providers such as hosting,
              authentication, and database services to deliver the product.
              Access is limited to what is needed to operate the service.
            </p>
          </section>
          <section className="grid gap-2">
            <h2 className="text-xl font-semibold text-foreground">
              Contact
            </h2>
            <p>
              For privacy questions or data requests, contact
              hello@indexpilot.cloud.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
