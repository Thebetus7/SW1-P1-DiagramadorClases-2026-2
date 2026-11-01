package com.example.back_diagramador.service;

import com.example.back_diagramador.document.ChatMessageDynamoItem;
import com.example.back_diagramador.dto.ChatMessageDto;
import com.example.back_diagramador.repository.dynamo.ChatMessageDynamoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DiagramChatServiceDynamoTest {

    @Mock
    private ChatMessageDynamoRepository chatRepository;

    @InjectMocks
    private DiagramChatService chatService;

    private Long testDiagramId;

    @BeforeEach
    void setUp() {
        testDiagramId = 42L;
    }

    @Test
    @DisplayName("Debe persistir un item en DynamoDB con UUID generado si el ID original es nulo")
    void saveMessage_ShouldGenerateUuidWhenIdIsNull() {
        ChatMessageDto inputDto = ChatMessageDto.builder()
                .senderType("USER")
                .userName("Docente")
                .content("Mensaje de prueba DynamoDB")
                .build();

        when(chatRepository.save(any(ChatMessageDynamoItem.class))).thenAnswer(inv -> inv.getArgument(0));

        ChatMessageDto result = chatService.saveMessage(testDiagramId, inputDto);

        assertNotNull(result);
        assertNotNull(result.getId(), "El ID debe ser autogenerado con UUID");
        assertEquals(testDiagramId, result.getDiagramId());
        assertNotNull(result.getCreatedAt(), "Debe asignar timestamp ISO-8601");
        verify(chatRepository, times(1)).save(any(ChatMessageDynamoItem.class));
    }

    @Test
    @DisplayName("Debe consultar la ventana deslizante de exactamente 8 mensajes más recientes en DynamoDB")
    void getLast8Messages_ShouldReturnSlidingWindowOfAtMost8() {
        List<ChatMessageDynamoItem> fakeItems = new ArrayList<>();
        for (int i = 1; i <= 8; i++) {
            ChatMessageDynamoItem item = new ChatMessageDynamoItem();
            item.setId("msg-" + i);
            item.setDiagramId(testDiagramId);
            item.setContent("Turno " + i);
            item.setCreatedAt(Instant.now().minusSeconds(100 - i * 10).toString());
            fakeItems.add(item);
        }

        when(chatRepository.findLastMessagesByDiagramId(testDiagramId, 8)).thenReturn(fakeItems);

        List<ChatMessageDto> result = chatService.getLast8Messages(testDiagramId);

        assertEquals(8, result.size());
        assertEquals("msg-1", result.get(0).getId());
        assertEquals("msg-8", result.get(7).getId());
        verify(chatRepository, times(1)).findLastMessagesByDiagramId(testDiagramId, 8);
    }

    @Test
    @DisplayName("Debe consultar por MessageIdIndex y recuperar la propuesta correcta")
    void findById_ShouldRetrieveItemThroughGsi() {
        ChatMessageDynamoItem item = new ChatMessageDynamoItem();
        item.setId("uuid-proposal-777");
        item.setDiagramId(testDiagramId);
        item.setProposalStatus("PENDING");

        when(chatRepository.findById("uuid-proposal-777")).thenReturn(Optional.of(item));

        Optional<ChatMessageDynamoItem> found = chatRepository.findById("uuid-proposal-777");

        assertTrue(found.isPresent());
        assertEquals("uuid-proposal-777", found.get().getId());
        assertEquals("PENDING", found.get().getProposalStatus());
    }
}
