package com.example.back_diagramador.repository;

import com.example.back_diagramador.model.Collaborator;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CollaboratorRepository extends JpaRepository<Collaborator, Long> {
    List<Collaborator> findByDiagramaId(Long diagramaId);
    Optional<Collaborator> findByDiagramaIdAndUsuarioId(Long diagramaId, Long usuarioId);
    boolean existsByDiagramaIdAndUsuarioId(Long diagramaId, Long usuarioId);
}
