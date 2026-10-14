# SDD-Constitution-Trial: Constitución del Proyecto

Este workflow define la **Constitución global del proyecto** dentro del sistema Spec-Driven Development.

Su objetivo es convertir la visión inicial del usuario en un conjunto explícito, coherente y estable de:

* reglas globales;
* restricciones;
* lenguaje de dominio;
* actores;
* flujos globales;
* decisiones arquitectónicas verdaderamente transversales;
* principios de calidad;
* límites operativos.

La Constitución responde principalmente:

> **¿Qué es el producto, qué reglas globales lo gobiernan y qué límites deben respetarse durante todo su ciclo de vida?**

No debe convertirse en una especificación de features ni en un plan técnico.

---

# 0. REGLA SUPREMA — NUNCA INVENTAR, SUPONER NI OMITIR UNA AMBIGÜEDAD

Esta regla tiene **precedencia absoluta dentro de este workflow**.

La IA **NO DEBE GENERAR, APROBAR NI PRESENTAR COMO DEFINITIVA** una Constitución cuando detecte cualquier punto relevante que esté:

```text
AMBIGUO
INCOMPLETO
CONTRADICTORIO
INCIERTO
INCONSISTENTE
```

si dicho punto puede afectar:

* el alcance;
* el dominio;
* los actores;
* las reglas globales;
* los flujos;
* los datos;
* las relaciones;
* los permisos;
* la seguridad;
* las integraciones;
* la persistencia;
* la arquitectura global;
* las restricciones;
* la interpretación posterior de una feature.

La IA **DEBE PREGUNTAR** antes de continuar.

No está permitido resolver silenciosamente una decisión relevante mediante:

```text
"asumiré que..."
"normalmente..."
"lo habitual sería..."
"por defecto..."
"seguramente..."
```

cuando esa suposición pueda cambiar el significado del sistema.

### Excepción

La IA puede utilizar un supuesto únicamente cuando:

1. no cambia una decisión de negocio;
2. no modifica el alcance;
3. no crea una restricción global;
4. no afecta una decisión crítica;
5. puede resolverse posteriormente sin invalidar la Constitución.

En ese caso debe marcarlo explícitamente como:

```text
SUPUESTO
```

y nunca como:

```text
DECISIÓN
```

---

# 1. OBJETIVO DEL INTERROGATORIO

El objetivo del workflow no es realizar muchas preguntas.

El objetivo es:

> **Descubrir y eliminar la máxima ambigüedad con la mínima cantidad de preguntas necesarias.**

La IA debe pensar primero en términos de **decisiones**, no de preguntas.

Debe identificar:

```text
¿Qué necesito saber?
¿Por qué lo necesito?
¿Qué otras decisiones dependen de ello?
¿Puedo agrupar varias ambigüedades en una sola pregunta?
¿La respuesta cambiará algo importante?
```

Solo después debe formular las preguntas.

---

# 2. REGLA DE PREGUNTAS MÍNIMAS DE ALTO IMPACTO

La IA debe optimizar las preguntas mediante:

```text
IMPACTO
×
DEPENDENCIAS
×
RIESGO DE CONTRADICCIÓN
```

Una pregunta tiene alta prioridad cuando su respuesta afecta varias decisiones posteriores.

Ejemplo:

```text
"¿Quién puede realizar la venta?"
```

puede determinar simultáneamente:

```text
roles
permisos
flujo
auditoría
propiedad de datos
```

Por tanto, es preferible preguntar esto primero que realizar cinco preguntas separadas sobre esos efectos.

### Regla

> **Una pregunta debe resolver, cuando sea posible, varias incertidumbres relacionadas sin mezclar decisiones independientes.**

No debe hacerse una pregunta excesivamente amplia que permita múltiples interpretaciones.

---

# 3. NUNCA PREGUNTAR POR DETALLES QUE PERTENECEN A OTRA FASE

Antes de formular una pregunta, la IA debe determinar si realmente corresponde a Constitución.

## Pertenece a Constitution

