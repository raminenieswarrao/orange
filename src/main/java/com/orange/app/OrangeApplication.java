package com.orange.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class OrangeApplication {

    public static void main(String[] args) {
        SpringApplication.run(
                OrangeApplication.class,
                args
        );
    }
}