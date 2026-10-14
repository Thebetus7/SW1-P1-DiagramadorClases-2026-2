# SDD-Execution: Implementación, Verificación y Cierre Físico

Este workflow ejecuta físicamente las tareas definidas en:

```text
docs/specs/XX-feature/tasks.md
```

siguiendo las decisiones aprobadas en:

```text
docs/constitution.md
docs/specs/XX-feature/spec.md
docs/specs/XX-feature/plan.md
docs/specs/XX-feature/tasks.md
```

Su propósito es:

> **Transformar tareas aprobadas en código funcional y evidencia verificable, sin inventar comportamiento ni modificar silenciosamente las decisiones documentales.**

`/sdd-execution` es la fase donde el sistema SDD pasa de:

```text
INTENCIÓN
```

a:

```text
REALIZACIÓN
```

y posteriormente a:

```text
EVIDENCIA
```

---

# 0. REGLA SUPREMA — EJECUTAR LO APROBADO, NO INVENTAR

La IA debe implementar exactamente el resultado de:

```text
Constitution
+
Spec
+
Plan
+
Tasks
```

No debe introducir silenciosamente:

```text id="4u1wqj"
nuevas reglas de negocio;
nuevos flujos;
cambios de alcance;
nuevos permisos;
nuevos estados;
nuevos contratos;
cambios arquitectónicos;
patrones no aprobados;
```

solo porque parezcan convenientes durante la implementación.

Si una necesidad nueva aparece:

```text
NO incorporarla silenciosamente.
```

Debe determinarse a qué nivel pertenece y regresar al workflow correspondiente.

---

# 1. OBJETIVO

Execution debe garantizar:

```text
Task
 ↓
Implementación
 ↓
Ejecución real
 ↓
Validación
 ↓
Evidencia
 ↓
COMPLETED
```

Una tarea no se considera completada por:

```text id="m5k6cp"
haber creado el archivo;
haber escrito el código;
haber generado el test;
haber supuesto que funciona.
```

Debe existir evidencia física suficiente para demostrar su finalización.

---

# 2. ENTRADAS OBLIGATORIAS

Antes de comenzar, la IA debe localizar:

```text id="8m8e5d"
AGENTS.md
docs/constitution.md
docs/specs/XX-feature/spec.md
docs/specs/XX-feature/plan.md
docs/specs/XX-feature/tasks.md
```

La Specification y el Planning deben estar aprobados.

El `tasks.md` debe estar en un estado que permita ejecución:

```text
READY
IN_PROGRESS
```

Si no está listo:

```text
NO EXECUTION
```

---

# 2.1 PARÁMETROS DE INVOCACIÓN Y MODOS DE EJECUCIÓN

El comando `/sdd-execution` admite tres modalidades de ejecución según la entrada recibida:

### 1. Invocación Sin Detalle / Vacía (Por Defecto)
```text
/sdd-execution
```
- **Modo Continuo Total (Full Run)**: Si el usuario no proporciona argumentos, números ni especificaciones adicionales (o simplemente presiona Enter), la IA ejecuta **automáticamente todas las tareas pendientes** en bucle continuo.
- Procede secuencialmente tarea por tarea (Implementar → Testear → Verificar → Actualizar `Task Progress` a `COMPLETED` → Siguiente tarea) hasta:
  - Completar el 100% de la feature, o
  - Toparse con una inconsistencia o fallo que catalogue el estado como `BLOCKED`.

### 2. Invocación por Lote Numérico
```text
/sdd-execution [N]
```
*(Ejemplo: `/sdd-execution 2`)*
- **Modo Lote (Batch)**: Ejecuta únicamente la cantidad `N` de tareas ejecutables consecutivas. Al completar la última tarea del lote, persiste el progreso y emite el reporte de **Ejecución Parcial**, cediendo el control al usuario.

### 3. Invocación Atómica por Identificador
```text
/sdd-execution [T_ID]
```
*(Ejemplo: `/sdd-execution T2.1`)*
- **Modo Quirúrgico**: Valida que las dependencias directas de la tarea indicada estén satisfechas y ejecuta únicamente esa tarea específica, cerrando su ciclo con evidencia verificable.

---

# 3. VALIDACIÓN PREVIA