```text
misión;
alcance global;
actores globales;
lenguaje de dominio;
flujos globales;
restricciones transversales;
stack obligatorio;
dependencias externas obligatorias;
principios de seguridad;
políticas globales;
restricciones operativas;
decisiones arquitectónicas de alcance global.
```

## Pertenece a Spec

```text
qué ocurre en una feature;
reglas de negocio específicas;
validaciones;
estados funcionales;
criterios de aceptación;
casos borde;
comportamiento observable.
```

## Pertenece a Planning

```text
clases;
controladores;
repositorios;
endpoints;
ORM;
estructura física;
patrones;
migraciones;
índices;
colas;
timeouts concretos;
estrategia interna de persistencia.
```

## Pertenece a Tasks

```text
orden exacto de implementación;
tareas;
dependencias de trabajo;
criterios operativos de completion.
```

### Regla

> **No preguntar en Constitution algo que pueda resolverse correctamente en una fase posterior sin comprometer decisiones globales.**

Esto evita convertir la entrevista constitucional en un cuestionario innecesariamente grande.

---

# 4. DETECCIÓN OBLIGATORIA DE AMBIGÜEDAD

Antes de generar la Constitución, la IA debe analizar cada dimensión relevante buscando:

### Ambigüedad

Ejemplo:

```text
"Los administradores gestionan usuarios."
```

Pregunta:

```text
¿Qué significa gestionar?
¿Crear, modificar, desactivar, eliminar o todas?
```

### Incompletitud

Ejemplo:

```text
"El sistema tendrá clientes y vendedores."
```

Falta determinar:

```text
¿Existe algún otro actor global?
¿Los clientes están autenticados?
¿Los vendedores pertenecen a una organización?
```

Solo deben preguntarse los puntos cuya ausencia tenga impacto real.

### Contradicción

Ejemplo:

```text
"Los clientes pueden modificar pedidos."

y posteriormente:

"Los pedidos, una vez creados, son inmutables."
```

La IA debe detener la generación y preguntar cuál regla prevalece.

### Inconsistencia terminológica

Ejemplo:

```text
Cliente
Usuario
Comprador
```

si parecen representar el mismo concepto.

La IA debe preguntar si:

```text
son conceptos diferentes
```

o:

```text
son nombres distintos para el mismo concepto.
```

---

# 5. PROTOCOLO OBLIGATORIO DE ENTREVISTA

El workflow se ejecuta en dos tiempos.

```text
TIEMPO 1
Auditoría + detección de decisiones
        ↓
Clasificación de ambigüedades
        ↓
Optimización de preguntas
        ↓
Preguntas
        ↓
STOP OBLIGATORIO

TIEMPO 2
Procesar respuestas
        ↓
Reauditar
        ↓
¿Quedan ambigüedades relevantes?
        ↓
Sí → volver a preguntar
No → generar Constitución
```

### Regla crítica

> **Después de cada respuesta del usuario, la IA debe volver a auditar la consistencia global antes de generar la Constitución.**

Una respuesta puede resolver una duda y crear otra.

---

# 6. NO EXISTE UN NÚMERO FIJO DE RONDAS

El límite de preguntas es por **eficiencia**, no por obligación.

La IA debe evitar:

```text
20 preguntas irrelevantes
```

pero tampoco debe limitarse artificialmente a:

```text
2 preguntas
```

si todavía existe una ambigüedad crítica.

Regla:

> **Preguntar lo mínimo necesario, pero todas las veces necesarias para alcanzar una Constitución suficientemente determinada.**

Como referencia, cada ronda debería contener aproximadamente:

```text
2–4 preguntas
```

cuando sea posible.

Si solo existe una ambigüedad crítica:

```text
1 pregunta
```

es suficiente.

---

# 7. PRIORIZACIÓN DE PREGUNTAS

Orden obligatorio de prioridad:

```text
P0 — Contradicciones
P1 — Ambigüedades que bloquean el dominio
P2 — Decisiones que cambian el alcance
P3 — Decisiones globales de alto impacto
P4 — Dependencias entre decisiones
P5 — Restricciones importantes
P6 — Claridad conceptual
P7 — Detalles no bloqueantes
```

