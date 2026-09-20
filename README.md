# Orange

Mobile-first shared-expense application built with Java 21, Spring Boot, HTML, CSS and vanilla JavaScript.

## Requirements

- Java 21
- Maven 3.9+
- The separate `ORANGE-DEV` Supabase project

## Configure

Set these environment variables before starting the application:

```text
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

The anon key is intentionally exposed to the browser. Never expose the Supabase service-role key.

In Supabase, configure Google under Authentication > Providers and add your application URL to the allowed redirect URLs.

## Run

```bash
mvn spring-boot:run
```

Open `http://localhost:8080` in a mobile-sized browser window.

## Current starter scope

- Animated Orange opening screen
- Google login wiring through Supabase Auth
- Mobile-first empty dashboard
- Installable PWA manifest and offline application shell
- Public runtime configuration endpoint
- Backend health endpoint

The expense, friend, group, settlement and notification backend modules are the next implementation phase.
