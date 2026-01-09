export interface Lecture {
    id: string;
    userId: string;
    title: string;
    subject: string;
    summary: string;
    keyPoints: string[];
    imageUrl: string;
    imageUrls?: string[]; // Multiple images support
    createdAt: any; // Firestore Timestamp or Date
    quiz: QuizQuestion[];
}

export interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: number; // Index of correct option
}
