import { requirePageAuth } from "@/lib/auth/page-guard";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageAuth({ requiredPermission: "admin.access" });
  return <>{children}</>;
}
