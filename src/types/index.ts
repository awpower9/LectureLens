export interface Lecture {
    id: string;
    userId: string;
    title: string;
    subject: string;
    createdAt: any; // Firestore Timestamp or Date
    imageUrl: string;
    summary: string;
    keyPoints: string[];
    quiz: QuizQuestion[];
}

export interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: number; // Index of correct option
}
