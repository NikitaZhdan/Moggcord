package net.lvrbl.authorizationservice.controller;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import net.lvrbl.authorizationservice.exceptions.CredentialsNotFoundException;
import net.lvrbl.authorizationservice.exceptions.IncorrectCredentialsException;
import net.lvrbl.authorizationservice.exceptions.UserExistenceException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.ModelAndView;

import java.net.URI;

@ControllerAdvice(basePackageClasses = AuthController.class)
public class AuthControllerAdvice {

    @ExceptionHandler(value = CredentialsNotFoundException.class)
    @ResponseBody
    public ProblemDetail handleCredentialsNotFoundException(WebRequest request, CredentialsNotFoundException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler(value = IncorrectCredentialsException.class)
    @ResponseBody
    public ProblemDetail handleIncorrectCredentialsException(WebRequest request, IncorrectCredentialsException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler(value = UserExistenceException.class)
    @ResponseBody
    public ProblemDetail handleUserExistenceException(WebRequest request, UserExistenceException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, e.getMessage());
    }
}
