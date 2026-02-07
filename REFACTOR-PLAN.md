# Plan de Refactorización - SPEC-POS-001

> **Estado**: Pendiente
> **Creado**: 2026-02-07
> **Target**: Reducir de 32,800 → ~12,000 líneas (-65%)

---

## Problema

El código de SPEC-POS-001 (Sistema de Pedidos Online) tiene **21,637 líneas** nuevas, lo cual es excesivo.

### Archivos Más Grandes

| Archivo | Líneas | Target |
|---------|--------|--------|
| `src/services/payments/StripeService.ts` | 946 | < 200 |
| `src/services/notifications/NotificationService.ts` | 919 | < 200 |
| `src/services/payments/StripeService.test.ts` | 893 | < 300 |
| `src/services/notifications/NotificationService.test.ts` | 708 | < 300 |
| `src/services/orders/StatusChangeHandler.ts` | 541 | < 150 |
| `src/types/online-orders.ts` | 550 | < 200 |
| `src/components/online-orders/customer/CustomerProfile.tsx` | 453 | < 200 |

---

## Fases de Refactorización

### Fase 1: Simplificar Types (2h)

```bash
# Archivos a modificar
src/types/online-orders.ts
```

**Cambios:**
- Eliminar types duplicados con Supabase
- Usar inferencia: `type Order = Database['public']['Tables']['online_orders']['Row']`
- Agregar Zod solo para validación de inputs

**Comando para ejecutar:**
```bash
/moai:2-run SPEC-REFACTOR-001 --phase=1
```

---

### Fase 2: Refactorizar Servicios (4h)

```bash
# Eliminar estos archivos monolíticos:
src/services/payments/StripeService.ts      # 946 líneas
src/services/notifications/NotificationService.ts  # 919 líneas
src/services/orders/StatusChangeHandler.ts  # 541 líneas

# Reemplazar con funciones simples:
src/lib/stripe.ts          # ~150 líneas
src/lib/notifications.ts   # ~150 líneas
src/hooks/useOrderStatus.ts # ~100 líneas
```

**Patrón a seguir:**

```typescript
// ANTES: Clase monolítica
class StripeService {
  private stripe: Stripe;
  async createPaymentIntent() { ... }
  async confirmPayment() { ... }
  // 50+ métodos más...
}

// DESPUÉS: Funciones puras
export const createPaymentIntent = async (amount: number, orderId: string) => {
  return stripe.paymentIntents.create({ amount, metadata: { orderId } });
};
```

---

### Fase 3: Dividir Componentes (3h)

```bash
# Dividir CustomerProfile.tsx (453 líneas) en:
src/components/online-orders/customer/profile/
├── index.tsx          # 50 líneas - Layout
├── ProfileInfo.tsx    # 60 líneas
├── FitnessGoals.tsx   # 80 líneas
├── Preferences.tsx    # 70 líneas
└── Notifications.tsx  # 60 líneas
```

---

### Fase 4: Simplificar Tests (2h)

```bash
# Crear factories
src/test/factories/
├── order.ts
├── product.ts
├── profile.ts
└── index.ts
```

**Patrón:**

```typescript
// ANTES: Mock verboso (50+ líneas por test)
vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(() => ({ select: vi.fn(() => ...) })) }
}));

// DESPUÉS: Factory simple
import { createTestOrder } from '@/test/factories';
const order = createTestOrder({ items: 2 });
```

---

## Checklist de Ejecución

- [ ] **Fase 1**: Types → Inferencia + Zod
- [ ] **Fase 2**: Servicios → Funciones puras
- [ ] **Fase 3**: Componentes → Dividir
- [ ] **Fase 4**: Tests → Factories

---

## Comandos Útiles

```bash
# Ver líneas por archivo
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -n | tail -20

# Ejecutar refactorización con MoAI
/moai:2-run SPEC-REFACTOR-001

# Correr tests después de refactorizar
npm test
```

---

## Notas

- El spec completo está en: `.moai/specs/SPEC-REFACTOR-001/spec.md`
- Branch sugerido: `refactor/simplify-online-orders`
- Mantener los tests pasando en cada fase
