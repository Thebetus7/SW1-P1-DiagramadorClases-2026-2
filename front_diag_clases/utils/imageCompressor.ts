export interface CompressedImageResult {
  file: File;
  base64Data: string; // Base64 puro sin encabezado data:...
  dataUrl: string;    // DataURL completo data:image/jpeg;base64,...
  mimeType: "image/jpeg";
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Valida si un tipo MIME corresponde a un formato de imagen permitido (SC-4).
 */
export function isValidImageMimeType(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;
  const lower = mimeType.toLowerCase().trim();
  return (
    lower === "image/jpeg" ||
    lower === "image/jpg" ||
    lower === "image/png" ||
    lower === "image/webp" ||
    lower.startsWith("image/")
  );
}

/**
 * Comprime y redimensiona una imagen en el cliente utilizando Canvas API.
 * Garantiza formato JPEG ligero con dimensión máxima de 1280px (RB-07.1 y RB-07.2).
 */
export async function compressImageToJpeg(
  source: File | Blob,
  maxDimension = 1280,
  quality = 0.8
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    // Si el tipo de archivo no corresponde a una imagen, rechazar de inmediato (SC-4)
    if (source.type && !isValidImageMimeType(source.type)) {
      return reject(
        new Error("Formato no compatible. Por favor sube una imagen válida (PNG, JPG, WebP)")
      );
    }

    // Si estamos en un entorno sin DOM (ej. SSR), rechazar preventivamente
    if (typeof window === "undefined") {
      return reject(new Error("La compresión de imagen solo está disponible en el navegador."));
    }

    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("No se pudo leer el archivo de imagen."));
    };

    reader.onload = () => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error("El archivo seleccionado no es una imagen válida o está dañado."));
      };

      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          return reject(new Error("No se pudieron determinar las dimensiones de la imagen."));
        }

        // Calcular redimensionamiento preservando aspect ratio si supera maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return reject(new Error("No se pudo inicializar el contexto Canvas 2D."));
        }

        // Fondo blanco para imágenes con transparencia (PNG/WebP) antes de pasar a JPEG
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);

        // Renderizado suavizado de alta calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a JPEG DataURL
        const mimeType = "image/jpeg" as const;
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, "");

        // Convertir Canvas a Blob / File para transmisión multipart
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error("Error al convertir Canvas a formato JPEG."));
            }

            const originalName = (source as File).name || "diagram_attachment.jpg";
            const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
            const finalFileName = `${nameWithoutExt}.jpg`;

            const compressedFile = new File([blob], finalFileName, {
              type: mimeType,
              lastModified: Date.now(),
            });

            resolve({
              file: compressedFile,
              base64Data,
              dataUrl,
              mimeType,
              width,
              height,
              sizeBytes: blob.size,
            });
          },
          mimeType,
          quality
        );
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(source);
  });
}
