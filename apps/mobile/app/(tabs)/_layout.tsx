import { Tabs } from 'expo-router';

export default function TabsLayout() {
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
      <Tabs.Screen name="index" options={{ title: 'Log' }} />
      <Tabs.Screen name="summary" options={{ title: 'Summary' }} />
      <Tabs.Screen name="nutrition" options={{ title: 'Nutrition' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
