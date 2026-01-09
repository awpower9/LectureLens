"use client";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Lecture } from "@/types";
import { ArrowLeft, BookOpen, Brain, CheckCircle, XCircle, Share2, Calendar } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function LecturePage({ params }: { params: Promise<{ id: string }> }) {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [lecture, setLecture] = useState<Lecture | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"notes" | "quiz">("notes");
    const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
    const [showResults, setShowResults] = useState(false);
    const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);

    // Unwrap params
    useEffect(() => {
        params.then(setResolvedParams);
    }, [params]);

    useEffect(() => {
        async function fetchLecture() {
            if (!user || !resolvedParams) return;
            try {
                const docRef = doc(db, "lectures", resolvedParams.id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setLecture({ id: docSnap.id, ...docSnap.data() } as Lecture);
                } else {
                    router.push("/dashboard");
                }
            } catch (error) {
                console.error("Error fetching lecture:", error);
            } finally {
                setLoading(false);
            }
        }

        if (!authLoading && resolvedParams) {
            if (!user) {
                router.push("/");
            } else {
                fetchLecture();
            }
        }
    }, [user, resolvedParams, authLoading, router]);

    if (loading) return null;
    if (!lecture) return null;

    const handleQuizSubmit = () => {
        setShowResults(true);
    };

    const calculateScore = () => {
        let score = 0;
        lecture.quiz.forEach((q, idx) => {
            if (quizAnswers[idx] === q.correctAnswer) score++;
        });
        return score;
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 pb-20">
            {/* Header */}
            <div className="mb-8">
                <Link href="/dashboard" className="inline-flex items-center text-gray-400 hover:text-white mb-4">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
                </Link>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">{lecture.title}</h1>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full">{lecture.subject}</span>
                            <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {lecture.createdAt?.seconds ? new Date(lecture.createdAt.seconds * 1000).toLocaleDateString() : "Just now"}
                            </span>
                        </div>
                    </div>
                    {/* Share or Actions could go here */}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center border-b border-gray-800 mb-8">
                <button
                    onClick={() => setActiveTab("notes")}
                    className={cn(
                        "px-8 py-3 font-medium transition-colors relative",
                        activeTab === "notes" ? "text-blue-400" : "text-gray-400 hover:text-white"
                    )}
                >
                    Notes
                    {activeTab === "notes" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />}
                </button>
                <button
                    onClick={() => setActiveTab("quiz")}
                    className={cn(
                        "px-8 py-3 font-medium transition-colors relative",
                        activeTab === "quiz" ? "text-purple-400" : "text-gray-400 hover:text-white"
                    )}
                >
                    Quiz
                    {activeTab === "quiz" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400" />}
                </button>
            </div>

            {/* Content */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === "notes" ? (
                    <div className="space-y-8">
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-blue-400" /> Summary
                            </h2>
                            <p className="text-gray-300 leading-relaxed text-lg">{lecture.summary}</p>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <Brain className="h-5 w-5 text-purple-400" /> Key Points
                            </h2>
                            <ul className="space-y-4">
                                {lecture.keyPoints.map((point, idx) => (
                                    <li key={idx} className="flex items-start gap-4">
                                        <div className="bg-purple-500/20 text-purple-300 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">
                                            {idx + 1}
                                        </div>
                                        <p className="text-gray-300 pt-1">{point}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Original Image Accordion/Preview could be added here */}
                        <div className="mt-8">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Original Capture</h3>
                            <div className="rounded-xl overflow-hidden max-w-sm">
                                <img src={lecture.imageUrl} alt="Original" className="w-full" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8 max-w-2xl mx-auto">
                        {showResults && (
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center mb-8">
                                <p className="text-white/80 font-medium mb-1">Your Score</p>
                                <h2 className="text-5xl font-bold mb-2">{calculateScore()} / {lecture.quiz.length}</h2>
                                <p className="text-white/90">
                                    {calculateScore() === lecture.quiz.length ? "Perfect score! You're a genius." : "Great effort! Review the notes and try again."}
                                </p>
                                <button
                                    onClick={() => { setShowResults(false); setQuizAnswers({}); }}
                                    className="mt-6 bg-white text-black px-6 py-2 rounded-full font-bold text-sm hover:bg-gray-100 transition-colors"
                                >
                                    Retake Quiz
                                </button>
                            </div>
                        )}

                        {lecture.quiz.map((q, qIdx) => (
                            <div key={qIdx} className="bg-white/5 rounded-2xl p-6 border border-white/10">
                                <h3 className="text-lg font-semibold mb-6 flex gap-3">
                                    <span className="text-gray-500">{qIdx + 1}.</span>
                                    {q.question}
                                </h3>
                                <div className="space-y-3">
                                    {q.options.map((option, oIdx) => {
                                        const isSelected = quizAnswers[qIdx] === oIdx;
                                        const isCorrect = q.correctAnswer === oIdx;
                                        const showCorrectness = showResults;

                                        let btnClass = "w-full text-left p-4 rounded-xl border border-white/5 transition-all ";

                                        if (showCorrectness) {
                                            if (isCorrect) btnClass += "bg-green-500/20 border-green-500/50 text-green-200";
                                            else if (isSelected && !isCorrect) btnClass += "bg-red-500/20 border-red-500/50 text-red-200";
                                            else btnClass += "opacity-50"; // Dim others
                                        } else {
                                            if (isSelected) btnClass += "bg-blue-500/20 border-blue-500 text-blue-200";
                                            else btnClass += "hover:bg-white/10 hover:border-white/20";
                                        }

                                        return (
                                            <button
                                                key={oIdx}
                                                onClick={() => !showResults && setQuizAnswers(prev => ({ ...prev, [qIdx]: oIdx }))}
                                                disabled={showResults}
                                                className={btnClass}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span>{option}</span>
                                                    {showCorrectness && isCorrect && <CheckCircle className="h-5 w-5 text-green-400" />}
                                                    {showCorrectness && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-red-400" />}
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}

                        {!showResults && (
                            <button
                                onClick={handleQuizSubmit}
                                disabled={Object.keys(quizAnswers).length !== lecture.quiz.length}
                                className="w-full bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-purple-600/20 transition-all"
                            >
                                Submit Quiz
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
