package com.example.back_diagramador.repository;

import com.example.back_diagramador.model.Diagram;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DiagramRepository extends JpaRepository<Diagram, Long> {

    List<Diagram> findByIsDeletedFalseOrderByUpdatedAtDesc();

    Optional<Diagram> findByIdAndIsDeletedFalse(Long id);

    @Query("SELECT DISTINCT d FROM Diagram d LEFT JOIN Collaborator c ON c.diagrama = d " +
           "WHERE d.isDeleted = false AND (d.creador.id = :userId OR c.usuario.id = :userId) " +
           "ORDER BY d.updatedAt DESC")
    List<Diagram> findAccessibleDiagramsByUser(@Param("userId") Long userId);
}
