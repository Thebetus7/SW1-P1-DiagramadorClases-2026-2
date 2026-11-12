package com.example.back_diagramador.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/diagrams/{diagramId}/images")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class DiagramImageStorageController {

    @Value("${diagram.storage.upload-dir:uploads/diagrams}")
    private String baseUploadDir;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadDiagramImage(
            @PathVariable Long diagramId,
            @RequestParam("file") MultipartFile file) {

        if (diagramId == null || diagramId <= 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "El identificador del diagrama debe ser un entero positivo."));
        }

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "El archivo de imagen no puede estar vacío."));
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Formato no compatible. Por favor sube una imagen válida (PNG, JPG, WebP)."));
        }

        try {
            Path targetDir = Paths.get(baseUploadDir, String.valueOf(diagramId)).toAbsolutePath().normalize();
            if (!Files.exists(targetDir)) {
                Files.createDirectories(targetDir);
            }

            String extension = ".jpg";
            String originalFilename = file.getOriginalFilename();
            if (originalFilename != null && originalFilename.lastIndexOf('.') > 0) {
                String rawExt = originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase();
                if (rawExt.equals(".png") || rawExt.equals(".jpeg") || rawExt.equals(".jpg") || rawExt.equals(".webp")) {
                    extension = rawExt;
                }
            }

            String shortUuid = UUID.randomUUID().toString().substring(0, 8);
            String savedFilename = String.format("%d_%s%s", System.currentTimeMillis(), shortUuid, extension);
            Path destination = targetDir.resolve(savedFilename).normalize();

            // Garantizar que el destino no escape del directorio asignado
            if (!destination.startsWith(targetDir)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "Ruta de archivo no autorizada."));
            }

            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);

            String publicUrl = String.format("/api/diagrams/%d/images/%s", diagramId, savedFilename);
            log.info("Imagen adjunta guardada exitosamente para diagrama {}: {} ({} bytes)",
                    diagramId, destination, file.getSize());

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "imageUrl", publicUrl,
                    "filename", savedFilename,
                    "size", file.getSize(),
                    "contentType", contentType
            ));

        } catch (IOException e) {
            log.error("Error al almacenar imagen para diagrama {}: {}", diagramId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error al almacenar el archivo de imagen: " + e.getMessage()));
        }
    }

    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> serveDiagramImage(
            @PathVariable Long diagramId,
            @PathVariable String filename) {

        if (diagramId == null || diagramId <= 0) {
            return ResponseEntity.badRequest().build();
        }

        try {
            Path targetDir = Paths.get(baseUploadDir, String.valueOf(diagramId)).toAbsolutePath().normalize();
            Path filePath = targetDir.resolve(filename).normalize();

            // Prevención de Path Traversal
            if (!filePath.startsWith(targetDir)) {
                log.warn("Intento de acceso fuera del directorio de diagrama {}: {}", diagramId, filename);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            if (!Files.exists(filePath) || !Files.isReadable(filePath)) {
                return ResponseEntity.notFound().build();
            }

            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                return ResponseEntity.notFound().build();
            }

            String contentType = Files.probeContentType(filePath);
            if (contentType == null) {
                contentType = MediaType.IMAGE_JPEG_VALUE;
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                    .body(resource);

        } catch (MalformedURLException e) {
            log.error("URL malformada para imagen de diagrama {}/{}: {}", diagramId, filename, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (IOException e) {
            log.error("Error I/O al servir imagen {}/{}: {}", diagramId, filename, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
