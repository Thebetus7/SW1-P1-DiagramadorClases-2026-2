import JSZip from "jszip";
import { Node, Edge } from "@xyflow/react";
import { UmlClassData, UmlEdgeData, UmlAttribute, UmlMethod } from "@/types";

export interface GeneratedFile {
  path: string;
  content: string;
  category: "model" | "repository" | "service" | "controller" | "config" | "test" | "doc";
}

export interface SpringBootProjectResult {
  projectName: string;
  files: GeneratedFile[];
  summary: {
    totalEntities: number;
    totalEndpoints: number;
    entitiesList: string[];
    relationsCount: number;
  };
  httpRequestsCode: string;
  postmanCollectionJson: string;
  generateZipBlob: () => Promise<Blob>;
  downloadZip: () => Promise<void>;
}

/**
 * Convierte un nombre a PascalCase (ej: "detalle_pedido" o "detalle pedido" -> "DetallePedido")
 */
export function toPascalCase(str: string): string {
  if (!str) return "Entity";
  const clean = str
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // eliminar tildes
    .replace(/[^a-zA-Z0-9_ ]/g, "");
  
  return clean
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

/**
 * Convierte un nombre a camelCase (ej: "Usuario" -> "usuario", "DetallePedido" -> "detallePedido")
 */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  if (!pascal) return "entity";
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Convierte un nombre a snake_case (ej: "DetallePedido" -> "detalle_pedido")
 */
export function toSnakeCase(str: string): string {
  const clean = str
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_]/g, "_");
  
  return clean
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/_+/g, "_")
    .toLowerCase();
}

/**
 * Convierte un nombre a plural en formato URL (ej: "Usuario" -> "usuarios", "Pais" -> "paises")
 */
export function toPluralUrl(str: string): string {
  const base = toSnakeCase(str);
  if (base.endsWith("s") || base.endsWith("x") || base.endsWith("z")) {
    return `${base}es`;
  }
  if (base.endsWith("a") || base.endsWith("e") || base.endsWith("i") || base.endsWith("o") || base.endsWith("u")) {
    return `${base}s`;
  }
  return `${base}es`;
}

/**
 * Mapea un tipo de dato UML a su correspondiente tipo Java y tipo SQL
 */
export function mapUmlTypeToJava(rawType?: string): { javaType: string; isPrimitive: boolean; defaultValue: string; sampleJson: any; sqlCol: string } {
  const t = (rawType || "").toLowerCase().trim();

  if (t === "int" || t === "integer" || t === "number" || t === "entero") {
    return { javaType: "Integer", isPrimitive: false, defaultValue: "0", sampleJson: 1, sqlCol: "INTEGER" };
  }
  if (t === "long" || t === "bigint") {
    return { javaType: "Long", isPrimitive: false, defaultValue: "1L", sampleJson: 1, sqlCol: "BIGINT" };
  }
  if (t === "float" || t === "real") {
    return { javaType: "Float", isPrimitive: false, defaultValue: "0.0f", sampleJson: 12.5, sqlCol: "REAL" };
  }
  if (t === "double" || t === "decimal" || t === "numeric") {
    return { javaType: "Double", isPrimitive: false, defaultValue: "0.0", sampleJson: 99.99, sqlCol: "DOUBLE PRECISION" };
  }
  if (t === "bool" || t === "boolean" || t === "booleano") {
    return { javaType: "Boolean", isPrimitive: false, defaultValue: "true", sampleJson: true, sqlCol: "BOOLEAN" };
  }
  if (t === "date" || t === "fecha") {
    return { javaType: "LocalDate", isPrimitive: false, defaultValue: "LocalDate.now()", sampleJson: "2026-09-05", sqlCol: "DATE" };
  }
  if (t === "datetime" || t === "timestamp" || t === "fechahora") {
    return { javaType: "LocalDateTime", isPrimitive: false, defaultValue: "LocalDateTime.now()", sampleJson: "2026-09-05T12:00:00", sqlCol: "TIMESTAMP" };
  }
  if (t === "json" || t === "jsonb") {
    return { javaType: "String", isPrimitive: false, defaultValue: "\"{}\"", sampleJson: "{}", sqlCol: "TEXT" };
  }

  // Por defecto String
  return { javaType: "String", isPrimitive: false, defaultValue: "\"sample\"", sampleJson: "ejemplo", sqlCol: "VARCHAR(255)" };
}

