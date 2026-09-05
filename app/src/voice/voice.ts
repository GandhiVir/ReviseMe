import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import type { ExpoSpeechRecognitionResultEvent } from "expo-speech-recognition";

/**
 * On-device speech-to-text via expo-speech-recognition (uses the
 * platform's native recognizer on both Android and iOS, with a proper Expo
 * config plugin for permissions). Requires a dev-client build (EAS Build)
 * — not available in Expo Go.
 *
 * The underlying module is event-based rather than promise-based, so this
 * wraps it into a simple start/stop pair: start begins listening, stop ends
 * listening and resolves with whatever was transcribed.
 */

let latestTranscript = "";
let resultSubscription: ReturnType<typeof ExpoSpeechRecognitionModule.addListener> | null = null;

export async function startListening(locale = "en-US"): Promise<void> {
  const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Permission to use speech recognition was denied.");
  }

  latestTranscript = "";
  resultSubscription?.remove();
  resultSubscription = ExpoSpeechRecognitionModule.addListener(
    "result",
    (event: ExpoSpeechRecognitionResultEvent) => {
      latestTranscript = event.results[0]?.transcript ?? latestTranscript;
    }
  );

  ExpoSpeechRecognitionModule.start({ lang: locale, interimResults: true, continuous: true });
}

export async function stopListening(): Promise<string> {
  ExpoSpeechRecognitionModule.stop();
  resultSubscription?.remove();
  resultSubscription = null;
  return latestTranscript;
}
