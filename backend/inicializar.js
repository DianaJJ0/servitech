/**
 *  SCRIPT DE INICIALIZACIÓN Y SIEMBRA DE DATOS - SERVITECH
 *  Crea datos esenciales para el funcionamiento inicial de la aplicación.
 *  Ejecutar con: node backend/inicializar.js
 */
const mongoose = require("mongoose");
require("dotenv").config({ path: __dirname + "/.env" });

const conectarDB = require("./config/database.js");
const Usuario = require("./models/usuario.model.js");
const Categoria = require("./models/categoria.model.js");

const categoriasPredeterminadas = [
  {
    nombre: "Transformación Digital",
    descripcion: "Procesos de cambio y digitalización empresarial.",
    especialidades: [
      {
        nombre: "Diagnóstico de madurez digital",
        habilidades: [
          { nombre: "Liderazgo de cambio" },
          { nombre: "Gestión de proyectos de transformación" },
          { nombre: "Comunicación efectiva" },
          { nombre: "Análisis de procesos" },
          { nombre: "Evaluación de tecnologías emergentes" },
          { nombre: "Capacidad de adaptación" },
          { nombre: "Negociación estratégica" },
        ],
      },
      {
        nombre: "Rediseño de procesos orientados a digitalización",
        habilidades: [
          { nombre: "Liderazgo de cambio" },
          { nombre: "Gestión de proyectos de transformación" },
          { nombre: "Comunicación efectiva" },
          { nombre: "Análisis de procesos" },
          { nombre: "Evaluación de tecnologías emergentes" },
          { nombre: "Capacidad de adaptación" },
          { nombre: "Negociación estratégica" },
        ],
      },
      {
        nombre: "Cambio organizacional y adopción tecnológica",
        habilidades: [
          { nombre: "Liderazgo de cambio" },
          { nombre: "Gestión de proyectos de transformación" },
          { nombre: "Comunicación efectiva" },
          { nombre: "Análisis de procesos" },
          { nombre: "Evaluación de tecnologías emergentes" },
          { nombre: "Capacidad de adaptación" },
          { nombre: "Negociación estratégica" },
        ],
      },
      {
        nombre: "Innovación de modelos de negocio",
        habilidades: [
          { nombre: "Liderazgo de cambio" },
          { nombre: "Gestión de proyectos de transformación" },
          { nombre: "Comunicación efectiva" },
          { nombre: "Análisis de procesos" },
          { nombre: "Evaluación de tecnologías emergentes" },
          { nombre: "Capacidad de adaptación" },
          { nombre: "Negociación estratégica" },
        ],
      },
      {
        nombre: "Gestión del cambio cultural",
        habilidades: [
          { nombre: "Liderazgo de cambio" },
          { nombre: "Gestión de proyectos de transformación" },
          { nombre: "Comunicación efectiva" },
          { nombre: "Análisis de procesos" },
          { nombre: "Evaluación de tecnologías emergentes" },
          { nombre: "Capacidad de adaptación" },
          { nombre: "Negociación estratégica" },
        ],
      },
      {
        nombre: "Digitalización de canales de atención",
        habilidades: [
          { nombre: "Liderazgo de cambio" },
          { nombre: "Gestión de proyectos de transformación" },
          { nombre: "Comunicación efectiva" },
          { nombre: "Análisis de procesos" },
          { nombre: "Evaluación de tecnologías emergentes" },
          { nombre: "Capacidad de adaptación" },
          { nombre: "Negociación estratégica" },
        ],
      },
    ],
  },
  {
    nombre: "Desarrollo de Software",
    descripcion: "Creación y mantenimiento de aplicaciones tecnológicas.",
    especialidades: [
      {
        nombre: "Desarrollo web",
        habilidades: [
          { nombre: "Programación en varios lenguajes (Python, Java, etc.)" },
          { nombre: "Gestión de versiones (Git)" },
          { nombre: "Metodologías ágiles" },
          { nombre: "Resolución de problemas" },
          { nombre: "Diseño de arquitecturas" },
          { nombre: "Trabajo en equipo multidisciplinar" },
          { nombre: "Documentación técnica clara" },
        ],
      },
      {
        nombre: "Desarrollo móvil",
        habilidades: [
          { nombre: "Programación en varios lenguajes (Python, Java, etc.)" },
          { nombre: "Gestión de versiones (Git)" },
          { nombre: "Metodologías ágiles" },
          { nombre: "Resolución de problemas" },
          { nombre: "Diseño de arquitecturas" },
          { nombre: "Trabajo en equipo multidisciplinar" },
          { nombre: "Documentación técnica clara" },
        ],
      },
      {
        nombre: "Integración de sistemas",
        habilidades: [
          { nombre: "Programación en varios lenguajes (Python, Java, etc.)" },
          { nombre: "Gestión de versiones (Git)" },
          { nombre: "Metodologías ágiles" },
          { nombre: "Resolución de problemas" },
          { nombre: "Diseño de arquitecturas" },
          { nombre: "Trabajo en equipo multidisciplinar" },
          { nombre: "Documentación técnica clara" },
        ],
      },
      {
        nombre: "Automatización",
        habilidades: [
          { nombre: "Programación en varios lenguajes (Python, Java, etc.)" },
          { nombre: "Gestión de versiones (Git)" },
          { nombre: "Metodologías ágiles" },
          { nombre: "Resolución de problemas" },
          { nombre: "Diseño de arquitecturas" },
          { nombre: "Trabajo en equipo multidisciplinar" },
          { nombre: "Documentación técnica clara" },
        ],
      },
      {
        nombre: "Testing y aseguramiento de calidad",
        habilidades: [
          { nombre: "Programación en varios lenguajes (Python, Java, etc.)" },
          { nombre: "Gestión de versiones (Git)" },
          { nombre: "Metodologías ágiles" },
          { nombre: "Resolución de problemas" },
          { nombre: "Diseño de arquitecturas" },
          { nombre: "Trabajo en equipo multidisciplinar" },
          { nombre: "Documentación técnica clara" },
        ],
      },
      {
        nombre: "DevOps",
        habilidades: [
          { nombre: "Programación en varios lenguajes (Python, Java, etc.)" },
          { nombre: "Gestión de versiones (Git)" },
          { nombre: "Metodologías ágiles" },
          { nombre: "Resolución de problemas" },
          { nombre: "Diseño de arquitecturas" },
          { nombre: "Trabajo en equipo multidisciplinar" },
          { nombre: "Documentación técnica clara" },
        ],
      },
    ],
  },
  {
    nombre: "Ciberseguridad",
    descripcion: "Protección de sistemas, redes y datos.",
    especialidades: [
      {
        nombre: "Auditoría de seguridad",
        habilidades: [
          { nombre: "Análisis de riesgos" },
          { nombre: "Detección de vulnerabilidades" },
          { nombre: "Gestión de incidentes" },
          { nombre: "Conocimiento normativo (GDPR, ISO/IEC 27001)" },
          { nombre: "Comunicación técnica a usuarios" },
          { nombre: "Pensamiento crítico" },
          { nombre: "Atención al detalle" },
        ],
      },
      {
        nombre: "Implantación de políticas de protección",
        habilidades: [
          { nombre: "Análisis de riesgos" },
          { nombre: "Detección de vulnerabilidades" },
          { nombre: "Gestión de incidentes" },
          { nombre: "Conocimiento normativo (GDPR, ISO/IEC 27001)" },
          { nombre: "Comunicación técnica a usuarios" },
          { nombre: "Pensamiento crítico" },
          { nombre: "Atención al detalle" },
        ],
      },
      {
        nombre: "Respuesta a incidentes",
        habilidades: [
          { nombre: "Análisis de riesgos" },
          { nombre: "Detección de vulnerabilidades" },
          { nombre: "Gestión de incidentes" },
          { nombre: "Conocimiento normativo (GDPR, ISO/IEC 27001)" },
          { nombre: "Comunicación técnica a usuarios" },
          { nombre: "Pensamiento crítico" },
          { nombre: "Atención al detalle" },
        ],
      },
      {
        nombre: "Formación en buenas prácticas",
        habilidades: [
          { nombre: "Análisis de riesgos" },
          { nombre: "Detección de vulnerabilidades" },
          { nombre: "Gestión de incidentes" },
          { nombre: "Conocimiento normativo (GDPR, ISO/IEC 27001)" },
          { nombre: "Comunicación técnica a usuarios" },
          { nombre: "Pensamiento crítico" },
          { nombre: "Atención al detalle" },
        ],
      },
      {
        nombre: "Criptografía aplicada",
        habilidades: [
          { nombre: "Análisis de riesgos" },
          { nombre: "Detección de vulnerabilidades" },
          { nombre: "Gestión de incidentes" },
          { nombre: "Conocimiento normativo (GDPR, ISO/IEC 27001)" },
          { nombre: "Comunicación técnica a usuarios" },
          { nombre: "Pensamiento crítico" },
          { nombre: "Atención al detalle" },
        ],
      },
      {
        nombre: "Gestión de identidades y accesos",
        habilidades: [
          { nombre: "Análisis de riesgos" },
          { nombre: "Detección de vulnerabilidades" },
          { nombre: "Gestión de incidentes" },
          { nombre: "Conocimiento normativo (GDPR, ISO/IEC 27001)" },
          { nombre: "Comunicación técnica a usuarios" },
          { nombre: "Pensamiento crítico" },
          { nombre: "Atención al detalle" },
        ],
      },
    ],
  },
  {
    nombre: "Cloud Computing",
    descripcion: "Servicios y arquitecturas en la nube.",
    especialidades: [
      {
        nombre: "Migración a la nube",
        habilidades: [
          { nombre: "Implementación y administración cloud (Azure, AWS, GCP)" },
          { nombre: "Automatización de infraestructuras" },
          { nombre: "Backup y recuperación de datos" },
          { nombre: "Cost optimization" },
          { nombre: "Resolución de incidencias de servicio" },
          { nombre: "Escalabilidad y disponibilidad" },
          { nombre: "Configuración de redes virtuales" },
        ],
      },
      {
        nombre: "Gestión multi-cloud",
        habilidades: [
          { nombre: "Implementación y administración cloud (Azure, AWS, GCP)" },
          { nombre: "Automatización de infraestructuras" },
          { nombre: "Backup y recuperación de datos" },
          { nombre: "Cost optimization" },
          { nombre: "Resolución de incidencias de servicio" },
          { nombre: "Escalabilidad y disponibilidad" },
          { nombre: "Configuración de redes virtuales" },
        ],
      },
      {
        nombre: "Optimización de recursos cloud",
        habilidades: [
          { nombre: "Implementación y administración cloud (Azure, AWS, GCP)" },
          { nombre: "Automatización de infraestructuras" },
          { nombre: "Backup y recuperación de datos" },
          { nombre: "Cost optimization" },
          { nombre: "Resolución de incidencias de servicio" },
          { nombre: "Escalabilidad y disponibilidad" },
          { nombre: "Configuración de redes virtuales" },
        ],
      },
      {
        nombre: "Seguridad en la nube",
        habilidades: [
          { nombre: "Implementación y administración cloud (Azure, AWS, GCP)" },
          { nombre: "Automatización de infraestructuras" },
          { nombre: "Backup y recuperación de datos" },
          { nombre: "Cost optimization" },
          { nombre: "Resolución de incidencias de servicio" },
          { nombre: "Escalabilidad y disponibilidad" },
          { nombre: "Configuración de redes virtuales" },
        ],
      },
      {
        nombre: "DevOps en entornos cloud",
        habilidades: [
          { nombre: "Implementación y administración cloud (Azure, AWS, GCP)" },
          { nombre: "Automatización de infraestructuras" },
          { nombre: "Backup y recuperación de datos" },
          { nombre: "Cost optimization" },
          { nombre: "Resolución de incidencias de servicio" },
          { nombre: "Escalabilidad y disponibilidad" },
          { nombre: "Configuración de redes virtuales" },
        ],
      },
      {
        nombre: "Contenedores y orquestación (Docker, Kubernetes)",
        habilidades: [
          { nombre: "Implementación y administración cloud (Azure, AWS, GCP)" },
          { nombre: "Automatización de infraestructuras" },
          { nombre: "Backup y recuperación de datos" },
          { nombre: "Cost optimization" },
          { nombre: "Resolución de incidencias de servicio" },
          { nombre: "Escalabilidad y disponibilidad" },
          { nombre: "Configuración de redes virtuales" },
        ],
      },
    ],
  },
  {
    nombre: "Big Data y Analítica",
    descripcion: "Procesamiento y análisis de grandes volúmenes de datos.",
    especialidades: [
      {
        nombre: "Procesamiento de grandes volúmenes de datos",
        habilidades: [
          { nombre: "Análisis estadístico" },
          { nombre: "Manejo de herramientas como Power BI, Tableau" },
          { nombre: "Uso de lenguajes como SQL, R y Python" },
          { nombre: "Interpretación de datos" },
          { nombre: "Comunicación de resultados a negocio" },
          { nombre: "Modelado predictivo" },
          { nombre: "Gestión de calidad de datos" },
        ],
      },
      {
        nombre: "Generación de reportes y dashboards",
        habilidades: [
          { nombre: "Análisis estadístico" },
          { nombre: "Manejo de herramientas como Power BI, Tableau" },
          { nombre: "Uso de lenguajes como SQL, R y Python" },
          { nombre: "Interpretación de datos" },
          { nombre: "Comunicación de resultados a negocio" },
          { nombre: "Modelado predictivo" },
          { nombre: "Gestión de calidad de datos" },
        ],
      },
      {
        nombre: "Machine Learning aplicado",
        habilidades: [
          { nombre: "Análisis estadístico" },
          { nombre: "Manejo de herramientas como Power BI, Tableau" },
          { nombre: "Uso de lenguajes como SQL, R y Python" },
          { nombre: "Interpretación de datos" },
          { nombre: "Comunicación de resultados a negocio" },
          { nombre: "Modelado predictivo" },
          { nombre: "Gestión de calidad de datos" },
        ],
      },
      {
        nombre: "Business Intelligence",
        habilidades: [
          { nombre: "Análisis estadístico" },
          { nombre: "Manejo de herramientas como Power BI, Tableau" },
          { nombre: "Uso de lenguajes como SQL, R y Python" },
          { nombre: "Interpretación de datos" },
          { nombre: "Comunicación de resultados a negocio" },
          { nombre: "Modelado predictivo" },
          { nombre: "Gestión de calidad de datos" },
        ],
      },
      {
        nombre: "Gestión de bases de datos NoSQL",
        habilidades: [
          { nombre: "Análisis estadístico" },
          { nombre: "Manejo de herramientas como Power BI, Tableau" },
          { nombre: "Uso de lenguajes como SQL, R y Python" },
          { nombre: "Interpretación de datos" },
          { nombre: "Comunicación de resultados a negocio" },
          { nombre: "Modelado predictivo" },
          { nombre: "Gestión de calidad de datos" },
        ],
      },
      {
        nombre: "Visualización avanzada de datos",
        habilidades: [
          { nombre: "Análisis estadístico" },
          { nombre: "Manejo de herramientas como Power BI, Tableau" },
          { nombre: "Uso de lenguajes como SQL, R y Python" },
          { nombre: "Interpretación de datos" },
          { nombre: "Comunicación de resultados a negocio" },
          { nombre: "Modelado predictivo" },
          { nombre: "Gestión de calidad de datos" },
        ],
      },
    ],
  },
  {
    nombre: "IoT (Internet de las Cosas)",
    descripcion: "Soluciones y dispositivos conectados en tiempo real.",
    especialidades: [
      {
        nombre: "Diseño de soluciones IoT",
        habilidades: [
          { nombre: "Protocolos de comunicación (MQTT, CoAP)" },
          { nombre: "Programación de microcontroladores" },
          { nombre: "Análisis de flujos de datos en tiempo real" },
          { nombre: "Solución de problemas de conectividad" },
          { nombre: "Aseguramiento de la interoperabilidad" },
          { nombre: "Configuración remota de dispositivos" },
        ],
      },
      {
        nombre: "Integración de dispositivos conectados",
        habilidades: [
          { nombre: "Protocolos de comunicación (MQTT, CoAP)" },
          { nombre: "Programación de microcontroladores" },
          { nombre: "Análisis de flujos de datos en tiempo real" },
          { nombre: "Solución de problemas de conectividad" },
          { nombre: "Aseguramiento de la interoperabilidad" },
          { nombre: "Configuración remota de dispositivos" },
        ],
      },
      {
        nombre: "Procesamiento de datos en tiempo real",
        habilidades: [
          { nombre: "Protocolos de comunicación (MQTT, CoAP)" },
          { nombre: "Programación de microcontroladores" },
          { nombre: "Análisis de flujos de datos en tiempo real" },
          { nombre: "Solución de problemas de conectividad" },
          { nombre: "Aseguramiento de la interoperabilidad" },
          { nombre: "Configuración remota de dispositivos" },
        ],
      },
      {
        nombre: "Automatización de entornos inteligentes",
        habilidades: [
          { nombre: "Protocolos de comunicación (MQTT, CoAP)" },
          { nombre: "Programación de microcontroladores" },
          { nombre: "Análisis de flujos de datos en tiempo real" },
          { nombre: "Solución de problemas de conectividad" },
          { nombre: "Aseguramiento de la interoperabilidad" },
          { nombre: "Configuración remota de dispositivos" },
        ],
      },
      {
        nombre: "Seguridad en IoT",
        habilidades: [
          { nombre: "Protocolos de comunicación (MQTT, CoAP)" },
          { nombre: "Programación de microcontroladores" },
          { nombre: "Análisis de flujos de datos en tiempo real" },
          { nombre: "Solución de problemas de conectividad" },
          { nombre: "Aseguramiento de la interoperabilidad" },
          { nombre: "Configuración remota de dispositivos" },
        ],
      },
    ],
  },
  {
    nombre: "Robótica y Automatización Industrial",
    descripcion: "Integración y programación de robots industriales.",
    especialidades: [
      {
        nombre: "Integración de robots industriales",
        habilidades: [
          { nombre: "Programación de robots (KUKA, ABB, FANUC)" },
          { nombre: "Simulación de procesos industriales" },
          { nombre: "Diagnóstico de fallas" },
          { nombre: "Optimización de procesos productivos" },
          { nombre: "Toma de decisiones en tiempo real" },
        ],
      },
      {
        nombre: "Automatización de líneas de producción",
        habilidades: [
          { nombre: "Programación de robots (KUKA, ABB, FANUC)" },
          { nombre: "Simulación de procesos industriales" },
          { nombre: "Diagnóstico de fallas" },
          { nombre: "Optimización de procesos productivos" },
          { nombre: "Toma de decisiones en tiempo real" },
        ],
      },
      {
        nombre: "Mantenimiento predictivo",
        habilidades: [
          { nombre: "Programación de robots (KUKA, ABB, FANUC)" },
          { nombre: "Simulación de procesos industriales" },
          { nombre: "Diagnóstico de fallas" },
          { nombre: "Optimización de procesos productivos" },
          { nombre: "Toma de decisiones en tiempo real" },
        ],
      },
      {
        nombre: "Programación de PLC",
        habilidades: [
          { nombre: "Programación de robots (KUKA, ABB, FANUC)" },
          { nombre: "Simulación de procesos industriales" },
          { nombre: "Diagnóstico de fallas" },
          { nombre: "Optimización de procesos productivos" },
          { nombre: "Toma de decisiones en tiempo real" },
        ],
      },
      {
        nombre: "Visión artificial",
        habilidades: [
          { nombre: "Programación de robots (KUKA, ABB, FANUC)" },
          { nombre: "Simulación de procesos industriales" },
          { nombre: "Diagnóstico de fallas" },
          { nombre: "Optimización de procesos productivos" },
          { nombre: "Toma de decisiones en tiempo real" },
        ],
      },
    ],
  },
  {
    nombre: "Realidad Virtual y Aumentada",
    descripcion: "Desarrollo de experiencias inmersivas y simulaciones.",
    especialidades: [
      {
        nombre: "Desarrollo de aplicaciones VR/AR",
        habilidades: [
          { nombre: "Modelado y renderizado 3D" },
          { nombre: "Programación en motores gráficos (Unity, Unreal)" },
          { nombre: "UX/UI inmersivo" },
          { nombre: "Gestión de proyectos creativos" },
          { nombre: "Optimización de experiencias en tiempo real" },
        ],
      },
      {
        nombre: "Simulaciones educativas y de entrenamiento",
        habilidades: [
          { nombre: "Modelado y renderizado 3D" },
          { nombre: "Programación en motores gráficos (Unity, Unreal)" },
          { nombre: "UX/UI inmersivo" },
          { nombre: "Gestión de proyectos creativos" },
          { nombre: "Optimización de experiencias en tiempo real" },
        ],
      },
      {
        nombre: "Integración de hardware inmersivo",
        habilidades: [
          { nombre: "Modelado y renderizado 3D" },
          { nombre: "Programación en motores gráficos (Unity, Unreal)" },
          { nombre: "UX/UI inmersivo" },
          { nombre: "Gestión de proyectos creativos" },
          { nombre: "Optimización de experiencias en tiempo real" },
        ],
      },
      {
        nombre: "Experiencias interactivas para industria y marketing",
        habilidades: [
          { nombre: "Modelado y renderizado 3D" },
          { nombre: "Programación en motores gráficos (Unity, Unreal)" },
          { nombre: "UX/UI inmersivo" },
          { nombre: "Gestión de proyectos creativos" },
          { nombre: "Optimización de experiencias en tiempo real" },
        ],
      },
    ],
  },
  {
    nombre: "Marketing Digital y E-commerce",
    descripcion: "Gestión de campañas digitales y comercio electrónico.",
    especialidades: [
      {
        nombre: "Planificación de campañas digitales",
        habilidades: [
          {
            nombre:
              "Gestión de plataformas publicitarias (Google Ads, Facebook)",
          },
          { nombre: "Copywriting creativo" },
          { nombre: "Manejo de CMS (WordPress, Shopify)" },
          { nombre: "Análisis de métricas y conversiones" },
          { nombre: "Diseño de embudos de ventas" },
        ],
      },
      {
        nombre: "SEO y posicionamiento web",
        habilidades: [
          {
            nombre:
              "Gestión de plataformas publicitarias (Google Ads, Facebook)",
          },
          { nombre: "Copywriting creativo" },
          { nombre: "Manejo de CMS (WordPress, Shopify)" },
          { nombre: "Análisis de métricas y conversiones" },
          { nombre: "Diseño de embudos de ventas" },
        ],
      },
      {
        nombre: "Analítica de conversión",
        habilidades: [
          {
            nombre:
              "Gestión de plataformas publicitarias (Google Ads, Facebook)",
          },
          { nombre: "Copywriting creativo" },
          { nombre: "Manejo de CMS (WordPress, Shopify)" },
          { nombre: "Análisis de métricas y conversiones" },
          { nombre: "Diseño de embudos de ventas" },
        ],
      },
      {
        nombre: "Gestión de tiendas online",
        habilidades: [
          {
            nombre:
              "Gestión de plataformas publicitarias (Google Ads, Facebook)",
          },
          { nombre: "Copywriting creativo" },
          { nombre: "Manejo de CMS (WordPress, Shopify)" },
          { nombre: "Análisis de métricas y conversiones" },
          { nombre: "Diseño de embudos de ventas" },
        ],
      },
      {
        nombre: "Publicidad en redes sociales",
        habilidades: [
          {
            nombre:
              "Gestión de plataformas publicitarias (Google Ads, Facebook)",
          },
          { nombre: "Copywriting creativo" },
          { nombre: "Manejo de CMS (WordPress, Shopify)" },
          { nombre: "Análisis de métricas y conversiones" },
          { nombre: "Diseño de embudos de ventas" },
        ],
      },
    ],
  },
  {
    nombre: "Soporte Técnico y Gestión de Infraestructura",
    descripcion:
      "Administración y soporte de redes, servidores y usuarios finales.",
    especialidades: [
      {
        nombre: "Administración de redes",
        habilidades: [
          { nombre: "Diagnóstico y solución de problemas" },
          { nombre: "Atención al cliente" },
          { nombre: "Gestión de tickets de soporte" },
          { nombre: "Configuración de hardware y software" },
          { nombre: "Mantenimiento preventivo" },
        ],
      },
      {
        nombre: "Soporte a usuarios finales",
        habilidades: [
          { nombre: "Diagnóstico y solución de problemas" },
          { nombre: "Atención al cliente" },
          { nombre: "Gestión de tickets de soporte" },
          { nombre: "Configuración de hardware y software" },
          { nombre: "Mantenimiento preventivo" },
        ],
      },
      {
        nombre: "Gestión de servidores y almacenamiento",
        habilidades: [
          { nombre: "Diagnóstico y solución de problemas" },
          { nombre: "Atención al cliente" },
          { nombre: "Gestión de tickets de soporte" },
          { nombre: "Configuración de hardware y software" },
          { nombre: "Mantenimiento preventivo" },
        ],
      },
      {
        nombre: "Implementación de políticas de backup",
        habilidades: [
          { nombre: "Diagnóstico y solución de problemas" },
          { nombre: "Atención al cliente" },
          { nombre: "Gestión de tickets de soporte" },
          { nombre: "Configuración de hardware y software" },
          { nombre: "Mantenimiento preventivo" },
        ],
      },
      {
        nombre: "Seguridad de la infraestructura",
        habilidades: [
          { nombre: "Diagnóstico y solución de problemas" },
          { nombre: "Atención al cliente" },
          { nombre: "Gestión de tickets de soporte" },
          { nombre: "Configuración de hardware y software" },
          { nombre: "Mantenimiento preventivo" },
        ],
      },
    ],
  },
];

