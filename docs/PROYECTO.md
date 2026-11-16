# Pokémon Hall of Fame — documento de proyecto

Aplicación web para registrar Nuzlockes (y otras aventuras Pokémon), guardar a los Pokémon que las hicieron legendarias y compararlas con amigos.

> **Estado real de este paquete (léelo primero).** El proyecto se construyó y se probó durante la conversación, pero el entorno de trabajo se reinició y se perdió la carpeta. Se está reconstruyendo desde el código de la conversación. **Este zip contiene la parte ya restaurada** (base de datos, lógica, sincronización, componentes visuales) **y todavía no las 18 pantallas ni las pruebas automáticas**, así que la app **aún no arranca**. La sección 5 detalla qué está en cada estado, sin maquillar.

---

## 1. La idea

Quien juega Nuzlockes acaba con partidas, equipos y recuerdos repartidos en capturas, notas y archivos de guardado. Esta aplicación los reúne en un **Hall of Fame personal y entre amigos**:

- Cada **Pokémon es un ejemplar concreto** (no solo una especie), con su ficha, su historia y sus reconocimientos.
- Cada **locke** (aventura) tiene su propio Hall of Fame: resultado, reglas, equipo de la Liga, MVP y destacados.
- Los **amigos** pueden ver los Hall of Fame y compararse; los rankings comunitarios no revelan datos privados.
- Funciona **en ordenador y móvil**, también **sin conexión**, y se pensó para **coste cero o mínimo** al principio (uso personal y entre amigos).

### Principios (de la especificación)

1. Una ficha = un ejemplar, no una especie.
2. Un ejemplar puede acumular varias categorías e insignias.
3. El pasado se conserva: evolucionar o editar no borra nada.
4. Rankings coherentes, transparentes y resistentes a la manipulación.
5. La privacidad se configura por separado (locke, ficha, archivo, evidencia).
6. Ordenador y móvil con la misma prioridad.
7. La experiencia visual es parte del producto.
8. Primera versión gratuita o de coste mínimo.

---

## 2. Decisiones tomadas con David

| Tema | Decisión |
|---|---|
| Plataforma | App web responsive, PWA instalable. React + TypeScript + Vite. |
| Backend | Supabase (PostgreSQL, Auth con correo y Google, Storage, funciones). Permisos con RLS. |
| Offline | Primero se guarda en el dispositivo (IndexedDB con Dexie) y se sincroniza después. |
| Visibilidad | Tres niveles: privada, amigos, comunidad. Solo las fichas en «comunidad» entran en rankings. |
| Audiencia | Por ahora, David y sus amigos. Registro por código de invitación. |
| Importación v1 | Archivos .pk6 descifrados (PKHeX) y texto de Showdown. .pk7/.pk8/.pk9 cuando haya muestras. |
| PvP | Un locke por jugador, enlazados entre sí (cada uno es dueño de sus datos). |
| Idioma | Interfaz en español; nombres de especies, movimientos, habilidades y objetos en español e inglés. |

---

## 3. Objetivos a cumplir

### 3.1. Criterios de aceptación de la v1 (los 20 de la especificación)

