package com.example.back_diagramador.service;

import com.example.back_diagramador.config.FirebaseConfig;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class FcmPushNotificationService {

    private final FirebaseConfig firebaseConfig;

    /**
     * Emite una notificación push a los dispositivos móviles vinculados al tópico del diagrama
     * cuando se realizan mutaciones en el lienzo web.
     */
    public boolean sendDiagramUpdatedPush(Long diagramId, String diagramName, String authorName) {
        if (!firebaseConfig.isInitialized()) {
            log.info("[FCM Simulado] Push omitido para tópico 'diagram_{}': autor={}, lienzo='{}'", diagramId, authorName, diagramName);
            return false;
        }

        try {
            String topic = "diagram_" + diagramId;
            String title = "Lienzo Actualizado: " + (diagramName != null ? diagramName : "Diagrama #" + diagramId);
            String body = (authorName != null ? authorName : "Un colaborador") + " ha modificado clases o relaciones en el lienzo.";

            Message message = Message.builder()
                    .setTopic(topic)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .putData("diagramId", String.valueOf(diagramId))
                    .putData("diagramName", diagramName != null ? diagramName : "")
                    .putData("authorName", authorName != null ? authorName : "")
                    .putData("type", "CANVAS_UPDATED")
                    .build();

            String response = FirebaseMessaging.getInstance().send(message);
            log.info("Notificación push FCM enviada con éxito al tópico {}: {}", topic, response);
            return true;
        } catch (Exception e) {
            log.error("Error al emitir notificación push FCM para el diagrama {}: {}", diagramId, e.getMessage());
            return false;
        }
    }
}
