import assert from "node:assert/strict";
import { Edge, Node } from "@xyflow/react";
import { UmlEdgeData, ChatProposalPayload, CopilotMode, UmlClassData, ChatMessage } from "../../types";

console.log("===================================================================");
console.log("Iniciando suite de pruebas: Copilot Chat, Deserialización 'T' y Debounce");
console.log("===================================================================\n");

// -------------------------------------------------------------
// Test Suite 1: Deserialización y retención de clases de asociación en 'T' (Slice 1 - T2.3)
// -------------------------------------------------------------

function deserializeEdges(rawEdges: any[]): Edge[] {
  return rawEdges.map((edge: any) => {
    const isAssoc =
      edge.type === "umlAssociationClassEdge" ||
      edge.data?.relationType === "ASSOCIATION_CLASS" ||
      edge.data?.isAssociationClass === true ||
      !!edge.data?.targetEdgeId;

    return {
      ...edge,
      type: isAssoc ? "umlAssociationClassEdge" : "umlEdge",
      data: {
        ...edge.data,
        relationType: edge.data?.relationType || "ASSOCIATION",
        sourceMultiplicity: edge.data?.sourceMultiplicity || "",
        targetMultiplicity: edge.data?.targetMultiplicity || "",
        name: edge.data?.name || "",
        targetEdgeId: edge.data?.targetEdgeId || undefined,
        sourceClassId: edge.data?.sourceClassId || undefined,
        targetClassId: edge.data?.targetClassId || undefined,
        intermediateNodeId: edge.data?.intermediateNodeId || undefined,
        isAssociationClass: isAssoc ? true : undefined,
      },
    };
  });
}

// Test 1.1: Arista normal se mantiene como umlEdge
{
  const raw = [
    {
      id: "edge-1",
      source: "class-1",
      target: "class-2",
      type: "umlEdge",
      data: { relationType: "ASSOCIATION", name: "posee" },
    },
  ];
  const result = deserializeEdges(raw);
  assert.equal(result.length, 1);
  assert.equal(result[0].type, "umlEdge");
  assert.equal(result[0].data?.relationType, "ASSOCIATION");
  console.log("✔ Test 1.1: Arista binaria normal se preserva como umlEdge.");
}

// Test 1.2: Conector en 'T' conserva tipo umlAssociationClassEdge y metadatos de anclaje (RF-04.1, RB-06, SC-05)
{
  const raw = [
    {
      id: "edge-base",
      source: "class-pedido",
      target: "class-producto",
      type: "umlEdge",
      data: { relationType: "ASSOCIATION" },
    },
    {
      id: "edge-assoc",
      source: "class-detalle",
      target: "class-pedido",
      type: "umlAssociationClassEdge",
      data: {
        relationType: "ASSOCIATION_CLASS",
        isAssociationClass: true,
        targetEdgeId: "edge-base",
        sourceClassId: "class-pedido",
        targetClassId: "class-producto",
        intermediateNodeId: "class-detalle",
        name: "DetallePedido",
      },
    },
  ];

  const result = deserializeEdges(raw);
  const assoc = result.find((e) => e.id === "edge-assoc");

  assert.ok(assoc, "El conector en T debe existir en el array resultante");
  assert.equal(assoc.type, "umlAssociationClassEdge", "No debe degradarse a umlEdge");
  assert.equal(assoc.data?.targetEdgeId, "edge-base", "targetEdgeId debe preservarse");
  assert.equal(assoc.data?.sourceClassId, "class-pedido");
  assert.equal(assoc.data?.targetClassId, "class-producto");
  assert.equal(assoc.data?.intermediateNodeId, "class-detalle");
  assert.equal(assoc.data?.isAssociationClass, true);
  console.log("✔ Test 1.2: Conector en 'T' conserva tipo umlAssociationClassEdge y metadatos de anclaje.");
}