Antes de modificar código, la IA debe comprobar:

```text
[ ] Constitution disponible.
[ ] Spec aprobada.
[ ] Plan aprobado.
[ ] Tasks disponibles.
[ ] No existen bloqueos globales conocidos.
[ ] Las dependencias de la siguiente tarea están satisfechas.
[ ] El entorno necesario está disponible.
```

Si alguna condición crítica falla:

```text
BLOCKED
```

y no se debe continuar mediante una suposición de alto impacto.

---

# 4. REGLA DE SELECCIÓN DE TAREAS

No se debe asumir que siempre corresponde ejecutar:

```text
"la primera tarea pendiente"
```

La IA debe seleccionar la siguiente tarea mediante:

```text
dependencias
+
estado
+
bloqueos
+
prioridad
+
orden del flujo
```

Debe preferir una tarea cuando:

```text
PENDING
+
todas sus dependencias están COMPLETED
+
no está bloqueada
```

---

# 5. ORDEN DE EJECUCIÓN

La ejecución debe respetar el grafo de dependencias definido en `tasks.md`.

Ejemplo:

```text
T1
 ↓
T2
 ↓
T3
```

No ejecutar:

```text
T3
```

antes de:

```text
T1 y T2
```

si dependen realmente de ellas.

---

# 6. PARALISMO

Cuando dos tareas sean independientes:

```text
T2.1
T2.2
```

pueden ejecutarse en paralelo cuando el entorno permita ejecución paralela real.

No inventar una dependencia artificial para forzar una secuencia innecesaria.

---

# 7. ESTADOS DE EJECUCIÓN Y SIMBOLOGÍA VISUAL OBLIGATORIA

Execution debe actualizar tanto el estado textual como **las casillas interactivas y símbolos visuales** en `tasks.md`. Esto permite auditar visualmente el progreso real de forma instantánea.

### Tabla Maestra de Simbología de Estados:

| Símbolo | Estado Formal | Render / Significado | Acción en `/sdd-execution` |
|:---:|---|---|---|
| `[ ]` | **PENDING** | `[ ]` Casilla vacía | Tarea en espera. Aún no se ha iniciado su implementación. |
| `[/]` *(o `[-]`)* | **IN_PROGRESS** | `[/]` Media carga / En curso | Tarea en trabajo activo: escribiendo código o configurando componentes. |
| `[?]` | **TESTING / REVIEW** | `[?]` En validación | Tarea implementada; corriendo suites de test o linters antes del cierre. |
| `[x]` | **COMPLETED** | `[x]` Casilla marcada con **x** | **Cierre físico definitivo**: tests aprobados al 100% y evidencia registrada. |
| `[!]` | **BLOCKED** | `[!]` Alerta / Bloqueo | Tarea detenida por impedimento o ambigüedad, con causa y retorno reportados. |

---

# 8. ESTADO GLOBAL DE `tasks.md`

El resumen que aparece en la parte superior de `tasks.md` debe mantenerse siempre sincronizado.

Formato:

```markdown
## Task Progress

| Métrica | Cantidad |
|---|---:|
| Total de tareas | X |
| Tareas realizadas | X |
| Tareas por realizar | X |
| Tareas bloqueadas | X |
| Tareas en progreso | X |
| Progreso | X% |

**Estado:** IN_PROGRESS
```

Debe cumplirse siempre:

```text
TOTAL = REALIZADAS + POR REALIZAR
```

y:

```text
REALIZADAS = tareas COMPLETED
```

---

# 9. ACTUALIZACIÓN INMEDIATA

Cuando una tarea pase a:

```text
IN_PROGRESS
```

Execution debe actualizar:

```text
tasks.md
```

marcando `[/]` en checklist y encabezado.

Cuando pase a:

```text
TESTING
```

debe actualizarse con `[?]`.

Cuando pase a:

```text
COMPLETED
```

debe actualizarse físicamente marcando la casilla **`[x]`** (`- [x]` y `### [x]`).

Cuando pase a:

```text
BLOCKED
```

debe marcarse con `[!]`.

No esperar hasta el final de la feature para actualizar el estado.

---

# 10. CAMBIO DE ESTADO ATÓMICO

Siempre que una tarea cambie de estado, actualizar conjuntamente en una sola edición:

