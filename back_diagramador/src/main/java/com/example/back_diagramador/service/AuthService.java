package com.example.back_diagramador.service;

import com.example.back_diagramador.dto.AuthResponse;
import com.example.back_diagramador.dto.LoginRequest;
import com.example.back_diagramador.dto.RegisterRequest;
import com.example.back_diagramador.model.User;
import com.example.back_diagramador.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByCorreo(request.getCorreo())) {
            throw new IllegalArgumentException("El correo ya se encuentra registrado.");
        }

        User user = User.builder()
                .correo(request.getCorreo())
                .nombre(request.getNombre() != null && !request.getNombre().isBlank()
                        ? request.getNombre()
                        : request.getCorreo().split("@")[0])
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        User saved = userRepository.save(user);
        return AuthResponse.builder()
                .id(saved.getId())
                .correo(saved.getCorreo())
                .nombre(saved.getNombre())
                .token("mock-jwt-token-" + saved.getId())
                .build();
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByCorreo(request.getCorreo())
                .orElseThrow(() -> new IllegalArgumentException("Usuario o contraseña incorrectos."));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Usuario o contraseña incorrectos.");
        }

        return AuthResponse.builder()
                .id(user.getId())
                .correo(user.getCorreo())
                .nombre(user.getNombre())
                .token("mock-jwt-token-" + user.getId())
                .build();
    }

    @Transactional(readOnly = true)
    public List<User> getQuickUsers() {
        return userRepository.findAll();
    }
}
