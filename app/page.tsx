// app/page.tsx（中身だけ差し替え例）
"use client";
import { db } from "@/lib/db";
import type { Album } from "@/types/albums";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./_providers/AuthProvider";

export default function Home() {
  const { user, signOutApp } = useAuth();
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]);

  useEffect(() => {
    if (user === null) router.replace("/login");
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "albums"),
      where("ownerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: Album[] = snap.docs.map((d:any) => ({ id: d.id, ...d.data() }));
      setAlbums(list);
    });
    return () => unsub();
  }, [user]);

  if (user === undefined) return <div className="p-6">Loading...</div>;
  if (!user) return null;

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">本棚</h1>
        <div className="flex gap-2">
          <button className="border rounded-lg px-3 py-1" onClick={() => router.push("/albums/new")}>新規アルバム</button>
          <button className="border rounded-lg px-3 py-1" onClick={signOutApp}>ログアウト</button>
        </div>
      </div>
      <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
        {albums.map(a => (
          <button
            key={a.id}
            onClick={() => router.push(`/albums/${a.id}`)}
            className="text-left border rounded-xl p-3 hover:shadow"
          >
            <div className="aspect-[4/3] bg-gray-100 rounded-lg mb-2 overflow-hidden">
              {a.coverUrl ? <img src={a.coverUrl} alt="" className="w-full h-full object-cover" /> : null}
            </div>
            <div className="font-medium">{a.title}</div>
          </button>
        ))}
      </div>
    </main>
  );
}
