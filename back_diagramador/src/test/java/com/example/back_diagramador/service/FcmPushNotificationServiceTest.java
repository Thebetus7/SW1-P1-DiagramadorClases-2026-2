package com.example.back_diagramador.service;

import com.example.back_diagramador.config.FirebaseConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.when;

class FcmPushNotificationServiceTest {

    @Test
    @DisplayName("sendDiagramUpdatedPush debe operar en modo simulado elegante si Firebase no está inicializado")
    void testSendPushOfflineMode() {
        FirebaseConfig mockConfig = Mockito.mock(FirebaseConfig.class);
        when(mockConfig.isInitialized()).thenReturn(false);

        FcmPushNotificationService service = new FcmPushNotificationService(mockConfig);
        boolean result = service.sendDiagramUpdatedPush(10L, "Diagrama Facturación", "Edberto");

        assertFalse(result, "Debe retornar false y no lanzar excepción cuando Firebase no está inicializado");
    }
}