```text
1. Casilla en el checklist rápido (- [ ] ➔ - [/] ➔ - [x]).
2. Casilla en el encabezado de la tarea (### [ ] ➔ ### [/] ➔ ### [x]).
3. Campo Status (Status: PENDING ➔ Status: IN_PROGRESS ➔ Status: COMPLETED).
4. Resumen métrico superior (Task Progress).
5. Registro de Evidencia demostrable (o motivo si fue BLOCKED).
```

Ejemplo al completar una tarea:

```text
Checklist: - [x] T2.1 [IMPL] Registrar una venta
Encabezado: ### [x] T2.1 [IMPL] Registrar una venta
Status: COMPLETED
Tareas realizadas: +1
Tareas por realizar: -1
Evidencia: tests y comandos reales ejecutados
```

---

# 11. INICIO DE UNA TAREA

Antes de ejecutar una tarea:

```text
Status: PENDING
```

debe convertirse en:

```text
Status: IN_PROGRESS
```

y comprobar:

```text
[ ] Dependencias satisfechas.
[ ] Alcance claro.
[ ] Archivos objetivo disponibles.
[ ] No existe modificación concurrente incompatible.
```

---

# 12. PRESERVACIÓN DE CAMBIOS EXISTENTES

Antes de modificar código existente, la IA debe inspeccionar lo necesario para evitar destruir trabajo previo.

Debe:

```text
preservar cambios no relacionados;
preservar comportamiento existente;
modificar solo lo necesario;
evitar sobrescrituras destructivas;
```

No asumir que un archivo sin cambios en la task está disponible para reescritura completa.

---

# 13. IMPLEMENTACIÓN FÍSICA

La IA debe seguir las rutas y contratos definidos en `plan.md`.

Si el Plan establece:

```text
app/Services/OrderService.php
```

no crear arbitrariamente:

```text
app/Managers/OrderManager.php
```

por preferencia personal.

La estructura técnica aprobada debe respetarse.

---

# 14. REGLA DE COMPATIBILIDAD

Cuando exista código previamente implementado, la IA debe:

```text
extender antes que duplicar;
reutilizar antes que replicar;
preservar contratos;
evitar breaking changes innecesarios.
```

Si la tarea exige romper una compatibilidad existente pero el Plan no lo contempla:

```text
BLOCKED
```

y devolver el problema a Planning.

---

# 15. EJECUCIÓN POR VERTICAL SLICE

Cuando las tareas correspondan a una vertical slice:

```text
Setup
 ↓
Implementación
 ↓
Integración
 ↓
Prueba
 ↓
Verificación
```

Execution debe intentar cerrar la slice antes de saltar innecesariamente a otra.

Esto mantiene el sistema funcional durante toda la ejecución.

---

# 16. NO DEJAR FLUJOS DESARTICULADOS

Evitar estados como:

```text
backend implementado
pero sin consumidor;

UI implementada
pero sin integración;

persistencia implementada
pero sin flujo funcional;

test implementado
pero nunca ejecutado.
```

Cuando una tarea pertenezca a una slice funcional, Execution debe respetar las dependencias que permitan cerrar el flujo.

---

# 17. REGLA DE IMPLEMENTACIÓN MÍNIMA NECESARIA

La IA debe implementar:

```text
todo lo necesario
```

pero no:

```text
todo lo imaginable.
```

No introducir:

```text
abstracciones innecesarias;
features no solicitadas;
configuración especulativa;
refactors no relacionados;
dependencias sin justificación.
```

La finalidad es completar la tarea, no rediseñar todo el proyecto.

---

# 18. MANEJO DE ERRORES

La implementación debe respetar lo definido por:

```text
spec.md
plan.md
```

No inventar durante Execution:

```text
mensajes funcionales nuevos;
estados nuevos;
políticas nuevas;
fallbacks nuevos;
reglas de negocio nuevas.
```

Los detalles técnicos para materializar los errores sí pueden resolverse según el Plan y las convenciones del proyecto.

---

# 19. EJECUCIÓN DE PRUEBAS

Una prueba escrita no cuenta como evidencia.

Debe ejecutarse físicamente.

```text
test escrito
≠
test validado
```

