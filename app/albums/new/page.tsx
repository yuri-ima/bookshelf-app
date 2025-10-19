// app/albums/new/page.tsx（Storageなし版）
"use client";
import { useAuth } from "@/app/_providers/AuthProvider";
import { db } from "@/lib/db";
import { toDriveDirect } from "@/lib/utils";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewAlbumPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [coverUrl, setCoverUrl] = useState(""); // ← URL入力に変更
  const [saving, setSaving] = useState(false);

  const onCreate = async () => {
    if (!user || !title) return;
    setSaving(true);
    await addDoc(collection(db, "albums"), {
      ownerId: user.uid,
      title,
      coverUrl: toDriveDirect(coverUrl) || null,
      createdAt: serverTimestamp(),
    });
    router.replace(`/`);
  };

  return (
    <main className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">アルバムを作成</h1>
      <input
        className="w-full border rounded-lg p-2"
        placeholder="タイトル"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className="w-full border rounded-lg p-2"
        placeholder="カバー画像URL（任意）"
        value={coverUrl}
        onChange={(e) => setCoverUrl(e.target.value)}
      />
      <button
        className="border rounded-lg px-4 py-2 disabled:opacity-50"
        disabled={!title || saving}
        onClick={onCreate}
      >
        {saving ? "作成中..." : "作成"}
      </button>
    </main>
  );
}
