package com.example.back_diagramador.controller;

import com.example.back_diagramador.dto.*;
import com.example.back_diagramador.service.DiagramService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/diagrams")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DiagramController {

    private final DiagramService diagramService;

    @GetMapping
    public ResponseEntity<List<DiagramResponse>> getDiagrams(@RequestParam(required = false) Long userId) {
        return ResponseEntity.ok(diagramService.getAccessibleDiagrams(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getDiagramById(@PathVariable Long id, @RequestParam(required = false) Long userId) {
        try {
            return ResponseEntity.ok(diagramService.getDiagramById(id, userId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createDiagram(@RequestBody DiagramCreateRequest request) {
        try {
            DiagramResponse created = diagramService.createDiagram(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error al crear diagrama: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateDiagram(@PathVariable Long id, @RequestBody DiagramUpdateRequest request) {
        try {
            return ResponseEntity.ok(diagramService.updateDiagram(id, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDiagram(@PathVariable Long id, @RequestParam(required = false) Long userId) {
        try {
            diagramService.softDeleteDiagram(id, userId);
            return ResponseEntity.ok(Map.of("message", "Diagrama eliminado correctamente (Soft delete)."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/invite")
    public ResponseEntity<?> inviteCollaborator(@PathVariable Long id, @RequestBody InviteCollaboratorRequest request) {
        try {
            CollaboratorDTO collaborator = diagramService.inviteCollaborator(id, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(collaborator);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error al invitar colaborador: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}/collaborators/{userId}")
    public ResponseEntity<?> removeCollaborator(
            @PathVariable Long id,
            @PathVariable Long userId,
            @RequestParam(required = false) Long requesterId) {
        try {
            diagramService.removeCollaborator(id, userId, requesterId);
            return ResponseEntity.ok(Map.of("message", "Colaborador retirado exitosamente."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error al retirar colaborador: " + e.getMessage()));
        }
    }
}
