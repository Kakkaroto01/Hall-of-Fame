# Pokémon Hall of Fame

Aplicación web para registrar Nuzlockes y los Pokémon que los hicieron legendarios.

**Lee primero `docs/PROYECTO.md`**: explica la idea, los objetivos, lo ya realizado y el estado real de este paquete.

> Estado: reconstrucción en curso. Este paquete incluye la base de datos (verificada), la lógica, la sincronización y los componentes visuales, pero **todavía no las pantallas ni las pruebas automáticas**; `npm run build` falla hasta que se restauren (faltan 18 módulos `src/pages/*`).

Comprobación disponible ahora mismo: la base de datos.

```bash
# en una base PostgreSQL vacía (con auth/storage de Supabase o simulados):
# 0001_schema.sql, 0002_rls.sql, 0003_seed.sql y supabase/tests/smoke.sql  → "TODAS LAS PRUEBAS PASARON"
# después 0004_catalog.sql y 0005_games.sql (en una base distinta de la de la prueba de humo)
```
