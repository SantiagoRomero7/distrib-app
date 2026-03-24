import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../supabase';
import { formatPesos } from '../../utils/formatters';
import { fechaHoyColombia, formatearSoloFecha, formatearFecha } from '../../utils/fecha';

export default function Reportes() {
  const [tabSeleccionado, setTabSeleccionado] = useState('Hoy');
  const [datosHoy, setDatosHoy] = useState(null);
  const [datosSemana, setDatosSemana] = useState([]);
  const [datosMes, setDatosMes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const cargarDatos = async () => {
    try {
      // 1. Cargar Hoy
      const hoyIso = fechaHoyColombia();
      const { data: hoyD } = await supabase
        .from('resumen_diario')
        .select('*')
        .eq('fecha', hoyIso)
        .single();
      setDatosHoy(hoyD || null);

      // 2. Cargar Semana (últimos 7 registros)
      const { data: sem } = await supabase
        .from('resumen_diario')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(7);
      setDatosSemana(sem || []);

      // 3. Cargar Mes (filtro de este mes mediante JS debido a limitaciones en selectrices básicas, o limitando)
      // O hacer query >= primer día del mes
      const hoy = new Date();
      const inicioMesStr = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
      const { data: mes } = await supabase
        .from('resumen_diario')
        .select('*')
        .gte('fecha', inicioMesStr)
        .order('fecha', { ascending: false });
      setDatosMes(mes || []);

    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(useCallback(() => { cargarDatos(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDatos();
    setRefreshing(false);
  };

  const renderVistaHoy = () => {
    if (!datosHoy) {
      return (
        <View style={s.emptyContainer}>
          <Text style={s.emptyText}>No hay ventas registradas hoy todavía.</Text>
        </View>
      );
    }
    return (
      <View style={s.tabContent}>
        <View style={[s.card, { backgroundColor: '#2d6a4f' }]}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>📦 Cajas vendidas hoy</Text>
          </View>
          <Text style={s.bigNumber}>{Number(datosHoy.total_cajas)} cajas</Text>
          <Text style={s.cardSubtext}>{Number(datosHoy.cantidad_ventas)} ventas realizadas</Text>
        </View>

        <View style={[s.card, { backgroundColor: '#40916c' }]}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>💰 Total vendido hoy</Text>
          </View>
          <Text style={s.bigNumber}>{formatPesos(datosHoy.total_ventas)}</Text>
          <View style={s.detailRow}>
            <Text style={s.detailText}>💵 Efectivo:</Text>
            <Text style={s.detailText}>{formatPesos(datosHoy.total_efectivo)}</Text>
          </View>
          <View style={s.detailRow}>
            <Text style={s.detailText}>🏦 Transferencia:</Text>
            <Text style={s.detailText}>{formatPesos(datosHoy.total_transferencia)}</Text>
          </View>
        </View>

        <View style={[s.card, { backgroundColor: '#1b4332' }]}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>📈 Ganancia de hoy</Text>
          </View>
          <Text style={s.bigNumber}>{formatPesos(datosHoy.total_ganancia)}</Text>
        </View>
      </View>
    );
  };

  const renderVistaLista = (datos, emptyMsg) => {
    if (datos.length === 0) {
      return (
        <View style={s.emptyContainer}>
          <Text style={s.emptyText}>{emptyMsg}</Text>
        </View>
      );
    }

    const hoyStr = fechaHoyColombia();

    const totalCajas = datos.reduce((acc, d) => acc + Number(d.total_cajas), 0);
    const totalVendido = datos.reduce((acc, d) => acc + Number(d.total_ventas), 0);
    const totalGanancia = datos.reduce((acc, d) => acc + Number(d.total_ganancia), 0);
    const totalEf = datos.reduce((acc, d) => acc + Number(d.total_efectivo), 0);
    const totalTr = datos.reduce((acc, d) => acc + Number(d.total_transferencia), 0);
    const totalCnt = datos.reduce((acc, d) => acc + Number(d.cantidad_ventas), 0);

    return (
      <View style={s.tabContent}>
        {datos.map((d) => (
          <View key={d.id} style={s.listItem}>
            <Text style={s.listDate}>{formatearSoloFecha(d.fecha)}</Text>
            {d.caja_cerrada ? (
              <Text style={{ fontSize: 14, color: '#2d6a4f', marginBottom: 8, marginTop: -4 }}>🔒 Cerrada a las {formatearFecha(d.hora_cierre)}</Text>
            ) : d.fecha < hoyStr ? (
              <Text style={{ fontSize: 14, color: '#ff8f00', marginBottom: 8, marginTop: -4 }}>⚠ No se cerró caja este día</Text>
            ) : (
              <Text style={{ fontSize: 14, color: '#2d6a4f', marginBottom: 8, marginTop: -4 }}>🟢 Caja abierta</Text>
            )}
            <View style={s.listRow}>
              <Text style={s.listLabel}>📦 {Number(d.total_cajas)} cajas</Text>
              <Text style={s.listVal}>{formatPesos(d.total_ventas)}</Text>
            </View>
            <Text style={s.listGanancia}>📈 {formatPesos(d.total_ganancia)}</Text>
          </View>
        ))}

        <View style={s.totalsCard}>
          <Text style={s.totalsTitle}>Totales del Período</Text>
          <View style={s.totRow}>
            <Text style={s.totLabel}>📦 Total cajas:</Text>
            <Text style={s.totVal}>{totalCajas} cajas</Text>
          </View>
          <View style={s.totRow}>
            <Text style={s.totLabel}>💰 Total vendido:</Text>
            <Text style={s.totVal}>{formatPesos(totalVendido)}</Text>
          </View>
          <View style={s.totRow}>
            <Text style={s.totLabel}>📈 Ganancia:</Text>
            <Text style={[s.totVal, { color: '#2d6a4f' }]}>{formatPesos(totalGanancia)}</Text>
          </View>
          <View style={[s.totRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0' }]}>
            <Text style={s.totLabel}>💵 Efectivo:</Text>
            <Text style={s.totVal}>{formatPesos(totalEf)}</Text>
          </View>
          <View style={s.totRow}>
            <Text style={s.totLabel}>🏦 Transferencias:</Text>
            <Text style={s.totVal}>{formatPesos(totalTr)}</Text>
          </View>
          <View style={s.totRow}>
            <Text style={s.totLabel}>🧾 N° de ventas:</Text>
            <Text style={s.totVal}>{totalCnt}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      {/* Selector de Tabs */}
      <View style={s.tabBar}>
        {['Hoy', 'Semana', 'Mes'].map(t => (
          <TouchableOpacity
            key={t}
            style={[s.tabBtn, tabSeleccionado === t && s.tabBtnActive]}
            onPress={() => setTabSeleccionado(t)}
          >
            <Text style={[s.tabText, tabSeleccionado === t && s.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2d6a4f']} />}
      >
        {tabSeleccionado === 'Hoy' && renderVistaHoy()}
        {tabSeleccionado === 'Semana' && renderVistaLista(datosSemana, 'No hay ventas en la última semana.')}
        {tabSeleccionado === 'Mes' && renderVistaLista(datosMes, 'No hay ventas registradas este mes.')}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, padding: 8, gap: 8 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#2d6a4f' },
  tabText: { fontSize: 18, color: '#666', fontWeight: 'bold' },
  tabTextActive: { color: '#fff' },
  tabContent: { padding: 16, gap: 14 },
  card: { borderRadius: 16, padding: 24, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
  cardHeader: { marginBottom: 10 },
  cardTitle: { color: 'rgba(255,255,255,0.9)', fontSize: 20, fontWeight: '600' },
  bigNumber: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginBottom: 6 },
  cardSubtext: { color: 'rgba(255,255,255,0.8)', fontSize: 18 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  detailText: { color: '#fff', fontSize: 18, fontWeight: '500' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 18, color: '#666', textAlign: 'center' },
  listItem: { backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  listDate: { fontSize: 18, fontWeight: 'bold', color: '#1b4332', marginBottom: 8, textTransform: 'capitalize' },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  listLabel: { fontSize: 18, color: '#444' },
  listVal: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  listGanancia: { fontSize: 18, color: '#2d6a4f', fontWeight: 'bold', alignSelf: 'flex-end', marginTop: 4 },
  totalsCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, marginTop: 10, borderWidth: 1.5, borderColor: '#2d6a4f' },
  totalsTitle: { fontSize: 22, fontWeight: 'bold', color: '#1b4332', marginBottom: 16, textAlign: 'center' },
  totRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totLabel: { fontSize: 18, color: '#555' },
  totVal: { fontSize: 18, fontWeight: 'bold', color: '#111' },
});
