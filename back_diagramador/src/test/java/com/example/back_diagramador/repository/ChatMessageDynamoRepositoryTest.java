package com.example.back_diagramador.repository;

import com.example.back_diagramador.document.ChatMessageDynamoItem;
import com.example.back_diagramador.repository.dynamo.ChatMessageDynamoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatMessageDynamoRepositoryTest {

    @Mock
    private DynamoDbTable<ChatMessageDynamoItem> chatTable;

    private ChatMessageDynamoRepository repository;

    @BeforeEach
    void setUp() {
        repository = new ChatMessageDynamoRepository(chatTable);
    }

    @Test
    @DisplayName("Debe persistir en memoria local y no fallar cuando DynamoDB arroja Connection refused")
    void save_ShouldFallbackToMemoryWhenDynamoDbFails() {
        // Simular Connection refused de DynamoDB Local no disponible
        doThrow(SdkClientException.create("Connect to localhost:8005 failed: Connection refused"))
                .when(chatTable).putItem(any(ChatMessageDynamoItem.class));

        ChatMessageDynamoItem item = new ChatMessageDynamoItem();
        item.setId("msg-local-1");
        item.setDiagramId(101L);
        item.setContent("Probando fallback en memoria");
        item.setCreatedAt("2026-11-12T12:00:00Z");

        // No debe lanzar excepción
        ChatMessageDynamoItem saved = assertDoesNotThrow(() -> repository.save(item));
        assertNotNull(saved);
        assertEquals("msg-local-1", saved.getId());

        // Debe recuperarlo desde findById a través de la memoria local
        Optional<ChatMessageDynamoItem> found = repository.findById("msg-local-1");
        assertTrue(found.isPresent());
        assertEquals("Probando fallback en memoria", found.get().getContent());

        // Debe listarlo en el historial
        List<ChatMessageDynamoItem> history = repository.findByDiagramIdOrderByCreatedAtAsc(101L);
        assertEquals(1, history.size());
        assertEquals("msg-local-1", history.get(0).getId());

        // Debe listarlo en ventana deslizante
        List<ChatMessageDynamoItem> lastMessages = repository.findLastMessagesByDiagramId(101L, 8);
        assertEquals(1, lastMessages.size());
        assertEquals("msg-local-1", lastMessages.get(0).getId());
    }
}

