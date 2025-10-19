// app/albums/[id]/edit/page.tsx
"use client";
import { db } from "@/lib/db";
import { toDriveDirect } from "@/lib/utils";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Memory = {
  id: string;
  title?: string;
  note?: string;
  imageUrl?: string;
  takenAt?: string;
};

export default function AlbumEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [albumTitle, setAlbumTitle] = useState("");
  const [list, setList] = useState<Memory[]>([]);
  const [form, setForm] = useState({
    title: "",
    note: "",
    imageUrl: "",
    takenAt: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, "albums", id));
      if (snap.exists()) setAlbumTitle(snap.data().title ?? "");
    })();
    const q = query(
      collection(db, "albums", id, "memories"),
      orderBy("takenAt", "asc")
    );
    const unsub = onSnapshot(q, (s) =>
      setList(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
    );
    return () => unsub();
  }, [id]);

  const addMemory = async () => {
    if (!form.imageUrl || !form.takenAt) return;
    setSaving(true);
    await addDoc(collection(db, "albums", id, "memories"), {
      title: form.title || null,
      note: form.note || null,
      imageUrl: toDriveDirect(form.imageUrl),
      takenAt: form.takenAt,
      createdAt: serverTimestamp(),
    });
    setForm({ title: "", note: "", imageUrl: "", takenAt: "" });
    setSaving(false);
  };

  const removeMemory = async (mid: string) => {
    await deleteDoc(doc(db, "albums", id, "memories", mid));
  };

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">編集：{albumTitle}</h1>
        <div className="flex gap-2">
          <button
            className="border rounded px-3 py-1"
            onClick={() => router.push(`/albums/${id}/viewer`)}
          >
            ビューアへ
          </button>
          <button
            className="border rounded px-3 py-1"
            onClick={() => router.push(`/`)}
          >
            本棚に戻る
          </button>
        </div>
      </div>

      {/* 追加フォーム */}
      <section className="border rounded-xl p-4 grid gap-3 md:grid-cols-2">
        <input
          className="border rounded p-2"
          placeholder="タイトル（任意）"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <input
          className="border rounded p-2"
          placeholder="画像URL（Driveはlh3形式推奨）"
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
        />
        <input
          className="border rounded p-2"
          type="datetime-local"
          value={form.takenAt}
          onChange={(e) => setForm({ ...form, takenAt: e.target.value })}
        />
        <textarea
          className="border rounded p-2 md:col-span-2"
          placeholder="メモ（任意）"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
        <div className="md:col-span-2">
          <button
            className="border rounded px-4 py-2 disabled:opacity-50"
            disabled={saving || !form.imageUrl || !form.takenAt}
            onClick={addMemory}
          >
            {saving ? "追加中..." : "思い出を追加"}
          </button>
        </div>
      </section>

      {/* 一覧（小さなカード） */}
      <section className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
        {list.map((m) => (
          <div key={m.id} className="border rounded-xl p-3 space-y-2">
            <div className="aspect-[4/3] bg-gray-100 rounded overflow-hidden">
              {m.imageUrl ? (
                <img
                  src={m.imageUrl}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : null}
            </div>
            <div className="text-sm text-gray-500">{m.takenAt}</div>
            <div className="font-medium">{m.title}</div>
            {m.note && <p className="text-sm whitespace-pre-wrap">{m.note}</p>}
            <div className="flex justify-end gap-2">
              {/* 後で編集ダイアログを追加 */}
              <button
                className="text-red-600 text-sm"
                onClick={() => removeMemory(m.id)}
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
