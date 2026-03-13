import Link from "next/link";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fcfaf6_0%,#f6f0e6_100%)] px-4">
      <Card className="max-w-xl text-center">
        <CardTitle>Page not found</CardTitle>
        <CardDescription className="mt-3">
          This route is not part of the current Clonable foundation scaffold.
        </CardDescription>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
        >
          Back to projects
        </Link>
      </Card>
    </main>
  );
}
