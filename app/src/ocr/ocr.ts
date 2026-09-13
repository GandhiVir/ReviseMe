import TextRecognition from "@react-native-ml-kit/text-recognition";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { extractTextFromFile, ProxyRequestError } from "../gemini/client";

/**
 * Extracts vocabulary from an image: Gemini identifies vocabulary terms
 * (skipping dates, headers, unrelated sentences) and returns each as
 * "original : pronunciation : translation" — handles handwriting and
 * non-Latin scripts, which on-device ML Kit cannot. If that request is
 * rate-limited (free-tier 429) or otherwise fails, falls back to on-device
 * ML Kit OCR — but ML Kit only does raw Latin-script transcription, with no
 * vocab filtering, pronunciation, or translation, so the fallback result
 * looks different (and won't help with non-Latin scripts at all).
 */
export async function recognizeTextFromImage(imageUri: string, mimeType: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
    return await extractTextFromFile(base64, mimeType);
  } catch (e) {
    const isRateLimited = e instanceof ProxyRequestError && e.status === 429;
    console.warn(
      isRateLimited
        ? "Gemini OCR rate-limited, falling back to on-device ML Kit"
        : `Gemini OCR failed (${e instanceof Error ? e.message : String(e)}), falling back to on-device ML Kit`
    );
    const result = await TextRecognition.recognize(imageUri);
    return result.text;
  }
}

/**
 * Prompts the user to take a photo or pick one from their library, then
 * runs OCR on it (Gemini, with on-device ML Kit fallback — see
 * recognizeTextFromImage). Returns null if the user cancels.
 */
export async function captureAndRecognizeText(source: "camera" | "library"): Promise<string | null> {
  const permission =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error("Permission to access the camera/photo library was denied.");
  }

  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync({ quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 1 });

  if (result.canceled) return null;

  const asset = result.assets[0];
  return recognizeTextFromImage(asset.uri, asset.mimeType ?? "image/jpeg");
}

/**
 * Prompts the user to pick a PDF, then sends it to Gemini for vocabulary
 * extraction (same "original : pronunciation : translation" format as
 * recognizeTextFromImage) — Gemini reads PDFs natively (including
 * scanned/handwritten pages), so there's no on-device fallback here; ML Kit
 * only handles images. Returns null if the user cancels.
 */
export async function pickAndExtractPdfText(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
  if (result.canceled) return null;

  const asset = result.assets[0];
  const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
  return extractTextFromFile(base64, "application/pdf");
}
