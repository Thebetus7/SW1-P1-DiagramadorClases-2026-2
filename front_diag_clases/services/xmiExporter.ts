import { Node, Edge } from "@xyflow/react";
import {
  UmlAttribute,
  UmlClassData,
  UmlEdgeData,
  UmlMethod,
  UmlNoteData,
  UmlVisibility,
} from "@/types";
import {
  escapeXmlWithEncoding,
  cleanSpecialCharacters,
} from "./xmiEncodingHelper";

// Helper para convertir visibilidad simbólica a estándar UML / XMI
export function mapVisibilityToXmi(v?: UmlVisibility | string): string {
  switch (v) {
    case "+":
      return "public";
    case "-":
      return "private";
    case "#":
      return "protected";
    case "~":
      return "package";
    default:
      return "public";
  }
}

// Helper para normalizar tipos primitivos para UML 2.1 / XMI EA 15
export function mapPrimitiveType(typeStr?: string): string {
  if (!typeStr) return "void";
  const clean = typeStr.trim().toLowerCase();
  if (clean === "string" || clean === "str" || clean === "texto")
    return "String";
  if (
    clean === "int" ||
    clean === "integer" ||
    clean === "entero" ||
    clean === "number"
  )
    return "Integer";
  if (clean === "bool" || clean === "boolean" || clean === "booleano")
    return "Boolean";
  if (clean === "float" || clean === "double" || clean === "decimal")
    return "Float";
  if (clean === "date" || clean === "datetime") return "Date";
  if (clean === "void") return "void";
  return typeStr.trim();
}