export interface ParsedAttribute {
  name: string;
  javaType: string;
  sqlCol: string;
  isId: boolean;
  visibility: string;
  sampleJson: any;
}

export interface ParsedRelationship {
  sourceClassName: string;
  targetClassName: string;
  relationType: string;
  sourceMultiplicity: string;
  targetMultiplicity: string;
  name?: string;
}

export interface ParsedClass {
  id: string;
  name: string;
  pascalName: string;
  camelName: string;
  tableName: string;
  urlPath: string;
  stereotype?: string;
  attributes: ParsedAttribute[];
  methods: UmlMethod[];
  primaryKeyAttr: ParsedAttribute;
  incomingRelations: ParsedRelationship[];
  outgoingRelations: ParsedRelationship[];
}

/**
 * Parsea y normaliza las clases y relaciones del lienzo de React Flow
 */
export function parseCanvasData(nodes: Node[], edges: Edge[]): { classes: ParsedClass[]; relations: ParsedRelationship[] } {
  const classNodes = nodes.filter((n) => n.type === "umlClass" && n.data);
  const classMap = new Map<string, ParsedClass>();

  // 1. Extraer clases y sus atributos
  for (const node of classNodes) {
    const data = (node.data as unknown) as UmlClassData;
    const rawName = (data?.name || "Entidad").trim();
    const pascalName = toPascalCase(rawName);
    const camelName = toCamelCase(rawName);
    const tableName = toSnakeCase(rawName);
    const urlPath = toPluralUrl(rawName);

    const rawAttributes = Array.isArray(data.attributes) ? data.attributes : [];
    const parsedAttributes: ParsedAttribute[] = [];
    let hasExplicitId = false;
    let idAttr: ParsedAttribute | null = null;

    for (const rawAttr of rawAttributes) {
      let attrName = "";
      let attrType = "string";
      let attrVis = "+";

      if (typeof rawAttr === "string") {
        const clean = rawAttr.trim();
        const visMatch = clean.match(/^([+\-#~])\s*(.*)$/);
        let remainder = clean;
        if (visMatch) {
          attrVis = visMatch[1];
          remainder = visMatch[2];
        }
        const parts = remainder.split(":");
        attrName = parts[0]?.trim() || "";
        attrType = parts[1]?.trim() || "string";
      } else if (rawAttr && typeof rawAttr === "object") {
        const obj = rawAttr as UmlAttribute;
        attrName = obj.name || "";
        attrType = obj.type || "string";
        attrVis = obj.visibility || "+";
      }

      const cleanAttrName = toCamelCase(attrName.replace(/[^a-zA-Z0-9_]/g, ""));
      if (!cleanAttrName) continue;

      const typeInfo = mapUmlTypeToJava(attrType);
      const isId = cleanAttrName.toLowerCase() === "id" || cleanAttrName.toLowerCase() === `${camelName.toLowerCase()}id` || cleanAttrName.toLowerCase() === `id_${camelName.toLowerCase()}`;

      if (isId && !hasExplicitId) {
        hasExplicitId = true;
      }

      const parsed: ParsedAttribute = {
        name: cleanAttrName,
        javaType: isId ? "Long" : typeInfo.javaType,
        sqlCol: typeInfo.sqlCol,
        isId,
        visibility: attrVis,
        sampleJson: isId ? 1 : typeInfo.sampleJson,
      };

      if (isId) {
        idAttr = parsed;
      }

      parsedAttributes.push(parsed);
    }

    // Si no tiene atributo ID explícito, agregar uno por defecto
    if (!idAttr) {
      idAttr = {
        name: "id",
        javaType: "Long",
        sqlCol: "BIGINT",
        isId: true,
        visibility: "+",
        sampleJson: 1,
      };
      parsedAttributes.unshift(idAttr);
    }

    const rawMethods = Array.isArray(data.methods) ? data.methods : [];
    const parsedMethods: UmlMethod[] = [];
    for (const m of rawMethods) {
      if (typeof m === "string") {
        parsedMethods.push({
          id: `m-${Math.random()}`,
          name: m,
          visibility: "+",
          parameters: "",
          returnType: "void",
        });
      } else if (m && typeof m === "object") {
        parsedMethods.push(m);
      }
    }

    const parsedClass: ParsedClass = {
      id: node.id,
      name: rawName,
      pascalName,
      camelName,
      tableName,
      urlPath,
      stereotype: data.stereotype,
      attributes: parsedAttributes,
      methods: parsedMethods,
      primaryKeyAttr: idAttr,
      incomingRelations: [],
      outgoingRelations: [],
    };

    classMap.set(node.id, parsedClass);
  }

  // 2. Extraer relaciones entre clases
  const relations: ParsedRelationship[] = [];
  for (const edge of edges) {
    const sourceClass = classMap.get(edge.source);
    const targetClass = classMap.get(edge.target);

    if (sourceClass && targetClass) {
      const edgeData = ((edge.data || {}) as unknown) as UmlEdgeData;
      const relationType = edgeData.relationType || "ASSOCIATION";
      const sourceMultiplicity = edgeData.sourceMultiplicity || "";
      const targetMultiplicity = edgeData.targetMultiplicity || "";

      const rel: ParsedRelationship = {
        sourceClassName: sourceClass.pascalName,
        targetClassName: targetClass.pascalName,
        relationType,
        sourceMultiplicity,
        targetMultiplicity,
        name: edgeData.name,
      };

      relations.push(rel);
      sourceClass.outgoingRelations.push(rel);
      targetClass.incomingRelations.push(rel);
    }
  }

  return {
    classes: Array.from(classMap.values()),
    relations,
  };
}

/**
 * Genera el archivo pom.xml para Spring Boot 3.3 con Java 17 y PostgreSQL
 */
function generatePomXml(projectName: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" 
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.3</version>
        <relativePath/> <!-- lookup parent from repository -->
    </parent>
    <groupId>com.example</groupId>
    <artifactId>${toSnakeCase(projectName || "backend")}</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>${toPascalCase(projectName || "Backend")}</name>
    <description>Proyecto Spring Boot autogenerado a partir de Diagrama de Clases UML</description>

    <properties>
        <java.version>17</java.version>
    </properties>

    <dependencies>
        <!-- Spring Boot Starters -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>

        <!-- PostgreSQL Driver -->
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>

        <!-- Testing -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
`;
}

/**
 * Genera el archivo application.properties configurado para PostgreSQL mediante variables de entorno
 */
function generateApplicationProperties(projectName: string): string {
  return `# ===================================================================
# Configuración Principal de Spring Boot y Servidor
# ===================================================================
spring.application.name=${toSnakeCase(projectName || "backend")}
server.port=\${PORT:8080}

# Habilitar logging de consultas SQL
logging.level.org.hibernate.SQL=DEBUG
logging.level.org.hibernate.type.descriptor.sql.BasicBinder=TRACE

# ===================================================================
# Conexión a Base de Datos PostgreSQL con Variables de Entorno
# ===================================================================
spring.datasource.url=jdbc:postgresql://\${DB_HOST:localhost}:\${DB_PORT:5432}/\${DB_NAME:diagrama_db}
spring.datasource.username=\${DB_USER:postgres}
spring.datasource.password=\${DB_PASSWORD:postgres}
spring.datasource.driver-class-name=org.postgresql.Driver

# ===================================================================
# Configuración de Hibernate / JPA
# ===================================================================
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.open-in-view=false

# ===================================================================
# Configuración de Jackson para serialización JSON
# ===================================================================
spring.jackson.serialization.fail-on-empty-beans=false
spring.jackson.serialization.write-dates-as-timestamps=false
`;
}

/**
 * Genera el archivo .env.example
 */
function generateEnvExample(): string {
  return `# ===================================================================
# Variables de Entorno para la Base de Datos PostgreSQL y el Servidor
# Copia este archivo a '.env' o expórtalas en tu terminal
# ===================================================================

PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_NAME=diagrama_db
DB_USER=postgres
DB_PASSWORD=tu_password_postgres
`;
}

/**
 * Genera la clase principal BackendApplication.java
 */
function generateApplicationClass(projectName: string): string {
  const className = `${toPascalCase(projectName || "Backend")}Application`;
  return `package com.example.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ${className} {

    public static void main(String[] args) {
        SpringApplication.run(${className}.class, args);
        System.out.println("=================================================");
        System.out.println("🚀 Backend Spring Boot iniciado correctamente!");
        System.out.println("📚 Endpoints disponibles en: http://localhost:8080/api/schemas");
        System.out.println("=================================================");
    }
}
`;
}

/**
 * Genera la entidad JPA Model/Entity
 */
function generateEntityClass(cls: ParsedClass): string {
  const imports = new Set<string>([
    "jakarta.persistence.*",
    "java.io.Serializable",
  ]);

  for (const attr of cls.attributes) {
    if (attr.javaType === "LocalDate") {
      imports.add("java.time.LocalDate");
    } else if (attr.javaType === "LocalDateTime") {
      imports.add("java.time.LocalDateTime");
    }
  }

  // Generación de campos
  const fieldDeclarations: string[] = [];
  const getterSetters: string[] = [];

  for (const attr of cls.attributes) {
    const isPk = attr.isId;
    let fieldCode = "";

    if (isPk) {
      fieldCode += `    @Id\n`;
      fieldCode += `    @GeneratedValue(strategy = GenerationType.IDENTITY)\n`;
      fieldCode += `    @Column(name = "${toSnakeCase(attr.name)}")\n`;
    } else {
      fieldCode += `    @Column(name = "${toSnakeCase(attr.name)}")\n`;
    }

    fieldCode += `    private ${attr.javaType} ${attr.name};\n`;
    fieldDeclarations.push(fieldCode);

    // Getters y Setters
    const capName = attr.name.charAt(0).toUpperCase() + attr.name.slice(1);
    getterSetters.push(`    public ${attr.javaType} get${capName}() {
        return this.${attr.name};
    }

    public void set${capName}(${attr.javaType} ${attr.name}) {
        this.${attr.name} = ${attr.name};
    }`);
  }

  const importStatements = Array.from(imports)
    .sort()
    .map((i) => `import ${i};`)
    .join("\n");

  return `package com.example.backend.model;

${importStatements}

/**
 * Entidad JPA generada para la clase UML: ${cls.name}
 * Tabla en PostgreSQL: ${cls.tableName}
 */
@Entity
@Table(name = "${cls.tableName}")
public class ${cls.pascalName} implements Serializable {

    private static final long serialVersionUID = 1L;

${fieldDeclarations.join("\n")}

    // Constructor vacío requerido por JPA
    public ${cls.pascalName}() {
    }

${getterSetters.join("\n\n")}
}
`;
}

/**
 * Genera la interfaz Repository de Spring Data JPA
 */
function generateRepositoryClass(cls: ParsedClass): string {
  return `package com.example.backend.repository;

import com.example.backend.model.${cls.pascalName};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repositorio Spring Data JPA para la entidad ${cls.pascalName}
 */
@Repository
public interface ${cls.pascalName}Repository extends JpaRepository<${cls.pascalName}, ${cls.primaryKeyAttr.javaType}> {
}
`;
}

/**
 * Genera la interfaz Service
 */
function generateServiceInterface(cls: ParsedClass): string {
  return `package com.example.backend.service;

import com.example.backend.model.${cls.pascalName};
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Interfaz de servicio para operaciones de negocio de ${cls.pascalName}
 */
public interface ${cls.pascalName}Service {

    List<${cls.pascalName}> findAll();

    Optional<${cls.pascalName}> findById(${cls.primaryKeyAttr.javaType} id);

    ${cls.pascalName} save(${cls.pascalName} entity);

    ${cls.pascalName} update(${cls.primaryKeyAttr.javaType} id, ${cls.pascalName} entity);

    boolean deleteById(${cls.primaryKeyAttr.javaType} id);

    Map<String, Object> getSchema();
}
`;
}

/**
 * Genera la implementación de servicio ServiceImpl
 */
function generateServiceImplClass(cls: ParsedClass): string {
  // Construir metadata del esquema
  const attributesMetadata = cls.attributes.map((a) => {
    return `        attrs.add(Map.of("name", "${a.name}", "type", "${a.javaType}", "sqlType", "${a.sqlCol}", "isId", ${a.isId}, "visibility", "${a.visibility}"));`;
  }).join("\n");

  const updateSetters = cls.attributes
    .filter((a) => !a.isId)
    .map((a) => {
      const capName = a.name.charAt(0).toUpperCase() + a.name.slice(1);
      return `            existing.set${capName}(entity.get${capName}());`;
    })
    .join("\n");

  return `package com.example.backend.service.impl;

import com.example.backend.model.${cls.pascalName};
import com.example.backend.repository.${cls.pascalName}Repository;
import com.example.backend.service.${cls.pascalName}Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Implementación de lógica de negocio para la entidad ${cls.pascalName}
 */
@Service
@Transactional
public class ${cls.pascalName}ServiceImpl implements ${cls.pascalName}Service {

    private final ${cls.pascalName}Repository repository;

    @Autowired
    public ${cls.pascalName}ServiceImpl(${cls.pascalName}Repository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<${cls.pascalName}> findAll() {
        return repository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<${cls.pascalName}> findById(${cls.primaryKeyAttr.javaType} id) {
        return repository.findById(id);
    }

    @Override
    public ${cls.pascalName} save(${cls.pascalName} entity) {
        return repository.save(entity);
    }

    @Override
    public ${cls.pascalName} update(${cls.primaryKeyAttr.javaType} id, ${cls.pascalName} entity) {
        return repository.findById(id).map(existing -> {
${updateSetters}
            return repository.save(existing);
        }).orElseThrow(() -> new RuntimeException("No se encontró la entidad ${cls.pascalName} con ID: " + id));
    }

    @Override
    public boolean deleteById(${cls.primaryKeyAttr.javaType} id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return true;
        }
        return false;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getSchema() {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("className", "${cls.pascalName}");
        schema.put("tableName", "${cls.tableName}");
        schema.put("endpoint", "/api/${cls.urlPath}");

        List<Map<String, Object>> attrs = new ArrayList<>();
${attributesMetadata}
        schema.put("attributes", attrs);

        return schema;
    }
}
`;
}

/**
 * Genera el Controller REST con CRUD y schema
 */
function generateControllerClass(cls: ParsedClass): string {
  return `package com.example.backend.controller;

import com.example.backend.model.${cls.pascalName};
import com.example.backend.service.${cls.pascalName}Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST para operaciones CRUD y Esquema de ${cls.pascalName}
 */
@RestController
@RequestMapping("/api/${cls.urlPath}")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class ${cls.pascalName}Controller {

    private final ${cls.pascalName}Service service;

    @Autowired
    public ${cls.pascalName}Controller(${cls.pascalName}Service service) {
        this.service = service;
    }

    /**
     * Obtener el esquema y metadatos de la clase ${cls.pascalName}
     */
    @GetMapping("/schema")
    public ResponseEntity<Map<String, Object>> getSchema() {
        return ResponseEntity.ok(service.getSchema());
    }

    /**
     * Listar todos los registros de ${cls.pascalName}
     */
    @GetMapping
    public ResponseEntity<List<${cls.pascalName}>> getAll() {
        return ResponseEntity.ok(service.findAll());
    }

    /**
     * Obtener un registro de ${cls.pascalName} por su ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<${cls.pascalName}> getById(@PathVariable ${cls.primaryKeyAttr.javaType} id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Crear un nuevo registro de ${cls.pascalName}
     */
    @PostMapping
    public ResponseEntity<${cls.pascalName}> create(@RequestBody ${cls.pascalName} entity) {
        ${cls.pascalName} created = service.save(entity);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    /**
     * Actualizar un registro existente de ${cls.pascalName}
     */
    @PutMapping("/{id}")
    public ResponseEntity<${cls.pascalName}> update(@PathVariable ${cls.primaryKeyAttr.javaType} id, @RequestBody ${cls.pascalName} entity) {
        try {
            ${cls.pascalName} updated = service.update(id, entity);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Eliminar un registro de ${cls.pascalName} por su ID
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable ${cls.primaryKeyAttr.javaType} id) {
        if (service.deleteById(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
`;
}

/**
 * Genera el controlador global de esquemas /api/schemas
 */
function generateGlobalSchemaController(classes: ParsedClass[]): string {
  const schemaInvocations = classes.map((c) => {
    return `        schemas.add(Map.of(
            "className", "${c.pascalName}",
            "tableName", "${c.tableName}",
            "baseEndpoint", "/api/${c.urlPath}",
            "schemaEndpoint", "/api/${c.urlPath}/schema",
            "crudEndpoints", Map.of(
                "GET_ALL", "GET /api/${c.urlPath}",
                "GET_BY_ID", "GET /api/${c.urlPath}/{id}",
                "CREATE", "POST /api/${c.urlPath}",
                "UPDATE", "PUT /api/${c.urlPath}/{id}",
                "DELETE", "DELETE /api/${c.urlPath}/{id}"
            )
        ));`;
  }).join("\n");

  return `package com.example.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Controlador global para consultar el catálogo de esquemas del diagrama UML
 */
@RestController
@RequestMapping("/api/schemas")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class GlobalSchemaController {

    @GetMapping
    public ResponseEntity<Map<String, Object>> getCatalog() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("system", "Diagrama de Clases UML - Backend Spring Boot");
        response.put("totalClasses", ${classes.length});

        List<Map<String, Object>> schemas = new ArrayList<>();
${schemaInvocations}
        response.put("classes", schemas);

        return ResponseEntity.ok(response);
    }
}
`;
}

/**
 * Genera el archivo requests.http para pruebas rápidas
 */
function generateRequestsHttp(classes: ParsedClass[]): string {
  let content = `### ===================================================================
### ARCHIVO DE PRUEBAS DE ENDPOINTS (HTTP CLIENT / REST CLIENT)
### Compatible con: VS Code REST Client, IntelliJ IDEA HTTP Client, Postman
### ===================================================================

@baseUrl = http://localhost:8080/api

### -------------------------------------------------------------------
### 0. CATÁLOGO GLOBAL DE ESQUEMAS
### -------------------------------------------------------------------
# @name CatalogoGlobal
GET {{baseUrl}}/schemas
Accept: application/json

`;

  for (const cls of classes) {
    // Construir body de ejemplo con tipos correctos
    const sampleBodyObj: Record<string, any> = {};
    for (const attr of cls.attributes) {
      if (!attr.isId) {
        sampleBodyObj[attr.name] = attr.sampleJson;
      }
    }
    const sampleJsonStr = JSON.stringify(sampleBodyObj, null, 2);

    content += `
### ===================================================================
### CRUD Y ESQUEMA: ${cls.pascalName} (Tabla: ${cls.tableName})
### ===================================================================

### 1. Obtener Esquema de ${cls.pascalName}
# @name ObtenerEsquema_${cls.pascalName}
GET {{baseUrl}}/${cls.urlPath}/schema
Accept: application/json

### 2. Listar todos los registros de ${cls.pascalName}
# @name Listar_${cls.pascalName}
GET {{baseUrl}}/${cls.urlPath}
Accept: application/json

### 3. Crear nuevo registro en ${cls.pascalName}
# @name Crear_${cls.pascalName}
POST {{baseUrl}}/${cls.urlPath}
Content-Type: application/json

${sampleJsonStr}

### 4. Obtener ${cls.pascalName} por ID
# @name ObtenerPorId_${cls.pascalName}
GET {{baseUrl}}/${cls.urlPath}/1
Accept: application/json

### 5. Actualizar ${cls.pascalName} por ID
# @name Actualizar_${cls.pascalName}
PUT {{baseUrl}}/${cls.urlPath}/1
Content-Type: application/json

${sampleJsonStr}

### 6. Eliminar ${cls.pascalName} por ID
# @name Eliminar_${cls.pascalName}
DELETE {{baseUrl}}/${cls.urlPath}/1
Accept: application/json

`;
  }

  return content;
}

/**
 * Genera la colección de Postman JSON v2.1
 */
function generatePostmanCollection(projectName: string, classes: ParsedClass[]): string {
  const items = classes.map((cls) => {
    const sampleBodyObj: Record<string, any> = {};
    for (const attr of cls.attributes) {
      if (!attr.isId) {
        sampleBodyObj[attr.name] = attr.sampleJson;
      }
    }

    return {
      name: cls.pascalName,
      item: [
        {
          name: `1. Esquema de ${cls.pascalName}`,
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: `{{baseUrl}}/${cls.urlPath}/schema`,
              host: ["{{baseUrl}}"],
              path: [cls.urlPath, "schema"],
            },
          },
        },
        {
          name: `2. Listar todos (${cls.pascalName})`,
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: `{{baseUrl}}/${cls.urlPath}`,
              host: ["{{baseUrl}}"],
              path: [cls.urlPath],
            },
          },
        },
        {
          name: `3. Crear ${cls.pascalName}`,
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify(sampleBodyObj, null, 2),
            },
            url: {
              raw: `{{baseUrl}}/${cls.urlPath}`,
              host: ["{{baseUrl}}"],
              path: [cls.urlPath],
            },
          },
        },
        {
          name: `4. Obtener ${cls.pascalName} por ID`,
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: `{{baseUrl}}/${cls.urlPath}/1`,
              host: ["{{baseUrl}}"],
              path: [cls.urlPath, "1"],
            },
          },
        },
        {
          name: `5. Actualizar ${cls.pascalName}`,
          request: {
            method: "PUT",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify(sampleBodyObj, null, 2),
            },
            url: {
              raw: `{{baseUrl}}/${cls.urlPath}/1`,
              host: ["{{baseUrl}}"],
              path: [cls.urlPath, "1"],
            },
          },
        },
        {
          name: `6. Eliminar ${cls.pascalName}`,
          request: {
            method: "DELETE",
            header: [],
            url: {
              raw: `{{baseUrl}}/${cls.urlPath}/1`,
              host: ["{{baseUrl}}"],
              path: [cls.urlPath, "1"],
            },
          },
        },
      ],
    };
  });

  const collection = {
    info: {
      name: `${projectName || "Backend Spring Boot"} - API Collection`,
      description: "Colección de endpoints CRUD y esquemas generados a partir del diagrama UML",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    variable: [
      {
        key: "baseUrl",
        value: "http://localhost:8080/api",
        type: "string",
      },
    ],
    item: [
      {
        name: "Catálogo Global de Esquemas",
        request: {
          method: "GET",
          header: [{ key: "Accept", value: "application/json" }],
          url: {
            raw: "{{baseUrl}}/schemas",
            host: ["{{baseUrl}}"],
            path: ["schemas"],
          },
        },
      },
      ...items,
    ],
  };

  return JSON.stringify(collection, null, 2);
}

/**
 * Genera el archivo README.md con instrucciones claras
 */
function generateReadme(projectName: string, classes: ParsedClass[]): string {
  return `# ${toPascalCase(projectName || "Backend Spring Boot")}

Proyecto backend autogenerado en **Spring Boot 3.3** con **Java 17**, **Spring Data JPA** y **PostgreSQL**, siguiendo la arquitectura de capas **MVC (Model, Repository, Service, Controller)** a partir del Diagrama de Clases UML.

---

## 🚀 Requisitos Previos

- **Java Development Kit (JDK) 17 o superior** instalado.
- **PostgreSQL 12 o superior** en ejecución.
- (Opcional) **Maven 3.8+** si deseas usar \`mvn\` local, o utilizar el wrapper \`mvnw\`.

---

## ⚙️ Configuración de Base de Datos PostgreSQL

El proyecto está preconfigurado para leer las credenciales mediante **variables de entorno**.

| Variable | Descripción | Valor por Defecto |
| :--- | :--- | :--- |
| \`PORT\` | Puerto donde correrá el servidor | \`8080\` |
| \`DB_HOST\` | Host de PostgreSQL | \`localhost\` |
| \`DB_PORT\` | Puerto de PostgreSQL | \`5432\` |
| \`DB_NAME\` | Nombre de la base de datos | \`diagrama_db\` |
| \`DB_USER\` | Usuario de PostgreSQL | \`postgres\` |
| \`DB_PASSWORD\` | Contraseña del usuario | \`postgres\` |

> **Nota:** Crea previamente la base de datos en PostgreSQL si aún no existe:
> \`\`\`sql
> CREATE DATABASE diagrama_db;
> \`\`\`

---

## 💻 Cómo Ejecutar el Proyecto

### Opción A: En Windows (PowerShell)
\`\`\`powershell
# Establecer variables de entorno para la sesión
$env:DB_HOST="localhost"
$env:DB_PORT="5432"
$env:DB_NAME="diagrama_db"
$env:DB_USER="postgres"
$env:DB_PASSWORD="tu_password_aqui"

# Ejecutar con Maven Wrapper o Maven
./mvnw spring-boot:run
# o: mvn spring-boot:run
\`\`\`

### Opción B: En Linux / macOS / Bash
\`\`\`bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=diagrama_db
export DB_USER=postgres
export DB_PASSWORD=tu_password_aqui

./mvnw spring-boot:run
# o: mvn spring-boot:run
\`\`\`

---

## 🧪 Pruebas de Endpoints

### 1. Archivo \`requests.http\`
Abre el archivo \`requests.http\` en **Visual Studio Code** (con la extensión REST Client) o en **IntelliJ IDEA** y haz clic directamente en \`Send Request\` sobre cualquiera de las peticiones.

### 2. Colección de Postman
Importa el archivo \`postman_collection.json\` en **Postman** para tener todos los requests listos y organizados por carpetas.

---

## 📋 Catálogo de Clases y Endpoints Generados

${classes.map((c) => `### Entidad: \`${c.pascalName}\` (Tabla: \`${c.tableName}\`)
- **Esquema:** \`GET /api/${c.urlPath}/schema\`
- **Listar todos:** \`GET /api/${c.urlPath}\`
- **Obtener por ID:** \`GET /api/${c.urlPath}/{id}\`
- **Crear:** \`POST /api/${c.urlPath}\`
- **Actualizar:** \`PUT /api/${c.urlPath}/{id}\`
- **Eliminar:** \`DELETE /api/${c.urlPath}/{id}\`
`).join("\n")}
`;
}

/**
 * Función principal para generar el proyecto Spring Boot completo
 */
export function generateSpringBootProject(
  diagramName: string,
  nodes: Node[],
  edges: Edge[]
): SpringBootProjectResult {
  const projectName = diagramName || "BackendDiagrama";
  const { classes, relations } = parseCanvasData(nodes, edges);

  const files: GeneratedFile[] = [];

  // 1. pom.xml
  files.push({
    path: "pom.xml",
    content: generatePomXml(projectName),
    category: "config",
  });

  // 2. application.properties
  files.push({
    path: "src/main/resources/application.properties",
    content: generateApplicationProperties(projectName),
    category: "config",
  });

  // 3. .env.example
  files.push({
    path: ".env.example",
    content: generateEnvExample(),
    category: "config",
  });

  // 4. README.md
  files.push({
    path: "README.md",
    content: generateReadme(projectName, classes),
    category: "doc",
  });

  // 5. requests.http
  const httpRequestsCode = generateRequestsHttp(classes);
  files.push({
    path: "requests.http",
    content: httpRequestsCode,
    category: "test",
  });

  // 6. postman_collection.json
  const postmanCollectionJson = generatePostmanCollection(projectName, classes);
  files.push({
    path: "postman_collection.json",
    content: postmanCollectionJson,
    category: "test",
  });

  // 7. BackendApplication.java
  files.push({
    path: `src/main/java/com/example/backend/${toPascalCase(projectName)}Application.java`,
    content: generateApplicationClass(projectName),
    category: "config",
  });

  // 8. GlobalSchemaController.java
  files.push({
    path: "src/main/java/com/example/backend/controller/GlobalSchemaController.java",
    content: generateGlobalSchemaController(classes),
    category: "controller",
  });

  // 9. Clases del diagrama (Model, Repository, Service, ServiceImpl, Controller)
  for (const cls of classes) {
    // Model / Entity
    files.push({
      path: `src/main/java/com/example/backend/model/${cls.pascalName}.java`,
      content: generateEntityClass(cls),
      category: "model",
    });

    // Repository
    files.push({
      path: `src/main/java/com/example/backend/repository/${cls.pascalName}Repository.java`,
      content: generateRepositoryClass(cls),
      category: "repository",
    });

    // Service Interface
    files.push({
      path: `src/main/java/com/example/backend/service/${cls.pascalName}Service.java`,
      content: generateServiceInterface(cls),
      category: "service",
    });

    // Service Implementation
    files.push({
      path: `src/main/java/com/example/backend/service/impl/${cls.pascalName}ServiceImpl.java`,
      content: generateServiceImplClass(cls),
      category: "service",
    });

    // Controller
    files.push({
      path: `src/main/java/com/example/backend/controller/${cls.pascalName}Controller.java`,
      content: generateControllerClass(cls),
      category: "controller",
    });
  }

  // Generador de ZIP en Blob
  const generateZipBlob = async (): Promise<Blob> => {
    const zip = new JSZip();
    const rootFolder = zip.folder(toSnakeCase(projectName || "backend_project")) || zip;

    for (const file of files) {
      rootFolder.file(file.path, file.content);
    }

    return await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
    });
  };

  // Descarga directa en el navegador
  const downloadZip = async (): Promise<void> => {
    const blob = await generateZipBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${toSnakeCase(projectName || "backend")}_springboot.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    projectName,
    files,
    summary: {
      totalEntities: classes.length,
      totalEndpoints: classes.length * 6 + 1, // 6 endpoints por clase + 1 catálogo global
      entitiesList: classes.map((c) => c.pascalName),
      relationsCount: relations.length,
    },
    httpRequestsCode,
    postmanCollectionJson,
    generateZipBlob,
    downloadZip,
  };
}
