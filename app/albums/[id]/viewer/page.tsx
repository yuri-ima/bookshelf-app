"use client";

import { db } from "@/lib/db";
import dayjs from "dayjs";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSwipeable } from "react-swipeable";

type Memory = {
  id: string;
  imageUrl: string;
  title?: string;
  note?: string;
  takenAt?: string; // ISO
};

export default function AlbumViewer() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [items, setItems] = useState<Memory[]>([]);
  const [index, setIndex] = useState(0);
  const search = useSearchParams();
  const startIndex = parseInt(search.get("i") ?? "0", 10) || 0;

  // Firestore: takenAt 昇順で読む
  useEffect(() => {
    const q = query(
      collection(db, "albums", id, "memories"),
      orderBy("takenAt", "asc")
    );
    const unsub = onSnapshot(q, (s) => {
      const arr = s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setItems(arr);
      setIndex(0);
    });
    return () => unsub();
  }, [id]);

  // ナビゲーション
  const next = useCallback(
    () => setIndex((i) => Math.min(i + 1, items.length - 1)),
    [items.length]
  );
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);
  const [showInfo, setShowInfo] = useState(true); // ← 情報パネルの表示フラグを追加
  const toggleInfo = useCallback(() => setShowInfo((v) => !v), []);

  // キーボード操作
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") router.back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, router]);

  // スワイプ
  const bind = useSwipeable({
    onSwipedLeft: next,
    onSwipedRight: prev,
    trackMouse: true,
  });

  // 事前読み込み（次の1枚）
  useEffect(() => {
    const n = items[index + 1]?.imageUrl;
    if (!n) return;
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.src = n;
  }, [index, items]);

  useEffect(() => {
    // 取得後に開始ページを反映
    if (items.length > 0) {
      setIndex(Math.min(Math.max(0, startIndex), items.length - 1));
    }
  }, [items.length, startIndex]);

  if (!items.length) {
    return (
      <main className="min-h-dvh grid place-items-center">
        <div className="text-gray-500">読み込み中… / 写真がありません</div>
      </main>
    );
  }

  const current = items[index];

  return (
    <main className="fixed inset-0 bg-black text-white select-none">
      {/* ヘッダー */}
      <div className="absolute top-0 inset-x-0 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 rounded bg-white/10 hover:bg-white/20"
            onClick={() => router.back()}
          >
            戻る
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm opacity-80">
            {index + 1} / {items.length}
          </div>
          <button
            className="px-3 py-1 rounded bg-white/10 hover:bg-white/20"
            onClick={() => router.push(`/albums/${id}/edit`)} // ← 編集へ
          >
            編集
          </button>
        </div>
      </div>

      {/* 画像表示エリア */}
      <div
        className="w-full h-full flex items-center justify-center"
        onClick={toggleInfo} // ← 画面タップで情報の表示切替
        {...bind}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={current.id}
            src={current.imageUrl}
            alt={current.title ?? ""}
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[90dvh] object-contain"
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
      </div>

      {/* 情報パネル（説明） */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            className="absolute inset-x-0 bottom-0 p-4 md:p-6 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
          >
            <div className="max-w-4xl mx-auto space-y-2">
              {/* タイトル */}
              {current.title ? (
                <h2 className="text-lg md:text-xl font-semibold leading-tight">
                  {current.title}
                </h2>
              ) : null}

              {/* メモ */}
              {current.note ? (
                <p className="text-sm md:text-base text-white/90 whitespace-pre-wrap">
                  {current.note}
                </p>
              ) : null}

              {/* 撮影日時 */}
              {current.takenAt ? (
                <div className="text-xs md:text-sm text-white/70">
                  {dayjs(current.takenAt).format("YYYY/MM/DD HH:mm")}
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ナビゲーション矢印（PC向け） */}
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

      {/* ページインジケータ */}
      <div className="absolute bottom-0 inset-x-0 p-3 flex items-center justify-center gap-1">
        {items.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-white" : "w-2 bg-white/40"
            }`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </main>
  );
}
