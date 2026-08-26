import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SQLiteProvider } from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SCHEMA_SQL, DATABASE_NAME, applyColumnMigrations } from './src/db/schema';

async function migrateDb(db: SQLiteDatabase) {
  await db.execAsync(SCHEMA_SQL);
  await applyColumnMigrations(db);
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDb}>
          <RootNavigator />
        </SQLiteProvider>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
