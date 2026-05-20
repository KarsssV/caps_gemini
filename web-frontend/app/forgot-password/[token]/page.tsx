"use client"
import { use } from "react";
import AuthShowcase from "../../../components/auth-showcase";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);

    return (
        <AuthShowcase variant="reset-password" token={token} />
    )
}
