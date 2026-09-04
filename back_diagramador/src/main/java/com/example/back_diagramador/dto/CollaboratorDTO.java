package com.example.back_diagramador.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollaboratorDTO {
    private Long id;
    private Long userId;
    private String nombre;
    private String correo;
    private String rol; // "CREADOR" o "COLABORADOR"
    private LocalDateTime joinedAt;
}
