package com.example.back_diagramador.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageDto {
    private String id;
    private Long diagramId;
    private String senderType; // "USER", "COPILOT", "SYSTEM"
    private Long userId;
    private String userName;
    private String mode; // "CHAT", "EDITOR"
    private String messageType; // "CHAT_MESSAGE", "EDITOR_PROPOSAL", "PROACTIVE_SUGGESTION", "ERROR_ALERT"
    private String content;
    private String taggedUserName;

    private String imageUrl;
    private String attachmentMimeType;
    private String attachmentThumbnail;
    private String sourceImageId;

    private String proposalJson;
    private String proposalStatus; // "PENDING", "ACCEPTED", "IGNORED", "EXPIRED"
    private Long resolvedByUserId;
    private String resolvedByUserName;
    private Instant resolvedAt;

    private Boolean isError;
    private String errorMessage;
    private String aiEngine; // "GEMINI_CLOUD", "WEBLLM_LOCAL"
    private Instant createdAt;
}
