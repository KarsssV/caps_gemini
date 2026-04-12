"use client"
import AuthShowcase from "../../components/auth-showcase";
import { AuthProvider } from "../../contexts/auth-context";

export default function SignUpPage() {
  return (
    <AuthShowcase variant="signup" />
  );
}