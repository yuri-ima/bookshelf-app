// app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./_providers/AuthProvider";

export default function Home() {
  const { user, signOutApp } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user === null) router.replace("/login"); // 未ログイン
  }, [user, router]);

  if (user === undefined) {
    return <div className="p-6">Loading...</div>; // 初期化中
  }

  if (!user) return null; // リダイレクト中

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">本棚（ダッシュボード仮）</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{user.displayName ?? user.email}</span>
          <button className="rounded-lg border px-3 py-1" onClick={signOutApp}>
            ログアウト
          </button>
        </div>
      </div>
      <p>ここにアルバム一覧を並べていきます。</p>
    </main>
  );
}
