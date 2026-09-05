import { Node, Edge } from "@xyflow/react";
import { UmlAttribute, UmlMethod, UmlRelationType, UmlVisibility } from "@/types";

export interface ImportedDiagramData {
  diagramName: string;
  nodes: Node[];
  edges: Edge[];
}

/**
 * Obtiene el valor de un atributo de un elemento XML buscando por nombre exacto o localName (sin namespace)
 */
function getElements(docOrEl: any, tagName: string): Element[] {
  if (!docOrEl || typeof docOrEl.getElementsByTagName !== "function") return [];
  return Array.from(docOrEl.getElementsByTagName(tagName)) as Element[];
}

function getAttr(el: any, ...attrNames: string[]): string | null {
  if (!el || !el.attributes) return null;
  for (const name of attrNames) {
    if (typeof el.hasAttribute === "function" && el.hasAttribute(name)) {
      const val = el.getAttribute(name);
      if (val !== null) return val;
    }
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      if (
        attr.localName?.toLowerCase() === name.toLowerCase() ||
        attr.name?.toLowerCase() === name.toLowerCase() ||
        attr.name?.toLowerCase().endsWith(`:${name.toLowerCase()}`)
      ) {
        return attr.value;
      }
    }
  }
  return null;
}

/**
 * Mapea la visibilidad de Enterprise Architect / XMI a los símbolos estándar UML (+, -, #, ~)
 */
function parseVisibility(vis?: string | null): UmlVisibility {
  if (!vis) return "+";
  const v = vis.toLowerCase().trim();
  if (v === "private" || v === "-") return "-";
  if (v === "protected" || v === "#") return "#";
  if (v === "package" || v === "~") return "~";
  return "+";
}

/**
 * Normaliza y limpia tipos de datos UML / XMI
 */
function parseTypeName(rawType?: string | null): string {
  if (!rawType) return "string";
  const t = rawType.trim();
  const lower = t.toLowerCase();
  if (
    lower === "uml:property" ||
    lower === "property" ||
    lower === "uml:attribute" ||
    lower === "attribute"
  ) {
    return "string";
  }
  if (t.includes("#")) {
    const extracted = t.split("#").pop()?.toLowerCase() || "string";
    return extracted === "string" || extracted === "integer" || extracted === "boolean" || extracted === "unlimitednatural"
      ? (extracted === "unlimitednatural" ? "int" : extracted)
      : extracted;
  }
  if (t.includes("/")) {
    return t.split("/").pop()?.toLowerCase() || "string";
  }
  return t;
}

function getDOMParser(): any {
  if (typeof window !== "undefined" && typeof window.DOMParser !== "undefined") {
    return new window.DOMParser();
  }
  try {
    const { DOMParser: XMLDomParser } = require("@xmldom/xmldom");
    return new XMLDomParser();
  } catch {
    if (typeof DOMParser !== "undefined") {
      return new DOMParser();
    }
    throw new Error("DOMParser no está disponible en este entorno de ejecución.");
  }
}

/**
 * Parsea un archivo XMI 2.1 / XML generado por Enterprise Architect
 * y construye los nodos y aristas para React Flow
 */
