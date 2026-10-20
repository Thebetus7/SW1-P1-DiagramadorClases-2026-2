package com.example.back_diagramador.service;

import com.example.back_diagramador.document.ChatMessageDocument;
import com.example.back_diagramador.dto.ChatMessageDto;
import com.example.back_diagramador.dto.ChatProposalResolutionDto;
import com.example.back_diagramador.repository.mongo.ChatMessageMongoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DiagramChatServiceTest {

    @Mock
    private ChatMessageMongoRepository chatRepository;

    @InjectMocks
    private DiagramChatService chatService;

    private ChatMessageDocument sampleDoc;
    private ChatMessageDto sampleDto;

    @BeforeEach
    void setUp() {
        sampleDoc = ChatMessageDocument.builder()
                .id("msg-123")
                .diagramId(10L)
                .senderType("USER")
                .userId(1L)
                .userName("Juan")
                .mode("CHAT")
                .messageType("CHAT_MESSAGE")
                .content("Hola Copilot")
                .proposalStatus("PENDING")
                .createdAt(Instant.now())
                .build();

        sampleDto = ChatMessageDto.builder()
                .senderType("USER")
                .userId(1L)
                .userName("Juan")
                .mode("CHAT")
                .messageType("CHAT_MESSAGE")
                .content("Hola Copilot")
                .build();
    }

    @Test
    @DisplayName("Debe persistir un mensaje de chat en MongoDB y retornar el DTO asignado")
    void saveMessage_ShouldPersistDocumentAndReturnDto() {
        when(chatRepository.save(any(ChatMessageDocument.class))).thenReturn(sampleDoc);

        ChatMessageDto result = chatService.saveMessage(10L, sampleDto);

        assertNotNull(result);
        assertEquals("msg-123", result.getId());
        assertEquals(10L, result.getDiagramId());
        assertEquals("Juan", result.getUserName());
        verify(chatRepository, times(1)).save(any(ChatMessageDocument.class));
    }

    @Test
    @DisplayName("Debe retornar el historial cronológico de mensajes para un diagrama")
    void getChatHistory_ShouldReturnChronologicalMessages() {
        ChatMessageDocument doc2 = ChatMessageDocument.builder()
                .id("msg-124")
                .diagramId(10L)
                .senderType("COPILOT")
                .userName("Copilot IA")
                .content("Respuesta")
                .createdAt(Instant.now())
                .build();

        when(chatRepository.findByDiagramIdOrderByCreatedAtAsc(10L)).thenReturn(List.of(sampleDoc, doc2));

        List<ChatMessageDto> history = chatService.getChatHistory(10L);

        assertEquals(2, history.size());
        assertEquals("msg-123", history.get(0).getId());
        assertEquals("msg-124", history.get(1).getId());
    }

    @Test
    @DisplayName("Debe actualizar el estado a ACCEPTED al resolver una propuesta PENDING")
    void resolveProposal_ShouldUpdateStatusToAccepted_WhenPending() {
        when(chatRepository.findById("msg-123")).thenReturn(Optional.of(sampleDoc));
        when(chatRepository.save(any(ChatMessageDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ChatProposalResolutionDto resolution = ChatProposalResolutionDto.builder()
                .status("ACCEPTED")
                .resolvedByUserId(2L)
                .resolvedByUserName("Ana")
                .build();

        ChatMessageDto result = chatService.resolveProposal(10L, "msg-123", resolution);

        assertEquals("ACCEPTED", result.getProposalStatus());
        assertEquals(2L, result.getResolvedByUserId());
        assertEquals("Ana", result.getResolvedByUserName());
        assertNotNull(result.getResolvedAt());
    }

    @Test
    @DisplayName("Debe lanzar IllegalStateException al intentar resolver una propuesta ya resuelta (RN-02.01)")
    void resolveProposal_ShouldThrowConflict_WhenAlreadyResolved() {
        sampleDoc.setProposalStatus("ACCEPTED");
        when(chatRepository.findById("msg-123")).thenReturn(Optional.of(sampleDoc));

        ChatProposalResolutionDto resolution = ChatProposalResolutionDto.builder()
                .status("IGNORED")
                .resolvedByUserId(3L)
                .resolvedByUserName("Carlos")
                .build();

        assertThrows(IllegalStateException.class, () ->
                chatService.resolveProposal(10L, "msg-123", resolution)
        );
        verify(chatRepository, never()).save(any());
    }

    @Test
    @DisplayName("Debe lanzar IllegalArgumentException cuando el mensaje no existe")
    void resolveProposal_ShouldThrowNotFound_WhenMessageDoesNotExist() {
        when(chatRepository.findById("msg-999")).thenReturn(Optional.empty());

        ChatProposalResolutionDto resolution = ChatProposalResolutionDto.builder()
                .status("ACCEPTED")
                .build();

        assertThrows(IllegalArgumentException.class, () ->
                chatService.resolveProposal(10L, "msg-999", resolution)
        );
    }
}
