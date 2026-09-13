package net.lvrbl.authorizationservice.controller;

import lombok.AllArgsConstructor;
import lombok.NonNull;
import net.lvrbl.authorizationservice.entity.Users;
import net.lvrbl.authorizationservice.exceptions.CredentialsNotFoundException;
import net.lvrbl.authorizationservice.exceptions.IncorrectCredentialsException;
import net.lvrbl.authorizationservice.exceptions.UserExistenceException;
import net.lvrbl.authorizationservice.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.ModelAndView;

@RestController
@AllArgsConstructor
public class AuthController {

    @NonNull
    private final AuthService authService;


    @PostMapping("/api/v1/signUp")
    @ResponseBody
    public ResponseEntity<String> signUp(@RequestBody Users user) throws Exception{
        authService.registerNewUser(user);
        return new ResponseEntity<>("Successfully registered!", HttpStatus.OK);
    }

    @PostMapping("/api/v1/signIn")
    @ResponseBody
    public ResponseEntity<String> signIn(@RequestBody Users user) throws Exception {
        String response = authService.logInUser(user);
        return new ResponseEntity<>("Successfully logged in! " + "JWT: " + response, HttpStatus.OK);
    }

    @PutMapping("/api/v1/updateUserPassword")
    @ResponseBody
    public ResponseEntity<String> updateUserPassword(@RequestBody Users user, String newPassword) throws Exception {
        authService.updateUserPassword(user, newPassword);
        return new ResponseEntity<>("Successfully changed!", HttpStatus.OK);
    }

    @GetMapping("/api/v1/content/1")
    @ResponseBody
    public String content_test_1() {
        return "Content 1";
    }
}
