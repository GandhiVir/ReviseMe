import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SubjectListScreen from "../screens/SubjectListScreen";
import NoteEntryScreen from "../screens/NoteEntryScreen";
import QuizSessionScreen from "../screens/QuizSessionScreen";
import ProgressScreen from "../screens/ProgressScreen";

export type RootStackParamList = {
  SubjectList: undefined;
  NoteEntry: { subjectId: string; subjectName: string };
  QuizSession: { subjectId: string; subjectName: string };
  Progress: { subjectId: string; subjectName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="SubjectList">
        <Stack.Screen name="SubjectList" component={SubjectListScreen} options={{ title: "Subjects" }} />
        <Stack.Screen name="NoteEntry" component={NoteEntryScreen} options={{ title: "Add Weekly Notes" }} />
        <Stack.Screen name="QuizSession" component={QuizSessionScreen} options={{ title: "Revision Quiz" }} />
        <Stack.Screen name="Progress" component={ProgressScreen} options={{ title: "Progress" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
