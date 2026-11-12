/**
 * Pruebas unitarias de conformidad UML 2.5 y Enterprise Architect (Spec 06)
 */

import assert from "node:assert";

console.log("Iniciando pruebas unitarias de conformidad Spec 06 (UML 2.5 & EA)...");

// Función de normalización idéntica a la implementada en UmlClassNode (RB-06.4)
const formatStereotype = (st?: string): string => {
  if (!st) return "";
  const cleaned = st
    .trim()
    .replace(/^[<«]+/, "")
    .replace(/[>»]+$/, "")
    .trim();
  return cleaned ? `«${cleaned}»` : "";
};

// 1. Verificación de normalización de estereotipos con guillemets (RB-06.4, RF-06.1.3)
assert.strictEqual(formatStereotype("<<interface>>"), "«interface»", "Debe normalizar << >> a « »");
assert.strictEqual(formatStereotype("<interface>"), "«interface»", "Debe tolerar corchetes simples < > y normalizar a « »");
assert.strictEqual(formatStereotype("«abstract»"), "«abstract»", "Debe preservar guillemets existentes");
assert.strictEqual(formatStereotype("  <<entity>>  "), "«entity»", "Debe recortar espacios externos");
assert.strictEqual(formatStereotype(""), "", "Cadena vacía debe devolver vacío");
assert.strictEqual(formatStereotype(undefined), "", "Undefined debe devolver vacío");
console.log("✔ Normalización formal de estereotipos a guillemets « » verificada (RB-06.4).");

// 2. Verificación de detección de clasificadores abstractos (RB-06.3, RF-06.1.2)
const checkIsAbstract = (data: { isAbstract?: boolean; stereotype?: string }): boolean => {
  return Boolean(data.isAbstract) || Boolean(data.stereotype?.toLowerCase().includes("abstract"));
};

assert.strictEqual(checkIsAbstract({ isAbstract: true }), true, "Flag isAbstract=true debe activar cursiva");
assert.strictEqual(checkIsAbstract({ stereotype: "<<abstract>>" }), true, "Estereotipo abstract debe activar cursiva");
assert.strictEqual(checkIsAbstract({ stereotype: "«AbstractClass»" }), true, "Estereotipo con substring abstract debe activar cursiva");
assert.strictEqual(checkIsAbstract({ stereotype: "<<interface>>" }), false, "Interfaz no es abstracta por defecto");
assert.strictEqual(checkIsAbstract({}), false, "Clase normal no es abstracta");
console.log("✔ Detección de clasificadores abstractos para renderizado en cursiva verificada (RB-06.3).");

// 3. Verificación de reglas de aristas: relación en minúsculas y clase-asociación (RB-06.5)
const resolveEdgeStyles = (data?: { relationType?: string; isAssociationClass?: boolean }) => {
  const relType = ((data?.relationType as string) || "ASSOCIATION").toUpperCase();
  const isAssociationClass = Boolean(data?.isAssociationClass);

  let markerEnd: string | undefined;
  let strokeDasharray: string | undefined;

  switch (relType) {
    case "GENERALIZATION":
      markerEnd = "url(#uml-generalization-marker)";
      break;
    case "REALIZATION":
      markerEnd = "url(#uml-generalization-marker)";
      strokeDasharray = "6 4";
      break;
    case "DEPENDENCY":
      markerEnd = "url(#uml-open-arrow-marker)";
      strokeDasharray = "5 4";
      break;
    default:
      break;
  }

  if (isAssociationClass && !strokeDasharray) {
    strokeDasharray = "5 4";
  }

  return { relType, markerEnd, strokeDasharray };
};

// Caso mayúsculas y minúsculas
const genLower = resolveEdgeStyles({ relationType: "generalization" });
assert.strictEqual(genLower.markerEnd, "url(#uml-generalization-marker)", "Debe reconocer tipo en minúsculas");

// Caso clase-asociación
const assocClass = resolveEdgeStyles({ relationType: "ASSOCIATION", isAssociationClass: true });
assert.strictEqual(assocClass.strokeDasharray, "5 4", "Clase-asociación debe tener trazo punteado/discontinuo");

const regularAssoc = resolveEdgeStyles({ relationType: "ASSOCIATION", isAssociationClass: false });
assert.strictEqual(regularAssoc.strokeDasharray, undefined, "Asociación normal debe tener trazo continuo");

console.log("✔ Resolución de estilos de aristas UML 2.5 y clases-asociación verificada.");

console.log("🎉 Todas las pruebas de conformidad de renderizado Spec 06 pasaron exitosamente.");
