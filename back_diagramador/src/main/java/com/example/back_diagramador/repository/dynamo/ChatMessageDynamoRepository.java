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
import java.util.Optional;

@Repository
@Slf4j
public class ChatMessageDynamoRepository {

    private final DynamoDbTable<ChatMessageDynamoItem> chatTable;
    private volatile boolean tableEnsured = false;

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
        try {
            chatTable.putItem(item);
        } catch (ResourceNotFoundException e) {
            log.warn("Tabla DynamoDB {} no encontrada al guardar. Intentando crearla automáticamente...", chatTable.tableName());
            ensureTableExists();
            chatTable.putItem(item);
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
            return items;
        } catch (ResourceNotFoundException e) {
            log.warn("Tabla DynamoDB {} no encontrada en consulta. Intentando crearla automáticamente...", chatTable.tableName());
            ensureTableExists();
            return Collections.emptyList();
        } catch (Exception e) {
            log.warn("Error consultando historial en DynamoDB para diagrama {}: {}", diagramId, e.getMessage());
            return Collections.emptyList();
        }
    }

    public List<ChatMessageDynamoItem> findLastMessagesByDiagramId(Long diagramId, int limit) {
        if (diagramId == null) return Collections.emptyList();
        try {
            QueryConditional query = QueryConditional.keyEqualTo(Key.builder().partitionValue(diagramId).build());
            List<ChatMessageDynamoItem> items = new ArrayList<>();
            chatTable.query(r -> r.queryConditional(query).scanIndexForward(false).limit(limit))
                    .items()
                    .forEach(items::add);
            // Invertir para que queden en orden cronológico ascendente (los más antiguos primero hasta el más reciente)
            Collections.reverse(items);
            return items;
        } catch (ResourceNotFoundException e) {
            log.warn("Tabla DynamoDB {} no encontrada en consulta de últimos mensajes. Intentando crearla automáticamente...", chatTable.tableName());
            ensureTableExists();
            return Collections.emptyList();
        } catch (Exception e) {
            log.warn("Error consultando últimos {} mensajes en DynamoDB para diagrama {}: {}", limit, diagramId, e.getMessage());
            return Collections.emptyList();
        }
    }

    public Optional<ChatMessageDynamoItem> findById(String messageId) {
        if (messageId == null || messageId.isBlank()) return Optional.empty();
        try {
            DynamoDbIndex<ChatMessageDynamoItem> index = chatTable.index("MessageIdIndex");
            QueryConditional query = QueryConditional.keyEqualTo(Key.builder().partitionValue(messageId).build());
            return index.query(r -> r.queryConditional(query).limit(1))
                    .stream()
                    .flatMap(page -> page.items().stream())
                    .findFirst();
        } catch (Exception e) {
            log.warn("Error consultando mensaje {} en GSI MessageIdIndex: {}", messageId, e.getMessage());
            return Optional.empty();
        }
    }

    public void delete(ChatMessageDynamoItem item) {
        if (item != null && item.getDiagramId() != null && item.getCreatedAt() != null) {
            Key key = Key.builder()
                    .partitionValue(item.getDiagramId())
                    .sortValue(item.getCreatedAt())
                    .build();
            chatTable.deleteItem(key);
        }
    }
}
