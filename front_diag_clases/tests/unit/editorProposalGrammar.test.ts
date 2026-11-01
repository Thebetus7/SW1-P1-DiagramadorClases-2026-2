import { ChatMessage, ChatProposalPayload, ProposalStatus } from "../../types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

console.log("Iniciando pruebas unitarias de gramática y ciclo de vida de propuesta en Modo Editor (T2.4)...");

// 1. Verificación de gramática verbal futura obligatoria
const futureProposals = [
  "Voy a agregar la clase Factura con id: int y total: double, y la relacionaré con Pedido.",
  "Voy a conectar la clase Cliente con Cuenta mediante asociación 1 a muchos.",
  "He preparado la siguiente propuesta de edición: voy a normalizar los métodos de autenticación.",
  "Procederé a eliminar la relación redundante entre Usuario y Rol.",
];

const pastProposalsForbidden = [
  "He agregado la clase Factura y se guardaron los cambios.",
  "Se modificaron los atributos de la clase Pedido.",
  "Ya se realizaron los cambios solicitados en el diagrama.",
];

const futurePattern = /\b(voy a|procederé a|he preparado la (siguiente )?propuesta|se propone)\b/i;
const pastForbiddenPattern = /\b(ya se (hizo|hicieron|realizó|realizaron)|se modificaron|se agregaron|he agregado|he aplicado)\b/i;

for (const text of futureProposals) {
  assert(
    futurePattern.test(text),
    `La propuesta '${text}' debe contener expresión de tiempo futuro.`
  );
  assert(
    !pastForbiddenPattern.test(text),
    `La propuesta '${text}' no debe afirmar que ya se hicieron cambios antes de la confirmación.`
  );
}
console.log("✔ Verificación de sintaxis verbal en tiempo futuro aprobada.");

for (const text of pastProposalsForbidden) {
  assert(
    pastForbiddenPattern.test(text),
    `La frase prohibida '${text}' debe ser detectada como incorrecta antes de la confirmación.`
  );
}
console.log("✔ Detección estricta de tiempo pasado prohibido aprobada.");

// 2. Ciclo de vida y transición de estado de propuestas (PENDING -> ACCEPTED / IGNORED)
interface MockProposalMessage extends ChatMessage {
  proposal: ChatProposalPayload;
}

const mockProposalMsg: MockProposalMessage = {
  id: "prop-01",
  diagramId: 10,
  senderType: "COPILOT",
  userName: "Copilot IA",
  mode: "EDITOR",
  messageType: "EDITOR_PROPOSAL",
  content: "Voy a agregar la clase Factura.",
  proposal: {
    summary: "Voy a agregar la clase Factura con atributos id y fecha.",
    status: "PENDING",
  },
  proposalStatus: "PENDING",
  createdAt: new Date().toISOString(),
};

assert(mockProposalMsg.proposalStatus === "PENDING", "El estado inicial debe ser PENDING");

// Transición a ACCEPTED y generación de confirmación
function acceptProposal(msg: MockProposalMessage, userName: string): { updatedMsg: MockProposalMessage; confirmationMsg: ChatMessage } {
  const updatedMsg: MockProposalMessage = {
    ...msg,
    proposalStatus: "ACCEPTED",
    proposal: { ...msg.proposal, status: "ACCEPTED" },
    resolvedByUserName: userName,
  };

  const confirmationMsg: ChatMessage = {
    diagramId: msg.diagramId,
    senderType: "COPILOT",
    userName: "Copilot IA",
    mode: "EDITOR",
    messageType: "CHAT_MESSAGE",
    content: "He aplicado los cambios al lienzo",
    isError: false,
    createdAt: new Date().toISOString(),
  };

  return { updatedMsg, confirmationMsg };
}

const { updatedMsg, confirmationMsg } = acceptProposal(mockProposalMsg, "Edberto");
assert(updatedMsg.proposalStatus === "ACCEPTED", "La propuesta debe quedar en estado ACCEPTED");
assert(confirmationMsg.content === "He aplicado los cambios al lienzo", "Debe emitir confirmación exacta tras aplicar");
assert(confirmationMsg.senderType === "COPILOT", "El emisor de la confirmación debe ser Copilot IA");
console.log("✔ Ciclo de confirmación dual PENDING -> ACCEPTED y emisión de confirmación aprobados.");

// 3. Verificación de ventana deslizante de memoria de hasta 8 mensajes
const historyMessages: ChatMessage[] = [];
for (let i = 1; i <= 15; i++) {
  historyMessages.push({
    id: `m-${i}`,
    diagramId: 10,
    senderType: i % 2 === 0 ? "COPILOT" : "USER",
    userName: i % 2 === 0 ? "Copilot IA" : "Usuario",
    mode: "CHAT",
    messageType: "CHAT_MESSAGE",
    content: `Mensaje número ${i}`,
    createdAt: new Date(Date.now() + i * 1000).toISOString(),
  });
}

const slidingWindow = historyMessages.slice(-8);
assert(slidingWindow.length === 8, "La ventana debe limitar exactamente a 8 mensajes");
assert(slidingWindow[0].id === "m-8", "El primer mensaje de la ventana de 8 debe ser m-8");
assert(slidingWindow[7].id === "m-15", "El último mensaje debe ser m-15");
console.log("✔ Ventana deslizante de memoria contextual de 8 mensajes aprobada.");

console.log("🎉 Todas las pruebas de gramática y ciclo de vida de propuesta pasaron con éxito.");
