package net.lvrbl.authorizationservice.service;


import net.lvrbl.authorizationservice.entity.Users;

public interface AuthService {
    void registerNewUser(Users user) throws Exception;
    String logInUser(Users user) throws Exception;
}
