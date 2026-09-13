package net.lvrbl.authorizationservice.service;


import net.lvrbl.authorizationservice.entity.Users;

public interface AuthService {
    void registerNewUser(Users user) throws Exception;
    String logInUser(Users user) throws Exception;
    void updateUserPassword(Users user, String newPassword) throws Exception;
}