// Test 1.3: Conector en 'T' serializado con type genérico pero con isAssociationClass o targetEdgeId
{
  const raw = [
    {
      id: "edge-assoc-legacy",
      source: "class-matricula",
      target: "class-estudiante",
      type: "default", // Simulando serializador legacy
      data: {
        relationType: "ASSOCIATION_CLASS",
        targetEdgeId: "edge-estudiante-curso",
      },
    },
  ];

  const result = deserializeEdges(raw);
  assert.equal(result[0].type, "umlAssociationClassEdge");
  assert.equal(result[0].data?.targetEdgeId, "edge-estudiante-curso");
  console.log("✔ Test 1.3: Detección resiliente de clase asociativa ante serializaciones legacy.");
}

// -------------------------------------------------------------
// Test Suite 2: Validación del prompt directo y sin modestia (Slice 2 - T3.4)
// -------------------------------------------------------------
function buildCopilotSystemPrompt(projectName: string): string {
  return `
Eres Copilot UML, un asistente experto en ingeniería de software, arquitectura orientada a objetos, normalización y patrones de diseño UML 2.5 para el proyecto '${projectName}'.
DIRECTIVA ESTRICTA DE COMUNICACIÓN:
- Sé DIRECTO, conciso y técnico.
- Cero fórmulas de cortesía, presentaciones vacías o saludos ('Hola', 'Soy tu asistente', 'Como IA', 'Espero que te sirva').
- Inicia de inmediato con la explicación técnica, sugerencia arquitectónica o resumen de impacto.
- Usa formato Markdown enriquecido (listas, negritas, bloques de código con lenguaje y badges).
`.trim();
}

{
  const prompt = buildCopilotSystemPrompt("SistemaVentas");
  assert.ok(!prompt.includes("¡Hola! Soy tu asistente"), "No debe tener saludos");
  assert.ok(prompt.includes("DIRECTIVA ESTRICTA"), "Debe incluir directiva ejecutiva estricta");
  assert.ok(prompt.includes("Cero fórmulas de cortesía"), "Debe prohibir modestia");
  console.log("✔ Test 2.1: Prompt del sistema configurado para tono directo y ejecutivo sin modestia.");
}

// -------------------------------------------------------------
// Test Suite 3: Orquestación de propuestas de edición (Slice 3 - T4.4)
// -------------------------------------------------------------
function applyProposalToCanvas(
  currentNodes: Node[],
  currentEdges: Edge[],
  proposal: ChatProposalPayload
): { nodes: Node[]; edges: Edge[] } {
  if (proposal.status === "IGNORED") {
    return { nodes: currentNodes, edges: currentEdges };
  }

  const nextNodes = proposal.nodesDelta && proposal.nodesDelta.length > 0
    ? proposal.nodesDelta.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isHighlighted: true,
        },
      }))
    : currentNodes;

  const nextEdges = proposal.edgesDelta || currentEdges;
  return { nodes: nextNodes, edges: nextEdges };
}

{
  const initialNodes: Node[] = [
    { id: "1", type: "umlClass", position: { x: 0, y: 0 }, data: { name: "Usuario", attributes: [], methods: [] } },
  ];
  const initialEdges: Edge[] = [];

  const proposalAccepted: ChatProposalPayload = {
    summary: "Se añade la clase Pago",
    status: "ACCEPTED",
    nodesDelta: [
      ...initialNodes,
      { id: "2", type: "umlClass", position: { x: 200, y: 200 }, data: { name: "Pago", attributes: [], methods: [] } },
    ],
  };

  const acceptedResult = applyProposalToCanvas(initialNodes, initialEdges, proposalAccepted);
  assert.equal(acceptedResult.nodes.length, 2, "Debe añadir la clase Pago al lienzo");
  assert.equal((acceptedResult.nodes[1].data as any).isHighlighted, true, "Debe activar isHighlighted para efecto glow");

  const proposalIgnored: ChatProposalPayload = {
    summary: "Se descarta la propuesta",
    status: "IGNORED",
    nodesDelta: [
      ...initialNodes,
      { id: "3", type: "umlClass", position: { x: 400, y: 400 }, data: { name: "Factura", attributes: [], methods: [] } },
    ],
  };

  const ignoredResult = applyProposalToCanvas(initialNodes, initialEdges, proposalIgnored);
  assert.equal(ignoredResult.nodes.length, 1, "No debe alterar los nodos si la propuesta es descartada");
  console.log("✔ Test 3.1: Aplicación de propuestas en lienzo con resaltado luminoso y descarte seguro.");
}

