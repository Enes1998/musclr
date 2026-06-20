import { useEffect, useState } from 'react';
import { ScrollView, View, Text, Pressable, TextInput } from 'react-native';
import { useSettingsStore, toAiSettings } from '../../lib/settingsStore';
import { requestPlan, type PlanProvider } from '../../lib/api';

const PROVIDERS: { id: PlanProvider; label: string; note: string }[] = [
  { id: 'mock', label: 'Built-in (no key)', note: 'Deterministic, evidence-grounded. Works offline.' },
  { id: 'hosted', label: 'Hosted (Gemini/Vertex)', note: 'Default cloud coach via the backend.' },
  { id: 'openai', label: 'OpenAI (your key)', note: 'Bring your own OpenAI API key.' },
  { id: 'anthropic', label: 'Anthropic Claude (your key)', note: 'Bring your own Anthropic API key.' },
  { id: 'google', label: 'Google Gemini (your key)', note: 'Bring your own Google AI Studio key.' },
  { id: 'local', label: 'Local (Ollama / LM Studio)', note: 'Reachable only when the backend is local.' },
];
const NEEDS_KEY: PlanProvider[] = ['openai', 'anthropic', 'google'];

export default function SettingsScreen() {
  const s = useSettingsStore();
  const [test, setTest] = useState<{ status: 'idle' | 'testing' | 'ok' | 'error'; msg?: string }>({ status: 'idle' });

  useEffect(() => {
    if (!s.keyLoaded) void s.loadKey();
  }, [s]);

  async function testConnection() {
    setTest({ status: 'testing' });
    try {
      const res = await requestPlan({ goal: 'general', loads: { chest: 50, back: 50 }, ai: toAiSettings(s) });
      setTest({ status: 'ok', msg: `${res.meta.provider} · ${res.meta.model} · ${res.meta.durationMs}ms` });
    } catch (e) {
      setTest({ status: 'error', msg: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Text className="mb-4 font-display text-2xl text-ink">Settings</Text>

      <View className="rounded-2xl border border-line bg-surface p-4">
        <Text className="font-display text-lg text-ink">AI coach provider</Text>
        <Text className="mb-3 text-xs text-ink-3">
          Always grounded in the same evidence module. Choose who runs the model.
        </Text>

        {PROVIDERS.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => s.setProvider(p.id)}
            className={`mb-2 rounded-xl border p-3 ${s.provider === p.id ? 'border-accent bg-surface-2' : 'border-line'}`}
          >
            <Text className="text-sm font-medium text-ink">{p.label}</Text>
            <Text className="mt-0.5 text-xs text-ink-3">{p.note}</Text>
          </Pressable>
        ))}

        {NEEDS_KEY.includes(s.provider) && (
          <View className="mt-2">
            <Text className="font-mono text-xs uppercase text-ink-3">API key (stored in secure keychain)</Text>
            <TextInput
              value={s.byoKey}
              onChangeText={s.setByoKey}
              placeholder="sk-…"
              placeholderTextColor="#8a8a95"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              className="mt-1 rounded-lg border border-line bg-bg-2 px-3 py-2 text-ink"
            />
          </View>
        )}

        {s.provider === 'local' && (
          <View className="mt-2">
            <Text className="font-mono text-xs uppercase text-ink-3">Local base URL</Text>
            <TextInput
              value={s.localBaseUrl}
              onChangeText={s.setLocalBaseUrl}
              placeholder="http://localhost:11434/v1"
              placeholderTextColor="#8a8a95"
              autoCapitalize="none"
              autoCorrect={false}
              className="mt-1 rounded-lg border border-line bg-bg-2 px-3 py-2 text-ink"
            />
          </View>
        )}

        {s.provider !== 'mock' && (
          <View className="mt-2">
            <Text className="font-mono text-xs uppercase text-ink-3">Model (optional)</Text>
            <TextInput
              value={s.model}
              onChangeText={s.setModel}
              placeholder="default for the provider"
              placeholderTextColor="#8a8a95"
              autoCapitalize="none"
              autoCorrect={false}
              className="mt-1 rounded-lg border border-line bg-bg-2 px-3 py-2 text-ink"
            />
          </View>
        )}

        <Pressable
          onPress={testConnection}
          disabled={test.status === 'testing'}
          className="mt-4 self-start rounded-md bg-accent px-4 py-2"
        >
          <Text className="font-medium text-bg">{test.status === 'testing' ? 'Testing…' : 'Test connection'}</Text>
        </Pressable>
        {test.status === 'ok' && <Text className="mt-2 text-sm text-load-under">✓ {test.msg}</Text>}
        {test.status === 'error' && <Text className="mt-2 text-sm text-load-over">⚠ {test.msg}</Text>}
      </View>

      <Text className="mt-4 font-mono text-xs text-ink-3">
        On a physical device, set EXPO_PUBLIC_API_URL to your machine's LAN IP. Need keys? See
        docs/CREDENTIALS.md.
      </Text>
    </ScrollView>
  );
}
