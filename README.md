# 🍬 distrib-app

![Version](https://img.shields.io/badge/versión-1.0.0-green)
![Platform](https://img.shields.io/badge/plataforma-Android%20%7C%20iOS-blue)
![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react)
![Expo](https://img.shields.io/badge/Expo%20SDK-54-000020?logo=expo)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)

---

## 📋 Descripción

**distrib-app** es una aplicación móvil desarrollada para gestionar las operaciones diarias de una distribuidora de panela en Colombia 🇨🇴.

Reemplaza el sistema manual de cuadernos, facturas en papel y cálculos a mano por una solución digital completa que se opera directamente desde el celular. Permite registrar ventas, controlar inventario, gestionar clientes con crédito, generar reportes y cerrar caja — todo desde una interfaz pensada para ser rápida, clara y fácil de usar en el día a día.

---

## ✨ Características principales

### 🔐 Seguridad
- **Autenticación por PIN de 4 dígitos** — Acceso rápido y seguro sin necesidad de correo ni contraseña
- **Modo discreto** — Oculta ganancias y precios de compra con un toque al ícono del ojo, ideal cuando hay clientes presentes
- **Almacenamiento encriptado** — Credenciales de sesión protegidas con `expo-secure-store`

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
- Soporte para ventas a **crédito (fiado)**
- Historial completo de ventas agrupadas por transacción
- Modal de detalle con desglose de productos, cantidades, subtotales y ganancia

### 👥 Clientes
- Directorio de clientes con nombre y teléfono
- **Sistema de crédito (fiado)** con saldo pendiente visible
- Registro de abonos con nota opcional
- **Historial completo de pagos** con saldo antes y después de cada abono
- Historial de compras por cliente
- Indicador visual cuando el cliente salda su deuda completamente

### 📊 Dashboard
- Resumen del día: ganancia, total vendido, cajas vendidas
- Desglose de ventas por método de pago (efectivo vs. transferencia)
- Alertas de productos con stock bajo
- Listado de clientes con crédito pendiente ordenados por monto
- **Cierre de caja manual** con registro de hora exacta
- Cambio de PIN desde configuración
- Cierre de sesión

### 📈 Reportes
- **Reporte diario** — Cajas vendidas, total vendido, ganancia, desglose por método de pago
- **Reporte semanal** — Últimos 7 días con totales acumulados
- **Reporte mensual** — Todos los días del mes actual con resumen del período
- Indicador de estado de caja por día (cerrada, abierta, o no cerrada)

### 🌎 Localización
- Zona horaria de Colombia (UTC-5) aplicada en todas las fechas y reportes
- Formato automático de moneda en **pesos colombianos** ($ 50.000)
- Todos los textos, alertas y mensajes en **español**
- Tipografía grande optimizada para facilidad de lectura

### ☁️ Sincronización
- Base de datos en la nube con **Supabase (PostgreSQL)**
- Los datos se sincronizan automáticamente entre dispositivos
- Pull-to-refresh en todas las pantallas

---

## 🛠 Tecnologías utilizadas

| Tecnología | Versión | Uso |
|---|---|---|
| [React Native](https://reactnative.dev/) | 0.81.5 | Framework de desarrollo móvil |
| [Expo](https://expo.dev/) | SDK 54 | Plataforma de desarrollo y builds |
| [Expo Router](https://docs.expo.dev/router/) | 6.x | Navegación basada en archivos |
| [Supabase](https://supabase.com/) | 2.100+ | PostgreSQL + API REST en la nube |
| [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/) | 15.x | Persistencia encriptada (PIN, sesión, modo discreto) |
| [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/) | 15.x | Feedback táctil |
| [@expo/vector-icons](https://icons.expo.fyi/) | 15.x | Iconografía (Ionicons) |
| [React Navigation](https://reactnavigation.org/) | 7.x | Navegación con tabs |

---

## 📁 Arquitectura del proyecto

```
distrib-app/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.js        # Navegación con tabs + botón modo discreto
│   │   ├── index.js           # Dashboard principal
│   │   ├── ventas.js          # Módulo de ventas
│   │   ├── inventario.js      # Control de inventario
│   │   ├── productos.js       # Gestión de productos
│   │   ├── clientes.js        # Gestión de clientes y créditos
│   │   └── reportes.js        # Reportes históricos
│   ├── _layout.js             # Layout raíz con autenticación y provider
│   ├── pin.js                 # Pantalla de autenticación por PIN
│   └── utils/                 # (reservado)
├── hooks/
│   └── useModoDiscreto.js     # Hook + Context del modo discreto
├── utils/
│   ├── formatters.js          # Formato de moneda ($ pesos colombianos)
│   └── fecha.js               # Utilidades de fecha con zona Colombia
├── supabase.js                # Cliente de Supabase
├── app.json                   # Configuración de Expo
├── eas.json                   # Configuración de builds (EAS)
├── .env                       # Variables de entorno (no versionado)
└── package.json               # Dependencias del proyecto
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

> ⚠️ El archivo `.env` está incluido en `.gitignore` para proteger tus credenciales.

### 4. Configurar la base de datos

Ejecuta los siguientes scripts SQL en el **SQL Editor** de tu proyecto en Supabase, en este orden:

```sql
-- 1. Tabla de productos
CREATE TABLE productos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT,
  precio_compra NUMERIC NOT NULL DEFAULT 0,
  precio_venta NUMERIC NOT NULL DEFAULT 0,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Tabla de inventario
CREATE TABLE inventario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_id UUID REFERENCES productos(id),
  cantidad NUMERIC NOT NULL DEFAULT 0,
  unidad TEXT DEFAULT 'cajas',
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Tabla de clientes
CREATE TABLE clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT,
  saldo_fiado NUMERIC NOT NULL DEFAULT 0
);

-- 4. Tabla de ventas
CREATE TABLE ventas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venta_grupo UUID,
  producto_id UUID REFERENCES productos(id),
  cliente_id UUID REFERENCES clientes(id),
  cantidad INTEGER NOT NULL,
  precio_unitario NUMERIC NOT NULL,
  precio_compra_unitario NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL,
  ganancia NUMERIC NOT NULL DEFAULT 0,
  es_fiado BOOLEAN DEFAULT false,
  metodo_pago TEXT DEFAULT 'efectivo',
  fecha TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Tabla de pagos a crédito
CREATE TABLE pagos_fiado (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id),
  monto_abono NUMERIC NOT NULL,
  saldo_antes NUMERIC NOT NULL,
  saldo_despues NUMERIC NOT NULL,
  nota TEXT,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Tabla de resumen diario
CREATE TABLE resumen_diario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL UNIQUE,
  total_cajas NUMERIC DEFAULT 0,
  total_ventas NUMERIC DEFAULT 0,
  total_ganancia NUMERIC DEFAULT 0,
  total_efectivo NUMERIC DEFAULT 0,
  total_transferencia NUMERIC DEFAULT 0,
  cantidad_ventas INTEGER DEFAULT 0,
  caja_cerrada BOOLEAN DEFAULT false,
  hora_cierre TIMESTAMP WITH TIME ZONE
);

-- 7. Tabla de configuración (PIN)
CREATE TABLE configuracion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clave TEXT NOT NULL DEFAULT '1234'
);

-- 8. Insertar PIN inicial
INSERT INTO configuracion (clave) VALUES ('1234');
```

### 5. Iniciar en modo desarrollo

```bash
npx expo start
```

Escanea el QR con **Expo Go** en tu celular o ejecuta en un emulador.

---

## 📱 Compilación para producción

### Android (APK / AAB)

```bash
# APK para instalar directamente
eas build -p android --profile preview

# AAB para Google Play Store
eas build -p android --profile production
```

### iOS

```bash
# Requiere cuenta Apple Developer ($99/año)
eas build -p ios --profile preview
```

---

## 📖 Uso de la app

### Primer inicio

1. Al abrir la app se muestra la pantalla de PIN
2. **PIN inicial:** `1234`
3. Puedes cambiar el PIN desde el botón **"Cambiar PIN"** en el dashboard

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

## 🔒 Seguridad

| Aspecto | Implementación |
|---|---|
| Acceso a la app | PIN de 4 dígitos numéricos |
| Almacenamiento de sesión | `expo-secure-store` (encriptación nativa del OS) |
| Credenciales de Supabase | Variables de entorno (`.env` excluido del repo) |
| Modo discreto | Estado encriptado en `SecureStore` |
| Base de datos | Row Level Security disponible en Supabase |

---

## 🗺 Roadmap

Funcionalidades planeadas para versiones futuras:

- [ ] 🍎 Publicación en App Store para iPhone
- [ ] 🔔 Notificaciones push para alertas de stock bajo
- [ ] 📄 Exportar reportes a PDF
- [ ] 📲 Enviar resumen diario por WhatsApp
- [ ] 💾 Copias de seguridad automáticas
- [ ] 🏪 Soporte para múltiples sucursales
- [ ] 📊 Gráficos de tendencias de ventas
- [ ] 🧾 Generación de facturas digitales

---

## 👨‍💻 Autor

Desarrollado por **Santiago Romero**

- GitHub: [@santiromedev7](https://github.com/santiromedev7)
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
