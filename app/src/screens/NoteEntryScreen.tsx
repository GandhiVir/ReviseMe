import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ingestWeeklyNote } from "../ingestion/ingest";
import { captureAndRecognizeText, pickAndExtractPdfText } from "../ocr/ocr";
import { startListening, stopListening } from "../voice/voice";
import type { SourceType } from "../types";
import type { RootStackParamList } from "../navigation";
import { colors, gradients, radius, shadow, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "NoteEntry">;

function appendText(existing: string, addition: string): string {
  const trimmed = addition.trim();
  if (!trimmed) return existing;
  return existing ? `${existing}\n\n${trimmed}` : trimmed;
}

export default function NoteEntryScreen({ route, navigation }: Props) {
  const { subjectId } = route.params;
  const [weekNumber, setWeekNumber] = useState("1");
  const [topic, setTopic] = useState("");
  const [rawText, setRawText] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("typed");
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [recording, setRecording] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  async function handleSave() {
    if (!topic.trim() || !rawText.trim()) {
      Alert.alert("Missing info", "Please fill in both a topic and your notes.");
      return;
    }
    setSaving(true);
    try {
      await ingestWeeklyNote({
        subjectId,
        weekNumber: Number(weekNumber) || 1,
        rawText,
        topic: topic.trim(),
        sourceType,
      });
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  async function handleScan(source: "camera" | "library") {
    setScanning(true);
    try {
      const recognized = await captureAndRecognizeText(source);
      if (recognized) {
        setRawText((prev) => appendText(prev, recognized));
        setSourceType("ocr");
      }
    } catch (e) {
      Alert.alert("Scan failed", e instanceof Error ? e.message : String(e));
    } finally {
      setScanning(false);
    }
  }

  async function handleUploadPdf() {
    setUploadingPdf(true);
    try {
      const extracted = await pickAndExtractPdfText();
      if (extracted) {
        setRawText((prev) => appendText(prev, extracted));
        setSourceType("pdf");
      }
    } catch (e) {
      Alert.alert("PDF import failed", e instanceof Error ? e.message : String(e));
    } finally {
      setUploadingPdf(false);
    }
  }

  async function handleToggleRecording() {
    if (!recording) {
      setRecording(true);
      try {
        await startListening();
      } catch (e) {
        setRecording(false);
        Alert.alert("Couldn't start recording", e instanceof Error ? e.message : String(e));
      }
      return;
    }

    setRecording(false);
    try {
      const transcript = await stopListening();
      setRawText((prev) => appendText(prev, transcript));
      setSourceType("voice");
    } catch (e) {
      Alert.alert("Transcription failed", e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={[styles.card, shadow.card]}>
        <View style={styles.row}>
          <View style={styles.weekField}>
            <Text style={styles.label}>Week</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={weekNumber}
              onChangeText={setWeekNumber}
            />
          </View>
          <View style={styles.topicField}>
            <Text style={styles.label}>Topic</Text>
            <TextInput
              style={styles.input}
              value={topic}
              onChangeText={setTopic}
              placeholder="e.g. verb conjugation"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>
      </View>

      <View style={[styles.card, shadow.card]}>
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          multiline
          value={rawText}
          onChangeText={(text) => {
            setRawText(text);
            setSourceType("typed");
          }}
          placeholder="Type, scan a photo, upload a PDF, or record a voice note..."
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={[styles.card, shadow.card]}>
        <Text style={styles.cardTitle}>Capture</Text>
        <View style={styles.captureRow}>
          <Pressable style={styles.captureButton} onPress={() => handleScan("camera")} disabled={scanning}>
            {scanning ? (
              <ActivityIndicator color={colors.primaryDark} />
            ) : (
              <>
                <Ionicons name="camera" size={22} color={colors.primaryDark} />
                <Text style={styles.captureButtonText}>Take photo</Text>
              </>
            )}
          </Pressable>
          <Pressable style={styles.captureButton} onPress={() => handleScan("library")} disabled={scanning}>
            {scanning ? (
              <ActivityIndicator color={colors.primaryDark} />
            ) : (
              <>
                <Ionicons name="image" size={22} color={colors.primaryDark} />
                <Text style={styles.captureButtonText}>Upload photo</Text>
              </>
            )}
          </Pressable>
          <Pressable style={styles.captureButton} onPress={handleUploadPdf} disabled={uploadingPdf}>
            {uploadingPdf ? (
              <ActivityIndicator color={colors.primaryDark} />
            ) : (
              <>
                <Ionicons name="document-text" size={22} color={colors.primaryDark} />
                <Text style={styles.captureButtonText}>Upload PDF</Text>
              </>
            )}
          </Pressable>
          <Pressable
            style={[styles.captureButton, recording && styles.captureButtonActive]}
            onPress={handleToggleRecording}
          >
            <Ionicons
              name={recording ? "stop-circle" : "mic"}
              size={22}
              color={recording ? colors.white : colors.primaryDark}
            />
            <Text style={[styles.captureButtonText, recording && styles.captureButtonTextActive]}>
              {recording ? "Stop" : "Record"}
            </Text>
          </Pressable>
        </View>
      </View>

      <Pressable onPress={handleSave} disabled={saving} style={shadow.button}>
        <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveButton}>
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={colors.white} />
              <Text style={styles.saveButtonText}>Save note</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  row: { flexDirection: "row", gap: spacing.md },
  weekField: { width: 80 },
  topicField: { flex: 1 },
  label: { fontWeight: "600", color: colors.textMuted, marginBottom: spacing.xs, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    color: colors.text,
    fontSize: 15,
  },
  multiline: { height: 160, textAlignVertical: "top", marginTop: spacing.xs },
  captureRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  captureButton: {
    flexBasis: "47%",
    flexGrow: 1,
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  captureButtonActive: { backgroundColor: colors.danger },
  captureButtonText: { color: colors.primaryDark, fontWeight: "600", fontSize: 12 },
  captureButtonTextActive: { color: colors.white },
  saveButton: {
    flexDirection: "row",
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: { color: colors.white, fontWeight: "700", fontSize: 16 },
});
