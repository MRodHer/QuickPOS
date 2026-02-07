---
id: SPEC-POS-001
version: "1.0.0"
status: "draft"
created: "2026-02-07"
updated: "2026-02-07"
author: "Developer"
priority: "HIGH"
title: "Criterios de Aceptación - Sistema de Pedidos Online con Recogida Programada"
---

# 1. INTRODUCCIÓN

Este documento define los criterios de aceptación y escenarios de prueba para el Sistema de Pedidos Online con Recogida Programada. Todos los escenarios están escritos en formato **Given/When/Then** (Gherkin) para claridad en la ejecución de pruebas.

---

# 2. ESCENARIOS DE ACEPTACIÓN (Given/When/Then)

## AC-001: Flujo Completo de Pedido como Invitado

**Descripción**: Un usuario no registrado puede navegar el menú, agregar productos, y completar checkout sin crear una cuenta.

### Escenario 1.1: Navegación y Agregado al Carrito

**GIVEN** un usuario no registrado accede a la página del menú
**WHEN** navega por las categorías y agrega 2 productos al carrito
**THEN** los productos aparecen en el carrito con el subtotal correcto calculado
**AND** el carrito persiste al recargar la página (localStorage)

### Escenario 1.2: Checkout como Invitado

**GIVEN** un usuario tiene productos en el carrito
**WHEN** hace clic en "Finalizar Pedido" y completa el formulario con:
  - Nombre: Juan Pérez
  - Email: juan@example.com
  - Teléfono: +52 55 1234 5678
