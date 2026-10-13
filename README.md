<div align="center">

  <img src="docs/screenshots/banner.svg" alt="Simulador de Instalación de Sistemas Operativos Banner" width="100%" />

  # 🖥️ Simulador de Instalación de Sistemas Operativos
  ### Entorno Formativo Interactivo para Linux & Windows Server

  <p align="center">
    <b>Aprende particionado avanzado, dimensionamiento de almacenamiento, firmware UEFI/BIOS, LVM2, cifrado LUKS2 y resiliencia frente a averías de hardware en tiempo real.</b>
  </p>

  <p align="center">
    <a href="#-capturas-del-simulador"><img src="https://img.shields.io/badge/Demo-Capturas%20Visuales-38bdf8?style=for-the-badge&logo=visualstudiocode" alt="Capturas" /></a>
    <a href="#-características-principales"><img src="https://img.shields.io/badge/Tecnologías-React%2019%20%7C%20TS-61dafb?style=for-the-badge&logo=react" alt="React 19" /></a>
    <a href="#-instalación-y-despliegue-rápido"><img src="https://img.shields.io/badge/Build-Vite%208-bd34fe?style=for-the-badge&logo=vite" alt="Vite" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/Licencia-MIT-10b981?style=for-the-badge" alt="Licencia MIT" /></a>
    <img src="https://img.shields.io/badge/Tailwind-CSS%20v4-38bdf8?style=for-the-badge&logo=tailwindcss" alt="Tailwind 4" />
    <img src="https://img.shields.io/badge/Gráficos-Recharts-ec4899?style=for-the-badge" alt="Recharts" />
  </p>

</div>

---

## 📑 Tabla de Contenidos

