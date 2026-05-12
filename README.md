# 🏖️ Ferieplan

Web-baseret ferieplanlægning til virksomheder — erstatter Excel-ark.

## Kom i gang

### 1. Krav
- Node.js 18+
- PostgreSQL database

### 2. Installation

```bash
npm install
```

### 3. Miljøvariabler

```bash
cp .env.example .env
```

Rediger `.env`:
```
DATABASE_URL="postgresql://bruger:adgangskode@localhost:5432/ferieplan"
NEXTAUTH_SECRET="mindst-32-tilfaeldige-tegn-her"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Database

```bash
npm run db:push
npm run db:seed
```

### 5. Start

```bash
npm run dev
```

Åbn [http://localhost:3000](http://localhost:3000)

## Test-brugere

| Email | Adgangskode | Rolle |
|-------|-------------|-------|
| admin@firma.dk | admin123 | Admin |
| leder@firma.dk | user123 | Manager |
| anna@firma.dk | user123 | Medarbejder |
| bo@firma.dk | user123 | Medarbejder |

## Roller

- **EMPLOYEE** — opretter og ser egne ansøgninger
- **MANAGER** — godkender/afviser for egen afdeling, ser kalender
- **ADMIN** — fuld adgang: brugere, afdelinger, helligdage, indstillinger

## Features

- Ferieansøgninger med enkeltdage, intervaller og halvdage
- Godkendelse/afvisning med kapacitetsadvarsel (blød grænse)
- Månedlig kalendervisning (Excel-lignende grid)
- Danske helligdage + lokale firmafridage
- Audit log på alle handlinger
- Rollebaseret adgangsstyring
