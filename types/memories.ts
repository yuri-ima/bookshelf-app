// types/memories.ts
export type Memory = {
  id: string;
  imageUrl: string;
  title?: string;
  note?: string;
  takenAt?: string; // ISO
  order?: number; // ← 追加
};
