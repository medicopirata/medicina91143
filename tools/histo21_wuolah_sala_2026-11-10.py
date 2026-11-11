#!/usr/bin/env python3
"""Histología Esp. I: lleva a la sala de estudio las «Ampliación con los apuntes
de Wuolah (Bloque N) [EXTERNO]» del doc (rev 146, 10-11-2026).

Las ampliaciones solo traen texto: datos del «Histo I comprimido» de un
compañero que no salieron en clase y una lista de contradicciones con la
profesora (en las que manda ella). Cada dato va al apartado del tema que trata
de eso, como un recuadro «📗» marcado de ampliación externa, al final de los
bloques del apartado. Las contradicciones van en otro recuadro aparte.

El tema 14 (formato compacto propio) lleva sus dos recuadros puestos a mano.

Idempotente: los recuadros llevan `"wuolah": "2026-11-10"`; al volver a
ejecutarlo se quitan y se vuelven a poner.

Uso:  python3 tools/histo21_wuolah_sala_2026-11-10.py
"""
import json, os

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARCA = "2026-11-10"
T_DATOS = "Ampliación externa (apuntes de Wuolah) · no lo dijo la profesora"
T_CONTRA = "Wuolah frente a la profesora · manda la profesora"

# (tema, apartado): ([datos], [contradicciones])
A = {
    # Bloque 1 · sangre y hemopoyesis
    (1, "s1"): (["La **albúmina** es la proteína plasmática **más pequeña** y supone ≈ la **mitad** de las proteínas totales: mantiene la presión oncótica y transporta hormonas, metabolitos y fármacos.",
                 "El **fibrinógeno** es la proteína plasmática **más grande** y se sintetiza en el **hígado**."], []),
    (1, "s3"): (["En el neutrófilo, los **gránulos específicos (secundarios)** son **dos veces más abundantes** que los azurófilos y llevan además **activadores del complemento**.",
                 "Los **gránulos terciarios** son de dos tipos: unos con **metaloproteinasas** (colagenasas y gelatinasas) y otros con **fosfatasas**."],
                ["Tamaño del neutrófilo: profesora **9–12 µm**; Wuolah 10–12 µm.",
                 "Vida media del neutrófilo: profesora **≈ 6 h en sangre y hasta 4 días en los tejidos**; Wuolah 6–8 h en sangre y 1–4 días en el conjuntivo."]),
    (1, "s5"): (["El **linfocito B** tiene vida media **corta** y el **T**, **variable**."], []),
    (1, "s6"): (["Los **gránulos δ (densos)** de la plaqueta son **más pequeños y densos**, pero **menos abundantes**, que los α."], []),
    (2, "s1"): ([], ["Inicio de la fase del saco vitelino: profesora **3.ª semana**; Wuolah final de la 2.ª semana."]),
    (2, "s2"): (["El **proeritroblasto** suele tener **dos nucléolos** visibles."], []),
    (2, "s3"): (["El **mieloblasto** mide **15–20 µm**, con cromatina laxa y **2–3 nucléolos**."], []),
    (2, "s4"): (["El **monoblasto** se parece al mieloblasto (sin gránulos y con mitosis). El **monocito** maduro conserva **1–2 nucléolos** y una cromatina más fina que la del linfocito."], []),
    (2, "s5"): (["La **trombopoyetina** se sintetiza sobre todo en el **hígado**, pero también en el riñón, el músculo y la propia médula ósea."],
                ["Tamaño del megacariocito: profesora **50–150 µm**; Wuolah 50–80 µm."]),
    (2, "s6"): (["La médula ósea tiene **tres funciones**: **hematopoyética**, **inmunitaria** (órgano linfoide primario) y **fagocítica**."], []),
    # Bloque 2 · circulatorio
    (3, "s2"): ([], ["Calibre de la arteria muscular: profesora **0,3 mm – 1 cm**; Wuolah 2–10 mm."]),
    (3, "s4"): (["Las **válvulas venosas** aparecen en venas de **más de 2 mm** de calibre, sobre todo del **miembro inferior**."], []),
    (3, "s5"): (["Las **fenestras** del capilar fenestrado miden **≈ 70 nm**, y el **diafragma** que puede cerrarlas es **trilaminar**."], []),
    (4, "s1"): (["El endocardio se separa del miocardio por la **capa subendocárdica**, que se continúa con el **epimisio** del miocardio."], []),
    (4, "s2"): ([], ["Velocidad de conducción de las fibras de Purkinje: profesora **3 m/s**; Wuolah 2–3 m/s."]),
    (4, "s3"): (["Los **gránulos atriales** de los cardiomiocitos mioendocrinos miden **≈ 0,4 µm** y están rodeados de membrana.",
                 "Los **cardiomiocitos nodales** tienen **menos miofibrillas** y capacidad de despolarizarse solos (**automatismo**)."], []),
    # Bloque 3 · linfoides
    (5, "s1"): (["El **primordio del timo** aparece en la **6.ª semana**, del **endodermo de la 3.ª bolsa faríngea**, antes de que lleguen los precursores T (**9.ª semana**)."], []),
    (6, "s1"): (["Las **células reticulares** del ganglio sintetizan las fibras de reticulina y también participan en la formación de los **senos**."], []),
    (6, "s4"): (["Los **linfocitos B activados** bajan a los **cordones medulares**, se transforman en **células plasmáticas** y vierten las Ig directamente a los **senos medulares**, sin salir del ganglio.",
                 "El revestimiento de los senos es **discontinuo** donde toca el tejido linfoide (para que los macrófagos metan sus prolongaciones) y **continuo** donde toca el conjuntivo de la trabécula."], []),
    (6, "s5"): (["El MALT va desde un agregado de **4–5 células** hasta grandes agregados, y está también en la **piel** y el **aparato genital**, además de en el digestivo y el respiratorio."], []),
    (6, "s6"): (["La **amígdala palatina** es el tejido **más sensible** del anillo de Waldeyer. Las amígdalas captan antígenos **deglutidos o respirados**."],
                ["Edad de máxima actividad de la amígdala palatina: profesora **hacia los 4 años, en descenso hasta los 20**; Wuolah entre los 4 y los 12 años."]),
    (7, "s2"): ([], ["Circulación esplénica: profesora **en el hombre es abierta** (la sangre se vierte a los cordones); Wuolah dice que puede ser abierta o cerrada (directa a los sinusoides) y, si coexisten, «mixta»."]),
    (7, "s4"): (["Los **cordones de Billroth** contienen también **linfocitos T y B, células plasmáticas, células dendríticas y plaquetas**, además de hematíes, macrófagos y células reticulares."], []),
    # Bloque 4 · respiratorio
    (8, "s2"): (["Las **células basales** del epitelio respiratorio dan lugar a **todos los tipos celulares salvo las del SNED**."],
                ["Microvellosidades de las células en cepillo: profesora **cortas** («cerdas de un cepillo»); Wuolah largas."]),
    (8, "s3"): ([], ["Batido ciliar en los senos paranasales: profesora **hacia la nasofaringe**; Wuolah hacia las fosas nasales, como excepción."]),
    (8, "s4"): (["La secreción de las **glándulas de Bowman** lleva también **lactoferrina e IgA**, además de las proteínas fijadoras del olor y la lisozima.",
                 "Cada **fila olfatoria** reúne unos **20 axones amielínicos** de células olfatorias vecinas."], []),
    (9, "s1"): (["La **submucosa traqueal** es conjuntivo **denso** con abundantes **fibras elásticas**."],
                ["Unión entre los cartílagos traqueales: profesora **tejido fibroelástico**; Wuolah fibrocartílago."]),
    (9, "s2"): ([], ["Lobulillo y acino: profesora **lobulillo = territorio de un bronquiolo primario** y **acino = territorio de un bronquiolo terminal**; Wuolah lobulillo = bronquiolo terminal y acino = bronquiolo respiratorio."]),
    (9, "s4"): (["La proteína de las **células club (de Clara)** es además **antiinflamatoria** y protege el epitelio bronquiolar. Estas células secretan también **monómeros de mucina** y **proteínas del surfactante**."], []),
    (9, "s5"): (["Los **≈ 300 millones de alvéolos** suman una superficie de intercambio de **≈ 75 m²**."], []),
    # Bloque 5 · digestivo
    (11, "s3"): (["Las **glándulas esofágicas propiamente dichas** (de la submucosa) tienen secreción **mucosa y seromucosa**."],
                 ["Tránsito esofágico: profesora **≈ 5 segundos**; Wuolah ≈ 15 s (50 mm/s)."]),
    (11, "s4"): (["Las **glándulas cardiales del esófago distal** ayudan, además, a **neutralizar el ácido del reflujo** gastroesofágico."], []),
    (11, "s5"): (["En el **antro**, las células mucosas superficiales tienen el **núcleo más aplanado** que en el cuerpo y el fundus."], []),
    (12, "s2"): (["Entre las hormonas de las enteroendocrinas del intestino delgado está también la **colecistoquinina (CCK)**.",
                  "El **glucocáliz** del enterocito lleva también **lipasas y fosfatasa ácida**, y protege a las microvellosidades de la **autodigestión**."], []),
    (12, "s6"): (["Conducto anal **proximal**: en la submucosa, el **plexo hemorroidal interno**. Conducto anal **distal**: el **plexo hemorroidal externo**.",
                  "Las glándulas que desembocan en los **senos anales** son **mucosas**; en el conducto anal distal aparecen **sudoríparas y sebáceas**.",
                  "A la altura de las **columnas de Morgagni**, la **longitudinal externa** desaparece y la sustituye conjuntivo denso."], []),
    # Bloque 6 · hígado y páncreas
    (13, "s1"): (["La **arteria hepática** es rama del **tronco celíaco**."], []),
    (13, "s2"): (["Las **células de Ito activadas** producen fibras de reticulina y también **fibras de colágeno**, y así participan en la **fibrosis**."], []),
    (13, "s3"): ([], ["Tamaño del hepatocito: profesora **25–40 µm**; Wuolah 15–40 µm."]),
    (13, "s4"): (["El conjuntivo del **espacio porta** es de **colágeno tipo I**, con **linfáticos y fibras nerviosas**."], []),
    (14, "s2"): (["Las **células acinares** del páncreas se unen por **uniones ocluyentes** y también por **desmosomas**."], []),
    (14, "s4"): ([], ["Volumen diario de jugo pancreático: profesora **≈ 100 ml/día**; Wuolah ≈ 1200 ml/día. El doc avisa: conviene confirmarlo con ella, porque los libros dan ≈ 1,2 L/día y la cifra de clase puede haberse oído mal."]),
    # Bloque 7 · masculino
    (15, "s3"): ([], ["Medidas del testículo: profesora **4 × 3 × 3 cm**; Wuolah 5 × 3 × 3 cm."]),
    (15, "s4"): ([], ["Longitud del túbulo seminífero: profesora **≈ 60 cm**; Wuolah 70 cm."]),
    (16, "s2"): (["La espermatogénesis dura **≈ 64–74 días**."], []),
    (17, "s4"): (["Las **células principales** del epidídimo secretan **ácido siálico**, como las glándulas de Cowper.",
                  "El epidídimo **fagocita** además los **cuerpos residuales** que no fagocitaron las Sertoli y **reabsorbe** el líquido que no se reabsorbió en los conductillos eferentes."], []),
    (18, "s2"): (["El cordón espermático lleva también la **arteria cremastérica**."], []),
    (18, "s3"): ([], ["Luz del conducto deferente: profesora **1–2 mm**; Wuolah 3–4 mm."]),
    (19, "s1"): (["La **altura de las células cilíndricas** de la vesícula seminal **aumenta con la testosterona**."],
                 ["Longitud del tubo de la vesícula seminal: profesora **≈ 15 cm, plegado en 4 × 2 cm**; Wuolah 40 cm, plegado en 4 cm."]),
    (19, "s2"): (["La próstata tiene **40–50 glándulas** que desembocan por separado en los **senos prostáticos** de la uretra.",
                  "Las **glándulas periféricas (principales)** son **≈ 70 %** del componente glandular."], []),
    (19, "s3"): (["El epitelio prostático tiene también **células del SNED**, además de las basales y las cilíndricas."], []),
    (20, "s5"): (["La **vena dorsal profunda** del pene drena al **plexo prostático** y la **dorsal superficial**, a las **safenas**. La **arteria dorsal** irriga la piel, el conjuntivo y el glande."], []),
    (20, "s6"): ([], ["Espermatozoides inmóviles en el semen: profesora **≈ 25 %**; Wuolah 20 %."]),
    # Bloque 8 · femenino
    (21, "s3"): (["En la **corteza ovárica** hay **células musculares lisas** que rodean los folículos."], []),
    (21, "s4"): (["El **folículo primordial no crece** porque **no tiene receptores de FSH ni de LH**."], []),
    (21, "s6"): ([], ["Uniones entre las células de la granulosa: profesora **nexos (uniones gap), nunca ocluyentes**; Wuolah desmosomas. Las dos fuentes coinciden en que **no hay barrera hematofolicular**."]),
}


