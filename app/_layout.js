import { useState, useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack, useRouter, Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ModoDiscretoProvider } from '../hooks/useModoDiscreto';

export default function RootLayout() {
  const router = useRouter();
  const [listo, setListo] = useState(false);

  // Esperar a que el navegador esté montado
  useEffect(() => {
    const timer = setTimeout(() => {
      setListo(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Navegar al PIN solo cuando el navegador esté listo
  useEffect(() => {
    if (!listo) return;
    router.replace('/pin');
  }, [listo]);

  // Pedir PIN cuando la app vuelve del background
  useEffect(() => {
    if (!listo) return;
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState) => {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          router.replace('/pin');
        }
      }
    );
    return () => subscription.remove();
  }, [listo]);

  // Se conserva el stack y los providers (equivalente al Slot sugerido pero manteniendo diseño)
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
