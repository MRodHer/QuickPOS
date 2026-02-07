---
id: SPEC-POS-001
version: "2.0.0"
status: "completed"
created: "2026-02-07"
updated: "2026-02-07"
author: "Developer"
priority: "HIGH"
title: "Sistema de Pedidos Online con Recogida Programada para Restaurante Fitness"
---

# HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 2.0.0 | 2026-02-07 | Developer | Fase 1 y Fase 2 completadas - Implementación terminada |
| 1.0.0 | 2026-02-07 | Developer | Creación inicial de SPEC para sistema de pedidos online |

---

# IMPLEMENTATION SUMMARY

## Fase 1 (MVP) - Customer Facing - COMPLETADO

**Fecha de finalización**: 2026-02-07

**Archivos creados**:
- `src/types/online-orders.ts` - Definiciones de tipos TypeScript
- `src/hooks/online-orders/useOnlineMenu.ts` - Hook para menú online
- `src/stores/onlineCartStore.ts` - Zustand store para carrito
- `src/components/online-orders/customer/` - 5 componentes de cliente

**Componentes implementados**:
- `ProductCard` - Tarjeta de producto con info nutricional
- `NutritionInfo` - Display de información nutricional
- `CartDrawer` - Panel lateral del carrito
- `CheckoutForm` - Formulario de checkout
- `PickupTimeSelector` - Selector de hora de recogida

**Base de datos**:
- Tabla `online_orders` con campos completos
- Tabla `online_order_status_history` para auditoría
- Índices para optimización de queries
- Triggers para updated_at y logging de cambios

**Tests**: 6 test files creados para componentes de cliente

---

## Fase 2 - Staff + Payments - COMPLETADO

**Fecha de finalización**: 2026-02-07

**Archivos creados**:
- `src/services/orders/StatusChangeHandler.ts` - Manejo de estados de pedidos
- `src/services/notifications/NotificationService.ts` - Notificaciones multi-canal
- `src/services/payments/StripeService.ts` - Integración con Stripe
- `src/hooks/online-orders/useOrdersRealtime.ts` - Suscripciones Supabase Realtime
- `src/stores/ordersRealtimeStore.ts` - Store para pedidos en tiempo real

**Componentes implementados**:
- `StaffDashboard` - Panel principal de staff
- `KanbanBoard` - Vista kanban de pedidos
- `OrderDetailModal` - Modal de detalle de pedido

**Features implementadas**:
- Validación de transiciones de estado
- Logging automático de cambios de estado
- Notificaciones por email, SMS y Telegram
- Checkout sessions de Stripe
- Webhooks de Stripe
- Reembolsos
- Suscripción en tiempo real a cambios de pedidos

**Tests**: 5 test files creados para servicios y componentes de staff

---

## Métricas de Implementación

| Categoría | Cantidad |
|-----------|----------|
| Archivos TypeScript/TSX | 22 |
| Archivos de test | 11 |
| Componentes React | 8 |
| Servicios | 3 |
| Hooks personalizados | 2 |
| Stores Zustand | 2 |
| Migraciones de base de datos | 1 |
| Tabs de base de datos | 2 |
| Índices de base de datos | 6 |

**Total de líneas de código**: ~3500 líneas (implementación + tests)

---

# 1. INTRODUCCIÓN

## 1.1 Propósito

Este documento especifica el sistema de pedidos online con recogida programada para un restaurante fitness/gourmet ubicado dentro de un gimnasio. El sistema permite a los clientes del gimnasio realizar pedidos de comida saludable sin necesidad de registro obligatorio, programando la hora exacta de recogida sincronizada con el fin de su entrenamiento.

## 1.2 Alcance

Este sistema EXTIENDE la funcionalidad existente de QuickPOS añadiendo:

- Interfaz de pedidos online para clientes (customer-facing)
- Sistema de recogida programada con hora exacta
- Registro opcional de clientes con beneficios
- Panel de staff para gestión de pedidos online
- Notificaciones multi-canal (SMS, email, Telegram)
- Información nutricional detallada en el menú

