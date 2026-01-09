"use client";
import { useState, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { Upload, Camera, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { generateLectureNotes } from "../actions";
import Link from "next/link";

export default function CapturePage() {
    const { user } = useAuth();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
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
        if (e.target.files && e.target.files[0]) {
            setStatus("Compressing image...");
            const file = e.target.files[0];
            setImage(file);

            const compressedDataUrl = await compressImage(file);
            setPreview(compressedDataUrl);
            setStatus(""); // Clear status
        }
    };

    const processImage = async () => {
        if (!image || !user || !preview) return;

        try {
            setLoading(true);

            // 1. Upload to Firebase Storage
            setStatus("Uploading image...");
            const storageRef = ref(storage, `lectures/${user.uid}/${Date.now()}_${image.name}`);
            let imageUrl = "";
            try {
                await uploadBytes(storageRef, image);
                imageUrl = await getDownloadURL(storageRef);
            } catch (storageError: any) {
                console.error("Storage Error:", storageError);
                if (storageError.code === 'storage/unauthorized') {
                    alert("Storage Permission Error:\n\nYou need to enable 'Firebase Storage' in your console.\n\nGo to Build -> Storage -> Get Started -> Start in Test Mode.");
                } else if (storageError.code === 'storage/object-not-found' || storageError.code === 'storage/bucket-not-found') {
                    alert("Storage Bucket Error:\n\nCheck your .env.local file. Your NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET might be wrong or the Storage service isn't enabled.");
                }
                throw new Error("Storage upload failed");
            }

            // 2. Process with Gemini (Server Action)
            setStatus("Analyzing with Gemini AI...");
            try {
                // preview is the base64 string
                const aiData = await generateLectureNotes(preview);

                // 3. Save to Firestore
                setStatus("Saving notes...");
                const docRef = await addDoc(collection(db, "lectures"), {
                    userId: user.uid,
                    imageUrl,
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
                throw aiError;
            }

        } catch (error: any) {
            console.error("Error processing lecture:", error);

            // Explicitly catch Firestore permission errors that bubble up
            if (error.code === 'permission-denied' || error.message?.includes("Missing or insufficient permissions")) {
                alert("🔥 Database Permission Error 🔥\n\nYour Firestore Database Rules are blocking me from saving the notes!\n\nFIX:\n1. Go to Firebase Console -> Build -> Firestore Database -> Rules\n2. Change 'allow read, write: if false;' to 'allow read, write;'\n(Or simpler: click 'Rules' -> 'Edit Rules' -> Change to allow all)");
            } else {
                setStatus("Error processing image. Please try again.");
            }
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto px-4 py-8 min-h-screen flex flex-col">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-full">
                    <ArrowLeft className="h-6 w-6" />
                </Link>
                <h1 className="text-2xl font-bold">New Lecture</h1>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-8">
                {!preview ? (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full aspect-[3/4] border-2 border-dashed border-gray-700 rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all group"
                    >
                        <div className="bg-gray-800 p-4 rounded-full group-hover:bg-blue-500/20 transition-colors">
                            <Camera className="h-8 w-8 text-gray-400 group-hover:text-blue-400" />
                        </div>
                        <p className="text-gray-400 font-medium group-hover:text-blue-400">Tap to take photo</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handleImageSelect}
                        />
                    </div>
                ) : (
                    <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden border border-gray-700 shadow-2xl">
                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                        {loading ? (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                                <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                                <p className="text-xl font-bold">{status}</p>
                                <p className="text-sm text-gray-400 mt-2">This may take a few seconds...</p>
                            </div>
                        ) : (
                            <div className="absolute bottom-0 left-0 right-0 p-6 flex gap-4">
                                <button
                                    onClick={() => { setPreview(null); setImage(null); }}
                                    className="flex-1 bg-white/10 backdrop-blur-md text-white py-4 rounded-xl font-semibold hover:bg-white/20"
                                >
                                    Retake
                                </button>
                                <button
                                    onClick={processImage}
                                    className="flex-[2] bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                                >
                                    <Sparkles className="h-5 w-5" />
                                    Generate Notes
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
