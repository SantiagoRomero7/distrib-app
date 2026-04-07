# 🍬 distrib-app

![Version](https://img.shields.io/badge/versión-1.0.0-green)
![Platform](https://img.shields.io/badge/plataforma-Android%20%7C%20iOS%20%7C%20Web-blue)
![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react)
![Expo](https://img.shields.io/badge/Expo%20SDK-54-000020?logo=expo)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)

---

## 📋 Descripción

**distrib-app** es una aplicación multiplataforma (móvil y web) desarrollada para gestionar las operaciones diarias de una distribuidora de panela en Colombia 🇨🇴.

Reemplaza el sistema manual de cuadernos, facturas en papel y cálculos a mano por una solución digital completa que se opera directamente desde el celular o navegador. Permite registrar ventas, controlar inventario, gestionar clientes con crédito, generar reportes y cerrar caja — todo desde una interfaz pensada para ser rápida, clara y fácil de usar en el día a día.

---

## ✨ Características principales

### 🔐 Seguridad actualizada
- **PIN requerido siempre** al abrir la app y al volver del background (`AppState`)
- **Sesión no persistente** por diseño (mayor seguridad)
- **Modo discreto con botón de ojo en el header**: oculta ganancias y precios de compra con un toque, el precio de venta siempre visible
- **Almacenamiento encriptado** — Credenciales de sesión protegidas

### 📦 Productos e Inventario
- Gestión completa de productos con múltiples tipos de panela (bloque, molida, orgánica, etc.)
- Registro de precio de compra y precio de venta por producto
- Vista de ganancia por unidad calculada automáticamente
- Control de inventario en cajas con registro de entradas de mercancía
- **Alertas de stock bajo** (< 10 cajas) visibles en el dashboard

### 🛒 Ventas
- Registro de ventas con **múltiples productos por transacción**
- **Precios flexibles por cliente** — Se puede vender por debajo o por encima del precio estándar con indicadores visuales
- Verificación automática de stock antes de registrar la venta
- Alertas de ganancia negativa si se vende por debajo del precio de compra
- Método de pago: **efectivo** o **transferencia**
- Soporte para ventas a crédito
- Historial completo de ventas agrupadas por transacción
- Modal de detalle con desglose de productos, cantidades, subtotales y ganancia

### 👥 Clientes
- Directorio de clientes con nombre y teléfono
- **Sistema de crédito para clientes** (antes llamado fiado)
- **Historial completo de abonos** con fecha, saldo antes y saldo después
- **Detección automática** de deuda saldada
- Historial de compras por cliente

### 📊 Dashboard
- Resumen del día: ganancia, total vendido, cajas vendidas
- Desglose de ventas por método de pago (efectivo vs. transferencia)
- Alertas de productos con stock bajo
- Listado de clientes con crédito pendiente ordenados por monto
- **Cierre de caja manual** con resumen del día y hora de cierre

### 📈 Reportes históricos
- Vistas **diaria, semanal y mensual**
- **Indicador de caja abierta o cerrada** en reportes

### 🌎 Localización y Compatibilidad
- Zona horaria de Colombia (UTC-5) aplicada en todas las fechas y reportes
- **Formato automático de moneda colombiana** mientras se escribe ($ 50.000)
- Todos los textos, alertas y mensajes en **español**
- Tipografía grande optimizada para facilidad de lectura
- **Compatibilidad completa con web (PWA) y móvil**

### ☁️ Sincronización
- Base de datos en la nube con **Supabase (PostgreSQL)**
- Los datos se sincronizan automáticamente entre dispositivos
- Pull-to-refresh en todas las pantallas

---

## 🛠 Tecnologías utilizadas

| Tecnología | Versión | Uso |
|---|---|---|
| [React Native](https://reactnative.dev/) | 0.81.5 | Framework de desarrollo |
| [Expo](https://expo.dev/) | SDK 54 | Plataforma de desarrollo y builds |
| [Expo Router](https://docs.expo.dev/router/) | 6.x | Navegación basada en archivos |
| [Supabase](https://supabase.com/) | 2.100+ | PostgreSQL + API REST en la nube |
| [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/) | 15.x | Persistencia encriptada |
| [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/) | 15.x | Feedback táctil |
| [@expo/vector-icons](https://icons.expo.fyi/) | 15.x | Iconografía (Ionicons) |
| [React Navigation](https://reactnavigation.org/) | 7.x | Navegación con tabs |

---

## 📁 Estructura de archivos actualizada

```
distrib-app/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.js
│   │   ├── index.js        # Dashboard + cierre de caja
│   │   ├── ventas.js       # Ventas multi-producto
│   │   ├── inventario.js   
│   │   ├── productos.js    
│   │   ├── clientes.js     # Créditos + historial abonos
│   │   └── reportes.js     # Diario, semanal, mensual
│   ├── _layout.js          # Auth + AppState listener
│   └── pin.js              # PIN siempre requerido
├── hooks/
│   └── useModoDiscreto.js  
├── utils/
│   ├── formatters.js       
│   ├── fecha.js            
│   └── alertHelper.js      # Compatibilidad web/móvil
├── supabase.js             
├── .env                    
└── eas.json                
```

---

## 🗄 Base de datos

Todas las tablas se alojan en **Supabase (PostgreSQL)**. A continuación se documenta el esquema completo:

### `productos`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Clave primaria |
| `nombre` | TEXT | Nombre del producto (ej: "Panela en bloque") |
| `tipo` | TEXT | Tipo de panela (ej: "Bloque", "Molida", "Orgánica") |
| `precio_compra` | NUMERIC | Precio de compra por caja |
| `precio_venta` | NUMERIC | Precio de venta estándar por caja |
| `creado_en` | TIMESTAMP | Fecha de creación del registro |

### `inventario`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Clave primaria |
| `producto_id` | UUID | FK → `productos.id` |
| `cantidad` | NUMERIC | Cantidad actual en stock |
| `unidad` | TEXT | Unidad de medida (siempre "cajas") |
| `actualizado_en` | TIMESTAMP | Última actualización del stock |

### `clientes`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Clave primaria |
| `nombre` | TEXT | Nombre del cliente |
| `telefono` | TEXT | Número de teléfono (opcional) |
| `saldo_fiado` | NUMERIC | Saldo pendiente de crédito |

### `ventas`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Clave primaria |
| `venta_grupo` | UUID | Agrupa productos de una misma transacción |
| `producto_id` | UUID | FK → `productos.id` |
| `cliente_id` | UUID | FK → `clientes.id` (nullable) |
| `cantidad` | INTEGER | Cantidad de cajas vendidas |
| `precio_unitario` | NUMERIC | Precio aplicado por caja en esta venta |
| `precio_compra_unitario` | NUMERIC | Precio de compra al momento de la venta |
| `total` | NUMERIC | Subtotal de esta línea (cantidad × precio) |
| `ganancia` | NUMERIC | Ganancia de esta línea |
| `es_fiado` | BOOLEAN | Si la venta fue a crédito |
| `metodo_pago` | TEXT | "efectivo" o "transferencia" |
| `fecha` | TIMESTAMP | Fecha y hora de la venta (UTC) |

### `pagos_fiado`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Clave primaria |
| `cliente_id` | UUID | FK → `clientes.id` |
| `monto_abono` | NUMERIC | Monto del abono realizado |
| `saldo_antes` | NUMERIC | Saldo del cliente antes del abono |
| `saldo_despues` | NUMERIC | Saldo del cliente después del abono |
| `nota` | TEXT | Nota opcional del pago |
| `fecha` | TIMESTAMP | Fecha y hora del abono |

### `resumen_diario`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Clave primaria |
| `fecha` | DATE | Fecha del resumen (YYYY-MM-DD, zona Colombia) |
| `total_cajas` | NUMERIC | Total de cajas vendidas en el día |
| `total_ventas` | NUMERIC | Total vendido en pesos |
| `total_ganancia` | NUMERIC | Ganancia total del día |
| `total_efectivo` | NUMERIC | Total cobrado en efectivo |
| `total_transferencia` | NUMERIC | Total cobrado por transferencia |
| `cantidad_ventas` | INTEGER | Número de transacciones del día |
| `caja_cerrada` | BOOLEAN | Si la caja fue cerrada manualmente |
| `hora_cierre` | TIMESTAMP | Hora exacta del cierre de caja |

### `configuracion`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Clave primaria |
| `clave` | TEXT | PIN de acceso a la app (4 dígitos) |

---

## 🚀 Instalación y configuración

### Prerrequisitos

- [Node.js](https://nodejs.org/) v20 o superior
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [EAS CLI](https://docs.expo.dev/build/introduction/) (`npm install -g eas-cli`)
- Cuenta en [Supabase](https://supabase.com/)
- Cuenta en [Expo](https://expo.dev/)

### 1. Clonar el repositorio

```bash
git clone https://github.com/santiromedev7/distrib-app.git
cd distrib-app
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=tu_anon_key_de_supabase
```

### 4. Configurar la base de datos

Ejecuta los siguientes scripts SQL en el **SQL Editor** de tu proyecto en Supabase, en este orden:

*(Mismos scripts SQL referenciados previamente: Tablas de productos, inventario, clientes, ventas, pagos_fiado, resumen_diario, y configuracion)*

### 5. Iniciar en modo desarrollo

```bash
npx expo start
```

Escanea el QR con **Expo Go** en tu celular o ejecuta en un emulador.

---

## 🚀 Despliegue

### PWA para iPhone (gratis)

1. Exportar para web:
   ```bash
   npx expo export -p web
   ```
2. Subir a GitHub:
   ```bash
   git push origin main
   ```
3. Vercel despliega automáticamente
4. En iPhone abrir Safari y entrar a la URL
5. Tocar compartir → "Agregar a pantalla de inicio"
6. Listo, funciona como app nativa sin App Store

**URL de producción:** https://distrib-app.vercel.app

### Android (APK)

```bash
eas build -p android --profile preview
```
Descargar e instalar el APK desde el enlace de Expo.

---

## 🔄 Compatibilidad web vs móvil

Se han implementado las siguientes soluciones para garantizar una compatibilidad completa entre entornos web y nativo:

- `expo-secure-store` reemplazado por un *storage helper* que usa `localStorage` en web y `SecureStore` en móvil.
- `Alert.alert()` reemplazado por `mostrarAlerta()` helper que usa `window.confirm`/`window.alert` en web y `Alert` en móvil.
- `expo-haptics` envuelto en verificación de plataforma para evitar errores en web.

---

## 📖 Uso de la app

### Primer inicio

1. Al abrir la app se muestra la pantalla de PIN
2. Puedes cambiar el PIN desde el botón **"Cambiar PIN"** en el dashboard

### Flujo de trabajo diario

```
1. 🔑 Abrir la app e ingresar el PIN
2. 📦 Registrar entradas de mercancía en Inventario (si llegó producto)
3. 🛒 Registrar ventas durante el día
4. 📊 Revisar el dashboard para ver totales en tiempo real
5. 🔒 Al terminar el día, cerrar caja desde el dashboard
6. 📈 Consultar reportes históricos cuando se necesite
```

### Modo discreto

Toca el ícono del **ojo 👁** en la barra superior de cualquier pestaña:

| Estado | Qué se oculta | Qué se muestra siempre |
|---|---|---|
| **Activado** (ojo tachado) | Ganancias y precios de compra | Totales, precios de venta, subtotales, cantidades, clientes, fechas |
| **Desactivado** (ojo normal) | Nada | Todo visible |

> 💡 **Tip:** Activa el modo discreto cuando estés mostrando la app a un cliente para que no vea cuánto ganas por la venta ni cuánto te costó la caja.

---

## 🔒 Seguridad actualizada

- **PIN requerido siempre** al abrir la app.
- **PIN requerido al volver del background** (`AppState`).
- **Sesión no persistente por diseño** (mayor seguridad y evitando estados obsoletos o expuestos).
- **Modo discreto** para ocultar información sensible frente a clientes.

---

## 🗺 Roadmap actualizado

**Completado ✅:**
- PWA desplegada en Vercel para iPhone
- APK compilado para Android
- Autenticación por PIN siempre activa
- Modo discreto para clientes
- Reportes históricos completos
- Cierre de caja manual
- Sistema de créditos con historial

**Pendiente 🔜:**
- Publicación en App Store (requiere $99/año Apple)
- Notificaciones push para stock bajo
- Exportar reportes a PDF
- Enviar resumen diario por WhatsApp
- Copias de seguridad automáticas
- Soporte para múltiples usuarios con roles
- Soporte para múltiples sucursales

---

## 👨‍💻 Autor

Desarrollado por **Santiago Romero**

- GitHub: [@SantiagoRomero7](https://github.com/SantiagoRomero7)
- Proyecto: Sistema de gestión para distribuidora de panela — Colombia 🇨🇴

---

## 📄 Licencia

Este proyecto está bajo la **Licencia MIT** — libre para usar, modificar y distribuir.

```
MIT License

Copyright (c) 2026 Santiago Romero

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