Nunca debe preguntar primero una cuestión P7 mientras exista una P0–P3 sin resolver.

---

# 8. AGRUPACIÓN INTELIGENTE DE PREGUNTAS

Cuando varias incertidumbres dependen de una misma decisión, la IA debe agruparlas.

### Mala estrategia

```text
¿Puede un cliente cancelar?
¿Puede un administrador cancelar?
¿Puede un vendedor cancelar?
¿Puede alguien más cancelar?
```

### Mejor estrategia

```text
¿Qué actores pueden cancelar una operación?

A) Solo quien la creó
B) Ciertos roles autorizados
C) Cualquier actor con acceso
D) Otro comportamiento
```

La respuesta permite derivar varias reglas relacionadas.

### Pero:

No deben combinarse en una misma pregunta decisiones independientes.

Evitar:

```text
¿Qué roles pueden cancelar y además qué base de datos
quieres y qué arquitectura prefieres?
```

porque mezcla:

```text
negocio
+
arquitectura
```

---

# 9. OPCIONES DE RESPUESTA

Cuando una decisión sea necesaria, la IA puede proporcionar opciones para acelerar la respuesta.

Las opciones deben ser:

* neutrales;
* mutuamente comprensibles;
* suficientemente completas;
* basadas en comportamientos, no en preferencias de implementación.

Ejemplo correcto:

```text
¿Puede una venta eliminarse después de ser confirmada?

A) Sí
B) No
C) No se elimina, pero puede anularse
D) Depende de su estado
E) Otro comportamiento
```

Ejemplo incorrecto para Constitution:

```text
¿Quieres usar soft delete con Laravel Eloquent
o DELETE CASCADE?
```

Eso pertenece a Planning.

---

# 10. RECOMENDACIONES DE LA IA

La IA puede hacer recomendaciones, pero debe diferenciarlas claramente de las decisiones del usuario.

Formato:

```text
Recomendación técnica:
...

Motivo:
...

Decisión requerida:
...
```

Nunca debe escribir:

```text
(Recommended)
```

como si esa opción fuese automáticamente la elegida por el negocio.

La recomendación es una ayuda para decidir.

La decisión final debe quedar explícita.

---

# 11. TIEMPO 1 — AUDITORÍA

Cuando el usuario invoque:

```text
/sdd-constitution-trial
```

la IA debe:

### Paso 1 — Auditar

Revisar:

```text
AGENTS.md
docs/constitution.md    si existe
```

y consultar documentación existente relevante cuando sea necesario.

### Paso 2 — Extraer decisiones existentes

Clasificar cada decisión como:

```text
CONFIRMADA
AMBIGUA
CONTRADICTORIA
INCOMPLETA
OBSOLETA
PENDIENTE
```

### Paso 3 — Evaluar las cinco dimensiones

```text
1. Flujo global
2. Datos y persistencia conceptual
3. Hardware / APIs / dependencias
4. Resiliencia / conectividad
5. Restricciones
```

### Paso 4 — Detectar dependencias

Identificar qué decisiones dependen de otras.

Ejemplo:

```text
Actor
 ↓
Permiso
 ↓
Operación
 ↓
Flujo
```

La IA debe resolver primero la decisión superior.

### Paso 5 — Optimizar preguntas

Reducir el conjunto de preguntas a la **mínima cantidad que cubra las ambigüedades relevantes**.

### Paso 6 — Preguntar

Presentar las preguntas de mayor impacto primero.

### Paso 7 — DETENERSE

Después de formular preguntas pendientes, la IA **NO debe generar la Constitución definitiva**.

Debe esperar las respuestas.

---

# 12. TIEMPO 2 — REAUDITORÍA OBLIGATORIA

Después de recibir respuestas, la IA no debe escribir inmediatamente el archivo.

Primero debe volver a ejecutar mentalmente la auditoría completa:

```text
¿La respuesta resolvió la ambigüedad?

¿Creó alguna contradicción?

¿Afecta otra decisión?

¿Ahora falta una nueva decisión imprescindible?

¿Existe una terminología inconsistente?

¿El flujo global sigue siendo coherente?
```

### Si queda alguna ambigüedad relevante:

```text
NO GENERAR CONSTITUCIÓN DEFINITIVA
```

y realizar otra ronda de preguntas.

### Solo cuando no existan bloqueos relevantes:

```text
GENERAR / ACTUALIZAR docs/constitution.md
```

---

# 13. CRITERIO DE "SUFICIENTEMENTE DEFINIDA"

La Constitución no necesita responder cada detalle del proyecto.

Se considera suficientemente definida cuando:

1. la misión está clara;
2. el alcance global es comprensible;
3. los actores principales están identificados;
4. el vocabulario del dominio es consistente;
5. el flujo global puede entenderse;
6. las restricciones globales importantes están resueltas;
7. las dependencias externas relevantes están identificadas;
8. las reglas globales importantes están claras;
9. no existen contradicciones conocidas;
10. no existen decisiones críticas pendientes que deban pertenecer a Constitution;
11. las decisiones restantes pueden trasladarse correctamente a Spec o Planning.

### Regla

> **No buscar perfección; buscar ausencia de ambigüedades relevantes.**

---

# 14. LO QUE NO DEBE BLOQUEAR CONSTITUTION

La IA no debe detener la Constitución por detalles que correspondan naturalmente a fases posteriores.

Ejemplos:

```text
nombre exacto del controlador;
estructura de carpetas;
nombre del DTO;
ORM específico de una feature;
estructura exacta de una tabla;
query SQL;
endpoint concreto;
componente visual;
orden de tareas.
```

Estos deben trasladarse a:

```text
Spec
Planning
Tasks
```

según corresponda.

---

# 15. LAS CINCO DIMENSIONES DE DESCUBRIMIENTO

## 15.1 Macro Flujo End-to-End

Determinar:

```text
¿Qué problema resuelve el producto?

¿Cuál es su proceso principal?

¿Qué actores participan?

¿Cuál es la entrada?

¿Cuál es el resultado principal?

¿Qué estados globales existen?
```

No especificar implementación.

---

## 15.2 Datos y Persistencia Conceptual

Determinar:

```text
¿Qué entidades/conceptos son centrales?

¿Qué relaciones son conceptualmente importantes?

¿Qué información debe persistir?

¿Qué información es temporal?

¿Qué datos dependen de otros?
```

No convertir esto en diseño de base de datos.

---

## 15.3 Hardware, APIs y Dependencias

Determinar:

```text
¿Qué sistemas externos son indispensables?

¿Qué hardware participa?

¿Qué servicios de terceros forman parte del producto?

¿Qué restricciones globales existen sobre ellos?
```

No definir aquí SDKs ni clases.

---

## 15.4 Resiliencia y Conectividad

Determinar si el sistema requiere políticas globales respecto a:

```text
offline;
conectividad intermitente;
reintentos;
duplicados;
fallos externos;
recuperación;
consistencia.
```

Documentar el comportamiento global, no la implementación.

---

## 15.5 Restricciones Globales

Determinar:

```text
tecnología obligatoria;
plataforma;
seguridad;
privacidad;
legislación;
infraestructura;
rendimiento;
compatibilidad;
costos;
restricciones institucionales.
```

---

# 16. ESTRUCTURA DE `docs/constitution.md`

Una vez resueltas las decisiones necesarias, la Constitución debe utilizar esta estructura:

```text
# Constitution

Status: APPROVED | DRAFT | NEEDS_CLARIFICATION | SUPERSEDED

## 1. Mission and Domain

## 2. Global Scope

## 3. Ubiquitous Language

## 4. Actors and Global Roles

## 5. Global E2E Flow

## 6. Conceptual Data Model

## 7. Global Technology and Architecture Constraints

## 8. External Integrations and Dependencies

## 9. Resilience, Connectivity and Integrity

## 10. Non-Negotiable Principles

## 11. Global Constraints

## 12. Decisions

## 13. Assumptions

## 14. Pending Decisions

## 15. Exceptions

## 16. Governance and Evolution
```