| # | Criterio | Estado de la funcionalidad¹ | Qué hay en este zip |
|---|---|---|---|
| 1 | Registro con correo o Google | Hecho | Lógica de acceso; falta la pantalla |
| 2 | Crear un locke, elegir juego y registrar resultado | Hecho | Datos, catálogo y reglas; faltan pantallas |
| 3 | Crear fichas a mano e importar varias con previsualización | Hecho (.pk6 y Showdown) | Parsers y plan de importación; faltan pantallas |
| 4 | Modificar una ficha sin perder versiones | Hecho | Servidor completo; falta la pantalla |
| 5 | Registrar una evolución y ver lo anterior | Hecho | Servidor completo; falta la pantalla |
| 6 | Marcar un Pokémon como caído y seguir dándole reconocimientos | Hecho | Servidor y tarjeta; falta la pantalla |
| 7 | Varias categorías e insignias en el mismo ejemplar | Hecho | Servidor, medallas y lógica; falta la pantalla |
| 8 | Ver el Hall of Fame de un locke | Hecho | Componentes y estilos; falta la pantalla |
| 9 | Crear categorías personales y descubrir las compartidas | **Parcial** (crear sí; descubrir/compartir no tiene pantalla) | Servidor completo |
| 10 | Los cambios en categorías compartidas requieren aceptación | **Parcial** | Servidor completo (revisiones y aceptación) |
| 11 | Rankings generales y específicos sin exponer lo privado | **Parcial** | Vistas y funciones SQL probadas; falta la pantalla |
| 12 | Los reconocimientos oficiales puntúan de forma consistente | Hecho | Cálculo en servidor, probado |
| 13 | Guardar y descargar varios archivos por locke sin sobrescribir | **Pendiente** | Solo esquema y bucket |
| 14 | Exportar el Hall of Fame completo | **Pendiente** | — |
| 15 | Trabajar sin conexión y sincronizar después | Hecho | Base local, cola y motor de sincronización |
| 16 | Los conflictos conservan ambas versiones y se pueden resolver | **Parcial** (se detectan y conservan; falta la pantalla de resolución) | Motor de sincronización |
| 17 | Recuperar elementos de la papelera | Hecho para lockes y fichas; categorías parcial | Borrado lógico y purga en servidor |
| 18 | Usable en ordenador y móvil | Hecho (revisado en Chromium; no en Safari/iOS) | Estilos y componentes |
| 19 | Animaciones funcionales que respetan el movimiento reducido | Hecho | Tarjeta, carrusel y entrada del Hall |
| 20 | Permisos aplicados en interfaz y servidor | Hecho | RLS probado; modo solo lectura en pantallas (pendiente de restaurar) |

¹ «Hecho» = construido y verificado con pruebas automáticas contra un servidor simulado **antes del reinicio del entorno**. No se ha probado contra un Supabase real.

### 3.2. Fuera del alcance inicial (según la especificación)

Integración con emuladores, inyección en juegos, lectura de partidas en ejecución, registro automático de combates PvP, extracción automática del equipo desde el guardado, economía/monetización y moderación avanzada.

---

## 4. Arquitectura

```
Navegador (PWA)                              Supabase
┌──────────────────────────────┐            ┌────────────────────────────┐
│ React + Vite                 │            │ PostgreSQL + RLS           │
│  ├─ Pantallas y componentes  │  HTTPS     │  ├─ tablas, triggers       │
│  ├─ Dexie (IndexedDB)  ◄─────┼──────────► │  ├─ historial de fichas    │
│  │   datos locales + cola    │  sync      │  ├─ reglas de premios      │
│  └─ Service worker (offline) │            │  ├─ puntuaciones/rankings  │
└──────────────────────────────┘            │ Auth (correo, Google)      │
                                            │ Storage privado (archivos) │
                                            └────────────────────────────┘
```

Puntos clave del diseño:

- **IDs generados en el cliente** (permite crear sin conexión) y **versión por fila**: cada edición envía la versión que conocía; si no coincide, el servidor responde con conflicto y la app guarda **ambas** versiones.
- **El historial de fichas lo escribe el servidor** (un cambio de forma se registra como evolución); el cliente no puede omitirlo.
- **Las reglas de premios se aplican en el servidor** (equipo de la Liga de 6 como máximo, MVP único, MVP de la Liga entre el equipo, etc.); la interfaz las comprueba antes pero no confía en ello.
- **Puntuación calculada solo en servidor**, con reconocimientos oficiales y aventuras finalizadas; ningún usuario puede escribirla.
- **Rankings sin propietarios**: vistas que no incluyen el dueño ni fichas no «comunidad».
- **Al dejar de ser amigos** se borra del dispositivo la copia de sus datos y se vuelve a descargar solo lo que el servidor siga mostrando.

### Estructura de carpetas

```
supabase/migrations/   0001 esquema · 0002 permisos · 0003 datos iniciales
                       0004 especies y formas · 0005 juegos
supabase/tests/        smoke.sql (prueba de humo de reglas y permisos)
scripts/               generadores de nombres, catálogo y juegos
src/db/                base local (Dexie), cola de cambios, purga de caché ajena
src/sync/              motor de sincronización
src/catalog/           nombres (es/en), sprites, formas, resolución de nombres
src/import/            lectura de .pk6 y Showdown, previsualización
src/domain/            reglas y lógica (lockes, premios, historial, valores de formulario)
src/ui/                tarjeta de ficha, carrusel, medallas, formularios
src/layout/ auth/ social/   navegación, acceso, amigos
docs/                  este documento
```

---

## 5. Partes realizadas

