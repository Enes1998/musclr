import { View, Text } from 'react-native';
import type { MuscleId } from '@musclr/core';

// The mobile WEB target is a dev/CI compile gate; the full 3D web experience lives in apps/web
// (Next.js). This keeps `expo export --platform web` compiling without pulling three.js into Metro.
export function MuscleHeatmap({ scores }: { scores: Partial<Record<MuscleId, number>> }) {
  const n = Object.keys(scores).length;
  return (
    <View className="h-64 items-center justify-center rounded-xl border border-line bg-bg-2">
      <Text className="font-mono text-xs text-ink-3">3D heatmap renders on iOS / Android ({n} muscles)</Text>
    </View>
  );
}
