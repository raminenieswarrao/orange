package com.orange.app.auth;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class OrangePasswordAuthController {

    private final OrangePasswordAuthService authService;

    public OrangePasswordAuthController(
            OrangePasswordAuthService authService
    ) {
        this.authService = authService;
    }

    /**
     * Signs into Orange using either:
     *
     * - email + password
     * - username + password
     */
    @PostMapping("/password-login")
    public LoginResponse login(
            @RequestBody LoginRequest request
    ) {
        if (request == null) {
            throw new OrangePasswordAuthService
                    .InvalidLoginException();
        }

        OrangePasswordAuthService.LoginResult result =
                authService.login(
                        request.identifier(),
                        request.password()
                );

        return new LoginResponse(
                result.accessToken(),
                result.refreshToken(),
                result.expiresIn(),
                result.tokenType()
        );
    }

    /**
     * Invalid usernames, emails and passwords deliberately
     * return the same response.
     *
     * This avoids revealing whether an Orange account exists.
     */
    @ExceptionHandler(
            OrangePasswordAuthService
                    .InvalidLoginException.class
    )
    public ResponseEntity<Map<String, String>>
    handleInvalidLogin(
            OrangePasswordAuthService
                    .InvalidLoginException exception
    ) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(
                        Map.of(
                                "message",
                                "Invalid username/email or password."
                        )
                );
    }

    public record LoginRequest(
            String identifier,
            String password
    ) {
    }

    public record LoginResponse(
            String accessToken,
            String refreshToken,
            Long expiresIn,
            String tokenType
    ) {
    }
}