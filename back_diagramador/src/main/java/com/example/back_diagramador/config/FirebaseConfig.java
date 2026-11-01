package com.example.back_diagramador.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;

@Configuration
@Slf4j
public class FirebaseConfig {

    @Value("${firebase.credentials.path:firebase-service-account.json}")
    private String credentialsPath;

    private boolean initialized = false;

    @PostConstruct
    public void initFirebase() {
        try {
            if (!FirebaseApp.getApps().isEmpty()) {
                initialized = true;
                log.info("FirebaseApp ya se encontraba inicializado previamente.");
                return;
            }

            File file = new File(credentialsPath);
            InputStream stream = null;

            if (file.exists()) {
                stream = new FileInputStream(file);
            } else {
                stream = getClass().getClassLoader().getResourceAsStream(credentialsPath);
            }

            if (stream != null) {
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(stream))
                        .build();

                FirebaseApp.initializeApp(options);
                initialized = true;
                log.info("FirebaseApp inicializado exitosamente con credenciales desde: {}", credentialsPath);
            } else {
                log.info("Aviso: No se encontró archivo de credenciales de Firebase en '{}'. Modo FCM Push en modo simulado para desarrollo local.", credentialsPath);
            }
        } catch (Exception e) {
            log.warn("No se pudo inicializar FirebaseApp (modo offline/desarrollo activo): {}", e.getMessage());
        }
    }

    public boolean isInitialized() {
        return initialized;
    }
}