const usuariosPrueba = [
  {
    nombre: "Admin",
    apellido: "ServiTech",
    email: "admin@servitech.com",
    password: "adminpassword123",
    roles: ["admin", "cliente"],
  },
  {
    nombre: "Experto",
    apellido: "Prueba",
    email: "experto@servitech.com",
    password: "expertopassword123",
    roles: ["experto", "cliente"],
  },
  {
    nombre: "Cliente",
    apellido: "Prueba",
    email: "cliente@servitech.com",
    password: "clientepassword123",
    roles: ["cliente"],
  },
];

const inicializar = async () => {
  try {
    await conectarDB();
    console.log("Base de datos conectada. Iniciando siembra de datos...");

    // Limpiar colecciones para un estado limpio
    await Categoria.deleteMany({});
    await Usuario.deleteMany({});
    console.log("Colecciones limpiadas.");

    // 1. Crear Categorías (con especialidades y habilidades anidadas)
    const categoriasCreadas = await Categoria.insertMany(
      categoriasPredeterminadas
    );
    console.log(`${categoriasCreadas.length} categorías creadas.`);

    // 2. Crear Usuarios (usando .save() para activar hooks y virtuals)
    for (const userData of usuariosPrueba) {
      const usuario = new Usuario(userData);
      await usuario.save();
    }
    console.log(`${usuariosPrueba.length} usuarios de prueba creados.`);

    // 3. Actualizar usuario experto con su información
    const usuarioExperto = await Usuario.findOne({
      email: "experto@servitech.com",
    });
    if (usuarioExperto) {
      usuarioExperto.infoExperto = {
        especialidad: "Desarrollo de Software",
        descripcion:
          "Más de 10 años creando aplicaciones web robustas y escalables.",
        precioPorHora: 75000,
        categorias: [
          categoriasCreadas.find((c) => c.nombre === "Transformación Digital")
            ._id,
          categoriasCreadas.find((c) => c.nombre === "Desarrollo de Software")
            ._id,
        ],
        skills: [
          "Programación en varios lenguajes (Python, Java, etc.)",
          "Gestión de versiones (Git)",
          "Metodologías ágiles",
        ],
        horario: {
          diasDisponibles: ["lunes", "miércoles", "viernes"],
          horaInicio: "09:00",
          horaFin: "17:00",
        },
      };
      await usuarioExperto.save();
      console.log("Usuario experto actualizado con su perfil.");
    }

    console.log("\nSiembra de datos completada exitosamente.");
    console.log("--- Credenciales de Prueba ---");
    console.log("Admin: admin@servitech.com / adminpassword123");
    console.log("Experto: experto@servitech.com / expertopassword123");
    console.log("Cliente: cliente@servitech.com / clientepassword123");
  } catch (error) {
    console.error("\nError durante la inicialización:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("\nConexión a la base de datos cerrada.");
  }
};

// Ejecutar la función de inicialización si el script es llamado directamente
if (require.main === module) {
  inicializar();
}

// No es necesario exportar nada si este archivo solo se usa como un script.
module.exports = { inicializar };
