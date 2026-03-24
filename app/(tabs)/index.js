import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../../supabase';
import { formatPesos } from '../../utils/formatters';
import { fechaHoyColombia, ahoraEnColombia, formatearFecha } from '../../utils/fecha';

export default function Dashboard() {
  const [gananciaHoy, setGananciaHoy] = useState(0);
  const [ventasHoy, setVentasHoy] = useState(0);
  const [totalVentasHoy, setTotalVentasHoy] = useState(0);
  const [efectivoHoy, setEfectivoHoy] = useState(0);
  const [transferHoy, setTransferHoy] = useState(0);
  const [cajasHoy, setCajasHoy] = useState(0);
  
  const [stockBajo, setStockBajo] = useState([]);
  const [clientesCredito, setClientesCredito] = useState([]);
  const [cajaCerrada, setCajaCerrada] = useState(false);
  const [horaCierre, setHoraCierre] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [modalPinVisible, setModalPinVisible] = useState(false);
  const [pinActual, setPinActual] = useState('');
  const [pinNuevo, setPinNuevo] = useState('');
  const [pinConfirmar, setPinConfirmar] = useState('');
  const router = useRouter();

  const cargarDatos = async () => {
    try {
      const hoyStr = fechaHoyColombia();

      const { data: resumenHoy } = await supabase
        .from('resumen_diario')
        .select('*')
        .eq('fecha', hoyStr)
        .single();

      if (resumenHoy) {
        setGananciaHoy(Number(resumenHoy.total_ganancia));
        setTotalVentasHoy(Number(resumenHoy.total_ventas));
        setVentasHoy(Number(resumenHoy.cantidad_ventas));
        setEfectivoHoy(Number(resumenHoy.total_efectivo));
        setTransferHoy(Number(resumenHoy.total_transferencia));
        setCajasHoy(Number(resumenHoy.total_cajas));
        setCajaCerrada(resumenHoy.caja_cerrada || false);
        setHoraCierre(resumenHoy.hora_cierre || null);
      } else {
        setGananciaHoy(0);
        setTotalVentasHoy(0);
        setVentasHoy(0);
        setEfectivoHoy(0);
        setTransferHoy(0);
        setCajasHoy(0);
        setCajaCerrada(false);
        setHoraCierre(null);
      }

      const { data: inventarioBajo } = await supabase
        .from('inventario')
        .select('cantidad, unidad, producto_id, productos(nombre)')
        .lt('cantidad', 10);

      if (inventarioBajo) setStockBajo(inventarioBajo);

      const { data: conCredito } = await supabase
        .from('clientes')
        .select('nombre, saldo_fiado')
        .gt('saldo_fiado', 0)
        .order('saldo_fiado', { ascending: false });

      if (conCredito) setClientesCredito(conCredito);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDatos();
    setRefreshing(false);
  };

  const cerrarCaja = async () => {
    Alert.alert(
      '¿Cerrar caja?',
      `Al cerrar la caja quedará guardado el resumen de hoy. Podrás seguir viendo los reportes pero no se sumará más a este día.\n\nResumen de hoy:\n📦 Cajas vendidas: ${cajasHoy}\n💰 Total vendido: ${formatPesos(totalVentasHoy)}\n📈 Ganancia: ${formatPesos(gananciaHoy)}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, cerrar caja', style: 'destructive', onPress: async () => {
          try {
            const hoy = fechaHoyColombia();
            const ahora = ahoraEnColombia().toISOString();
            
            const { data: resumenHoy } = await supabase
              .from('resumen_diario')
              .select('*')
              .eq('fecha', hoy)
              .single();

            if (!resumenHoy) {
              await supabase.from('resumen_diario').insert({
                fecha: hoy,
                total_cajas: 0,
                total_ventas: 0,
                total_ganancia: 0,
                total_efectivo: 0,
                total_transferencia: 0,
                cantidad_ventas: 0,
                caja_cerrada: true,
                hora_cierre: ahora
              });
            } else {
              await supabase.from('resumen_diario').update({
                caja_cerrada: true,
                hora_cierre: ahora
              }).eq('fecha', hoy);
            }

            Alert.alert('✅ Caja cerrada', 'El resumen de hoy quedó guardado correctamente. ¡Hasta mañana!');
            cargarDatos();
          } catch(err) {
            Alert.alert('Error', 'No se pudo cerrar la caja: ' + err.message);
          }
        }}
      ]
    );
  };

  const cerrarSesion = () => {
    Alert.alert(
      '¿Cerrar sesión?',
      'Tendrás que ingresar el PIN de nuevo para entrar a la app.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: async () => {
            await SecureStore.deleteItemAsync('sesion_activa');
            router.replace('/pin');
        }}
      ]
    );
  };

  const guardarNuevoPin = async () => {
    if (pinNuevo !== pinConfirmar) { Alert.alert('Error', 'El PIN nuevo no coincide'); return; }
    if (pinNuevo.length !== 4 || !/^\d+$/.test(pinNuevo)) { Alert.alert('Error', 'El PIN debe ser exactamente 4 dígitos numéricos'); return; }
    if (pinNuevo === '0000') { Alert.alert('Error', 'El PIN no puede ser 0000'); return; }
    
    try {
      const { data } = await supabase.from('configuracion').select('*').single();
      if (!data || data.clave !== pinActual) {
        Alert.alert('Error', 'El PIN actual es incorrecto'); return;
      }
      
      await supabase.from('configuracion').update({ clave: pinNuevo }).eq('id', data.id);
      Alert.alert('✅ PIN actualizado correctamente', 'Se ha guardado tu nuevo PIN.');
      setModalPinVisible(false);
      setPinActual(''); setPinNuevo(''); setPinConfirmar('');
    } catch(err) {
      Alert.alert('Error', 'No se pudo actualizar el PIN');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2d6a4f']} />
      }
    >
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBtn} onPress={() => setModalPinVisible(true)}>
          <Ionicons name="settings-outline" size={22} color="#2d6a4f" />
          <Text style={styles.topBtnText}>Cambiar PIN</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={cerrarSesion}>
          <Ionicons name="log-out-outline" size={30} color="#2d6a4f" />
        </TouchableOpacity>
      </View>
      <View style={styles.verticalContainer}>
        {/* 1. Ganancia Hoy */}
        <View style={[styles.card, { backgroundColor: '#2d6a4f' }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="trending-up" size={32} color="#fff" />
            <Text style={styles.cardLabel}>Ganancia Hoy</Text>
          </View>
          <Text style={styles.cardValue}>{formatPesos(gananciaHoy)}</Text>
        </View>

        {/* 2. Total ventas del día */}
        <View style={[styles.card, { backgroundColor: '#40916c' }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="cart" size={32} color="#fff" />
            <Text style={styles.cardLabel}>Ventas Hoy</Text>
          </View>
          <Text style={styles.cardValue}>{formatPesos(totalVentasHoy)}</Text>
        </View>

        {/* 3. Cajas vendidas hoy */}
        <View style={[styles.card, { backgroundColor: '#52b788' }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="cube" size={32} color="#fff" />
            <Text style={styles.cardLabel}>Cajas Vendidas</Text>
          </View>
          <Text style={styles.cardValue}>{cajasHoy} cajas</Text>
        </View>

        {/* 4. Resumen efectivo vs transferencia */}
        <View style={styles.resumenCard}>
          <Text style={styles.resumenTitle}>Resumen del día</Text>
          <View style={styles.resumenRow}>
            <Text style={styles.resumenLabel}>💵 Efectivo:</Text>
            <Text style={styles.resumenVal}>{formatPesos(efectivoHoy)}</Text>
          </View>
          <View style={styles.resumenRow}>
            <Text style={styles.resumenLabel}>🏦 Transferencia:</Text>
            <Text style={styles.resumenVal}>{formatPesos(transferHoy)}</Text>
          </View>
          <View style={styles.resumenRow}>
            <Text style={styles.resumenLabel}>🧾 Cantidad de ventas:</Text>
            <Text style={styles.resumenVal}>{ventasHoy} ventas</Text>
          </View>
        </View>

        {/* 5. Productos con stock bajo */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning" size={26} color="#d32f2f" />
            <Text style={styles.sectionTitle}>{'Stock Bajo (< 10 cajas)'}</Text>
          </View>
          {stockBajo.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Todo el inventario está bien</Text>
            </View>
          ) : (
            stockBajo.map((item, i) => (
              <View key={i} style={styles.alertItem}>
                <Text style={styles.alertName}>{item.productos?.nombre || 'Sin nombre'}</Text>
                <Text style={[styles.alertQty, { color: '#d32f2f' }]}>
                  {Number(item.cantidad)} {item.unidad}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* 6. Clientes con crédito pendiente */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle" size={26} color="#ff8f00" />
            <Text style={styles.sectionTitle}>Crédito Pendiente</Text>
          </View>
          {clientesCredito.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Nadie debe a crédito</Text>
            </View>
          ) : (
            clientesCredito.map((c, i) => (
              <View key={i} style={styles.alertItem}>
                <Text style={styles.alertName}>{c.nombre}</Text>
                <Text style={[styles.alertQty, { color: '#ff8f00' }]}>
                  {formatPesos(c.saldo_fiado)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* 7. Botón de Cierre de Caja */}
        {cajaCerrada ? (
          <View style={[styles.cierreCard, { backgroundColor: '#e8f5e9' }]}>
            <Ionicons name="checkmark-circle" size={32} color="#1b4332" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.cierreTitle}>✅ Caja cerrada</Text>
              <Text style={styles.cierreSub}>Hoy a las {horaCierre ? formatearFecha(horaCierre) : ''}</Text>
              <Text style={styles.cierreSub}>El resumen del día está guardado</Text>
            </View>
          </View>
        ) : ventasHoy > 0 ? (
          <TouchableOpacity style={[styles.cierreCard, { backgroundColor: '#c62828' }]} onPress={cerrarCaja}>
            <Ionicons name="lock-closed" size={32} color="#fff" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.cierreTitle, { color: '#fff' }]}>🔒 Cerrar caja de hoy</Text>
              <Text style={[styles.cierreSub, { color: 'rgba(255,255,255,0.9)' }]}>Toca aquí cuando termines de trabajar por hoy</Text>
            </View>
          </TouchableOpacity>
        ) : null}

      </View>

      <Modal visible={modalPinVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { maxHeight: '80%' }]}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Cambiar PIN</Text>
              <TouchableOpacity onPress={() => setModalPinVisible(false)}>
                <Ionicons name="close" size={32} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>PIN actual</Text>
              <TextInput style={styles.input} value={pinActual} onChangeText={setPinActual} keyboardType="numeric" maxLength={4} secureTextEntry placeholder="****" />

              <Text style={styles.label}>PIN nuevo</Text>
              <TextInput style={styles.input} value={pinNuevo} onChangeText={setPinNuevo} keyboardType="numeric" maxLength={4} secureTextEntry placeholder="****" />

              <Text style={styles.label}>Confirmar PIN nuevo</Text>
              <TextInput style={styles.input} value={pinConfirmar} onChangeText={setPinConfirmar} keyboardType="numeric" maxLength={4} secureTextEntry placeholder="****" />

              <TouchableOpacity style={styles.saveBtn} onPress={guardarNuevoPin}>
                <Text style={styles.saveBtnText}>Guardar nuevo PIN</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16
  },
  topBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  topBtnText: {
    color: '#2d6a4f',
    fontWeight: 'bold',
    fontSize: 14
  },
  verticalContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 20,
    fontWeight: '600',
  },
  cardValue: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 4,
  },
  resumenCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderLeftWidth: 5,
    borderLeftColor: '#2d6a4f',
  },
  resumenTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1b4332',
    marginBottom: 16,
  },
  resumenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  resumenLabel: {
    fontSize: 18,
    color: '#333',
  },
  resumenVal: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1b4332',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1b4332',
  },
  emptyBox: {
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 18,
    color: '#6c757d',
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  alertName: {
    fontSize: 20,
    color: '#1b4332',
    fontWeight: '500',
    flex: 1,
  },
  alertQty: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  cierreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 24,
    minHeight: 80,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    marginTop: 8,
  },
  cierreTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1b4332',
    marginBottom: 4,
  },
  cierreSub: {
    fontSize: 16,
    color: '#1b4332',
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#1b4332' },
  label: { fontSize: 16, fontWeight: '600', color: '#1b4332', marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12, height: 58, paddingHorizontal: 18, fontSize: 20, color: '#333', backgroundColor: '#fafafa', letterSpacing: 4 },
  saveBtn: { backgroundColor: '#2d6a4f', height: 58, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 30 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
