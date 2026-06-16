import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Asset } from 'expo-asset';
import { WebView } from 'react-native-webview';
import type { MuscleId } from '@musclr/core';

// The 3D muscle heatmap is hosted in a self-contained offline HTML page (assets/viewer.html) so
// one implementation runs identically on iOS + Android (and matches the web app's renderer). The
// HTML defines `window.__viewer.setScores({muscleId: 0..100})` and posts `{type:'ready'}` back.
// NOTE: the bundled viewer.html is a lightweight offline heatmap; the full three.js + GLB
// single-file build (vite-plugin-singlefile, GLB inlined) is the M4 upgrade — drop-in, same bridge.
const HTML = require('../assets/viewer.html');

export function MuscleHeatmap({ scores }: { scores: Partial<Record<MuscleId, number>> }) {
  const [uri, setUri] = useState<string | null>(null);
  const webRef = useRef<WebView>(null);
  const ready = useRef(false);
  const latest = useRef(scores);
  latest.current = scores;

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
      `window.__viewer && window.__viewer.setScores(${JSON.stringify(latest.current)}); true;`,
    );
  };

  useEffect(() => {
    if (ready.current) push();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores]);

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