Leyenda de la última columna: **Restaurado** = está en este zip y compila. **Falta** = hay que volver a escribirlo.

### Fase 0 — Revisión técnica y bases

| Parte | Estado antes del reinicio | En este zip |
|---|---|---|
| Revisión técnica de la especificación y plan por fases | Hecho | (este documento) |
| Esquema de base de datos y permisos (RLS) | Hecho, probado | **Restaurado y verificado de nuevo** |
| Prueba de humo SQL (reglas, permisos, versiones, rankings, papelera) | Hecho: pasa | **Restaurado y pasa de nuevo** |
| Catálogo: 1025 especies y 1157 formas con tipos | Hecho | **Restaurado y verificado** |
| Catálogo: 22 juegos oficiales, 38 versiones, 15 grupos | Hecho | **Restaurado y verificado** |
| Nombres en español e inglés (especies, movimientos, habilidades, objetos, naturalezas) | Hecho | **Restaurado** |
| Lectura de archivos .pk6 y texto de Showdown | Hecho, probado con un archivo real | **Restaurado** (sin sus pruebas) |
| Sprites por regla (juego, shiny, formas, animación) | Hecho | **Restaurado** |

### Fase 1 — Base de la aplicación

| Parte | Antes del reinicio | En este zip |
|---|---|---|
| Acceso con correo y Google, invitación por código | Hecho | Lógica restaurada; **falta** Login e Invite |
| Navegación (barra lateral y barra inferior en móvil), indicador de sincronización | Hecho | **Restaurado** |
| Mis lockes: crear con carrusel de juegos, ver, finalizar con 5 resultados, papelera | Hecho | **Falta** (pantallas) |
| Offline-first: guardado local, cola, detección de conflictos, PWA | Hecho | **Restaurado** (motor y base local) |

### Fase 2 — Fichas

| Parte | Antes del reinicio | En este zip |
|---|---|---|
| Tarjeta con giro, sprite animado/ampliable, estado «caído», medallas | Hecho, revisado en navegador real | **Restaurado** |
| Importar uno o varios .pk6 o texto Showdown con previsualización y avisos | Hecho | Lógica restaurada; **falta** la pantalla |
| Duplicados: se omiten salvo que el usuario elija actualizar o crear otra | Hecho | Lógica restaurada |
| Alta manual (oculta campos que el juego no tiene) | Hecho | Formulario restaurado; **falta** la pantalla |
| Editar ficha (solo los campos cambiados), evolucionar, caído/vivo, papelera | Hecho | **Falta** (pantallas) |
| Historial de versiones consultable, también la ficha tal como era | Hecho | Servidor restaurado; **falta** la pantalla |

### Fase 3 — Hall of Fame y reconocimientos

| Parte | Antes del reinicio | En este zip |
|---|---|---|
| Equipo de la Liga (máx. 6), MVP de la Liga, MVP del juego, reconocimientos manuales con motivo | Hecho | Lógica y servidor restaurados; **falta** la pantalla |
| Biblioteca: categorías oficiales y creación de personales | Hecho | **Falta** (pantalla) |
| Hall of Fame de un locke con entrada animada omitible (Esc/botón) | Hecho, revisado en navegador | Estilos y componentes restaurados; **falta** la pantalla |
| Rechazos del servidor: se deshace en local y se avisa con un banner | Hecho | **Restaurado** |

### Fase 4 — Comunidad

| Parte | Antes del reinicio | En este zip |
|---|---|---|
| Amigos: buscar, enviar/aceptar/rechazar/cancelar, eliminar | Hecho | Lógica restaurada; **falta** la pantalla |
| Perfil de un amigo con comparación de resultados; su Hall en solo lectura | Hecho | Lógica restaurada; **falta** la pantalla |
| Purga de la copia local al dejar de ser amigos | Hecho | **Restaurado** |
| Perfil y ajustes (usuario, nombre, aparecer en rankings) | Hecho | **Falta** (pantalla) |

### Verificación

- Antes del reinicio: **63 pruebas automáticas** pasaban (importación, catálogo, flujo offline, conflictos, premios, Hall, amigos, purga), más la **prueba de humo SQL**, la compilación estricta de TypeScript y la compilación de producción con PWA. También se revisó el aspecto en un Chromium real (escritorio, móvil y modo oscuro) y se corrigieron fallos visuales y una carrera en la pantalla de reconocimientos.
- En este zip: la **prueba de humo SQL vuelve a pasar** y el catálogo carga completo en PostgreSQL 16. TypeScript solo se queja de las 18 pantallas que faltan. **Las pruebas automáticas de la app no están en este paquete.**

