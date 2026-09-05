import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { retrieveChunksForQuiz } from "../gemini/retrieval";
import { generateQuiz } from "../gemini/client";
import { getTopicMastery, recordQuizAttempt, upsertTopicMastery } from "../db/database";
import { newMastery, scheduleNextReview } from "../spacedRepetition/sm2";
import type { Chunk, QuizQuestion } from "../types";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "QuizSession">;

export default function QuizSessionScreen({ route }: Props) {
  const { subjectId } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [sourceChunks, setSourceChunks] = useState<Chunk[]>([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const chunks = await retrieveChunksForQuiz(subjectId, { kind: "due" });
        setSourceChunks(chunks);
        const generated = await generateQuiz(chunks);
        setQuestions(generated);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [subjectId]);

  async function handleGrade(wasCorrect: boolean) {
    const q = questions[current];
    const chunk = sourceChunks.find((c) => q.sourceChunkIds.includes(c.id));
    const topic = chunk?.topic ?? "general";

    const existing = (await getTopicMastery(subjectId)).find((m) => m.topic === topic) ?? newMastery(subjectId, topic);
    await upsertTopicMastery(scheduleNextReview(existing, wasCorrect));

    await recordQuizAttempt({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      subjectId,
      question: q.question,
      correctAnswer: q.answer,
      sourceChunkIds: q.sourceChunkIds,
      userAnswer: answer || null,
      wasCorrect,
      timestamp: new Date().toISOString(),
    });

    setAnswer("");
    setRevealed(false);
    setCurrent((c) => c + 1);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.hint}>Retrieving your notes and generating questions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.center}>
        <Text>No notes to quiz on yet — add some notes for this subject first.</Text>
      </View>
    );
  }

  if (current >= questions.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.done}>Nice work — quiz complete!</Text>
      </View>
    );
  }

  const q = questions[current];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.progress}>
        Question {current + 1} of {questions.length}
      </Text>
      <Text style={styles.question}>{q.question}</Text>

      <TextInput
        style={styles.input}
        placeholder="Your answer"
        value={answer}
        onChangeText={setAnswer}
        editable={!revealed}
      />

      {!revealed ? (
        <Pressable style={styles.button} onPress={() => setRevealed(true)}>
          <Text style={styles.buttonText}>Reveal answer</Text>
        </Pressable>
      ) : (
        <>
          <Text style={styles.answer}>Correct answer: {q.answer}</Text>
          <View style={styles.gradeRow}>
            <Pressable style={[styles.button, styles.wrong]} onPress={() => handleGrade(false)}>
              <Text style={styles.buttonText}>Got it wrong</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.correct]} onPress={() => handleGrade(true)}>
              <Text style={styles.buttonText}>Got it right</Text>
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16, gap: 12 },
  hint: { color: "#888" },
  error: { color: "#dc2626" },
  done: { fontSize: 18, fontWeight: "600" },
  progress: { color: "#888", marginBottom: 8 },
  question: { fontSize: 18, fontWeight: "600", marginBottom: 16 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 16 },
  answer: { fontSize: 16, marginBottom: 16, color: "#2563eb" },
  button: { backgroundColor: "#2563eb", borderRadius: 8, padding: 14, alignItems: "center", flex: 1 },
  buttonText: { color: "white", fontWeight: "600" },
  gradeRow: { flexDirection: "row", gap: 12 },
  wrong: { backgroundColor: "#dc2626" },
  correct: { backgroundColor: "#16a34a" },
});
