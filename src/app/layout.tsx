import type { ReactNode } from "react";
import { FirebaseAuthProvider } from "@/lib/firebase/auth";
import "./globals.css";

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="ko"><body><FirebaseAuthProvider>{children}</FirebaseAuthProvider></body></html>;
}