Execution debe ejecutar los comandos reales del proyecto.

Ejemplos:

```text
npm test
php artisan test
pytest
flutter test
npm run lint
npm run typecheck
```

solo si son comandos reales del proyecto.

No inventar comandos.

---

# 20. TIMEOUTS Y FAIL-FAST

Las pruebas o procesos potencialmente bloqueantes deben ejecutarse con mecanismos que eviten esperas indefinidas.

No se impone un timeout universal.

El límite debe ser apropiado para:

```text
tipo de test;
entorno;
operación;
coste esperado.
```

Si un proceso queda bloqueado:

```text
detener;
registrar;
analizar;
no marcar COMPLETED.
```

---

# 21. PROHIBICIÓN DE ESPERAS CIEGAS

En pruebas asíncronas o de interfaz:

```text
NO depender ciegamente de esperas globales.
```

Preferir:

```text
condición observable;
estado específico;
evento esperado;
timeout controlado.
```

cuando el framework lo permita.

---

# 22. TESTING SEGÚN EL PLAN

La estrategia definida en `plan.md` tiene precedencia.

Puede incluir:

```text
BDD / E2E
Unit
Integration
Contract
Static Analysis
Lint
Type Check
Build
```

Execution debe ejecutar lo requerido por el riesgo de la tarea y el Plan.

No crear automáticamente pruebas adicionales solo para aumentar el número de tests.

---

# 23. VERIFICACIÓN DE RESULTADOS

Después de ejecutar una prueba, analizar realmente su resultado.

No aceptar:

```text
exit code = 0
```

como única evidencia cuando el comando produzca resultados adicionales relevantes.

Verificar:

```text
tests;
warnings;
errores;
coverage cuando corresponda;
logs relevantes;
build;
lint;
type-check.
```

---

# 24. REGLA DE EVIDENCIA

Cada tarea COMPLETED debe registrar evidencia suficiente.

Ejemplo:

```markdown
**Evidence**
- `npm run test:e2e -- --grep "create-order"` → PASS
- `npm run lint` → PASS
- Archivo modificado: `src/...`
```

La evidencia debe ser concreta y verificable.

---

# 25. EVIDENCIA DE IMPLEMENTACIÓN

Cuando corresponda, registrar:

```text
archivos creados;
archivos modificados;
archivos eliminados;
migraciones ejecutadas;
comandos ejecutados;
tests ejecutados;
resultado obtenido.
```

No registrar como evidencia:

```text
"funciona correctamente"
```

sin una comprobación que lo demuestre.

---

# 26. CIERRE DE UNA TAREA

El flujo correcto es:

```text
PENDING
 ↓
IN_PROGRESS
 ↓
IMPLEMENT
 ↓
TESTING
 ↓
VERIFY
 ↓
COMPLETED
```

Una tarea puede pasar directamente a:

```text
COMPLETED
```

solo cuando su naturaleza no requiere una fase de testing adicional y existe evidencia suficiente.

---

# 27. REGLA SUPREMA PARA `COMPLETED` Y MARCADO CON `[x]`

Está terminantemente prohibido marcar:

```text
[x]
COMPLETED
```

hasta verificar exhaustivamente:

```text
[ ] Trabajo implementado conforme al Plan.
[ ] Criterio "Done when" satisfecho al 100%.
[ ] Dependencias respetadas.
[ ] Pruebas necesarias ejecutadas físicamente en terminal.
[ ] Resultado exitoso confirmado (cero errores, cero cuelgues).
[ ] Evidencia demostrable registrada en el bloque Evidence.
[ ] No existe bloqueo conocido.
```

> **Obligatoriedad del Marcado Físico con `[x]`:**
> Una vez comprobados los puntos anteriores, la IA **DEBE estampar físicamente la `[x]`** en:
> 1. El Checklist Rápido de Slices (`- [x] T...`).
> 2. El encabezado de la tarea (`### [x] T...`).
> 3. El campo `**Status:** COMPLETED`.
> 
> Una tarea sin la `[x]` visible se considera inconclusa para los lectores humanos y las herramientas de renderizado Markdown.

---

# 28. CUANDO UNA PRUEBA FALLA

Una prueba fallida NO significa automáticamente:

```text
"el código está mal".
```

