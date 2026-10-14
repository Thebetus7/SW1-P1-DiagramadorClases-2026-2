import assert from "node:assert/strict";
import { Edge, Node } from "@xyflow/react";
import { generateSpringBootProject } from "../../services/springBootGenerator";
import { generateFlutterProject } from "../../services/flutterGenerator";
import { generateEnterpriseArchitectXmi } from "../../services/xmiExporter";

console.log("Iniciando suite de pruebas unitarias de generadores para Clases de Asociación en 'T' (T4.4)...");

// Fixture: Grafo con 3 clases y un conector de asociación en 'T'
const nodes: Node[] = [
  {
    id: "node-user",
    type: "umlClass",
    position: { x: 100, y: 100 },
    data: {
      name: "Usuario",
      attributes: [
        { id: "a1", name: "id", type: "Long", isId: true, visibility: "+" },
        { id: "a2", name: "email", type: "String", isId: false, visibility: "+" },
      ],
      methods: [],
    },
  },
  {
    id: "node-proj",
    type: "umlClass",
    position: { x: 500, y: 100 },
    data: {
      name: "Proyecto",
      attributes: [
        { id: "b1", name: "id", type: "Long", isId: true, visibility: "+" },
        { id: "b2", name: "titulo", type: "String", isId: false, visibility: "+" },
      ],
      methods: [],
    },
  },
  {
    id: "node-mem",
    type: "umlClass",
    position: { x: 300, y: 300 },
    data: {
      name: "Membresia",
      attributes: [
        { id: "c1", name: "id", type: "Long", isId: true, visibility: "+" },
        { id: "c2", name: "rol", type: "String", isId: false, visibility: "+" },
        { id: "c3", name: "fechaAlta", type: "LocalDate", isId: false, visibility: "+" },
      ],
      methods: [],
    },
  },
];

const edges: Edge[] = [
  // Arista base entre Usuario y Proyecto
  {
    id: "edge-base-1",
    source: "node-user",
    target: "node-proj",
    type: "umlEdge",
    data: {
      relationType: "ASSOCIATION",
      sourceMultiplicity: "1..*",
      targetMultiplicity: "1..*",
    },
  },
  // Arista de clase de asociación en 'T' anclada al punto medio de edge-base-1
  {
    id: "assoc-edge-1",
    source: "node-mem",
    target: "edge-base-1",
    type: "umlAssociationClassEdge",
    data: {
      isAssociationClass: true,
      targetEdgeId: "edge-base-1",
      sourceClassId: "node-user",
      targetClassId: "node-proj",
      intermediateNodeId: "node-mem",
      relationType: "ASSOCIATION",
    },
  },
];

// -------------------------------------------------------------
// Test 1: Generador Spring Boot (Entidad JPA con 2x @ManyToOne)
// -------------------------------------------------------------
console.log("\n▶ Test 1: Spring Boot Generator - Verificando inyección de @ManyToOne dual y CRUD...");
const springBootResult = generateSpringBootProject("SistemaColaborativo", nodes, edges);
assert.ok(springBootResult.files.length > 0, "Debe generar archivos de proyecto Spring Boot");

const membresiaEntity = springBootResult.files.find((f) => f.path.includes("Membresia.java"));
assert.ok(membresiaEntity, "Debe existir el archivo Membresia.java");

const entityContent = membresiaEntity.content;
assert.match(entityContent, /@ManyToOne\(fetch = FetchType\.EAGER\)/, "Debe contener anotación @ManyToOne");
assert.match(entityContent, /@JoinColumn\(name = "usuario_id", nullable = false\)/, "Debe mapear FK de usuario");
assert.match(entityContent, /private Usuario usuario;/, "Debe declarar el atributo de usuario");
assert.match(entityContent, /@JoinColumn\(name = "proyecto_id", nullable = false\)/, "Debe mapear FK de proyecto");
assert.match(entityContent, /private Proyecto proyecto;/, "Debe declarar el atributo de proyecto");
assert.match(entityContent, /public Usuario getUsuario\(\)/, "Debe incluir getter de Usuario");
assert.match(entityContent, /public void setUsuario\(Usuario usuario\)/, "Debe incluir setter de Usuario");
assert.match(entityContent, /public Proyecto getProyecto\(\)/, "Debe incluir getter de Proyecto");
assert.match(entityContent, /public void setProyecto\(Proyecto proyecto\)/, "Debe incluir setter de Proyecto");

