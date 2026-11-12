package com.example.back_diagramador.repository.dynamo;

import com.example.back_diagramador.document.ChatMessageDynamoItem;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbIndex;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.model.CreateTableEnhancedRequest;
import software.amazon.awssdk.enhanced.dynamodb.model.EnhancedGlobalSecondaryIndex;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.services.dynamodb.model.Projection;
import software.amazon.awssdk.services.dynamodb.model.ProjectionType;
import software.amazon.awssdk.services.dynamodb.model.ProvisionedThroughput;
import software.amazon.awssdk.services.dynamodb.model.ResourceInUseException;
import software.amazon.awssdk.services.dynamodb.model.ResourceNotFoundException;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Repository
@Slf4j
public class ChatMessageDynamoRepository {

    private final DynamoDbTable<ChatMessageDynamoItem> chatTable;
    private volatile boolean tableEnsured = false;

    // Resiliencia local: almacén en memoria para cuando DynamoDB no esté corriendo en local (localhost:8005)
    private final Map<String, ChatMessageDynamoItem> inMemoryCache = new ConcurrentHashMap<>();
    private final Map<Long, List<ChatMessageDynamoItem>> inMemoryDiagramMessages = new ConcurrentHashMap<>();

    public ChatMessageDynamoRepository(DynamoDbTable<ChatMessageDynamoItem> chatTable) {
        this.chatTable = chatTable;
    }

    public synchronized void ensureTableExists() {
        if (tableEnsured) return;
        try {
            log.info("Asegurando existencia de tabla DynamoDB: {}", chatTable.tableName());
            chatTable.createTable(CreateTableEnhancedRequest.builder()
                    .provisionedThroughput(ProvisionedThroughput.builder()
                            .readCapacityUnits(5L)
                            .writeCapacityUnits(5L)
                            .build())
                    .globalSecondaryIndices(EnhancedGlobalSecondaryIndex.builder()
                            .indexName("MessageIdIndex")
                            .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                            .provisionedThroughput(ProvisionedThroughput.builder()
                                    .readCapacityUnits(5L)
                                    .writeCapacityUnits(5L)
                                    .build())
                            .build())
                    .build());
            tableEnsured = true;
            log.info("Tabla DynamoDB {} creada con éxito en runtime.", chatTable.tableName());
        } catch (ResourceInUseException e) {
            tableEnsured = true;
            log.debug("La tabla DynamoDB {} ya existía.", chatTable.tableName());
        } catch (Exception e) {
            log.warn("No se pudo verificar o crear la tabla DynamoDB {}: {}", chatTable.tableName(), e.getMessage());
        }
    }

    public ChatMessageDynamoItem save(ChatMessageDynamoItem item) {
        if (item == null) return null;

        // Persistir siempre en el buffer en memoria (resiliencia y fallback transparente)
        if (item.getId() != null) {
            inMemoryCache.put(item.getId(), item);
        }
        if (item.getDiagramId() != null) {
            List<ChatMessageDynamoItem> list = inMemoryDiagramMessages.computeIfAbsent(
                    item.getDiagramId(), k -> new CopyOnWriteArrayList<>()
            );
            // Actualizar si ya existe el mensaje con el mismo id, o agregarlo al final
            boolean updated = false;
            for (int i = 0; i < list.size(); i++) {
                if (list.get(i).getId() != null && list.get(i).getId().equals(item.getId())) {
                    list.set(i, item);
                    updated = true;
                    break;
                }
            }
            if (!updated) {
                list.add(item);
            }
        }

        // Intentar persistir en DynamoDB (producción AWS o contenedor local 8005)
        try {
            chatTable.putItem(item);
        } catch (ResourceNotFoundException e) {
            log.warn("Tabla DynamoDB {} no encontrada al guardar. Intentando crearla automáticamente...", chatTable.tableName());
            ensureTableExists();
            try {
                chatTable.putItem(item);
            } catch (Exception ex) {
                log.warn("Aviso: No se pudo persistir en DynamoDB tras crear tabla (operando en modo local in-memory): {}", ex.getMessage());
            }
        } catch (Exception e) {
            log.warn("Aviso: DynamoDB no disponible ({}: {}). El mensaje fue registrado exitosamente en memoria local de desarrollo.",
                    chatTable.tableName(), e.getMessage());
        }

        return item;
    }