Puede significar:

```text
bug;
error en Spec;
error en Plan;
test incorrecto;
dato incorrecto;
problema de entorno;
servicio externo;
configuración;
dependencia;
regresión existente.
```

Execution debe investigar antes de modificar.

---

# 29. DIAGNÓSTICO DE FALLA

Cuando una validación falle:

```text
FAIL
 ↓
Reproducir
 ↓
Clasificar causa
 ↓
Determinar nivel
```

### Bug de implementación

```text
Execution
```

### Problema del Plan

```text
Planning
```

### Ambigüedad funcional

```text
Spec / Spec-Clarify
```

### Contradicción global

```text
Constitution
```

### Problema de entorno

```text
Environment / Setup
```

---

# 30. NO "ARREGLAR" EL TEST PARA HACERLO PASAR

La IA no debe modificar un test únicamente porque falle.

Primero determinar:

```text
¿El comportamiento esperado del test sigue siendo correcto?
```

Si sí:

```text
corregir implementación.
```

Si no:

```text
corregir el artefacto documental correspondiente.
```

No alterar expectativas funcionales simplemente para obtener:

```text
PASS
```

---

# 31. NO OCULTAR FALLOS

Está prohibido considerar exitoso un proceso mediante:

```text
ignorar error;
silenciar excepción;
comentar test;
deshabilitar validación;
aumentar timeout indiscriminadamente;
marcar task como completada;
```

sin resolver la causa.

---

# 32. FALLA CONSTITUCIONAL

Si la implementación revela una contradicción con:

```text
docs/constitution.md
```

Execution debe detener el camino afectado.

No modificar la Constitución automáticamente para que el código "encaje".

Debe registrar:

```text
BLOCKED
Reason:
Constitution conflict.
Required:
Review via /sdd-constitution-trial
```

---

# 33. FALLA FUNCIONAL

Si la implementación revela una ambigüedad funcional:

```text
BLOCKED
```

y devolver al nivel correspondiente:

```text
/sdd-spec-clarify
```

o:

```text
/sdd-spec-anchored
```

según el caso.

No inventar una regla para continuar.

---

# 34. FALLA TÉCNICA

Si la arquitectura definida en `plan.md` no puede materializarse razonablemente:

```text
BLOCKED
```

y devolver a:

```text
/sdd-planning
```

Debe conservarse la evidencia del problema encontrado.

---

# 35. REINTENTO

Después de corregir una causa:

```text
volver a ejecutar
```

las validaciones necesarias.

No asumir:

```text
"ya debería funcionar".
```

---

# 36. REGRESIONES

Después de completar una tarea con potencial de afectar comportamiento existente:

```text
ejecutar las verificaciones de regresión definidas
por el Plan o necesarias por el riesgo.
```

Una tarea puede estar correctamente implementada y aun así provocar una regresión.

En ese caso:

```text
NO COMPLETED
```

hasta resolverla o registrar el bloqueo correspondiente.

---

# 37. CAMBIOS NO RELACIONADOS

Durante Execution puede descubrirse un problema ajeno a la tarea.

No arreglarlo automáticamente si:

```text
no afecta la tarea;
no es una regresión;
no bloquea la ejecución;
```

Registrar:

```text
Observation
```

y continuar.

Si el problema bloquea la tarea:

```text
BLOCKED
```

y determinar su origen.

---

# 38. REFACTOR DURANTE EXECUTION

Un refactor es válido cuando:

```text
es necesario para completar la tarea;
está contemplado por Plan;
reduce un riesgo real de implementación.
```

No realizar grandes refactors no relacionados únicamente por preferencia del agente.

---

# 39. ACTUALIZACIÓN DE `tasks.md`

Después de cada tarea completada:

```text
1. Cambiar Status.
2. Registrar evidencia.
3. Actualizar Task Progress.
4. Revisar dependencias.
5. Determinar siguiente tarea ejecutable.
```

Ejemplo:

```text
T2.1
PENDING
   ↓
COMPLETED
```

Actualizar:

```text
Total: 10
Realizadas: 5
Por realizar: 5
```

si antes había:

```text
Realizadas: 4
Por realizar: 6
```

---

# 40. REGISTRO DE EJECUCIÓN

