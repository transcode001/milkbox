import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DatabaseManager } from "../repositories/sqlite/DatabaseManager";

interface DatabaseContextValue {
  dbManager: DatabaseManager;
}

const DatabaseContext = createContext<DatabaseContextValue | undefined>(undefined);
const DEV_DB_CLEAR_KEY = "dev_db_cleared_v2";

export const DatabaseProvider = ({ children }: React.PropsWithChildren) => {
  const [dbManager] = useState(() => new DatabaseManager());
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

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

  if (initError) {
    throw initError;
  }

  if (!isInitialized) {
    return null;
  }

  const value = useMemo(() => ({ dbManager }), [dbManager]);

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
};

export const useDatabaseManager = (): DatabaseManager => {
  const context = useContext(DatabaseContext);

  if (!context) {
    throw new Error("useDatabaseManager must be used within a DatabaseProvider");
  }

  return context.dbManager;
};
