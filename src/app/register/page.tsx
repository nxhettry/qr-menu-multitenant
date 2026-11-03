import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Create a free QR menu for your restaurant — QR Menu",
  description: "Sign up free and publish a bilingual digital QR menu for your restaurant, café or momo shop in Nepal in minutes.",
  alternates: { canonical: "/register" },
};

export default function RegisterPage() { return <AuthForm mode="register" />; }