## 1.3 Contexto del Negocio

- **Ubicación**: Restaurante dentro de un gimnasio
- **Mercado objetivo**: Clientes A+, conscientes de la salud y bienestar
- **Tipo de comida**: Fitness gourmet - platos saludables premium
- **Problema a resolver**: Los clientes necesitan comida lista exactamente cuando terminan su entrenamiento
- **Diferenciador**: Experiencia premium sin fricción (registro opcional)

---

# 2. LENGUAJE UBU CUO (Ubiquitous Language)

| Término | Definición |
|---------|------------|
| **Pedido Online** | Orden realizada por el cliente a través de interfaz web, no en el POS físico |
| **Recogida Programada** | Hora específica en la que el cliente desea recoger su pedido |
| **Cliente Invitado** | Usuario que realiza un pedido sin tener cuenta registrada |
| **Cliente Registrado** | Usuario con cuenta que tiene acceso a beneficios adicionales |
| **Tiempo de Preparación** | Tiempo estimado que necesita el restaurante para preparar un pedido (default: 30 min) |
| **Hora Mínima** | Primera hora disponible para recogida (hora actual + tiempo de preparación) |
| **Panel de Staff** | Interfaz para empleados del restaurante para gestionar pedidos online |
| **Estado del Pedido** | Fase actual del pedido: Pendiente, En Preparación, Listo, Recogido, Cancelado |
| **Notificación de Listo** | Alerta enviada al cliente cuando su pedido está disponible para recogida |
| **Perfil Nutricional** | Información opcional del cliente sobre objetivos fitness y macros diarios |
| **Menú Fitness** | Catálogo de platos organizados por categorías: Pre-Entreno, Post-Entreno, Balanceado, Snacks, Bebidas |

---

# 3. HISTORIAS DE USUARIO (User Stories)

### US-001: Visualización del Menú
**Como** cliente del gimnasio,
**quiero ver** el menú con fotos de alta calidad e información nutricional completa,
**para** elegir mi comida según mis objetivos fitness y restricciones dietéticas.

**Prioridad**: ALTA | **Complexidad**: Media

---

### US-002: Pedido sin Registro
**Como** cliente ocasional del gimnasio,
**quiero hacer** un pedido sin necesidad de registrarme,
**para** obtener mi comida rápidamente sin fricción ni barreras de entrada.

**Prioridad**: ALTA | **Complexidad**: Baja

---

### US-003: Registro Opcional con Beneficios
**Como** cliente frecuente,
**quiero registrarme opcionalmente,
**para** guardar mis favoritos, ver historial de pedidos y tener un checkout más rápido.

**Prioridad**: MEDIA | **Complexidad**: Media

---

### US-004: Programación de Hora de Recogida
**Como** cliente,
**quiero seleccionar** la hora exacta en que mi pedido estará listo,
**para** coordinar la recogida con el fin de mi entrenamiento.

**Prioridad**: ALTA | **Complexidad**: Alta

---

### US-005: Notificación de Pedido Listo
**Como** cliente,
**quiero recibir** una notificación cuando mi pedido esté listo,
**para** no esperar innecesariamente en el restaurante.

**Prioridad**: ALTA | **Complexidad**: Media

---

### US-006: Panel de Staff en Tiempo Real
**Como** miembro del staff del restaurante,
**quiero ver** todos los pedidos online en tiempo real,
**para** coordinar la producción en cocina y gestionar la prioridad de pedidos.

**Prioridad**: ALTA | **Complexidad**: Alta

---

### US-007: Cambio de Estado del Pedido
**Como** miembro del staff,
**quiero marcar** los pedidos como "listos" con un solo clic,
**para** activar automáticamente las notificaciones a los clientes.

**Prioridad**: ALTA | **Complexidad**: Baja

---

