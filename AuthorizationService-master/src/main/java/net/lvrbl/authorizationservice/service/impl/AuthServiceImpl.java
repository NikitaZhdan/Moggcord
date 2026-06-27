package net.lvrbl.authorizationservice.service.impl;

import jakarta.persistence.EntityExistsException;
import lombok.AllArgsConstructor;
import net.lvrbl.authorizationservice.configuration.SpringSecurityConfig;
import net.lvrbl.authorizationservice.entity.Users;
import net.lvrbl.authorizationservice.repository.AuthRepository;
import net.lvrbl.authorizationservice.service.AuthService;
import net.lvrbl.authorizationservice.service.JWTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Objects;

@Service
@AllArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final AuthRepository repository;
    private final SpringSecurityConfig ssc;

    @Autowired
    AuthenticationManager authenticationManager;
    @Autowired
    private JWTService jwtService;

    @Override
    public void registerNewUser(Users user) {
        if (user.getEmail().isEmpty()) throw new IllegalArgumentException("Email is empty");
        if (user.getUsername().isEmpty()) throw new IllegalArgumentException("Username is empty");
        if (user.getPassword().isEmpty()) throw new IllegalArgumentException("Password is empty");
        if (repository.existsByEmailOrUsername(user.getEmail(), user.getUsername())) throw new EntityExistsException("User already exist");

        user.setPassword(Objects.requireNonNull(ssc.passwordEncoder().encode(user.getPassword())));
        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());

        repository.save(user);
    }

    @Override
    public String logInUser(Users user) {
        if (user.getEmail().isEmpty()) throw new IllegalArgumentException("Email is empty");
        if (user.getUsername().isEmpty()) throw new IllegalArgumentException("Username is empty");
        if (user.getPassword().isEmpty()) throw new IllegalArgumentException("Password is empty");
        if (!repository.existsByEmailAndUsername(user.getEmail(), user.getUsername())) throw new EntityExistsException("User doesn't exist");

        String response = verify(user);
        if (response != null) {
            return response;
        }
        throw new AuthenticationServiceException("User not authenticated");
    }

    public String verify(Users user) {
        Authentication authenticationResponse = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(user.getUsername(), user.getPassword()));
        if (authenticationResponse.isAuthenticated()) {
            Users existingUser = repository.findByUsername(user.getUsername());
            return jwtService.generateToken(existingUser.getUsername(), String.valueOf(existingUser.getUuid()));
        }
        return null;
    }
}
