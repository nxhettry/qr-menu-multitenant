import { AuthForm } from "@/components/auth-form";
import { privateMetadata } from "@/lib/seo/site";

export const metadata = privateMetadata("Reset your password — QR Menu");
export default function ForgotPasswordPage() { return <AuthForm mode="forgot" />; }
