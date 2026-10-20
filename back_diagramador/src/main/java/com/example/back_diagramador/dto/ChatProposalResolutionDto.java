package com.example.back_diagramador.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatProposalResolutionDto {
    private String status; // "ACCEPTED" | "IGNORED"
    private Long resolvedByUserId;
    private String resolvedByUserName;
}