// Helpers para compatibilidad hacia atrás si los datos vienen como string
export function parseAttributeString(attrStr: string): UmlAttribute {
  const match = attrStr.match(/^([+\-#~])?\s*([a-zA-Z0-9_$]+)\s*:\s*(.+)$/);
  if (match) {
    return {
      id: `attr-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      visibility: (match[1] as UmlVisibility) || "+",
      name: match[2],
      type: match[3],
    };
  }
  return {
    id: `attr-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    visibility: "+",
    name:
      attrStr
        .replace(/^[+\-#~]\s*/, "")
        .split(":")[0]
        ?.trim() || attrStr,
    type: attrStr.split(":")[1]?.trim() || "string",
  };
}

export function parseMethodString(methodStr: string): UmlMethod {
  const match = methodStr.match(
    /^([+\-#~])?\s*([a-zA-Z0-9_$]+)\s*\((.*?)\)\s*(?::\s*(.+))?$/,
  );
  if (match) {
    return {
      id: `meth-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      visibility: (match[1] as UmlVisibility) || "+",
      name: match[2],
      parameters: match[3] || "",
      returnType: match[4] || "void",
    };
  }
  return {
    id: `meth-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    visibility: "+",
    name:
      methodStr
        .replace(/^[+\-#~]\s*/, "")
        .split("(")[0]
        ?.trim() || methodStr,
    parameters: "",
    returnType: methodStr.split(":")[1]?.trim() || "void",
  };
}

export function normalizeAttribute(attr: UmlAttribute | string): UmlAttribute {
  if (typeof attr === "string") {
    return parseAttributeString(attr);
  }
  return attr;
}

export function normalizeMethod(method: UmlMethod | string): UmlMethod {
  if (typeof method === "string") {
    return parseMethodString(method);
  }
  return method;
}

// Generador de UUIDs limpios para XMI
function generateXmiId(prefix: string, seed: string | number): string {
  const cleanSeed = String(seed).replace(/[^a-zA-Z0-9_]/g, "_");
  return `EAID_${prefix}_${cleanSeed}`;
}

/**
 * Genera identificadores con sufijos estrictamente numéricos para atributos y métodos.
 * Enterprise Architect requiere que los identificadores de atributos y operaciones
 * en XMI 2.1 terminen en un token puramente numérico (sin sufijos alfanuméricos como 2sls)
 * para registrarlos en su tabla interna t_attribute / t_operation.
 */
function generateMemberXmiId(
  prefix: "ATTR" | "OP",
  classNodeId: string,
  memberId: string | undefined,
  index: number
): string {
  const cleanNode = String(classNodeId).replace(/[^a-zA-Z0-9_]/g, "_");
  // Extraer exclusivamente los dígitos numéricos del memberId
  const digits = memberId ? memberId.replace(/\D/g, "") : "";
  const suffix = digits ? `${digits}_${index}` : `${index}`;
  return `EAID_${prefix}_${cleanNode}_${prefix.toLowerCase()}_${suffix}`;
}

/**
 * Genera el documento XML / XMI 2.1 conforme a la especificación UML 2.1 / 2.5
 * e incluye las extensiones nativas completas de Enterprise Architect v15
 * para renderizar asociaciones sólidas, herencias, notas y sus conexiones NoteLink.
 */
export function generateEnterpriseArchitectXmi(
  diagramName: string,
  nodes: Node[],
  edges: Edge[],
): string {
  const cleanDiagramName = cleanSpecialCharacters(diagramName || "Diagrama de Clases del Sistema");
  const packageId = generateXmiId("PKG", "RootPackage");
  const modelId = generateXmiId("MODEL", "Model");
  const diagramId = generateXmiId("DIAGRAM", "ClassDiagram");

  // Filtrar clases y notas
  const classNodes = nodes.filter((n) => n.type === "umlClass");
  const noteNodes = nodes.filter((n) => n.type === "umlNote");

  // Mapas para IDs de clases y notas
  const classIdMap = new Map<string, string>();
  classNodes.forEach((node) => {
    classIdMap.set(node.id, generateXmiId("CLASS", node.id));
  });

  const noteIdMap = new Map<string, string>();
  noteNodes.forEach((node) => {
    noteIdMap.set(node.id, generateXmiId("NOTE", node.id));
  });

  // Mapear elementos anotados para cada nota (para OMG UML annotatedElement)
  const noteAnnotatedElements = new Map<string, Set<string>>();
  noteNodes.forEach((n) => noteAnnotatedElements.set(n.id, new Set()));

  // Identificar generalizaciones entre clases
  const generalizationsBySource = new Map<string, Edge[]>();
  edges.forEach((edge) => {
    const data = edge.data as UmlEdgeData | undefined;
    if (
      data?.relationType === "GENERALIZATION" &&
      classIdMap.has(edge.source) &&
      classIdMap.has(edge.target)
    ) {
      const list = generalizationsBySource.get(edge.source) || [];
      list.push(edge);
      generalizationsBySource.set(edge.source, list);
    }
  });

  // Lista de información de conectores para EA Extensions
  const eaConnectors: Array<{
    id: string;
    sourceId: string;
    targetId: string;
    sourceName: string;
    targetName: string;
    sourceType: "Class" | "Note";
    targetType: "Class" | "Note";
    eaType: string;
    linkType: string;
    direction: string;
    name: string;
    sourceMult: string;
    targetMult: string;
    aggregationKind: string;
    lineStyle: string;
    subtype?: string;
  }> = [];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<xmi:XMI xmi:version="2.1" xmlns:uml="http://schema.omg.org/spec/UML/2.1" xmlns:xmi="http://schema.omg.org/spec/XMI/2.1">\n`;
  xml += `  <xmi:Documentation exporter="Enterprise Architect" exporterVersion="6.5"/>\n`;
  xml += `  <uml:Model xmi:type="uml:Model" xmi:id="${modelId}" name="EA_Model" visibility="public">\n`;
  xml += `    <packagedElement xmi:type="uml:Package" xmi:id="${packageId}" name="${escapeXml(cleanDiagramName)}" visibility="public">\n`;

  // 1. Clases UML
  classNodes.forEach((node) => {
    const classId = classIdMap.get(node.id)!;
    const data = (node.data as unknown) as UmlClassData;
    const className = data.name || "ClaseSinNombre";

    xml += `      <packagedElement xmi:type="uml:Class" xmi:id="${classId}" name="${escapeXml(className)}" visibility="public">\n`;

    // Generalizaciones (Herencia)
    const genEdges = generalizationsBySource.get(node.id) || [];
    genEdges.forEach((genEdge) => {
      const targetClassId = classIdMap.get(genEdge.target);
      const targetNode = classNodes.find((n) => n.id === genEdge.target);
      const targetClassName = (targetNode?.data as any)?.name || "Superclase";

      if (targetClassId) {
        const genId = generateXmiId("GEN", genEdge.id);
        xml += `        <generalization xmi:type="uml:Generalization" xmi:id="${genId}" general="${targetClassId}"/>\n`;

        eaConnectors.push({
          id: genId,
          sourceId: classId,
          targetId: targetClassId,
          sourceName: className,
          targetName: targetClassName,
          sourceType: "Class",
          targetType: "Class",
          eaType: "Generalization",
          linkType: "Generalization",
          direction: "Source -> Destination",
          name: "",
          sourceMult: "",
          targetMult: "",
          aggregationKind: "none",
          lineStyle: "0",
        });
      }
    });

    // Atributos (ownedAttribute / Property)
    const attributes = (data.attributes || []).map(normalizeAttribute);
    attributes.forEach((attr, idx) => {
      const attrId = generateMemberXmiId("ATTR", node.id, attr.id, idx);
      const visibility = mapVisibilityToXmi(attr.visibility);
      const attrType = mapPrimitiveType(attr.type);

      xml += `        <ownedAttribute xmi:type="uml:Property" xmi:id="${attrId}" name="${escapeXml(attr.name)}" visibility="${visibility}">\n`;
      xml += `          <type xmi:type="uml:PrimitiveType" href="http://schema.omg.org/spec/UML/2.1/uml.xml#${escapeXml(attrType)}" name="${escapeXml(attrType)}"/>\n`;
      xml += `        </ownedAttribute>\n`;
    });

    // Operaciones / Métodos (ownedOperation)
    const methods = (data.methods || []).map(normalizeMethod);
    methods.forEach((method, idx) => {
      const opId = generateMemberXmiId("OP", node.id, method.id, idx);
      const visibility = mapVisibilityToXmi(method.visibility);
      const retType = mapPrimitiveType(method.returnType);

      xml += `        <ownedOperation xmi:type="uml:Operation" xmi:id="${opId}" name="${escapeXml(method.name)}" visibility="${visibility}">\n`;

      // Retorno
      if (retType && retType.toLowerCase() !== "void") {
        const retParamId = generateXmiId("PARAM_RET", `${opId}_return`);
        xml += `          <ownedParameter xmi:type="uml:Parameter" xmi:id="${retParamId}" name="return" direction="return">\n`;
        xml += `            <type xmi:type="uml:PrimitiveType" href="http://schema.omg.org/spec/UML/2.1/uml.xml#${escapeXml(retType)}" name="${escapeXml(retType)}"/>\n`;
        xml += `          </ownedParameter>\n`;
      }

      // Parámetros
      if (method.parameters && method.parameters.trim().length > 0) {
        const paramItems = method.parameters.split(",").map((p) => p.trim());
        paramItems.forEach((pStr, pIdx) => {
          const parts = pStr.split(":");
          const pName = parts[0]?.trim() || `arg${pIdx + 1}`;
          const pType = mapPrimitiveType(parts[1]?.trim() || "String");
          const paramId = generateXmiId("PARAM", `${opId}_${pIdx}`);

          xml += `          <ownedParameter xmi:type="uml:Parameter" xmi:id="${paramId}" name="${escapeXml(pName)}" direction="in">\n`;
          xml += `            <type xmi:type="uml:PrimitiveType" href="http://schema.omg.org/spec/UML/2.1/uml.xml#${escapeXml(pType)}" name="${escapeXml(pType)}"/>\n`;
          xml += `          </ownedParameter>\n`;
        });
      }

      xml += `        </ownedOperation>\n`;
    });

    xml += `      </packagedElement>\n`;
  });

  // 2. Relaciones UML a nivel de paquete (Clase-Clase y Nota-Clase)
  edges.forEach((edge) => {
    const data = edge.data as UmlEdgeData | undefined;
    const relType = data?.relationType || "ASSOCIATION";

    const isSrcClass = classIdMap.has(edge.source);
    const isTgtClass = classIdMap.has(edge.target);
    const isSrcNote = noteIdMap.has(edge.source);
    const isTgtNote = noteIdMap.has(edge.target);

    // CASO A: Relación entre dos Clases
    if (isSrcClass && isTgtClass) {
      const srcClassId = classIdMap.get(edge.source)!;
      const tgtClassId = classIdMap.get(edge.target)!;
      const srcNode = classNodes.find((n) => n.id === edge.source);
      const tgtNode = classNodes.find((n) => n.id === edge.target);
      const srcClassName = (srcNode?.data as any)?.name || "ClaseOrigen";
      const tgtClassName = (tgtNode?.data as any)?.name || "ClaseDestino";

      const edgeXmiId = generateXmiId("REL", edge.id);
      const srcMult = data?.sourceMultiplicity?.trim() || "";
      const tgtMult = data?.targetMultiplicity?.trim() || "";
      const name = data?.name || "";

      if (relType === "REALIZATION") {
        xml += `      <packagedElement xmi:type="uml:Realization" xmi:id="${edgeXmiId}" name="${escapeXml(name)}" supplier="${tgtClassId}" client="${srcClassId}"/>\n`;
        eaConnectors.push({
          id: edgeXmiId,
          sourceId: srcClassId,
          targetId: tgtClassId,
          sourceName: srcClassName,
          targetName: tgtClassName,
          sourceType: "Class",
          targetType: "Class",
          eaType: "Realisation",
          linkType: "Realisation",
          direction: "Source -> Destination",
          name,
          sourceMult: srcMult,
          targetMult: tgtMult,
          aggregationKind: "none",
          lineStyle: "0",
        });
      } else if (relType === "DEPENDENCY") {
        xml += `      <packagedElement xmi:type="uml:Dependency" xmi:id="${edgeXmiId}" name="${escapeXml(name)}" supplier="${tgtClassId}" client="${srcClassId}"/>\n`;
        eaConnectors.push({
          id: edgeXmiId,
          sourceId: srcClassId,
          targetId: tgtClassId,
          sourceName: srcClassName,
          targetName: tgtClassName,
          sourceType: "Class",
          targetType: "Class",
          eaType: "Dependency",
          linkType: "Dependency",
          direction: "Source -> Destination",
          name,
          sourceMult: srcMult,
          targetMult: tgtMult,
          aggregationKind: "none",
          lineStyle: "0",
        });
      } else if (relType !== "GENERALIZATION") {
        let aggregationKind = "none";
        let eaType = "Association";
        let linkType = "Association";
        let direction = "Unspecified";
        let subtype: string | undefined = undefined;

        if (relType === "DIRECTED_ASSOCIATION") {
          direction = "Source -> Destination";
        } else if (relType === "AGGREGATION") {
          aggregationKind = "shared";
          eaType = "Aggregation";
          linkType = "Aggregation";
          subtype = "Weak";
          direction = "Source -> Destination";
        } else if (relType === "COMPOSITION") {
          aggregationKind = "composite";
          eaType = "Aggregation";
          linkType = "Aggregation";
          subtype = "Strong";
          direction = "Source -> Destination";
        }

        const srcEndId = generateXmiId("END_SRC", edge.id);
        const tgtEndId = generateXmiId("END_TGT", edge.id);

        xml += `      <packagedElement xmi:type="uml:Association" xmi:id="${edgeXmiId}" name="${escapeXml(name)}">\n`;
        xml += `        <memberEnd xmi:idref="${srcEndId}"/>\n`;
        xml += `        <memberEnd xmi:idref="${tgtEndId}"/>\n`;

        // Extremo Origen (Source)
        xml += `        <ownedEnd xmi:type="uml:Property" xmi:id="${srcEndId}" type="${srcClassId}" aggregation="${aggregationKind}">\n`;
        if (srcMult) {
          const { lower, upper } = parseMultiplicity(srcMult);
          xml += `          <lowerValue xmi:type="uml:LiteralString" xmi:id="${srcEndId}_low" value="${escapeXml(lower)}"/>\n`;
          xml += `          <upperValue xmi:type="uml:LiteralString" xmi:id="${srcEndId}_up" value="${escapeXml(upper)}"/>\n`;
        }
        xml += `        </ownedEnd>\n`;

        // Extremo Destino (Target)
        const isNavigable =
          relType === "DIRECTED_ASSOCIATION" ? ` isNavigable="true"` : "";
        xml += `        <ownedEnd xmi:type="uml:Property" xmi:id="${tgtEndId}" type="${tgtClassId}"${isNavigable}>\n`;
        if (tgtMult) {
          const { lower, upper } = parseMultiplicity(tgtMult);
          xml += `          <lowerValue xmi:type="uml:LiteralString" xmi:id="${tgtEndId}_low" value="${escapeXml(lower)}"/>\n`;
          xml += `          <upperValue xmi:type="uml:LiteralString" xmi:id="${tgtEndId}_up" value="${escapeXml(upper)}"/>\n`;
        }
        xml += `        </ownedEnd>\n`;

        xml += `      </packagedElement>\n`;

        eaConnectors.push({
          id: edgeXmiId,
          sourceId: srcClassId,
          targetId: tgtClassId,
          sourceName: srcClassName,
          targetName: tgtClassName,
          sourceType: "Class",
          targetType: "Class",
          eaType,
          linkType,
          direction,
          name,
          sourceMult: srcMult,
          targetMult: tgtMult,
          aggregationKind,
          lineStyle: "0",
          subtype,
        });
      }
    }

    // CASO B: Conexión entre Nota y Clase (o Clase y Nota)
    else if ((isSrcNote && isTgtClass) || (isSrcClass && isTgtNote)) {
      const noteRawId = isSrcNote ? edge.source : edge.target;
      const classRawId = isSrcClass ? edge.source : edge.target;

      const noteXmiId = noteIdMap.get(noteRawId)!;
      const classXmiId = classIdMap.get(classRawId)!;
      const classNode = classNodes.find((n) => n.id === classRawId);
      const className = (classNode?.data as any)?.name || "Clase";

      // Registrar para el atributo annotatedElement de la nota
      noteAnnotatedElements.get(noteRawId)?.add(classXmiId);

      const edgeXmiId = generateXmiId("NOTELINK", edge.id);
      eaConnectors.push({
        id: edgeXmiId,
        sourceId: noteXmiId,
        targetId: classXmiId,
        sourceName: "Nota",
        targetName: className,
        sourceType: "Note",
        targetType: "Class",
        eaType: "NoteLink",
        linkType: "NoteLink",
        direction: "Unspecified",
        name: "",
        sourceMult: "",
        targetMult: "",
        aggregationKind: "none",
        lineStyle: "1", // Línea discontinua característica de los NoteLinks
      });
    }

    // CASO C: Conexión entre dos Notas
    else if (isSrcNote && isTgtNote) {
      const srcNoteXmiId = noteIdMap.get(edge.source)!;
      const tgtNoteXmiId = noteIdMap.get(edge.target)!;
      const edgeXmiId = generateXmiId("NOTELINK", edge.id);

      eaConnectors.push({
        id: edgeXmiId,
        sourceId: srcNoteXmiId,
        targetId: tgtNoteXmiId,
        sourceName: "Nota",
        targetName: "Nota",
        sourceType: "Note",
        targetType: "Note",
        eaType: "NoteLink",
        linkType: "NoteLink",
        direction: "Unspecified",
        name: "",
        sourceMult: "",
        targetMult: "",
        aggregationKind: "none",
        lineStyle: "1",
      });
    }
  });

  // 3. Notas UML (Comments) con body y annotatedElement si tienen clases conectadas
  noteNodes.forEach((node) => {
    const data = (node.data as unknown) as UmlNoteData;
    const noteContent =
      (data as any)?.content ||
      (data as any)?.text ||
      (data as any)?.description ||
      "";
    const noteId = noteIdMap.get(node.id)!;
    const annotatedSet = noteAnnotatedElements.get(node.id);
    const annotatedAttr =
      annotatedSet && annotatedSet.size > 0
        ? ` annotatedElement="${Array.from(annotatedSet).join(" ")}"`
        : "";

    xml += `      <ownedComment xmi:type="uml:Comment" xmi:id="${noteId}" body="${escapeXml(noteContent)}"${annotatedAttr}>\n`;
    xml += `        <body>${escapeXml(noteContent)}</body>\n`;
    xml += `      </ownedComment>\n`;
  });

  xml += `    </packagedElement>\n`;
  xml += `  </uml:Model>\n`;

  // 4. Extensión de Enterprise Architect (Enterprise Architect 15 Diagram & Element Representation)
  xml += `  <xmi:Extension extender="Enterprise Architect" extenderID="3.0">\n`;

  // Elementos de Modelo extendidos para EA (Package, Classes y Notes con sus links)
  xml += `    <elements>\n`;
  xml += `      <element xmi:idref="${packageId}" xmi:type="uml:Package" name="${escapeXml(cleanDiagramName)}" scope="public">\n`;
  xml += `        <properties isSpecification="false" sType="Package" ntype="0" scope="public"/>\n`;
  xml += `      </element>\n`;

  classNodes.forEach((node) => {
    const classId = classIdMap.get(node.id)!;
    const data = (node.data as unknown) as UmlClassData;
    const className = data.name || "ClaseSinNombre";

    const connectedLinks = eaConnectors.filter(
      (c) => c.sourceId === classId || c.targetId === classId,
    );

    xml += `      <element xmi:idref="${classId}" xmi:type="uml:Class" name="${escapeXml(className)}" scope="public">\n`;
    xml += `        <properties isSpecification="false" sType="Class" ntype="0" scope="public" package="${packageId}"/>\n`;

    // Atributos en la sección de extensión de EA
    const attributes = (data.attributes || []).map(normalizeAttribute);
    if (attributes.length > 0) {
      xml += `        <attributes>\n`;
      attributes.forEach((attr, idx) => {
        const attrId = generateMemberXmiId("ATTR", node.id, attr.id, idx);
        const visibility = mapVisibilityToXmi(attr.visibility);
        const attrType = mapPrimitiveType(attr.type);
        xml += `          <attribute xmi:idref="${attrId}" name="${escapeXml(attr.name)}" scope="${visibility}">\n`;
        xml += `            <initial/>\n`;
        xml += `            <documentation/>\n`;
        xml += `            <model type="${escapeXml(attrType)}"/>\n`;
        xml += `            <properties type="${escapeXml(attrType)}" derived="0" collection="false" duplicates="0" changeability="changeable"/>\n`;
        xml += `            <coords ordered="0"/>\n`;
        xml += `            <containment containment="Not Specified" position="${idx}"/>\n`;
        xml += `            <design style="1"/>\n`;
        xml += `            <appearance value="1"/>\n`;
        xml += `            <modifiers isStatic="false" isConst="false"/>\n`;
        xml += `            <style value="Union=0;Derived=0;AllowDuplicates=0;"/>\n`;
        xml += `          </attribute>\n`;
      });
      xml += `        </attributes>\n`;
    }

    // Operaciones en la sección de extensión de EA
    const methods = (data.methods || []).map(normalizeMethod);
    if (methods.length > 0) {
      xml += `        <operations>\n`;
      methods.forEach((method, idx) => {
        const opId = generateMemberXmiId("OP", node.id, method.id, idx);
        const visibility = mapVisibilityToXmi(method.visibility);
        const retType = mapPrimitiveType(method.returnType);
        xml += `          <operation xmi:idref="${opId}" name="${escapeXml(method.name)}" scope="${visibility}">\n`;
        xml += `            <properties returnType="${escapeXml(retType)}" derived="0" duplicates="0" changeability="changeable"/>\n`;
        xml += `            <appearance value="1"/>\n`;
        xml += `            <modifiers isStatic="false" isConst="false"/>\n`;
        xml += `            <style value="Union=0;Derived=0;AllowDuplicates=0;"/>\n`;
        xml += `          </operation>\n`;
      });
      xml += `        </operations>\n`;
    }

    if (connectedLinks.length > 0) {
      xml += `        <links>\n`;
      connectedLinks.forEach((link) => {
        xml += `          <${link.linkType} xmi:id="${link.id}" start="${link.sourceId}" end="${link.targetId}"/>\n`;
      });
      xml += `        </links>\n`;
    }

    xml += `      </element>\n`;
  });

  // Notas en la sección elements de EA con su contenido textual
  noteNodes.forEach((node) => {
    const noteId = noteIdMap.get(node.id)!;
    const data = (node.data as unknown) as UmlNoteData;
    const noteContent =
      (data as any)?.content ||
      (data as any)?.text ||
      (data as any)?.description ||
      "";
    const connectedLinks = eaConnectors.filter(
      (c) => c.sourceId === noteId || c.targetId === noteId,
    );

    xml += `      <element xmi:idref="${noteId}" xmi:type="uml:Note" name="Note" scope="public">\n`;
    xml += `        <properties isSpecification="false" sType="Note" ntype="0" scope="public" package="${packageId}" documentation="${escapeXml(noteContent)}"/>\n`;
    xml += `        <documentation value="${escapeXml(noteContent)}"/>\n`;
    xml += `        <extendedProperties documentation="${escapeXml(noteContent)}"/>\n`;

    if (connectedLinks.length > 0) {
      xml += `        <links>\n`;
      connectedLinks.forEach((link) => {
        xml += `          <${link.linkType} xmi:id="${link.id}" start="${link.sourceId}" end="${link.targetId}"/>\n`;
      });
      xml += `        </links>\n`;
    }

    xml += `      </element>\n`;
  });

  xml += `    </elements>\n`;

  // Lista de conectores extendidos para EA con propiedades completas
  xml += `    <connectors>\n`;
  eaConnectors.forEach((conn) => {
    xml += `      <connector xmi:idref="${conn.id}">\n`;
    xml += `        <source xmi:idref="${conn.sourceId}">\n`;
    xml += `          <model type="${conn.sourceType}" name="${escapeXml(conn.sourceName)}"/>\n`;
    xml += `          <role visibility="Public" targetScope="instance"/>\n`;
    xml += `          <type multiplicity="${escapeXml(conn.sourceMult)}" aggregation="${conn.aggregationKind}" containment="Unspecified"/>\n`;
    xml += `          <modifiers isNavigable="false" isOrdered="false" isUnique="true"/>\n`;
    xml += `          <style value="Union=0;Derived=0;AllowDuplicates=0;"/>\n`;
    xml += `        </source>\n`;
    xml += `        <target xmi:idref="${conn.targetId}">\n`;
    xml += `          <model type="${conn.targetType}" name="${escapeXml(conn.targetName)}"/>\n`;
    xml += `          <role visibility="Public" targetScope="instance"/>\n`;
    xml += `          <type multiplicity="${escapeXml(conn.targetMult)}" aggregation="none" containment="Unspecified"/>\n`;
    xml += `          <modifiers isNavigable="false" isOrdered="false" isUnique="true"/>\n`;
    xml += `          <style value="Union=0;Derived=0;AllowDuplicates=0;"/>\n`;
    xml += `        </target>\n`;
    xml += `        <properties ea_type="${conn.eaType}" direction="${conn.direction}"${conn.subtype ? ` subtype="${conn.subtype}"` : ""}/>\n`;
    xml += `        <appearance linemode="3" linecolor="-1" linewidth="0" seqno="0" headStyle="0" lineStyle="${conn.lineStyle}"/>\n`;
    xml += `      </connector>\n`;
  });
  xml += `    </connectors>\n`;

  // Diagrama Visual de Clases (Class Diagram) asociado al Package
  xml += `    <diagrams>\n`;
  xml += `      <diagram xmi:id="${diagramId}">\n`;
  xml += `        <properties name="${escapeXml(cleanDiagramName)}" type="Logical" package="${packageId}"/>\n`;
  xml += `        <model package="${packageId}" localID="1" owner="${packageId}"/>\n`;
  xml += `        <project author="Diagramador UML" version="1.0" created="${new Date().toISOString()}" modified="${new Date().toISOString()}"/>\n`;
  xml += `        <style1 value="ShowPrivate=1;ShowProtected=1;ShowPublic=1;ShowPackage=1;HideReferences=0;suppress=0;ShowAtts=1;ShowOps=1;"/>\n`;
  xml += `        <style2 value="SaveDiagram=1;"/>\n`;
  xml += `        <elements>\n`;

  // Elementos gráficos en el diagrama (Clases)
  classNodes.forEach((node, index) => {
    const classId = classIdMap.get(node.id)!;
    const data = (node.data as unknown) as UmlClassData;

    const attrCount = (data.attributes || []).length;
    const methCount = (data.methods || []).length;
    const longestName = (data.name || "").length;

    const width = Math.max(
      180,
      Math.min(300, Math.max(longestName * 10 + 60, 190)),
    );
    const height = Math.max(110, 50 + attrCount * 20 + methCount * 20);

    const posX = Math.round(node.position?.x ?? 100 + index * 240);
    const posY = Math.round(node.position?.y ?? 100);

    const left = posX;
    const top = posY;
    const right = posX + width;
    const bottom = posY + height;

    xml += `          <element geometry="Left=${left};Top=${top};Right=${right};Bottom=${bottom};" subject="${classId}" seqno="${index + 1}" style="ShowAtts=1;ShowOps=1;ShowStereo=1;ShowCons=1;ShowTags=1;"/>\n`;
  });

  // Elementos gráficos en el diagrama (Notas)
  noteNodes.forEach((node, index) => {
    const noteId = noteIdMap.get(node.id)!;
    const posX = Math.round(node.position?.x ?? 120);
    const posY = Math.round(node.position?.y ?? 120);
    const width = 180;
    const height = 90;

    const left = posX;
    const top = posY;
    const right = posX + width;
    const bottom = posY + height;

    xml += `          <element geometry="Left=${left};Top=${top};Right=${right};Bottom=${bottom};" subject="${noteId}" seqno="${classNodes.length + index + 1}"/>\n`;
  });

  // Conectores gráficos en el diagrama (Líneas entre clases y NoteLinks)
  eaConnectors.forEach((conn) => {
    xml += `          <element geometry="SX=0;SY=0;EX=0;EY=0;EDGE=1;$Path=;" subject="${conn.id}" style="Mode=3;EOwn=1;SOwn=1;Nav=0;"/>\n`;
  });

  xml += `        </elements>\n`;
  xml += `      </diagram>\n`;
  xml += `    </diagrams>\n`;
  xml += `  </xmi:Extension>\n`;

  xml += `</xmi:XMI>\n`;

  return xml;
}

// Parser de multiplicidad
function parseMultiplicity(mult: string): { lower: string; upper: string } {
  const parts = mult.split("..");
  if (parts.length === 2) {
    return {
      lower: parts[0]?.trim() || "0",
      upper: parts[1]?.trim() || "*",
    };
  }
  if (mult === "*") {
    return { lower: "0", upper: "*" };
  }
  return { lower: mult, upper: mult };
}

function escapeXml(unsafe: string): string {
  return escapeXmlWithEncoding(unsafe);
}

/**
 * Dispara la descarga del archivo .xmi en UTF-8 con BOM en el navegador del usuario.
 * El prefijo BOM (\uFEFF) es indispensable para que Enterprise Architect (MSXML en Windows)
 * detecte automáticamente la codificación UTF-8 y no convierta 'ñ' o tildes en caracteres corruptos.
 */
export function downloadEnterpriseArchitectXmi(
  diagramName: string,
  nodes: Node[],
  edges: Edge[],
): void {
  const xmlContent = generateEnterpriseArchitectXmi(diagramName, nodes, edges);
  const blob = new Blob(["\uFEFF", xmlContent], {
    type: "application/xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeName = cleanSpecialCharacters(diagramName || "diagrama")
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim();
  const fileName = `${safeName || "diagrama"}_EA15.xmi`;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