### US-008: Gestión de Inventario Online
**Como** administrador del restaurante,
**quiero ver** reportes diarios de pedidos online y productos más vendidos,
**para** optimizar el inventario y la preparación.

**Prioridad**: MEDIA | **Complexidad**: Media

---

### US-009: Perfil Nutricional Personalizado
**Como** cliente registrado,
**quiero configurar** mis objetivos fitness y macros diarias,
**para** recibir recomendaciones personalizadas y ver el contenido nutricional de mis pedidos.

**Prioridad**: BAJA | **Complexidad**: Alta

---

### US-010: Pago Online Integrado
**Como** cliente,
**quiero pagar** online con tarjeta de crédito,
**para** no tener que llevar efectivo ni esperar al pagar en el restaurante.

**Prioridad**: MEDIA | **Complexidad**: Media

---

# 4. REQUISITOS FUNCIONALES (Functional Requirements)

## FR-001: Catálogo de Productos con Información Nutricional

**Patrón EARS**: Ubiquitous

El sistema **DEBE** mostrar un catálogo de productos con fotografías de alta calidad, información nutricional completa y organización por categorías fitness.

**Criterios de Aceptación:**
- [ ] Fotos profesionales de cada plato (mínimo 800x600px)
- [ ] Información nutricional visible: calorías, proteínas, carbohidratos, grasas, fibra
- [ ] Etiquetas de alérgenos prominentes (gluten, lactosa, nueces, etc.)
- [ ] Categorías fitness: Pre-Entreno, Post-Entreno, Balanceado, Snacks, Bebidas
- [ ] Filtros por preferencias dietéticas (vegano, vegetariano, keto, paleo)
- [ ] Integración con tabla `products` existente de QuickPOS

---

## FR-002: Carrito de Compras Persistente

**Patrón EARS**: State-Driven

**IF** el cliente agrega productos al carrito **THEN** el sistema **DEBE** mantener el carrito persistente durante la sesión.

**Criterios de Aceptación:**
- [ ] Carrito funcional sin autenticación (invitados)
- [ ] Persistencia vía localStorage para clientes no registrados
- [ ] Sincronización con backend para clientes registrados
- [ ] Visualización de subtotal en tiempo real
- [ ] Posibilidad de modificar cantidades y eliminar items
- [ ] Indicador visual de items en el carrito

---

## FR-003: Checkout como Invitado

**Patrón EARS**: Event-Driven

**WHEN** un cliente invitado completa el carrito y procede al checkout **THEN** el sistema **DEBE** solicitar únicamente la información mínima necesaria.

**Criterios de Aceptación:**
- [ ] Formulario de checkout con campos mínimos: nombre, email, teléfono
- [ ] Validación de email y teléfono en tiempo real
- [ ] Opción visible de crear cuenta durante el proceso
- [ ] Confirmación del pedido con número de orden generado
- [ ] Email de confirmación enviado al cliente

---

## FR-004: Registro Opcional de Cliente

**Patrón EARS**: Optional

**POSBILE**, el sistema **DEBERÍA** ofrecer registro con beneficios adicionales sin bloquear el flujo de compra.

**Criterios de Aceptación:**
- [ ] Registro simple: email + password + nombre
- [ ] Verificación de email vía enlace de confirmación
- [ ] Historial completo de pedidos anteriores
- [ ] Lista de favoritos para reorden rápido
- [ ] Métodos de pago guardados (Stripe Customer)
- [ ] Perfil nutricional opcional

---

## FR-005: Programación de Hora de Recogida

**Patrón EARS**: Event-Driven

**WHEN** el cliente completa su pedido **THEN** el sistema **DEBE** solicitar y validar la hora deseada de recogida.

**Criterios de Aceptación:**
- [ ] Selector de hora con intervalos de 15 minutos
- [ ] Hora mínima = hora actual + tiempo de preparación (default: 30 min)
- [ ] Hora máxima = hora de cierre del restaurante
- [ ] Confirmación visual: "Tu pedido estará listo a las [HH:MM]"
- [ ] Validación de capacidad por franja horaria
- [ ] Ajuste dinámico del tiempo de preparación según carga de cocina

