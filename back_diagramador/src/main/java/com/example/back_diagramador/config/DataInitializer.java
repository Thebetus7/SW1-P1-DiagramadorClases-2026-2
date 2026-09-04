package com.example.back_diagramador.config;

import com.example.back_diagramador.model.Collaborator;
import com.example.back_diagramador.model.Diagram;
import com.example.back_diagramador.model.User;
import com.example.back_diagramador.repository.CollaboratorRepository;
import com.example.back_diagramador.repository.DiagramRepository;
import com.example.back_diagramador.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final DiagramRepository diagramRepository;
    private final CollaboratorRepository collaboratorRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            log.info("Inicializando datos de prueba...");

            // 1. Usuario 1 (Docente / Creador)
            User user1 = User.builder()
                    .correo("docente@diagramador.com")
                    .nombre("Dr. Carlos Mendoza (Docente)")
                    .password(passwordEncoder.encode("123456"))
                    .build();
            User savedUser1 = userRepository.save(user1);

            // 2. Usuario 2 (Estudiante / Colaborador)
            User user2 = User.builder()
                    .correo("estudiante@diagramador.com")
                    .nombre("Ana Rojas (Estudiante)")
                    .password(passwordEncoder.encode("123456"))
                    .build();
            User savedUser2 = userRepository.save(user2);

            // Diagrama inicial de ejemplo con el modelo UML del sistema
            String defaultUmlLienzo = """
            {
              "nodes": [
                {
                  "id": "node-1",
                  "type": "umlClass",
                  "position": { "x": 60, "y": 120 },
                  "data": {
                    "name": "Usuario",
                    "stereotype": "",
                    "attributes": [
                      "- contraseña: string",
                      "- correo: string"
                    ],
                    "methods": [
                      "+ login(): void",
                      "+ register(): void"
                    ]
                  }
                },
                {
                  "id": "node-2",
                  "type": "umlClass",
                  "position": { "x": 560, "y": 80 },
                  "data": {
                    "name": "Diagrama",
                    "stereotype": "",
                    "attributes": [
                      "- nombre: string",
                      "- id_creador: int",
                      "- lienzo: json"
                    ],
                    "methods": [
                      "+ create(): void",
                      "+ update(): void",
                      "+ share(): void",
                      "+ softdelete(): void"
                    ]
                  }
                },
                {
                  "id": "node-3",
                  "type": "umlClass",
                  "position": { "x": 300, "y": 380 },
                  "data": {
                    "name": "Colaborador",
                    "stereotype": "",
                    "attributes": [
                      "- id_colaborador: int",
                      "- id_diagrama: int"
                    ],
                    "methods": [
                      "+ entrar(): void",
                      "+ ignorar(): void"
                    ]
                  }
                },
                {
                  "id": "node-4",
                  "type": "umlNote",
                  "position": { "x": 60, "y": 420 },
                  "data": {
                    "content": "Nota UML: Los colaboradores pueden editar en tiempo real con distinción de roles."
                  }
                }
              ],
              "edges": [
                {
                  "id": "edge-1-2",
                  "source": "node-1",
                  "target": "node-2",
                  "label": "genera (1..*)",
                  "type": "smoothstep",
                  "style": { "stroke": "#475569", "strokeWidth": 1.5 }
                },
                {
                  "id": "edge-1-3",
                  "source": "node-1",
                  "target": "node-3",
                  "label": "puede ser (1..*)",
                  "type": "smoothstep",
                  "style": { "stroke": "#475569", "strokeWidth": 1.5 }
                },
                {
                  "id": "edge-3-2",
                  "source": "node-3",
                  "target": "node-2",
                  "label": "estar (1..*)",
                  "type": "smoothstep",
                  "style": { "stroke": "#475569", "strokeWidth": 1.5 }
                }
              ]
            }
            """;

            Diagram diagram = Diagram.builder()
                    .nombre("Diagrama de Clases del Sistema")
                    .creador(savedUser1)
                    .lienzo(defaultUmlLienzo)
                    .isDeleted(false)
                    .build();
            Diagram savedDiagram = diagramRepository.save(diagram);

            // Colaboradores del diagrama de ejemplo
            Collaborator c1 = Collaborator.builder()
                    .diagrama(savedDiagram)
                    .usuario(savedUser1)
                    .rol("CREADOR")
                    .build();
            collaboratorRepository.save(c1);

            Collaborator c2 = Collaborator.builder()
                    .diagrama(savedDiagram)
                    .usuario(savedUser2)
                    .rol("COLABORADOR")
                    .build();
            collaboratorRepository.save(c2);

            log.info("Datos de prueba inicializados exitosamente.");
        }
    }
}
