import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { retrieveChunksForQuiz } from "../gemini/retrieval";
import { generateQuiz } from "../gemini/client";
import { getTopicMastery, recordQuizAttempt, upsertTopicMastery } from "../db/database";
import { newMastery, scheduleNextReview } from "../spacedRepetition/sm2";
import type { Chunk, QuizQuestion } from "../types";
import type { RootStackParamList } from "../navigation";
import { colors, radius, shadow, spacing } from "../theme";

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
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.hint}>Retrieving your notes and generating questions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle" size={40} color={colors.danger} />
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="document-outline" size={40} color={colors.textMuted} />
        <Text style={styles.hint}>No notes to quiz on yet — add some notes for this subject first.</Text>
      </View>
    );
  }

  if (current >= questions.length) {
    return (
      <View style={styles.center}>
        <Ionicons name="trophy" size={48} color={colors.accent} />
        <Text style={styles.done}>Nice work — quiz complete!</Text>
      </View>
    );
  }

  const q = questions[current];
  const progressPct = ((current + (revealed ? 0.5 : 0)) / questions.length) * 100;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>
      <Text style={styles.progressLabel}>
        Question {current + 1} of {questions.length}
      </Text>

      <View style={[styles.card, shadow.card]}>
        <Text style={styles.question}>{q.question}</Text>

        <TextInput
          style={styles.input}
          placeholder="Your answer"
          placeholderTextColor={colors.textMuted}
          value={answer}
          onChangeText={setAnswer}
          editable={!revealed}
        />

        {!revealed ? (
          <Pressable style={styles.button} onPress={() => setRevealed(true)}>
            <Ionicons name="eye" size={18} color={colors.white} />
            <Text style={styles.buttonText}>Reveal answer</Text>
          </Pressable>
        ) : (
          <>
            <View style={styles.answerBox}>
              <Ionicons name="bulb" size={18} color={colors.primaryDark} />
              <Text style={styles.answerText}>{q.answer}</Text>
            </View>
            <View style={styles.gradeRow}>
              <Pressable style={[styles.button, styles.wrong]} onPress={() => handleGrade(false)}>
                <Ionicons name="close-circle" size={18} color={colors.white} />
                <Text style={styles.buttonText}>Got it wrong</Text>
              </Pressable>
              <Pressable style={[styles.button, styles.correct]} onPress={() => handleGrade(true)}>
                <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                <Text style={styles.buttonText}>Got it right</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg, gap: spacing.md, backgroundColor: colors.bg },
  hint: { color: colors.textMuted, textAlign: "center" },
  error: { color: colors.danger, textAlign: "center" },
  done: { fontSize: 20, fontWeight: "700", color: colors.text },
  progressTrack: { height: 8, borderRadius: radius.pill, backgroundColor: colors.primarySoft, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: radius.pill },
  progressLabel: { color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.lg, fontSize: 13 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  question: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.lg },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
    color: colors.text,
    fontSize: 15,
  },
  answerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  answerText: { flex: 1, fontSize: 15, color: colors.primaryDark, fontWeight: "600" },
  button: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  buttonText: { color: colors.white, fontWeight: "700" },
  gradeRow: { flexDirection: "row", gap: spacing.md },
  wrong: { backgroundColor: colors.danger },
  correct: { backgroundColor: colors.success },
});
