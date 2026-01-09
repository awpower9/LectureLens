"use client";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { LogIn, LogOut, Camera } from "lucide-react"; // Camera icon for logo
import { cn } from "@/lib/utils";

export default function Navbar() {
    const { user, signInWithGoogle, logout } = useAuth();

    return (
        <nav className="border-b border-gray-800 bg-black/50 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="bg-blue-600 p-2 rounded-lg">
                                <Camera className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                                LectureLens
                            </span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        {user ? (
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-400 hidden sm:block">
                                    {user.displayName}
                                </span>
                                <button
                                    onClick={logout}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Sign Out
                                </button>
                                <img
                                    src={user.photoURL || ""}
                                    alt="Profile"
                                    className="h-8 w-8 rounded-full border border-gray-700"
                                />
                            </div>
                        ) : (
                            <button
                                onClick={signInWithGoogle}
                                className="flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium bg-white text-black hover:bg-gray-200 transition-colors"
                            >
                                <LogIn className="h-4 w-4" />
                                Get Started
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
