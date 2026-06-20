import { ScrollView, View, Text, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import {
  DATA_ATTRIBUTIONS,
  SOFTWARE_ATTRIBUTIONS,
  MODEL_CREDIT,
  type Attribution,
} from '@musclr/core';

function Item({ a }: { a: Attribution }) {
  return (
    <View className="mb-2 rounded-xl border border-line bg-surface p-3">
      <View className="flex-row items-center justify-between">
        {a.url ? (
          <Pressable onPress={() => Linking.openURL(a.url!)}>
            <Text className="font-medium text-accent underline">{a.name}</Text>
          </Pressable>
        ) : (
          <Text className="font-medium text-ink">{a.name}</Text>
        )}
        <Text className="font-mono text-xs text-ink-3">{a.license}</Text>
      </View>
      {a.note && <Text className="mt-1 text-sm text-ink-2">{a.note}</Text>}
    </View>
  );
}

export default function LicensesScreen() {
  const router = useRouter();
  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Pressable onPress={() => router.back()} className="mb-3">
        <Text className="text-sm text-accent">← Back</Text>
      </Pressable>
      <Text className="mb-1 font-display text-2xl text-ink">Licenses &amp; credits</Text>
      <Text className="mb-4 text-sm text-ink-2">
        Built on open data and open-source software. Thank you to these projects.
      </Text>

      <Text className="mb-2 font-display text-lg text-ink">3D model</Text>
      <Text className="mb-4 rounded-xl border border-line bg-surface p-3 text-sm text-ink-2">{MODEL_CREDIT}</Text>

      <Text className="mb-2 font-display text-lg text-ink">Data sources</Text>
      {DATA_ATTRIBUTIONS.map((a) => (
        <Item key={a.name} a={a} />
      ))}

      <Text className="mb-2 mt-2 font-display text-lg text-ink">Software</Text>
      {SOFTWARE_ATTRIBUTIONS.map((a) => (
        <Item key={a.name} a={a} />
      ))}
    </ScrollView>
  );
}
