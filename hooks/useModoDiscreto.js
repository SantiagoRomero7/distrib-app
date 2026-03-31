import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Alert, Platform, ToastAndroid } from 'react-native';

const STORAGE_KEY = 'modo_discreto';

const ModoDiscretoContext = createContext({
  discreto: false,
  toggleDiscreto: () => {},
  ocultarSensible: (v) => v,
});

const showToast = (mensaje) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(mensaje, ToastAndroid.SHORT);
  } else {
    Alert.alert(mensaje);
  }
};

export const ModoDiscretoProvider = ({ children }) => {
  const [discreto, setDiscreto] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const valor = await SecureStore.getItemAsync(STORAGE_KEY);
        if (valor === 'true') setDiscreto(true);
      } catch (e) {
        console.error('Error cargando modo discreto:', e);
      }
    })();
  }, []);

  const toggleDiscreto = async () => {
    try {
      const nuevoValor = !discreto;
      await SecureStore.setItemAsync(STORAGE_KEY, nuevoValor.toString());
      setDiscreto(nuevoValor);
      showToast(nuevoValor ? 'Modo discreto activado' : 'Modo discreto desactivado');
    } catch (e) {
      console.error('Error guardando modo discreto:', e);
    }
  };

  // Solo para ganancias y precio de compra
  const ocultarSensible = (valor) => {
    if (discreto) return '$ ••••••';
    return valor;
  };

  return (
    <ModoDiscretoContext.Provider value={{ discreto, toggleDiscreto, ocultarSensible }}>
      {children}
    </ModoDiscretoContext.Provider>
  );
};

export const useModoDiscreto = () => useContext(ModoDiscretoContext);
