import { Language, ResearchArticle } from '../types';

export const RESEARCH_ARTICLES_ES: ResearchArticle[] = [
  {
    id: "macro-vs-technical-reality",
    title: "Por qué el Análisis Macroeconómico Supera a los Gráficos Técnicos en los Mercados Financieros",
    category: "Macro vs. Técnico",
    date: "Destacado del Mes",
    readTime: "Lectura de 6 min",
    featured: true,
    summary: "Una deconstrucción exhaustiva de cómo los flujos de capital institucional y la divergencia monetaria impulsan la liquidez global, y por qué el análisis técnico minorista falla de forma aislada.",
    contentSections: [
      {
        heading: "Prólogo: La Gran Ilusión del Análisis Gráfico Minorista",
        paragraphs: [
          "En el trading minorista tradicional se promueve un mito: que dibujar líneas de soporte, patrones armónicos o cruces de medias móviles revela el futuro del mercado.",
          "La cruda realidad es que las gráficas de precios son simplemente un sismógrafo pasivo de la actividad pasada. Un gráfico no genera demanda ni oferta institucional por sí mismo; solo registra el impacto de órdenes ejecutadas por los grandes participantes."
        ],
        callout: "LA VERDAD FUNDAMENTAL: Tu operación no falló porque trazaste mal una línea. Falló porque las líneas e indicadores carecen de fuerza mecánica sobre los mercados financieros."
      },
      {
        heading: "01. La Trampa de la Coincidencia: Por qué el Análisis Técnico Puro Falla a Largo Plazo",
        paragraphs: [
          "Si dependes al 100% del análisis técnico (AT), puedes ganar tres, cinco o diez operaciones consecutivas. Pero eso no constituye una ventaja estadística persistente: es varianza a corto plazo.",
          "Operar basándose únicamente en AT para preservar capital es como conducir por una autopista oscura mirando solo el espejo retrovisor. Ves por dónde has pasado, pero careces de visibilidad sobre si estás a punto de caer por un acantilado de liquidez.",
          "Cuando un gráfico parece 'respetar' tu soporte, suele ser una ilusión en periodos de baja liquidez. El precio rebotó porque en ese momento el flujo institucional estaba inactivo. En cuanto entra el verdadero capital institucional, la geometría técnica minorista se desvanece."
        ]
      },
      {
        heading: "02. ¿Qué Mueve Realmente los Mercados? (Macroeconomía Práctica)",
        paragraphs: [
          "La macroeconomía práctica es la historia viva de hacia dónde migran los billones institucionales y por qué.",
          "Los fondos soberanos multimillonarios, los hedge funds y los creadores de mercado bancarios nunca asignan capital porque un oscilador cruzó en un gráfico de 15 minutos. Rebalancean sus carteras según realidades estructurales:"
        ],
        gridItems: [
          {
            title: "Tasas de Interés (El Precio del Dinero)",
            desc: "Las tasas representan el costo de pedir prestado capital. Cuando un banco central endurece su política, el capital busca rendimiento y seguridad en su mercado de bonos soberanos. Con liquidez abundante, el capital fluye hacia activos de riesgo y cruces de carry."
          },
          {
            title: "Expectativas de Inflación y Rendimientos Reales",
            desc: "Rendimiento real = Rendimiento del bono nominal menos expectativas de inflación. Las divisas con diferenciales de rendimiento real en expansión se aprecian de manera sostenida frente a contrapartes de bajo rendimiento."
          },
          {
            title: "Mercado Laboral y Actividad Económica",
            desc: "Las tasas de desempleo y las nóminas de empleo dictan las directrices futuras de las autoridades monetarias. Datos laborales sólidos retrasan los recortes de tasas, revalorizando las curvas swap al instante."
          },
          {
            title: "Comercio Internacional y Geopolítica",
            desc: "Aranceles, sanciones soberanas, balanzas comerciales y dependencias energéticas configuran los términos de intercambio fundamentales que ningún indicador técnico puede revertir."
          }
        ]
      },
      {
        heading: "03. Marco Operativo: Mapa de Ruta frente a Sensor de Aparcamiento",
        paragraphs: [
          "¿Significa esto que el análisis técnico es inútil? No. Pero su función debe estar estrictamente delimitada:",
          "La macroeconomía y la política de los bancos centrales dictan el MOTOR y el MAPA DE RUTA: establecen QUÉ activo operar, en QUÉ dirección fluye el capital institucional y POR QUÉ.",
          "El análisis técnico actúa únicamente como el SENSOR DE APARCAMIENTO: brindando puntos de entrada tácticos, evaluación del diferencial y parametrización precisa del riesgo."
        ],
        callout: "Regla Operativa: Nunca permitas que el sensor de aparcamiento anule el mapa de navegación. Cuando el contexto macroeconómico está alineado, los gráficos dejan de parecer ruido aleatorio."
      }
    ]
  },
  {
    id: "g10-rate-path-divergence",
    title: "Divergencia en el G10: Comparativa de Rutas de Tasas entre el BCE y la Reserva Federal",
    category: "Política de Bancos Centrales",
    date: "Hace 2 días",
    readTime: "Lectura de 8 min",
    featured: false,
    summary: "Los diferenciales de rendimiento entre los bonos alemanes a 2 años y los bonos del Tesoro de EE.UU. revelan asimetrías crecientes en las primas de plazo ante la moderación del sector servicios europeo."
  },
  {
    id: "yen-carry-mechanics",
    title: "Mecánica del Carry Trade del Yen y Reversión de la Liquidez Global",
    category: "Dinámica de Rendimiento y Carry",
    date: "Hace 2 semanas",
    readTime: "Lectura de 11 min",
    featured: false,
    summary: "Deconstrucción de cómo las monedas de financiación a tasa cero impulsan la especulación en pares del G10 y por qué picos súbitos de volatilidad fuerzan desapalancamientos acelerados."
  }
];

