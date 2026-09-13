import { useCallback, useState } from "react";
import { FlatList, Text, View, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { getTopicMastery } from "../db/database";
import { isDue } from "../spacedRepetition/sm2";
import type { TopicMastery } from "../types";
import type { RootStackParamList } from "../navigation";
import { colors, radius, shadow, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Progress">;

export default function ProgressScreen({ route }: Props) {
  const { subjectId } = route.params;
  const [mastery, setMastery] = useState<TopicMastery[]>([]);

  useFocusEffect(
    useCallback(() => {
      getTopicMastery(subjectId).then(setMastery);
    }, [subjectId])
  );

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.container}
      data={mastery}
      keyExtractor={(m) => m.topic}
      renderItem={({ item }) => {
        const due = isDue(item);
        return (
          <View style={[styles.card, shadow.card]}>
            <View style={styles.cardTop}>
              <Text style={styles.topic}>{item.topic}</Text>
              <View style={[styles.badge, due ? styles.badgeDue : styles.badgeOk]}>
                <Ionicons
                  name={due ? "alert-circle" : "checkmark-circle"}
                  size={13}
                  color={due ? colors.danger : colors.success}
                />
                <Text style={[styles.badgeText, { color: due ? colors.danger : colors.success }]}>
                  {due ? "Due" : "On track"}
                </Text>
              </View>
            </View>
            <Text style={styles.status}>
              {due ? "Ready for review now" : `Next review: ${new Date(item.nextDueDate).toLocaleDateString()}`}
            </Text>
            <View style={styles.streakRow}>
              <Ionicons name="flame" size={16} color={colors.accent} />
              <Text style={styles.streak}>{item.correctStreak} correct in a row</Text>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="stats-chart-outline" size={40} color={colors.textMuted} />
          <Text style={styles.empty}>No quiz history yet for this subject.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg },
  container: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  topic: { fontSize: 16, fontWeight: "700", color: colors.text },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  badgeDue: { backgroundColor: "#FEE2E2" },
  badgeOk: { backgroundColor: "#DCFCE7" },
  badgeText: { fontSize: 12, fontWeight: "700" },
  status: { color: colors.textMuted, fontSize: 13 },
  streakRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm },
  streak: { color: colors.text, fontSize: 13, fontWeight: "600" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, paddingTop: 80 },
  empty: { textAlign: "center", color: colors.textMuted, fontSize: 15 },
});
