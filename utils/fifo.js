/**
 * Sistema FIFO (First In, First Out) para lotes de inventario.
 * Las cajas más antiguas se venden primero.
 */

/**
 * Calcula la ganancia de una venta usando FIFO.
 * Recorre los lotes del más antiguo al más reciente,
 * tomando cajas de cada lote hasta completar la cantidad vendida.
 *
 * @returns {{ ganancia: number, detalles: Array, precioCompraPromedio: number }}
 */
export const calcularGananciaFIFO = async (
  supabase,
  producto_id,
  cantidad_vendida,
  precio_venta
) => {
  const { data: lotes } = await supabase
    .from('inventario')
    .select('id, cantidad, precio_compra, fecha_entrada')
    .eq('producto_id', producto_id)
    .gt('cantidad', 0)
    .order('fecha_entrada', { ascending: true })

  if (!lotes || lotes.length === 0) {
    return { ganancia: 0, detalles: [], precioCompraPromedio: 0 }
  }

  let cantidadRestante = cantidad_vendida
  let gananciaTotal = 0
  let costoTotal = 0
  const detalles = []

  for (const lote of lotes) {
    if (cantidadRestante <= 0) break

    const cajasDelLote = Math.min(Number(lote.cantidad), cantidadRestante)
    const precioCompraLote = Number(lote.precio_compra) || 0
    const gananciaLote = (precio_venta - precioCompraLote) * cajasDelLote

    gananciaTotal += gananciaLote
    costoTotal += precioCompraLote * cajasDelLote
    cantidadRestante -= cajasDelLote

    detalles.push({
      lote_id: lote.id,
      cajas: cajasDelLote,
      precio_compra: precioCompraLote,
      ganancia: gananciaLote
    })
  }

  const precioCompraPromedio = cantidad_vendida > 0
    ? costoTotal / cantidad_vendida
    : 0

  return { ganancia: gananciaTotal, detalles, precioCompraPromedio }
}

/**
 * Descuenta inventario usando FIFO.
 * Resta cajas empezando por el lote más antiguo.
 */
export const descontarInventarioFIFO = async (
  supabase,
  producto_id,
  cantidad_vendida
) => {
  const { data: lotes } = await supabase
    .from('inventario')
    .select('id, cantidad, fecha_entrada')
    .eq('producto_id', producto_id)
    .gt('cantidad', 0)
    .order('fecha_entrada', { ascending: true })

  if (!lotes) return

  let cantidadRestante = cantidad_vendida

  for (const lote of lotes) {
    if (cantidadRestante <= 0) break

    const cajasDescontar = Math.min(Number(lote.cantidad), cantidadRestante)
    const nuevaCantidad = Number(lote.cantidad) - cajasDescontar

    await supabase
      .from('inventario')
      .update({
        cantidad: nuevaCantidad,
        actualizado_en: new Date().toISOString()
      })
      .eq('id', lote.id)

    cantidadRestante -= cajasDescontar
  }
}

/**
 * Obtiene el stock total de un producto sumando todos sus lotes.
 */
export const obtenerStockTotal = async (supabase, producto_id) => {
  const { data: lotes } = await supabase
    .from('inventario')
    .select('cantidad')
    .eq('producto_id', producto_id)
    .gt('cantidad', 0)

  if (!lotes || lotes.length === 0) return 0
  return lotes.reduce((sum, l) => sum + Number(l.cantidad), 0)
}

/**
 * Obtiene el precio de compra promedio ponderado FIFO
 * de los lotes disponibles de un producto.
 */
export const obtenerPrecioCompraPromedioFIFO = async (supabase, producto_id) => {
  const { data: lotes } = await supabase
    .from('inventario')
    .select('cantidad, precio_compra')
    .eq('producto_id', producto_id)
    .gt('cantidad', 0)

  if (!lotes || lotes.length === 0) return 0

  let totalCosto = 0
  let totalCajas = 0

  for (const lote of lotes) {
    const cant = Number(lote.cantidad)
    const precio = Number(lote.precio_compra) || 0
    totalCosto += cant * precio
    totalCajas += cant
  }

  return totalCajas > 0 ? totalCosto / totalCajas : 0
}
