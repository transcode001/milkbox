import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { ImageSourcePropType } from "react-native";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import homeIcon from "../assets/tab-icons/home.png";
import calendarIcon from "../assets/tab-icons/calendar.png";

const TAB_ICONS: Record<string, ImageSourcePropType> = {
  Home: homeIcon,
  Calendar: calendarIcon,
};

export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.outerContainer}>
      <View style={styles.container}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const icon = TAB_ICONS[route.name];

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              style={({ pressed }) => [
                styles.tab,
                pressed && styles.tabPressed,
              ]}
            >
              {icon ? (
                <Image source={icon} style={styles.icon} resizeMode="contain" />
              ) : null}
              <Text style={styles.label}>{route.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    height: 84,
    width: "100%",
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  container: {
    width: "100%",
    maxWidth: 393,
    height: 84,
    flexDirection: "row",
    paddingTop: 8,
    paddingBottom: 24,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  tabPressed: {
    opacity: 0.75,
  },
  icon: {
    width: 28,
    height: 28,
    tintColor: "#000000",
  },
  label: {
    fontSize: 11,
    color: "#000000",
  },
});
