// app/login/page.tsx
"use client";

import { useAuth } from "../_providers/AuthProvider";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { user, signInWithGoogle } = useAuth();
  const router = useRouter();

  if (user) {
    // 既ログインならホームへ
    router.replace("/");
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border p-6 space-y-4">
        <h1 className="text-xl font-semibold text-center">ログイン</h1>
        <button
          className="w-full rounded-lg border px-4 py-2"
          onClick={async () => {
            await signInWithGoogle();
            router.replace("/");
          }}
        >
          Googleでログイン
        </button>
      </div>
    </main>
  );
}
