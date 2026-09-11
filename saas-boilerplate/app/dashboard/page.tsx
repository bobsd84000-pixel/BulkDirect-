import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user!.id)
    .single();

  return (
    <div>
      <h1 className="text-2xl font-bold">Bienvenue</h1>
      <p className="mt-2 text-gray-600">
        Statut abonnement :{" "}
        <span className="font-medium">
          {profile?.subscription_status ?? "aucun"}
        </span>
      </p>
    </div>
  );
}