1. [Acerca del Proyecto](#-acerca-del-proyecto)
2. [Capturas del Simulador](#-capturas-del-simulador)
   - [1. Configuración de Hardware & Inyector de Caos](#1-configuración-de-hardware--inyector-de-caos)
   - [2. Visualizador de Particionado con Recharts](#2-visualizador-de-particionado-con-recharts)
   - [3. Terminal de Instalación y Kernel Logs en Vivo](#3-terminal-de-instalación-y-kernel-logs-en-vivo)
   - [4. Comparativa de Temas (Claro / Oscuro) y Foco Formativo](#4-comparativa-de-temas-claro--oscuro-y-foco-formativo)
3. [Características Principales](#-características-principales)
4. [Estructura del Proyecto](#-estructura-del-proyecto)
5. [Instalación y Despliegue Rápido](#-instalación-y-despliegue-rápido)
6. [Guía para Subir a GitHub](#-guía-para-subir-a-github)
7. [Tecnologías Utilizadas](#-tecnologías-utilizadas)
8. [Créditos y Licencia](#-créditos-y-licencia)

---

## 🎯 Acerca del Proyecto

El **Simulador de Instalación de Sistemas Operativos** es una aplicación web formativa de alto nivel diseñada para estudiantes, administradores de sistemas y profesionales DevOps. 

Permite experimentar sin riesgo de pérdida de datos con los 10 pasos fundamentales en la instalación de servidores y estaciones de trabajo:

```
[1. Boot & Hardware] ➔ [2. Regional] ➔ [3. Perfil SO] ➔ [4. Red] ➔ [5. Particionado]
       ➔ [6. Usuarios] ➔ [7. Bootloader] ➔ [8. Confirmación] ➔ [9. Instalación] ➔ [10. Primer Arranque]
```

Incorpora un **motor de auditoría y validación en tiempo real** que evalúa las decisiones del usuario (puntos de montaje, tamaños, tablas GPT vs MBR, ausencia de swap, compatibilidad con Secure Boot) y explica el *porqué* técnico de cada regla.

---

## 📸 Capturas del Simulador

### 1. Configuración de Hardware & Inyector de Caos
Simula hypervisores (KVM/Proxmox/VMware) o hardware físico bare-metal. Incluye un módulo de **Chaos Engineering** para inducir sectores defectuosos, cortes de red, inestabilidad de memoria RAM (MCE) y estrangulamiento térmico (Thermal Throttling) para comprobar cómo reacciona el instalador y el kernel.

<div align="center">
  <img src="docs/screenshots/01-hardware-chaos.svg" alt="Paso 1: Hardware & Chaos Fault Injector" width="95%" />
</div>

---

### 2. Visualizador de Particionado con Recharts
Permite crear esquemas manuales o automáticos con soporte para **ext4, XFS, Btrfs, ReFS, Linux Swap, volúmenes lógicos LVM2 y cifrado completo de disco LUKS2 (Argon2id)**. Incluye un gráfico de barras apiladas interactivo generado con `recharts` que representa fielmente el porcentaje y la distribución espacial de los bloques de disco.

<div align="center">
  <img src="docs/screenshots/02-partitioning-recharts.svg" alt="Paso 5: Visualizador de Particionado con Recharts" width="95%" />
</div>

---

### 3. Terminal de Instalación y Kernel Logs en Vivo
Observa la ejecución en tiempo real con una consola interactiva que reproduce trazas de `mkfs`, `fdisk`, `cryptsetup`, `debootstrap`, `apt`/`dnf`/`pacman` y mensajes del kernel `dmesg`.

<div align="center">
  <img src="docs/screenshots/03-installation-terminal.svg" alt="Paso 9: Terminal en Vivo y Auditor de Instalación" width="95%" />
</div>

---

### 4. Comparativa de Temas (Claro / Oscuro) y Foco Formativo
La interfaz cuenta con un selector de tema (Modo Claro / Modo Oscuro) persistido en `localStorage` con soporte para preferencias del sistema operativo (`prefers-color-scheme`). Además, el panel lateral desplegable **Foco Formativo** ofrece explicaciones exhaustivas sobre estándares FHS, inodos, POSIX y arquitectura de sistemas de ficheros.

<div align="center">
  <img src="docs/screenshots/04-theme-and-education.svg" alt="Temas y Drawer de Aprendizaje" width="95%" />
</div>

---

## ⚡ Características Principales

- 🐧 **Soporte Multi-Distribución y Multi-SO**:
  - **Debian 12 Bookworm** (Estabilidad y FHS clásico).
  - **Ubuntu 24.04 LTS Noble Numbat** (Cloud, Subiquity y server).
  - **Arch Linux** (Instalación manual tipo *Arch Way*, pacstrap y modular).
  - **Fedora 40** (Innovación con Btrfs por defecto y subvolúmenes).
  - **Alpine Linux** (Ultra-ligero con musl libc y OpenRC).
  - **Windows Server 2025** (ReFS, BitLocker, PowerShell y particiones MSR).

- 📊 **Visualización de Almacenamiento con Recharts**:
  - Gráfico interactivo de barras apiladas horizontal (`Stacked Bar Chart`).
  - Identificación visual de cada punto de montaje (`/boot/efi`, `/`, `/home`, `/var`, `swap`).
  - Cálculo automático de inodos proyectados y mapa de calor de bloques.

- 💥 **Chaos Engineering & Detección de Averías**:
  - Botón *Generar Fallo Aleatorio* para ejercicios didácticos imprevistos.
  - Simulación de sectores defectuosos I/O en bloques LBA críticos.
  - Comprobación de RAM insuficiente (< 2 GB) con avisos de OOM Killer.
  - Alertas automáticas integradas en el contador del validador de cabecera.

- 🔒 **Sistemas de Archivos y Seguridad Empresarial**:
  - Soporte de cifrado **LUKS2** con derivación de claves `Argon2id`.
  - Creación de Grupos de Volúmenes LVM2 y Volúmenes Lógicos redimensionables.
  - Formateo con banderas específicas: `noatime`, `subvol=@root`, `compress=zstd`.

- 📜 **Generador de Automatizaciones DevOps**:
  - Exporta las decisiones a scripts listos para producción:
    - **Ansible Playbook**
    - **Cloud-Init (user-data)**
    - **Debian Preseed**
    - **RHEL / Rocky Kickstart**

- 🌓 **Selector de Tema Dinámico**:
  - Alternador de Modo Claro / Modo Oscuro en la cabecera.
  - Persistencia de preferencia en `localStorage`.
  - Transiciones suaves y contraste optimizado para entornos de aula y desarrollo.

---

## 📂 Estructura del Proyecto

```text
simulador-instalacion-so/
├── .github/
│   └── workflows/
│       └── ci.yml               # Pipeline de integración continua (Build & Lint)
├── docs/
│   └── screenshots/             # Capturas e ilustraciones vectoriales SVG
│       ├── banner.svg
│       ├── 01-hardware-chaos.svg
│       ├── 02-partitioning-recharts.svg
│       ├── 03-installation-terminal.svg
│       └── 04-theme-and-education.svg
├── public/
│   ├── icono.png                # Logotipo oficial "Un Fantasma en el Sistema"
│   ├── icono.svg                # Versión vectorial del logotipo
│   ├── log3.png
│   └── unfantasma-banner.png
├── src/
│   ├── components/
│   │   ├── Header.tsx           # Barra superior con selector de SO, tema y alertas
│   │   ├── GhostLogo.tsx        # Renderizado de marca con proporciones exactas
│   │   ├── HardwareBootStep.tsx # Paso 1: Configuración de hardware y firmware
│   │   ├── HardwareChaosInjector.tsx # Módulo de inyección de fallos aleatorios
│   │   ├── PartitioningStep.tsx # Paso 5: Gestor interactivo de particiones
│   │   ├── PartitionStackedBarChart.tsx # Gráfico de barras apiladas con Recharts
│   │   ├── VisualDiskLayout.tsx # Mapa visual de bloques y disco
│   │   ├── InstallingStep.tsx   # Paso 9: Terminal en vivo y simulación de kernel
│   │   └── EducationalDrawer.tsx# Panel formativo con teoría y buenas prácticas
│   ├── context/
│   │   └── ThemeContext.tsx     # Contexto de React para modo Claro/Oscuro
│   ├── types/
│   │   └── installer.ts         # Definiciones TypeScript de hardware, discos y validaciones
│   ├── utils/
│   │   ├── partitionValidator.ts# Motor de validación de reglas de particionado y hardware
│   │   └── installerTemplates.ts# Plantillas de automatización (Ansible, Cloud-Init, etc.)
│   ├── App.tsx                  # Componente raíz y máquina de estados del asistente
│   ├── main.tsx                 # Entrada de la aplicación React 19
│   └── index.css                # Estilos globales y utilidades de Tailwind CSS v4
├── .env.example                 # Variables de entorno de ejemplo
├── .gitignore                   # Exclusiones de Git (node_modules, dist, etc.)
├── LICENSE                      # Licencia de código abierto MIT
├── package.json                 # Dependencias y scripts de ejecución
├── tsconfig.json                # Configuración de TypeScript
└── vite.config.ts               # Configuración de compilación con Vite
```

---

## 🚀 Instalación y Despliegue Rápido

### Requisitos Previos
- **Node.js**: v20.x o superior
- **npm**: v10.x o superior (o `pnpm` / `bun`)

### Pasos de Instalación

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/unfantasmaenelsistema/simulador-instalacion-so.git
   cd simulador-instalacion-so
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo local**:
   ```bash
   npm run dev
   ```
   Abre tu navegador en `http://localhost:3000`.

4. **Verificar tipos y compilar para producción**:
   ```bash
   npm run lint
   npm run build
   ```

5. **Previsualizar la compilación de producción**:
   ```bash
   npm run preview
   ```

---

## 🐙 Guía para Subir a GitHub

Sigue estos comandos para publicar este proyecto en tu cuenta de GitHub:

1. **Crea un nuevo repositorio en GitHub** (puedes llamarlo `simulador-instalacion-so` o `os-installation-simulator`). No marques la opción de añadir README ni .gitignore, ya que el proyecto ya los incluye.

2. **Inicializar y vincular el repositorio en tu terminal**:
   ```bash
   # Inicializar git si no está inicializado
   git init -b main

   # Añadir todos los archivos al área de preparación
   git add .

   # Crear el commit inicial
   git commit -m "feat: Simulador de Instalación de SO con Recharts, temas y caos de hardware"

   # Vincular tu repositorio remoto de GitHub
   git remote add origin https://github.com/TU-USUARIO/simulador-instalacion-so.git

   # Subir los cambios a la rama principal
   git push -u origin main
   ```

---

## 🛠️ Tecnologías Utilizadas

| Categoría | Tecnología | Versión | Propósito |
| :--- | :--- | :--- | :--- |
| **Framework UI** | [React](https://react.dev/) | `^19.0.1` | Renderizado declarativo con componentes modernos |
| **Lenguaje** | [TypeScript](https://www.typescriptlang.org/) | `^7.0.2` | Tipado estático robusto para arquitecturas complejas |
| **Bundler** | [Vite](https://vitejs.dev/) | `^8.3.0` | Empaquetado ultrarrápido y desarrollo ágil |
| **Estilos** | [Tailwind CSS](https://tailwindcss.com/) | `^4.3.3` | Diseño responsive moderno y paletas dark/light |
| **Gráficos** | [Recharts](https://recharts.org/) | `^3.10.1` | Gráficos de barras apiladas SVG para particionado |
| **Iconografía** | [Lucide React](https://lucide.dev/) | `^0.546.0` | Iconos vectoriales limpios y coherentes |
| **Animaciones** | [Motion](https://motion.dev/) | `^12.23.24` | Transiciones fluidas entre pasos y notificaciones |
| **CI / CD** | GitHub Actions | `v4` | Integración continua con verificación automática |

---

## 👤 Créditos y Licencia

Creado y desarrollado con fines formativos para **Un Fantasma en el Sistema**.

Este proyecto se distribuye bajo la licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para más detalles.

<div align="center">
  <sub>Hecho con pasión por los sistemas operativos y la educación tecnológica.</sub>
</div>
