package com.example.back_diagramador.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiagramUpdateRequest {
    private String nombre;
    private String lienzo;
    private Long usuarioId; // Quien realiza la actualización
}
