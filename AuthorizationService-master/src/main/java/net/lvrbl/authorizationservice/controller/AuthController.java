package net.lvrbl.authorizationservice.controller;

import lombok.AllArgsConstructor;
import lombok.NonNull;
import net.lvrbl.authorizationservice.configuration.SpringSecurityConfig;
import net.lvrbl.authorizationservice.entity.Users;
import net.lvrbl.authorizationservice.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@AllArgsConstructor
public class AuthController {

    @NonNull
    private final AuthService authService;


    @PostMapping("/api/v1/signUp")
    @ResponseBody
    public ResponseEntity<String> signUp(@RequestBody Users user) {
        try {
            authService.registerNewUser(user);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
        return new ResponseEntity<>("Successfully registered!", HttpStatus.OK);
    }

    @PostMapping("/api/v1/signIn")
    @ResponseBody
    public ResponseEntity<String> signIn(@RequestBody Users user) {
        String response;
        try {
            response = authService.logInUser(user);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
        return new ResponseEntity<>("Successfully logged in! " + "JWT: " + response, HttpStatus.OK);
    }

    @GetMapping("/api/v1/content/1")
    @ResponseBody
    public String content_test_1() {
        return "Content 1";
    }
}
