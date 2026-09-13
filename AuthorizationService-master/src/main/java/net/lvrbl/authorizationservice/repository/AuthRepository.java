package net.lvrbl.authorizationservice.repository;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import net.lvrbl.authorizationservice.entity.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AuthRepository extends JpaRepository<Users,Long> {
    boolean existsByEmailOrUsername(String email, String username);
    boolean existsByEmail(String email);
    Users findByUsername(String username);

    @Query("SELECT u.username FROM Users u WHERE u.email = :email")
    @Size(max = 50)
    @NotNull
    String findUsernameByEmail(@Param("email") String email);

    @Query("UPDATE Users u SET u.password = :password WHERE u.email = :email")
    void changeUserPassword(@Param("email") String email, @Param("password") String password);
}