---

# 17. ESTADO DE LA CONSTITUCIÓN

Estados permitidos:

```text
DRAFT
IN_REVIEW
NEEDS_CLARIFICATION
APPROVED
SUPERSEDED
```

### `NEEDS_CLARIFICATION`

Debe utilizarse si existe cualquier decisión relevante que impida gobernar correctamente el siguiente nivel.

### `APPROVED`

Solo puede establecerse cuando la auditoría final no detecte ambigüedades relevantes que pertenezcan a Constitution.

`APPROVED` **no significa que todo el sistema esté especificado**.

Significa:

> La Constitución contiene suficiente información global para comenzar Specification de forma segura.

---

# 18. DECISIONES, SUPUESTOS Y PENDIENTES

## DECISIÓN

Adoptada explícitamente.

```text
Decision:
El sistema utilizará ...
Reason:
...
```

## SUPUESTO

Necesario para avanzar, pero no constituye una regla de negocio.

```text
Assumption:
...
Impact:
Low
```

## PENDIENTE

Requiere una decisión posterior.

```text
Pending:
...
Owner:
Business / Technical
Phase:
Spec / Planning
```

Una IA nunca debe transformar:

```text
SUPUESTO
```

en:

```text
DECISIÓN
```

sin confirmación.

---

# 19. CONTRADICCIONES

Cuando se detecte una contradicción, la IA debe detener la síntesis.

Formato:

```text
### Contradicción detectada

Regla A:
...

Regla B:
...

Conflicto:
...

Pregunta:
¿Cuál debe prevalecer?

A) Regla A
B) Regla B
C) Otra regla
```

No debe elegir arbitrariamente.

---

# 20. TRAZABILIDAD DE DECISIONES

Cuando sea útil, cada decisión importante debe tener un identificador.

```text
DEC-001
DEC-002
DEC-003
```

Esto permite que futuras fases puedan referirse a ellas:

```text
Spec
→ DEC-003

Planning
→ DEC-003
```

La trazabilidad ayuda especialmente cuando una decisión constitucional afecta numerosas features.

---

# 21. NO DUPLICAR DECISIONES EN NIVELES INFERIORES

Una decisión global ya establecida en Constitution no debe volver a preguntarse innecesariamente.

Ejemplo:

```text
Constitution:
El sistema utiliza autenticación X.
```

Planning no debe volver a preguntar:

```text
¿Qué autenticación quieres?
```

solo debe decidir los detalles técnicos que todavía no estén definidos.

La nueva fase debe **heredar**, no reiniciar decisiones ya tomadas.

---

# 22. PROTOCOLO DE CONFLICTO CON DOCUMENTACIÓN EXISTENTE

Si existe información previa que contradice una nueva propuesta, la IA debe:

1. detectar el conflicto;
2. identificar las fuentes;
3. no elegir silenciosamente;
4. preguntar únicamente por la resolución necesaria;
5. actualizar la fuente correspondiente después de la decisión.

Nunca debe asumir que lo más reciente es automáticamente correcto si existe un conflicto de significado.

---

# 23. CRITERIO DE EFICIENCIA DE LA ENTREVISTA

Una entrevista constitucional se considera eficiente cuando:

```text
MINIMIZA:
preguntas redundantes
preguntas cosméticas
preguntas técnicas prematuras
preguntas cuya respuesta no cambia nada

MAXIMIZA:
claridad
cobertura
consistencia
decisiones reutilizables
trazabilidad
```

La IA debe preferir:

```text
1 pregunta que resuelve 4 dependencias
```

sobre:

```text
4 preguntas independientes
```

siempre que las decisiones puedan responderse razonablemente juntas.

---

# 24. REGLA DE ÚLTIMA AUDITORÍA

Antes de guardar:

```text
docs/constitution.md
```

la IA debe comprobar:

