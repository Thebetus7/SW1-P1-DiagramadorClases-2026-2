package com.example.back_diagramador.service;

import com.example.back_diagramador.document.ChatMessageDocument;
import com.example.back_diagramador.dto.ChatMessageDto;
import com.example.back_diagramador.dto.ChatProposalResolutionDto;
import com.example.back_diagramador.repository.mongo.ChatMessageMongoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DiagramChatService {

    private final ChatMessageMongoRepository chatRepository;

    public ChatMessageDto saveMessage(Long diagramId, ChatMessageDto dto) {
        log.info("Persistiendo mensaje de chat para diagrama {}: tipo={}, sender={}",
                diagramId, dto.getMessageType(), dto.getUserName());

        ChatMessageDocument doc = toDocument(dto);
        doc.setDiagramId(diagramId);
        if (doc.getCreatedAt() == null) {
            doc.setCreatedAt(Instant.now());
        }

        ChatMessageDocument saved = chatRepository.save(doc);
        return toDto(saved);
    }

    public List<ChatMessageDto> getChatHistory(Long diagramId) {
        log.debug("Consultando historial de chat para diagrama {}", diagramId);
        List<ChatMessageDocument> messages = chatRepository.findByDiagramIdOrderByCreatedAtAsc(diagramId);
        return messages.stream().map(this::toDto).collect(Collectors.toList());
    }

    public ChatMessageDto resolveProposal(Long diagramId, String messageId, ChatProposalResolutionDto resolution) {
        log.info("Resolviendo propuesta {} para diagrama {}: status={}, resolvedBy={}",
                messageId, diagramId, resolution.getStatus(), resolution.getResolvedByUserName());

        ChatMessageDocument doc = chatRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Mensaje de propuesta no encontrado con id: " + messageId));

        if (!diagramId.equals(doc.getDiagramId())) {
            throw new IllegalArgumentException("El mensaje no pertenece al diagrama especificado");
        }

        // RN-02.01: Unicidad y bloqueo de tarjetas de propuesta
        if (doc.getProposalStatus() != null && !"PENDING".equalsIgnoreCase(doc.getProposalStatus())) {
            throw new IllegalStateException("La propuesta ya ha sido resuelta previamente con estado: " + doc.getProposalStatus());
        }

        String targetStatus = resolution.getStatus() != null ? resolution.getStatus().toUpperCase() : "IGNORED";
        doc.setProposalStatus(targetStatus);
        doc.setResolvedByUserId(resolution.getResolvedByUserId());
        doc.setResolvedByUserName(resolution.getResolvedByUserName());
        doc.setResolvedAt(Instant.now());

        ChatMessageDocument updated = chatRepository.save(doc);
        return toDto(updated);
    }

    private ChatMessageDocument toDocument(ChatMessageDto dto) {
        return ChatMessageDocument.builder()
                .id(dto.getId())
                .diagramId(dto.getDiagramId())
                .senderType(dto.getSenderType())
                .userId(dto.getUserId())
                .userName(dto.getUserName())
                .mode(dto.getMode())
                .messageType(dto.getMessageType())
                .content(dto.getContent())
                .taggedUserName(dto.getTaggedUserName())
                .proposalJson(dto.getProposalJson())
                .proposalStatus(dto.getProposalStatus() != null ? dto.getProposalStatus() : "PENDING")
                .resolvedByUserId(dto.getResolvedByUserId())
                .resolvedByUserName(dto.getResolvedByUserName())
                .resolvedAt(dto.getResolvedAt())
                .isError(dto.getIsError())
                .errorMessage(dto.getErrorMessage())
                .createdAt(dto.getCreatedAt())
                .build();
    }

    private ChatMessageDto toDto(ChatMessageDocument doc) {
        return ChatMessageDto.builder()
                .id(doc.getId())
                .diagramId(doc.getDiagramId())
                .senderType(doc.getSenderType())
                .userId(doc.getUserId())
                .userName(doc.getUserName())
                .mode(doc.getMode())
                .messageType(doc.getMessageType())
                .content(doc.getContent())
                .taggedUserName(doc.getTaggedUserName())
                .proposalJson(doc.getProposalJson())
                .proposalStatus(doc.getProposalStatus())
                .resolvedByUserId(doc.getResolvedByUserId())
                .resolvedByUserName(doc.getResolvedByUserName())
                .resolvedAt(doc.getResolvedAt())
                .isError(doc.getIsError())
                .errorMessage(doc.getErrorMessage())
                .createdAt(doc.getCreatedAt())
                .build();
    }
}