**AND** selecciona hora de recogida válida
**AND** hace clic en "Confirmar Pedido"
**THEN** el pedido se crea con estado "pending"
**AND** se genera un número de orden único (ej: #KA-000001)
**AND** se envía email de confirmación a juan@example.com

### Escenario 1.3: Confirmación Visual

**GIVEN** un usuario acaba de completar un pedido
**WHEN** es redirigido a la página de confirmación
**THEN** ve:
  - Número de pedido: #KA-000001
  - Hora de recogida estimada: 6:30 PM
  - Resumen de items solicitados
  - Total pagado (o "Pagar en recepción")

---

## AC-002: Programación Exitosa de Recogida

**Descripción**: El cliente selecciona una hora de recogida y el sistema confirma disponibilidad.

### Escenario 2.1: Selección de Hora Válida

**GIVEN** un usuario tiene productos en el carrito
**AND** la hora actual es 5:00 PM
**AND** el tiempo de preparación es 30 minutos
**WHEN** abre el selector de hora de recogida
**THEN** ve:
  - Primera hora disponible: 5:30 PM
  - Última hora disponible: 10:45 PM (15 min antes de cierre)
  - Intervalos de 15 minutos
**WHEN** selecciona 6:30 PM
**THEN** el sistema confirma: "Tu pedido estará listo a las 6:30 PM"

### Escenario 2.2: Validación de Hora Mínima

**GIVEN** un usuario tiene productos en el carrito
**AND** la hora actual es 5:00 PM
**WHEN** intenta seleccionar una hora anterior a 5:30 PM
**THEN** el sistema muestra error: "La hora mínima de recogida es 5:30 PM"

### Escenario 2.3: Validación de Capacidad

**GIVEN** un restaurante tiene capacidad de 10 pedidos por franja horaria
**AND** ya hay 10 pedidos programados para las 6:30 PM
**WHEN** un usuario intenta seleccionar 6:30 PM
**THEN** el sistema muestra: "Franja llena. Próxima hora disponible: 6:45 PM"

---

## AC-003: Notificación de Pedido Listo

**Descripción**: Cuando el staff marca un pedido como listo, el cliente recibe notificación inmediata.

### Escenario 3.1: Notificación por Email

**GIVEN** un pedido está en estado "preparing"
**AND** el cliente seleccionó notificación por email
**WHEN** el staff marca el pedido como "ready"
**THEN** el sistema envía email inmediatamente
**AND** el email contiene:
  - Asunto: "Tu pedido #KA-000001 está listo"
  - Cuerpo: "Tu pedido está listo para recoger en KaHome"
  - Detalle del pedido
**AND** el campo `notification_sent` se actualiza a true

### Escenario 3.2: Notificación por SMS

**GIVEN** un pedido está en estado "preparing"
**AND** el cliente seleccionó notificación por SMS
**AND** proporcionó teléfono: +52 55 1234 5678
**WHEN** el staff marca el pedido como "ready"
**THEN** el sistema envía SMS vía Twilio
**AND** el SMS dice: "KaHome: Tu pedido #KA-000001 está listo para recoger"

### Escenario 3.3: Notificación por Telegram

**GIVEN** un pedido está en estado "preparing"
**AND** el cliente tiene telegram_chat_id configurado
**WHEN** el staff marca el pedido como "ready"
**THEN** el bot de Telegram envía mensaje
**AND** el mensaje incluye botón "Ver pedido"

### Escenario 3.4: Fallo en Notificación

**GIVEN** un pedido se marca como "ready"
**WHEN** el envío de notificación falla
**THEN** el sistema:
  - Registra el error en `notification_logs`
  - Incrementa `retry_count`
  - Reintentará automáticamente en 2 minutos
  - Muestra alerta al staff después de 3 intentos fallidos

---

## AC-004: Pago Online Exitoso

**Descripción**: El cliente paga con tarjeta y el pedido se confirma.

### Escenario 4.1: Pago con Tarjeta Aprobado

**GIVEN** un usuario tiene productos en el carrito
**AND** el subtotal es $250.00 MXN
**WHEN** selecciona "Pagar online"
**AND** es redirigido a Stripe Checkout
**AND** completa el pago con tarjeta válida
**THEN** Stripe redirige de vuelta a la app
**AND** el pedido se crea con estado "confirmed"
**AND** `payment_status` es "paid"
**AND** `stripe_payment_intent_id` es guardado
**AND** el usuario ve confirmación con detalles del pago

### Escenario 4.2: Pago con Tarjeta Rechazado

**GIVEN** un usuario tiene productos en el carrito
**WHEN** selecciona "Pagar online"
**AND** el pago es rechazado por Stripe
**THEN** el sistema muestra: "Pago rechazado. Intenta con otro método."
**AND** el pedido NO se crea
**AND** el usuario puede intentar pagar de nuevo

### Escenario 4.3: Pago en Recepción

**GIVEN** un usuario tiene productos en el carrito
**WHEN** selecciona "Pagar en recepción"
**AND** completa el checkout
**THEN** el pedido se crea con:
  - `payment_method`: "on_arrival"
  - `payment_status`: "pending"
**AND** la confirmación muestra: "Pagar $250.00 al recoger"

### Escenario 4.4: Reembolso de Pago

**GIVEN** un pedido pagado online con status "confirmed"
**WHEN** el staff o cliente cancela el pedido
**THEN** el sistema:
  - Procesa reembolso vía Stripe
  - Actualiza `payment_status` a "refunded"
  - Envía notificación de reembolso al cliente

---

## AC-005: Panel de Staff en Tiempo Real

**Descripción**: El panel del staff se actualiza automáticamente sin refresh.

### Escenario 5.1: Nuevo Pedido Aparece

**GIVEN** un miembro del staff tiene el panel abierto
**AND** actualmente hay 5 pedidos mostrados
**WHEN** un cliente crea un nuevo pedido
**THEN** el nuevo pedido aparece en la lista automáticamente
**AND** el contador de pedidos pendientes incrementa
**AND** se reproduce un sonido de notificación
**AND** todo esto SIN que el staff recargue la página

### Escenario 5.2: Actualización de Estado

**GIVEN** dos miembros del staff tienen el panel abierto
**WHEN** el staff A marca un pedido como "preparing"
**THEN** en la pantalla del staff B:
  - El pedido se mueve a la columna "En Preparación"
  - El estado se actualiza visualmente
  - El timestamp "En preparación desde: HH:MM" aparece

### Escenario 5.3: Vista Kanban

**GIVEN** un miembro del staff abre el panel
**WHEN** la vista kanban carga
**THEN** ve las columnas:
  - Pendientes (3 pedidos)
  - En Preparación (2 pedidos)
  - Listos (1 pedido)
**AND** puede arrastrar pedidos entre columnas
**AND** al soltar, el estado se actualiza en la DB

### Escenario 5.4: Filtros de Búsqueda

**GIVEN** hay 20 pedidos en el sistema
**WHEN** el staff filtra por:
  - Estado: "ready"
  - Fecha: hoy
**THEN** solo se muestran los pedidos que coinciden con ambos filtros
**AND** el contador muestra "5 pedidos encontrados"

---

## AC-006: Registro y Login Funcional

**Descripción**: Usuario puede crear cuenta opcional y acceder a beneficios.

### Escenario 6.1: Registro Exitoso

**GIVEN** un usuario está en el checkout
**WHEN** hace clic en "Crear cuenta"
**AND** completa el formulario:
  - Email: maria@example.com
  - Password: SecurePass123!
  - Nombre: María González
**AND** acepta términos y condiciones
**AND** hace clic en "Registrarse"
**THEN** la cuenta se crea en Supabase Auth
**AND** se crea registro en `customers` y `customer_profiles`
**AND** se envía email de verificación
**AND** el usuario queda logueado automáticamente

### Escenario 6.2: Login Exitoso

**GIVEN** un usuario registrado existe
**WHEN** ingresa email y password correctos
**THEN** es redirigido al menú
**AND** ve su nombre en la navegación: "Hola, María"
**AND** puede acceder a "Mis Pedidos"

### Escenario 6.3: Recuperación de Contraseña

**GIVEN** un usuario olvidó su password
**WHEN** hace clic en "¿Olvidaste tu password?"
**AND** ingresa su email
**THEN** recibe email con enlace de recuperación
**AND** puede establecer nuevo password

---

## AC-007: Perfil Nutricional y Recomendaciones

**Descripción**: Usuario registrado configura perfil y recibe recomendaciones.

### Escenario 7.1: Configuración de Objetivos

**GIVEN** un usuario registrado está logueado
**WHEN** accede a "Mi Perfil"
**AND** configura:
  - Objetivo: "Ganar músculo"
  - Calorías diarias: 2500
  - Proteína: 180g
  - Carbohidratos: 250g
  - Grasas: 80g
**AND** guarda cambios
**THEN** el perfil se actualiza en `customer_profiles`
**AND** la página muestra resumen de configuración

### Escenario 7.2: Alerta de Calorías

**GIVEN** un usuario tiene configurado máximo 2500 calorías diarias
**AND** ya ha consumido 2000 calorías hoy
**WHEN** agrega al carrito un plato de 600 calorías
**THEN** el carrito muestra alerta:
  - "⚠️ Este pedido excede tu objetivo diario de calorías"
  - "Total: 2600 kcal (Objetivo: 2500 kcal)"

### Escenario 7.3: Recomendaciones según Objetivo

**GIVEN** un usuario tiene objetivo "Ganar músculo"
**WHEN** accede al menú
**THEN** ve sección "Recomendado para ti":
  - Platos altos en proteína
  - Etiqueta "Ideal para ganancia muscular"
  - Ordenados por score de proteína

### Escenario 7.4: Filtros por Preferencias

**GIVEN** un usuario configuró preferencias: vegano, sin nueces
**WHEN** navega el menú
**THEN** puede aplicar filtro "Solo apto para mí"
**AND** se muestran solo productos veganos sin nueces
**AND** los productos con nueces aparecen tachados

---

## AC-008: Información Nutricional Visible

**Descripción**: Todos los productos muestran información nutricional completa.

### Escenario 8.1: Card de Producto con Macros

**GIVEN** un usuario navega el menú
**WHEN** ve un producto card
**THEN** ve:
  - Foto del plato
  - Nombre y descripción
  - Precio
  - Mini badges de macros:
    - 🔥 450 kcal
    - 💪 35g proteína
    - 🍞 40g carbs
    - 🥑 15g grasas

### Escenario 8.2: Vista Detallada de Nutrición

**GIVEN** un usuario hace clic en un producto
**WHEN** se abre el modal de detalle
**THEN** ve información nutricional completa:
  - Tamaño de porción
  - Calorías
  - Proteínas, Carbohidratos, Grasas (con gráfico)
  - Fibra, Azúcar, Sodio
  - Vitaminas y minerales principales

### Escenario 8.3: Etiquetas de Alérgenos

**GIVEN** un producto contiene gluten y lácteos
**WHEN** el usuario ve el producto
**THEN** ve etiquetas prominentes:
  - 🌾 Contiene gluten
  - 🥛 Contiene lácteos
**AND** puede aplicar filtro "Sin gluten" para excluirlo

---

## AC-009: Historial de Pedidos y Reorden

**Descripción**: Usuario registrado ve su historial y puede reordenar.

### Escenario 9.1: Lista de Pedidos Anteriores

**GIVEN** un usuario registrado tiene 5 pedidos previos
**WHEN** accede a "Mis Pedidos"
**THEN** ve lista con:
  - Número de pedido
  - Fecha y hora
  - Total
  - Estado
  - Items resumidos
**AND** puede hacer clic para ver detalles

### Escenario 9.2: Reordenar Pedido Anterior

**GIVEN** un usuario ve el detalle de un pedido anterior
**WHEN** hace clic en "Ordenar de nuevo"
**THEN** los items de ese pedido se agregan a su carrito actual
**AND** es redirigido al checkout con los items cargados

### Escenario 9.3: Sistema de Favoritos

**GIVEN** un usuario registrado ama un producto específico
**WHEN** hace clic en el icono de corazón en el producto
**THEN** el producto se agrega a sus favoritos
**AND** puede acceder a "Mis Favoritos" para verlos
**AND** puede agregar cualquier favorito al carrito con un clic

---

## AC-010: Multi-tenant y Aislamiento de Datos

**Descripción**: Cada negocio solo ve sus propios datos.

### Escenario 10.1: Aislamiento de Pedidos

**GIVEN** existen dos negocios: Business A y Business B
**AND** Business A tiene 10 pedidos
**AND** Business B tiene 5 pedidos
**WHEN** el admin de Business A accede al panel
**THEN** solo ve los 10 pedidos de Business A
**AND** no puede ver pedidos de Business B

### Escenario 10.2: Aislamiento de Menú

**GIVEN** Business A tiene productos propios
**AND** Business B tiene productos propios
**WHEN** un cliente accede al menú de Business A
**THEN** solo ve productos de Business A
**AND** los productos de Business B no son visibles

---

# 3. CASOS EDGE (Edge Cases)

## EDGE-001: Pedido Abandonado

**GIVEN** un usuario tiene items en el carrito
**WHEN** cierra el navegador sin completar el pedido
**AND** regresa 2 horas después
**THEN** el carrito todavía está disponible (localStorage)
**AND** se muestra mensaje: "Tienes un carrito pendiente. ¿Deseas continuar?"

## EDGE-002: Cambio de Hora de Recogida

**GIVEN** un pedido está confirmado para las 6:30 PM
**AND** el cliente necesita cambiarlo a las 7:00 PM
**WHEN** llama o solicita el cambio
**THEN** el staff puede actualizar la hora en el panel
**AND** se envía notificación de confirmación al cliente

## EDGE-003: Cancelación Tardía

**GIVEN** un pedido está en estado "preparing"
**WHEN** el cliente intenta cancelar
**THEN** el sistema muestra:
  - "Tu pedido ya está en preparación. Para cancelar, llama al restaurante."
**AND** no permite cancelación directa

## EDGE-004: Pedido No Recogido

**GIVEN** un pedido está en estado "ready"
**AND** han pasado 60 minutos
**WHEN** el cliente no ha pasado a recoger
**THEN** el sistema:
  - Marca el pedido como "overdue"
  - Muestra alerta al staff
  - Envía recordatorio al cliente (si está configurado)

## EDGE-005: Pago Interumpido

**GIVEN** un usuario está en proceso de pago con Stripe
**WHEN** cierra la página de pago a mitad del proceso
**THEN** Stripe maneja la interrupción
**AND** el pedido NO se crea
**AND** el usuario puede intentar de nuevo

## EDGE-006: Sincronización Concurrente

**GIVEN** dos miembros del staff intentan cambiar el estado del mismo pedido simultáneamente
**WHEN** ambos hacen clic casi al mismo tiempo
**THEN** el último update gana
**AND** el historial registra ambos cambios
**AND** no se pierde información

## EDGE-007: Producto Sin Stock

**GIVEN** un producto se agota durante el día
**WHEN** el inventario marca qty = 0
**THEN** el producto:
  - Aparece como "Agotado" en el menú
  - No se puede agregar al carrito
  - Muestra "Notificarme cuando esté disponible"

## EDGE-008: Múltiples Pedidos del Mismo Cliente

**GIVEN** un cliente ya tiene un pedido activo para las 6:30 PM
**WHEN** intenta crear otro pedido para la misma hora
**THEN** el sistema avisa:
  - "Ya tienes un pedido programado para esta hora. ¿Deseas modificar la hora?"

## EDGE-009: Error de Conexión

**GIVEN** un usuario está navegando el menú
**WHEN** pierde conexión a internet
**THEN** el sistema:
  - Muestra mensaje: "Sin conexión. Algunas funciones pueden no estar disponibles."
  - Permite navegar el menú cacheado
  - Deshabilita checkout hasta reconectar

## EDGE-010: Webhook Duplicado de Stripe

**GIVEN** Stripe envía webhook de pago exitoso
**WHEN** el webhook se recibe dos veces (duplicado)
**THEN** el sistema:
  - Detecta que es un evento duplicado (idempotencia)
  - No crea el pedido dos veces
  - Responde con 200 OK

---

# 4. CRITERIOS DE ÉXITO DEL PROYECTO

## 4.1 Funcionales

- [ ] 100% de escenarios AC-001 a AC-010 pasan
- [ ] Todos los casos edge tienen manejo definido
- [ ] Integración con QuickPOS no rompe funcionalidad existente
- [ ] Multi-tenant funciona correctamente

## 4.2 Performance

- [ ] 95% de las requests responden en < 2 segundos
- [ ] Actualizaciones realtime en < 500ms
- [ ] Carrito persiste correctamente en localStorage
- [ ] El menú carga en < 1 segundo

## 4.3 Seguridad

- [ ] RLS policies funcionan correctamente
- [ ] Clientes solo ven sus propios pedidos
- [ ] Pagos cumplen estándar PCI (via Stripe)
- [ ] Inputs están sanitizados contra XSS
- [ ] Rate limiting aplicado a endpoints públicos

## 4.4 UX/Experiencia

- [ ] Checkout se completa en máximo 3 pasos
- [ ] Mobile-first responsive funciona en todos los dispositivos
- [ ] Notificaciones se envían en < 30 segundos
- [ ] Panel staff se actualiza en tiempo real sin refresh

## 4.5 Business

- [ ] Al menos 60% de pedidos online son de clientes no registrados (guest checkout)
- [ ] Tasa de abandono de carrito < 60%
- [ ] Tasa de pedidos cancelados < 10%
- [ ] Satisfacción del cliente > 4.5/5 en encuestas

---

# 5. MATRIZ DE PRUEBAS

| ID | Escenario | Tipo | Automated? | Status |
|----|-----------|------|-------------|--------|
| AC-001 | Flujo completo invitado | E2E | ✅ | |
| AC-002 | Programación de recogida | E2E | ✅ | |
| AC-003 | Notificaciones | Integration | ✅ | |
| AC-004 | Pagos online | Integration | ✅ | |
| AC-005 | Panel staff realtime | Integration | ✅ | |
| AC-006 | Registro y login | E2E | ✅ | |
| AC-007 | Perfil nutricional | E2E | ✅ | |
| AC-008 | Info nutricional | Unit | ✅ | |
| AC-009 | Historial y reorden | E2E | ✅ | |
| AC-010 | Multi-tenant | Integration | ✅ | |
| EDGE-001 a 010 | Casos edge | Unit/Integration | Partial | |

---

**Fin de Criterios de Aceptación**
