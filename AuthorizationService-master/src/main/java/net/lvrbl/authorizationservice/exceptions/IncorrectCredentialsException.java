package net.lvrbl.authorizationservice.exceptions;

public class IncorrectCredentialsException extends RuntimeException {

    public IncorrectCredentialsException(String message) {
        super(message);
    }
}
