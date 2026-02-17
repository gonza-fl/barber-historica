# Documento de Visión: BarberHistórica (Nombre Temporal)

## 1. Introducción
Este proyecto nace de la necesidad de cerrar la brecha de comunicación entre el barbero y el cliente. El "olvido" del estilo técnico tras meses de crecimiento capilar genera ineficiencias, pérdida de tiempo (re-descubrimiento del corte) y una experiencia de usuario subóptima.

---

## 2. Objetivo General
**Desarrollar una aplicación web *mobile-first* que actúe como una bitácora técnica y visual, permitiendo a los profesionales de la barbería documentar, consultar y replicar cortes de cabello con precisión quirúrgica, mejorando la retención de clientes y la eficiencia operativa.**

---

## 3. Objetivos Específicos
* **Centralización de Datos:** Eliminar el uso de anotaciones físicas o la confianza en la memoria a corto plazo mediante una base de datos en la nube (Supabase/PostgreSQL).
* **Registro Visual:** Implementar un sistema de carga de imágenes "Antes/Después" para que el cliente valide el resultado visual de sesiones previas.
* **Ficha Técnica Digital:** Estandarizar la carga de parámetros (número de peine, técnica de tijera, ángulos) para reducir el tiempo de consulta a menos de 10 segundos por cliente.
* **Optimización del Tiempo:** Reducir en un 20% el tiempo de "entrevista" inicial con clientes recurrentes.
* **Accesibilidad:** Garantizar que el sistema sea operable desde un smartphone con una sola mano, considerando el entorno de trabajo de una peluquería.

---

## 4. Problema a Resolver
> "El cliente no sabe explicar qué le hicieron, y el barbero no recuerda qué hizo hace tres meses."

* **Asimetría de información:** El cliente tiene una idea vaga; el barbero tiene la habilidad pero le falta el contexto histórico.
* **Crecimiento Capilar:** El cabello crecido oculta las guías del corte anterior (degradados, divisiones).
* **Inconsistencia:** Variaciones en el estilo que pueden generar insatisfacción en el cliente a largo plazo.

---

## 5. Alcance Técnico Sugerido
* **Frontend:** React.js con Vite (SPA enfocada en mobile-first).
* **Backend:** Fastify (API REST simple para gestión de datos).
* **Base de Datos:** Supabase (PostgreSQL gestionado vía Prisma).
* **UI:** Shadcn UI + Tailwind CSS.

---

## 6. Público Objetivo
* **Primario:** Barberos y estilistas independientes que buscan profesionalizar su atención.
* **Secundario:** Dueños de barberías que desean estandarizar la calidad de sus empleados mediante el historial compartido de clientes.
