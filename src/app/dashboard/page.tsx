"use client";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Lecture } from "@/types";
import Link from "next/link";
import { Plus, Book, Calendar, Loader2, Trash2 } from "lucide-react";

export default function Dashboard() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [lectures, setLectures] = useState<Lecture[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        async function fetchLectures() {
            if (!user) return;
            try {
                const q = query(
                    collection(db, "lectures"),
                    where("userId", "==", user.uid),
                    orderBy("createdAt", "desc")
                );
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Lecture[];
                setLectures(data);
            } catch (error: any) {
                console.error("Error fetching lectures:", error);

                if (error.code === 'permission-denied') {
                    alert("Database Permission Error:\n\nIt seems your Firestore rules are blocking access, or the database isn't created.\n\nGo to Firebase Console -> Firestore Database -> Rules, and ensure they allow read/write (or are in Test Mode).");
                } else if (error.code === 'unimplemented' || error.message.includes("no implementation found")) {
                    alert("Database Not Found:\n\nYou probably haven't enabled 'Firestore Database' in your Firebase Console yet.\n\nGo to Build -> Firestore Database -> Create Database (Start in Test Mode).");
                } else if (error.code === 'failed-precondition') {
                    alert("Index Error:\n\nThe query requires an index. Check the console for the link to create it..");
                } else {
                    // Don't alert generic errors to avoid spamming, just log
                }
            } finally {
                setLoading(false);
            }
        }

        if (user) {
            fetchLectures();
        }
    }, [user]);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.preventDefault(); // Prevent link navigation
        e.stopPropagation();

        if (!confirm("Are you sure you want to delete this lecture? This cannot be undone.")) return;

        try {
            await deleteDoc(doc(db, "lectures", id));
            setLectures(prev => prev.filter(l => l.id !== id));
        } catch (error) {
            console.error("Error deleting lecture:", error);
            alert("Failed to delete lecture. Check console for details.");
        }
    };

    if (authLoading || (loading && user)) {
        return (
            <div className="flex items-center justify-center min-h-[80vh]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold">My Lectures</h1>
                <Link
                    href="/capture"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full flex items-center gap-2 font-medium transition-colors"
                >
                    <Plus className="h-5 w-5" />
                    New Lecture
                </Link>
            </div>

            {lectures.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-white/10 text-center">
                    <div className="bg-white/10 p-4 rounded-full mb-4">
                        <Book className="h-8 w-8 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">No lectures found</h2>
                    <p className="text-gray-400 mb-6 max-w-sm">
                        You haven't added any lectures yet. Snap a photo of a whiteboard to get started!
                    </p>
                    <Link
                        href="/capture"
                        className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                        Create your first lecture &rarr;
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {lectures.map((lecture) => (
                        <Link
                            key={lecture.id}
                            href={`/lectures/${lecture.id}`}
                            className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-all hover:scale-[1.02] group relative"
                        >
                            <div className="aspect-video relative bg-gray-800">
                                <img
                                    src={lecture.imageUrl}
                                    alt={lecture.title}
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

                                {/* Trash Button */}
                                <button
                                    onClick={(e) => handleDelete(e, lecture.id)}
                                    className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-red-500/80 text-white/70 hover:text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all z-10"
                                    title="Delete Lecture"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>

                                <div className="absolute bottom-3 left-3 right-3">
                                    <h3 className="text-lg font-bold truncate text-white">{lecture.title}</h3>
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                                    <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-xs font-semibold">
                                        {lecture.subject}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>
                                            {lecture.createdAt?.seconds ? new Date(lecture.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-gray-400 text-sm line-clamp-2">
                                    {lecture.summary}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
