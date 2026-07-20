import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | IndexPilot",
  description:
    "IndexPilot terms covering account use, Search Console limitations, acceptable use, and service availability.",
};

export default function TermsPage() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto grid max-w-3xl gap-8">
        <div className="grid gap-3">
          <p className="text-sm font-medium text-muted-foreground">Terms</p>
        <h1 className="text-4xl font-semibold text-foreground">
          Terms of Service
        </h1>
        <p className="text-lg leading-8 text-muted-foreground">
            These terms summarize the expectations for using IndexPilot during
            launch beta.
        </p>
        </div>

        <div className="grid gap-6 text-sm leading-7 text-muted-foreground">
          <section className="grid gap-2">
            <h2 className="text-xl font-semibold text-foreground">
              Service use
            </h2>
            <p>
              IndexPilot helps you organize Google Search Console-powered URL
              inspections, website records, and inspection history. You are
              responsible for using the service with websites and Google
              accounts you are authorized to manage.
            </p>
          </section>
          <section className="grid gap-2">
            <h2 className="text-xl font-semibold text-foreground">
              Google limitations
            </h2>
            <p>
              IndexPilot does not control Google, guarantee crawling, guarantee
              indexing, or guarantee search rankings. Inspection data reflects
              information Google makes available through its services.
            </p>
          </section>
          <section className="grid gap-2">
            <h2 className="text-xl font-semibold text-foreground">
              Acceptable use
            </h2>
            <p>
              Do not use IndexPilot to access data without permission, abuse
              connected services, interfere with platform availability, or
              attempt to bypass security protections.
            </p>
          </section>
          <section className="grid gap-2">
            <h2 className="text-xl font-semibold text-foreground">
              Availability
            </h2>
            <p>
              IndexPilot is offered during launch beta and may change as the
              product evolves. Contact hello@indexpilot.cloud with questions
              about usage or account access.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
