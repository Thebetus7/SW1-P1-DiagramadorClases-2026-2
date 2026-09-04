package com.example.back_diagramador.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WebSocketMessage {
    private String type; // "JOIN", "LEAVE", "SYNC_CANVAS", "NODE_CHANGE", "PRESENCE"
    private Long diagramId;
    private Long userId;
    private String userName;
    private String userRole; // "CREADOR" | "COLABORADOR"
    private String payload; // JSON string con nodos, aristas o datos específicos
    private Long timestamp;
}
