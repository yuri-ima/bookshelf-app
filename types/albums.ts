// types/albums.ts
export type Album = {
  id: string;
  ownerId: string;
  title: string;
  coverUrl?: string;
  createdAt: number; // Date.now()
};
