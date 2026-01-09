"use client";
import { useState, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { Upload, Camera, ArrowLeft, Loader2, Sparkles, Plus } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { generateLectureNotes } from "../actions";
import Link from "next/link";

export default function CapturePage() {
    const { user } = useAuth();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [images, setImages] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");

    const compressImage = async (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const MAX_WIDTH = 1024; // Resize to max 1024px width
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;

                    const ctx = canvas.getContext("2d");
                    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // Compress to JPEG at 0.7 quality
                    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                    resolve(dataUrl);
                };
            };
        });
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setStatus("Compressing images...");
            const files = Array.from(e.target.files);

            for (const file of files) {
                const compressedDataUrl = await compressImage(file);
                // Functional state update ensuring we append correctly
                setImages(prev => [...prev, file]);
                setPreviews(prev => [...prev, compressedDataUrl]);
            }

            setStatus(""); // Clear status
        }
    };

    // ... (render)

    <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple // Allow multiple files
        className="hidden"
        onChange={handleImageSelect}
    />

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const processImage = async () => {
        if (images.length === 0 || !user) return;

        try {
            setLoading(true);

            // 1. Upload ALL to Firebase Storage
            setStatus("Uploading images...");
            const imageUrls: string[] = [];

            try {
                for (const img of images) {
                    const storageRef = ref(storage, `lectures/${user.uid}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${img.name}`);
                    await uploadBytes(storageRef, img);
                    const url = await getDownloadURL(storageRef);
                    imageUrls.push(url);
                }
            } catch (storageError: any) {
                console.error("Storage Error:", storageError);
                if (storageError.code === 'storage/unauthorized') {
                    alert("Storage Permission Error: Enable Firebase Storage in Test Mode.");
                }
                throw new Error("Storage upload failed");
            }

            // 2. Process with Gemini (Server Action) - Pass Array
            setStatus("Analyzing with Gemini AI...");
            try {
                // previews contains base64 strings
                const aiResponse = await generateLectureNotes(previews);

                if (!aiResponse.success || !aiResponse.data) {
                    throw new Error(aiResponse.error || "Unknown AI Error");
                }

                const aiData = aiResponse.data;

                // 3. Save to Firestore
                setStatus("Saving notes...");
                const docRef = await addDoc(collection(db, "lectures"), {
                    userId: user.uid,
                    imageUrl: imageUrls[0], // Primary image for dashboard
                    imageUrls: imageUrls,   // All images
                    ...aiData,
                    createdAt: serverTimestamp(),
                });
                setStatus("Done!");
                router.push(`/lectures/${docRef.id}`);

            } catch (aiError: any) {
                console.error("Gemini Error:", aiError);
                // Alert the nice underlying error if possible
                const msg = aiError.message.replace("AI Generation Failed: ", "");
                alert(`AI Error: ${msg}`);
                // Don't re-throw to avoid crashing the boundary
            }

        } catch (error: any) {
            console.error("Error processing lecture:", error);

            if (error.code === 'permission-denied' || error.message?.includes("Missing or insufficient permissions")) {
                alert("🔥 Database Permission Error 🔥 Fix Firestore Rules!");
            } else {
                setStatus("Error processing. Please try again.");
            }
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto px-4 py-8 min-h-screen flex flex-col">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="h-6 w-6" />
                </Link>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                    New Lecture
                </h1>
            </div>

            <div className="flex-1 flex flex-col gap-6">
                {/* Horizontal Scroll List of Images */}
                <div className="
                    flex gap-4 overflow-x-auto pb-4 snap-x
                    scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent
                ">
                    {previews.map((src, idx) => (
                        <div key={idx} className="relative flex-shrink-0 w-64 aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 shadow-xl snap-center group">
                            <img src={src} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                            {!loading && (
                                <button
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-2 right-2 bg-black/60 backdrop-blur-md hover:bg-red-500/80 text-white rounded-full p-2 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <ArrowLeft className="h-4 w-4 rotate-45" /> {/* X icon workaround */}
                                </button>
                            )}
                            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold border border-white/10">
                                Page {idx + 1}
                            </div>
                        </div>
                    ))}

                    {/* Add Button (Small) */}
                    {previews.length > 0 && !loading && (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-shrink-0 w-24 aspect-[3/4] border border-dashed border-white/20 hover:border-blue-400/50 hover:bg-blue-500/5 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all group active:scale-95"
                        >
                            <div className="bg-white/5 p-3 rounded-full group-hover:bg-blue-500/20 transition-colors mb-2">
                                <Plus className="h-5 w-5 text-gray-400 group-hover:text-blue-400" />
                            </div>
                            <span className="text-xs font-medium text-gray-500 group-hover:text-blue-400">Add Page</span>
                        </div>
                    )}
                </div>

                {/* Empty State / Main Add Button */}
                {previews.length === 0 && (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex-1 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-blue-500/50 hover:bg-gradient-to-br hover:from-blue-500/5 hover:to-transparent transition-all group min-h-[400px] relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-grid-white/[0.02] mask-image-linear-gradient(to-bottom,transparent,black)" />

                        <div className="relative z-10 bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl shadow-2xl border border-white/5 group-hover:scale-110 transition-transform duration-500">
                            <Camera className="h-10 w-10 text-gray-300 group-hover:text-blue-400 transition-colors" />
                        </div>

                        <div className="relative z-10 text-center">
                            <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-400 transition-colors">Capture Lecture</h3>
                            <p className="text-gray-500 text-sm max-w-[200px]">Tap to take a photo of slides or whiteboard</p>
                        </div>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageSelect}
                />

                {/* Controls */}
                {previews.length > 0 && (
                    <div className="mt-auto animate-in slide-in-from-bottom-4 duration-500">
                        {loading ? (
                            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 text-center border border-white/10 shadow-2xl">
                                <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-3" />
                                <p className="font-bold text-lg">{status}</p>
                                <p className="text-xs text-blue-300/70 mt-1 uppercase tracking-wider">Processing {previews.length} page(s)...</p>
                            </div>
                        ) : (
                            <button
                                onClick={processImage}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-900/40 hover:shadow-blue-900/60 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                            >
                                <Sparkles className="h-5 w-5" />
                                Generate Notes ({previews.length})
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
