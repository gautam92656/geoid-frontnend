import { redirect } from "next/navigation";
import { SUPER_ADMIN_USERS_PATH } from "@/modules/super-admin/utils/paths";

export default function SuperAdminIndexPage() {
  redirect(SUPER_ADMIN_USERS_PATH);
}
