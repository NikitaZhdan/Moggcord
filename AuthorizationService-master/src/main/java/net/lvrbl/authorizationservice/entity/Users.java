package net.lvrbl.authorizationservice.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
public class Users {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID uuid;

    @Size(max = 50)
    @NotNull
    @Column(name = "email")
    private String email;

    @Size(max = 50)
    @NotNull
    @Column(name = "username")
    private String username;

    @Size(max = 200)
    @NotNull
    @Column(name = "password")
    private String password;

    @ColumnDefault("now()")
    @NotNull
    @Column(name = "created_at")
    private Instant createdAt;

    @ColumnDefault("now()")
    @NotNull
    @Column(name = "updated_at")
    private Instant updatedAt;
}