---

## FR-006: Estados del Pedido

**Patrón EARS**: State-Driven

**IF** el pedido cambia de estado **THEN** el sistema **DEBE** actualizar tanto el panel del staff como la visibilidad del cliente.

**Criterios de Aceptación:**
- [ ] Estados: Pendiente → En Preparación → Listo → Recogido → Cancelado
- [ ] Transición de estados auditada con timestamp
- [ ] Notificación al cliente en cada cambio de estado
- [ ] Dashboard del staff actualiza en tiempo real (Supabase Realtime)
- [ ] Historial completo de cambios de estado por pedido

---

## FR-007: Panel de Staff para Pedidos Online

**Patrón EARS**: Ubiquitous

El sistema **DEBE** proporcionar un panel administrativo específico para gestionar pedidos online.

**Criterios de Aceptación:**
- [ ] Lista de pedidos pendientes con tiempo de espera
- [ ] Vista kanban de pedidos por estado (drag & drop)
- [ ] Acciones rápidas: aceptar, iniciar preparación, marcar listo
- [ ] Detalle completo del pedido (items, notas del cliente, alergenos)
- [ ] Información de contacto del cliente
- [ ] Filtros por estado, franja horaria, método de pago

---

## FR-008: Notificaciones Multi-canal

**Patrón EARS**: Event-Driven

**WHEN** un pedido cambia a estado "Listo" **THEN** el sistema **DEBE** enviar notificación según preferencia del cliente.

**Criterios de Aceptación:**
- [ ] Notificación por email con template HTML premium
- [ ] Opción de notificación SMS (integración Twilio)
- [ ] Opción de notificación vía Telegram Bot
- [ ] Contenido: "Tu pedido #[NUMERO] está listo para recoger en KaHome"
- [ ] Retry logic para fallos de envío
- [ ] Log de notificaciones enviadas

---

## FR-009: Pagos Online con Stripe

**Patrón EARS**: Event-Driven

**WHEN** el cliente selecciona pago online **THEN** el sistema **DEBE** integrar con Stripe para procesar el pago de forma segura.

**Criterios de Aceptación:**
- [ ] Stripe Checkout integrado
- [ ] Pago con tarjeta de crédito/débito
- [ ] Confirmación de pago antes de confirmar pedido
- [ ] Opción de pagar en recepción (efectivo/terminal)
- [ ] Reembolsos parciales y totales
- [ ] Webhook para eventos de Stripe
- [ ] Cumplimiento PCI (via Stripe)

---

## FR-010: Perfil Nutricional de Usuario

**Patrón EARS**: Optional

**IF** un cliente registrado configura su perfil nutricional **THEN** el sistema **DEBE** mostrar recomendaciones y alertas personalizadas.

**Criterios de Aceptación:**
- [ ] Campos: objetivo (perder peso, ganar músculo, mantenimiento)
- [ ] Configuración de macros diarios objetivo
- [ ] Cálculo automático de macros del pedido
- [ ] Alerta si el pedido excede calorías configuradas
- [ ] Recomendaciones de platos basadas en objetivo
- [ ] Filtros inteligentes según perfil

---

## FR-011: Multi-tenant Soporte

**Patrón EARS**: Ubiquitous

El sistema **DEBE** mantener el aislamiento de datos entre múltiples negocios siguiendo el patrón existente de QuickPOS.

**Criterios de Aceptación:**
- [ ] Todas las nuevas tablas incluyen `business_id`
- [ ] RLS policies para aislamiento de datos
- [ ] Contexto de negocio inyectado en todas las queries
- [ ] Visibilidad de pedidos solo dentro del mismo negocio

---

# 5. REQUISITOS NO FUNCIONALES (Non-Functional Requirements)

## NFR-001: Performance

**Patrón EARS**: Ubiquitous