const membresiaRepo = springBootResult.files.find((f) => f.path.includes("MembresiaRepository.java"));
assert.ok(membresiaRepo, "Debe generar el repositorio JPA para Membresia");
const membresiaController = springBootResult.files.find((f) => f.path.includes("MembresiaController.java"));
assert.ok(membresiaController, "Debe generar el controlador REST para Membresia");
console.log("✔ Test 1 superado: Entidad Java JPA contiene las 2 relaciones foráneas @ManyToOne y capas de persistencia.");

// -------------------------------------------------------------
// Test 2: Generador Flutter (Modelo Dart con referencias e imports)
// -------------------------------------------------------------
console.log("\n▶ Test 2: Flutter Generator - Verificando modelo Dart y serialización JSON...");
const flutterResult = generateFlutterProject("SistemaColaborativo", nodes, edges);
assert.ok(flutterResult.files.length > 0, "Debe generar archivos de proyecto Flutter");

const membresiaModel = flutterResult.files.find((f) => f.path === "lib/models/membresia.dart");
assert.ok(membresiaModel, "Debe existir lib/models/membresia.dart");

const dartContent = membresiaModel.content;
assert.match(dartContent, /import 'usuario\.dart';/, "Debe importar el modelo Usuario en Dart");
assert.match(dartContent, /import 'proyecto\.dart';/, "Debe importar el modelo Proyecto en Dart");
assert.match(dartContent, /final Usuario\? usuario;/, "Debe tener el campo usuario tipado");
assert.match(dartContent, /final Proyecto\? proyecto;/, "Debe tener el campo proyecto tipado");
assert.match(dartContent, /this\.usuario,/, "El constructor debe admitir el parámetro usuario");
assert.match(dartContent, /this\.proyecto,/, "El constructor debe admitir el parámetro proyecto");
assert.match(dartContent, /usuario:\s*json\['usuario'\]\s*!=\s*null\s*\?\s*Usuario\.fromJson/, "fromJson debe deserializar Usuario");
assert.match(dartContent, /'usuario':\s*usuario\?\.toJson\(\)/, "toJson debe serializar Usuario");
console.log("✔ Test 2 superado: Modelo Dart incluye imports, campos de relación, constructores y métodos JSON.");

// -------------------------------------------------------------
// Test 3: Exportador XMI (Metamodelo OMG uml:AssociationClass)
// -------------------------------------------------------------
console.log("\n▶ Test 3: XMI Exporter - Verificando tag uml:AssociationClass según estándar OMG...");
const xmiContent = generateEnterpriseArchitectXmi("DiagramaPrueba", nodes, edges);

assert.match(
  xmiContent,
  /<packagedElement xmi:type="uml:AssociationClass" [^>]*name="Membresia"/,
  "La clase asociativa Membresia debe ser serializada como uml:AssociationClass"
);
assert.match(
  xmiContent,
  /<packagedElement xmi:type="uml:Class" [^>]*name="Usuario"/,
  "La clase Usuario normal debe ser serializada como uml:Class"
);
assert.match(
  xmiContent,
  /<packagedElement xmi:type="uml:Class" [^>]*name="Proyecto"/,
  "La clase Proyecto normal debe ser serializada como uml:Class"
);
console.log("✔ Test 3 superado: Exportador XMI produce <packagedElement xmi:type=\"uml:AssociationClass\">.");

console.log("\n=======================================================");
console.log("🎉 TODOS LOS TESTS DE GENERADORES ASOCIATIVOS PASARON (3/3)");
console.log("=======================================================\n");
