"use client";

import { db } from "@/lib/db";
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
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// dnd-kit
import { formatDate, toDriveDirect } from "@/lib/utils";
import { Memory } from "@/types/memories";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS as DndCSS } from "@dnd-kit/utilities";

function dateOnlyToISO(d: string) {
  if (!d) return "";
  // 00:00 ローカル → ISO
  return new Date(`${d}T00:00:00`).toISOString();
}

// ---- 並び替え可能カード ----
function SortableCard({ albumId, m }: { albumId: string; m: Memory }) {
  const {
    attributes, // ← ハンドルに付ける
    listeners, // ← ハンドルに付ける
    setNodeRef, // ← カード本体
    setActivatorNodeRef, // ← ハンドル
    transform,
    transition,
    isDragging,
  } = useSortable({ id: m.id });

  const style: React.CSSProperties = {
    transform: transform ? DndCSS.Transform.toString(transform) : undefined,
    transition,
  };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    title: m.title ?? "",
    note: m.note ?? "",
    dateOnly: m.takenAt ? new Date(m.takenAt).toISOString().slice(0, 10) : "",
    imageUrl: m.imageUrl ?? "",
  });

  useEffect(() => {
    // 外部更新に追従
    setDraft({
      title: m.title ?? "",
      note: m.note ?? "",
      dateOnly: m.takenAt ? new Date(m.takenAt).toISOString().slice(0, 10) : "",
      imageUrl: m.imageUrl ?? "",
    });
  }, [m.id, m.title, m.note, m.takenAt, m.imageUrl]);

  const onSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ref = doc(db, "albums", albumId, "memories", m.id);
    await updateDoc(ref, {
      title: draft.title || null,
      note: draft.note || null,
      imageUrl: draft.imageUrl,
      takenAt: draft.dateOnly ? dateOnlyToISO(draft.dateOnly) : null,
    });
    setEditing(false);
  };

  const onDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("このカードを削除します。よろしいですか？")) return;
    const ref = doc(db, "albums", albumId, "memories", m.id);
    await deleteDoc(ref);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative border rounded-xl p-3 space-y-2 bg-white ${
        isDragging ? "opacity-80 ring-2 ring-blue-400" : ""
      }`}
    >
      {/* 左上：ドラッグハンドル（さりげないトーン） */}
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="absolute left-2 top-2 z-10 h-7 w-7 grid grid-cols-2 grid-rows-3 gap-0.5
                   rounded-md bg-gray-100 text-gray-500 shadow-sm/0 hover:bg-gray-200
                   cursor-grab active:cursor-grabbing touch-none"
        title="ドラッグで並び替え"
        aria-label="ドラッグで並び替え"
        onClick={(e) => e.preventDefault()}
      >
        {/* 6つの控えめな点 */}
        <span className="w-1 h-1 bg-gray-400 rounded-full justify-self-center self-center" />
        <span className="w-1 h-1 bg-gray-400 rounded-full justify-self-center self-center" />
        <span className="w-1 h-1 bg-gray-400 rounded-full justify-self-center self-center" />
        <span className="w-1 h-1 bg-gray-400 rounded-full justify-self-center self-center" />
        <span className="w-1 h-1 bg-gray-400 rounded-full justify-self-center self-center" />
        <span className="w-1 h-1 bg-gray-400 rounded-full justify-self-center self-center" />
      </button>

      {/* 右上：編集／削除 */}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditing((v) => !v);
          }}
          className="px-2 py-1 text-xs rounded bg-gray-900 text-white/90 hover:bg-black"
        >
          {editing ? "キャンセル" : "編集"}
        </button>
        <button
          onClick={onDelete}
          className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
        >
          削除
        </button>
      </div>

      {!editing ? (
        <>
          <div className="aspect-[4/3] bg-gray-100 rounded overflow-hidden">
            {m.imageUrl ? (
              <img
                src={toDriveDirect(m.imageUrl)}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : null}
          </div>
          <div className="text-sm text-gray-500">
            {m.takenAt ? formatDate(m.takenAt) : ""}
          </div>
          {m.title && <div className="font-medium">{m.title}</div>}
          {/* 改行保持：whitespace-pre-wrap を使用（line-clampは外す） */}
          {m.note && (
            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
              {m.note}
            </p>
          )}
        </>
      ) : (
        <div className="space-y-2 pt-8">
          <input
            className="w-full border rounded p-2"
            placeholder="タイトル（任意）"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <input
            className="w-full border rounded p-2"
            placeholder="画像URL（lh3形式推奨）"
            value={draft.imageUrl}
            onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
          />
          <input
            type="date"
            className="w-full border rounded p-2"
            value={draft.dateOnly}
            onChange={(e) => setDraft({ ...draft, dateOnly: e.target.value })}
          />
          <textarea
            className="w-full border rounded p-2"
            placeholder="メモ（任意）"
            value={draft.note}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditing(false);
                setDraft({
                  title: m.title ?? "",
                  note: m.note ?? "",
                  dateOnly: m.takenAt
                    ? new Date(m.takenAt).toISOString().slice(0, 10)
                    : "",
                  imageUrl: m.imageUrl ?? "",
                });
              }}
              className="px-3 py-1 rounded border"
            >
              キャンセル
            </button>
            <button
              onClick={onSave}
              className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AlbumEditPage() {
  const { id: albumId } = useParams<{ id: string }>();
  const router = useRouter();

  const [albumTitle, setAlbumTitle] = useState("");
  const [list, setList] = useState<Memory[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    note: "",
    imageUrl: "",
    dateOnly: "",
  });

  // dnd センサー
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // アルバムタイトル＆メモリ購読（order順）＋ order バックフィル
  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, "albums", albumId));
      if (snap.exists()) setAlbumTitle(snap.data().title ?? "");
    })();

    const base = collection(db, "albums", albumId, "memories");
    const q = query(base, orderBy("order", "asc"));

    const unsub = onSnapshot(q, async (s) => {
      const arr = s.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Memory[];
      setList(arr);

      // order 未設定があれば 0..N 採番
      if (arr.some((m) => m.order === undefined)) {
        const batch = writeBatch(db);
        arr.forEach((m, idx) => {
          if (m.order === undefined) {
            batch.update(doc(db, "albums", albumId, "memories", m.id), {
              order: idx,
            });
          }
        });
        await batch.commit();
        console.log("order backfilled");
      }
    });

    return () => unsub();
  }, [albumId]);

  // 追加
  const addMemory = async () => {
    if (!form.imageUrl || !form.dateOnly) return;
    setSaving(true);
    await addDoc(collection(db, "albums", albumId, "memories"), {
      title: form.title || null,
      note: form.note || null,
      imageUrl: form.imageUrl,
      takenAt: dateOnlyToISO(form.dateOnly),
      order: Date.now(), // ひとまず末尾寄りの値。後で並び替えで0..Nに
      createdAt: serverTimestamp(),
    });
    setForm({ title: "", note: "", imageUrl: "", dateOnly: "" });
    setSaving(false);
  };

  // 並び替え確定時：0..N に再採番して保存
  const onDragEnd = async (e: any) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oldIndex = list.findIndex((x) => x.id === active.id);
    const newIndex = list.findIndex((x) => x.id === over.id);
    const newList = arrayMove(list, oldIndex, newIndex);
    setList(newList);

    const batch = writeBatch(db);
    newList.forEach((m, idx) => {
      batch.update(doc(db, "albums", albumId, "memories", m.id), {
        order: idx,
      });
    });
    await batch.commit();
  };

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">編集：{albumTitle}</h1>
        <div className="flex gap-2">
          <button
            className="border rounded px-3 py-1"
            onClick={() => router.push(`/albums/${albumId}/viewer`)}
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
      <section className="border rounded-xl p-4 grid gap-3 md:grid-cols-2 bg-white">
        <input
          className="border rounded p-2"
          placeholder="タイトル（任意）"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <input
          className="border rounded p-2"
          placeholder="画像URL（Driveは lh3.googleusercontent.com 形式推奨）"
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
        />
        <input
          type="date"
          className="border rounded p-2"
          value={form.dateOnly}
          onChange={(e) => setForm({ ...form, dateOnly: e.target.value })}
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
            disabled={saving || !form.imageUrl || !form.dateOnly}
            onClick={addMemory}
          >
            {saving ? "追加中..." : "写真を追加"}
          </button>
        </div>
      </section>

      {/* 並び替え可能グリッド（1回だけ描画） */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={list.map((m) => m.id)}
          strategy={rectSortingStrategy}
        >
          <section className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
            {list.map((m) => (
              <SortableCard key={m.id} albumId={albumId} m={m} />
            ))}
          </section>
        </SortableContext>
      </DndContext>
    </main>
  );
}
