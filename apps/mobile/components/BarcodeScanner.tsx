import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

/**
 * Camera barcode scanner (iOS/Android) using expo-camera's CameraView. Calls onDetected with the
 * first scanned EAN/UPC code. Requires the camera permission (requested inline) and a dev-client or
 * Expo Go build.
 */
export function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [done, setDone] = useState(false);

  if (!permission) {
    return (
      <View className="mt-3 h-64 items-center justify-center rounded-xl border border-line bg-bg-2">
        <Text className="text-sm text-ink-3">Preparing camera…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="mt-3 items-center rounded-xl border border-line bg-bg-2 p-4">
        <Text className="mb-3 text-center text-sm text-ink-2">
          Camera access is needed to scan barcodes.
        </Text>
        <Pressable onPress={requestPermission} className="rounded-md bg-accent px-4 py-2">
          <Text className="font-medium text-bg">Grant camera access</Text>
        </Pressable>
        <Pressable onPress={onClose} className="mt-2 px-3 py-1">
          <Text className="text-xs text-ink-3">Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="mt-3 h-72 overflow-hidden rounded-xl border border-line bg-black">
      <CameraView
        style={{ flex: 1 }}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={
          done
            ? undefined
            : (e) => {
                setDone(true);
                onDetected(e.data);
              }
        }
      />
      <Pressable onPress={onClose} className="absolute right-2 top-2 rounded-md bg-bg/70 px-3 py-1.5">
        <Text className="text-xs text-ink">Close</Text>
      </Pressable>
    </View>
  );
}
