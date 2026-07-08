import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DatabaseManager } from "../repositories/sqlite/DatabaseManager";
import { initializeNotificationsAsync } from "../services/notifications";

interface DatabaseContextValue {
  dbManager: DatabaseManager;
  notificationsEnabled: boolean;
}

const DatabaseContext = createContext<DatabaseContextValue | undefined>(undefined);
const DEV_DB_CLEAR_KEY = "dev_db_cleared_v2";

export const DatabaseProvider = ({ children }: React.PropsWithChildren) => {
  const [dbManager] = useState(() => new DatabaseManager());
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        await dbManager.initialize();
        if (__DEV__) {
          const cleared = await AsyncStorage.getItem(DEV_DB_CLEAR_KEY);
          if (!cleared) {
            await dbManager.clearAll();
            await AsyncStorage.setItem(DEV_DB_CLEAR_KEY, "1");
          }
        }
        if (isMounted) {
          setIsInitialized(true);
        }
      } catch (error) {
        if (isMounted) {
          setInitError(error instanceof Error ? error : new Error("Failed to initialize database"));
        }
      }
    };

    void initialize();

    return () => {
      isMounted = false;
    };
  }, [dbManager]);

  useEffect(() => {
    if (!isInitialized) return;

    const initializeNotificationReminders = async () => {
      const hasPermission = await initializeNotificationsAsync();
      setNotificationsEnabled(hasPermission);
      if (hasPermission) {
        await dbManager.syncTaskNotifications();
      }
    };

    void initializeNotificationReminders();
  }, [dbManager, isInitialized]);

  const value = useMemo(
    () => ({ dbManager, notificationsEnabled }),
    [dbManager, notificationsEnabled],
  );

  if (initError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Text style={{ fontSize: 16, textAlign: "center" }}>
          データベースの初期化に失敗しました
        </Text>
      </View>
    );
  }

  if (!isInitialized) {
    return null;
  }

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
};

export const useDatabaseManager = (): DatabaseContextValue => {
  const context = useContext(DatabaseContext);

  if (!context) {
    throw new Error("useDatabaseManager must be used within a DatabaseProvider");
  }

  return context;
};