    public List<ChatMessageDynamoItem> findByDiagramIdOrderByCreatedAtAsc(Long diagramId) {
        if (diagramId == null) return Collections.emptyList();
        try {
            QueryConditional query = QueryConditional.keyEqualTo(Key.builder().partitionValue(diagramId).build());
            List<ChatMessageDynamoItem> items = new ArrayList<>();
            chatTable.query(r -> r.queryConditional(query).scanIndexForward(true))
                    .items()
                    .forEach(items::add);
            if (!items.isEmpty()) {
                return items;
            }
        } catch (ResourceNotFoundException e) {
            log.warn("Tabla DynamoDB {} no encontrada en consulta. Intentando crearla automáticamente...", chatTable.tableName());
            ensureTableExists();
        } catch (Exception e) {
            log.warn("Aviso: DynamoDB no disponible para consulta de diagrama {}. Obteniendo de memoria local: {}", diagramId, e.getMessage());
        }

        // Fallback a memoria local
        return new ArrayList<>(inMemoryDiagramMessages.getOrDefault(diagramId, Collections.emptyList()));
    }

    public List<ChatMessageDynamoItem> findLastMessagesByDiagramId(Long diagramId, int limit) {
        if (diagramId == null) return Collections.emptyList();
        try {
            QueryConditional query = QueryConditional.keyEqualTo(Key.builder().partitionValue(diagramId).build());
            List<ChatMessageDynamoItem> items = new ArrayList<>();
            chatTable.query(r -> r.queryConditional(query).scanIndexForward(false).limit(limit))
                    .items()
                    .forEach(items::add);
            if (!items.isEmpty()) {
                Collections.reverse(items);
                return items;
            }
        } catch (ResourceNotFoundException e) {
            log.warn("Tabla DynamoDB {} no encontrada en consulta de últimos mensajes. Intentando crearla automáticamente...", chatTable.tableName());
            ensureTableExists();
        } catch (Exception e) {
            log.warn("Aviso: DynamoDB no disponible para ventana deslizante de diagrama {}. Obteniendo de memoria local: {}", limit, diagramId);
        }

        // Fallback a memoria local con ventana deslizante
        List<ChatMessageDynamoItem> localList = inMemoryDiagramMessages.getOrDefault(diagramId, Collections.emptyList());
        int size = localList.size();
        int fromIndex = Math.max(0, size - limit);
        return new ArrayList<>(localList.subList(fromIndex, size));
    }

    public Optional<ChatMessageDynamoItem> findById(String messageId) {
        if (messageId == null || messageId.isBlank()) return Optional.empty();
        try {
            DynamoDbIndex<ChatMessageDynamoItem> index = chatTable.index("MessageIdIndex");
            QueryConditional query = QueryConditional.keyEqualTo(Key.builder().partitionValue(messageId).build());
            Optional<ChatMessageDynamoItem> item = index.query(r -> r.queryConditional(query).limit(1))
                    .stream()
                    .flatMap(page -> page.items().stream())
                    .findFirst();
            if (item.isPresent()) {
                return item;
            }
        } catch (Exception e) {
            log.warn("Aviso: DynamoDB no disponible consultando mensaje {}. Obteniendo de memoria local: {}", messageId, e.getMessage());
        }

        return Optional.ofNullable(inMemoryCache.get(messageId));
    }

    public void delete(ChatMessageDynamoItem item) {
        if (item != null) {
            if (item.getId() != null) {
                inMemoryCache.remove(item.getId());
            }
            if (item.getDiagramId() != null) {
                List<ChatMessageDynamoItem> list = inMemoryDiagramMessages.get(item.getDiagramId());
                if (list != null) {
                    list.removeIf(m -> m.getId() != null && m.getId().equals(item.getId()));
                }
            }
            if (item.getDiagramId() != null && item.getCreatedAt() != null) {
                try {
                    Key key = Key.builder()
                            .partitionValue(item.getDiagramId())
                            .sortValue(item.getCreatedAt())
                            .build();
                    chatTable.deleteItem(key);
                } catch (Exception e) {
                    log.warn("Aviso: No se pudo eliminar de DynamoDB (eliminado de memoria local): {}", e.getMessage());
                }
            }
        }
    }
}
