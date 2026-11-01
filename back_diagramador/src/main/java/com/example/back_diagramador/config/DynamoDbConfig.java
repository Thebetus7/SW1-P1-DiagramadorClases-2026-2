package com.example.back_diagramador.config;

import com.example.back_diagramador.document.ChatMessageDynamoItem;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.CreateTableEnhancedRequest;
import software.amazon.awssdk.enhanced.dynamodb.model.EnhancedGlobalSecondaryIndex;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.DynamoDbClientBuilder;
import software.amazon.awssdk.services.dynamodb.model.Projection;
import software.amazon.awssdk.services.dynamodb.model.ProjectionType;
import software.amazon.awssdk.services.dynamodb.model.ProvisionedThroughput;
import software.amazon.awssdk.services.dynamodb.model.ResourceInUseException;

import java.net.URI;

@Configuration
@Slf4j
public class DynamoDbConfig {

    public static final String CHAT_TABLE_NAME = "DiagramChatMessages";

    @Value("${amazon.dynamodb.endpoint:http://localhost:8005}")
    private String endpoint;

    @Value("${amazon.aws.region:us-east-1}")
    private String region;

    @Value("${amazon.aws.accesskey:dummy}")
    private String accessKey;

    @Value("${amazon.aws.secretkey:dummy}")
    private String secretKey;

    @Bean
    public DynamoDbClient dynamoDbClient() {
        log.info("Inicializando DynamoDbClient hacia endpoint: {}, region: {}", endpoint, region);
        DynamoDbClientBuilder builder = DynamoDbClient.builder()
                .region(Region.of(region));

        if (endpoint != null && !endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint));
        }

        builder.credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKey, secretKey)
        ));

        return builder.build();
    }

    @Bean
    public DynamoDbEnhancedClient dynamoDbEnhancedClient(DynamoDbClient dynamoDbClient) {
        return DynamoDbEnhancedClient.builder()
                .dynamoDbClient(dynamoDbClient)
                .build();
    }

    @Bean
    public DynamoDbTable<ChatMessageDynamoItem> chatMessageTable(DynamoDbEnhancedClient enhancedClient) {
        return enhancedClient.table(CHAT_TABLE_NAME, TableSchema.fromBean(ChatMessageDynamoItem.class));
    }

    @Bean
    public ApplicationRunner initDynamoDbTables(DynamoDbEnhancedClient enhancedClient, DynamoDbClient rawClient) {
        return args -> {
            try {
                DynamoDbTable<ChatMessageDynamoItem> table = enhancedClient.table(
                        CHAT_TABLE_NAME, TableSchema.fromBean(ChatMessageDynamoItem.class)
                );

                log.info("Verificando existencia de tabla DynamoDB: {}", CHAT_TABLE_NAME);
                try {
                    table.createTable(CreateTableEnhancedRequest.builder()
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
                    log.info("Tabla DynamoDB {} creada exitosamente.", CHAT_TABLE_NAME);
                } catch (ResourceInUseException e) {
                    log.info("La tabla DynamoDB {} ya existe y está lista para operar.", CHAT_TABLE_NAME);
                }
            } catch (Exception e) {
                log.warn("Aviso: No se pudo verificar o crear la tabla DynamoDB '{}'. Esto es esperado si DynamoDB local aún no está corriendo en {}: {}",
                        CHAT_TABLE_NAME, endpoint, e.getMessage());
            }
        };
    }
}
