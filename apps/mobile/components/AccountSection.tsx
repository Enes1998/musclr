import { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useAuth } from '../lib/auth';
import { backupToCloud, restoreFromCloud } from '../lib/sync';

export function AccountSection() {
  const { configured, user, error, signInWithPassword, signUp, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!configured) {
    return (
      <View className="mt-4 rounded-2xl border border-line bg-surface p-4">
        <Text className="mb-1 font-display text-lg text-ink">Account &amp; sync</Text>
        <Text className="text-sm text-ink-2">
          Local-only mode — data is saved on this device. Configure Supabase (docs/CREDENTIALS.md) to
          enable accounts + multi-device sync.
        </Text>
      </View>
    );
  }

  async function run(fn: () => Promise<void>, ok: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg(ok);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="mt-4 rounded-2xl border border-line bg-surface p-4">
      <Text className="mb-3 font-display text-lg text-ink">Account &amp; sync</Text>
      {user ? (
        <>
          <Text className="text-sm text-ink-2">
            Signed in as <Text className="text-ink">{user.email ?? user.id}</Text>
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <Pressable onPress={() => run(() => backupToCloud(user.id), 'Backed up.')} disabled={busy} className="rounded-md bg-accent px-3 py-1.5">
              <Text className="font-medium text-bg">Back up now</Text>
            </Pressable>
            <Pressable onPress={() => run(() => restoreFromCloud(user.id), 'Restored.')} disabled={busy} className="rounded-md bg-surface-2 px-3 py-1.5">
              <Text className="text-ink">Restore</Text>
            </Pressable>
            <Pressable onPress={() => void signOut()} className="px-3 py-1.5">
              <Text className="text-ink-3">Sign out</Text>
            </Pressable>
          </View>
          <Text className="mt-2 text-xs text-ink-3">Changes auto-back-up while signed in.</Text>
        </>
      ) : (
        <>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#52525c"
            autoCapitalize="none"
            keyboardType="email-address"
            className="mb-2 rounded-lg border border-line bg-bg-2 px-3 py-2 text-ink"
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="password"
            placeholderTextColor="#52525c"
            secureTextEntry
            className="mb-3 rounded-lg border border-line bg-bg-2 px-3 py-2 text-ink"
          />
          <View className="flex-row gap-2">
            <Pressable onPress={() => run(() => signInWithPassword(email, password), 'Signed in.')} disabled={busy} className="rounded-md bg-accent px-3 py-1.5">
              <Text className="font-medium text-bg">Sign in</Text>
            </Pressable>
            <Pressable onPress={() => run(() => signUp(email, password), 'Check your email.')} disabled={busy} className="rounded-md bg-surface-2 px-3 py-1.5">
              <Text className="text-ink">Create account</Text>
            </Pressable>
          </View>
        </>
      )}
      {(msg || error) && <Text className="mt-3 text-sm text-ink-2">{msg ?? error}</Text>}
    </View>
  );
}