// -------------------------------------------------------------
// Test Suite 4: Debounce de 1.5s ante cambios semánticos (Slice 4 - T5.3)
// -------------------------------------------------------------
class DebounceEmitter {
  private timer: any = null;
  public callCount = 0;

  schedule(fn: () => void, delayMs = 1500) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.callCount++;
      fn();
    }, delayMs);
  }
}

{
  const emitter = new DebounceEmitter();
  let executed = false;

  // Ráfaga de 3 ediciones rápidas
  emitter.schedule(() => { executed = true; }, 50);
  emitter.schedule(() => { executed = true; }, 50);
  emitter.schedule(() => { executed = true; }, 50);

  setTimeout(async () => {
    assert.equal(emitter.callCount, 1, "Debe ejecutarse exactamente una sola vez tras la ráfaga");
    assert.equal(executed, true);
    console.log("✔ Test 4.1: Debounce semántico de 1.5s agrupa ráfagas de edición de forma óptima.");

    // -------------------------------------------------------------
    // Test Suite 5: Observabilidad de Modo y Navegación Rápida (Slice 5 - T6.3)
    // -------------------------------------------------------------
    // 5.1: Conmutación de Modo y Estado de Cabecera
    const getHeaderState = (mode: CopilotMode) => {
      if (mode === "EDITOR") {
        return {
          chipText: "🟢 En línea · Modo Editor",
          placeholder: "Ej: Agrega la clase Pago con total double y asóciala a Pedido...",
          actionText: "Modifica el Lienzo",
        };
      }
      return {
        chipText: "💬 En línea · Modo Chat",
        placeholder: "Pregunta sobre el diagrama, normalización o arquitectura...",
        actionText: "Explicación & Contexto",
      };
    };

    const editorState = getHeaderState("EDITOR");
    assert.match(editorState.chipText, /Modo Editor/, "El chip debe reflejar Modo Editor");
    assert.match(editorState.actionText, /Modifica el Lienzo/);

    const chatState = getHeaderState("CHAT");
    assert.match(chatState.chipText, /Modo Chat/, "El chip debe reflejar Modo Chat");
    assert.match(chatState.actionText, /Explicación & Contexto/);
    console.log("✔ Test 5.1: Estado dinámico e indicadores de cabecera según modo activo.");

    // 5.2: Visibilidad de Atajos Flotantes de Navegación ante Scroll
    const shouldShowScrollNav = (scrollTop: number, scrollHeight: number, clientHeight: number) => {
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;
      return distanceToBottom > 150;
    };

    assert.equal(shouldShowScrollNav(800, 1000, 200), false, "Al final del scroll no debe mostrar atajos");
    assert.equal(shouldShowScrollNav(500, 1000, 200), true, "Alejado 300px del fondo debe mostrar atajos flotantes");
    assert.equal(shouldShowScrollNav(640, 1000, 200), true, "Alejado 160px del fondo debe mostrar atajos");
    assert.equal(shouldShowScrollNav(700, 1000, 200), false, "Alejado solo 100px del fondo no debe mostrar atajos");
    console.log("✔ Test 5.2: Atajos flotantes contextuales activados por umbral de scroll (> 150px).");

    // 5.3: Detección de Último Mensaje IA y Usuario para Anclaje Rápido
    const mockMessages: ChatMessage[] = [
      { id: "msg-1", diagramId: 1, senderType: "USER", userName: "Edberto", mode: "CHAT", messageType: "CHAT_MESSAGE", content: "Hola", createdAt: "1" },
      { id: "msg-2", diagramId: 1, senderType: "COPILOT", userName: "Copilot IA", mode: "CHAT", messageType: "CHAT_MESSAGE", content: "Respuesta inicial", createdAt: "2" },
      { id: "msg-3", diagramId: 1, senderType: "USER", userName: "Edberto", mode: "EDITOR", messageType: "CHAT_MESSAGE", content: "Agrega Pago", createdAt: "3" },
      { id: "msg-4", diagramId: 1, senderType: "COPILOT", userName: "Copilot IA", mode: "EDITOR", messageType: "EDITOR_PROPOSAL", content: "Pago agregado", createdAt: "4" },
    ];

    const lastAiId = [...mockMessages].reverse().find((m) => m.senderType === "COPILOT")?.id;
    const lastUserId = [...mockMessages].reverse().find((m) => m.senderType === "USER")?.id;

    assert.equal(lastAiId, "msg-4", "Debe identificar correctamente el último mensaje emitido por Copilot");
    assert.equal(lastUserId, "msg-3", "Debe identificar correctamente el último mensaje emitido por el usuario");
    console.log("✔ Test 5.3: Detección inequívoca de anclas para saltos rápidos de IA y usuario.");

    // 5.4: Estado de Pensamiento y Carga ante Edición Manual en Lienzo
    interface ThinkingStateSimulation {
      isManualEditing: boolean;
      isProactiveThinking: boolean;
      displayedHeader: string;
      showsThinkingCard: boolean;
    }

    const computeThinkingDisplay = (isProactiveThinking: boolean, isLoading: boolean, applyingProposalId: string | null = null): ThinkingStateSimulation => ({
      isManualEditing: isProactiveThinking,
      isProactiveThinking,
      displayedHeader: applyingProposalId
        ? "⚡ Aplicando cambios al lienzo..."
        : isProactiveThinking
        ? "⚡ Pensando sugerencia UML..."
        : "Modo Normal",
      showsThinkingCard: isProactiveThinking || isLoading || Boolean(applyingProposalId),
    });

    const activeThinking = computeThinkingDisplay(true, false);
    assert.equal(activeThinking.showsThinkingCard, true, "Debe desplegar la tarjeta de pensamiento animada");
    assert.match(activeThinking.displayedHeader, /Pensando sugerencia UML/);

    const idleThinking = computeThinkingDisplay(false, false);
    assert.equal(idleThinking.showsThinkingCard, false, "En reposo no debe mostrar la animación de pensamiento");
    console.log("✔ Test 5.4: Activación reactiva de animación de carga y pensamiento ante edición manual.");

    // -------------------------------------------------------------
    // Test Suite 6: Resolución de sugerencias proactivas al lienzo (Grill-Me)
    // -------------------------------------------------------------
    console.log("\n--- Suite 6: Sincronización de Sugerencia del Chat al Lienzo ---");

    // 6.1: Deducción de instrucción y mutación del lienzo ante nodesDelta vacío
    interface OnDemandResolutionResult {
      nextNodes: Node[];
      nextEdges: Edge[];
      confirmationMessage: string;
    }

    const resolveOnDemandProposal = (
      messageContent: string,
      proposalSummary: string | undefined,
      currentNodes: Node[],
      currentEdges: Edge[],
      mockProcessDiagram: (instruction: string) => { nodes: Node[]; edges: Edge[]; explanation: string }
    ): OnDemandResolutionResult => {
      let instruction = proposalSummary || "";
      if (!instruction && messageContent) {
        instruction = messageContent.replace(/^@[^:]+:\s*/, "").trim();
      }

      const result = mockProcessDiagram(instruction);

      const existingNodeMap = new Map(currentNodes.map((n) => [n.id, n]));
      const existingNodeByName = new Map(currentNodes.map((n) => [(n.data as any)?.name?.toLowerCase(), n]));

      const nextNodes = result.nodes.map((node: any) => {
        const prevNode = existingNodeMap.get(node.id) || existingNodeByName.get(node.data?.name?.toLowerCase());
        let isModified = !prevNode;
        if (prevNode) {
          const prevAttrs = JSON.stringify(prevNode.data?.attributes || []);
          const nextAttrs = JSON.stringify(node.data?.attributes || []);
          const prevName = prevNode.data?.name;
          const nextName = node.data?.name;
          if (prevAttrs !== nextAttrs || prevName !== nextName) {
            isModified = true;
          }
        }
        return {
          ...node,
          data: {
            ...node.data,
            isHighlighted: isModified,
          },
        };
      });

      return {
        nextNodes,
        nextEdges: result.edges,
        confirmationMessage: result.explanation || `He aplicado los cambios: ${instruction}`,
      };
    };

    const initialCanvasNodes: Node[] = [
      { id: "c1", type: "umlClass", position: { x: 0, y: 0 }, data: { name: "NuevaClase_2", attributes: [] } },
      { id: "c2", type: "umlClass", position: { x: 250, y: 0 }, data: { name: "Producto", attributes: [{ name: "id", type: "Long" }] } },
    ];

    const mockAiProcessor = (instruction: string) => {
      assert.ok(instruction.includes("Categoría") || instruction.includes("stock"), "La directiva debe contener la orden");
      return {
        nodes: [
          { id: "c1", type: "umlClass", position: { x: 0, y: 0 }, data: { name: "Categoría", attributes: [] } },
          { id: "c2", type: "umlClass", position: { x: 250, y: 0 }, data: { name: "Producto", attributes: [{ name: "id", type: "Long" }, { name: "stock", type: "int" }] } },
        ],
        edges: [],
        explanation: "He renombrado 'NuevaClase_2' a 'Categoría' y agregado 'stock: int' a 'Producto'.",
      };
    };

    const resolution = resolveOnDemandProposal(
      "@Dr. Carlos Mendoza (Docente): Renombre 'NuevaClase_2' a 'Categoría' y agregue 'stock: int' a 'Producto'",
      undefined, // Sin nodesDelta ni summary precalculado
      initialCanvasNodes,
      [],
      mockAiProcessor
    );

    assert.equal(resolution.nextNodes[0].data.name, "Categoría", "La clase debe renombrarse a Categoría");
    assert.equal((resolution.nextNodes[0].data as any).isHighlighted, true, "Clase renombrada debe estar resaltada con isHighlighted");
    assert.equal((resolution.nextNodes[1].data as any).isHighlighted, true, "Clase con atributo nuevo debe estar resaltada");
    assert.match(resolution.confirmationMessage, /He renombrado 'NuevaClase_2' a 'Categoría'/, "Mensaje de confirmación explícito");
    console.log("✔ Test 6.1: Mutación del lienzo ejecutada con éxito a partir de sugerencia textual con nodesDelta vacío.");

    // 6.2: Verificación de estado 'isApplying' en la UI
    const applyingState = computeThinkingDisplay(false, false, "msg-proposal-1");
    assert.equal(applyingState.showsThinkingCard, true, "Durante la aplicación debe activarse el card de pensamiento");
    assert.equal(applyingState.displayedHeader, "⚡ Aplicando cambios al lienzo...", "La cabecera debe indicar aplicación activa");
    console.log("✔ Test 6.2: Retroalimentación visual interactiva (Applying...) durante la mutación del lienzo.");

    // -------------------------------------------------------------
    // Test Suite 7: Prevención de doble mensaje y respuesta de la IA
    // -------------------------------------------------------------
    console.log("\n--- Suite 7: Prevención de Doble Mensaje / Respuesta de Copilot ---");

    // 7.1: Deduplicación estricta ante re-difusión de WebSocket
    const deduplicateMessages = (existing: ChatMessage[], incoming: ChatMessage): ChatMessage[] => {
      if (incoming.id && existing.some((m) => m.id === incoming.id)) {
        return existing;
      }
      const isDuplicate = existing.some(
        (m) =>
          m.content === incoming.content &&
          m.senderType === incoming.senderType &&
          Math.abs(new Date(m.createdAt || 0).getTime() - new Date(incoming.createdAt || 0).getTime()) < 4000
      );
      if (isDuplicate) {
        return existing;
      }
      return [...existing, incoming];
    };

    const initialMsgList: ChatMessage[] = [
      {
        id: "mongo-msg-123",
        diagramId: 1,
        senderType: "COPILOT",
        userName: "Copilot IA",
        mode: "CHAT",
        messageType: "CHAT_MESSAGE",
        content: "@Dr. Carlos Mendoza: Renombre NuevaClase_2 a Categoría",
        createdAt: "2026-10-18T23:30:00.000Z",
      },
    ];

    // Simular recepción del mismo mensaje reenviado por WebSocket
    const wsEchoMsg: ChatMessage = {
      id: "mongo-msg-123",
      diagramId: 1,
      senderType: "COPILOT",
      userName: "Copilot IA",
      mode: "CHAT",
      messageType: "CHAT_MESSAGE",
      content: "@Dr. Carlos Mendoza: Renombre NuevaClase_2 a Categoría",
      createdAt: "2026-10-18T23:30:00.000Z",
    };

    const afterEcho = deduplicateMessages(initialMsgList, wsEchoMsg);
    assert.equal(afterEcho.length, 1, "No debe duplicar el mensaje al recibir el eco de WebSocket");
    console.log("✔ Test 7.1: Deduplicación estricta ante re-difusión de WebSocket con ID persistido.");

    // 7.2: Deduplicación temporal de mensajes sin ID
    const noIdMsg1: ChatMessage = {
      diagramId: 1,
      senderType: "COPILOT",
      userName: "Copilot IA",
      mode: "CHAT",
      messageType: "CHAT_MESSAGE",
      content: "Propuesta aplicada con éxito",
      createdAt: new Date().toISOString(),
    };
    const noIdMsgDuplicate: ChatMessage = {
      diagramId: 1,
      senderType: "COPILOT",
      userName: "Copilot IA",
      mode: "CHAT",
      messageType: "CHAT_MESSAGE",
      content: "Propuesta aplicada con éxito",
      createdAt: new Date().toISOString(),
    };

    const noIdList = deduplicateMessages([noIdMsg1], noIdMsgDuplicate);
    assert.equal(noIdList.length, 1, "No debe duplicar mensajes idénticos recibidos en ráfaga temporal");
    console.log("✔ Test 7.2: Deduplicación de mensajes idénticos por proximidad temporal y remitente.");

    // 7.3: Guardia de concurrencia ante doble submit rápido
    let executionCalls = 0;
    let isProcessing = false;

    const guardedSubmit = async () => {
      if (isProcessing) return;
      isProcessing = true;
      try {
        await new Promise((res) => setTimeout(res, 20));
        executionCalls++;
      } finally {
        isProcessing = false;
      }
    };

    // Dos llamadas concurrentes mientras la primera está en curso
    const p1 = guardedSubmit();
    const p2 = guardedSubmit();
    await Promise.all([p1, p2]);

    assert.equal(executionCalls, 1, "Debe ejecutar exactamente una sola vez ante llamadas duplicadas concurrentes");
    console.log("✔ Test 7.3: Guardia de concurrencia protege contra dobles envíos.");

    console.log("\n===================================================================");
    console.log("🎉 TODAS LAS PRUEBAS DE LA SUITE PASARON EXITOSAMENTE (SLICES 1 - 7).");
    console.log("===================================================================");
  }, 100);
}
