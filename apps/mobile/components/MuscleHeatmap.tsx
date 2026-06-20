import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Asset } from 'expo-asset';
import { WebView } from 'react-native-webview';
import type { MuscleId } from '@musclr/core';
import { useSettingsStore } from '../lib/settingsStore';

// The 3D muscle heatmap is hosted in a self-contained offline HTML page (assets/viewer.html) so
// one implementation runs identically on iOS + Android (and matches the web app's renderer). The
// HTML is the REAL three.js viewer (`@musclr/viewer3d`) with the segmented anatomical GLB inlined
// as base64 — built by `scripts/build-mobile-viewer.mjs` (esbuild). It defines
// `window.__viewer.setScores({muscleId: 0..100})` and posts `{type:'ready'}` back. Regenerate with
// `pnpm --filter @musclr/viewer3d build:3d` whenever the model or viewer changes.
const HTML = require('../assets/viewer.html');

export function MuscleHeatmap({ scores }: { scores: Partial<Record<MuscleId, number>> }) {
  const [uri, setUri] = useState<string | null>(null);
  const webRef = useRef<WebView>(null);
  const ready = useRef(false);
  const latest = useRef(scores);
  latest.current = scores;
  const palette = useSettingsStore((s) => s.palette);
  const paletteRef = useRef(palette);
  paletteRef.current = palette;

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [asset] = await Asset.loadAsync(HTML);
      if (alive) setUri(asset.localUri ?? asset.uri);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const push = () => {
    webRef.current?.injectJavaScript(
      `window.__viewer && (window.__viewer.setPalette(${JSON.stringify(paletteRef.current)}), window.__viewer.setScores(${JSON.stringify(latest.current)})); true;`,
    );
  };

  useEffect(() => {
    if (ready.current) push();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores, palette]);

  if (!uri) return <View className="h-96 rounded-xl bg-bg-2" />;

  return (
    <View className="h-96 overflow-hidden rounded-xl border border-line bg-bg-2">
      <WebView
        ref={webRef}
        source={{ uri }}
        originWhitelist={['*']}
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        javaScriptEnabled
        domStorageEnabled
        style={{ backgroundColor: 'transparent' }}
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === 'ready') {
              ready.current = true;
              push();
            }
          } catch {
            /* ignore */
          }
        }}
      />
    </View>
  );
}
