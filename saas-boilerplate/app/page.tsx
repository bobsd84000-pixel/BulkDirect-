import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-bold">Votre SaaS, prêt en un clic</h1>
      <p className="max-w-xl text-gray-600">
        Auth, base de données et abonnements Stripe déjà branchés. Il ne reste
        qu'à construire votre produit.
      </p>
      <div className="flex gap-3">
        <Link
          href="/signup"
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-white hover:bg-gray-800"
        >
          Créer un compte
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-gray-300 px-5 py-2.5 hover:bg-gray-100"
        >
          Se connecter
        </Link>
      </div>
    </main>
  );
}
