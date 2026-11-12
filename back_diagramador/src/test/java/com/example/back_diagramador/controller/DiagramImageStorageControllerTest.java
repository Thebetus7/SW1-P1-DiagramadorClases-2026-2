package com.example.back_diagramador.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class DiagramImageStorageControllerTest {

    private DiagramImageStorageController controller;

    @TempDir
    Path tempUploadDir;

    @BeforeEach
    void setUp() {
        controller = new DiagramImageStorageController();
        ReflectionTestUtils.setField(controller, "baseUploadDir", tempUploadDir.toString());
    }

    @Test
    @DisplayName("Debe subir exitosamente una imagen JPG válida y retornar 201 CREATED")
    void uploadDiagramImage_validJpeg_returnsCreated() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "boceto.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "fake jpeg content".getBytes()
        );

        ResponseEntity<?> response = controller.uploadDiagramImage(1L, file);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody() instanceof Map);

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertTrue(body.containsKey("imageUrl"));
        assertTrue(body.containsKey("filename"));
        String imageUrl = (String) body.get("imageUrl");
        assertTrue(imageUrl.startsWith("/api/diagrams/1/images/"));
    }

    @Test
    @DisplayName("Debe rechazar la subida si el diagramId es negativo o cero con 400 BAD REQUEST")
    void uploadDiagramImage_invalidDiagramId_returnsBadRequest() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "valido.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "fake jpeg content".getBytes()
        );

        ResponseEntity<?> responseZero = controller.uploadDiagramImage(0L, file);
        assertEquals(HttpStatus.BAD_REQUEST, responseZero.getStatusCode());

        ResponseEntity<?> responseNegative = controller.uploadDiagramImage(-5L, file);
        assertEquals(HttpStatus.BAD_REQUEST, responseNegative.getStatusCode());
    }

    @Test
    @DisplayName("Debe rechazar la subida si el archivo está vacío con 400 BAD REQUEST")
    void uploadDiagramImage_emptyFile_returnsBadRequest() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "vacio.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                new byte[0]
        );

        ResponseEntity<?> response = controller.uploadDiagramImage(1L, file);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    @DisplayName("Debe rechazar archivos no imagen (ej. PDF) con 400 BAD REQUEST (SC-4)")
    void uploadDiagramImage_invalidMime_returnsBadRequest() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "documento.pdf",
                MediaType.APPLICATION_PDF_VALUE,
                "fake pdf content".getBytes()
        );

        ResponseEntity<?> response = controller.uploadDiagramImage(1L, file);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertTrue(((String) body.get("message")).contains("Formato no compatible"));
    }

    @Test
    @DisplayName("Debe servir un archivo de imagen existente con 200 OK")
    void serveDiagramImage_existingFile_returnsResource() throws IOException {
        Path diagramDir = tempUploadDir.resolve("1");
        Files.createDirectories(diagramDir);
        Path sampleFile = diagramDir.resolve("sample.jpg");
        Files.write(sampleFile, "fake jpeg bytes".getBytes());

        ResponseEntity<Resource> response = controller.serveDiagramImage(1L, "sample.jpg");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().exists());
    }

    @Test
    @DisplayName("Debe retornar 404 NOT FOUND para un archivo inexistente")
    void serveDiagramImage_nonExistingFile_returnsNotFound() {
        ResponseEntity<Resource> response = controller.serveDiagramImage(1L, "no_existe.jpg");

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    @DisplayName("Debe prevenir ataques de Path Traversal retornando 403 FORBIDDEN")
    void serveDiagramImage_pathTraversal_returnsForbidden() {
        ResponseEntity<Resource> response = controller.serveDiagramImage(1L, "../../../etc/passwd");

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }
}
