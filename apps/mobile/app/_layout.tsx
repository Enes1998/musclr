import '../global.css';
import { useEffect } from 'react';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { InterTight_600SemiBold } from '@expo-google-fonts/inter-tight';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSettingsStore } from '../lib/settingsStore';

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    InterTight_600SemiBold,
    JetBrainsMono_400Regular,
  });

  // Hydrate the BYO AI key from the secure keychain once at startup.
  const loadKey = useSettingsStore((s) => s.loadKey);
  useEffect(() => {
    void loadKey();
  }, [loadKey]);

  if (!loaded) return null;
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0a0a0c' } }} />
    </>
  );
}