export function importEnterpriseArchitectXmi(
  xmlContent: string,
  defaultName: string = "Diagrama Importado"
): ImportedDiagramData {
  const parser = getDOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, "application/xml");

  const parserErrors = xmlDoc.getElementsByTagName("parsererror");
  if (parserErrors && parserErrors.length > 0) {
    throw new Error(
      "El archivo XMI/XML no tiene un formato XML válido o está dañado."
    );
  }

  // 1. Extraer nombre del paquete o diagrama si existe
  let diagramName = defaultName;
  const allPackaged = getElements(xmlDoc, "packagedElement");
  for (const pkg of allPackaged) {
    const typeVal = getAttr(pkg, "type", "xmi:type");
    if (typeVal === "uml:Package" || typeVal === "Package") {
      const nameVal = getAttr(pkg, "name");
      if (nameVal) {
        diagramName = nameVal;
        break;
      }
    }
  }

  // Mapa de IDs XMI (EAID_...) a IDs de nodos generados en el lienzo
  const xmiToNodeId = new Map<string, string>();
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Mapa para guardar geometrías extraídas de la sección <diagrams> de EA
  const geometryMap = new Map<
    string,
    { left: number; top: number; right: number; bottom: number }
  >();

  // Buscar todos los tags <element> dentro de <diagram> o <diagrams>
  const allElementsInDoc = getElements(xmlDoc, "element");
  allElementsInDoc.forEach((el) => {
    const subject = getAttr(el, "subject", "idref", "xmi:idref");
    const geometry = getAttr(el, "geometry");
    if (subject && geometry) {
      const leftMatch = geometry.match(/Left=([-\d]+)/i);
      const topMatch = geometry.match(/Top=([-\d]+)/i);
      const rightMatch = geometry.match(/Right=([-\d]+)/i);
      const bottomMatch = geometry.match(/Bottom=([-\d]+)/i);

      if (leftMatch && topMatch) {
        const left = Math.abs(parseInt(leftMatch[1], 10));
        const top = Math.abs(parseInt(topMatch[1], 10));
        const right = rightMatch ? Math.abs(parseInt(rightMatch[1], 10)) : left + 200;
        const bottom = bottomMatch ? Math.abs(parseInt(bottomMatch[1], 10)) : top + 150;
        geometryMap.set(subject, { left, top, right, bottom });
      }
    }
  });

  // 2. Extraer Clases UML
  // Las clases pueden estar en <packagedElement type="uml:Class"> o en <element type="uml:Class">
  const classElements: Element[] = [];
  allPackaged.forEach((pkg) => {
    const typeVal = getAttr(pkg, "type", "xmi:type");
    if (typeVal === "uml:Class" || typeVal === "Class") {
      classElements.push(pkg);
    }
  });

  // Si no se encontraron en packagedElement, buscar en <elements><element type="uml:Class">
  if (classElements.length === 0) {
    allElementsInDoc.forEach((el) => {
      const typeVal = getAttr(el, "type", "xmi:type", "sType");
      if (typeVal === "uml:Class" || typeVal === "Class") {
        classElements.push(el);
      }
    });
  }

  let autoGridIndex = 0;

  classElements.forEach((classEl) => {
    const xmiId =
      getAttr(classEl, "id", "xmi:id", "idref", "xmi:idref") ||
      `class-${Date.now()}-${Math.random()}`;
    const className = getAttr(classEl, "name") || "ClaseSinNombre";
    const nodeId = `node-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    xmiToNodeId.set(xmiId, nodeId);

    // Extraer Atributos
    const attributes: UmlAttribute[] = [];
    
    // a) Buscar en <ownedAttribute>
    const ownedAttrs = getElements(classEl, "ownedAttribute");
    ownedAttrs.forEach((attrEl, idx) => {
      // Ignorar extremos de asociación incluidos como ownedAttribute sin nombre
      const attrName = getAttr(attrEl, "name");
      if (!attrName) return;

      const attrVis = parseVisibility(getAttr(attrEl, "visibility", "scope"));
      let attrType = "string";

      if (getAttr(attrEl, "type")) {
        attrType = parseTypeName(getAttr(attrEl, "type"));
      } else {
        const typeChild = getElements(attrEl, "type")[0];
        if (typeChild) {
          attrType = parseTypeName(
            getAttr(typeChild, "href", "name", "idref", "xmi:idref") || "string"
          );
        }
      }

      attributes.push({
        id: `attr-${idx + 1}-${Date.now()}`,
        visibility: attrVis,
        name: attrName,
        type: attrType,
      });
    });

    // b) Si no hubo en ownedAttribute, buscar en <attributes><attribute> (sección EA)
    if (attributes.length === 0) {
      const eaAttrs = getElements(classEl, "attribute");
      eaAttrs.forEach((attrEl, idx) => {
        const attrName = getAttr(attrEl, "name");
        if (!attrName) return;
        const attrVis = parseVisibility(getAttr(attrEl, "scope", "visibility"));
        const attrType = parseTypeName(getAttr(attrEl, "type") || "string");
        attributes.push({
          id: `attr-${idx + 1}-${Date.now()}`,
          visibility: attrVis,
          name: attrName,
          type: attrType,
        });
      });
    }

    // Extraer Métodos / Operaciones
    const methods: UmlMethod[] = [];

    // a) Buscar en <ownedOperation>
    const ownedOps = getElements(classEl, "ownedOperation");
    ownedOps.forEach((opEl, idx) => {
      const opName = getAttr(opEl, "name");
      if (!opName) return;

      const opVis = parseVisibility(getAttr(opEl, "visibility", "scope"));
      let returnType = "void";
      const paramsList: string[] = [];

      const paramElements = getElements(opEl, "ownedParameter");
      paramElements.forEach((pEl) => {
        const direction = getAttr(pEl, "direction");
        const pName = getAttr(pEl, "name");
        let pType = "string";

        if (getAttr(pEl, "type")) {
          pType = parseTypeName(getAttr(pEl, "type"));
        } else {
          const typeChild = getElements(pEl, "type")[0];
          if (typeChild) {
            pType = parseTypeName(
              getAttr(typeChild, "href", "name") || "string"
            );
          }
        }

        if (direction === "return") {
          returnType = pType;
        } else if (pName) {
          paramsList.push(`${pName}: ${pType}`);
        }
      });

      methods.push({
        id: `meth-${idx + 1}-${Date.now()}`,
        visibility: opVis,
        name: opName,
        parameters: paramsList.join(", "),
        returnType: returnType || "void",
      });
    });

    // b) Si no hubo en ownedOperation, buscar en <operations><operation> (sección EA)
    if (methods.length === 0) {
      const eaOps = getElements(classEl, "operation");
      eaOps.forEach((opEl, idx) => {
        const opName = getAttr(opEl, "name");
        if (!opName) return;
        const opVis = parseVisibility(getAttr(opEl, "scope", "visibility"));
        methods.push({
          id: `meth-${idx + 1}-${Date.now()}`,
          visibility: opVis,
          name: opName,
          parameters: "",
          returnType: "void",
        });
      });
    }

    // Calcular posición usando geometría de EA o grilla
    let position = { x: 60, y: 80 };
    const geom = geometryMap.get(xmiId);
    if (geom) {
      position = { x: geom.left, y: geom.top };
    } else {
      const col = autoGridIndex % 3;
      const row = Math.floor(autoGridIndex / 3);
      position = { x: 60 + col * 320, y: 80 + row * 240 };
      autoGridIndex++;
    }

    nodes.push({
      id: nodeId,
      type: "umlClass",
      position,
      data: {
        name: className,
        stereotype: "",
        attributes,
        methods,
      },
    });
  });

  // 3. Extraer Notas UML (Comments)
  const commentElements: Element[] = [];
  const processedNoteIds = new Set<string>();

  const ownedComments = getElements(xmlDoc, "ownedComment");
  ownedComments.forEach((c) => {
    const id = getAttr(c, "id", "xmi:id", "idref", "xmi:idref");
    if (id && !processedNoteIds.has(id)) {
      processedNoteIds.add(id);
      commentElements.push(c);
    }
  });

  // También buscar en <element type="uml:Note" o sType="Note">
  allElementsInDoc.forEach((el) => {
    const typeVal = getAttr(el, "type", "xmi:type", "sType");
    if (typeVal === "uml:Note" || typeVal === "Note") {
      const id = getAttr(el, "id", "xmi:id", "idref", "xmi:idref");
      if (id && !processedNoteIds.has(id)) {
        processedNoteIds.add(id);
        commentElements.push(el);
      }
    }
  });

  commentElements.forEach((commentEl) => {
    const xmiId =
      getAttr(commentEl, "id", "xmi:id", "idref", "xmi:idref") ||
      `note-${Date.now()}-${Math.random()}`;
    const nodeId = `node-note-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    xmiToNodeId.set(xmiId, nodeId);

    let bodyText = getAttr(commentEl, "body", "documentation") || "";
    if (!bodyText) {
      const bodyChild = getElements(commentEl, "body")[0];
      if (bodyChild) bodyText = bodyChild.textContent || "";
    }
    if (!bodyText) {
      const propChild = getElements(commentEl, "properties")[0];
      if (propChild) bodyText = getAttr(propChild, "documentation") || "";
    }

    let position = { x: 60, y: 80 };
    const geom = geometryMap.get(xmiId);
    if (geom) {
      position = { x: geom.left, y: geom.top };
    } else {
      const col = autoGridIndex % 3;
      const row = Math.floor(autoGridIndex / 3);
      position = { x: 60 + col * 320, y: 80 + row * 240 };
      autoGridIndex++;
    }

    nodes.push({
      id: nodeId,
      type: "umlNote",
      position,
      data: {
        content: bodyText || "Nota importada",
      },
    });

    // Enlaces de notas a clases mediante <annotatedElement> o atributo
    const annotatedAttr = getAttr(commentEl, "annotatedElement");
    const targetIds: string[] = [];
    if (annotatedAttr) {
      targetIds.push(...annotatedAttr.split(/\s+/).filter(Boolean));
    }
    const annotatedChilds = getElements(commentEl, "annotatedElement");
    annotatedChilds.forEach((ac) => {
      const idref = getAttr(ac, "idref", "xmi:idref");
      if (idref) targetIds.push(idref);
    });

    targetIds.forEach((targetXmiId) => {
      const targetNodeId = xmiToNodeId.get(targetXmiId);
      if (targetNodeId) {
        edges.push({
          id: `edge-note-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
          source: nodeId,
          target: targetNodeId,
          type: "umlEdge",
          data: {
            relationType: "DEPENDENCY",
            name: "",
          },
        });
      }
    });
  });

  // 4. Extraer Generalizaciones (Herencia)
  const genElements = getElements(xmlDoc, "generalization");
  genElements.forEach((genEl) => {
    const parentClass = genEl.parentElement;
    const sourceXmiId = getAttr(parentClass, "id", "xmi:id");
    const targetXmiId = getAttr(genEl, "general");

    if (sourceXmiId && targetXmiId) {
      const sourceNodeId = xmiToNodeId.get(sourceXmiId);
      const targetNodeId = xmiToNodeId.get(targetXmiId);

      if (sourceNodeId && targetNodeId) {
        edges.push({
          id: `edge-gen-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
          source: sourceNodeId,
          target: targetNodeId,
          type: "umlEdge",
          data: {
            relationType: "GENERALIZATION",
            name: "",
          },
        });
      }
    }
  });

  // 5. Extraer Realizaciones (Interfaces)
  allPackaged.forEach((pkg) => {
    const typeVal = getAttr(pkg, "type", "xmi:type");
    if (typeVal === "uml:Realization" || typeVal === "Realization") {
      const clientXmiId = getAttr(pkg, "client");
      const supplierXmiId = getAttr(pkg, "supplier");

      if (clientXmiId && supplierXmiId) {
        const sourceNodeId = xmiToNodeId.get(clientXmiId);
        const targetNodeId = xmiToNodeId.get(supplierXmiId);

        if (sourceNodeId && targetNodeId) {
          edges.push({
            id: `edge-real-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
            source: sourceNodeId,
            target: targetNodeId,
            type: "umlEdge",
            data: {
              relationType: "REALIZATION",
              name: getAttr(pkg, "name") || "",
            },
          });
        }
      }
    } else if (typeVal === "uml:Dependency" || typeVal === "Dependency") {
      const clientXmiId = getAttr(pkg, "client");
      const supplierXmiId = getAttr(pkg, "supplier");

      if (clientXmiId && supplierXmiId) {
        const sourceNodeId = xmiToNodeId.get(clientXmiId);
        const targetNodeId = xmiToNodeId.get(supplierXmiId);

        if (sourceNodeId && targetNodeId) {
          edges.push({
            id: `edge-dep-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
            source: sourceNodeId,
            target: targetNodeId,
            type: "umlEdge",
            data: {
              relationType: "DEPENDENCY",
              name: getAttr(pkg, "name") || "",
            },
          });
        }
      }
    }
  });

  // 6. Extraer Asociaciones / Agregaciones / Composiciones
  allPackaged.forEach((assocEl) => {
    const typeVal = getAttr(assocEl, "type", "xmi:type");
    if (typeVal === "uml:Association" || typeVal === "Association") {
      const memberEnds = getElements(assocEl, "memberEnd");
      const ownedEnds = getElements(assocEl, "ownedEnd");

      let sourceXmiId = "";
      let targetXmiId = "";
      let relType: UmlRelationType = "ASSOCIATION";
      let sourceMultiplicity = "";
      let targetMultiplicity = "";

      ownedEnds.forEach((endEl, idx) => {
        const agg = getAttr(endEl, "aggregation");
        if (agg === "composite") {
          relType = "COMPOSITION";
        } else if (agg === "shared") {
          relType = "AGGREGATION";
        }

        const lowerChild = getElements(endEl, "lowerValue")[0];
        const upperChild = getElements(endEl, "upperValue")[0];
        const lower = getAttr(lowerChild, "value");
        const upper = getAttr(upperChild, "value");
        let mult = "";
        if (lower !== null && lower !== undefined && upper !== null && upper !== undefined) {
          mult = lower === upper ? lower : `${lower}..${upper}`;
        } else if (upper) {
          mult = upper;
        }

        if (idx === 0) {
          sourceMultiplicity = mult;
          sourceXmiId = getAttr(endEl, "type") || "";
        } else {
          targetMultiplicity = mult;
          targetXmiId = getAttr(endEl, "type") || "";
        }
      });

      if (!sourceXmiId && memberEnds.length >= 2) {
        sourceXmiId = getAttr(memberEnds[0], "idref", "xmi:idref") || "";
        targetXmiId = getAttr(memberEnds[1], "idref", "xmi:idref") || "";
      }

      if (sourceXmiId && targetXmiId) {
        const sourceNodeId = xmiToNodeId.get(sourceXmiId);
        const targetNodeId = xmiToNodeId.get(targetXmiId);

        if (sourceNodeId && targetNodeId) {
          edges.push({
            id: `edge-assoc-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
            source: sourceNodeId,
            target: targetNodeId,
            type: "umlEdge",
            data: {
              relationType: relType,
              sourceMultiplicity,
              targetMultiplicity,
              name: getAttr(assocEl, "name") || "",
            },
          });
        }
      }
    }
  });

  // 7. Extraer conectores de Enterprise Architect (<connector> en <connectors>)
  const allConnectors = getElements(xmlDoc, "connector");
  allConnectors.forEach((connEl) => {
    const sourceEl = getElements(connEl, "source")[0];
    const targetEl = getElements(connEl, "target")[0];
    const sourceRef = getAttr(sourceEl, "idref", "xmi:idref");
    const targetRef = getAttr(targetEl, "idref", "xmi:idref");

    if (sourceRef && targetRef) {
      const sourceNodeId = xmiToNodeId.get(sourceRef);
      const targetNodeId = xmiToNodeId.get(targetRef);

      if (sourceNodeId && targetNodeId) {
        // Evitar duplicar aristas ya añadidas
        const alreadyExists = edges.some(
          (e) =>
            (e.source === sourceNodeId && e.target === targetNodeId) ||
            (e.source === targetNodeId && e.target === sourceNodeId)
        );

        if (!alreadyExists) {
          const props = getElements(connEl, "properties")[0];
          const eaType = getAttr(props, "ea_type") || "Association";
          const subType = getAttr(props, "subtype") || "";

          let relationType: UmlRelationType = "ASSOCIATION";
          if (eaType === "Generalization") {
            relationType = "GENERALIZATION";
          } else if (eaType === "Realisation" || eaType === "Realization") {
            relationType = "REALIZATION";
          } else if (eaType === "Aggregation") {
            relationType = subType === "Strong" ? "COMPOSITION" : "AGGREGATION";
          } else if (eaType === "Dependency" || eaType === "NoteLink") {
            relationType = "DEPENDENCY";
          }

          const labels = getElements(connEl, "labels")[0];
          const sourceMult = getAttr(labels, "lb", "mb") || "";
          const targetMult = getAttr(labels, "lt", "mt") || "";

          edges.push({
            id: `edge-ea-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
            source: sourceNodeId,
            target: targetNodeId,
            type: "umlEdge",
            data: {
              relationType,
              sourceMultiplicity: sourceMult,
              targetMultiplicity: targetMult,
              name: getAttr(connEl, "name") || "",
            },
          });
        }
      }
    }
  });

  return {
    diagramName,
    nodes,
    edges,
  };
}
