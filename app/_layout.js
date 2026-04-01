import { useState, useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ModoDiscretoProvider } from '../hooks/useModoDiscreto';

export default function RootLayout() {
  const router = useRouter();
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    // Al abrir la app siempre pedir PIN
    router.replace('/pin');
  }, []);

  useEffect(() => {
    // Cuando la app vuelve del background pedir PIN
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState) => {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          setAutenticado(false);
          router.replace('/pin');
        }
      }
    );
    return () => subscription.remove();
  }, []);

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