```text
[ ] ¿La misión está clara?
[ ] ¿El alcance está claro?
[ ] ¿Los actores están claros?
[ ] ¿El lenguaje de dominio es consistente?
[ ] ¿El flujo global es entendible?
[ ] ¿Las restricciones globales están resueltas?
[ ] ¿Las integraciones relevantes están identificadas?
[ ] ¿Existen contradicciones?
[ ] ¿Existen decisiones críticas pendientes?
[ ] ¿Se inventó alguna regla?
[ ] ¿Se convirtió algún supuesto en decisión?
[ ] ¿Se incluyeron detalles que pertenecen a Spec?
[ ] ¿Se incluyeron detalles que pertenecen a Planning?
[ ] ¿La Constitución puede gobernar correctamente la siguiente fase?
```

### Regla de bloqueo final

> **Si cualquiera de las respuestas críticas anteriores es "NO" o "SÍ existe un conflicto", no marcar `APPROVED` y no avanzar silenciosamente.**

---

# 25. ACCIÓN EXACTA DEL WORKFLOW

Al ejecutar:

```text
/sdd-constitution-trial
```

la IA debe seguir obligatoriamente:

```text
1. Leer el contexto disponible.
2. Auditar Constitution existente.
3. Auditar acuerdos relevantes de AGENTS.md y documentación existente.
4. Detectar decisiones, dependencias, ambigüedades, incompletitudes y contradicciones.
5. Separar decisiones de negocio, decisiones globales y decisiones técnicas posteriores.
6. Priorizar las incertidumbres por impacto.
7. Agrupar preguntas relacionadas.
8. Formular la mínima cantidad de preguntas necesarias.
9. NO generar Constitución definitiva.
10. Esperar respuesta.
11. Procesar las respuestas.
12. Reauditar todo el modelo.
13. Repetir preguntas si aún existe una ambigüedad relevante.
14. Solo cuando el resultado sea coherente, generar/actualizar:
       docs/constitution.md
15. Ejecutar la auditoría final.
16. Asignar el estado correcto.
17. Informar qué decisiones quedaron consolidadas.
18. Informar qué cuestiones fueron deliberadamente trasladadas a Spec o Planning.
19. Indicar el siguiente workflow.
```

---

# 26. SALIDA FINAL

Cuando la Constitución esté correctamente aprobada:

```text
Se ha actualizado:

docs/constitution.md

Estado:
APPROVED

Decisiones globales consolidadas:
- ...
- ...
- ...

Decisiones trasladadas a Specification:
- ...
- ...

Decisiones trasladadas a Planning:
- ...
- ...

Siguiente paso:
 /sdd-spec-high
```

Cuando todavía existan ambigüedades:

```text
Estado:
NEEDS_CLARIFICATION

No se ha aprobado la Constitución.

Decisiones pendientes:
- ...
- ...

Preguntas necesarias:
1. ...
2. ...

El workflow queda detenido hasta resolverlas.
```

---

# 27. REGLA MAESTRA

> **La IA no debe intentar parecer completa; debe asegurarse de que la Constitución sea realmente correcta.**

> **Cuando exista una ambigüedad relevante, preguntar es obligatorio. Cuando no exista, no preguntar innecesariamente.**

La finalidad de `/sdd-constitution-trial` es producir una base suficientemente clara y consistente para que las siguientes fases puedan trabajar sin inventar decisiones fundamentales.

```text
AUDITAR
   ↓
DETECTAR
   ↓
PRIORIZAR
   ↓
PREGUNTAR
   ↓
ESPERAR
   ↓
REANALIZAR
   ↓
¿SIGUE EXISTIENDO AMBIGÜEDAD?
   ├── SÍ → PREGUNTAR DE NUEVO
   │
   └── NO
        ↓
     SINTETIZAR
        ↓
     VALIDAR
        ↓
     APPROVED
```

La Constitución solo debe avanzar cuando el sistema tenga una base global **explícita, coherente, trazable y suficientemente determinada** para comenzar la Specification.
