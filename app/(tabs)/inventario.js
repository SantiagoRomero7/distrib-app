import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, RefreshControl, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../supabase';
import { mostrarAlerta } from '../../utils/alertHelper';
import { ahoraEnColombia, formatearFecha } from '../../utils/fecha';

export default function Inventario() {
  const [inventario, setInventario] = useState([]);
  const [stockTotal, setStockTotal] = useState([]);
  const [productos, setProductos] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [productoSel, setProductoSel] = useState(null);
  const [entradaEditar, setEntradaEditar] = useState(null);
  const [cantidad, setCantidad] = useState('');
  const [cantidadEditar, setCantidadEditar] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [cargando, setCargando] = useState(false);

  const cargarDatos = async () => {
    const { data: inv } = await supabase
      .from('inventario')
      .select('*, productos(nombre, tipo)')
      .order('actualizado_en', { ascending: false });
    
    if (inv) {
      setInventario(inv);
      
      const stMap = {};
      inv.forEach(item => {
        const pId = item.producto_id;
        if (!stMap[pId]) {
          stMap[pId] = {
            id: pId,
            nombre: item.productos?.nombre || 'Desconocido',
            tipo: item.productos?.tipo || '',
            stock_total: 0,
            unidad: item.unidad || 'cajas'
          };
        }
        stMap[pId].stock_total += Number(item.cantidad);
      });
      setStockTotal(Object.values(stMap).sort((a, b) => a.nombre.localeCompare(b.nombre)));
    }
    
    const { data: prods } = await supabase.from('productos').select('id, nombre, tipo').order('nombre');
    if (prods) setProductos(prods);
  };

  useFocusEffect(useCallback(() => { cargarDatos(); }, []));
  const onRefresh = async () => { setRefreshing(true); await cargarDatos(); setRefreshing(false); };

  const registrarEntrada = async () => {
    if (!productoSel) { mostrarAlerta('Error', 'Selecciona un producto'); return; }
    if (!cantidad || Number(cantidad) <= 0) { mostrarAlerta('Error', 'Ingresa una cantidad válida'); return; }
    setCargando(true);
    const cantNum = Number(cantidad);
    const { data: existente } = await supabase.from('inventario').select('id, cantidad').eq('producto_id', productoSel.id).single();
    let error;
    if (existente) {
      ({ error } = await supabase.from('inventario').update({ cantidad: Number(existente.cantidad) + cantNum, actualizado_en: new Date().toISOString() }).eq('id', existente.id));
    } else {
      ({ error } = await supabase.from('inventario').insert([{ producto_id: productoSel.id, cantidad: cantNum, unidad: 'cajas' }]));
    }
    setCargando(false);
    if (error) { mostrarAlerta('Error', error.message); } else {
      mostrarAlerta('Éxito', `Se agregaron ${cantNum} cajas de ${productoSel.nombre}`);
      setModalVisible(false); cargarDatos();
    }
  };

  const guardarEdicion = async () => {
    if (!entradaEditar) return;
    if (!cantidadEditar || Number(cantidadEditar) < 0) {
      mostrarAlerta('Error', 'Ingresa una cantidad válida nueva');
      return;
    }
    setCargando(true);
    const cantNueva = Number(cantidadEditar);
    
    const { error } = await supabase
      .from('inventario')
      .update({ 
        cantidad: cantNueva,
        actualizado_en: ahoraEnColombia().toISOString()
      })
      .eq('id', entradaEditar.id);

    setCargando(false);
    if (error) {
      mostrarAlerta('Error', 'No se pudo actualizar: ' + error.message);
    } else {
      mostrarAlerta('Éxito', 'Inventario actualizado correctamente');
      setModalEditarVisible(false);
      cargarDatos();
    }
  };

  const confirmarEliminar = (id) => {
    mostrarAlerta(
      '¿Eliminar esta entrada?',
      'Se eliminará este registro de inventario. El stock se ajustará automáticamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('inventario').delete().eq('id', id);
            if (error) {
              mostrarAlerta('Error', 'No se pudo eliminar: ' + error.message);
            } else {
              mostrarAlerta('Listo', 'Registro eliminado');
              cargarDatos();
            }
          }
        }
      ]
    );
  };

  const getColor = (c) => { const n = Number(c); if (n <= 0) return '#d32f2f'; if (n < 10) return '#ff8f00'; return '#2d6a4f'; };

  const renderItem = ({ item }) => (
    <View style={s.card}>
      <View style={{ flex: 1 }}>
        <Text style={s.nombre}>{item.productos?.nombre || 'Sin nombre'} — {item.productos?.tipo || 'General'}</Text>
        <Text style={s.fechaInfo}>Actualizado: {formatearFecha(item.actualizado_en || item.creado_en)}</Text>
      </View>
      <View style={{ alignItems: 'center', marginRight: 14 }}>
        <Text style={[s.stockNum, { color: getColor(item.cantidad) }]}>{Number(item.cantidad)}</Text>
        <Text style={s.unidad}>{item.unidad}</Text>
      </View>
      <View style={s.actionRow}>
        <TouchableOpacity style={s.actionBtn} onPress={() => { setEntradaEditar(item); setCantidadEditar(String(item.cantidad)); setModalEditarVisible(true); }}>
          <Ionicons name="pencil" size={24} color="#0077b6" />
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={() => confirmarEliminar(item.id)}>
          <Ionicons name="trash" size={24} color="#d32f2f" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStockTotal = () => (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.sectionTitle}>Stock Total Actual</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 14, gap: 12 }}>
        {stockTotal.map((st) => (
          <View key={st.id} style={s.stockCard}>
            <Text style={s.stockCardTitle}>{st.nombre} — {st.tipo || 'General'}</Text>
            <Text style={s.stockCardValue}>{st.stock_total} {st.unidad}</Text>
          </View>
        ))}
        {stockTotal.length === 0 && <Text style={{ color: '#999', alignSelf: 'center' }}>No hay stock registrado</Text>}
      </ScrollView>
    </View>
  );

  return (
    <View style={s.container}>
      {renderStockTotal()}
      <FlatList data={inventario} renderItem={renderItem} keyExtractor={(i) => i.id}
        contentContainerStyle={s.lista}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2d6a4f']} />}
        ListHeaderComponent={<Text style={s.sectionTitleList}>Historial de Entradas</Text>}
        ListEmptyComponent={
          <View style={s.empty}><Ionicons name="cube-outline" size={60} color="#ccc" />
            <Text style={s.emptyText}>Sin inventario</Text><Text style={s.emptySub}>Toca + para registrar mercancía</Text></View>
        }
      />
      <TouchableOpacity style={s.fab} onPress={() => { setProductoSel(null); setCantidad(''); setModalVisible(true); }}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modal}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={s.modalHead}>
                <Text style={s.modalTitle}>Registrar Entrada</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={28} color="#666" /></TouchableOpacity>
              </View>
              <Text style={s.label}>Selecciona Producto</Text>
              <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                {productos.map((p) => (
                  <TouchableOpacity key={p.id} style={[s.opt, productoSel?.id === p.id && s.optSel]} onPress={() => setProductoSel(p)}>
                    <Text style={[s.optText, productoSel?.id === p.id && { color: '#2d6a4f', fontWeight: '600' }]}>{p.nombre} — {p.tipo || 'General'}</Text>
                    {productoSel?.id === p.id && <Ionicons name="checkmark-circle" size={22} color="#2d6a4f" />}
                  </TouchableOpacity>
                ))}
                {productos.length === 0 && <Text style={{ color: '#999', textAlign: 'center', padding: 20 }}>No hay productos</Text>}
              </ScrollView>
              <Text style={s.label}>Cantidad (cajas)</Text>
              <TextInput style={s.input} value={cantidad} onChangeText={setCantidad} placeholder="Ej: 50" keyboardType="numeric" placeholderTextColor="#aaa" />
              <TouchableOpacity style={[s.btn, cargando && { opacity: 0.6 }]} onPress={registrarEntrada} disabled={cargando}>
                <Text style={s.btnText}>{cargando ? 'Registrando...' : 'Registrar Entrada'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Modal Editar */}
      <Modal visible={modalEditarVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modal}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={s.modalHead}>
                <Text style={s.modalTitle}>Editar Entrada</Text>
                <TouchableOpacity onPress={() => setModalEditarVisible(false)}><Ionicons name="close" size={28} color="#666" /></TouchableOpacity>
              </View>
              {entradaEditar && (
                <>
                  <Text style={{ fontSize: 18, color: '#333', marginBottom: 16 }}>{entradaEditar.productos?.nombre} — {entradaEditar.productos?.tipo || 'General'}</Text>
                  <Text style={s.label}>Nueva Cantidad (cajas)</Text>
                  <TextInput style={s.input} value={cantidadEditar} onChangeText={setCantidadEditar} keyboardType="numeric" placeholderTextColor="#aaa" />
                  <TouchableOpacity style={[s.btn, cargando && { opacity: 0.6 }]} onPress={guardarEdicion} disabled={cargando}>
                    <Text style={s.btnText}>{cargando ? 'Guardando...' : 'Guardar cambios'}</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  lista: { padding: 14, paddingBottom: 80 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 14, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  nombre: { fontSize: 18, fontWeight: 'bold', color: '#1b4332', marginBottom: 4 },
  fechaInfo: { fontSize: 14, color: '#666' },
  stockNum: { fontSize: 26, fontWeight: 'bold' },
  unidad: { fontSize: 14, color: '#999', fontWeight: '500' },
  actionRow: { flexDirection: 'row', gap: 10, marginLeft: 6 },
  actionBtn: { padding: 8, backgroundColor: '#f5f5f5', borderRadius: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1b4332', marginLeft: 14, marginTop: 10 },
  sectionTitleList: { fontSize: 18, fontWeight: 'bold', color: '#1b4332', marginBottom: 12 },
  stockCard: { backgroundColor: '#1b4332', padding: 16, borderRadius: 12, minWidth: 160 },
  stockCardTitle: { color: '#b7dfc9', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  stockCardValue: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 22, color: '#999', marginTop: 16 },
  emptySub: { fontSize: 16, color: '#bbb', marginTop: 6 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 70, height: 70, borderRadius: 35, backgroundColor: '#2d6a4f', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 26, fontWeight: 'bold', color: '#1b4332' },
  label: { fontSize: 18, fontWeight: '600', color: '#1b4332', marginBottom: 8, marginTop: 16 },
  opt: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: 12, borderWidth: 1.5, borderColor: '#e0e0e0', marginBottom: 8, backgroundColor: '#fafafa' },
  optSel: { borderColor: '#2d6a4f', backgroundColor: '#e8f5e9' },
  optText: { fontSize: 18, color: '#333' },
  input: { borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12, height: 58, paddingHorizontal: 18, fontSize: 18, color: '#333', backgroundColor: '#fafafa' },
  btn: { backgroundColor: '#2d6a4f', height: 58, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 24, marginBottom: 14 },
  btnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
});
