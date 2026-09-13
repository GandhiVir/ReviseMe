import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { createSubject, listSubjects } from "../db/database";
import type { Subject } from "../types";
import type { RootStackParamList } from "../navigation";
import { colors, radius, shadow, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "SubjectList">;

const SUBJECT_ICONS = ["book", "flask", "chatbubbles", "color-palette", "calculator", "globe", "musical-notes", "laptop"] as const;
function iconFor(name: string): (typeof SUBJECT_ICONS)[number] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return SUBJECT_ICONS[hash % SUBJECT_ICONS.length];
}

export default function SubjectListScreen({ navigation }: Props) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubjectName, setNewSubjectName] = useState("");

  useFocusEffect(
    useCallback(() => {
      listSubjects().then(setSubjects);
    }, [])
  );

  async function handleAddSubject() {
    const name = newSubjectName.trim();
    if (!name) return;
    await createSubject(name);
    setNewSubjectName("");
    setSubjects(await listSubjects());
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subheading}>Pick a subject to add notes or start a revision quiz.</Text>

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="New subject (e.g. Spanish)"
          placeholderTextColor={colors.textMuted}
          value={newSubjectName}
          onChangeText={setNewSubjectName}
          onSubmitEditing={handleAddSubject}
        />
        <Pressable style={styles.addButton} onPress={handleAddSubject}>
          <Ionicons name="add" size={26} color={colors.white} />
        </Pressable>
      </View>

      <FlatList
        data={subjects}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.card, shadow.card]}>
            <View style={styles.cardHeader}>
              <View style={styles.iconBadge}>
                <Ionicons name={iconFor(item.name)} size={20} color={colors.primaryDark} />
              </View>
              <Text style={styles.subjectName}>{item.name}</Text>
            </View>
            <View style={styles.actions}>
              <Pressable
                style={[styles.actionPill, styles.actionPillMuted]}
                onPress={() => navigation.navigate("NoteEntry", { subjectId: item.id, subjectName: item.name })}
              >
                <Ionicons name="create-outline" size={15} color={colors.primaryDark} />
                <Text style={styles.actionTextMuted}>Add notes</Text>
              </Pressable>
              <Pressable
                style={styles.actionPill}
                onPress={() => navigation.navigate("QuizSession", { subjectId: item.id, subjectName: item.name })}
              >
                <Ionicons name="flash" size={15} color={colors.white} />
                <Text style={styles.actionText}>Quiz me</Text>
              </Pressable>
              <Pressable
                style={[styles.actionPill, styles.actionPillMuted]}
                onPress={() => navigation.navigate("Progress", { subjectId: item.id, subjectName: item.name })}
              >
                <Ionicons name="stats-chart" size={15} color={colors.primaryDark} />
                <Text style={styles.actionTextMuted}>Progress</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="sparkles" size={40} color={colors.primary} />
            <Text style={styles.empty}>Add a subject above to get started.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  subheading: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg },
  addRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.button,
  },
  listContent: { gap: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  subjectName: { fontSize: 19, fontWeight: "700", color: colors.text },
  actions: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  actionPillMuted: { backgroundColor: colors.primarySoft },
  actionText: { color: colors.white, fontWeight: "600", fontSize: 13 },
  actionTextMuted: { color: colors.primaryDark, fontWeight: "600", fontSize: 13 },
  emptyState: { alignItems: "center", marginTop: 80, gap: spacing.md },
  empty: { textAlign: "center", color: colors.textMuted, fontSize: 15 },
});