`tasks.md` debe mantener una sección:

```text
## Execution Evidence
```

o una estructura equivalente.

Debe registrar progresivamente:

```text
Fecha/hora cuando sea útil
Tarea
Archivos afectados
Comandos ejecutados
Resultado
Observaciones
```

Ejemplo:

```markdown
## Execution Evidence

### T2.1
- Status: COMPLETED
- Files:
  - `src/...`
- Commands:
  - `npm test -- --runInBand`
- Result:
  PASS
- Notes:
  ...
```

No es obligatorio registrar información irrelevante.

---

# 41. NO SOBRECARGAR EL EXECUTION LOG

El registro debe conservar evidencia útil, no cada acción interna del agente.

No es necesario registrar:

```text
abrí archivo;
leí línea;
pensé;
cerré archivo.
```

Sí:

```text
archivo modificado;
comando ejecutado;
resultado;
fallo;
decisión de retorno.
```

---

# 42. REGLA DE INTEGRIDAD DE `tasks.md`

Execution no debe modificar silenciosamente la definición de una tarea para que coincida con lo que ya hizo.

Ejemplo incorrecto:

```text
Task original:
Implementar A + B.

Después:
Task modificada:
Implementar A.
```

Eso destruye trazabilidad.

Si el alcance cambió:

```text
documentar el cambio;
actualizar mediante el workflow correspondiente;
ajustar Tasks de manera trazable.
```

---

# 43. TAREAS AÑADIDAS DURANTE EXECUTION

Puede descubrirse una tarea realmente necesaria.

La IA debe determinar si:

```text
ya estaba implícita en el Plan
```

o:

```text
representa una nueva decisión.
```

### Si ya deriva del Plan

Puede añadirse como tarea derivada, manteniendo:

```text
Traceability
```

### Si requiere nueva decisión

```text
BLOCKED
```

y devolver al nivel correspondiente.

Nunca crear trabajo arbitrario para ocultar una deficiencia documental.

---

# 44. CAMBIO DEL NÚMERO TOTAL DE TAREAS

Si se añade legítimamente una nueva tarea:

```text
TOTAL aumenta.
```

Por ejemplo:

```text
Antes:
Total = 10
Completed = 6
Pending = 4

Nueva tarea:
Total = 11
Completed = 6
Pending = 5
```

El progreso debe recalcularse.

No mantener artificialmente el contador anterior.

---

# 45. COMPLECIÓN DE LA FEATURE

Una feature solo puede marcar:

```text
Status: COMPLETED
```

cuando:

```text
todas las tareas requeridas = COMPLETED
```

y además:

```text
verificación global = satisfactoria
```

Debe cumplirse:

```text
Realizadas = Total
Por realizar = 0
Progreso = 100%
Bloqueadas = 0
En progreso = 0
```

---

# 46. VERIFICACIÓN GLOBAL FINAL

Antes de cerrar la feature:

```text
[ ] Todas las tareas están COMPLETED.
[ ] Todos los tests requeridos pasan.
[ ] Las verificaciones globales pasan.
[ ] Lint pasa si existe.
[ ] Type-check pasa si existe.
[ ] Build pasa cuando corresponda.
[ ] No existen regresiones conocidas.
[ ] No existen tareas bloqueadas.
[ ] Evidence está registrada.
[ ] Task Progress es coherente.
```

---

# 47. DEFINICIÓN DE DONE DE LA FEATURE

La feature está terminada cuando:

```text
Specification
     ↓
Plan
     ↓
Tasks
     ↓
Implementation
     ↓
Tests
     ↓
Verification
```

están alineados.

No basta:

```text
tests verdes
```

si el comportamiento implementado no corresponde al Spec.

Tampoco basta:

```text
código terminado
```

si faltan pruebas requeridas.

---

# 48. ESTADOS GLOBALES DURANTE EXECUTION

El estado superior de `tasks.md` debe corresponder a la realidad.

### READY

Todavía no comenzó la ejecución.

### IN_PROGRESS

Existe trabajo activo.

### BLOCKED

Una condición impide continuar.

### COMPLETED

Todas las tareas y verificaciones están completadas.

---

# 49. REGLA DE BLOCKED GLOBAL

La feature debe marcarse:

```text
BLOCKED
```