def main():
    puestos = 0
    for n in sorted({t for t, _ in A}):
        ruta = os.path.join(RAIZ, "estudio", "histo21", "tema-%02d.json" % n)
        crudo = open(ruta, encoding="utf-8").read()
        tema = json.loads(crudo)
        if json.dumps(tema, ensure_ascii=False, indent=1) != crudo:
            # tema-14 tiene un formato compacto a mano: se le ponen los
            # recuadros a mano para no reescribir el archivo entero.
            print("  tema-%02d: formato propio, recuadros puestos a mano" % n)
            continue
        secs = {s["id"]: s for s in tema["secciones"]}
        for s in tema["secciones"]:
            s["bloques"] = [b for b in s["bloques"] if b.get("wuolah") != MARCA]
        for (t, sid), (datos, contra) in A.items():
            if t != n:
                continue
            bl = secs[sid]["bloques"]
            if datos:
                bl.append({"tipo": "libro", "titulo": T_DATOS, "wuolah": MARCA,
                           "md": "\n".join("- " + d for d in datos)})
                puestos += 1
            if contra:
                bl.append({"tipo": "libro", "titulo": T_CONTRA, "wuolah": MARCA,
                           "md": "\n".join("- " + c for c in contra)})
                puestos += 1
        with open(ruta, "w", encoding="utf-8") as f:
            json.dump(tema, f, ensure_ascii=False, indent=1)
    print("recuadros de ampliación externa: %d en %d temas" % (puestos, len({t for t, _ in A})))


if __name__ == "__main__":
    main()
