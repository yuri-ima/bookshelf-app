// app/albums/[id]/page.tsx
"use client";
import { db } from "@/lib/db";
import dayjs from "dayjs";
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Memory = {
  id: string;
  title?: string;
  note?: string;
  imageUrl?: string;
  takenAt?: string; // ISO文字列で管理（入力→保存→表示時に整形）
};

export default function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [albumTitle, setAlbumTitle] = useState("");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [form, setForm] = useState({ title: "", note: "", imageUrl: "", takenAt: "" });

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, "albums", id));
      if (snap.exists()) setAlbumTitle(snap.data().title ?? "");
    })();
    const q = query(collection(db, "albums", id, "memories"), orderBy("takenAt", "asc"));
    const unsub = onSnapshot(q, (s) => {
      setMemories(s.docs.map(d => ({ id: d.id, ...(d.data() ) })));
    });
    return () => unsub();
  }, [id]);

  const addMemory = async () => {
    if (!form.imageUrl || !form.takenAt) return;
    await addDoc(collection(db, "albums", id, "memories"), {
      title: form.title || null,
      note: form.note || null,
      imageUrl: form.imageUrl,
      takenAt: form.takenAt, // e.g. "2025-10-12T10:30"
      createdAt: serverTimestamp(),
    });
    setForm({ title: "", note: "", imageUrl: "", takenAt: "" });
  };

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{albumTitle}</h1>

      {/* 追加フォーム */}
      <section className="border rounded-xl p-4 space-y-3">
        <input className="w-full border rounded p-2" placeholder="タイトル（任意）"
          value={form.title} onChange={e=>setForm({...form, title:e.target.value})}/>
        <input className="w-full border rounded p-2" placeholder="画像URL"
          value={form.imageUrl} onChange={e=>setForm({...form, imageUrl:e.target.value})}/>
        <input className="w-full border rounded p-2" type="datetime-local"
          value={form.takenAt} onChange={e=>setForm({...form, takenAt:e.target.value})}/>
        <textarea className="w-full border rounded p-2" placeholder="メモ（任意）"
          value={form.note} onChange={e=>setForm({...form, note:e.target.value})}/>
        <button className="border rounded px-4 py-2" onClick={addMemory}>追加</button>
      </section>

      {/* タイムライン */}
      <section className="space-y-4">
        {memories.map(m => (
          <article key={m.id} className="flex gap-3 items-start">
            <div className="w-36 h-24 bg-gray-100 rounded overflow-hidden shrink-0">
              {m.imageUrl && <img src={m.imageUrl} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-500">
                {m.takenAt ? dayjs(m.takenAt).format("YYYY/MM/DD HH:mm") : ""}
              </div>
              <div className="font-medium">{m.title}</div>
              <p className="text-sm whitespace-pre-wrap">{m.note}</p>
              {/* コメント一覧＆入力は後で追加 */}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
