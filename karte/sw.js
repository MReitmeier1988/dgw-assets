/* DGW Visitenkarte - Service Worker
   Zweck: die Karte muss im Termin auch ohne Netz da sein.
   Strategie: Programmhuelle beim Installieren einmal ablegen, danach
   zuerst aus dem Speicher ausliefern und im Hintergrund auffrischen.
   Anmeldung und Verzeichnis laufen bewusst nie ueber den Speicher. */

var CACHE = "dgw-karte-v1";
var HUELLE = ["./", "./index.html", "./manifest.webmanifest",
              "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(HUELLE); })
      .catch(function(){ /* einzelne fehlende Datei darf die Installation nicht kippen */ })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(namen){
      return Promise.all(namen.map(function(n){
        return (n === CACHE) ? null : caches.delete(n);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var u = e.request.url;
  if (e.request.method !== "GET") return;
  /* Anmeldung, Graph und Stammdaten immer direkt aus dem Netz */
  if (u.indexOf("login.microsoftonline.com") > -1 ||
      u.indexOf("graph.microsoft.com") > -1 ||
      u.indexOf("karten.json") > -1) return;

  e.respondWith(
    caches.match(e.request).then(function(treffer){
      var netz = fetch(e.request).then(function(antwort){
        if (antwort && antwort.status === 200 && antwort.type === "basic"){
          var kopie = antwort.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, kopie); });
        }
        return antwort;
      }).catch(function(){ return treffer; });
      return treffer || netz;
    })
  );
});
