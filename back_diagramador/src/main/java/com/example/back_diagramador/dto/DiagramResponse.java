package com.example.back_diagramador.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiagramResponse {
    private Long id;
    private String nombre;
    private Long idCreador;
    private String nombreCreador;
    private String correoCreador;
    private String lienzo;
    private Boolean isDeleted;
    private String userRole; // "CREADOR" | "COLABORADOR" según el usuario solicitante
    private List<CollaboratorDTO> colaboradores;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
