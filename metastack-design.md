# MetaStack - MTG Metagame Breakdown

Dashboard web para seguimiento del metagame de Magic: The Gathering, con datos de torneos reales, de Standard, Pioneer, Modern, Pauper y Pre-Modern.

## Información

La información de los torneos se obtendrá de https://mtgtop8.com/ y utilizará las imágenes del API de https://scryfall.com/ al mostrar los decks.

El dashboard deberá mostrar la siguiente información:

### Barra superior

Una pequeña barra superior que contendrá el logo/nombre de la aplicación web (se llamará "MetaStack" y como subtítulo "MTG Metagame Breakdown") y los filtros, en forma de pills, de los formatos: 

- Standard (default)
- Pioneer
- Modern
- Pauper
- Pre-Modern

### Barra lateral izquierda

Deberá tener una barra lateral izquierda, que ocupará aproximadamente un 25% de la pantalla (si tienes una mejor sugerencia, adelante). En esta barra se encontrarán los siguientes filtros: 

- Fecha
    - 5 días
    - 2 semanas
    - 2 meses

- Tamaño de eventos
    - Todos los eventos
    - Eventos grandes (2 meses)
    - MTGO (2 meses)

- Evento (al seleccionar un evento, se mostrarán los decks correspondientes al evento en la venta principal)
    - Todos los eventos
    - Listado de los eventos individuales

- Arquetipo
    - Listado de los arquetipos correspondientes (al elegir un arquetipo, se mostrarán todos los decks correspondientes en la ventana principal)

### Ventana principal

Oupando el resto de la pantalla, estará la ventana principal, se mostrará el análisis del metagame, por default mostrará el resultado de todos los eventos de Standard de los últimos 5 días, con la siguiente información:

- Header
    - Nombre del formato en grande
    - Número de eventos analizados / Nombre del evento
    - Rango de fechas / Fecha del evento

- Listado de arquetipos (tarjetas)
    - Imagen representativa
    - Nombre del arquetipo
    - Porcentaje (%) del metagame con indicador de cambio (verde si subió, amarillo si se mantuvo igual, rojo si bajó, con símbolo hacia arriba o abajo respectivamente o un guión si no hubo cambio)
    - Clasificación Tier automática (T1 ≥10%, T2 5-9.9%, T3 1-4.9%, Otro <1%)

- Trending cards semana a semana (tabla con el top 10 de cartas, sin imagenes)
    - Nombre de la carta
    - % Actual
    - % Anterior
    - % de cambio (verde si subió, amarillo si se mantuvo igual, rojo si bajó, con símbolo hacia arriba o abajo respectivamente o un guión si no hubo cambio)

Al hacer clic en una de las tarjetas de arquetipos, se mostrarán ahi mismo (como tarjetas), el listado de los últimos decks. Al hacer clic sobre uno de estos decks, se mostrará en un pop-up el deck, con el nombre del torneo, la posición y el jugador, y un botón para exportar a MTG Arena, después el main deck con las cartas individuales y un número indicando la cantidad de cada carta y de igual forma el sideboard, haciendo diferencia clara entre ambos.

En la lista de trending cards, me gustaría que se mostrara la imagen de la carta al hacer hover con el mouse, o al tocar con el dedo el nombre si se está viendo en móvil.

## Diseño

Me gustaría un diseño dark-mode y moderno, similar a los dashboards de fintech, y acentos con efecto neón, pero adecuados para Magic: The Gathering.
