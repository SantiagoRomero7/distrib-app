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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useModoDiscreto } from '../../hooks/useModoDiscreto';
import { supabase } from '../../supabase';
import { ahoraEnColombia, fechaHoyColombia, formatearFecha, formatearFechaCorta } from '../../utils/fecha';
import { formatInputPesos, formatPesos, parsePesos } from '../../utils/formatters';
import { mostrarAlerta } from '../../utils/alertHelper';

const generarUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const crearItemVacio = () => ({ id: Date.now(), producto: null, cantidad: '', precio_aplicado: '', showPicker: false });

export default function Ventas() {
  const [ventasAgrupadas, setVentasAgrupadas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDetalleVisible, setModalDetalleVisible] = useState(false);
  const [ventaSel, setVentaSel] = useState(null);
  const [items, setItems] = useState([crearItemVacio()]);
  const [clienteNombre, setClienteNombre] = useState('');
  const [sugerenciasClientes, setSugerenciasClientes] = useState([]);
  const [esFiado, setEsFiado] = useState(false);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [refreshing, setRefreshing] = useState(false);
  const [cargando, setCargando] = useState(false);
  const { ocultarSensible } = useModoDiscreto();

  const cargarDatos = async () => {
    const { data: v, error } = await supabase.from('ventas')
      .select('*, productos(nombre, tipo), clientes(nombre)')
      .order('fecha', { ascending: false })
      .limit(300);

    if (v) {
      const grupos = {};
      const sinGrupo = [];

      v.forEach(venta => {
        // Usa venta_grupo si existe, de lo contrario agrupa por fecha y cliente (para historial antiguo)
        const grupoKey = venta.venta_grupo || `${venta.fecha}_${venta.cliente_id || 'sin_cli'}`;

        if (!grupos[grupoKey]) {
          grupos[grupoKey] = {
            id: grupoKey,
            fecha: venta.fecha,
            cliente_nombre: venta.clientes?.nombre || 'Cliente general',
            es_fiado: venta.es_fiado,
            total: 0,
            ganancia: 0,
            productos_count: 0,
            items: []
          };
        }
        grupos[grupoKey].total += Number(venta.total);
        grupos[grupoKey].ganancia += Number(venta.ganancia);
        grupos[grupoKey].productos_count += 1;
        grupos[grupoKey].items.push(venta);
      });

      const arrayGrupos = Object.values(grupos);
      arrayGrupos.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
      setVentasAgrupadas(arrayGrupos);
    }

    if (error) console.error(error);

    const { data: p } = await supabase.from('productos').select('*').order('nombre');
    if (p) setProductos(p);
  };

  useFocusEffect(useCallback(() => { cargarDatos(); }, []));
  const onRefresh = async () => { setRefreshing(true); await cargarDatos(); setRefreshing(false); };

  const buscarCliente = async (texto) => {
    setClienteNombre(texto);
    if (texto.length < 2) {
      setSugerenciasClientes([]);
      return;
    }
    const { data } = await supabase
      .from('clientes')
      .select('id, nombre, saldo_fiado')
      .ilike('nombre', `%${texto}%`)
      .limit(5);
    setSugerenciasClientes(data || []);
  };

  const obtenerOCrearCliente = async (nombreABuscar) => {
    if (!nombreABuscar || nombreABuscar.trim() === '') return null;
    
    // Buscar si ya existe exacto o casi exacto
    const { data: existente } = await supabase
      .from('clientes')
      .select('id, saldo_fiado')
      .ilike('nombre', nombreABuscar.trim())
      .single();
    
    if (existente) return { id: existente.id, saldo_fiado: existente.saldo_fiado || 0 };
    
    // Crear nuevo cliente
    const { data: nuevo, error } = await supabase
      .from('clientes')
      .insert({ nombre: nombreABuscar.trim() })
      .select('id, saldo_fiado')
      .single();
    
    if (error) {
      console.error(error);
      return null;
    }
    return { id: nuevo.id, saldo_fiado: 0 };
  };

  // Calculations
  const calcularSubtotal = (item) => {
    if (!item.producto || !item.cantidad || !item.precio_aplicado) return 0;
    return Number(item.cantidad) * parsePesos(item.precio_aplicado);
  };
  const calcularGananciaItem = (item) => {
    if (!item.producto || !item.cantidad || !item.precio_aplicado) return 0;
    return (parsePesos(item.precio_aplicado) - Number(item.producto.precio_compra)) * Number(item.cantidad);
  };
  const totalGeneral = items.reduce((sum, it) => sum + calcularSubtotal(it), 0);
  const gananciaTotal = items.reduce((sum, it) => sum + calcularGananciaItem(it), 0);

  // Item management
  const actualizarItem = (id, campo, valor) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [campo]: valor } : it));
  };
  const agregarItem = () => { setItems(prev => [...prev, crearItemVacio()]); };
  const eliminarItem = (id) => { setItems(prev => prev.filter(it => it.id !== id)); };
  const seleccionarProducto = (itemId, prod) => {
    setItems(prev => prev.map(it => it.id === itemId ? {
      ...it,
      producto: prod,
      precio_aplicado: formatInputPesos(prod.precio_venta.toString()),
      showPicker: false
    } : it));
  };

  const iniciarRegistroVenta = async () => {
    const itemsValidos = items.filter(it => it.producto && it.cantidad && Number(it.cantidad) > 0);
    if (itemsValidos.length === 0) { mostrarAlerta('Error', 'Agrega al menos un producto con cantidad'); return; }
    if (esFiado && (!clienteNombre || clienteNombre.trim() === '')) { mostrarAlerta('Error', 'Para crédito debes escribir o seleccionar el nombre de un cliente'); return; }

    verificarGanancia(itemsValidos, fechaHoyColombia());
  };

  const verificarGanancia = (itemsValidos, fechaResumen) => {
    let gananciaNegativa = false;
    for (const it of itemsValidos) {
      if (!it.precio_aplicado || parsePesos(it.precio_aplicado) <= 0) {
        mostrarAlerta('Error', `El precio aplicado para ${it.producto.nombre} no puede ser 0 o menor.`);
        return;
      }
      if (parsePesos(it.precio_aplicado) < Number(it.producto.precio_compra)) {
        gananciaNegativa = true;
      }
    }

    if (gananciaNegativa) {
      mostrarAlerta(
        '⚠ Atención',
        'Estás vendiendo por debajo del precio de compra. ¿Confirmar de todas formas?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Confirmar', onPress: () => ejecutarRegistro(itemsValidos, fechaResumen) }
        ]
      );
    } else {
      ejecutarRegistro(itemsValidos, fechaResumen);
    }
  };

  const actualizarResumenDiario = async (cajas, total, ganancia, metodo, fechaResumen) => {
    const { data } = await supabase
      .from('resumen_diario')
      .select('*')
      .eq('fecha', fechaResumen)
      .single();

    if (data) {
      await supabase
        .from('resumen_diario')
        .update({
          total_cajas: Number(data.total_cajas || 0) + cajas,
          total_ventas: Number(data.total_ventas || 0) + total,
          total_ganancia: Number(data.total_ganancia || 0) + ganancia,
          total_efectivo: metodo === 'efectivo' ? Number(data.total_efectivo || 0) + total : Number(data.total_efectivo || 0),
          total_transferencia: metodo === 'transferencia' ? Number(data.total_transferencia || 0) + total : Number(data.total_transferencia || 0),
          cantidad_ventas: Number(data.cantidad_ventas || 0) + 1
        })
        .eq('fecha', fechaResumen);
    } else {
      await supabase
        .from('resumen_diario')
        .insert([{
          fecha: fechaResumen,
          total_cajas: cajas,
          total_ventas: total,
          total_ganancia: ganancia,
          total_efectivo: metodo === 'efectivo' ? total : 0,
          total_transferencia: metodo === 'transferencia' ? total : 0,
          cantidad_ventas: 1
        }]);
    }
  };

  const ejecutarRegistro = async (itemsValidos, fechaResumen) => {
    setCargando(true);

    for (const it of itemsValidos) {
      const cantNum = Number(it.cantidad);
      const { data: inv } = await supabase.from('inventario').select('cantidad').eq('producto_id', it.producto.id).single();
      const stockActual = inv ? Number(inv.cantidad) : 0;
      if (cantNum > stockActual) {
        setCargando(false);
        mostrarAlerta('Stock insuficiente', `Stock insuficiente para ${it.producto.nombre} — ${it.producto.tipo || ''}.\nDisponible: ${stockActual} cajas, pedido: ${cantNum}`);
        return;
      }
    }

    const clienteObj = await obtenerOCrearCliente(clienteNombre);
    const clienteIdSel = clienteObj?.id || null;
    const clienteSaldoActual = clienteObj?.saldo_fiado || 0;

    const fecha = ahoraEnColombia().toISOString();
    const grupoId = generarUUID();
    let hayError = false;
    let cajasTotales = 0;

    for (const it of itemsValidos) {
      const cantNum = Number(it.cantidad);
      cajasTotales += cantNum;
      const precioAplicado = parsePesos(it.precio_aplicado);
      const subtotal = cantNum * precioAplicado;
      const ganancia = (precioAplicado - Number(it.producto.precio_compra)) * cantNum;

      const { error: errVenta } = await supabase.from('ventas').insert([{
        venta_grupo: grupoId,
        producto_id: it.producto.id,
        cliente_id: clienteIdSel,
        cantidad: cantNum,
        precio_unitario: precioAplicado,
        precio_compra_unitario: Number(it.producto.precio_compra),
        total: subtotal, ganancia, es_fiado: esFiado, fecha,
        metodo_pago: metodoPago
      }]);
      if (errVenta) { hayError = true; mostrarAlerta('Error', errVenta.message); break; }

      const { data: inv } = await supabase.from('inventario').select('id, cantidad').eq('producto_id', it.producto.id).single();
      if (inv) {
        await supabase.from('inventario').update({ cantidad: Math.max(0, Number(inv.cantidad) - cantNum), actualizado_en: ahoraEnColombia().toISOString() }).eq('id', inv.id);
      }
    }

    if (!hayError && esFiado && clienteIdSel) {
      await supabase.from('clientes').update({ saldo_fiado: Number(clienteSaldoActual) + totalGeneral }).eq('id', clienteIdSel);
    }

    if (!hayError) {
      await actualizarResumenDiario(cajasTotales, totalGeneral, gananciaTotal, metodoPago, fechaResumen);
    }

    setCargando(false);
    if (!hayError) {
      mostrarAlerta('Éxito', 'Venta registrada correctamente.');
      setModalVisible(false);
      cargarDatos();
    }
  };

  const abrirModalFormulario = () => {
    setItems([crearItemVacio()]);
    setClienteNombre(''); setSugerenciasClientes([]); setEsFiado(false); setMetodoPago('efectivo');
    setModalVisible(true);
  };

  const abrirDetalleVenta = (ventaGrp) => {
    setVentaSel(ventaGrp);
    setModalDetalleVisible(true);
  };

  const renderVentaAgrupada = ({ item }) => (
    <TouchableOpacity style={s.ventaCard} onPress={() => abrirDetalleVenta(item)}>
      <View style={{ flex: 1 }}>
        <Text style={s.ventaFecha}>{formatearFechaCorta(item.fecha)}</Text>
        <Text style={s.ventaCliente}>👤 {item.cliente_nombre}</Text>
        <Text style={s.ventaDetalle}>{item.productos_count} {item.productos_count === 1 ? 'producto' : 'productos'}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
        <Text style={s.ventaTotalCard}>{formatPesos(item.total)}</Text>
        {item.es_fiado ? <Text style={s.fiadoBadge}>CRÉDITO</Text> : null}
        <Ionicons name="chevron-forward" size={24} color="#999" style={{ marginTop: 8 }} />
      </View>
    </TouchableOpacity>
  );

  const renderItemForm = (item, idx) => {
    const isBelowStandard = item.producto && parsePesos(item.precio_aplicado) < Number(item.producto.precio_venta);
    const isAboveStandard = item.producto && parsePesos(item.precio_aplicado) > Number(item.producto.precio_venta);

    return (
      <View key={item.id} style={s.itemBox}>
        <View style={s.itemHeader}>
          <Text style={s.itemNum}>Producto {idx + 1}</Text>
          {items.length > 1 && (
            <TouchableOpacity onPress={() => eliminarItem(item.id)}>
              <Ionicons name="close-circle" size={28} color="#d32f2f" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={s.selector} onPress={() => actualizarItem(item.id, 'showPicker', !item.showPicker)}>
          <Text style={item.producto ? s.selText : s.selPlaceholder}>
            {item.producto ? `${item.producto.nombre} — ${item.producto.tipo || 'General'}` : 'Seleccionar producto...'}
          </Text>
          <Ionicons name={item.showPicker ? 'chevron-up' : 'chevron-down'} size={24} color="#666" />
        </TouchableOpacity>

        {item.showPicker && (
          <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
            {productos.map((p) => (
              <TouchableOpacity key={p.id} style={[s.opt, item.producto?.id === p.id && s.optSel]} onPress={() => seleccionarProducto(item.id, p)}>
                <View><Text style={s.optText}>{p.nombre} — {p.tipo || 'General'}</Text><Text style={s.optPrice}>Venta: {formatPesos(p.precio_venta)}</Text></View>
                {item.producto?.id === p.id && <Ionicons name="checkmark-circle" size={26} color="#2d6a4f" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Text style={s.labelField}>Cantidad (cajas)</Text>
        <TextInput style={s.input} value={item.cantidad} onChangeText={(v) => actualizarItem(item.id, 'cantidad', v.replace(/[^0-9]/g, ''))}
          placeholder="Ej: 5" keyboardType="numeric" placeholderTextColor="#aaa" />

        {item.producto && (
          <>
            <Text style={s.labelField}>Precio a aplicar (estándar: {formatPesos(item.producto.precio_venta)})</Text>
            <TextInput style={s.input} value={item.precio_aplicado} onChangeText={(v) => actualizarItem(item.id, 'precio_aplicado', formatInputPesos(v))}
              placeholder="Ej: 50.000" keyboardType="numeric" placeholderTextColor="#aaa" />

            {isBelowStandard && <Text style={s.warnBelow}>⚠ Precio por debajo del estándar</Text>}
            {isAboveStandard && <Text style={s.warnAbove}>↑ Precio por encima del estándar</Text>}
          </>
        )}

        {item.producto && item.cantidad && item.precio_aplicado ? (
          <Text style={s.itemSubtotal}>Subtotal: {formatPesos(calcularSubtotal(item))} · Ganancia: {ocultarSensible(formatPesos(calcularGananciaItem(item)))}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={s.container}>
      <FlatList data={ventasAgrupadas} renderItem={renderVentaAgrupada} keyExtractor={(i) => i.id}
        contentContainerStyle={s.lista}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2d6a4f']} />}
        ListHeaderComponent={ventasAgrupadas.length > 0 ? <Text style={s.headerText}>Historial de Ventas</Text> : null}
        ListEmptyComponent={
          <View style={s.empty}><Ionicons name="cart-outline" size={70} color="#ccc" />
            <Text style={s.emptyText}>Sin ventas registradas</Text><Text style={s.emptySub}>Toca + para una nueva</Text></View>
        }
      />

      <TouchableOpacity style={s.fab} onPress={abrirModalFormulario}><Ionicons name="add" size={36} color="#fff" /></TouchableOpacity>

      {/* Modal Nueva Venta */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modal}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
              <View style={s.modalHead}>
                <Text style={s.modalTitle}>Nueva Venta</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={32} color="#666" /></TouchableOpacity>
              </View>

              {items.map((it, idx) => renderItemForm(it, idx))}

              <TouchableOpacity style={s.addItemBtn} onPress={agregarItem}>
                <Ionicons name="add-circle" size={26} color="#2d6a4f" />
                <Text style={s.addItemText}>Agregar otro producto</Text>
              </TouchableOpacity>

              {totalGeneral > 0 && (
                <View style={s.calcBox}>
                  {items.filter(it => it.producto && it.cantidad && it.precio_aplicado).map((it, i) => (
                    <View key={it.id} style={s.calcRow}>
                      <Text style={s.calcLabel} numberOfLines={1}>{it.producto.nombre} — {it.producto.tipo || 'General'} × {it.cantidad}</Text>
                      <Text style={s.calcVal}>{formatPesos(calcularSubtotal(it))}</Text>
                    </View>
                  ))}
                  <View style={[s.calcRow, { borderTopWidth: 1, borderTopColor: '#b7dfc9', paddingTop: 10, marginTop: 6 }]}>
                    <Text style={s.calcTotalLabel}>Total</Text><Text style={s.calcTotal}>{formatPesos(totalGeneral)}</Text>
                  </View>
                  <View style={s.calcRow}>
                    <Text style={s.calcLabel}>Ganancia</Text><Text style={s.calcGanancia}>{ocultarSensible(formatPesos(gananciaTotal))}</Text>
                  </View>
                </View>
              )}

              <Text style={s.label}>Nombre del cliente (opcional)</Text>
              <TextInput 
                style={s.input} 
                value={clienteNombre} 
                onChangeText={buscarCliente} 
                placeholder="Escribe el nombre aquí" 
                placeholderTextColor="#aaa" 
              />
              {sugerenciasClientes.length > 0 && (
                <ScrollView style={{ maxHeight: 150, marginTop: 8 }} nestedScrollEnabled>
                  {sugerenciasClientes.map((c) => (
                    <TouchableOpacity key={c.id} style={s.opt} onPress={() => { setClienteNombre(c.nombre); setSugerenciasClientes([]); }}>
                      <Text style={s.optText}>{c.nombre}</Text>
                      <Ionicons name="add-circle-outline" size={26} color="#666" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <View style={s.fiadoRow}>
                <View><Text style={s.fiadoLabel}>¿Es crédito?</Text><Text style={s.fiadoSub}>El cliente paga después</Text></View>
                <Switch value={esFiado} onValueChange={setEsFiado} trackColor={{ true: '#52b788' }} thumbColor={esFiado ? '#2d6a4f' : '#ccc'} />
              </View>

              <Text style={s.label}>Método de Pago</Text>
              <View style={s.toggleContainer}>
                <TouchableOpacity
                  style={[s.toggleBtn, metodoPago === 'efectivo' ? s.toggleActive : s.toggleInactive]}
                  onPress={() => setMetodoPago('efectivo')}
                >
                  <Text style={[s.toggleText, metodoPago === 'efectivo' ? s.toggleTextActive : s.toggleTextInactive]}>
                    💵 Efectivo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.toggleBtn, metodoPago === 'transferencia' ? s.toggleActive : s.toggleInactive]}
                  onPress={() => setMetodoPago('transferencia')}
                >
                  <Text style={[s.toggleText, metodoPago === 'transferencia' ? s.toggleTextActive : s.toggleTextInactive]}>
                    🏦 Transferencia
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={[s.btn, cargando && { opacity: 0.6 }]} onPress={iniciarRegistroVenta} disabled={cargando}>
                <Text style={s.btnText}>{cargando ? 'Registrando...' : 'Registrar Venta'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Modal Detalle Venta */}
      <Modal visible={modalDetalleVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={[s.modal, { maxHeight: '90%' }]}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Detalle de Venta</Text>
              <TouchableOpacity onPress={() => setModalDetalleVisible(false)}><Ionicons name="close" size={32} color="#666" /></TouchableOpacity>
            </View>

            {ventaSel && (
              <ScrollView>
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 16, color: '#666' }}>{formatearFecha(ventaSel.fecha)}</Text>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1b4332', marginTop: 4 }}>
                    {ventaSel.cliente_nombre}
                  </Text>
                  {ventaSel.es_fiado && <Text style={[s.fiadoBadge, { alignSelf: 'flex-start', fontSize: 14, paddingHorizontal: 10, paddingVertical: 4 }]}>CRÉDITO</Text>}
                </View>

                {ventaSel.items.map((it) => (
                  <View key={it.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>{it.productos?.nombre} — {it.productos?.tipo || 'General'}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={{ fontSize: 16, color: '#666' }}>{it.cantidad} cajas</Text>
                      <Text style={{ fontSize: 16, color: '#444' }}>{formatPesos(it.precio_unitario)} / caja</Text>
                    </View>
                    <Text style={{ fontSize: 16, color: '#1b4332', fontWeight: 'bold', textAlign: 'right', marginTop: 4 }}>
                      Subtotal: {formatPesos(it.total)}
                    </Text>
                  </View>
                ))}

                <View style={{ marginTop: 24, borderTopWidth: 2, borderTopColor: '#e0e0e0', paddingTop: 16 }}>
                  <Text style={{ fontSize: 26, fontWeight: 'bold', color: '#1b4332', textAlign: 'right' }}>
                    Total: {formatPesos(ventaSel.total)}
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2d6a4f', textAlign: 'right', marginTop: 4 }}>
                    Ganancia: {ocultarSensible(formatPesos(ventaSel.ganancia))}
                  </Text>
                </View>

                <TouchableOpacity style={[s.btn, { backgroundColor: '#6c757d', marginTop: 30 }]} onPress={() => setModalDetalleVisible(false)}>
                  <Text style={s.btnText}>Cerrar</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' }, lista: { padding: 20, paddingBottom: 80 },
  headerText: { fontSize: 18, fontWeight: '600', color: '#6c757d', marginBottom: 12 },
  ventaCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 14, flexDirection: 'row', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  ventaFecha: { fontSize: 16, color: '#6c757d', marginBottom: 6 },
  ventaCliente: { fontSize: 20, fontWeight: 'bold', color: '#1b4332' },
  ventaDetalle: { fontSize: 16, color: '#555', marginTop: 4 },
  ventaTotalCard: { fontSize: 26, fontWeight: 'bold', color: '#1b4332' },
  fiadoBadge: { fontSize: 13, color: '#fff', backgroundColor: '#ff8f00', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 6, overflow: 'hidden', fontWeight: 'bold' },
  empty: { alignItems: 'center', marginTop: 100 }, emptyText: { fontSize: 22, color: '#999', marginTop: 16 }, emptySub: { fontSize: 16, color: '#bbb', marginTop: 6 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 70, height: 70, borderRadius: 35, backgroundColor: '#2d6a4f', justifyContent: 'center', alignItems: 'center', elevation: 6 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 26, fontWeight: 'bold', color: '#1b4332' },
  label: { fontSize: 16, fontWeight: '600', color: '#1b4332', marginBottom: 8, marginTop: 16 },
  labelField: { fontSize: 16, fontWeight: '500', color: '#444', marginTop: 12, marginBottom: 4 },
  selector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12, height: 58, paddingHorizontal: 18, backgroundColor: '#fafafa' },
  selText: { fontSize: 18, color: '#333' }, selPlaceholder: { fontSize: 18, color: '#aaa' },
  opt: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#e8e8e8', marginBottom: 6, backgroundColor: '#fafafa' },
  optSel: { borderColor: '#2d6a4f', backgroundColor: '#e8f5e9' },
  optText: { fontSize: 18, color: '#333' }, optPrice: { fontSize: 14, color: '#2d6a4f', marginTop: 2 },
  input: { borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12, height: 58, paddingHorizontal: 18, fontSize: 18, color: '#333', backgroundColor: '#fafafa' },
  itemBox: { backgroundColor: '#f8f9fa', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e8e8e8' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  itemNum: { fontSize: 16, fontWeight: '600', color: '#2d6a4f' },
  itemSubtotal: { fontSize: 16, color: '#2d6a4f', fontWeight: 'bold', marginTop: 10 },
  warnBelow: { fontSize: 14, color: '#e6a800', fontWeight: 'bold', marginTop: 6 },
  warnAbove: { fontSize: 14, color: '#0077b6', fontWeight: 'bold', marginTop: 6 },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', paddingVertical: 14, borderWidth: 1.5, borderColor: '#2d6a4f', borderRadius: 12, borderStyle: 'dashed', marginBottom: 12 },
  addItemText: { fontSize: 18, color: '#2d6a4f', fontWeight: '600' },
  calcBox: { backgroundColor: '#e8f5e9', borderRadius: 12, padding: 16, marginTop: 10, gap: 6 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between' },
  calcLabel: { fontSize: 16, color: '#2d6a4f', flex: 1 }, calcVal: { fontSize: 16, color: '#1b4332', fontWeight: '500' },
  calcTotalLabel: { fontSize: 20, color: '#1b4332', fontWeight: 'bold' }, calcTotal: { fontSize: 24, fontWeight: 'bold', color: '#1b4332' },
  calcGanancia: { fontSize: 18, fontWeight: 'bold', color: '#52b788' },
  fiadoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, backgroundColor: '#fff8e1', padding: 16, borderRadius: 12 },
  fiadoLabel: { fontSize: 18, fontWeight: '600', color: '#1b4332' }, fiadoSub: { fontSize: 14, color: '#999', marginTop: 2 },
  btn: { backgroundColor: '#2d6a4f', height: 58, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  btnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  toggleContainer: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  toggleBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  toggleActive: { backgroundColor: '#2d6a4f', borderColor: '#2d6a4f' },
  toggleInactive: { backgroundColor: '#f0f0f0', borderColor: '#dcdcdc' },
  toggleText: { fontSize: 18, fontWeight: 'bold' },
  toggleTextActive: { color: '#ffffff' },
  toggleTextInactive: { color: '#333333' }
});
