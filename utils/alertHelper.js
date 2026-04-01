import { Alert, Platform } from 'react-native';

export const mostrarAlerta = (titulo, mensaje, botones) => {
  if (Platform.OS === 'web') {
    // En web usar confirm() del navegador para alertas con confirmación
    if (botones && botones.length > 1) {
      const confirmado = window.confirm(`${titulo}\n\n${mensaje}`);
      if (confirmado) {
        const botonConfirmar = botones.find(b => b.style !== 'cancel');
        if (botonConfirmar?.onPress) {
          botonConfirmar.onPress();
        }
      } else {
        const botonCancelar = botones.find(b => b.style === 'cancel');
        if (botonCancelar?.onPress) {
          botonCancelar.onPress();
        }
      }
    } else {
      window.alert(`${titulo}\n\n${mensaje}`);
      if (botones && botones[0]?.onPress) {
        botones[0].onPress();
      }
    }
  } else {
    Alert.alert(titulo, mensaje, botones);
  }
};