El sistema **DEBE** responder a interacciones del usuario en menos de 2 segundos.

**Criterios de Aceptación:**
- [ ] Carga de menú < 1 segundo
- [ ] Agregar al carrito < 300ms
- [ ] Procesar pago < 3 segundos
- [ ] Actualización en tiempo real del panel staff < 500ms
- [ ] Time to First Byte (TTFB) < 200ms

---

## NFR-002: Disponibilidad

**Patrón EARS**: Ubiquitous

El sistema **DEBE** estar disponible durante horarios operativos del gimnasio (5am - 11pm).

**Criterios de Aceptación:**
- [ ] Uptime objetivo: 99.5%
- [ ] Página de mantenimiento programada visible fuera de horario
- [ ] Sistema de cola para picos de demanda
- [ ] Graceful degradation si Supabase está temporalmente no disponible

---

## NFR-003: Experiencia Premium (UX)

**Patrón EARS**: Ubiquitous

La interfaz **DEBE** reflejar calidad premium acorde al mercado A+ del gimnasio.

**Criterios de Aceptación:**
- [ ] Diseño mobile-first (70%+ de usuarios desde celular)
- [ ] Animaciones sutiles y profesionales
- [ ] Tipografía premium y fotografías de alta calidad
- [ ] Proceso de checkout en máximo 3 pasos
- [ ] Accesibilidad WCAG 2.1 AA
- [ ] Dark mode option

---

## NFR-004: Seguridad

**Patrón EARS**: Unwanted

El sistema **NO DEBE** almacenar datos de pago ni comprometer información del cliente.

**Criterios de Aceptación:**
- [ ] Pagos procesados vía Stripe (PCI compliance delegada)
- [ ] Passwords hasheados con bcrypt (via Supabase Auth)
- [ ] HTTPS obligatorio en producción
- [ ] RLS policies en Supabase para aislamiento de datos
- [ ] Rate limiting en endpoints públicos
- [ ] Sanitización de inputs para prevenir XSS

---

## NFR-005: Escalabilidad

**Patrón EARS**: Ubiquitous

El sistema **DEBE** soportar crecimiento a múltiples ubicaciones del restaurante.

**Criterios de Aceptación:**
- [ ] Arquitectura preparada para multi-location
- [ ] Separación de catálogo por ubicación
- [ ] Reportes consolidados y por ubicación
- [ ] Soporte para múltiples menús según negocio

---

## NFR-006: Compatibilidad con QuickPOS

**Patrón EARS**: Ubiquitous

El sistema **DEBE** integrarse sin conflictos con la funcionalidad existente de QuickPOS.

**Criterios de Aceptación:**
- [ ] Reutilización de componentes existentes (POSPage, CartPanel, etc.)
- [ ] Compartir tabla `products` con inventario existente
- [ ] Compartir tabla `customers` para clientes registrados
- [ ] No romper funcionalidad POS físico
- [ ] Estado coherente entre pedidos POS y online

---

# 6. RESTRICCIONES TÉCNICAS (Technical Constraints)

## TC-001: Stack Tecnológico

El desarrollo **DEBE** utilizar el stack existente de QuickPOS:

| Componente | Versión | Propósito |
|------------|---------|-----------|
| React | 18.3.1 | Frontend framework |
| TypeScript | 5.5.3 | Type safety |
| Vite | 5.4.2 | Build tool |
| Supabase | Latest | Backend + Database |
| Tailwind CSS | 3.4.1 | Styling |
| Zustand | Latest | State management |
| React Router | 7.13.0 | Routing |

## TC-002: Base de Datos

- **MOTOR**: PostgreSQL via Supabase
- **MULTI-TENANT**: Todas las tablas deben incluir `business_id`
- **RLS**: Row Level Security obligatorio para todas las tablas
- **MIGRATIONS**: Usar sistema de migraciones de Supabase

## TC-003: Autenticación

