import { redirect } from "next/navigation";

// Brackets are listed on the games page.
export default function WorldCupIndex() {
  redirect("/play");
}
