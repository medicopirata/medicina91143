/* Pase de entrada: estas páginas solo se abren viniendo del inicio.
 *
 * La bitácora (index.html) entrega un pase cuando el usuario abre una zona
 * a la que tiene acceso. Aquí se comprueba: sin pase válido, de vuelta al
 * inicio. Así un enlace suelto que circule por ahí no abre nada.
 *
 * El pase vive en localStorage y no en sessionStorage porque el panel abre
 * las plataformas con target="_blank", y una pestaña nueva no hereda el
 * sessionStorage: con él, todo rebotaría al inicio. A cambio caduca en unas
 * horas, las que dura una sesión de estudio.
 *
 * Esto es fricción, no seguridad: quien abra la consola del navegador puede
 * escribirse el pase a mano. Sirve para que un enlace compartido no funcione,
 * no para guardar nada que de verdad no pueda verse. Para eso haría falta
 * servir los archivos detrás de una autenticación de verdad, y GitHub Pages
 * los publica abiertamente.
 */
(function () {
  var CLAVE = "mp_pase";
  var HORAS = 8;
  var INICIO = "index.html";

  try {
    var crudo = localStorage.getItem(CLAVE);
    if (crudo) {
      var pase = JSON.parse(crudo);
      if (pase && pase.t && (Date.now() - pase.t) < HORAS * 3600 * 1000) return;
    }
  } catch (e) { /* almacenamiento bloqueado: se trata como si no hubiera pase */ }

  // Sin pase válido: de vuelta a la puerta, sin dejar rastro en el historial.
  location.replace(INICIO);
})();
