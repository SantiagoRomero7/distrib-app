import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const feedback = {
  error: () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  },
  success: () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }
};
import { supabase } from '../supabase';

export default function PinScreen() {
  const [pin, setPin] = useState('');
  const [errorStr, setErrorStr] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (pin.length === 4) {
      verificarPin(pin);
    }
  }, [pin]);

  const verificarPin = async (pinIngresado) => {
    try {
      const { data, error } = await supabase
        .from('configuracion')
        .select('clave')
        .single();
      
      if (data && data.clave === pinIngresado) {
        feedback.success();
        router.replace('/(tabs)');
      } else {
        feedback.error();
        setPin('');
        setErrorStr('PIN incorrecto, intenta de nuevo');
        setTimeout(() => setErrorStr(''), 2000);
      }
    } catch(err) {
      setErrorStr('Error de red');
      setTimeout(() => setErrorStr(''), 2000);
    }
  };

  const pressKey = (key) => {
    if (pin.length < 4 && key !== 'del') {
      setPin(prev => prev + key);
    } else if (key === 'del') {
      setPin(prev => prev.slice(0, -1));
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.logo}>🌿 PanelaApp</Text>
        <Text style={s.subtitle}>Distribuidora de panela</Text>
      </View>
      
      <Text style={s.prompt}>Ingresa tu PIN</Text>
      
      <View style={s.dotsContainer}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={[s.dot, pin.length > i && s.dotFilled]} />
        ))}
      </View>
      
      <View style={s.errorContainer}>
        {errorStr ? <Text style={s.errorText}>{errorStr}</Text> : null}
      </View>
      
      <View style={s.keypad}>
        {[['1','2','3'], ['4','5','6'], ['7','8','9'], ['','0','del']].map((row, rI) => (
          <View key={rI} style={s.row}>
            {row.map((btn, cI) => (
              <TouchableOpacity
                key={cI}
                style={[s.btn, btn === '' && { backgroundColor: 'transparent' }]}
                onPress={() => btn !== '' && pressKey(btn)}
                disabled={btn === ''}
              >
                {btn === 'del' ? (
                  <Text style={s.btnText}>⌫</Text>
                ) : (
                  <Text style={s.btnText}>{btn}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2d6a4f', alignItems: 'center', justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 50 },
  logo: { fontSize: 28, color: '#fff', fontWeight: 'bold' },
  subtitle: { fontSize: 16, color: '#b7dfc9', marginTop: 8 },
  prompt: { fontSize: 20, color: '#fff', marginBottom: 30 },
  dotsContainer: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#fff', backgroundColor: 'transparent' },
  dotFilled: { backgroundColor: '#fff' },
  errorContainer: { height: 30, marginBottom: 30 },
  errorText: { color: '#ff8a80', fontSize: 16, fontWeight: '500' },
  keypad: { width: 280, gap: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
});
