#!/usr/bin/env python3
"""Clasifica las preguntas del MIR en bloques temáticos.

El repo de preguntas trae `tema` y `subtema` a null: la clasificación hay que
hacerla aquí. Cada bloque es una asignatura del MIR y se reconoce por sus
términos propios, que se buscan en el enunciado y en las opciones.

El reparto no es por «la primera palabra que aparezca»: cada bloque suma
puntos por los términos que encuentra, pesando más los inequívocos (una
«valvulopatía» solo es de Cardiología) que los compartidos (un «dolor» no es
de nadie). Gana el de más puntos; si nadie llega al mínimo, la pregunta va a
«Sin clasificar» para repasarla a mano.

Uso:  python3 tools/mir_clasificar.py <preguntas.jsonl> > clasificacion.json
      python3 tools/mir_clasificar.py --muestra <preguntas.jsonl>
"""
import json, re, sys, unicodedata, collections

# Peso 3 = término propio de ese bloque y de ningún otro.
# Peso 1 = término que orienta pero también sale en otros sitios.
BLOQUES = [
 ("Cardiología", {
   3: ["valvulopat", "estenosis aortica", "estenosis mitral", "insuficiencia mitral",
       "insuficiencia aortica", "miocardiopat", "pericardit", "endocardit",
       "fibrilacion auricular", "flutter", "taquicardia ventricular", "bloqueo auriculoventricular",
       "sindrome coronario", "infarto agudo de miocardio", "angina", "cardiopatia isquemica",
       "insuficiencia cardiaca", "marcapasos", "desfibrilador", "ecocardiograf",
       "electrocardiograma", "aneurisma de aorta", "diseccion aortica", "soplo",
       "hipertension arterial", "antiagregante", "anticoagulacion oral", "estatina",
       "subendocard", "electrocardiograf", "isquemia aguda de una extremidad", "arteriopatia periferica", "claudicacion intermitente", "perfusion arterial", "trombosis venosa profunda", "varices en miembros", "sincope",
       "placa arterioscleroti", "arteriosclero", "isquemia cronica de las extremidades", "hemodinamic", "indice tobillo", "riesgo cardiovascular"],
   1: ["cardiac", "coronari", "auricul", "ventricul", "arritmia", "isquemi",
       "presion arterial", "aorta", "pulso", "troponina", "disnea de esfuerzo"]}),

 ("Neumología", {
   3: ["epoc", "asma", "espirometr", "neumonia", "neumotorax", "derrame pleural",
       "tromboembolismo pulmonar", "fibrosis pulmonar", "sarcoidosis", "apnea del sueno",
       "bronquiectasia", "tuberculosis pulmonar", "cancer de pulmon", "silicosis",
       "asbestosis", "ventilacion mecanica no invasiva", "oxigenoterapia",
       "hipertension pulmonar", "broncodilatador", "neumonitis",
       "ventilacion mecanica", "insuficiencia respiratoria", "atelectasia"],
   1: ["pulmon", "bronqui", "pleura", "respiratori", "tos", "esputo", "hemoptisis",
       "gasometria", "fev1", "espiracion", "alveol"]}),

 ("Digestivo", {
   3: ["reflujo gastroesofagico", "esofagitis", "ulcera peptica", "helicobacter",
       "enfermedad de crohn", "colitis ulcerosa", "enfermedad inflamatoria intestinal",
       "celiaquia", "enfermedad celiaca", "sindrome de intestino irritable",
       "cirrosis", "hepatitis", "hipertension portal", "ascitis", "encefalopatia hepatica",
       "colelitiasis", "colecistitis", "colangitis", "pancreatitis", "cancer colorrectal",
       "colonoscopia", "endoscopia digestiva", "varices esofagicas", "hemorragia digestiva",
       "diverticulitis", "apendicitis", "hernia inguinal", "obstruccion intestinal",
       "acalasia", "pirosis", "disfagia", "coledoco",
       "bomba de protones", "poliposis", "hematemesis", "melena", "gastroenteritis", "defecacion", "peritonitis", "fistula perianal", "hemorroide", "megacolon",
       "secrecion gastrica", "vesicula biliar", "carcinoma de la vesicula", "tratamiento secuencial", "gastrinoma"],
   1: ["higado", "hepat", "biliar", "pancrea", "esofag", "gastric", "intestin",
       "colon", "recto", "abdomen", "abdominal", "diarrea", "estrenimiento",
       "ictericia", "bilirrubina", "transaminasa"]}),

 ("Nefrología", {
   3: ["glomerulonefrit", "sindrome nefrotico", "sindrome nefritico", "insuficiencia renal",
       "enfermedad renal cronica", "fracaso renal agudo", "dialisis", "hemodialisis",
       "trasplante renal", "nefropatia diabetica", "acidosis tubular", "sindrome hemolitico uremico",
       "filtrado glomerular", "proteinuria", "nefritis", "rinon poliquistico",
       "hiperpotasemia", "hipopotasemia", "hiponatremia", "hipernatremia",
       "acidosis metabolica", "alcalosis metabolica", "equilibrio acido-base",
       "arteriola eferente", "arteriola aferente", "sistema renina", "bacteriuria", "nefrolitiasis"],
   1: ["renal", "rinon", "creatinina", "orina", "diuresis", "tubulo", "glomerul",
       "electrolit", "potasio", "sodio"]}),

 ("Urología", {
   3: ["hiperplasia benigna de prostata", "cancer de prostata", "psa", "litiasis renal",
       "colico renal", "cancer de vejiga", "cancer de testiculo", "varicocele",
       "disfuncion erectil", "incontinencia urinaria", "hidronefrosis", "sondaje vesical",
       "cistitis", "pielonefritis", "hematuria", "prostatectomia", "fimosis", "criptorquidia"],
   1: ["prostat", "vejiga", "ureter", "uretra", "testicul", "escrotal", "miccion",
       "urologic"]}),

 ("Endocrinología", {
   3: ["diabetes mellitus", "cetoacidosis", "hipoglucemia", "insulina", "metformina",
       "hipotiroidismo", "hipertiroidismo", "tiroiditis", "nodulo tiroideo", "cancer de tiroides",
       "hiperparatiroidismo", "hipoparatiroidismo", "cushing", "addison", "feocromocitoma",
       "acromegalia", "prolactinoma", "hiperaldosteronismo", "insuficiencia suprarrenal",
       "osteoporosis", "hipercalcemia", "hipocalcemia", "sindrome metabolico", "obesidad",
       "men 1", "men 2", "diabetes insipida", "hiponatremia por siadh",
       "hipercortisolismo", "hipogonadismo", "craneofaringioma", "amenorrea hipotalamica", "testosterona", "estradiol",
       "esteroidogenesis", "deficit enzimatico suprarrenal", "17-hidroxiprogesterona", "hiperplasia suprarrenal congenita"],
   1: ["tiroide", "hipofis", "suprarrenal", "paratiroide", "hormon", "glucemia",
       "endocrin", "cortisol", "tsh"]}),

 ("Hematología", {
   3: ["anemia ferropenica", "anemia megaloblastica", "anemia hemolitica", "talasemia",
       "drepanocit", "aplasia medular", "leucemia", "linfoma", "mieloma", "mielodisplasi",
       "policitemia", "trombocitopenia", "purpura trombocitopenica", "hemofilia",
       "coagulacion intravascular diseminada", "von willebrand", "trombofilia",
       "transfusion", "trasplante de progenitores hematopoyeticos", "esplenomegalia",
       "neutropenia", "pancitopenia", "frotis de sangre periferica", "medula osea",
       "heparina", "plasmaferesis"],
   1: ["anemia", "hemoglobina", "hematie", "leucocit", "plaqueta", "coagul",
       "hemorragi", "hematolog", "linfocit", "bazo"]}),

 ("Oncología", {
   3: ["quimioterapia", "radioterapia", "inmunoterapia", "metastasis", "estadificacion",
       "tnm", "cuidados paliativos", "sindrome paraneoplasico", "marcador tumoral",
       "cribado de cancer", "neoadyuvante", "adyuvante", "oncologic", "antineoplasic",
       "tumor primario desconocido", "supervivencia global",
       "cabeza y cuello", "papilomavirus", "virus del papiloma", "sarcoma", "ganglio centinela", "cuidados al final de la vida"],
   1: ["tumor", "neoplas", "carcinoma", "cancer", "malign", "biopsia", "nodulo"]}),

 ("Reumatología", {
   3: ["artritis reumatoide", "lupus", "esclerodermia", "sjogren", "espondilitis anquilosante",
       "artritis psoriasica", "vasculitis", "arteritis de celulas gigantes", "polimialgia",
       "gota", "condrocalcinosis", "fibromialgia", "artrosis", "artritis septica",
       "dermatomiositis", "polimiositis", "behcet", "antinuclear", "factor reumatoide",
       "sacroiliaca", "enfermedad de still"],
   1: ["articula", "reumat", "sinovial", "autoinmun", "inflamacion articular"]}),

 ("Neurología", {
   3: ["ictus", "accidente cerebrovascular", "hemorragia subaracnoidea", "epilepsia",
       "crisis comicial", "esclerosis multiple", "parkinson", "alzheimer", "demencia",
       "miastenia", "esclerosis lateral amiotrofica", "neuropatia periferica",
       "guillain-barre", "cefalea", "migrana", "meningitis", "encefalitis",
       "hipertension intracraneal", "hidrocefalia", "liquido cefalorraquideo",
       "electromiograf", "sindrome medular", "paraplejia", "hemiparesia", "afasia",
       "nervio craneal", "neuralgia del trigemino", "mielitis", "coma", "muerte encefalica",
       "neurona motora", "temblor esencial", "creutzfeldt", "par craneal", "pares craneales", "paralisis facial", "sindrome confusional", "deterioro cognitivo", "neuropatia optica", "hipertension endocraneal", "prion",
       "perdida de memoria", "fases del sueno", "estructuracion del sueno", "anomia", "dificultad para encontrar las palabras", "nistagmo central"],
   1: ["cerebr", "neurolog", "neuron", "medula espinal", "nervio", "convulsi",
       "parestesia", "paralisis", "reflejo", "cerebelo"]}),

 ("Psiquiatría", {
   3: ["esquizofrenia", "trastorno bipolar", "depresion mayor", "trastorno de ansiedad",
       "trastorno obsesivo", "anorexia nerviosa", "bulimia", "trastorno de personalidad",
       "antipsicotico", "antidepresivo", "benzodiacepina", "litio", "suicidio",
       "psicoterapia", "delirio", "alucinacion", "sindrome de abstinencia",
       "dependencia alcoholica", "trastorno por consumo", "psicotic", "manía",
       "trastorno de estres postraumatico", "tdah", "autismo",
       "trastorno de conversion", "trastorno somatomorfo", "crisis de angustia", "trastorno disociativo", "intento autolitico"],
   1: ["psiquiatr", "psicolog", "animo", "ansiedad", "depresiv", "adiccion"]}),

 ("Dermatología", {
   3: ["melanoma", "carcinoma basocelular", "carcinoma epidermoide cutaneo", "psoriasis",
       "dermatitis atopica", "dermatitis seborreica", "urticaria", "penfigo",
       "penfigoide", "liquen plano", "acne", "rosacea", "alopecia", "vitiligo",
       "micosis cutanea", "escabiosis", "eritema nodoso", "necrolisis epidermica",
       "nevus", "dermatoscopia", "queratosis actinica", "hidrosadenitis"],
   1: ["cutane", "piel", "dermatolog", "lesion cutanea", "placa eritematosa",
       "prurito", "ampolla", "exantema"]}),

 ("Oftalmología", {
   3: ["glaucoma", "catarata", "retinopatia", "degeneracion macular", "desprendimiento de retina",
       "uveitis", "conjuntivitis", "queratitis", "oclusion de la arteria central",
       "neuritis optica", "estrabismo", "ambliopia", "presion intraocular",
       "fondo de ojo", "agudeza visual", "cuerpo vitreo", "ojo rojo", "papiledema"],
   1: ["ocular", "oftalmolog", "retina", "cornea", "cristalino", "vision", "ojo",
       "parpado", "pupila"]}),

 ("Otorrinolaringología", {
   3: ["otitis", "hipoacusia", "acufeno", "vertigo", "menière", "meniere",
       "colesteatoma", "rinosinusitis", "poliposis nasal", "epistaxis", "amigdalitis",
       "faringitis", "laringitis", "paralisis de cuerda vocal", "cancer de laringe",
       "audiometr", "timpano", "apnea obstructiva", "disfonia",
       "adenoma pleomorfo", "nistagmo", "sindrome vestibular", "glandula salival", "parotid", "maniobra de dix"],
   1: ["oido", "nasal", "nariz", "faringe", "laringe", "amigdala", "auditiv",
       "orl", "cervical ganglionar"]}),

 ("Ginecología y Obstetricia", {
   3: ["embarazo", "gestacion", "parto", "puerperio", "preeclampsia", "eclampsia",
       "placenta", "aborto", "cesarea", "lactancia", "menopausia", "endometriosis",
       "mioma", "cancer de mama", "mamografia", "cancer de cervix", "cancer de ovario",
       "anticoncepcion", "esterilidad", "fecundacion in vitro", "citologia cervical",
       "amenorrea", "metrorragia", "ecografia obstetrica", "diabetes gestacional",
       "crecimiento intrauterino retardado", "ginecolog", "obstetric", "histerectomia",
       "embrion", "concepcion", "ecografia vaginal", "latido cardiaco embrionario", "vulvovaginitis", "prolapso genital"],
   1: ["utero", "ovario", "mama", "vagina", "cervix", "menstrua", "feto", "fetal",
       "materno", "trimestre"]}),

 ("Pediatría", {
   3: ["recien nacido", "neonato", "prematuro", "lactante", "calendario de vacunacion",
       "bronquiolitis", "laringitis aguda infantil", "kawasaki", "invaginacion intestinal",
       "estenosis hipertrofica de piloro", "fibrosis quistica", "displasia de cadera",
       "escarlatina", "exantema subito", "convulsion febril", "percentil",
       "desarrollo psicomotor", "pediatric", "ictericia neonatal", "test de apgar",
       "cribado neonatal", "muerte subita del lactante", "enuresis",
       "deshidratacion en el lactante", "reflujo vesicoureteral infantil", "talla baja", "soplo inocente"],
   1: ["nino", "nina", "infantil", "adolescente", "escolar", "meses de edad",
       "anos de edad"]}),

 ("Traumatología", {
   3: ["fractura", "luxacion", "esguince", "rotura de menisco", "ligamento cruzado",
       "hombro doloroso", "sindrome del tunel carpiano", "hernia discal", "lumbalgia",
       "escoliosis", "osteomielitis", "necrosis avascular", "protesis de cadera",
       "sindrome compartimental", "pseudoartrosis", "tendinitis", "artroscopia",
       "osteosintesis", "politraumatizado"],
   1: ["oseo", "hueso", "traumatolog", "rodilla", "cadera", "hombro", "columna",
       "tobillo", "muneca", "tendon", "ligamento"]}),

 ("Infecciosas y Microbiología", {
   3: ["vih", "sida", "antirretroviral", "sepsis", "shock septico", "bacteriemia",
       "antibiotic", "antibiograma", "resistencia bacteriana", "staphylococcus",
       "streptococcus", "escherichia coli", "pseudomonas", "clostridi", "salmonella",
       "mycobacterium", "candida", "aspergil", "pneumocystis", "toxoplasm",
       "paludismo", "malaria", "leishmani", "hidatidosis", "brucel", "rickettsi",
       "borrelia", "treponema", "sifilis", "gonococ", "chlamydia", "herpes",
       "citomegalovirus", "virus de epstein-barr", "gripe", "covid", "sars-cov",
       "dengue", "rabia", "tetanos", "profilaxis postexposicion", "fiebre de origen desconocido",
       "infeccion nosocomial", "hemocultivo", "vacuna antigripal",
       "chagas", "eosinofilia", "mononucleosis", "absceso", "faringoamigdalitis", "osteoarticular infeccios", "endocarditis infecciosa",
       "secrecion uretral", "uretritis", "antimicrobian", "enfermedad de transmision sexual"],
   1: ["infeccios", "bacteri", "vir", "hongo", "fungic", "parasit", "fiebre",
       "microbiolog", "cultivo", "serologia"]}),

 ("Inmunología", {
   3: ["inmunodeficiencia", "complejo mayor de histocompatibilidad", "hla",
       "hipersensibilidad tipo", "complemento", "inmunoglobulina", "linfocito t",
       "linfocito b", "celula presentadora de antigeno", "tolerancia inmunologica",
       "rechazo de trasplante", "anafilaxia", "alergia", "citoquina", "interleuquina",
       "inmunosupres", "anticuerpo monoclonal"],
   1: ["inmun", "antigeno", "anticuerpo", "autoanticuerpo"]}),

 ("Genética", {
   3: ["autosomica dominante", "autosomica recesiva", "ligada al x", "cariotipo",
       "trisomia", "sindrome de down", "cromosoma", "mutacion", "penetrancia",
       "consejo genetico", "herencia mitocondrial", "impronta", "mosaicismo",
       "secuenciacion", "exoma", "cribado genetico", "fenotipo", "genotipo",
       "enfermedad monogenica", "triplete", "anticipacion",
       "deposito lisosomal", "enfermedad metabolica hereditaria", "error congenito del metabolismo"],
   1: ["genetic", "gen ", "adn", "alelo", "hereditari", "familiar de primer grado"]}),

 ("Farmacología", {
   3: ["farmacocinetica", "farmacodinamica", "semivida de eliminacion", "aclaramiento del farmaco",
       "biodisponibilidad", "primer paso hepatico", "citocromo p450", "interaccion farmacologica",
       "efecto adverso", "reaccion adversa", "farmacovigilancia", "margen terapeutico",
       "agonista", "antagonista", "receptor adrenergico", "dosis de carga",
       "ensayo de bioequivalencia", "intoxicacion por", "antidoto",
       "inhibidor directo de la trombina", "anticoagulante oral directo", "opiaceo", "opioide", "aines", "corticoide", "betabloqueante", "ieca", "antagonista del calcio", "diuretico", "contraindicado en",
       "ciclooxigenasa", "cox-2", "antiinflamatorio no esteroideo", "error de prescripcion", "prescripcion electronica", "conciliacion de la medicacion"],
   1: ["farmac", "medicamento", "dosis", "posologia", "via de administracion",
       "toxicidad"]}),

 ("Anestesia y Cuidados Críticos", {
   3: ["anestesia general", "anestesia regional", "anestesia epidural", "intubacion",
       "via aerea dificil", "relajante muscular", "propofol", "parada cardiorrespiratoria",
       "reanimacion cardiopulmonar", "soporte vital", "shock hipovolemico",
       "sedacion", "analgesia postoperatoria", "unidad de cuidados intensivos",
       "riesgo quirurgico", "preoperatorio", "dolor cronico", "escala de glasgow",
       "quemadura", "hipotermia", "ahogamiento", "delirium postoperatorio",
       "triage", "politrauma",
       "traumatismo abdominal", "traumatismo craneoencefalico", "shock", "lavado peritoneal", "hemoperitoneo", "cricotiroidotomia", "monitorizacion invasiva"],
   1: ["anestes", "quirurgic", "cirugia", "postoperatori", "intraoperatori",
       "critico", "urgencias", "reanimacion"]}),

 ("Estadística y Epidemiología", {
   3: ["ensayo clinico", "aleatorizacion", "doble ciego", "placebo", "intencion de tratar",
       "estudio de cohortes", "estudio de casos y controles", "estudio transversal",
       "riesgo relativo", "odds ratio", "riesgo atribuible", "numero necesario a tratar",
       "sensibilidad", "especificidad", "valor predictivo", "curva roc", "incidencia",
       "prevalencia", "sesgo", "factor de confusion", "intervalo de confianza",
       "significacion estadistica", "valor de p", "potencia estadistica", "metaanalisis",
       "meta-analisis", "revision sistematica", "medidas de tendencia central",
       "desviacion tipica", "regresion logistica", "supervivencia de kaplan",
       "grado de recomendacion", "nivel de evidencia", "guia de practica clinica",
       "variable cuantitativa", "variable cualitativa", "chi cuadrado", "t de student",
       "ensayo clinico fase", "estudio pragmatico", "tipo de variable", "variable dicotomica", "variable ordinal", "aleatorizado", "razon de verosimilitud", "analisis por protocolo", "comite etico de investigacion",
       "regresion multiple", "regresion lineal", "fases de ensayos clinicos", "fase ii", "fase iii", "fase iv", "estudio confirmatorio", "exposicion al humo del tabaco"],
   1: ["estadistic", "epidemiolog", "muestra", "probabilidad", "correlacion",
       "hipotesis nula", "estudio observacional"]}),

 ("Salud Pública y Preventiva", {
   3: ["cribado poblacional", "prevencion primaria", "prevencion secundaria",
       "prevencion terciaria", "educacion para la salud", "promocion de la salud",
       "vigilancia epidemiologica", "declaracion obligatoria", "brote epidemico",
       "salud laboral", "enfermedad profesional", "salud ambiental", "agua de consumo",
       "calendario vacunal", "cobertura vacunal", "determinantes sociales",
       "esperanza de vida", "mortalidad infantil", "tasa de mortalidad",
       "sistema nacional de salud", "atencion primaria", "cartera de servicios",
       "gestion sanitaria", "coste-efectividad", "indicador de calidad",
       "seguridad del paciente", "historia clinica electronica",
       "evaluacion economica", "coste-utilidad", "costes indirectos", "coste por ano de vida", "inmunidad de grupo", "inmunidad colectiva", "cribado oportunista", "cribado de poblacion", "vacunacion", "tabaquismo", "consejo breve", "deteccion precoz",
       "eficiencia de un servicio", "seguridad del paciente", "error asistencial", "evento adverso", "cribado dirigido a grupos de riesgo", "gestion de la calidad"],
   1: ["salud publica", "preventiv", "poblacion general", "comunitari", "sanitari"]}),

 ("Bioética y Medicina Legal", {
   3: ["consentimiento informado", "autonomia del paciente", "confidencialidad",
       "secreto profesional", "instrucciones previas", "voluntades anticipadas",
       "incapacidad", "consentimiento por representacion", "codigo deontologico",
       "comite de etica", "objecion de conciencia", "lex artis", "mala praxis",
       "certificado de defuncion", "autopsia judicial", "data de la muerte",
       "lesiones medicolegales", "parte de lesiones", "eutanasia", "sedacion paliativa",
       "ley de autonomia", "menor maduro", "deontolog",
       "entrevista clinica", "comunicacion de malas noticias", "relacion medico-paciente", "negativa al tratamiento", "capacidad de decision",
       "comunicacion con la familia", "actitudes esenciales", "menor de edad", "residente de segundo ano", "informacion al paciente", "situaciones graves y complejas", "traspaso de pacientes", "pase de guardia"],
   1: ["etic", "legal", "juridic", "deber del medico", "responsabilidad profesional"]}),

 ("Anatomía Patológica", {
   3: ["anatomia patologica", "histopatolog", "inmunohistoquimic", "displasia",
       "metaplasia", "hiperplasia", "citologia", "pieza quirurgica",
       "margen de reseccion", "grado histologico", "apoptosis", "necrosis",
       "granuloma", "amiloidosis", "cuerpo de inclusion", "tincion de"],
   1: ["histolog", "microscop", "celular", "tejido", "biopsia"]}),

 ("Fisiología y Bioquímica", {
   3: ["potencial de accion", "homeostasis", "gluconeogenesis", "glucolisis",
       "ciclo de krebs", "fosforilacion oxidativa", "cadena respiratoria",
       "metabolismo lipidico", "metabolismo proteico", "enzima", "coenzima",
       "ciclo de la urea", "beta-oxidacion", "sintesis de proteinas",
       "transcripcion", "traduccion", "ribosoma", "membrana celular",
       "transporte activo", "osmolaridad", "presion oncotica", "surfactante",
       "curva de disociacion", "gasto cardiaco", "retorno venoso", "autorregulacion",
       "musculo liso", "arteriola", "barorreceptor", "quimiorreceptor", "equilibrio hidroelectrolitico", "presion coloidosmotica",
       "lisosom", "peroxisom", "mitocondri"],
   1: ["fisiolog", "bioquimic", "metabol", "sustrato", "molecula", "atp",
       "receptor", "sintesis"]}),

 ("Anatomía", {
   3: ["irrigacion arterial", "drenaje venoso", "inervacion", "origen e insercion",
       "relaciones anatomicas", "trayecto del nervio", "plexo braquial",
       "plexo lumbosacro", "espacio retroperitoneal", "mediastino", "triangulo de",
       "fosa craneal", "conducto inguinal", "anatomic",
       "conducto oseo", "agujero rasgado", "trayecto intracraneal", "musculatura de la frente"],
   1: ["anatom", "musculo", "arteria", "vena ", "nervio", "ganglio linfatico",
       "region"]}),

 ("Geriatría y Nutrición", {
   3: ["paciente mayor", "anciano", "fragilidad", "deterioro funcional",
       "valoracion geriatrica", "polifarmacia", "ulcera por presion", "inmovilidad",
       "caidas", "desnutricion", "nutricion enteral", "nutricion parenteral",
       "indice de masa corporal", "requerimiento calorico", "vitamina",
       "deficit nutricional", "sarcopenia", "dieta mediterranea",
       "estertores", "pre mortem", "agonia", "ultimos dias de vida", "sindrome geriatrico", "cuidador", "dependencia funcional"],
   1: ["geriatr", "nutricion", "dieta", "alimentacion", "edad avanzada"]}),
]