cuando exista un bloqueo que impida continuar el flujo necesario.

No marcar simplemente:

```text
IN_PROGRESS
```

si el agente ya no puede avanzar.

---

# 50. RECUPERACIÓN DESPUÉS DE UN BLOQUEO

Cuando se resuelva un bloqueo:

```text
BLOCKED
   ↓
PENDING / IN_PROGRESS
```

según el estado real.

Después continuar desde la tarea afectada.

No reiniciar toda la feature innecesariamente.

---

# 51. EJECUCIÓN PARCIAL

Execution puede detenerse dejando:

```text
7/12 tareas COMPLETED
```

La información debe quedar persistida en `tasks.md`.

Ejemplo:

```text
## Task Progress

| Métrica | Cantidad |
|---|---:|
| Total de tareas | 12 |
| Tareas realizadas | 7 |
| Tareas por realizar | 5 |
| Tareas bloqueadas | 0 |
| Tareas en progreso | 0 |
| Progreso | 58.3% |

**Estado:** IN_PROGRESS
```

El siguiente `/sdd-execution` debe poder continuar desde ese estado sin perder contexto.

---

# 52. REANUDACIÓN

Al volver a ejecutar:

```text
/sdd-execution
```

la IA debe:

```text
leer tasks.md;
identificar tareas COMPLETED;
respetar evidencia existente;
detectar la siguiente tarea ejecutable;
continuar desde allí.
```

No repetir tareas ya completadas salvo que:

```text
una modificación posterior las haya invalidado;
una regresión requiera repetirlas;
el Plan exija una nueva validación.
```

---

# 53. INVALIDACIÓN DE EVIDENCIA

Si un cambio posterior afecta una tarea previamente completada, puede ser necesario volver a validarla.

Ejemplo:

```text
T2.1 = COMPLETED
```

se modifica posteriormente una dependencia de T2.1.

La IA debe determinar:

```text
¿La evidencia previa sigue siendo válida?
```

Si no:

```text
T2.1
→ TESTING / PENDING
```

según el caso.

No mantener un `COMPLETED` obsoleto.

---

# 54. PROHIBICIÓN DE FALSEAR PROGRESO

La IA nunca debe:

```text
marcar tareas como completadas por adelantado;
reducir el total para aumentar porcentaje;
eliminar tareas pendientes sin justificación;
ocultar bloqueos;
convertir errores en observaciones no bloqueantes;
```

El progreso es una representación del estado real.

---

# 55. ACCIÓN EXACTA DEL WORKFLOW

Al ejecutar:

```text
/sdd-execution
```

la IA debe seguir:

```text
1. Leer Constitution.
2. Leer Spec.
3. Leer Plan.
4. Leer Tasks.
5. Verificar estados.
6. Validar entorno y dependencias.
7. Calcular Task Progress real.
8. Identificar la siguiente tarea ejecutable.
9. Marcarla IN_PROGRESS.
10. Implementar según Plan.
11. Ejecutar las validaciones necesarias.
12. Analizar resultados.
13. Clasificar cualquier fallo.
14. Si todo es correcto:
       registrar evidencia;
       marcar COMPLETED.
15. Actualizar Task Progress.
16. Seleccionar la siguiente tarea.
17. Repetir el ciclo hasta completar todas las tareas o quedar BLOCKED (o hasta agotar el cupo N si se invocó en modo por lotes).
18. Ejecutar verificación global final.
19. Actualizar estado global.
20. Informar evidencia y siguiente paso.
```

---

# 56. PUNTO DE DECISIÓN ANTE FALLOS

Cada fallo debe pasar por:

```text
¿Es implementación?
        ↓ Sí → corregir Execution

¿Es Plan?
        ↓ Sí → /sdd-planning

¿Es comportamiento funcional?
        ↓ Sí → /sdd-spec-clarify

¿Es cambio de necesidad?
        ↓ Sí → /sdd-spec-anchored

¿Es regla global?
        ↓ Sí → /sdd-constitution-trial

¿Es entorno?
        ↓ Sí → resolver Setup/Environment
```

---

# 57. REGLA DE NO REGRESIÓN DOCUMENTAL

Execution no debe:

