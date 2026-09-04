package com.example.back_diagramador.service;

import com.example.back_diagramador.dto.*;
import com.example.back_diagramador.model.Collaborator;
import com.example.back_diagramador.model.Diagram;
import com.example.back_diagramador.model.User;
import com.example.back_diagramador.repository.CollaboratorRepository;
import com.example.back_diagramador.repository.DiagramRepository;
import com.example.back_diagramador.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DiagramService {

    private final DiagramRepository diagramRepository;
    private final UserRepository userRepository;
    private final CollaboratorRepository collaboratorRepository;

    @Transactional
    public DiagramResponse createDiagram(DiagramCreateRequest request) {
        User creador = userRepository.findById(request.getIdCreador())
                .orElseThrow(() -> new IllegalArgumentException("Usuario creador no encontrado con ID: " + request.getIdCreador()));

        String defaultLienzo = request.getLienzo() != null && !request.getLienzo().isBlank()
                ? request.getLienzo()
                : "{\"nodes\":[],\"edges\":[]}";

        Diagram diagram = Diagram.builder()
                .nombre(request.getNombre() != null && !request.getNombre().isBlank() ? request.getNombre() : "Nuevo Diagrama UML")
                .creador(creador)
                .lienzo(defaultLienzo)
                .isDeleted(false)
                .build();

        Diagram saved = diagramRepository.save(diagram);

        // Registrar al creador en la tabla de colaboradores
        Collaborator ownerCollab = Collaborator.builder()
                .diagrama(saved)
                .usuario(creador)
                .rol("CREADOR")
                .build();
        collaboratorRepository.save(ownerCollab);

        return mapToResponse(saved, creador.getId());
    }

    @Transactional(readOnly = true)
    public List<DiagramResponse> getAccessibleDiagrams(Long userId) {
        List<Diagram> diagrams;
        if (userId != null) {
            diagrams = diagramRepository.findAccessibleDiagramsByUser(userId);
        } else {
            diagrams = diagramRepository.findByIsDeletedFalseOrderByUpdatedAtDesc();
        }

        return diagrams.stream()
                .map(d -> mapToResponse(d, userId))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DiagramResponse getDiagramById(Long diagramId, Long userId) {
        Diagram diagram = diagramRepository.findByIdAndIsDeletedFalse(diagramId)
                .orElseThrow(() -> new IllegalArgumentException("Diagrama no encontrado o ha sido eliminado."));

        return mapToResponse(diagram, userId);
    }

    @Transactional
    public DiagramResponse updateDiagram(Long diagramId, DiagramUpdateRequest request) {
        Diagram diagram = diagramRepository.findByIdAndIsDeletedFalse(diagramId)
                .orElseThrow(() -> new IllegalArgumentException("Diagrama no encontrado."));

        if (request.getNombre() != null && !request.getNombre().isBlank()) {
            diagram.setNombre(request.getNombre());
        }

        if (request.getLienzo() != null) {
            diagram.setLienzo(request.getLienzo());
        }

        Diagram saved = diagramRepository.save(diagram);
        return mapToResponse(saved, request.getUsuarioId());
    }

    @Transactional
    public void softDeleteDiagram(Long diagramId, Long userId) {
        Diagram diagram = diagramRepository.findByIdAndIsDeletedFalse(diagramId)
                .orElseThrow(() -> new IllegalArgumentException("Diagrama no encontrado."));

        // Validar que solo el creador pueda eliminar
        if (userId != null && !diagram.getCreador().getId().equals(userId)) {
            throw new IllegalStateException("Solo el creador del diagrama puede eliminarlo.");
        }

        diagram.setIsDeleted(true);
        diagram.setDeletedAt(LocalDateTime.now());
        diagramRepository.save(diagram);
    }

    @Transactional
    public CollaboratorDTO inviteCollaborator(Long diagramId, InviteCollaboratorRequest request) {
        Diagram diagram = diagramRepository.findByIdAndIsDeletedFalse(diagramId)
                .orElseThrow(() -> new IllegalArgumentException("Diagrama no encontrado."));

        User invitedUser = userRepository.findByCorreo(request.getCorreo())
                .orElseThrow(() -> new IllegalArgumentException("No existe ningún usuario registrado con el correo: " + request.getCorreo()));

        if (collaboratorRepository.existsByDiagramaIdAndUsuarioId(diagramId, invitedUser.getId())) {
            throw new IllegalArgumentException("El usuario ya es colaborador de este diagrama.");
        }

        Collaborator collaborator = Collaborator.builder()
                .diagrama(diagram)
                .usuario(invitedUser)
                .rol("COLABORADOR")
                .build();

        Collaborator saved = collaboratorRepository.save(collaborator);

        return CollaboratorDTO.builder()
                .id(saved.getId())
                .userId(invitedUser.getId())
                .nombre(invitedUser.getNombre())
                .correo(invitedUser.getCorreo())
                .rol(saved.getRol())
                .joinedAt(saved.getJoinedAt())
                .build();
    }

    @Transactional
    public void removeCollaborator(Long diagramId, Long targetUserId, Long requesterId) {
        Diagram diagram = diagramRepository.findByIdAndIsDeletedFalse(diagramId)
                .orElseThrow(() -> new IllegalArgumentException("Diagrama no encontrado."));

        if (requesterId != null && !diagram.getCreador().getId().equals(requesterId) && !requesterId.equals(targetUserId)) {
            throw new IllegalStateException("No tienes permisos para remover colaboradores de este diagrama.");
        }

        Collaborator collab = collaboratorRepository.findByDiagramaIdAndUsuarioId(diagramId, targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("El usuario no es colaborador de este diagrama."));

        if ("CREADOR".equalsIgnoreCase(collab.getRol()) || diagram.getCreador().getId().equals(targetUserId)) {
            throw new IllegalArgumentException("No se puede retirar al creador del diagrama.");
        }

        collaboratorRepository.delete(collab);
    }

    private DiagramResponse mapToResponse(Diagram diagram, Long currentUserId) {
        List<Collaborator> collabs = collaboratorRepository.findByDiagramaId(diagram.getId());

        List<CollaboratorDTO> collabDTOs = collabs.stream()
                .map(c -> CollaboratorDTO.builder()
                        .id(c.getId())
                        .userId(c.getUsuario().getId())
                        .nombre(c.getUsuario().getNombre())
                        .correo(c.getUsuario().getCorreo())
                        .rol(c.getRol())
                        .joinedAt(c.getJoinedAt())
                        .build())
                .collect(Collectors.toList());

        String role = "COLABORADOR";
        if (currentUserId != null && diagram.getCreador().getId().equals(currentUserId)) {
            role = "CREADOR";
        }

        return DiagramResponse.builder()
                .id(diagram.getId())
                .nombre(diagram.getNombre())
                .idCreador(diagram.getCreador().getId())
                .nombreCreador(diagram.getCreador().getNombre())
                .correoCreador(diagram.getCreador().getCorreo())
                .lienzo(diagram.getLienzo())
                .isDeleted(diagram.getIsDeleted())
                .userRole(role)
                .colaboradores(collabDTOs)
                .createdAt(diagram.getCreatedAt())
                .updatedAt(diagram.getUpdatedAt())
                .build();
    }
}
