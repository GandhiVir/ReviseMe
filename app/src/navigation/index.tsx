import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import SubjectListScreen from "../screens/SubjectListScreen";
import NoteEntryScreen from "../screens/NoteEntryScreen";
import QuizSessionScreen from "../screens/QuizSessionScreen";
import ProgressScreen from "../screens/ProgressScreen";
import { colors, gradients } from "../theme";

export type RootStackParamList = {
  SubjectList: undefined;
  NoteEntry: { subjectId: string; subjectName: string };
  QuizSession: { subjectId: string; subjectName: string };
  Progress: { subjectId: string; subjectName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg },
};

function HeaderGradient() {
  return <LinearGradient colors={gradients.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />;
}

export function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName="SubjectList"
        screenOptions={{
          headerBackground: () => <HeaderGradient />,
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: "700" },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="SubjectList" component={SubjectListScreen} options={{ title: "ReviseMe" }} />
        <Stack.Screen name="NoteEntry" component={NoteEntryScreen} options={{ title: "Add Weekly Notes" }} />
        <Stack.Screen name="QuizSession" component={QuizSessionScreen} options={{ title: "Revision Quiz" }} />
        <Stack.Screen name="Progress" component={ProgressScreen} options={{ title: "Progress" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
