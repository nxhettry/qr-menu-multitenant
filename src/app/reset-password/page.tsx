import { AuthForm } from "@/components/auth-form";
import { privateMetadata } from "@/lib/seo/site";

export const metadata = privateMetadata("Choose a new password — QR Menu");
export default function ResetPasswordPage() { return <AuthForm mode="reset" />; }
