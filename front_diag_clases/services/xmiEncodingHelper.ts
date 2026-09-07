/**
 * Utilidades de codificación y saneamiento para archivos XML / XMI de Enterprise Architect.
 * Garantiza el soporte de 'ñ', 'Ñ', vocales con tildes y caracteres especiales tanto
 * al importar (archivos en UTF-8, UTF-8 con BOM o Windows-1252 / ANSI) como al exportar.
 */

/**
 * Corrige mojibake y repara caracteres corruptos comunes producidos por
 * incompatibilidades entre UTF-8 y Windows-1252/ANSI o caracteres de reemplazo.
 */
export function cleanSpecialCharacters(text: string): string {
  if (!text) return "";

  let result = text;

  // 1. Reparación de palabras frecuentes que sufrieron corrupción a Unicode Replacement Character (\uFFFD o ï¿½)
  result = result
    .replace(/contrase[ï¿½\uFFFD]a/gi, (match) =>
      match.charAt(match.length - 1) === "A" ? "CONTRASEÑA" : match.charAt(0) === "C" ? "Contraseña" : "contraseña"
    )
    .replace(/dise[ï¿½\uFFFD]o/gi, "diseño")
    .replace(/tama[ï¿½\uFFFD]o/gi, "tamaño")
    .replace(/a[ï¿½\uFFFD]o/gi, "año")
    .replace(/ni[ï¿½\uFFFD]o/gi, "niño")
    .replace(/peque[ï¿½\uFFFD]o/gi, "pequeño")
    .replace(/se[ï¿½\uFFFD]al/gi, "señal")
    .replace(/ba[ï¿½\uFFFD]o/gi, "baño")
    .replace(/ca[ï¿½\uFFFD]on/gi, "cañón")
    .replace(/due[ï¿½\uFFFD]o/gi, "dueño")
    .replace(/sue[ï¿½\uFFFD]o/gi, "sueño")
    .replace(/espa[ï¿½\uFFFD]ol/gi, "español");

  // 2. Reparación de mojibake clásico (UTF-8 interpretado como ISO-8859-1 / Windows-1252)
  const mojibakeMap: [RegExp, string][] = [
    [/Ã±/g, "ñ"],
    [/Ã‘/g, "Ñ"],
    [/Ã¡/g, "á"],
    [/Ã/g, "Á"],
    [/Ã©/g, "é"],
    [/Ã‰/g, "É"],
    [/Ã­/g, "í"],
    [/Ã/g, "Í"],
    [/Ã³/g, "ó"],
    [/Ã“/g, "Ó"],
    [/Ãº/g, "ú"],
    [/Ãš/g, "Ú"],
    [/Ã¼/g, "ü"],
    [/Ãœ/g, "Ü"],
    [/Ã§/g, "ç"],
    [/Ã‡/g, "Ç"],
    [/Â¿/g, "¿"],
    [/Â¡/g, "¡"],
    [/Âº/g, "º"],
    [/Âª/g, "ª"],
  ];

  for (const [pattern, replacement] of mojibakeMap) {
    result = result.replace(pattern, replacement);
  }

  // 3. Entidades HTML / XML numéricas y con nombre
  result = result
    .replace(/&ntilde;/g, "ñ")
    .replace(/&Ntilde;/g, "Ñ")
    .replace(/&#241;/gi, "ñ")
    .replace(/&#xF1;/gi, "ñ")
    .replace(/&#209;/gi, "Ñ")
    .replace(/&#xD1;/gi, "Ñ")
    .replace(/&aacute;/g, "á")
    .replace(/&Aacute;/g, "Á")
    .replace(/&eacute;/g, "é")
    .replace(/&Eacute;/g, "É")
    .replace(/&iacute;/g, "í")
    .replace(/&Iacute;/g, "Í")
    .replace(/&oacute;/g, "ó")
    .replace(/&Oacute;/g, "Ó")
    .replace(/&uacute;/g, "ú")
    .replace(/&Uacute;/g, "Ú")
    .replace(/&#225;/gi, "á")
    .replace(/&#233;/gi, "é")
    .replace(/&#237;/gi, "í")
    .replace(/&#243;/gi, "ó")
    .replace(/&#250;/gi, "ú")
    .replace(/&#193;/gi, "Á")
    .replace(/&#201;/gi, "É")
    .replace(/&#205;/gi, "Í")
    .replace(/&#211;/gi, "Ó")
    .replace(/&#218;/gi, "Ú");

  // 4. Si queda algún ï¿½ o \uFFFD aislado que no fue una palabra reconocida, convertirlo a ñ como heurística
  // en lugar de dejar el carácter de corrupción de diamante
  result = result.replace(/[ï¿½\uFFFD]/g, "ñ");

  return result;
}

/**
 * Escapa los caracteres XML reservados preservando completamente
 * letras con tilde, 'ñ' y 'Ñ' en UTF-8 nativo.
 */
export function escapeXmlWithEncoding(unsafe: string): string {
  if (!unsafe) return "";
  const cleaned = cleanSpecialCharacters(unsafe);
  return cleaned
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Lee un archivo XML/XMI subido por el usuario detectando automáticamente
 * si está codificado en UTF-8 (con o sin BOM) o en Windows-1252 / ISO-8859-1
 * (típico de Enterprise Architect al ejecutarse en Windows en español).
 */
export async function readXmlFileWithEncoding(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // 1. Detección de BOM (Byte Order Mark)
  // UTF-8 BOM: EF BB BF
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    const decoder = new TextDecoder("utf-8");
    return cleanSpecialCharacters(decoder.decode(buffer.slice(3)));
  }

  // UTF-16 LE: FF FE
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    const decoder = new TextDecoder("utf-16le");
    return cleanSpecialCharacters(decoder.decode(buffer.slice(2)));
  }

  // UTF-16 BE: FE FF
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const decoder = new TextDecoder("utf-16be");
    return cleanSpecialCharacters(decoder.decode(buffer.slice(2)));
  }

  // 2. Comprobar cabecera XML preliminar para ver si declara codificación explícita
  // Tomamos los primeros 256 bytes para buscar `encoding="..."`
  const preview = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 256)));
  const encodingMatch = preview.match(/<\?xml[^>]+encoding=["']([^"']+)["']/i);
  const declaredEncoding = encodingMatch ? encodingMatch[1].toLowerCase().trim() : null;

  if (
    declaredEncoding &&
    (declaredEncoding === "windows-1252" ||
      declaredEncoding === "iso-8859-1" ||
      declaredEncoding === "latin1" ||
      declaredEncoding === "ansi")
  ) {
    const decoder = new TextDecoder("windows-1252");
    return cleanSpecialCharacters(decoder.decode(buffer));
  }

  // 3. Si no declara ANSI explícito, intentar decodificar en UTF-8 estricto (fatal: true).
  // Si falla debido a bytes como 0xF1 (que es 'ñ' en ANSI/Windows-1252 y resulta inválido en UTF-8),
  // se captura el error y se decodifica con Windows-1252.
  try {
    const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
    const decoded = utf8Decoder.decode(buffer);
    return cleanSpecialCharacters(decoded);
  } catch {
    // Fallback garantizado a Windows-1252
    const win1252Decoder = new TextDecoder("windows-1252");
    const decoded = win1252Decoder.decode(buffer);
    return cleanSpecialCharacters(decoded);
  }
}
