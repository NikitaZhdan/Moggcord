package net.lvrbl.authorizationservice.service.impl;

import jakarta.persistence.EntityExistsException;
import lombok.AllArgsConstructor;
import net.lvrbl.authorizationservice.configuration.SpringSecurityConfig;
import net.lvrbl.authorizationservice.entity.Users;
import net.lvrbl.authorizationservice.exceptions.CredentialsNotFoundException;
import net.lvrbl.authorizationservice.exceptions.IncorrectCredentialsException;
import net.lvrbl.authorizationservice.exceptions.UserExistenceException;
import net.lvrbl.authorizationservice.repository.AuthRepository;
import net.lvrbl.authorizationservice.service.AuthService;
import net.lvrbl.authorizationservice.service.JWTService;
import org.flywaydb.core.internal.logging.log4j2.Log4j2Log;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Objects;
import java.util.logging.Logger;

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
        if (user == null) throw new CredentialsNotFoundException("User data can not be null!");
        if (user.getEmail().isEmpty()) throw new CredentialsNotFoundException("Email is empty!");
        if (user.getUsername().isEmpty()) throw new CredentialsNotFoundException("Username is empty!");
        if (user.getPassword().isEmpty()) throw new CredentialsNotFoundException("Password is empty!");
        if (repository.existsByEmailOrUsername(user.getEmail(), user.getUsername())) throw new UserExistenceException("User already exist!");

        user.setPassword(Objects.requireNonNull(ssc.passwordEncoder().encode(user.getPassword())));
        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());

        repository.save(user);
    }

    @Override
    public String logInUser(Users user) throws Exception {
        if (user == null) throw new CredentialsNotFoundException("User data can not be null!");
        if (user.getEmail().isEmpty()) throw new CredentialsNotFoundException("Email/Username is empty!");
        if (user.getPassword().isEmpty()) throw new CredentialsNotFoundException("Password is empty!");

        if (!repository.existsByEmail(user.getEmail())) throw new UserExistenceException("User doesn't exist!");

        user.setUsername(repository.findUsernameByEmail(user.getEmail()));
        String response = verify(user);
        if (response != null) return response;
        throw new IncorrectCredentialsException("Email/username or password is incorrect!");
    }

    @Override
    public void updateUserPassword(Users user, String newPassword) {
        System.out.println(user.toString() + " " + newPassword);
        if (user == null) throw new CredentialsNotFoundException("User data can not be null!");
        if (user.getPassword().isEmpty()) throw new CredentialsNotFoundException("Password is empty!");


        if (!repository.existsByEmail(user.getEmail())) throw new UserExistenceException("User doesn't exist!");

        repository.changeUserPassword(user.getEmail(), ssc.passwordEncoder().encode(newPassword));
    }

    private String verify(Users user) {
        Authentication authenticationResponse;
        try {
            authenticationResponse = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(user.getUsername(), user.getPassword()));
            if (authenticationResponse.isAuthenticated()) {
                Users existingUser = repository.findByUsername(user.getUsername());
                return jwtService.generateToken(existingUser.getUsername(), String.valueOf(existingUser.getUuid()));
            }
        } catch (Exception e) {
            throw new IncorrectCredentialsException("Email or password is incorrect!");
        }
        return null;
    }
}
