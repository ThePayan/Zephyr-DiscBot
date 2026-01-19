# Zephyr - Advanced Discord Voice AI Bot

Zephyr es un bot de Discord de última generación que combina la funcionalidad clásica de moderación y utilidades con una potente integración de Inteligencia Artificial para interacciones de voz en tiempo real.

## 🚀 Características Principales

### 🧠 Inteligencia Artificial de Voz (Nueva Generación)
*   **Conversación Fluida**: Habla con el bot como si fuera una persona en el canal de voz.
*   **Reconocimiento de voz (Whisper)**: Utiliza el modelo Whisper de OpenAI para transcribir tu voz con precisión casi perfecta.
*   **Cerebro GPT-4o**: Respuestas inteligentes, contextuales y rápidas potenciadas por el modelo más avanzado de OpenAI.
*   **Síntesis de Voz (TTS)**: El bot te responde con una voz natural y expresiva.
*   **Detección de Silencio**: Sistema inteligente que sabe cuándo has dejado de hablar para responderte automáticamente.

### 🧠 Modos de Inteligencia Artificial
*   **Modo Traductor en Vivo**: Convierte al bot en un intérprete personal. Traduce automáticamente entre dos idiomas (bidireccional).
*   **Modo Conversación**: Charla libremente con la IA (GPT-3.5/4o). El bot te escucha y responde por voz.
*   **Modo Silencioso (Default)**: El bot se une al canal y escucha, pero no interviene hasta que le des una orden.

### 🛠️ Funcionalidades Clásicas
*   **Sistema Híbrido**: Mantiene compatibilidad con tus comandos `z!` de siempre.
*   **Comandos Slash (/)**: Soporte moderno para comandos de barra.
*   **Ping**: Herramienta de latencia para verificar el estado de la red.

## 📋 Requisitos Previos

*   Node.js v16.9.0 o superior (Recomendado v18+).
*   FFmpeg instalado en el sistema (o usando el binario estático incluido).
*   Una cuenta de desarrollador en Discord.
*   Una API Key de OpenAI.

## ⚙️ Instalación

1.  **Clonar el repositorio** o descargar los archivos.
2.  **Instalar dependencias**:
    ```bash
    npm install
    ```
3.  **Configurar Variables de Entorno**:
    Crea un archivo `.env` en la raíz con:
    ```env
    TOKEN=tu_token_de_discord
    APPLICATION_ID=id_de_tu_aplicacion
    GUILD_ID=id_de_tu_servidor_de_pruebas
    OPENAI_API_KEY=tu_clave_de_openai
    ```

## 🚀 Uso

### Iniciar el Bot
```bash
node index.js
```

### Comandos de Voz
*   **`/join`**: El bot entra al canal de voz en **Modo Silencioso**.
*   **`/chat`**: Activa el **Modo Conversación**. Habla y el bot te responderá.
*   **`/translate`**: Activa el **Modo Traductor**.
    *   Uso: `/translate target:[Idioma] source:[Idioma]`
    *   Ejemplo: `/translate target:English source:Spanish`. Todo lo que digas en español se traducirá al inglés, y viceversa.
*   **`/help`**: Muestra una lista de todos los comandos disponibles.

### Utilidades
*   **`z!ping`**: Muestra la latencia del bot.

## 🏗️ Arquitectura del Proyecto

Este proyecto sigue una arquitectura modular y limpia en `src/`:

*   **`src/services/`**: Lógica de negocio pura (OpenAI, Grabación de Audio).
*   **`src/handlers/`**: Manejo de eventos y orquestación (Coordinación Voz <-> IA).
*   **`src/config/`**: Gestión centralizada de configuración.
*   **`src/utils/`**: Herramientas auxiliares (Logger con colores).
*   **`commands/`**: Comandos Slash modulares.

---
 Desarrollado con ❤️ usando Discord.js y OpenAI.
