package com.example.back_diagramador.controller;

import com.example.back_diagramador.dto.ChatMessageDto;
import com.example.back_diagramador.dto.ChatProposalResolutionDto;
import com.example.back_diagramador.service.DiagramChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/diagrams/{id}/chat")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class DiagramChatController {

    private final DiagramChatService chatService;

    @GetMapping("/messages")
    public ResponseEntity<List<ChatMessageDto>> getChatHistory(@PathVariable Long id) {
        return ResponseEntity.ok(chatService.getChatHistory(id));
    }

    @PostMapping("/messages")
    public ResponseEntity<?> saveMessage(@PathVariable Long id, @RequestBody ChatMessageDto dto) {
        try {
            ChatMessageDto saved = chatService.saveMessage(id, dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Error al guardar mensaje de chat en diagrama {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error al registrar mensaje de chat: " + e.getMessage()));
        }
    }

    @PutMapping("/proposals/{messageId}/resolve")
    public ResponseEntity<?> resolveProposal(
            @PathVariable Long id,
            @PathVariable String messageId,
            @RequestBody ChatProposalResolutionDto resolution) {
        try {
            ChatMessageDto updated = chatService.resolveProposal(id, messageId, resolution);
            return ResponseEntity.ok(updated);
        } catch (IllegalStateException e) {
            // Regla de unicidad de resolución violada (ya resuelta previamente)
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Error al resolver propuesta {} en diagrama {}: {}", messageId, id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error al resolver propuesta: " + e.getMessage()));
        }
    }
}