export interface Translations {
  nav: {
    console: string;
    research: string;
    academy: string;
    tools: string;
    langButton: string;
    langCode: string;
    themeLight: string;
    themeDark: string;
  };
  ticker: {
    status: string;
  };
  console: {
    badge: string;
    titleLine1: string;
    titleLine2: string;
    subtitle: string;
    launchCalendar: string;
    allTools: string;
    quoteTitle: string;
    quoteBold: string;
    quoteDesc: string;
    toolsTitleBadge: string;
    toolsTitle: string;
    toolsSubtitle: string;
    featuredResearchBadge: string;
    featuredResearchTitle: string;
    featuredResearchSubtitle: string;
    openDossier: string;
    consultationBadge: string;
    consultationTitle: string;
    consultationSubtitle: string;
    fieldEntity: string;
    fieldEmail: string;
    fieldSector: string;
    fieldDetails: string;
    btnSubmit: string;
    btnSubmitted: string;
  };
  research: {
    badge: string;
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    categories: {
      all: string;
      macroFx: string;
      centralBanks: string;
      crossAsset: string;
      sovereignDebt: string;
    };
    featuredBadge: string;
    featuredTitle: string;
    featuredSubtitle: string;
    openComplete: string;
    archiveBadge: string;
    archiveTitle: string;
    categoryLabel: string;
    readDossier: string;
    noResults: string;
    clearFilters: string;
  };
  academy: {
    badge: string;
    title: string;
    description: string;
  };
  tools: {
    badge: string;
    title: string;
    subtitle: string;
    subTabs: {
      all: string;
      quantDesk: string;
      calendarFilter: string;
      currencyStrength: string;
      volatility: string;
      calculator: string;
      centralBanks: string;
      consensus: string;
    };
    hubCard1Title: string;
    hubCard1Desc: string;
    hubCard1Btn: string;
    hubCard2Title: string;
    hubCard2Desc: string;
    hubCard2Btn: string;
    hubCard3Title: string;
    hubCard3Desc: string;
    hubCard3Btn: string;
    hubCard4Title: string;
    hubCard4Desc: string;
    hubCard4Btn: string;
    hubCard5Title: string;
    hubCard5Desc: string;
    hubCard5Btn: string;
    hubCard6Title: string;
    hubCard6Desc: string;
    hubCard6Btn: string;
  };
  footer: {
    brandDesc: string;
    navTitle: string;
    telemetryTitle: string;
    protocol: string;
    dataStatus: string;
    latency: string;
    copyright: string;
  };
}