```text
cambiar Spec para justificar código;
cambiar Plan para justificar una implementación fallida;
cambiar Tasks para esconder trabajo pendiente.
```

Los documentos representan decisiones.

El código debe alinearse con ellos, no al revés.

---

# 58. AUDITORÍA FINAL DE EXECUTION

Antes de terminar la ejecución, comprobar:

```text
[ ] Cada tarea ejecutada tiene evidencia.
[ ] Ninguna tarea fue marcada COMPLETED sin verificación.
[ ] El resumen de progreso coincide con las tareas reales.
[ ] No existen tareas imposibles ocultas como completas.
[ ] No existen bloqueos ocultos.
[ ] Los tests requeridos pasan.
[ ] Las regresiones relevantes fueron verificadas.
[ ] El código respeta Spec y Plan.
[ ] Las decisiones nuevas fueron devueltas al nivel correcto.
[ ] No se destruyeron cambios no relacionados.
[ ] El estado global coincide con la situación real.
```

---

# 59. SALIDA FINAL — FEATURE COMPLETADA

Cuando todo esté terminado:

```text
Feature:
[Nombre]

Estado:
COMPLETED

Task Progress:

Total: X
Realizadas: X
Por realizar: 0
Bloqueadas: 0
En progreso: 0
Progreso: 100%

Verificaciones:
- Tests: PASS
- Integration: PASS
- BDD/E2E: PASS
- Lint: PASS
- Type-check: PASS
- Build: PASS

Evidencia:
- ...

Siguiente paso:
La feature está cerrada.
```

Solo mostrar verificaciones que realmente hayan sido ejecutadas.

---

# 60. SALIDA FINAL — EJECUCIÓN PARCIAL

```text
Feature:
[Nombre]

Estado:
IN_PROGRESS

Task Progress:

Total: X
Realizadas: Y
Por realizar: Z
Bloqueadas: 0
En progreso: 0
Progreso: XX%

Última tarea completada:
T...

Siguiente tarea ejecutable:
T...

Evidencia:
...
```

---

# 61. SALIDA FINAL — BLOQUEADA

```text
Feature:
[Nombre]

Estado:
BLOCKED

Task Progress:

Total: X
Realizadas: Y
Por realizar: Z
Bloqueadas: 1
En progreso: 0
Progreso: XX%

Bloqueo:
...

Origen:
Spec / Planning / Constitution / Environment

Acción requerida:
...

Workflow de retorno:
/sdd-spec-clarify
```

o el workflow correspondiente.

---

# 62. REGISTRO DE EVIDENCIA

La evidencia final debe ser suficiente para responder:

```text
¿Qué se cambió?
¿Qué se ejecutó?
¿Qué pasó?
¿Por qué se considera terminado?
```

No es necesario registrar detalles irrelevantes de cada operación interna.

---

# 63. REGLA MAESTRA

> **Execution no interpreta el negocio: lo materializa.**

> **Execution no redefine la arquitectura: la implementa.**

> **Execution no marca tareas por intención: las marca mediante evidencia.**

> **Un fallo no es automáticamente un bug de código; primero debe identificarse dónde reside la decisión incorrecta.**

La cadena completa es:

```text
CONSTITUTION
      ↓
SPEC
      ↓
PLAN
      ↓
TASKS
      ↓
EXECUTION
      ↓
EVIDENCE
```

Y la ejecución operativa:

```text
AUDITAR
   ↓
SELECCIONAR TAREA EJECUTABLE
   ↓
IN_PROGRESS
   ↓
IMPLEMENTAR
   ↓
TESTING
   ↓
VERIFICAR
   ↓
¿ÉXITO?
   ├── NO
   │    ↓
   │  DIAGNOSTICAR
   │    ↓
   │  DEVOLVER AL NIVEL CORRECTO
   │
   └── SÍ
        ↓
     EVIDENCIA
        ↓
     COMPLETED
        ↓
     ACTUALIZAR TASK PROGRESS
        ↓
     SIGUIENTE TAREA
```

La regla final es:

> **Una tarea completada debe poder demostrarse. Una feature completada debe poder demostrarse. Y un problema descubierto durante la ejecución debe regresar al nivel documental donde debe resolverse, nunca ocultarse mediante una modificación oportunista del código o de la documentación.**
