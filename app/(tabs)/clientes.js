import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl, ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../supabase';
import { formatearFecha } from '../../utils/fecha';
import { formatInputPesos, formatPesos, parsePesos } from '../../utils/formatters';
import { mostrarAlerta } from '../../utils/alertHelper';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [modalPago, setModalPago] = useState(false);
  const [modalHistorialPagos, setModalHistorialPagos] = useState(false);

  const [clienteSel, setClienteSel] = useState(null);
  const [historialCompras, setHistorialCompras] = useState([]);
  const [historialPagos, setHistorialPagos] = useState([]);

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');

  const [montoPago, setMontoPago] = useState('');
  const [notaPago, setNotaPago] = useState('');

  const [refreshing, setRefreshing] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [editando, setEditando] = useState(null);

  const cargarClientes = async () => {
    const { data, error } = await supabase.from('clientes').select('*').order('nombre');
    if (error) mostrarAlerta('Error', error.message);
    else setClientes(data || []);
  };

  useFocusEffect(useCallback(() => { cargarClientes(); }, []));
  const onRefresh = async () => { setRefreshing(true); await cargarClientes(); setRefreshing(false); };

  const guardarCliente = async () => {
    if (!nombre.trim()) { mostrarAlerta('Error', 'El nombre es obligatorio'); return; }
    setCargando(true);
    const datos = { nombre: nombre.trim(), telefono: telefono.trim() };
    let error;
    if (editando) {
      ({ error } = await supabase.from('clientes').update(datos).eq('id', editando.id));
    } else {
      ({ error } = await supabase.from('clientes').insert([datos]));
    }
    setCargando(false);
    if (error) mostrarAlerta('Error', error.message);
    else { mostrarAlerta('Éxito', editando ? 'Cliente actualizado' : 'Cliente creado'); setModalNuevo(false); cargarClientes(); }
  };

  const eliminarCliente = (c) => {
    mostrarAlerta('Eliminar', `¿Eliminar a "${c.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('clientes').delete().eq('id', c.id);
          if (error) mostrarAlerta('Error', error.message);
          else { mostrarAlerta('Listo', 'Cliente eliminado'); cargarClientes(); }
        }
      },
    ]);
  };

  const abrirDetalle = async (cliente) => {
    setClienteSel(cliente);
    const { data } = await supabase.from('ventas').select('*, productos(nombre)')
      .eq('cliente_id', cliente.id).order('fecha', { ascending: false }).limit(20);
    setHistorialCompras(data || []);
    setModalDetalle(true);
  };

  const abrirHistorialPagos = async (cliente) => {
    setClienteSel(cliente);
    setModalDetalle(false);
    const { data } = await supabase.from('pagos_fiado').select('*')
      .eq('cliente_id', cliente.id).order('fecha', { ascending: false });
    setHistorialPagos(data || []);
    setTimeout(() => setModalHistorialPagos(true), 400);
  };

  const registrarPago = async () => {
    const montoAbono = parsePesos(montoPago);
    if (montoAbono <= 0) {
      mostrarAlerta('Error', 'Ingresa un monto válido');
      return;
    }
    const saldoAntes = Number(clienteSel.saldo_fiado);

    setCargando(true);
    const saldoDespues = Math.max(0, saldoAntes - montoAbono);

    // Insertar en historial
    const { error: errPago } = await supabase.from('pagos_fiado').insert([{
      cliente_id: clienteSel.id,
      monto_abono: montoAbono,
      saldo_antes: saldoAntes,
      saldo_despues: saldoDespues,
      nota: notaPago.trim() || null
    }]);

    if (errPago) {
      setCargando(false);
      mostrarAlerta('Error', errPago.message);
      return;
    }

    // Actualizar cliente
    const { error: errCli } = await supabase.from('clientes').update({ saldo_fiado: saldoDespues }).eq('id', clienteSel.id);
    setCargando(false);

    if (errCli) {
      mostrarAlerta('Error', errCli.message);
    } else {
      if (saldoDespues === 0) {
        mostrarAlerta('Éxito', `🎉 ¡${clienteSel.nombre} terminó de pagar su deuda!`);
      } else {
        mostrarAlerta('Éxito', `Abono registrado. Saldo pendiente: ${formatPesos(saldoDespues)}`);
      }
      setModalPago(false);
      cargarClientes();
    }
  };

  const abrirNuevo = (clienteEditar = null) => {
    if (clienteEditar) {
      setEditando(clienteEditar); setNombre(clienteEditar.nombre || ''); setTelefono(clienteEditar.telefono || '');
    } else {
      setEditando(null); setNombre(''); setTelefono('');
    }
    setModalNuevo(true);
  };

  const renderCliente = ({ item }) => (
    <TouchableOpacity style={s.card} onPress={() => abrirDetalle(item)}>
      <View style={[s.avatar, { backgroundColor: Number(item.saldo_fiado) > 0 ? '#ff8f00' : '#52b788' }]}>
        <Text style={s.avatarText}>{(item.nombre || '?')[0].toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.nombre}>{item.nombre}</Text>
        {item.telefono ? <Text style={s.tel}>📱 {item.telefono}</Text> : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {Number(item.saldo_fiado) > 0 ? (
          <>
            <Text style={s.fiadoLabel}>Crédito</Text>
            <Text style={s.fiadoMonto}>{formatPesos(item.saldo_fiado)}</Text>
          </>
        ) : <Text style={s.sinFiado}>Sin deuda</Text>}
      </View>
      <View style={s.actions}>
        <TouchableOpacity onPress={() => abrirNuevo(item)} style={s.actionBtn}><Ionicons name="pencil" size={18} color="#2d6a4f" /></TouchableOpacity>
        <TouchableOpacity onPress={() => eliminarCliente(item)} style={s.actionBtn}><Ionicons name="trash" size={18} color="#d32f2f" /></TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      <FlatList data={clientes} renderItem={renderCliente} keyExtractor={(i) => i.id}
        contentContainerStyle={s.lista}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2d6a4f']} />}
        ListEmptyComponent={
          <View style={s.empty}><Ionicons name="people-outline" size={60} color="#ccc" />
            <Text style={s.emptyText}>Sin clientes</Text><Text style={s.emptySub}>Toca + para agregar uno</Text></View>
        }
      />
      <TouchableOpacity style={s.fab} onPress={() => abrirNuevo()}><Ionicons name="add" size={30} color="#fff" /></TouchableOpacity>

      {/* Modal Nuevo/Editar Cliente */}
      <Modal visible={modalNuevo} animationType="slide" transparent>
        <View style={s.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modal}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={s.modalHead}>
                <Text style={s.modalTitle}>{editando ? 'Editar Cliente' : 'Nuevo Cliente'}</Text>
                <TouchableOpacity onPress={() => setModalNuevo(false)}><Ionicons name="close" size={28} color="#666" /></TouchableOpacity>
              </View>
              <Text style={s.label}>Nombre *</Text>
              <TextInput style={s.input} value={nombre} onChangeText={setNombre} placeholder="Nombre del cliente" placeholderTextColor="#aaa" />
              <Text style={s.label}>Teléfono</Text>
              <TextInput style={s.input} value={telefono} onChangeText={setTelefono} placeholder="Número de teléfono" keyboardType="phone-pad" placeholderTextColor="#aaa" />
              <TouchableOpacity style={[s.btn, cargando && { opacity: 0.6 }]} onPress={guardarCliente} disabled={cargando}>
                <Text style={s.btnText}>{cargando ? 'Guardando...' : editando ? 'Actualizar' : 'Guardar Cliente'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Modal Detalle Cliente (Compras) */}
      <Modal visible={modalDetalle} animationType="slide" transparent>
        <View style={s.overlay}><View style={[s.modal, { maxHeight: '90%' }]}>
          <View style={s.modalHead}>
            <Text style={s.modalTitle}>{clienteSel?.nombre}</Text>
            <TouchableOpacity onPress={() => setModalDetalle(false)}><Ionicons name="close" size={28} color="#666" /></TouchableOpacity>
          </View>
          {clienteSel && (
            <>
              <View style={s.detalleInfo}>
                {clienteSel.telefono ? <Text style={s.detalleTel}>📱 {clienteSel.telefono}</Text> : null}
                <View style={s.detalleRow}>
                  <Text style={s.detalleLabel}>Saldo a crédito:</Text>
                  <Text style={[s.detalleSaldo, { color: Number(clienteSel.saldo_fiado) > 0 ? '#ff8f00' : '#2d6a4f' }]}>{formatPesos(clienteSel.saldo_fiado)}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                {Number(clienteSel.saldo_fiado) > 0 && (
                  <TouchableOpacity style={[s.pagoBtn, { flex: 1.5 }]} onPress={() => {
                    setModalDetalle(false);
                    setMontoPago('');
                    setNotaPago('');
                    setTimeout(() => setModalPago(true), 400);
                  }}>
                    <Ionicons name="cash" size={20} color="#fff" />
                    <Text style={s.pagoBtnText}>Registrar Abono</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={[s.pagoBtn, { flex: 1, backgroundColor: '#40916c' }]} onPress={() => abrirHistorialPagos(clienteSel)}>
                  <Ionicons name="time" size={20} color="#fff" />
                  <Text style={s.pagoBtnText}>Pagos</Text>
                </TouchableOpacity>
              </View>

              <Text style={[s.label, { marginTop: 16 }]}>Historial de Compras</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {historialCompras.length === 0 ? <Text style={{ color: '#999', padding: 12 }}>Sin compras registradas</Text> :
                  historialCompras.map((v, i) => (
                    <View key={i} style={s.histItem}>
                      <View>
                        <Text style={s.histNombre}>{v.productos?.nombre || 'Producto'}</Text>
                        <Text style={s.histFecha}>{formatearFecha(v.fecha)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.histTotal}>{formatPesos(v.total)}</Text>
                        {v.es_fiado && <Text style={s.histFiado}>CRÉDITO</Text>}
                      </View>
                    </View>
                  ))
                }
              </ScrollView>
            </>
          )}
        </View></View>
      </Modal>

      {/* Modal Historial de Pagos */}
      <Modal visible={modalHistorialPagos} animationType="slide" transparent>
        <View style={s.overlay}><View style={[s.modal, { maxHeight: '90%' }]}>
          <View style={s.modalHead}>
            <Text style={s.modalTitle}>Historial de crédito</Text>
            <TouchableOpacity onPress={() => setModalHistorialPagos(false)}><Ionicons name="close" size={28} color="#666" /></TouchableOpacity>
          </View>
          {clienteSel && (
            <>
              <View style={s.detalleInfo}>
                <Text style={s.detalleLabel}>{clienteSel.nombre}</Text>
                <View style={s.detalleRow}>
                  <Text style={s.detalleLabel}>Saldo Actual:</Text>
                  <Text style={[s.detalleSaldo, { color: Number(clienteSel.saldo_fiado) > 0 ? '#ff8f00' : '#2d6a4f' }]}>{formatPesos(clienteSel.saldo_fiado)}</Text>
                </View>
              </View>

              <ScrollView style={{ maxHeight: '80%', marginTop: 12 }}>
                {historialPagos.length === 0 ? <Text style={{ color: '#999', padding: 12, textAlign: 'center' }}>Este cliente no tiene pagos registrados aún.</Text> :
                  historialPagos.map((p) => (
                    <View key={p.id} style={s.pagoRow}>
                      <View style={{ marginBottom: 6 }}>
                        <Text style={s.pagoFecha}>{formatearFecha(p.fecha)}</Text>
                      </View>
                      <View style={s.pagoMain}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.pagoAbono}>+ {formatPesos(p.monto_abono)}</Text>
                          {p.nota ? <Text style={s.pagoNota}>Nota: {p.nota}</Text> : null}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={s.pagoDetalle}>Debía: {formatPesos(p.saldo_antes)}</Text>
                          {Number(p.saldo_despues) === 0 ? (
                            <Text style={s.pagoSaldado}>✅ Deuda saldada</Text>
                          ) : (
                            <Text style={s.pagoDetalle}>Quedó debiendo: {formatPesos(p.saldo_despues)}</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  ))
                }
              </ScrollView>
            </>
          )}
        </View></View>
      </Modal>

      {/* Modal Pago */}
      <Modal visible={modalPago} animationType="fade" transparent>
        <View style={s.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modal}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={s.modalHead}>
                <Text style={s.modalTitle}>Registrar Abono a Crédito</Text>
                <TouchableOpacity onPress={() => setModalPago(false)}><Ionicons name="close" size={28} color="#666" /></TouchableOpacity>
              </View>
              <Text style={s.label}>Saldo actual: <Text style={{ color: '#ff8f00', fontWeight: 'bold' }}>{formatPesos(clienteSel?.saldo_fiado)}</Text></Text>

              <Text style={s.label}>Monto del Pago *</Text>
              <TextInput style={s.input} value={montoPago} onChangeText={(v) => setMontoPago(formatInputPesos(v))} placeholder="Ej: 10.000" keyboardType="numeric" placeholderTextColor="#aaa" />

              <Text style={s.label}>Nota (Opcional)</Text>
              <TextInput style={s.input} value={notaPago} onChangeText={setNotaPago} placeholder="Ej: Pago en efectivo" placeholderTextColor="#aaa" />

              <TouchableOpacity style={[s.btn, { backgroundColor: '#ff8f00' }, cargando && { opacity: 0.6 }]} onPress={registrarPago} disabled={cargando}>
                <Text style={s.btnText}>{cargando ? 'Procesando...' : 'Registrar Abono'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' }, lista: { padding: 14, paddingBottom: 80 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 14, flexDirection: 'row', alignItems: 'center', elevation: 2, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  nombre: { fontSize: 20, fontWeight: 'bold', color: '#1b4332' },
  tel: { fontSize: 16, color: '#6c757d', marginTop: 4 },
  fiadoLabel: { fontSize: 14, color: '#ff8f00', fontWeight: '600' },
  fiadoMonto: { fontSize: 18, fontWeight: 'bold', color: '#ff8f00' },
  sinFiado: { fontSize: 16, color: '#52b788', fontWeight: '500' },
  actions: { marginLeft: 6, gap: 8 },
  actionBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', marginTop: 100 }, emptyText: { fontSize: 22, color: '#999', marginTop: 16 }, emptySub: { fontSize: 16, color: '#bbb', marginTop: 6 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 70, height: 70, borderRadius: 35, backgroundColor: '#2d6a4f', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 26, fontWeight: 'bold', color: '#1b4332' },
  label: { fontSize: 18, fontWeight: '600', color: '#1b4332', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12, height: 58, paddingHorizontal: 18, fontSize: 18, color: '#333', backgroundColor: '#fafafa' },
  btn: { backgroundColor: '#2d6a4f', height: 58, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 24, marginBottom: 14 },
  btnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  detalleInfo: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 18, gap: 10 },
  detalleTel: { fontSize: 18, color: '#333' },
  detalleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detalleLabel: { fontSize: 18, color: '#666' },
  detalleSaldo: { fontSize: 24, fontWeight: 'bold' },
  pagoBtn: { flexDirection: 'row', gap: 10, backgroundColor: '#ff8f00', height: 58, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  pagoBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  histItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  histNombre: { fontSize: 18, fontWeight: '500', color: '#333' },
  histFecha: { fontSize: 14, color: '#999', marginTop: 4 },
  histTotal: { fontSize: 18, fontWeight: 'bold', color: '#1b4332' },
  histFiado: { fontSize: 12, color: '#ff8f00', fontWeight: 'bold', marginTop: 4 },
  pagoRow: { borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 16 },
  pagoFecha: { fontSize: 16, color: '#666', fontWeight: '500' },
  pagoMain: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, alignItems: 'flex-start' },
  pagoAbono: { fontSize: 20, fontWeight: 'bold', color: '#2d6a4f' },
  pagoNota: { fontSize: 16, color: '#666', marginTop: 6, fontStyle: 'italic' },
  pagoDetalle: { fontSize: 16, color: '#777', marginBottom: 4 },
  pagoSaldado: { fontSize: 16, color: '#2d6a4f', fontWeight: 'bold' },
});