---

## 6. Lo que falta

### Para recuperar el estado anterior
1. Reescribir las 18 pantallas (acceso, invitación, inicio, lockes, nuevo locke, detalle, importar, alta, edición, ficha, reconocimientos, biblioteca, Hall y su lista, amigos, perfil de amigo, perfil, marcador).
2. Reescribir las 10 suites de pruebas y comprobar con `npm run typecheck`, `npm test` y `npm run build`.

### Nuevo (según el plan)
- **Fase 3:** compartir y descubrir categorías; MVP de combate y de serie en lockes PvP (pantalla de combates); evidencias (texto, imágenes, enlaces).
- **Fase 4:** rankings (global, por generación, juego, especie y categoría), podio animado y ranking de usuarios.
- **Fase 5:** archivos de partida (subida, descarga, versiones, sin sobrescritura), exportación completa del Hall of Fame, pantalla de resolución de conflictos, función de servidor que purga la papelera, bloqueo real del registro sin invitación.
- **Fase 2 (restos):** elegir otro sprite, restaurar una versión anterior (hoy solo se consultan), formatos .pk7/.pk8/.pk9 (hacen falta muestras de archivo).
- **Fase 6:** pulido, accesibilidad, seguridad, rendimiento (el paquete pesa ~600 KB; conviene dividirlo por rutas) y pruebas de aceptación.

---

## 7. Límites y riesgos conocidos

- **Nada se ha probado con un Supabase real ni en Safari/iOS.** Todo se verificó con un servidor simulado y un PostgreSQL local con piezas de Supabase simuladas.
- **Licencias de datos:** los nombres vienen de las tablas de PKHeX (repositorio GPL-3.0) y el catálogo, de PokéAPI. Son datos factuales y para uso entre amigos no hay problema, pero conviene revisar las licencias antes de publicar. Ver `SOURCES.md` cuando se restaure.
- **Sprites:** son propiedad de Nintendo y Game Freak y se enlazan desde un repositorio público (no se copian). Aceptable entre amigos; si se publica, revisar condiciones. Las URLs por defecto no son un CDN: para publicar, alojarlos o usar uno.
- **Los rankings no son a prueba de trampas:** cada usuario se concede sus propios reconocimientos. Se mitiga con reglas del servidor (límites y unicidad) y porque el uso es entre amigos; no se puede eliminar del todo sin moderación.
- **Límites gratuitos de Supabase y Storage:** sin verificar; revisarlos antes de depender de ellos.
- **Formas de los Pokémon:** la regla automática (cambia tipos o estadísticas) deja pasar casos dudosos, como los colores de Minior o los tamaños de Pumpkaboo.
- **Importación .pk6:** los desplazamientos de EV e IV se contrastaron con el checksum y el nombre de un único archivo (sin EV). Compara la previsualización con PKHeX antes de fiarte.
- **Archivos cifrados (.ek6):** se rechazan con un mensaje claro; no se implementó el descifrado.

---

## 8. Puesta en marcha (cuando las pantallas estén restauradas)

1. `npm install`
2. Copia `.env.example` a `.env` con la URL y la clave *anon* de Supabase.
3. Aplica las migraciones (`npx supabase db push`).
4. En Supabase → Authentication, activa correo y Google y añade la URL de la app a las URLs de redirección.
5. `npm run dev` · `npm test` · `npm run build`.
6. Hazte administrador y crea invitaciones:
   ```sql
   update profile set role = 'admin', approved = true where id = '<tu-uuid>';
   insert into invite_code (code) values ('CODIGO-PARA-AMIGOS');
   ```

Mientras falten las pantallas, `npm run build` fallará con errores de módulos `./pages/...` no encontrados.

---

## 9. Qué pasó con el entorno (transparencia)

Durante la conversación la carpeta del proyecto se perdió al reiniciarse el entorno de trabajo, y un comando de empaquetado mío, ejecutado sin comprobar antes que la carpeta existía, **sobrescribió el último zip con un archivo vacío**. No quedaba ninguna copia en disco. El código se está reconstruyendo a partir de la propia conversación; la base de datos y los datos generados ya están restaurados y verificados de nuevo, y falta recuperar las pantallas y las pruebas.
