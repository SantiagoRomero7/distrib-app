import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { ModoDiscretoProvider } from '../hooks/useModoDiscreto';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    const verificarSesion = async () => {
      const sesion = await SecureStore.getItemAsync('sesion_activa');
      if (!sesion) {
        router.replace('/pin');
      }
    }
    verificarSesion();
  }, [router]);

  return (
    <ModoDiscretoProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="pin" />
      </Stack>
      <StatusBar style="light" />
    </ModoDiscretoProvider>
  );
}
