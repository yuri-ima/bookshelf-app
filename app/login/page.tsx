"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../_providers/AuthProvider";

export default function LoginPage() {
  const { user, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  if (user === undefined) return <main>Loading...</main>;
  if (user) return <main>Redirecting...</main>;

  return (
    <main style={{ padding: 24 }}>
      <h1>ログイン</h1>
      <button onClick={() => signInWithGoogle()}>Googleでログイン</button>
    </main>
  );
}
