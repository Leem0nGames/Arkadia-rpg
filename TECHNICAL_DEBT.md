# Deuda Técnica y Áreas de Mejora - Arcadia Tactics

**Fecha de Actualización:** 17 de Agosto, 2026
**Estado:** Refactorización Arquitectónica y Modularización Completada (v1.9)

Este documento detalla la deuda técnica identificada y la estrategia de refactorización modular sin alteración del comportamiento para mejorar la mantenibilidad, separación de responsabilidades y escalabilidad del proyecto.

---

## 🔴 Prioridad Alta (Manejo de Complejidad y Arquitectura) [COMPLETADO]

### 1. Monolito en `battleSlice.ts`
*   **Problema:** `battleSlice.ts` contenía lógica mezclada (generación de mapas, motor de daño, IA y estado).
*   **Solución [Completada]:** 
    *   Extraída la generación de grillas a `/services/BattleGridGenerator.ts`.
    *   Extraídas las reglas de aplicación de daño e IA de combate a `/services/combatEngine.ts`.
    *   `battleSlice.ts` enfocado exclusivamente en la orquestación del estado de Zustand.

### 2. Componentes UI Sobrecargados (`UIOverlay.tsx`)
*   **Problema:** `UIOverlay.tsx` definía múltiples componentes inline.
*   **Solución [Completada]:** 
    *   Extraídos `ActionEconomyTokens`, `CombatDiceLogDrawer`, `MobileDPad` y el hook de transiciones `useTurnTransition`.
    *   Importación modular limpia desde `UIOverlay.tsx`.

---

## 🟡 Prioridad Media (Mantenibilidad y Clean Code) [COMPLETADO]

### 3. Duplicación y Definición de Constantes y Tipos
*   **Problema:** Ciertos valores numéricos y definiciones de entidades repetían intersecciones pesadas (`Entity & { stats... }`).
*   **Solución [Completada]:** 
    *   Centralizada la gestión de texturas y shaders en `Base3DRenderer`.
    *   Consolidada la interfaz `Entity` con componentes opcionales y definido el tipo `CombatEntity` en `types.ts`.

### 4. Cohesión de Slices en Zustand
*   **Problema:** Agrupación de acciones globales junto a slices sin separación estricta.
*   **Solución [Completada]:** Modularizado y validado mediante compilación y linter estricto (`tsc --noEmit`).

---

## 🟢 Prioridad Baja (Polish y UX) [COMPLETADO]

### 5. Documentación y Limpieza de Código Muerto
*   **Problema:** Presencia de comentarios desactualizados e imports sin utilizar.
*   **Solución [Completada]:** Limpieza general de imports y verificación de tipos exitosa.

