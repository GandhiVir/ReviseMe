import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createSubject, listSubjects } from "../db/database";
import type { Subject } from "../types";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "SubjectList">;

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
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="New subject (e.g. Spanish)"
          value={newSubjectName}
          onChangeText={setNewSubjectName}
          onSubmitEditing={handleAddSubject}
        />
        <Pressable style={styles.addButton} onPress={handleAddSubject}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={subjects}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => (
          <View style={styles.subjectRow}>
            <Text style={styles.subjectName}>{item.name}</Text>
            <View style={styles.actions}>
              <Pressable onPress={() => navigation.navigate("NoteEntry", { subjectId: item.id, subjectName: item.name })}>
                <Text style={styles.actionText}>Add notes</Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate("QuizSession", { subjectId: item.id, subjectName: item.name })}>
                <Text style={styles.actionText}>Quiz me</Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate("Progress", { subjectId: item.id, subjectName: item.name })}>
                <Text style={styles.actionText}>Progress</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Add a subject to get started.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  addRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10 },
  addButton: { backgroundColor: "#2563eb", borderRadius: 8, paddingHorizontal: 16, justifyContent: "center" },
  addButtonText: { color: "white", fontWeight: "600" },
  subjectRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  subjectName: { fontSize: 18, fontWeight: "600", marginBottom: 6 },
  actions: { flexDirection: "row", gap: 16 },
  actionText: { color: "#2563eb" },
  empty: { textAlign: "center", color: "#888", marginTop: 40 },
});
