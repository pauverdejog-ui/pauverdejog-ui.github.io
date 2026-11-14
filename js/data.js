/* =====================================================================
   CONTENIDO DE LA WEB · edita solo este archivo
   Niveles (1–5): 1 Básico · 2 Elemental · 3 Intermedio · 4 Avanzado · 5 Experto
   ===================================================================== */

window.SITE = {

  githubUser: "pauverdejog-ui",
  /* Repositorio donde están la web y la carpeta proyectos/ */
  repo: "pauverdejog-ui.github.io",

  perfil: {
    nombre: "Pau Verdejo Gallardo",
    ubicacion: "Barcelona, España",
    email: "pau.verdejo@outlook.es",
    linkedin: "https://www.linkedin.com/in/pau-verdejo-gallardo-61225a3a6",
    cvPdf: "assets/cv/CV_Pau_Verdejo.pdf",
    cvPdfEn: "assets/cv/CV_Pau_Verdejo_EN.pdf",
    cvPdfCa: "assets/cv/CV_Pau_Verdejo_CA.pdf"
  },

  /* Imagen de fondo de la cabecera: "Cosmic Cliffs" (nebulosa de Carina), telescopio James Webb.
     Se usa la primera que cargue. Si guardas tu propia imagen como assets/fondo.jpg, tendrá prioridad. */
  fondo: {
    candidatos: [
      "assets/fondo.jpg",
      "https://cdn.esawebb.org/archives/images/publicationjpg/weic2205a.jpg",
      "https://cdn.esawebb.org/archives/images/screen/weic2205a.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/NASA%E2%80%99s_Webb_Reveals_Cosmic_Cliffs,_Glittering_Landscape_of_Star_Birth.jpg/1920px-NASA%E2%80%99s_Webb_Reveals_Cosmic_Cliffs,_Glittering_Landscape_of_Star_Birth.jpg"
    ],
    credito: "Imagen: NASA, ESA, CSA y STScI · Telescopio James Webb"
  },

  /* logo: ruta local o URL. Si no carga, se muestran las iniciales. */
  formacion: [
    {
      titulo: "Grado en Estadística Aplicada",
      centro: "Universitat Autònoma de Barcelona",
      periodo: "2023 – 2027",
      logo: "https://upload.wikimedia.org/wikipedia/commons/7/71/Autonome_Universit%C3%A4t_Barcelona_Logo.svg",
      iniciales: "UAB",
      url: "https://www.uab.cat/web/estudiar/listado-de-grados/informacion-general/estadistica-aplicada-1216708258897.html?param1=1264404714557"
    },
    {
      titulo: "Grado en Física",
      centro: "UNED",
      periodo: "2025 – actualidad",
      logo: "https://upload.wikimedia.org/wikipedia/commons/2/25/LogoUNED.jpg",
      iniciales: "UNED",
      url: "https://www.uned.es/universidad/inicio/en/estudios/grados/grado-en-fisica.html?idContenido=1"
    },
    {
      titulo: "Erasmus+",
      centro: "Linköping University · Suecia",
      periodo: "2026",
      logo: "assets/logos/liu.png",
      iniciales: "LiU",
      url: "https://liu.se/en",
      cursos: [
        ["TSBB19", "Machine Learning for Computer Vision", "https://studieinfo.liu.se/en/kurs/TSBB19"],
        ["TSKS15", "Detection and Estimation of Signals", "https://studieinfo.liu.se/en/kurs/TSKS15"],
        ["TSKS33", "Complex Networks and Big Data", "https://studieinfo.liu.se/en/kurs/TSKS33"],
        ["TAMS17", "Statistical Theory, Advanced Course", "https://studieinfo.liu.se/en/kurs/TAMS17"]
      ]
    },
    {
      titulo: "Bachillerato Internacional",
      centro: "Àgora Sant Cugat International School",
      periodo: "2020 – 2022",
      logo: "https://www.micole.net/imagenes/colegio/logo/21834/agora-sant-cugat-international-school_128.png",
      iniciales: "IB",
      url: "https://sant-cugat.agorainternationalschool.es/"
    },
    {
      titulo: "Cambridge C1 Advanced",
      centro: "Certificado oficial de inglés",
      periodo: "2026",
      logo: "https://www.cambridgeenglish.org/Images/english-logo.svg",
      iniciales: "C1",
      url: "https://www.cambridgeenglish.org/exams-and-tests/qualifications/advanced/"
    }
  ],

  experiencia: [
    {
      puesto: "Organizador",
      lugar: "Liga Matemática de Barcelona",
      periodo: "2026 – actualidad",
      detalle: "Organización y dinamización de la Liga Matemática en Barcelona."
    },
    {
      puesto: "Profesor particular",
      lugar: "Barcelona",
      periodo: "2022 – 2025",
      detalle: "Clases de matemáticas y física para estudiantes de bachillerato."
    },
    {
      puesto: "Voluntariado (CAS)",
      lugar: "Barcelona",
      periodo: "2019 – 2022",
      detalle:
        "Preparación de actividades para personas con discapacidad en el Centro de Alto " +
        "Rendimiento (CAR) y recogida de alimentos en El Gran Recapte d'Aliments."
    }
  ],

  /* ------------------------------------------------------------------
     PROYECTOS · cada uno está en proyectos/<carpeta>/ dentro del repositorio,
     con su código, su informe y una figura (figura = archivo dentro de la carpeta).
     ------------------------------------------------------------------ */
  proyectos: [
    {
      titulo: "Detección del bosón de Higgs con redes de grafos",
      contexto: "UAB · Aprendizaje Automático II",
      anio: "2026",
      equipo: "Individual",
      resumen:
        "Clasificación de colisiones protón–protón (señal de Higgs frente a fondo) sobre un " +
        "millón de eventos del dataset HIGGS. Cada evento se representa como un grafo de seis " +
        "partículas y se clasifica con una GNN basada en EdgeConv, comparada con un perceptrón " +
        "multicapa y situada frente al resultado publicado de XGBoost en datos tabulares.",
      metricas: [
        ["0.857", "AUC-ROC de la GNN en test"],
        ["+6.9", "puntos de AUC frente al MLP"],
        ["+42 %", "de significancia estadística máxima"]
      ],
      stack: ["Python", "PyTorch", "PyTorch Geometric", "scikit-learn", "Matplotlib"],
      grafico: {
        tipo: "puntos", titulo: "AUC-ROC en test (más es mejor)", dominio: [0.76, 0.9], decimales: 3,
        filas: [
          { e: "MLP", v: 0.788 },
          { e: "XGBoost · referencia publicada", v: 0.830, ref: true },
          { e: "GNN · EdgeConv", v: 0.857, top: true }
        ],
        nota: "Referencia de XGBoost con el mismo tamaño de muestra (1 M de eventos)."
      },
      figura: "figura.png",
      pie: "Curvas ROC en test: la GNN (naranja) supera al MLP (azul) en todo el rango.",
      carpeta: "higgs-gnn", informe: "informe.pdf"
    },
    {
      titulo: "Predicción de victoria en League of Legends con redes bayesianas",
      contexto: "UAB · Modelización de Datos Complejos",
      anio: "2026",
      equipo: "Con Pol Ortiz",
      resumen:
        "Clasificadores bayesianos que estiman la probabilidad de victoria a partir del estado " +
        "de la partida en el minuto 10 (9.131 partidas de rango alto). Se comparan Naive Bayes y " +
        "Augmented Naive Bayes con estructura aprendida por Hill-Climbing y selección de variables " +
        "por Markov blanket, con validación cruzada de 10 folds y tests pareados con corrección de Holm.",
      metricas: [
        ["0.189", "Brier score, el modelo mejor calibrado"],
        ["0.794", "AUC-ROC en validación cruzada"],
        ["10", "variables tras la selección por Markov blanket"]
      ],
      stack: ["R", "bnlearn", "gRain", "ggplot2", "pROC"],
      grafico: {
        tipo: "puntos", titulo: "Brier score en validación cruzada (menos es mejor)", dominio: [0.18, 0.23], decimales: 3,
        filas: [
          { e: "Naive Bayes · todas las variables", v: 0.2251 },
          { e: "Naive Bayes · Markov blanket", v: 0.2028 },
          { e: "ANB · todas las variables", v: 0.1985 },
          { e: "ANB · Markov blanket", v: 0.1886, top: true }
        ],
        nota: "Único modelo significativamente mejor que todos los demás (p < 0.001 con corrección de Holm)."
      },
      figura: "figura.png",
      pie: "Probabilidad de victoria que estima el modelo final en cuatro situaciones de partida.",
      carpeta: "lol-bayesian-network", informe: "informe.pdf"
    },
    {
      titulo: "Clasificación de imágenes con redes convolucionales",
      contexto: "Linköping University · TSBB19",
      anio: "2026",
      equipo: "Equipo de 5",
      resumen:
        "Estudio controlado de decisiones de diseño en una CNN (GoalNet) sobre CIFAR-10: " +
        "hiperparámetros, inicialización, normalización (BatchNorm, GroupNorm, LayerNorm), " +
        "ensembles, data augmentation y mixup, y linear probing en CIFAR-10 e ImageNet64.",
      metricas: [
        ["84.9 %", "de precisión con un ensemble de 3 redes"],
        ["+4.5", "puntos sobre la media individual"],
        ["+3.1", "puntos con augmentation y mixup"]
      ],
      stack: ["Python", "PyTorch", "torchvision"],
      grafico: {
        tipo: "pesas", titulo: "Precisión en test: media de las redes → ensemble de 3", dominio: [79, 86], decimales: 1, unidad: " %",
        leyenda: ["red individual", "ensemble"],
        filas: [
          { e: "Sin normalización", a: 80.42, b: 84.87, top: true },
          { e: "BatchNorm", a: 81.38, b: 84.53 },
          { e: "GroupNorm", a: 80.94, b: 84.56 },
          { e: "LayerNorm", a: 80.49, b: 84.06 }
        ],
        nota: "El ensemble sin normalización gana más porque sus redes cometen errores más distintos."
      },
      figura: "figura.jpg",
      pie: "Imagen de entrada y mapas de activación de la primera capa convolucional.",
      carpeta: "cnn-image-classification", informe: "report.pdf"
    },
    {
      titulo: "Detección de exoplanetas con datos del telescopio Kepler",
      contexto: "UAB · Aprendizaje Automático",
      anio: "2025",
      equipo: "Equipo de 3",
      resumen:
        "Clasificación de 7.015 señales del telescopio Kepler de la NASA en exoplanetas " +
        "confirmados o falsos positivos. Se comparan k-NN, SVM (kernel lineal y RBF) y Random " +
        "Forest con búsqueda de hiperparámetros, validación cruzada de 10 folds y tests pareados; " +
        "la importancia de variables del modelo final coincide con los criterios astrofísicos de la NASA.",
      metricas: [
        ["0.999", "AUC-ROC del Random Forest final"],
        ["98.7 %", "de precisión en test"],
        ["7.015", "señales de Kepler clasificadas"]
      ],
      stack: ["Python", "scikit-learn", "pandas", "SciPy", "Seaborn"],
      grafico: {
        tipo: "puntos", titulo: "AUC-ROC en test (más es mejor)", dominio: [0.99, 1], decimales: 3,
        filas: [
          { e: "k-NN · k = 7", v: 0.9943 },
          { e: "SVM · kernel RBF", v: 0.9971 },
          { e: "Random Forest", v: 0.9987, top: true }
        ],
        nota: "Las diferencias de precisión no son significativas (tests pareados, p > 0.05); se elige Random Forest por interpretabilidad."
      },
      figura: "figura.png",
      pie: "Importancia de variables del Random Forest: dominan los indicadores de falso positivo y el radio planetario.",
      carpeta: "kepler-exoplanet-classification", informe: "informe.pdf"
    },
    {
      titulo: "Evolución de un contraste radiológico con modelos lineales mixtos",
      contexto: "UAB · Modelos Lineales II",
      anio: "2025",
      equipo: "Equipo de 4",
      resumen:
        "Análisis longitudinal de la intensidad de píxel en imágenes de diez perros tras inyectar " +
        "un agente de contraste. Modelo lineal mixto con intercepto aleatorio por perro y tendencia " +
        "cuadrática en el tiempo, seleccionado con AIC y tests de razón de verosimilitudes, y " +
        "diagnóstico completo: normalidad, homocedasticidad, autocorrelación AR(1) y distancia de Cook.",
      metricas: [
        ["≈ 10 días", "hasta la máxima intensidad del contraste"],
        ["0.73", "R² condicional del modelo mixto"],
        ["0.71", "correlación intraclase entre perros"]
      ],
      stack: ["R", "lme4", "nlme", "MuMIn", "ggplot2"],
      grafico: {
        tipo: "barras", titulo: "Variabilidad de la intensidad explicada (R²)", dominio: [0, 1], decimales: 2,
        filas: [
          { e: "Solo efectos fijos · R² marginal", v: 0.0802 },
          { e: "Con efecto aleatorio por perro · R² condicional", v: 0.7337, top: true }
        ],
        nota: "AIC: 977.7 con regresión simple frente a 888.2 con el modelo mixto."
      },
      figura: "figura.jpg",
      pie: "Intensidad por perro y costado a lo largo del tiempo: la variabilidad entre perros justifica el modelo mixto.",
      carpeta: "pixel-mixed-models", informe: "informe.pdf"
    }
  ],

  /* ------------------------------------------------------------------
     HABILIDADES · áreas (se despliegan al hacer clic)
     ------------------------------------------------------------------ */
  areas: [
    {
      nombre: "Aprendizaje automático",
      resumen: "Modelos supervisados, validación y métricas.",
      detalle:
        "Construcción, ajuste y evaluación de modelos de clasificación y regresión. Diseño de " +
        "esquemas de validación sin fuga de información, búsqueda de hiperparámetros y elección " +
        "de la métrica según el problema: discriminación, calibración o coste de los errores.",
      metodos: ["Regresión logística", "Ridge / Lasso / Elastic Net", "k-NN", "SVM (kernel RBF)", "Árboles de decisión",
                "Random Forest", "Gradient boosting (XGBoost)", "Importancia de variables",
                "Validación cruzada estratificada", "AUC-ROC", "MCC", "Brier score", "F1"]
    },
    {
      nombre: "Deep learning",
      resumen: "MLP, redes convolucionales y redes de grafos.",
      detalle:
        "Diseño y entrenamiento de redes neuronales en PyTorch, desde perceptrones multicapa " +
        "hasta CNN para visión por computador y GNN con paso de mensajes para datos relacionales. " +
        "Estudio controlado del efecto de cada decisión de diseño sobre el entrenamiento y la generalización.",
      metodos: ["MLP", "CNN", "GNN · EdgeConv", "Message passing", "Inicialización Kaiming / Xavier",
                "BatchNorm · GroupNorm · LayerNorm", "Adam / AdamW", "Dropout y weight decay",
                "Early stopping", "Data augmentation", "Mixup", "Ensembles", "Linear probing"]
    },
    {
      nombre: "Aprendizaje no supervisado",
      resumen: "Reducción de dimensionalidad y clustering.",
      detalle:
        "Capacidad para trabajar con distintos modelos de reducción de dimensionalidad y métodos " +
        "de agrupación, eligiendo el adecuado según la estructura de los datos y validando " +
        "la calidad de la solución obtenida.",
      metodos: ["PCA", "Análisis factorial", "MDS", "t-SNE", "k-means", "k-medoids",
                "Clustering jerárquico", "DBSCAN", "Mezclas gaussianas (EM)", "Índice de silueta"]
    },
    {
      nombre: "Modelos probabilísticos y bayesianos",
      resumen: "Redes bayesianas e inferencia bayesiana.",
      detalle:
        "Construcción de redes bayesianas combinando conocimiento del dominio y aprendizaje de " +
        "estructura a partir de datos, selección de variables e inferencia exacta. Inferencia " +
        "bayesiana para estimar parámetros y cuantificar la incertidumbre.",
      metodos: ["Naive Bayes", "Augmented Naive Bayes", "Hill-Climbing", "Markov blanket",
                "Junction tree", "BIC", "Distribuciones a priori y a posteriori", "MCMC"]
    },
    {
      nombre: "Inferencia estadística",
      resumen: "Estimación, contrastes y comparación rigurosa de modelos.",
      detalle:
        "Teoría de la estimación y del contraste de hipótesis, y su aplicación práctica para " +
        "comparar modelos con rigor, controlando el error al hacer comparaciones múltiples.",
      metodos: ["Máxima verosimilitud", "Suficiencia", "Cota de Cramér–Rao", "Intervalos de confianza",
                "Lema de Neyman–Pearson", "Razón de verosimilitudes", "t pareado", "Wilcoxon",
                "Shapiro–Wilk", "Corrección de Holm–Bonferroni", "Bootstrap"]
    },
    {
      nombre: "Modelos lineales y series temporales",
      resumen: "Regresión, GLM, modelos mixtos y econometría.",
      detalle:
        "Modelización de relaciones entre variables con modelos lineales y lineales " +
        "generalizados, modelos mixtos para datos longitudinales, diagnóstico de supuestos, " +
        "selección de variables y análisis de series temporales.",
      metodos: ["Regresión lineal múltiple", "GLM (logística, Poisson)", "Modelos lineales mixtos", "REML", "Diagnóstico de residuos",
                "Multicolinealidad", "AIC / BIC", "Estacionariedad", "ARIMA", "Autocorrelación"]
    },
    {
      nombre: "Simulación física",
      resumen: "Métodos numéricos y Monte Carlo para sistemas físicos.",
      detalle:
        "Simulación de sistemas físicos mediante integración numérica de ecuaciones " +
        "diferenciales y métodos estocásticos, con atención a la estabilidad, la conservación " +
        "de magnitudes y el error numérico.",
      metodos: ["Euler y Runge–Kutta", "Verlet", "Sistemas dinámicos", "Diferencias finitas",
                "Monte Carlo", "Algoritmo de Metropolis", "NumPy / SciPy", "MATLAB"]
    },
    {
      nombre: "Señales, redes y grandes datos",
      resumen: "Detección y estimación, redes complejas y Big Data.",
      detalle:
        "Detección y estimación de señales en presencia de ruido, análisis de redes complejas " +
        "y trabajo con conjuntos de datos de millones de registros.",
      metodos: ["Estimador MVU", "Estimación MMSE / MAP", "Detección de Neyman–Pearson",
                "Centralidad", "Detección de comunidades", "Modelos de red aleatoria", "SQL"]
    }
  ],

  /* logo: archivo de assets/logos (sin extensión si es .svg) · "" muestra iniciales */
  tecnologias: [
    {
      grupo: "Lenguajes",
      items: [
        { nombre: "Python", logo: "python", nivel: 4, uso: "Lenguaje principal para machine learning y análisis de datos." },
        { nombre: "R", logo: "r", nivel: 4, uso: "Modelización estadística: bnlearn, gRain, tidyr, ggplot2, pROC." },
        { nombre: "C++", logo: "cplusplus", nivel: 3, uso: "Programación orientada a objetos y algoritmos." },
        { nombre: "MATLAB", logo: "matlab", nivel: 3, uso: "Cálculo numérico, señales y simulación." },
        { nombre: "SQL", logo: "sql", nivel: 3, uso: "Consultas, uniones y agregaciones." },
        { nombre: "LaTeX", logo: "latex", nivel: 4, uso: "Informes científicos y documentación técnica." }
      ]
    },
    {
      grupo: "Ciencia de datos y machine learning",
      items: [
        { nombre: "PyTorch", logo: "pytorch", nivel: 4, uso: "MLP, CNN y GNN; bucles de entrenamiento propios." },
        { nombre: "PyTorch Geometric", logo: "pyg", ini: "PyG", nivel: 3, uso: "Redes de grafos: EdgeConv y pooling global." },
        { nombre: "scikit-learn", logo: "scikitlearn", nivel: 4, uso: "Preprocesado, modelos clásicos y métricas." },
        { nombre: "XGBoost", logo: "xgboost.png", ini: "XG", nivel: 3, uso: "Gradient boosting para datos tabulares." },
        { nombre: "pandas", logo: "pandas", nivel: 4, uso: "Limpieza y transformación de datos." },
        { nombre: "NumPy", logo: "numpy", nivel: 4, uso: "Cálculo vectorizado y álgebra lineal." }
      ]
    },
    {
      grupo: "Visualización de datos",
      items: [
        { nombre: "Matplotlib", logo: "matplotlib", nivel: 4, uso: "Figuras para informes científicos." },
        { nombre: "Seaborn", logo: "seaborn.png", ini: "Sb", nivel: 4, uso: "Visualización estadística exploratoria." },
        { nombre: "ggplot2", logo: "ggplot2.png", ini: "gg", nivel: 4, uso: "Gráficos estadísticos en R." },
        { nombre: "Tableau", logo: "tableau", ini: "Tb", nivel: 3, uso: "Dashboards interactivos." },
        { nombre: "Power BI", logo: "powerbi", ini: "BI", nivel: 3, uso: "Informes y cuadros de mando." }
      ]
    },
    {
      grupo: "Herramientas",
      items: [
        { nombre: "Git", logo: "git", nivel: 3, uso: "Control de versiones." },
        { nombre: "GitHub", logo: "github", nivel: 3, uso: "Repositorios y trabajo colaborativo." },
        { nombre: "Docker", logo: "docker", nivel: 2, uso: "Entornos reproducibles." },
        { nombre: "Linux", logo: "linux", nivel: 3, uso: "Terminal y entornos de desarrollo." },
        { nombre: "Jupyter", logo: "jupyter", nivel: 4, uso: "Exploración y prototipado." },
        { nombre: "Google Colab", logo: "googlecolab", nivel: 4, uso: "Entrenamiento con GPU." },
        { nombre: "PyCharm", logo: "pycharm", nivel: 4, uso: "Desarrollo en Python." },
        { nombre: "RStudio", logo: "rstudio", nivel: 4, uso: "Análisis en R." }
      ]
    }
  ],

  idiomas: [
    { nombre: "Español", nivel: 5, etiqueta: "Nativo", bandera: "es" },
    { nombre: "Catalán", nivel: 5, etiqueta: "Nativo", bandera: "cat" },
    { nombre: "Inglés", nivel: 4, etiqueta: "C1 · Cambridge", bandera: "uk" }
  ],

  /* ------------------------------------------------------------------
     FOTOGRAFÍA (página aparte: fotos.html)
     { src: "assets/fotos/archivo.jpg", titulo: "…", lugar: "…" }
     ------------------------------------------------------------------ */
  fotos: []
};