export const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    nav: {
      console: 'Console',
      research: 'Research',
      academy: 'Academy',
      tools: 'Trading Tools',
      langButton: '🇪🇸 Español',
      langCode: 'ES',
      themeLight: 'Light Mode',
      themeDark: 'Dark Mode',
    },
    ticker: {
      status: 'REAL-TIME VALUATION PIPELINE',
    },
    console: {
      badge: 'Kairos Macro Terminal',
      titleLine1: 'Macroeconomic',
      titleLine2: 'Analysis Platform',
      subtitle: 'Professional macroeconomic analysis, real-time event risk filtering, and currency valuation models built for disciplined market participants.',
      launchCalendar: 'Launch Calendar Tool →',
      allTools: 'All Trading Tools',
      quoteTitle: '"Chart setups don\'t fail because you drew lines wrong—they fail because ',
      quoteBold: "lines don't move financial markets.",
      quoteDesc: 'We focus on economic fundamentals, central bank policies, and capital flows. Sustainable edge comes from understanding what actually drives global markets, not drawing lines on past prices.',
      toolsTitleBadge: 'Proprietary Models',
      toolsTitle: 'Trading Tools',
      toolsSubtitle: 'Quantitative risk models, calendar filters, and currency valuation tools.',
      featuredResearchBadge: 'Institutional Intelligence',
      featuredResearchTitle: 'Flagship Research Publication',
      featuredResearchSubtitle: 'In-depth macroeconomic analysis deconstructing the structural realities behind global capital movements.',
      openDossier: 'Open Complete Research Dossier →',
      consultationBadge: 'Institutional Inquiry',
      consultationTitle: 'Macro Consultation Request',
      consultationSubtitle: 'Request institutional access or custom macroeconomic advisory.',
      fieldEntity: 'Institution / Entity Name',
      fieldEmail: 'Institutional Email',
      fieldSector: 'Primary Focus Sector',
      fieldDetails: 'Inquiry Scope / Mandate Requirements',
      btnSubmit: 'Submit Request →',
      btnSubmitted: '✓ Request Transmitted',
    },
    research: {
      badge: 'Macroeconomic Analysis & Publications',
      title: 'Research Feed',
      subtitle: 'Institutional analysis focusing on monetary policy vectors, cross-border capital flows, and macroeconomic divergence.',
      searchPlaceholder: 'Search macro dossiers...',
      categories: {
        all: 'All',
        macroFx: 'Macro & FX',
        centralBanks: 'Central Banks',
        crossAsset: 'Cross-Asset',
        sovereignDebt: 'Sovereign Debt',
      },
      featuredBadge: 'Featured Research',
      featuredTitle: 'Flagship Dossier of the Month',
      featuredSubtitle: 'In-depth structural breakdown contrasting discretionary technical models with institutional monetary mechanics.',
      openComplete: 'Open Complete Research Dossier',
      archiveBadge: 'Research Directory',
      archiveTitle: 'Macro Dossiers Archive',
      categoryLabel: 'Category:',
      readDossier: 'Read Dossier',
      noResults: 'No dossiers match current query',
      clearFilters: 'Clear all filters',
    },
    academy: {
      badge: 'Under Development',
      title: 'Kairos Academy',
      description: 'This section is currently under development. Content and educational resources will be available soon.',
    },
    tools: {
      badge: 'Quantitative Macro Suite',
      title: 'Trading Tools Terminal',
      subtitle: 'Institutional macroeconomic models, currency valuation ranking engines, and mathematical risk management frameworks.',
      subTabs: {
        all: 'Suite Hub',
        quantDesk: 'Quant Desk',
        calendarFilter: 'Calendar Filtering Tool',
        currencyStrength: 'Currency Strength Engine',
        volatility: 'Volatility Matrix',
        calculator: 'Risk Calculator',
        centralBanks: 'Central Banks',
        consensus: 'Consensus Engine',
      },
      hubCard1Title: 'Kairos Macro Hub (Unified Engine)',
      hubCard1Desc: 'Economic event calendar with Excel import (.xlsx), Tier-1 rules for G10 currencies, intermarket scoring, and live divergence scanner.',
      hubCard1Btn: 'Open Calendar Engine',
      hubCard2Title: 'Currency Strength Engine',
      hubCard2Desc: '28-pair fundamental valuation index with live indicator overrides, net score matrix, and directional bias distribution.',
      hubCard2Btn: 'Open Valuation Index',
      hubCard3Title: 'Volatility & Pip Value Matrix',
      hubCard3Desc: 'Realized daily variance metrics across 28 currency pairs, dollar cash value per standard lot, and volatility tiers.',
      hubCard3Btn: 'Open Volatility Matrix',
      hubCard4Title: 'Risk & Sizing Calculator',
      hubCard4Desc: 'Mathematical position sizing engine factoring account base currency, stop distance, and capital risk limits.',
      hubCard4Btn: 'Open Risk Calculator',
      hubCard5Title: 'G10 Central Bank Terminal',
      hubCard5Desc: 'Track implied interest rate swap curves, meeting decisions, step projections, and automated policy tone.',
      hubCard5Btn: 'Open Central Bank Terminal',
      hubCard6Title: 'Consensus & Reaction Engine',
      hubCard6Desc: 'Interactive expectation filters, consensus forecast bands, and post-release outcome evaluation.',
      hubCard6Btn: 'Open Consensus Engine',
    },
    footer: {
      brandDesc: 'An independent institutional research terminal engineered to process macroeconomic cycles, inter-market yield alignments, and cross-border structural trend asymmetries.',
      navTitle: '// Portal Core Navigation',
      telemetryTitle: '// System Telemetry',
      protocol: 'HTTPS / EDGE ENCRYPTED',
      dataStatus: 'ONLINE / ACTIVE STREAM',
      latency: '24ms (GLOBAL EDGE)',
      copyright: 'Kairos Macro Terminal. All rights reserved.',
    }
  },
  es: {
    nav: {
      console: 'Consola',
      research: 'Análisis',
      academy: 'Academia',
      tools: 'Herramientas',
      langButton: '🇺🇸 English',
      langCode: 'EN',
      themeLight: 'Modo Claro',
      themeDark: 'Modo Oscuro',
    },
    ticker: {
      status: 'FLUJO DE VALORACIÓN EN TIEMPO REAL',
    },
    console: {
      badge: 'Terminal Macroeconómica Kairos',
      titleLine1: 'Plataforma de Análisis',
      titleLine2: 'Macroeconómico',
      subtitle: 'Análisis macroeconómico institucional, filtrado de riesgo de eventos en tiempo real y modelos de valoración de divisas para participantes disciplinados.',
      launchCalendar: 'Iniciar Herramienta de Calendario →',
      allTools: 'Todas las Herramientas',
      quoteTitle: '"Las operaciones no fallan porque dibujaste mal las líneas, fallan porque ',
      quoteBold: 'las líneas no mueven los mercados financieros.',
      quoteDesc: 'Nos enfocamos en fundamentos económicos, políticas de bancos centrales y flujos de capital. La ventaja sostenible proviene de comprender qué impulsa realmente los mercados globales, no de trazar líneas sobre precios pasados.',
      toolsTitleBadge: 'Modelos Propios',
      toolsTitle: 'Herramientas de Trading',
      toolsSubtitle: 'Modelos cuantitativos de riesgo, filtros de calendario y herramientas de valoración de divisas.',
      featuredResearchBadge: 'Inteligencia Institucional',
      featuredResearchTitle: 'Publicación Insignia del Mes',
      featuredResearchSubtitle: 'Análisis macroeconómico en profundidad que desglosa las realidades estructurales detrás de los movimientos globales de capital.',
      openDossier: 'Abrir Dossier de Investigación Completo →',
      consultationBadge: 'Consulta Institucional',
      consultationTitle: 'Solicitud de Asesoría Macroeconómica',
      consultationSubtitle: 'Solicita acceso institucional o asesoramiento macroeconómico personalizado.',
      fieldEntity: 'Institución / Nombre de la Entidad',
      fieldEmail: 'Correo Electrónico Institucional',
      fieldSector: 'Sector de Enfoque Principal',
      fieldDetails: 'Alcance de la Consulta / Requisitos del Mandato',
      btnSubmit: 'Enviar Solicitud →',
      btnSubmitted: '✓ Solicitud Transmitida',
    },
    research: {
      badge: 'Análisis Macroeconómico y Publicaciones',
      title: 'Feed de Investigación',
      subtitle: 'Análisis institucional enfocado en vectores de política monetaria, flujos de capital transfronterizos y divergencia macroeconómica.',
      searchPlaceholder: 'Buscar dossiers macroeconómicos...',
      categories: {
        all: 'Todas',
        macroFx: 'Macro y Divisas',
        centralBanks: 'Bancos Centrales',
        crossAsset: 'Cross-Asset',
        sovereignDebt: 'Deuda Soberana',
      },
      featuredBadge: 'Investigación Destacada',
      featuredTitle: 'Dossier Insignia del Mes',
      featuredSubtitle: 'Desglose estructural profundo que contrasta los modelos técnicos discrecionales con la mecánica monetaria institucional.',
      openComplete: 'Abrir Dossier de Investigación Completo',
      archiveBadge: 'Directorio de Investigación',
      archiveTitle: 'Archivo de Dossiers Macroeconómicos',
      categoryLabel: 'Categoría:',
      readDossier: 'Leer Dossier',
      noResults: 'Ningún dossier coincide con la búsqueda actual',
      clearFilters: 'Limpiar todos los filtros',
    },
    academy: {
      badge: 'Bajo Desarrollo',
      title: 'Academia Kairos',
      description: 'Esta sección se encuentra actualmente en desarrollo. El contenido y los recursos educativos estarán disponibles próximamente.',
    },
    tools: {
      badge: 'Suite Cuantitativa Macro',
      title: 'Terminal de Herramientas de Trading',
      subtitle: 'Modelos macroeconómicos institucionales, motores de clasificación de valoración de divisas y marcos matemáticos de gestión de riesgo.',
      subTabs: {
        all: 'Centro de Herramientas',
        quantDesk: 'Mesa Cuantitativa',
        calendarFilter: 'Filtro de Calendario',
        currencyStrength: 'Fuerza de Divisas',
        volatility: 'Matriz de Volatilidad',
        calculator: 'Calculadora de Riesgo',
        centralBanks: 'Bancos Centrales',
        consensus: 'Motor de Consenso',
      },
      hubCard1Title: 'Kairos Macro Hub (Motor Unificado)',
      hubCard1Desc: 'Calendario económico inteligente con importación Excel (.xlsx), reglas Core para divisas G10, puntuación intermercado y escáner de divergencias en vivo.',
      hubCard1Btn: 'Abrir Motor de Calendario',
      hubCard2Title: 'Motor de Fuerza de Divisas',
      hubCard2Desc: 'Índice de valoración fundamental de 28 pares con edición de indicadores en vivo, matriz de puntuación neta y distribución de sesgo direccional.',
      hubCard2Btn: 'Abrir Índice de Valoración',
      hubCard3Title: 'Matriz de Volatilidad y Valor de Pip',
      hubCard3Desc: 'Métricas de varianza diaria realizada en 28 pares de divisas, valor en efectivo en dólares por lote estándar y niveles de volatilidad.',
      hubCard3Btn: 'Abrir Matriz de Volatilidad',
      hubCard4Title: 'Calculadora de Riesgo y Tamaño de Posición',
      hubCard4Desc: 'Motor matemático de dimensionamiento de posición considerando divisa base de la cuenta, distancia de stop loss y límites de riesgo de capital.',
      hubCard4Btn: 'Abrir Calculadora de Riesgo',
      hubCard5Title: 'Terminal de Bancos Centrales G10',
      hubCard5Desc: 'Seguimiento de curvas swap de tasas implícitas, decisiones de reuniones, proyecciones de pasos y tono de política monetaria automatizado.',
      hubCard5Btn: 'Abrir Terminal de Bancos Centrales',
      hubCard6Title: 'Motor de Consenso y Reacción',
      hubCard6Desc: 'Filtros interactivos de expectativas, bandas de pronóstico de consenso y evaluación de resultados post-publicación.',
      hubCard6Btn: 'Abrir Motor de Consenso',
    },
    footer: {
      brandDesc: 'Una terminal de investigación institucional independiente diseñada para procesar ciclos macroeconómicos, alineaciones de rendimiento entre mercados y asimetrías de tendencias estructurales transfronterizas.',
      navTitle: '// Navegación Principal',
      telemetryTitle: '// Telemetría del Sistema',
      protocol: 'HTTPS / CIFRADO EN EL EDGE',
      dataStatus: 'EN LÍNEA / FLUJO ACTIVO',
      latency: '24ms (EDGE GLOBAL)',
      copyright: 'Terminal Macroeconómica Kairos. Todos los derechos reservados.',
    }
  }
};
