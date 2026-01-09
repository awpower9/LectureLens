"use client";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { ArrowRight, Sparkles, BookOpen, Brain, Camera } from "lucide-react";

export default function Home() {
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading) return null;

  if (user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 text-center px-4">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
          <h1 className="relative text-4xl md:text-6xl font-bold tracking-tight">
            Welcome back, <span className="text-blue-500">{user.displayName}</span>
          </h1>
        </div>
        <p className="text-xl text-gray-400 max-w-2xl">
          Ready to capture some knowledge? Your AI study assistant is waiting.
        </p>
        <Link
          href="/dashboard"
          className="bg-white text-black px-8 py-3 rounded-full text-lg font-bold hover:scale-105 transition-transform flex items-center gap-2"
        >
          Go to Dashboard <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] gap-8 text-center px-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 space-y-6 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-blue-300">
          <Sparkles className="h-4 w-4" />
          <span>Powered by Gemini 1.5 Flash</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl mx-auto">
          Turn Lecture Photos into <br />
          <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text">
            Perfect Study Notes
          </span>
        </h1>

        <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Don't stress about copying the whiteboard. Snap a photo, and let AI generate summaries, key points, and quizzes instantly.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center pt-8">
          <button
            onClick={signInWithGoogle}
            className="bg-white text-black px-8 py-4 rounded-full text-lg font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            Start Learning for Free <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-20 text-left w-full px-4">
        <FeatureCard
          icon={<Camera className="h-8 w-8 text-blue-400" />}
          title="Snap & Convert"
          description="Instant OCR and handwriting recognition turns whiteboard chaos into clean text."
        />
        <FeatureCard
          icon={<Brain className="h-8 w-8 text-purple-400" />}
          title="AI Summaries"
          description="Get concise summaries and bullet points explaining complex topics using Gemini."
        />
        <FeatureCard
          icon={<BookOpen className="h-8 w-8 text-pink-400" />}
          title="Auto-Quizzes"
          description="Test your understanding with generated questions based on the lecture material."
        />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}