- **PROVEEDOR**: Supabase Auth exclusivamente
- **ROLES**: Extender sistema de roles existente (owner, admin, manager, cashier, staff)
- **RLS**: Las políticas deben respetar roles existentes

## TC-004: Pagos

- **PROVEEDOR**: Stripe exclusivamente
- **PCI**: No almacenar datos de tarjeta (usar Stripe Customer)
- **WEBHOOKS**: Implementar webhook handler para eventos de Stripe

## TC-005: Notificaciones

- **SMS**: Twilio (opcional)
- **EMAIL**: Supabase Email Auth + templates personalizados
- **TELEGRAM**: Telegram Bot API (opcional)

## TC-006: Tiempo de Desarrollo

- **MVP**: Fase 1 - Menú + Pedidos básicos (sin pago online)
- **COMPLETO**: Fase 2 - Panel staff + Notificaciones + Pagos
- **PREMIUM**: Fase 3 - Perfil nutricional + Recomendaciones

---

# 7. DEPENDENCIAS

## Dependencias Internas

| ID | Título | Estado | Notas |
|----|--------|--------|-------|
| N/A | - | - | Este SPEC no depende de otros SPECs nuevos |
| QuickPOS | Sistema POS existente | Activo | Reutiliza componentes y base de datos |

## Dependencias Externas

| Servicio | Versión | Propósito |
|----------|---------|-----------|
| Supabase | Latest | Backend, DB, Auth, Realtime |
| Stripe | Latest | Procesamiento de pagos |
| Twilio | Latest | Notificaciones SMS (opcional) |
| Telegram Bot API | Latest | Notificaciones Telegram (opcional) |

---

# 8. RIESGOS Y MITIGACIÓN

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Supabase downtime | Media | Alto | Implementar cache local + graceful degradation |
| Fallo en notificaciones | Media | Medio | Sistema de retry + log de fallos |
| Fraude en pagos | Baja | Alto | Usar Stripe Radar + verificación 3D Secure |
| Saturación de pedidos en hora pico | Media | Medio | Sistema de cola + ajuste dinámico de tiempo de preparación |
| Incompatibilidad con QuickPOS existente | Baja | Alto | Testing exhaustivo de integración |

---

# 9. CRITERIOS DE ÉXITO

El sistema se considerará exitoso cuando:

1. **Funcionalidad**: 100% de los requisitos funcionales de Fase 1 implementados
2. **Performance**: 95% de las requests responden en < 2 segundos
3. **Uptime**: 99.5% de disponibilidad durante horarios operativos
4. **Adopción**: 60% de los pedidos online son de clientes no registrados (guest checkout)
5. **Satisfacción**: < 5% de quejas relacionadas con tiempo de espera

---

# 10. APÉNDICES

## A. Glosario de Términos Fitness

| Término | Definición |
|---------|------------|
| Pre-Entreno | Comida ligera rica en carbohidratos complejos para energía |
| Post-Entreno | Comida rica en proteínas para recuperación muscular |
| Macros | Macronutrientes: proteínas, carbohidratos, grasas |
| Keto | Dieta cetogénica (bajo en carbohidratos, alto en grasas) |
| Paleo | Dieta basada en alimentos no procesados |
| Vegano | Sin productos de origen animal |
| Vegetariano | Sin carne pero puede incluir lácteos/huevos |

## B. Estados del Pedido - Diagrama de Transiciones

```
PENDIENTE → EN PREPARACIÓN → LISTO → RECOGIDO
                ↓               ↓
            CANCELADO      CANCELADO
```

## C. Rol de Staff vs Cliente

| Acción | Cliente | Staff |
|--------|---------|-------|
| Ver menú | ✅ | ✅ |
| Crear pedido | ✅ | ❌ |
| Ver sus pedidos | ✅ (solo propios) | ✅ (todos) |
| Cambiar estado pedido | ❌ | ✅ |
| Ver reportes | ❌ | ✅ |
| Configurar menú | ❌ | ✅ |