MINIMO = 2        # puntos por debajo de los cuales la pregunta queda sin clasificar
VENTAJA = 1       # el ganador debe superar al segundo por esto para no ser dudoso


def nfd(s):
    """Minúsculas sin tildes, para que «riñón» y «rinon» casen igual."""
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", s)


def puntuar(texto):
    t = nfd(texto)
    marcas = {}
    for nombre, pesos in BLOQUES:
        p = 0
        for peso, terminos in pesos.items():
            for term in terminos:
                if nfd(term) in t:
                    p += peso
        if p:
            marcas[nombre] = p
    return marcas


def clasificar(q):
    texto = q["enunciado"] + " " + " ".join(q["opciones"])
    marcas = puntuar(texto)
    if not marcas:
        return None, 0, False
    orden = sorted(marcas.items(), key=lambda kv: -kv[1])
    mejor, pts = orden[0]
    if pts < MINIMO:
        return None, pts, False
    dudoso = len(orden) > 1 and (pts - orden[1][1]) < VENTAJA
    return mejor, pts, dudoso


def main(argv):
    muestra = "--muestra" in argv
    ruta = [a for a in argv if not a.startswith("--")][0]
    qs = [json.loads(l) for l in open(ruta, encoding="utf-8")]
    salida, cuenta, dudosas, sin = {}, collections.Counter(), [], []
    for q in qs:
        bloque, pts, dudoso = clasificar(q)
        salida[q["id"]] = {"bloque": bloque, "puntos": pts, "dudoso": dudoso}
        if bloque is None:
            sin.append(q)
        else:
            cuenta[bloque] += 1
            if dudoso:
                dudosas.append(q["id"])
    tot = len(qs)
    print("%d preguntas · %d clasificadas (%.1f%%) · %d dudosas · %d sin clasificar"
          % (tot, tot - len(sin), 100 * (tot - len(sin)) / tot, len(dudosas), len(sin)),
          file=sys.stderr)
    for b, n in cuenta.most_common():
        print("   %4d  %s" % (n, b), file=sys.stderr)
    if muestra:
        print("\n-- sin clasificar (primeras 25) --", file=sys.stderr)
        for q in sin[:25]:
            print("   [%s] %s" % (q["id"], q["enunciado"][:110]), file=sys.stderr)
        return
    json.dump(salida, sys.stdout, ensure_ascii=False, indent=0)


if __name__ == "__main__":
    main(sys.argv[1:])
