import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import HomeScreen from "./src/screens/HomeScreen";
import AddTaskScreen from "./src/screens/AddTaskScreen";
import CalendarScreen from "./src/screens/CalendarScreen";
import type { RootTabParamList } from "./src/navigation/types";
import { DatabaseProvider } from "./src/contexts/DatabaseContext";

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <DatabaseProvider>
        <NavigationContainer>
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
