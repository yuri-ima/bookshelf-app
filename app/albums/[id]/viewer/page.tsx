"use client";

import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSwipeable } from "react-swipeable";

type Memory = {
  id: string;
  imageUrl: string;
  title?: string; // ← 任意
  note?: string; // ← 今は表示しない
  takenAt?: string; // ISO（例: 2025-10-12T10:30）
};

export default function AlbumViewer() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const startIndex = parseInt(search.get("i") ?? "0", 10) || 0;

  const [items, setItems] = useState<Memory[]>([]);
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    const base = collection(db, "albums", id, "memories");

    // まず order 昇順で取得
    const qOrder = query(base, orderBy("order", "asc"));
    const unsub1 = onSnapshot(
      qOrder,
      (s) => {
        const arr = s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        // order がない古いデータだけのアルバムだと、ここで全件 order: undefined のまま来ることもある
        setItems(arr);
        setIndex(0);
      },
      (err) => {
        console.error("order query failed, fallback to takenAt:", err);
        // フォールバック: takenAt 昇順
        const qTaken = query(base, orderBy("takenAt", "asc"));
        const unsub2 = onSnapshot(qTaken, (s2) => {
          const arr = s2.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          setItems(arr);
          setIndex(0);
        });
        // クリーンアップ
        return () => unsub2();
      }
    );

    return () => unsub1();
  }, [id]);

  useEffect(() => {
    if (items.length > 0)
      setIndex(Math.min(Math.max(0, startIndex), items.length - 1));
  }, [items.length, startIndex]);

  const next = useCallback(
    () => setIndex((i) => Math.min(i + 1, items.length - 1)),
    [items.length]
  );
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);
  const toggleZoom = useCallback(() => setZoom((z) => !z), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") router.back();
      if (e.key === " ") {
        e.preventDefault();
        toggleZoom();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, toggleZoom, router]);

  const bind = useSwipeable({
    onSwipedLeft: next,
    onSwipedRight: prev,
    trackMouse: true,
  });

  if (!items.length) {
    return (
      <main className="min-h-dvh grid place-items-center bg-black text-white">
        <div className="text-gray-400">読み込み中… / 写真がありません</div>
      </main>
    );
  }

  const current = items[index];

  return (
    <main className="fixed inset-0 bg-black text-white grid grid-rows-[auto,minmax(0,1fr),auto] min-h-dvh">
      {/* ヘッダー：左=戻る／中央=タイトル+日付／右=ページ数＋編集 */}
      <header className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 rounded bg-white/10 hover:bg-white/20"
            onClick={() => router.back()}
          >
            戻る
          </button>
        </div>

        {/* ここにタイトル＆日付（タイトルは任意で非表示可） */}
        <div className="text-center">
          {current.title ? (
            <div className="text-sm md:text-base font-semibold leading-tight">
              {current.title}
            </div>
          ) : null}
          <div className="text-xs md:text-sm text-white/70">
            {formatDate(current.takenAt)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm opacity-80">
            {index + 1} / {items.length}
          </div>
          <button
            className="px-3 py-1 rounded bg-white/10 hover:bg-white/20"
            onClick={() => router.push(`/albums/${id}/edit?i=${index}`)}
          >
            編集
          </button>
        </div>
      </header>

      {/* 画像エリア：タップでズーム */}
      <section
        className="relative w-full h-full flex items-center justify-center select-none overflow-hidden"
        {...bind}
      >
        {index > 0 && (
          <button
            className="absolute left-0 top-1/2 -translate-y-1/2 p-4 text-3xl opacity-70 hover:opacity-100"
            onClick={prev}
            aria-label="前へ"
          >
            ‹
          </button>
        )}
        {index < items.length - 1 && (
          <button
            className="absolute right-0 top-1/2 -translate-y-1/2 p-4 text-3xl opacity-70 hover:opacity-100"
            onClick={next}
            aria-label="次へ"
          >
            ›
          </button>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={current.id}
            src={current.imageUrl}
            alt={current.title ?? ""}
            referrerPolicy="no-referrer"
            className={`object-contain ${zoom ? "max-w-none" : "max-w-full"} ${
              zoom ? "max-h-none" : "max-h-full"
            }`}
            style={
              zoom
                ? { transform: "scale(1.4)", cursor: "zoom-out" }
                : { cursor: "zoom-in" }
            }
            onClick={toggleZoom}
            initial={{ x: 60, opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0.6 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onError={(e) => {
              const url = current.imageUrl;
              const id = (url.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
                url.match(/id=([^&]+)/) ||
                [])[1];
              if (id)
                (
                  e.currentTarget as HTMLImageElement
                ).src = `https://lh3.googleusercontent.com/d/${id}=w1600`;
            }}
          />
        </AnimatePresence>
      </section>

      {/* 説明フッター（写真とは別領域／常時表示） */}
      <footer
        className="px-4 py-3 md:px-6 md:py-4 border-t border-white/10
             bg-black text-white"
      >
        <div className="max-w-4xl mx-auto">
          {current.note ? (
            <p
              className="text-sm md:text-base whitespace-pre-wrap text-white/90
                    max-h-40 md:max-h-56 overflow-y-auto"
            >
              {current.note}
            </p>
          ) : (
            <div className="text-sm text-white/50">説明はありません</div>
          )}
        </div>
      </footer>
    </main>
  );
}
