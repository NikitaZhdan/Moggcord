package net.lvrbl.authorizationservice.repository;

import net.lvrbl.authorizationservice.entity.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface AuthRepository extends JpaRepository<Users,Long> {
    boolean existsByEmailAndUsername(String email, String username);
    boolean existsByEmailOrUsername(String email, String username);
    Users findByEmailAndUsername(String email, String username);
    Users findByUsername(String username);
}
