package com.example.back_diagramador.repository.mongo;

import com.example.back_diagramador.document.ChatMessageDocument;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageMongoRepository extends MongoRepository<ChatMessageDocument, String> {

    List<ChatMessageDocument> findByDiagramIdOrderByCreatedAtAsc(Long diagramId);
}
