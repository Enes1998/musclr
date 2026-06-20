import { Tabs } from 'expo-router';
import { t } from '@musclr/core';
import { useSettingsStore } from '../../lib/settingsStore';

export default function TabsLayout() {
  const locale = useSettingsStore((s) => s.locale);
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0a0a0c' },
        headerTitleStyle: { color: '#f5f5f7' },
        tabBarActiveTintColor: '#f97316',
        tabBarInactiveTintColor: '#8a8a95',
        tabBarStyle: { backgroundColor: '#101015', borderTopColor: '#26262f' },
        sceneStyle: { backgroundColor: '#0a0a0c' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('nav.log', locale) }} />
      <Tabs.Screen name="summary" options={{ title: t('nav.summary', locale) }} />
      <Tabs.Screen name="nutrition" options={{ title: t('nav.nutrition', locale) }} />
      <Tabs.Screen name="history" options={{ title: t('nav.history', locale) }} />
      <Tabs.Screen name="settings" options={{ title: t('nav.settings', locale) }} />
    </Tabs>
  );
}
