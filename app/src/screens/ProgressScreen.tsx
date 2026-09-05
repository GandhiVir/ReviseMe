import { useCallback, useState } from "react";
import { FlatList, Text, View, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getTopicMastery } from "../db/database";
import { isDue } from "../spacedRepetition/sm2";
import type { TopicMastery } from "../types";
import type { RootStackParamList } from "../navigation";

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
      contentContainerStyle={styles.container}
      data={mastery}
      keyExtractor={(m) => m.topic}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.topic}>{item.topic}</Text>
          <Text style={[styles.status, isDue(item) ? styles.due : styles.notDue]}>
            {isDue(item) ? "Due for review" : `Next review: ${new Date(item.nextDueDate).toLocaleDateString()}`}
          </Text>
          <Text style={styles.streak}>Correct streak: {item.correctStreak}</Text>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.empty}>No quiz history yet for this subject.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  topic: { fontSize: 16, fontWeight: "600" },
  status: { marginTop: 2 },
  due: { color: "#dc2626" },
  notDue: { color: "#16a34a" },
  streak: { color: "#888", marginTop: 2 },
  empty: { textAlign: "center", color: "#888", marginTop: 40 },
});
