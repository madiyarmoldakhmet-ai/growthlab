import { redirect } from "next/navigation";

// Корень ведёт в приложение (AppShell с sidebar).
export default function RootPage() {
  redirect("/campaigns");
}