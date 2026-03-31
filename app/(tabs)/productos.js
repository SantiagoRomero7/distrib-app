import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useModoDiscreto } from '../../hooks/useModoDiscreto';
import { supabase } from '../../supabase';
import { formatInputPesos, formatPesos, parsePesos } from '../../utils/formatters';

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState(null);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('');
  const [precioCompra, setPrecioCompra] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [cargando, setCargando] = useState(false);
  const { ocultarSensible } = useModoDiscreto();

  const cargarProductos = async () => {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('creado_en', { ascending: false });

    if (error) {
      Alert.alert('Error', 'No se pudieron cargar los productos: ' + error.message);
    } else {
      setProductos(data || []);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarProductos();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarProductos();
    setRefreshing(false);
  };

  const abrirModal = (producto = null) => {
    if (producto) {
      setEditando(producto);
      setNombre(producto.nombre || '');
      setTipo(producto.tipo || '');
      setPrecioCompra(formatInputPesos(String(producto.precio_compra || '')));
      setPrecioVenta(formatInputPesos(String(producto.precio_venta || '')));
    } else {
      setEditando(null);
      setNombre('');
      setTipo('');
      setPrecioCompra('');
      setPrecioVenta('');
    }
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setEditando(null);
  };

  const guardarProducto = async () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre del producto es obligatorio');
      return;
    }
    if (!precioCompra || !precioVenta) {
      Alert.alert('Error', 'Los precios son obligatorios');
      return;
    }

    setCargando(true);

    const datos = {
      nombre: nombre.trim(),
      tipo: tipo.trim(),
      precio_compra: parsePesos(precioCompra),
      precio_venta: parsePesos(precioVenta),
    };

    let error;
    if (editando) {
      ({ error } = await supabase.from('productos').update(datos).eq('id', editando.id));
    } else {
      ({ error } = await supabase.from('productos').insert([datos]));
    }

    setCargando(false);

    if (error) {
      Alert.alert('Error', 'No se pudo guardar: ' + error.message);
    } else {
      Alert.alert('Éxito', editando ? 'Producto actualizado' : 'Producto creado');
      cerrarModal();
      cargarProductos();
    }
  };

  const eliminarProducto = (producto) => {
    Alert.alert(
      'Eliminar Producto',
      `¿Seguro que deseas eliminar "${producto.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            // Check for related ventas
            const { data: ventasRel } = await supabase.from('ventas').select('id').eq('producto_id', producto.id).limit(1);
            if (ventasRel && ventasRel.length > 0) {
              Alert.alert('No se puede eliminar', 'Este producto tiene ventas registradas. No se puede eliminar.');
              return;
            }
            // Check for related inventario
            const { data: invRel } = await supabase.from('inventario').select('id').eq('producto_id', producto.id).limit(1);
            if (invRel && invRel.length > 0) {
              Alert.alert('No se puede eliminar', 'Este producto tiene inventario registrado. No se puede eliminar.');
              return;
            }
            const { error } = await supabase.from('productos').delete().eq('id', producto.id);
            if (error) {
              Alert.alert('Error', 'No se pudo eliminar: ' + error.message);
            } else {
              Alert.alert('Listo', 'Producto eliminado');
              cargarProductos();
            }
          },
        },
      ]
    );
  };

  const renderProducto = ({ item }) => (
    <View style={styles.productoCard}>
      <View style={styles.productoInfo}>
        <Text style={styles.productoNombre}>{item.nombre}</Text>
        {item.tipo ? <Text style={styles.productoTipo}>{item.tipo}</Text> : null}
        <View style={styles.preciosRow}>
          <View style={styles.precioBox}>
            <Text style={styles.precioLabel}>Compra</Text>
            <Text style={styles.precioCompra}>{ocultarSensible(formatPesos(item.precio_compra))}</Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color="#999" />
          <View style={styles.precioBox}>
            <Text style={styles.precioLabel}>Venta</Text>
            <Text style={styles.precioVenta}>{formatPesos(item.precio_venta)}</Text>
          </View>
          <View style={styles.precioBox}>
            <Text style={styles.precioLabel}>Ganancia</Text>
            <Text style={styles.precioGanancia}>
              {ocultarSensible(formatPesos(Number(item.precio_venta) - Number(item.precio_compra)))}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.productoActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => abrirModal(item)}>
          <Ionicons name="pencil" size={20} color="#2d6a4f" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => eliminarProducto(item)}>
          <Ionicons name="trash" size={20} color="#d32f2f" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={productos}
        renderItem={renderProducto}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2d6a4f']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetag-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No hay productos</Text>
            <Text style={styles.emptySubtext}>Toca el botón + para agregar uno</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => abrirModal()}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editando ? 'Editar Producto' : 'Nuevo Producto'}
                </Text>
                <TouchableOpacity onPress={cerrarModal}>
                  <Ionicons name="close" size={28} color="#666" />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Nombre *</Text>
              <TextInput
                style={styles.input}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Ej: Panela en bloque"
                placeholderTextColor="#aaa"
              />

              <Text style={styles.inputLabel}>Tipo</Text>
              <TextInput
                style={styles.input}
                value={tipo}
                onChangeText={setTipo}
                placeholder="Ej: Bloque, Molida, Orgánica"
                placeholderTextColor="#aaa"
              />

              <Text style={styles.inputLabel}>Precio de Compra *</Text>
              <TextInput
                style={styles.input}
                value={precioCompra}
                onChangeText={(v) => setPrecioCompra(formatInputPesos(v))}
                placeholder="Ej: 2.500"
                keyboardType="numeric"
                placeholderTextColor="#aaa"
              />

              <Text style={styles.inputLabel}>Precio de Venta *</Text>
              <TextInput
                style={styles.input}
                value={precioVenta}
                onChangeText={(v) => setPrecioVenta(formatInputPesos(v))}
                placeholder="Ej: 3.500"
                keyboardType="numeric"
                placeholderTextColor="#aaa"
              />

              {precioCompra && precioVenta ? (
                <View style={styles.previewGanancia}>
                  <Text style={styles.previewLabel}>Ganancia por unidad:</Text>
                  <Text style={styles.previewValue}>
                    {formatPesos(parsePesos(precioVenta) - parsePesos(precioCompra))}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.saveBtn, cargando && styles.saveBtnDisabled]}
                onPress={guardarProducto}
                disabled={cargando}
              >
                <Text style={styles.saveBtnText}>
                  {cargando ? 'Guardando...' : editando ? 'Actualizar' : 'Guardar Producto'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  lista: { padding: 14, paddingBottom: 80 },
  productoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  productoInfo: { flex: 1 },
  productoNombre: { fontSize: 20, fontWeight: 'bold', color: '#1b4332' },
  productoTipo: {
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#52b788',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 6,
    overflow: 'hidden',
    fontWeight: '500',
  },
  preciosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 12,
  },
  precioBox: { alignItems: 'center' },
  precioLabel: { fontSize: 13, color: '#999', fontWeight: '500' },
  precioCompra: { fontSize: 18, color: '#d32f2f', fontWeight: '600' },
  precioVenta: { fontSize: 18, color: '#2d6a4f', fontWeight: '600' },
  precioGanancia: { fontSize: 18, color: '#ff8f00', fontWeight: '600' },
  productoActions: { justifyContent: 'center', gap: 14 },
  actionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 22, color: '#999', marginTop: 16 },
  emptySubtext: { fontSize: 16, color: '#bbb', marginTop: 6 },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#2d6a4f',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { fontSize: 26, fontWeight: 'bold', color: '#1b4332' },
  inputLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1b4332',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    height: 58,
    paddingHorizontal: 18,
    fontSize: 18,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  previewGanancia: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  previewLabel: { fontSize: 18, color: '#2d6a4f', fontWeight: '500' },
  previewValue: { fontSize: 18, color: '#2d6a4f', fontWeight: 'bold' },
  saveBtn: {
    backgroundColor: '#2d6a4f',
    height: 58,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
});
