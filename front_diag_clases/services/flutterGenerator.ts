import JSZip from "jszip";
import { Node, Edge } from "@xyflow/react";
import { UmlClassData, UmlEdgeData, UmlAttribute, UmlMethod } from "@/types";

export interface GeneratedFile {
  path: string;
  content: string;
  category: "model" | "service" | "screen" | "config" | "doc";
}

export interface FlutterProjectResult {
  projectName: string;
  files: GeneratedFile[];
  summary: {
    totalEntities: number;
    entitiesList: string[];
    relationsCount: number;
  };
  generateZipBlob: () => Promise<Blob>;
  downloadZip: () => Promise<void>;
}

export interface ParsedFlutterAttribute {
  name: string;
  rawType: string;
  dartType: string;
  defaultValue: string;
  sampleJson: any;
  isId: boolean;
  visibility: string;
}

export interface ParsedFlutterClass {
  id: string;
  name: string;
  pascalName: string;
  camelName: string;
  snakeName: string;
  urlPath: string;
  attributes: ParsedFlutterAttribute[];
  primaryKeyAttr: ParsedFlutterAttribute;
}

/**
 * Convierte un nombre a PascalCase (ej: "DetallePedido", "Producto")
 */
export function toPascalCase(str: string): string {
  if (!str) return "Entity";
  const clean = str
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_ ]/g, "");

  return clean
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

/**
 * Convierte un nombre a camelCase (ej: "detallePedido", "producto")
 */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  if (!pascal) return "entity";
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Convierte un nombre a snake_case (ej: "detalle_pedido", "producto")
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
 * Convierte un nombre a plural en formato URL (ej: "usuario" -> "usuarios")
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
 * Mapea un tipo de dato UML a su correspondiente tipo Dart
 */
export function mapUmlTypeToDart(rawType?: string): { dartType: string; defaultValue: string; sampleJson: any } {
  const t = (rawType || "").toLowerCase().trim();

  if (t === "int" || t === "integer" || t === "entero" || t === "number") {
    return { dartType: "int", defaultValue: "0", sampleJson: 1 };
  }
  if (t === "long" || t === "bigint") {
    return { dartType: "int", defaultValue: "0", sampleJson: 1 };
  }
  if (t === "float" || t === "double" || t === "decimal" || t === "real") {
    return { dartType: "double", defaultValue: "0.0", sampleJson: 99.99 };
  }
  if (t === "bool" || t === "boolean" || t === "booleano") {
    return { dartType: "bool", defaultValue: "false", sampleJson: true };
  }
  if (t === "date" || t === "datetime" || t === "fecha") {
    return { dartType: "String", defaultValue: "''", sampleJson: "2026-09-06" };
  }

  return { dartType: "String", defaultValue: "''", sampleJson: "Texto de ejemplo" };
}

