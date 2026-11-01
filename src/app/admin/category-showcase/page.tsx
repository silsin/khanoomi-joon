"use client";
export const dynamic = "force-dynamic";
import AdminGuard from "../AdminGuard";
import CategoryShowcaseSettings from "@/app/admin/components/CategoryShowcaseSettings";

export default function AdminCategoryShowcasePage() {
  return (
    <AdminGuard>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        <CategoryShowcaseSettings />
      </div>
    </AdminGuard>
  );
}