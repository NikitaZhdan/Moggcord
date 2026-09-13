package net.lvrbl.authorizationservice.exceptions;

public class CredentialsNotFoundException extends RuntimeException {

    public CredentialsNotFoundException(String message) {
        super(message);
    }
}
