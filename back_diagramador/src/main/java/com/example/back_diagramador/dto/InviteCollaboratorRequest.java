package com.example.back_diagramador.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InviteCollaboratorRequest {
    private String correo;
    private Long idSolicitante; // Usuario que envía la invitación
}
