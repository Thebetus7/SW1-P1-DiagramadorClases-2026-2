package com.example.back_diagramador.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "diagram_chat_messages")
public class ChatMessageDocument {

    @Id
    private String id;

    @Indexed
    private Long diagramId;

    private String senderType; // "USER", "COPILOT", "SYSTEM"
    private Long userId;
    private String userName;
    private String mode; // "CHAT", "EDITOR"
    private String messageType; // "CHAT_MESSAGE", "EDITOR_PROPOSAL", "PROACTIVE_SUGGESTION", "ERROR_ALERT"
    private String content;
    private String taggedUserName;

    // Propuesta de mutación serializada en JSON
    private String proposalJson;
    private String proposalStatus; // "PENDING", "ACCEPTED", "IGNORED", "EXPIRED"
    private Long resolvedByUserId;
    private String resolvedByUserName;
    private Instant resolvedAt;

    private Boolean isError;
    private String errorMessage;

    @Indexed
    private Instant createdAt;
}
