import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { retrieveChunksForQuiz } from "../gemini/retrieval";
import { generateQuiz } from "../gemini/client";
import { getTopicMastery, recordQuizAttempt, upsertTopicMastery } from "../db/database";
import { newMastery, scheduleNextReview } from "../spacedRepetition/sm2";
import type { Chunk, QuizMode, QuizQuestion } from "../types";
import type { RootStackParamList } from "../navigation";
import { colors, radius, shadow, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "QuizSession">;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

/**
 * A lightweight, local heuristic — not authoritative. Used only to give the
 * learner an instant hint before they self-grade with the Got it right/wrong
 * buttons, since these answers (translations, pinyin) can be phrased many
 * valid ways that a strict match would wrongly reject.
 */
function looksCorrect(userAnswer: string, correctAnswer: string): boolean {
  const userNorm = normalize(userAnswer);
  const correctNorm = normalize(correctAnswer);
  if (!userNorm) return false;
  if (userNorm === correctNorm) return true;
  if (correctNorm.includes(userNorm) || userNorm.includes(correctNorm)) return true;

  const correctWords = correctNorm.split(/\s+/).filter((w) => w.length > 2);
  if (correctWords.length === 0) return false;
  const userWords = new Set(userNorm.split(/\s+/));
  const matched = correctWords.filter((w) => userWords.has(w)).length;
  return matched / correctWords.length >= 0.6;
}

const MODE_OPTIONS: { kind: "due" | "weakSpots"; icon: keyof typeof Ionicons.glyphMap; label: string; blurb: string }[] = [
  { kind: "due", icon: "calendar", label: "Due for review", blurb: "Topics scheduled for review today" },
  { kind: "weakSpots", icon: "barbell", label: "Weak spots", blurb: "Topics you've struggled with most" },
];

function ModePicker({
  onSelect,
}: {
  onSelect: (mode: QuizMode) => void;
}) {
  const [weekInput, setWeekInput] = useState("");
  const [topicQuery, setTopicQuery] = useState("");

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.pickerHeading}>How do you want to revise?</Text>

      {MODE_OPTIONS.map((opt) => (
        <Pressable key={opt.kind} style={[styles.card, shadow.card, styles.modeCard]} onPress={() => onSelect({ kind: opt.kind })}>
          <View style={styles.modeIcon}>
            <Ionicons name={opt.icon} size={20} color={colors.primaryDark} />
          </View>
          <View style={styles.modeText}>
            <Text style={styles.modeLabel}>{opt.label}</Text>
            <Text style={styles.modeBlurb}>{opt.blurb}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      ))}

      <View style={[styles.card, shadow.card, styles.modeCard]}>
        <View style={styles.modeIcon}>
          <Ionicons name="albums" size={20} color={colors.primaryDark} />
        </View>
        <View style={styles.modeText}>
          <Text style={styles.modeLabel}>By week</Text>
          <TextInput
            style={styles.inlineInput}
            placeholder="Week number"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            value={weekInput}
            onChangeText={setWeekInput}
          />
        </View>
        <Pressable
          style={styles.goButton}
          disabled={!weekInput.trim()}
          onPress={() => onSelect({ kind: "week", weekNumber: Number(weekInput) || 1 })}
        >
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </Pressable>
      </View>

      <View style={[styles.card, shadow.card, styles.modeCard]}>
        <View style={styles.modeIcon}>
          <Ionicons name="search" size={20} color={colors.primaryDark} />
        </View>
        <View style={styles.modeText}>
          <Text style={styles.modeLabel}>Search a topic</Text>
          <TextInput
            style={styles.inlineInput}
            placeholder="e.g. subjunctive mood"
            placeholderTextColor={colors.textMuted}
            value={topicQuery}
            onChangeText={setTopicQuery}
          />
        </View>
        <Pressable
          style={styles.goButton}
          disabled={!topicQuery.trim()}
          onPress={() => onSelect({ kind: "topicQuery", query: topicQuery.trim() })}
        >
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

export default function QuizSessionScreen({ route }: Props) {
  const { subjectId } = route.params;
  const [mode, setMode] = useState<QuizMode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [sourceChunks, setSourceChunks] = useState<Chunk[]>([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [autoHint, setAutoHint] = useState<boolean | null>(null);

  useEffect(() => {
    if (!mode) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const chunks = await retrieveChunksForQuiz(subjectId, mode);
        setSourceChunks(chunks);
        const generated = await generateQuiz(chunks);
        setQuestions(generated);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [subjectId, mode]);

  function resetToModePicker() {
    setMode(null);
    setQuestions([]);
    setSourceChunks([]);
    setCurrent(0);
    setAnswer("");
    setRevealed(false);
    setError(null);
  }

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
    setAutoHint(null);
    setCurrent((c) => c + 1);
  }

  if (!mode) {
    return <ModePicker onSelect={setMode} />;
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
        <Pressable style={styles.standaloneButton} onPress={resetToModePicker}>
          <Text style={styles.buttonText}>Choose a different mode</Text>
        </Pressable>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="document-outline" size={40} color={colors.textMuted} />
        <Text style={styles.hint}>No notes matched this mode — try a different one, or add notes first.</Text>
        <Pressable style={styles.standaloneButton} onPress={resetToModePicker}>
          <Text style={styles.buttonText}>Choose a different mode</Text>
        </Pressable>
      </View>
    );
  }

  if (current >= questions.length) {
    return (
      <View style={styles.center}>
        <Ionicons name="trophy" size={48} color={colors.accent} />
        <Text style={styles.done}>Nice work — quiz complete!</Text>
        <Pressable style={styles.standaloneButton} onPress={resetToModePicker}>
          <Ionicons name="refresh" size={18} color={colors.white} />
          <Text style={styles.buttonText}>Revise something else</Text>
        </Pressable>
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
          <Pressable
            style={styles.button}
            onPress={() => {
              setAutoHint(answer.trim() ? looksCorrect(answer, q.answer) : null);
              setRevealed(true);
            }}
          >
            <Ionicons name={answer.trim() ? "checkmark-done" : "eye"} size={18} color={colors.white} />
            <Text style={styles.buttonText}>{answer.trim() ? "Validate answer" : "Reveal answer"}</Text>
          </Pressable>
        ) : (
          <>
            {autoHint !== null && (
              <View style={[styles.hintBadge, autoHint ? styles.hintBadgeGood : styles.hintBadgeUnsure]}>
                <Ionicons
                  name={autoHint ? "checkmark-circle" : "help-circle"}
                  size={14}
                  color={autoHint ? colors.success : colors.textMuted}
                />
                <Text style={[styles.hintBadgeText, { color: autoHint ? colors.success : colors.textMuted }]}>
                  {autoHint ? "Looks right — compare with the answer below" : "Doesn't clearly match — check below"}
                </Text>
              </View>
            )}
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
  container: { padding: spacing.lg, gap: spacing.md },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg, gap: spacing.md, backgroundColor: colors.bg },
  hint: { color: colors.textMuted, textAlign: "center" },
  error: { color: colors.danger, textAlign: "center" },
  done: { fontSize: 20, fontWeight: "700", color: colors.text },
  pickerHeading: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  modeCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  modeIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  modeText: { flex: 1 },
  modeLabel: { fontSize: 15, fontWeight: "700", color: colors.text },
  modeBlurb: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  inlineInput: {
    marginTop: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.xs,
    color: colors.text,
    fontSize: 14,
  },
  goButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    opacity: 1,
  },
  progressTrack: { height: 8, borderRadius: radius.pill, backgroundColor: colors.primarySoft, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: radius.pill },
  progressLabel: { color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.sm, fontSize: 13 },
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
  hintBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    alignSelf: "flex-start",
  },
  hintBadgeGood: { backgroundColor: "#DCFCE7" },
  hintBadgeUnsure: { backgroundColor: colors.bg },
  hintBadgeText: { fontSize: 12, fontWeight: "600" },
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
  standaloneButton: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  buttonText: { color: colors.white, fontWeight: "700" },
  gradeRow: { flexDirection: "row", gap: spacing.md },
  wrong: { backgroundColor: colors.danger },
  correct: { backgroundColor: colors.success },
});
