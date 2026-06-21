import { useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import {
  NavigationContainer,
  type NavigationContainerRef,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import HomeScreen from "./src/screens/HomeScreen";
import AddTaskScreen from "./src/screens/AddTaskScreen";
import CalendarScreen from "./src/screens/CalendarScreen";
import type { RootTabParamList } from "./src/navigation/types";
import { DatabaseProvider } from "./src/contexts/DatabaseContext";

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<RootTabParamList>>(null);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | { itemId?: number; screen?: string }
          | undefined;

        if (
          data?.screen === "Home"
          && navigationRef.current?.isReady()
        ) {
          navigationRef.current.navigate("Home");
        }
      },
    );

    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <DatabaseProvider>
        <NavigationContainer ref={navigationRef}>
          <Tab.Navigator id="root-tabs" initialRouteName="Home">
            <Tab.Screen
              name="Home"
              component={HomeScreen}
              options={{
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="home-outline" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="AddTask"
              component={AddTaskScreen}
              options={{ tabBarButton: () => null }}
            />
            <Tab.Screen
              name="Calendar"
              component={CalendarScreen}
              options={{
                tabBarIcon: ({ color, size }) => (
                  <Ionicons
                    name="calendar-outline"
                    size={size}
                    color={color}
                  />
                ),
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </DatabaseProvider>
    </GestureHandlerRootView>
  );
}
