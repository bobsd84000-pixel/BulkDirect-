import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <nav className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div className="flex gap-6">
          <Link href="/dashboard" className="font-semibold">
            Dashboard
          </Link>
          <Link href="/settings/billing" className="text-gray-600">
            Facturation
          </Link>
        </div>
        <span className="text-sm text-gray-500">{user.email}</span>
      </nav>
      <div className="p-6">{children}</div>
    </div>
  );
}
