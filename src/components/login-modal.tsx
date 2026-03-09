"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Github, Mail, Chrome } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import { toast } from "sonner";

export function LoginModal({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const { data, error } = await signIn.magicLink({
        email,
        callbackURL: "/",
      });

      if (error) {
        toast.error(error.message || "Failed to send magic link");
      } else {
        setEmailSent(true);
        toast.success("Magic link sent to your email!");
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) {
        // Reset state on close
        setTimeout(() => {
          setEmailSent(false);
          setEmail("");
        }, 300);
      }
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" className="font-medium text-gray-300 hover:text-white">
            Login
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] w-[95vw] rounded-3xl bg-[#1A1A1A] border-[#2A2A2A] p-6 sm:p-8 shadow-2xl gap-0">
        <DialogTitle className="sr-only">Login to OpenBookLM</DialogTitle>
        <DialogDescription className="sr-only">Choose a method to log in or sign up</DialogDescription>
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(37,99,235,0.5)]">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">Welcome back</h2>
          <p className="text-sm text-gray-400 mt-1 text-center">Sign in to sync your notebooks and unlock higher limits.</p>
        </div>

        {emailSent ? (
          <div className="flex flex-col items-center text-center space-y-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Mail className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">Check your email</h3>
              <p className="text-sm text-gray-400 mt-2">
                We sent a magic link to <span className="text-white font-medium">{email}</span>. 
                Click the link to sign in.
              </p>
            </div>
            <Button 
              variant="ghost" 
              className="mt-4 text-sm text-gray-400 hover:text-white"
              onClick={() => setEmailSent(false)}
            >
              Use a different method
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full h-11 rounded-xl bg-[#252525] border-[#333] hover:bg-[#333] text-white flex items-center justify-center gap-3 transition-all"
              onClick={() => signIn.social({ provider: 'google', callbackURL: '/' })}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full h-11 rounded-xl bg-[#252525] border-[#333] hover:bg-[#333] text-white flex items-center justify-center gap-3 transition-all"
              onClick={() => signIn.social({ provider: 'github', callbackURL: '/' })}
            >
              <Github className="w-5 h-5" />
              Continue with GitHub
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#333]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#1A1A1A] px-2 text-gray-500">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleMagicLink} className="space-y-3">
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl bg-[#252525] border-[#333] focus-visible:ring-blue-500 text-white placeholder:text-gray-500"
              />
              <Button 
                type="submit" 
                disabled={isLoading || !email}
                className="w-full h-11 rounded-xl bg-white hover:bg-gray-200 text-black font-medium transition-colors"
              >
                {isLoading ? "Sending..." : "Send Magic Link"}
              </Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}