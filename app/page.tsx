import Link from "next/link";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">Byte CRM</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/mvp_roadmap" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Roadmap
            </Link>
            <SignedOut>
              <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
                <Button variant="ghost">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
                <Button>Get Started</Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <Button>Go to Dashboard</Button>
              </Link>
            </SignedIn>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl">
            Manage your business relationships
          </h1>
          <p className="mb-8 text-lg text-muted-foreground">
            Byte CRM helps you track contacts, manage workflows, and stay on
            top of your tasks. All in one place.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <SignedOut>
              <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
                <Button size="lg">Start for Free</Button>
              </SignUpButton>
              <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
                <Button size="lg" variant="outline">
                  Sign In
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <Button size="lg">Go to Dashboard</Button>
              </Link>
            </SignedIn>
          </div>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Byte CRM. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
