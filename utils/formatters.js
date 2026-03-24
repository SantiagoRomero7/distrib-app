export const formatInputPesos = (texto) => {
  const soloNumeros = texto.replace(/\D/g, '')
  if (!soloNumeros) return ''
  return Number(soloNumeros).toLocaleString('es-CO')
}

export const parsePesos = (texto) => {
  if (!texto) return 0
  return Number(texto.toString().replace(/\./g, '').replace(/,/g, ''))
}

export const formatPesos = (valor) => {
  if (!valor && valor !== 0) return '$ 0'
  return '$ ' + Number(valor).toLocaleString('es-CO')
}
