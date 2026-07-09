import { Suspense } from "react";
import { ResetPasswordScreen } from "@/modules/auth";

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ResetPasswordScreen />
        </Suspense>
    );
}
