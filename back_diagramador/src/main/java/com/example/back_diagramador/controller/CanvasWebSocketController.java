package com.example.back_diagramador.controller;

import com.example.back_diagramador.dto.WebSocketMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
@Slf4j
public class CanvasWebSocketController {

    /**
     * Canal STOMP para retransmitir eventos de cambios en el lienzo, movimiento de nodos y presencia
     * Origen del cliente: /app/diagram/{id}/sync
     * Destino difundido: /topic/diagram/{id}
     */
    @MessageMapping("/diagram/{id}/sync")
    @SendTo("/topic/diagram/{id}")
    public WebSocketMessage handleCanvasSync(
            @DestinationVariable Long id,
            @Payload WebSocketMessage message) {

        log.debug("Mensaje recibido para diagrama {}: tipo={}, usuario={}", id, message.getType(), message.getUserName());
        message.setTimestamp(System.currentTimeMillis());
        return message;
    }
}