function normalizeAttribute(attr: UmlAttribute | string): UmlAttribute {
  if (typeof attr === "string") {
    const match = attr.match(/^([+\-#~])?\s*([a-zA-Z0-9_$]+)\s*:\s*(.+)$/);
    if (match) {
      return {
        id: `attr-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        visibility: (match[1] as any) || "+",
        name: match[2],
        type: match[3],
      };
    }
    return {
      id: `attr-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      visibility: "+",
      name: attr.replace(/^[+\-#~]\s*/, "").split(":")[0]?.trim() || attr,
      type: attr.split(":")[1]?.trim() || "string",
    };
  }
  return attr;
}

/**
 * Parsea nodos y aristas para estructurar los metadatos de las clases para Flutter
 */
function parseCanvasData(nodes: Node[], edges: Edge[]): { classes: ParsedFlutterClass[]; relationsCount: number } {
  const classNodes = nodes.filter((n) => n.type === "umlClass");
  const parsedClasses: ParsedFlutterClass[] = [];

  classNodes.forEach((node) => {
    const data = node.data as unknown as UmlClassData;
    const rawName = data.name || "ClaseSinNombre";
    const pascalName = toPascalCase(rawName);
    const camelName = toCamelCase(rawName);
    const snakeName = toSnakeCase(rawName);
    const urlPath = toPluralUrl(rawName);

    const attributes: ParsedFlutterAttribute[] = [];
    const rawAttrs: UmlAttribute[] = (Array.isArray(data.attributes) ? data.attributes : []).map(normalizeAttribute);

    rawAttrs.forEach((attr, idx) => {
      const attrName = toCamelCase(attr.name || `campo_${idx + 1}`);
      const typeInfo = mapUmlTypeToDart(attr.type);
      const isId =
        attrName.toLowerCase() === "id" ||
        attrName.toLowerCase() === `id${pascalName.toLowerCase()}` ||
        attrName.toLowerCase() === `id_${snakeName}` ||
        idx === 0;

      attributes.push({
        name: attrName,
        rawType: attr.type || "string",
        dartType: typeInfo.dartType,
        defaultValue: typeInfo.defaultValue,
        sampleJson: typeInfo.sampleJson,
        isId,
        visibility: attr.visibility || "+",
      });
    });

    let primaryKey = attributes.find((a) => a.isId);
    if (!primaryKey) {
      primaryKey = {
        name: "id",
        rawType: "Long",
        dartType: "int",
        defaultValue: "0",
        sampleJson: 1,
        isId: true,
        visibility: "+",
      };
      attributes.unshift(primaryKey);
    }

    parsedClasses.push({
      id: node.id,
      name: rawName,
      pascalName,
      camelName,
      snakeName,
      urlPath,
      attributes,
      primaryKeyAttr: primaryKey,
    });
  });

  return {
    classes: parsedClasses,
    relationsCount: edges.length,
  };
}

/**
 * Genera el archivo pubspec.yaml del proyecto Flutter
 */
function generatePubspecYaml(projectName: string): string {
  const cleanName = toSnakeCase(projectName || "flutter_app");
  return `name: ${cleanName}
description: "Frontend Flutter con IA Local (Voz Offline Vosk + NL a CRUD) generado automáticamente a partir del Diagrama de Clases UML."
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

  # Cliente HTTP para conectar con Backend Spring Boot
  http: ^1.2.2

  # Reconocimiento de Voz de IA Local 100% Offline (On-Device)
  vosk_flutter_service: 0.1.2
  path_provider: ^2.1.4
  archive: ^4.0.0

  # Reconocimiento de Voz nativo (Fallback)
  speech_to_text: ^7.0.0

  # Animaciones e iconos modernos
  flutter_spinkit: ^5.2.1
  intl: ^0.19.0
  cupertino_icons: ^1.0.8

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0

flutter:
  uses-material-design: true
`;
}

/**
 * Genera la configuración de APIs lib/config/api_config.dart
 */
function generateApiConfig(): string {
  return `import 'package:flutter/foundation.dart';

/// Configuración de endpoints y conectividad para Backend Spring Boot y modelos IA Locales.
class ApiConfig {
  /// Puerto por defecto del backend Spring Boot generado
  static const int defaultPort = 8081;

  /// Puerto por defecto del servidor Ollama Local
  static const int ollamaPort = 11434;

  /// URL Base configurable en tiempo de ejecución
  static String customBaseUrl = '';

  /// URL Base de Ollama configurable
  static String customOllamaUrl = '';

  /// Obtiene la URL base adecuada según la plataforma (Web, Emulador Android, o ADB Reverse)
  static String get baseUrl {
    if (customBaseUrl.isNotEmpty) {
      return customBaseUrl;
    }

    if (kIsWeb) {
      return 'http://localhost:\$defaultPort/api';
    }

    // En Android (Físico con ADB Reverse o Emulador)
    // Con 'adb reverse tcp:8081 tcp:8081' se puede usar localhost directamente.
    // Si se usa emulador sin ADB reverse, usar 10.0.2.2
    return 'http://10.0.2.2:\$defaultPort/api';
  }

  /// Obtiene la URL de Ollama Local según la plataforma
  static String get ollamaUrl {
    if (customOllamaUrl.isNotEmpty) {
      return customOllamaUrl;
    }

    if (kIsWeb) {
      return 'http://localhost:\$ollamaPort/api/generate';
    }

    return 'http://10.0.2.2:\$ollamaPort/api/generate';
  }

  /// Modelo de IA local sugerido para Ollama
  static String ollamaModel = 'qwen2.5-coder:1.5b';
}
`;
}

/**
 * Genera un modelo Dart para una entidad UML
 */
function generateDartModel(cls: ParsedFlutterClass): string {
  const fields = cls.attributes.map((a) => `  final ${a.dartType}${a.isId ? '?' : ''} ${a.name};`).join('\n');
  const constructorParams = cls.attributes.map((a) => `    ${a.isId ? '' : 'required '}this.${a.name},`).join('\n');

  const fromJsonAssignments = cls.attributes.map((a) => {
    if (a.dartType === 'int') {
      return a.isId
        ? `      ${a.name}: json['${a.name}'] != null ? int.tryParse(json['${a.name}'].toString()) : null,`
        : `      ${a.name}: int.tryParse(json['${a.name}']?.toString() ?? '0') ?? 0,`;
    }
    if (a.dartType === 'double') {
      return a.isId
        ? `      ${a.name}: json['${a.name}'] != null ? double.tryParse(json['${a.name}'].toString()) : null,`
        : `      ${a.name}: double.tryParse(json['${a.name}']?.toString() ?? '0.0') ?? 0.0,`;
    }
    if (a.dartType === 'bool') {
      return a.isId
        ? `      ${a.name}: json['${a.name}'] != null ? (json['${a.name}'] == true || json['${a.name}'].toString().toLowerCase() == 'true') : null,`
        : `      ${a.name}: json['${a.name}'] == true || json['${a.name}'].toString().toLowerCase() == 'true',`;
    }
    return a.isId
      ? `      ${a.name}: json['${a.name}']?.toString(),`
      : `      ${a.name}: json['${a.name}']?.toString() ?? '',`;
  }).join('\n');

  const toJsonAssignments = cls.attributes.map((a) => {
    return `      '${a.name}': ${a.name},`;
  }).join('\n');

  return `/// Modelo Dart generado automáticamente para la entidad UML: ${cls.name}
class ${cls.pascalName} {
${fields}

  ${cls.pascalName}({
${constructorParams}
  });

  factory ${cls.pascalName}.fromJson(Map<String, dynamic> json) {
    return ${cls.pascalName}(
${fromJsonAssignments}
    );
  }

  Map<String, dynamic> toJson() {
    return {
${toJsonAssignments}
    };
  }
}
`;
}

/**
 * Genera el cliente API lib/services/api_service.dart
 */
function generateApiService(classes: ParsedFlutterClass[]): string {
  return `import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

/// Resultado unificado de ejecución de peticiones REST
class ApiResponse {
  final bool success;
  final int statusCode;
  final String message;
  final dynamic data;
  final String endpoint;
  final String method;

  ApiResponse({
    required this.success,
    required this.statusCode,
    required this.message,
    this.data,
    required this.endpoint,
    required this.method,
  });
}

/// Servicio cliente para interactuar con los endpoints del Backend Spring Boot
class ApiService {
  /// Obtener el catálogo global de esquemas del backend
  static Future<Map<String, dynamic>> fetchSchemaCatalog() async {
    try {
      final response = await http.get(
        Uri.parse('\${ApiConfig.baseUrl}/schemas'),
        headers: {'Accept': 'application/json'},
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        return json.decode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
      }
      return {'error': 'HTTP \${response.statusCode}: No se pudo cargar el catálogo de esquemas.'};
    } catch (e) {
      return {'error': 'Error de conexión con el backend: \$e'};
    }
  }

  /// Ejecuta una acción REST dinámica deducida por la IA
  static Future<ApiResponse> executeRequest({
    required String method,
    required String endpoint,
    Map<String, dynamic>? body,
  }) async {
    final cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/\$endpoint';
    // Si el endpoint ya contiene /api, no duplicarlo
    final fullUrl = cleanEndpoint.startsWith('/api') 
        ? '\${ApiConfig.baseUrl.replaceAll(RegExp(r'/api\$'), '')}\$cleanEndpoint'
        : '\${ApiConfig.baseUrl}\$cleanEndpoint';

    final uri = Uri.parse(fullUrl);
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    try {
      http.Response response;
      final upperMethod = method.toUpperCase();

      switch (upperMethod) {
        case 'GET':
          response = await http.get(uri, headers: headers).timeout(const Duration(seconds: 8));
          break;
        case 'POST':
          response = await http.post(uri, headers: headers, body: json.encode(body ?? {})).timeout(const Duration(seconds: 8));
          break;
        case 'PUT':
          response = await http.put(uri, headers: headers, body: json.encode(body ?? {})).timeout(const Duration(seconds: 8));
          break;
        case 'DELETE':
          response = await http.delete(uri, headers: headers).timeout(const Duration(seconds: 8));
          break;
        default:
          return ApiResponse(
            success: false,
            statusCode: 400,
            message: 'Método HTTP no soportado: \$method',
            endpoint: fullUrl,
            method: method,
          );
      }

      final isSuccess = response.statusCode >= 200 && response.statusCode < 300;
      dynamic parsedData;
      
      if (response.body.isNotEmpty) {
        try {
          parsedData = json.decode(utf8.decode(response.bodyBytes));
        } catch (_) {
          parsedData = response.body;
        }
      }

      String message;
      if (isSuccess) {
        if (upperMethod == 'POST') {
          message = '✅ Registro creado exitosamente en el servidor.';
        } else if (upperMethod == 'PUT') {
          message = '✅ Registro actualizado correctamente.';
        } else if (upperMethod == 'DELETE') {
          message = '✅ Registro eliminado correctamente.';
        } else {
          message = '✅ Consulta ejecutada con éxito.';
        }
      } else {
        message = '⚠️ El servidor respondió con estado \${response.statusCode}';
      }

      return ApiResponse(
        success: isSuccess,
        statusCode: response.statusCode,
        message: message,
        data: parsedData,
        endpoint: fullUrl,
        method: upperMethod,
      );
    } catch (e) {
      return ApiResponse(
        success: false,
        statusCode: 0,
        message: '❌ Error de conexión al backend (\${ApiConfig.baseUrl}): \$e',
        endpoint: fullUrl,
        method: method,
      );
    }
  }
}
`;
}

/**
 * Genera el archivo android/app/src/main/AndroidManifest.xml con permisos de micrófono y queries para Android 11+
 */
function generateAndroidManifest(projectName: string): string {
  return `<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Permisos requeridos para Reconocimiento de Voz y Conectividad con Backend Spring Boot -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

    <!-- Queries requeridas en Android 11+ (API 30+) para acceder al motor de reconocimiento de voz del sistema -->
    <queries>
        <intent>
            <action android:name="android.speech.RecognitionService" />
        </intent>
    </queries>

    <application
        android:label="${projectName}"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher"
        android:usesCleartextTraffic="true">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:taskAffinity=""
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            <meta-data
              android:name="io.flutter.embedding.android.NormalTheme"
              android:resource="@style/NormalTheme"
              />
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
        <meta-data
            android:name="flutterEmbedding"
            android:value="2" />
    </application>
</manifest>
`;
}

/**
 * Genera el servicio de reconocimiento de voz lib/services/speech_service.dart con IA Vosk 100% Offline
 */
function generateSpeechService(): string {
  const d = "$";
  return `import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:archive/archive.dart';
import 'package:vosk_flutter_service/vosk_flutter_service.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;

/// Estado del motor de Reconocimiento de Voz
enum SpeechEngineState {
  uninitialized,
  downloadingModel,
  modelReady,
  listening,
  error,
}

/// Servicio de Reconocimiento de Voz Local con Motor de IA Vosk On-Device 100% Offline
class SpeechService {
  final VoskFlutterPlugin _vosk = VoskFlutterPlugin.instance();
  Recognizer? _voskRecognizer;
  Model? _voskModel;
  dynamic _voskSpeechService;

  final stt.SpeechToText _speechFallback = stt.SpeechToText();
  
  SpeechEngineState state = SpeechEngineState.uninitialized;
  String lastError = '';
  double downloadProgress = 0.0;
  bool _useVosk = true;

  bool get isListening => state == SpeechEngineState.listening || _speechFallback.isListening;
  bool get isOfflineReady => _voskModel != null && _voskRecognizer != null;

  /// URL oficial del modelo Vosk ligero en Español (40 MB)
  static const String modelUrl = 'https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.zip';
  static const String modelFolderName = 'vosk-model-small-es-0.42';

  /// Inicializa el motor Vosk Offline o prueba fallback
  Future<bool> initialize({Function(double progress)? onProgress}) async {
    if (isOfflineReady) {
      state = SpeechEngineState.modelReady;
      return true;
    }

    try {
      final docDir = await getApplicationDocumentsDirectory();
      final modelDir = Directory('${d}{docDir.path}/${d}modelFolderName');

      if (modelDir.existsSync()) {
        _voskModel = await _vosk.createModel(modelDir.path);
        _voskRecognizer = await _vosk.createRecognizer(
          model: _voskModel!,
          sampleRate: 16000,
        );
        _useVosk = true;
        state = SpeechEngineState.modelReady;
        return true;
      }
    } catch (e) {
      debugPrint('Vosk local model init info: ${d}e');
    }

    // Intentar inicializar speech_to_text como fallback
    try {
      final available = await _speechFallback.initialize(
        onError: (err) => lastError = err.errorMsg,
      );
      if (available) {
        _useVosk = false;
        state = SpeechEngineState.modelReady;
        return true;
      }
    } catch (_) {}

    state = SpeechEngineState.uninitialized;
    return false;
  }

  /// Descarga e instala el modelo de IA Vosk Offline en español (~40 MB)
  Future<bool> downloadAndSetupModel({required Function(double progress) onProgress}) async {
    try {
      state = SpeechEngineState.downloadingModel;
      downloadProgress = 0.0;

      final docDir = await getApplicationDocumentsDirectory();
      final zipFile = File('${d}{docDir.path}/vosk_es.zip');
      final modelDir = Directory('${d}{docDir.path}/${d}modelFolderName');

      if (!modelDir.existsSync()) {
        final client = http.Client();
        final request = http.Request('GET', Uri.parse(modelUrl));
        final response = await client.send(request);

        final totalBytes = response.contentLength ?? 42000000;
        int receivedBytes = 0;

        List<int> bytes = [];
        await response.stream.listen((chunk) {
          bytes.addAll(chunk);
          receivedBytes += chunk.length;
          downloadProgress = (receivedBytes / totalBytes).clamp(0.0, 1.0);
          onProgress(downloadProgress);
        }).asFuture();

        await zipFile.writeAsBytes(bytes);

        // Descomprimir el archivo zip
        final archive = ZipDecoder().decodeBytes(await zipFile.readAsBytes());
        for (final file in archive) {
          final filename = '${d}{docDir.path}/${d}{file.name}';
          if (file.isFile) {
            final outFile = File(filename);
            await outFile.create(recursive: true);
            await outFile.writeAsBytes(file.content as List<int>);
          } else {
            await Directory(filename).create(recursive: true);
          }
        }

        if (await zipFile.exists()) {
          await zipFile.delete();
        }
      }

      _voskModel = await _vosk.createModel(modelDir.path);
      _voskRecognizer = await _vosk.createRecognizer(
        model: _voskModel!,
        sampleRate: 16000,
      );

      _useVosk = true;
      state = SpeechEngineState.modelReady;
      return true;
    } catch (e) {
      lastError = 'Error al descargar modelo offline Vosk: ${d}e';
      state = SpeechEngineState.error;
      return false;
    }
  }

  Function(String words)? _onResultCallback;

  Future<void> _ensureSpeechService() async {
    if (_voskSpeechService != null || _voskRecognizer == null) return;
    try {
      _voskSpeechService = await _vosk.initSpeechService(_voskRecognizer!);
      _voskSpeechService.onPartial().listen((partialStr) {
        try {
          final parsed = jsonDecode(partialStr.toString());
          final partial = parsed['partial']?.toString() ?? '';
          if (partial.isNotEmpty && _onResultCallback != null) {
            _onResultCallback!(partial);
          }
        } catch (_) {}
      });

      _voskSpeechService.onResult().listen((resultStr) {
        try {
          final parsed = jsonDecode(resultStr.toString());
          final text = parsed['text']?.toString() ?? '';
          if (text.isNotEmpty && _onResultCallback != null) {
            _onResultCallback!(text);
          }
        } catch (_) {}
      });
    } catch (e) {
      debugPrint('initSpeechService error: ${d}e');
    }
  }

  /// Inicia la escucha offline con Vosk IA
  Future<bool> startListening({
    required Function(String words) onResult,
  }) async {
    _onResultCallback = onResult;

    if (_useVosk && isOfflineReady) {
      try {
        state = SpeechEngineState.listening;
        await _ensureSpeechService();
        await _voskSpeechService?.start();
        return true;
      } catch (e) {
        lastError = 'Error en Vosk listener: ${d}e';
        debugPrint(lastError);
      }
    }

    // Fallback con SpeechToText
    try {
      state = SpeechEngineState.listening;
      await _speechFallback.listen(
        onResult: (res) => onResult(res.recognizedWords),
      );
      return true;
    } catch (e) {
      lastError = 'Error al escuchar: ${d}e';
      state = SpeechEngineState.error;
      return false;
    }
  }

  /// Detiene la escucha
  Future<void> stopListening() async {
    state = isOfflineReady ? SpeechEngineState.modelReady : SpeechEngineState.uninitialized;
    try {
      if (_voskSpeechService != null) {
        await _voskSpeechService.stop();
      }
    } catch (_) {}

    if (_speechFallback.isListening) {
      await _speechFallback.stop();
    }
  }
}
`;
}

/**
 * Genera el servicio de Asistente IA lib/services/ai_assistant_service.dart
 */
function generateAiAssistantService(classes: ParsedFlutterClass[]): string {
  const schemaSummary = classes.map((c) => {
    const attrList = c.attributes.map((a) => `${a.name} (${a.dartType})`).join(', ');
    return `- Clase: ${c.pascalName} -> Endpoint: /api/${c.urlPath} -> Campos: [${attrList}]`;
  }).join('\\n');

  return `import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

/// Estructura de acción interpretada por la IA
class InterpretedAction {
  final String method;
  final String endpoint;
  final Map<String, dynamic>? body;
  final String explanation;

  InterpretedAction({
    required this.method,
    required this.endpoint,
    this.body,
    required this.explanation,
  });
}

/// Orquestador de IA Local para traducir lenguaje natural / audio a operaciones CRUD / REST
class AiAssistantService {
  /// Catálogo de clases UML del diagrama para el prompt de la IA
  static const String systemSchemaContext = '''
${schemaSummary}
''';

  /// Traduce la consulta del usuario a una acción REST
  static Future<InterpretedAction> interpretUserPrompt(String prompt) async {
    final cleanPrompt = prompt.trim();
    if (cleanPrompt.isEmpty) {
      return InterpretedAction(
        method: 'GET',
        endpoint: '/api/schemas',
        explanation: 'Consulta vacía. Mostrando catálogo general de esquemas.',
      );
    }

    // 1. Intentar con servidor Ollama Local (si está activo)
    try {
      final ollamaResult = await _queryOllama(cleanPrompt);
      if (ollamaResult != null) {
        return ollamaResult;
      }
    } catch (_) {
      // Si Ollama no está disponible, continuar con el motor heurístico
    }

    // 2. Fallback: Motor Heurístico Embebido en Dart (Zero-Setup)
    return _heuristicFallback(cleanPrompt);
  }

  /// Consulta al motor Ollama Local
  static Future<InterpretedAction?> _queryOllama(String prompt) async {
    final systemPrompt = '''
Eres un asistente API experto. Tu trabajo es traducir instrucciones en lenguaje natural en español a una llamada HTTP REST exacta para el backend Spring Boot.
Catálogo de entidades disponibles:
\$systemSchemaContext

Instrucciones:
1. Responde ÚNICAMENTE un objeto JSON válido con los campos: "method" (GET, POST, PUT, DELETE), "endpoint" (/api/...), "body" (objeto JSON con datos si es POST/PUT o null), "explanation" (breve texto descriptivo en español).
2. No agregues explicaciones fuera del JSON.
''';

    final requestPayload = {
      'model': ApiConfig.ollamaModel,
      'prompt': '\$systemPrompt\\nUsuario: \$prompt\\nJSON:',
      'stream': false,
      'format': 'json',
    };

    final response = await http.post(
      Uri.parse(ApiConfig.ollamaUrl),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(requestPayload),
    ).timeout(const Duration(seconds: 6));

    if (response.statusCode == 200) {
      final data = json.decode(utf8.decode(response.bodyBytes));
      final responseText = data['response']?.toString() ?? '';
      final parsedJson = json.decode(responseText);

      return InterpretedAction(
        method: parsedJson['method']?.toString().toUpperCase() ?? 'GET',
        endpoint: parsedJson['endpoint']?.toString() ?? '/api/schemas',
        body: parsedJson['body'] is Map<String, dynamic> ? parsedJson['body'] : null,
        explanation: parsedJson['explanation']?.toString() ?? 'Acción generada por IA Local (Ollama)',
      );
    }
    return null;
  }

  /// Analizador heurístico local inteligente en Dart puro (sin dependencias)
  static InterpretedAction _heuristicFallback(String text) {
    final lower = text.toLowerCase();

    // Detección de clase objetivo
${classes.map((c) => `    if (lower.contains('${c.snakeName}') || lower.contains('${c.name.toLowerCase()}') || lower.contains('${c.urlPath}')) {
      if (lower.contains('crea') || lower.contains('nuevo') || lower.contains('agregar') || lower.contains('guardar') || lower.contains('insertar')) {
        return InterpretedAction(
          method: 'POST',
          endpoint: '/api/${c.urlPath}',
          body: {
${c.attributes.filter(a => !a.isId).map(a => `            '${a.name}': ${JSON.stringify(a.sampleJson)},`).join('\n')}
          },
          explanation: 'Creando nuevo registro en ${c.pascalName} (Motor Heurístico)',
        );
      }
      if (lower.contains('elimina') || lower.contains('borra') || lower.contains('remover')) {
        final idMatch = RegExp(r'\\d+').firstMatch(lower);
        final id = idMatch != null ? idMatch.group(0) : '1';
        return InterpretedAction(
          method: 'DELETE',
          endpoint: '/api/${c.urlPath}/\$id',
          explanation: 'Eliminando registro ID \$id de ${c.pascalName}',
        );
      }
      if (lower.contains('actualiza') || lower.contains('modifica') || lower.contains('cambia')) {
        final idMatch = RegExp(r'\\d+').firstMatch(lower);
        final id = idMatch != null ? idMatch.group(0) : '1';
        return InterpretedAction(
          method: 'PUT',
          endpoint: '/api/${c.urlPath}/\$id',
          body: {
${c.attributes.filter(a => !a.isId).map(a => `            '${a.name}': ${JSON.stringify(a.sampleJson)},`).join('\n')}
          },
          explanation: 'Actualizando registro ID \$id de ${c.pascalName}',
        );
      }
      if (lower.contains('esquema') || lower.contains('campos') || lower.contains('columnas')) {
        return InterpretedAction(
          method: 'GET',
          endpoint: '/api/${c.urlPath}/schema',
          explanation: 'Consultando esquema y estructura de ${c.pascalName}',
        );
      }
      return InterpretedAction(
        method: 'GET',
        endpoint: '/api/${c.urlPath}',
        explanation: 'Listando todos los registros de ${c.pascalName}',
      );
    }`).join('\n\n')}

    // Si no identificó ninguna clase específica, consultar el catálogo global
    return InterpretedAction(
      method: 'GET',
      endpoint: '/api/schemas',
      explanation: 'Consultando catálogo de todas las clases disponibles en el backend.',
    );
  }
}
`;
}

/**
 * Genera la pantalla principal lib/screens/home_screen.dart
 */
function generateHomeScreen(projectName: string): string {
  const d = "$";
  return `import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import '../config/api_config.dart';
import '../services/api_service.dart';
import '../services/speech_service.dart';
import '../services/ai_assistant_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController _inputController = TextEditingController();
  final SpeechService _speechService = SpeechService();
  
  String _outputContent = '''🤖 Bienvenido al Asistente UML con IA de Voz 100% Offline (Vosk On-Device).
Presiona el botón de micrófono para hablar sin necesidad de internet.''';
  bool _isProcessing = false;
  bool _isRecording = false;
  bool _isDownloadingModel = false;
  double _modelProgress = 0.0;

  @override
  void initState() {
    super.initState();
    _initSpeech();
  }

  Future<void> _initSpeech() async {
    final ready = await _speechService.initialize();
    if (mounted && !ready) {
      debugPrint('Speech engine requires model setup or permissions.');
    }
  }

  @override
  void dispose() {
    _inputController.dispose();
    super.dispose();
  }

  /// Descarga el modelo de IA Vosk Offline si no está instalado
  Future<void> _downloadSpeechModel() async {
    setState(() {
      _isDownloadingModel = true;
      _outputContent = '⏳ Descargando Modelo de IA de Voz Offline en Español (~40 MB)...\\nEste proceso solo se realiza UNA vez para permitir transcripción sin internet.';
    });

    final success = await _speechService.downloadAndSetupModel(
      onProgress: (p) {
        setState(() {
          _modelProgress = p;
        });
      },
    );

    setState(() {
      _isDownloadingModel = false;
      if (success) {
        _outputContent = '✅ Modelo de IA de Voz Vosk listo. ¡Ya puedes usar el micrófono 100% OFFLINE sin internet ni datos!';
      } else {
        _outputContent = '⚠️ No se pudo descargar el modelo offline. ${d}{_speechService.lastError}\\n\\n💡 Puedes continuar escribiendo instrucciones o reintentar.';
      }
    });
  }

  /// Alterna la grabación de audio con feedback visual
  void _toggleRecording() async {
    if (!_speechService.isOfflineReady) {
      _showDownloadModelDialog();
      return;
    }

    if (_isRecording) {
      await _speechService.stopListening();
      setState(() {
        _isRecording = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('🎙️ Grabación de voz offline detenida.'),
          duration: Duration(seconds: 1),
          backgroundColor: Color(0xFF0284C7),
        ),
      );
    } else {
      final success = await _speechService.startListening(
        onResult: (words) {
          setState(() {
            _inputController.text = words;
          });
        },
      );

      if (success) {
        setState(() {
          _isRecording = true;
          _outputContent = '🎙️ Escuchando con IA Local Offline (Vosk)... Habla ahora (funciona sin internet)...';
        });
      } else {
        setState(() {
          _isRecording = false;
          _outputContent = '⚠️ Error en grabación: ${d}{_speechService.lastError}';
        });
      }
    }
  }

  void _showDownloadModelDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('🧠 Activar IA de Voz 100% Offline'),
        content: const Text(
          'Para transcribir voz en tiempo real sin conexión a Internet se necesita descargar el paquete de voz Vosk en español (~40 MB).\\n\\n¿Deseas descargarlo ahora?',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              _downloadSpeechModel();
            },
            child: const Text('Descargar (40 MB)'),
          ),
        ],
      ),
    );
  }

  /// Ejecuta la consulta procesada por la IA
  Future<void> _executePrompt() async {
    final text = _inputController.text.trim();
    if (text.isEmpty) return;

    if (_isRecording) {
      await _speechService.stopListening();
      setState(() => _isRecording = false);
    }

    setState(() {
      _isProcessing = true;
      _outputContent = '⏳ Analizando instrucción con IA Local...';
    });

    try {
      final action = await AiAssistantService.interpretUserPrompt(text);

      setState(() {
        _outputContent = '🚀 ${d}{action.explanation}\\nInvocando: ${d}{action.method} ${d}{action.endpoint}...';
      });

      final response = await ApiService.executeRequest(
        method: action.method,
        endpoint: action.endpoint,
        body: action.body,
      );

      final buffer = StringBuffer();
      buffer.writeln(response.message);
      buffer.writeln('----------------------------------------');
      buffer.writeln('📡 Petición: ${d}{response.method} ${d}{response.endpoint}');
      buffer.writeln('📊 Estado HTTP: ${d}{response.statusCode}');
      buffer.writeln('----------------------------------------');

      if (response.data != null) {
        try {
          const encoder = JsonEncoder.withIndent('  ');
          buffer.writeln(encoder.convert(response.data));
        } catch (_) {
          buffer.writeln(response.data.toString());
        }
      } else {
        buffer.writeln('(Sin contenido en la respuesta)');
      }

      setState(() {
        _outputContent = buffer.toString();
      });
    } catch (e) {
      setState(() {
        _outputContent = '❌ Error al procesar la solicitud: ${d}e';
      });
    } finally {
      setState(() => _isProcessing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text(
          'Diagramador IA - Cliente Offline',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white),
        ),
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            children: [
              Expanded(
                flex: 6,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFF020617),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  child: Stack(
                    children: [
                      SingleChildScrollView(
                        child: SelectableText(
                          _outputContent,
                          style: const TextStyle(
                            fontFamily: 'monospace',
                            fontSize: 13,
                            color: Color(0xFF38BDF8),
                            height: 1.4,
                          ),
                        ),
                      ),
                      if (_isProcessing || _isDownloadingModel)
                        Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const SpinKitPulse(color: Color(0xFF38BDF8), size: 60.0),
                              if (_isDownloadingModel) ...[
                                const SizedBox(height: 12),
                                Text(
                                  '\${(_modelProgress * 100).toStringAsFixed(1)}%',
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                ),
                              ]
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 14),

              Expanded(
                flex: 3,
                child: Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: _isRecording ? Colors.redAccent : const Color(0xFF475569),
                      width: _isRecording ? 2.0 : 1.0,
                    ),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  child: TextField(
                    controller: _inputController,
                    maxLines: null,
                    expands: true,
                    style: const TextStyle(color: Colors.white, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: _isRecording
                          ? '🎙️ Grabando audio offline... habla ahora...'
                          : 'Escribe una instrucción (ej: "Muestra la lista de productos")...',
                      hintStyle: TextStyle(
                        color: _isRecording ? Colors.redAccent.shade100 : Colors.white38,
                        fontSize: 13,
                      ),
                      border: InputBorder.none,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 14),

              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _isProcessing ? null : _toggleRecording,
                      icon: Icon(_isRecording ? Icons.stop : Icons.mic, color: Colors.white),
                      label: Text(
                        _isRecording ? 'Detener Voz' : 'Grabar Voz (IA Offline)',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _isRecording ? Colors.redAccent : const Color(0xFF0284C7),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: _isProcessing ? null : _executePrompt,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Icon(Icons.send_rounded, color: Colors.white),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
`;
}

/**
 * Genera el archivo lib/main.dart
 */
function generateMainDart(projectName: string): string {
  const title = toPascalCase(projectName || "AppDiagramador");
  return `import 'package:flutter/material.dart';
import 'screens/home_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '${title}',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        colorSchemeSeed: const Color(0xFF0284C7),
        useMaterial3: true,
      ),
      home: const HomeScreen(),
    );
  }
}
`;
}

/**
 * Genera el archivo README.md del proyecto Flutter
 */
function generateReadme(projectName: string, classes: ParsedFlutterClass[]): string {
  const codeBlock = "```";
  return `# Frontend Flutter con IA Local (Vosk Offline): ${toPascalCase(projectName || "Cliente")}

Aplicación móvil y web en **Flutter 3.x** con **Reconocimiento de Voz 100% Offline (Vosk On-Device)** e **IA para Procesamiento de Lenguaje Natural a Consultas CRUD**, generada automáticamente a partir del Diagrama de Clases UML.

---

## 📱 Características

- **Reconocimiento de Voz 100% Offline (Vosk IA On-Device)**: Funciona sin internet ni datos móviles. El audio se procesa en el microprocesador del teléfono.
- **Diseño Minimalista de 2 Cuadros de Texto**:
  - **Cuadro Superior (Output)**: Visor de resultados, mensajes de confirmación de base de datos y respuestas JSON formateadas.
  - **Cuadro Inferior (Input)**: Entrada de texto manual y reflejo automático de la transcripción de audio en tiempo real.
- **IA Local (NLP / NL-to-CRUD)**:
  - Soporte para **Ollama Local** (qwen2.5-coder o llama3.2) ejecutándose en tu PC.
  - **Motor Heurístico Local Embebido**: Funciona de inmediato sin necesidad de descargar modelos pesados.

---

## 🚀 Cómo Ejecutar la Aplicación

### 1. Inicializar estructura nativa y dependencias
${codeBlock}bash
# 1. Generar archivos nativos (Android, Web, Windows)
flutter create .

# 2. Descargar paquetes
flutter pub get
${codeBlock}

---

## 🎤 Reconocimiento de Voz Offline (Vosk)

Al abrir la aplicación por primera vez y presionar **"Grabar Voz (IA Offline)"**, la app ofrecerá descargar el modelo ligero en español (vosk-model-small-es-0.42.zip, ~40 MB). 
Una vez descargado, **podrás apagar el Wi-Fi y los Datos Móviles** y la aplicación transcribirá voz a texto sin conexión a internet de forma permanente.

---

## 🔌 Cómo Conectar con el Backend Spring Boot (:8081)

### Móvil Físico por Cable USB con ADB Reverse (⭐ RECOMENDADA)
${codeBlock}bash
adb reverse tcp:8081 tcp:8081
flutter run
${codeBlock}

---

## 📋 Entidades UML y Endpoints Disponibles

${classes.map((c) => `- **${c.pascalName}**: GET /api/${c.urlPath}, POST /api/${c.urlPath}, PUT /api/${c.urlPath}/{id}, DELETE /api/${c.urlPath}/{id}`).join('\n')}
`;
}

/**
 * Función principal para generar el proyecto Flutter completo
 */
export function generateFlutterProject(
  diagramName: string,
  nodes: Node[],
  edges: Edge[]
): FlutterProjectResult {
  const rawBase = diagramName?.trim() || "diagrama";
  const projectName = `${rawBase}_frontend`;
  const { classes, relationsCount } = parseCanvasData(nodes, edges);

  const files: GeneratedFile[] = [];

  // 1. pubspec.yaml
  files.push({
    path: "pubspec.yaml",
    content: generatePubspecYaml(projectName),
    category: "config",
  });

  // 2. README.md
  files.push({
    path: "README.md",
    content: generateReadme(projectName, classes),
    category: "doc",
  });

  // 3. android/app/src/main/AndroidManifest.xml
  files.push({
    path: "android/app/src/main/AndroidManifest.xml",
    content: generateAndroidManifest(projectName),
    category: "config",
  });

  // 4. lib/config/api_config.dart
  files.push({
    path: "lib/config/api_config.dart",
    content: generateApiConfig(),
    category: "config",
  });

  // 5. Modelos Dart
  for (const cls of classes) {
    files.push({
      path: `lib/models/${cls.snakeName}.dart`,
      content: generateDartModel(cls),
      category: "model",
    });
  }

  // 6. lib/services/api_service.dart
  files.push({
    path: "lib/services/api_service.dart",
    content: generateApiService(classes),
    category: "service",
  });

  // 7. lib/services/speech_service.dart
  files.push({
    path: "lib/services/speech_service.dart",
    content: generateSpeechService(),
    category: "service",
  });

  // 8. lib/services/ai_assistant_service.dart
  files.push({
    path: "lib/services/ai_assistant_service.dart",
    content: generateAiAssistantService(classes),
    category: "service",
  });

  // 9. lib/screens/home_screen.dart
  files.push({
    path: "lib/screens/home_screen.dart",
    content: generateHomeScreen(projectName),
    category: "screen",
  });

  // 10. lib/main.dart
  files.push({
    path: "lib/main.dart",
    content: generateMainDart(projectName),
    category: "config",
  });

  // Generador de ZIP
  const generateZipBlob = async (): Promise<Blob> => {
    const zip = new JSZip();
    const rootFolder = zip.folder(toSnakeCase(projectName || "flutter_app")) || zip;

    for (const file of files) {
      rootFolder.file(file.path, file.content);
    }

    return await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
  };

  // Descargar ZIP en navegador
  const downloadZip = async (): Promise<void> => {
    const blob = await generateZipBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${toSnakeCase(projectName)}.zip`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return {
    projectName,
    files,
    summary: {
      totalEntities: classes.length,
      entitiesList: classes.map((c) => c.pascalName),
      relationsCount,
    },
    generateZipBlob,
    downloadZip,
  };
}

