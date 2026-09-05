import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ingestWeeklyNote } from "../ingestion/ingest";
import { captureAndRecognizeText, pickAndExtractPdfText } from "../ocr/ocr";
import { startListening, stopListening } from "../voice/voice";
import type { SourceType } from "../types";
import type { RootStackParamList } from "../navigation";

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
    <View style={styles.container}>
      <Text style={styles.label}>Week number</Text>
      <TextInput style={styles.input} keyboardType="number-pad" value={weekNumber} onChangeText={setWeekNumber} />

      <Text style={styles.label}>Topic (e.g. "verb conjugation")</Text>
      <TextInput style={styles.input} value={topic} onChangeText={setTopic} />

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
      />

      <View style={styles.captureRow}>
        <Pressable style={styles.captureButton} onPress={() => handleScan("camera")} disabled={scanning}>
          {scanning ? <ActivityIndicator color="#2563eb" /> : <Text style={styles.captureButtonText}>📷 Scan photo</Text>}
        </Pressable>
        <Pressable
          style={[styles.captureButton, recording && styles.captureButtonActive]}
          onPress={handleToggleRecording}
        >
          <Text style={[styles.captureButtonText, recording && styles.captureButtonTextActive]}>
            {recording ? "⏹ Stop recording" : "🎤 Record voice"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.captureRow}>
        <Pressable style={styles.captureButton} onPress={handleUploadPdf} disabled={uploadingPdf}>
          {uploadingPdf ? <ActivityIndicator color="#2563eb" /> : <Text style={styles.captureButtonText}>📄 Upload PDF</Text>}
        </Pressable>
      </View>

      <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save note"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  label: { fontWeight: "600", marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10 },
  multiline: { height: 180, textAlignVertical: "top" },
  captureRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  captureButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#2563eb",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  captureButtonActive: { backgroundColor: "#dc2626", borderColor: "#dc2626" },
  captureButtonText: { color: "#2563eb", fontWeight: "600" },
  captureButtonTextActive: { color: "white" },
  saveButton: { backgroundColor: "#2563eb", borderRadius: 8, padding: 14, marginTop: 20, alignItems: "center" },
  saveButtonText: { color: "white", fontWeight: "600", fontSize: 16 },
});
