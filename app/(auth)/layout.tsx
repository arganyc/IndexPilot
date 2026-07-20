import { BrandMark } from "@/components/marketing/brand-mark";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col">
        <header className="flex justify-center">
          <BrandMark />
        </header>
        <main className="flex flex-1 items-center justify-center py-12">
          {children}
        </main>
      </div>
    </div>
  );
}
