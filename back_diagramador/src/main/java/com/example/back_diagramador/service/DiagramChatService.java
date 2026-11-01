package com.example.back_diagramador.service;

import com.example.back_diagramador.document.ChatMessageDynamoItem;
import com.example.back_diagramador.dto.ChatMessageDto;
import com.example.back_diagramador.dto.ChatProposalResolutionDto;
import com.example.back_diagramador.repository.dynamo.ChatMessageDynamoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DiagramChatService {

    private final ChatMessageDynamoRepository chatRepository;

    public ChatMessageDto saveMessage(Long diagramId, ChatMessageDto dto) {
        log.info("Persistiendo mensaje de chat en DynamoDB para diagrama {}: tipo={}, sender={}",
                diagramId, dto.getMessageType(), dto.getUserName());

        ChatMessageDynamoItem item = toItem(dto);
        item.setDiagramId(diagramId);
        if (item.getId() == null || item.getId().isBlank()) {
            item.setId(UUID.randomUUID().toString());
        }
        if (item.getCreatedAt() == null || item.getCreatedAt().isBlank()) {
            item.setCreatedAt(Instant.now().toString());
        }

        ChatMessageDynamoItem saved = chatRepository.save(item);
        return toDto(saved);
    }

    public List<ChatMessageDto> getChatHistory(Long diagramId) {
        log.debug("Consultando historial de chat en DynamoDB para diagrama {}", diagramId);
        List<ChatMessageDynamoItem> messages = chatRepository.findByDiagramIdOrderByCreatedAtAsc(diagramId);
        return messages.stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<ChatMessageDto> getLast8Messages(Long diagramId) {
        log.debug("Consultando memoria de últimos 8 mensajes en DynamoDB para diagrama {}", diagramId);
        List<ChatMessageDynamoItem> messages = chatRepository.findLastMessagesByDiagramId(diagramId, 8);
        return messages.stream().map(this::toDto).collect(Collectors.toList());
    }

    public ChatMessageDto resolveProposal(Long diagramId, String messageId, ChatProposalResolutionDto resolution) {
        log.info("Resolviendo propuesta {} en DynamoDB para diagrama {}: status={}, resolvedBy={}",
                messageId, diagramId, resolution.getStatus(), resolution.getResolvedByUserName());

        ChatMessageDynamoItem item = chatRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Mensaje de propuesta no encontrado con id: " + messageId));

        if (!diagramId.equals(item.getDiagramId())) {
            throw new IllegalArgumentException("El mensaje no pertenece al diagrama especificado");
        }

        // RN-02.01: Unicidad y bloqueo de tarjetas de propuesta
        if (item.getProposalStatus() != null && !"PENDING".equalsIgnoreCase(item.getProposalStatus())) {
            throw new IllegalStateException("La propuesta ya ha sido resuelta previamente con estado: " + item.getProposalStatus());
        }

        String targetStatus = resolution.getStatus() != null ? resolution.getStatus().toUpperCase() : "IGNORED";
        item.setProposalStatus(targetStatus);
        item.setResolvedByUserId(resolution.getResolvedByUserId());
        item.setResolvedByUserName(resolution.getResolvedByUserName());
        item.setResolvedAt(Instant.now().toString());

        ChatMessageDynamoItem updated = chatRepository.save(item);
        return toDto(updated);
    }

    private ChatMessageDynamoItem toItem(ChatMessageDto dto) {
        ChatMessageDynamoItem item = new ChatMessageDynamoItem();
        item.setId(dto.getId());
        item.setDiagramId(dto.getDiagramId());
        item.setSenderType(dto.getSenderType());
        item.setUserId(dto.getUserId());
        item.setUserName(dto.getUserName());
        item.setMode(dto.getMode());
        item.setMessageType(dto.getMessageType());
        item.setContent(dto.getContent());
        item.setTaggedUserName(dto.getTaggedUserName());
        item.setProposalJson(dto.getProposalJson());
        item.setProposalStatus(dto.getProposalStatus() != null ? dto.getProposalStatus() : "PENDING");
        item.setAiEngine(dto.getAiEngine() != null ? dto.getAiEngine() : "GEMINI_CLOUD");
        item.setResolvedByUserId(dto.getResolvedByUserId());
        item.setResolvedByUserName(dto.getResolvedByUserName());
        if (dto.getResolvedAt() != null) {
            item.setResolvedAt(dto.getResolvedAt().toString());
        }
        item.setIsError(dto.getIsError());
        item.setErrorMessage(dto.getErrorMessage());
        if (dto.getCreatedAt() != null) {
            item.setCreatedAt(dto.getCreatedAt().toString());
        }
        return item;
    }

    private ChatMessageDto toDto(ChatMessageDynamoItem item) {
        Instant createdInstant = null;
        if (item.getCreatedAt() != null && !item.getCreatedAt().isBlank()) {
            try {
                createdInstant = Instant.parse(item.getCreatedAt());
            } catch (Exception ignored) {
            }
        }

        Instant resolvedInstant = null;
        if (item.getResolvedAt() != null && !item.getResolvedAt().isBlank()) {
            try {
                resolvedInstant = Instant.parse(item.getResolvedAt());
            } catch (Exception ignored) {
            }
        }

        return ChatMessageDto.builder()
                .id(item.getId())
                .diagramId(item.getDiagramId())
                .senderType(item.getSenderType())
                .userId(item.getUserId())
                .userName(item.getUserName())
                .mode(item.getMode())
                .messageType(item.getMessageType())
                .content(item.getContent())
                .taggedUserName(item.getTaggedUserName())
                .proposalJson(item.getProposalJson())
                .proposalStatus(item.getProposalStatus())
                .aiEngine(item.getAiEngine())
                .resolvedByUserId(item.getResolvedByUserId())
                .resolvedByUserName(item.getResolvedByUserName())
                .resolvedAt(resolvedInstant)
                .isError(item.getIsError())
                .errorMessage(item.getErrorMessage())
                .createdAt(createdInstant)
                .build();
    }
}
