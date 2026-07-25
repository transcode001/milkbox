import { useCallback, useEffect, useRef } from "react";
import { Image } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import {
  NavigationContainer,
  type NavigationContainerRef,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import HomeScreen from "./src/screens/HomeScreen";
import AddTaskScreen from "./src/screens/AddTaskScreen";
import CalendarScreen from "./src/screens/CalendarScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import LicensesScreen from "./src/screens/LicensesScreen";
import type { RootStackParamList, RootTabParamList } from "./src/navigation/types";
import { DatabaseProvider } from "./src/contexts/DatabaseContext";
import homeIcon from "./src/assets/tab-icons/home.png";
import calendarIcon from "./src/assets/tab-icons/calendar.png";
import { colors } from "./src/styles/tokens";

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TabNavigator = () => (
  <Tab.Navigator
    id="root-tabs"
    initialRouteName="Home"
    screenOptions={{
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.tabInactive,
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        title: "ホーム",
        tabBarIcon: ({ color, size }) => (
          <Image
            source={homeIcon}
            style={{ width: size, height: size, tintColor: color }}
            resizeMode="contain"
          />
        ),
      }}
    />
    <Tab.Screen
      name="Calendar"
      component={CalendarScreen}
      options={{
        title: "カレンダー",
        tabBarIcon: ({ color, size }) => (
          <Image
            source={calendarIcon}
            style={{ width: size, height: size, tintColor: color }}
            resizeMode="contain"
          />
        ),
      }}
    />
  </Tab.Navigator>
);

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const pendingNavigation = useRef<(() => void) | null>(null);

  const navigateToHome = useCallback(() => {
    // pop: true — Settings等がスタックに積まれていても既存のTabsへ戻す（複製pushを防ぐ）
    const goHome = () =>
      navigationRef.current?.navigate("Tabs", { screen: "Home" }, { pop: true });
    if (navigationRef.current?.isReady()) {
      goHome();
    } else {
      pendingNavigation.current = goHome;
    }
  }, []);

  useEffect(() => {
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response?.notification?.request?.content?.data?.screen === "Home") {
        navigateToHome();
      }
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | { itemId?: number; screen?: string }
          | undefined;
        if (data?.screen === "Home") {
          navigateToHome();
        }
      },
    );

    return () => subscription.remove();
  }, [navigateToHome]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <DatabaseProvider>
          <NavigationContainer
            ref={navigationRef}
            onReady={() => {
              if (pendingNavigation.current) {
                pendingNavigation.current();
                pendingNavigation.current = null;
              }
            }}
          >
            <Stack.Navigator id="root-stack">
              <Stack.Screen
                name="Tabs"
                component={TabNavigator}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="AddTask"
                component={AddTaskScreen}
                options={{ title: "予定を追加" }}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: "設定" }}
              />
              <Stack.Screen
                name="Licenses"
                component={LicensesScreen}
                options={{ title: "ライセンス情報" }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </DatabaseProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
