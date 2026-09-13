package net.lvrbl.authorizationservice.exceptions;

public class UserExistenceException extends RuntimeException {
    public UserExistenceException(String message) {
        super(message);
    }
}
