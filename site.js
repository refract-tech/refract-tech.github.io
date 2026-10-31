// Lingua del sito: italiano o inglese, scelta salvata nel browser. Ogni testo esiste in due elementi, .it e .en.
(function () {
  var KEY = 'refract_lang';
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(l) { try { localStorage.setItem(KEY, l); } catch (e) {} }
  function apply(l) {
    document.documentElement.setAttribute('lang', l);
    var b = document.getElementById('lang');
    if (b) b.textContent = l === 'it' ? 'EN' : 'IT';
    var t = document.querySelector('meta[name="title-' + l + '"]');
    if (t) document.title = t.getAttribute('content');
  }
  if (document.documentElement.hasAttribute('data-lang-fixed')) return;   // pagine in una sola lingua (studi)
  var saved = get();
  apply(saved === 'en' || saved === 'it' ? saved : 'it');
  document.addEventListener('DOMContentLoaded', function () {
    apply(document.documentElement.getAttribute('lang'));
    var b = document.getElementById('lang');
    if (b) b.addEventListener('click', function () {
      var l = document.documentElement.getAttribute('lang') === 'it' ? 'en' : 'it';
      set(l); apply(l);
    });
  });
})();

// Tema giorno/notte: scuro di default (lo stile nero-oro del sito; una pagina può chiedere il chiaro con
// data-theme-default="light"), scelta salvata nel browser. site.js e' caricato nel
// <head>: il tema si applica prima del disegno della pagina, senza lampeggi.
(function () {
  var KEY = 'refract_theme';
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(t) { try { localStorage.setItem(KEY, t); } catch (e) {} }
  function apply(t) {
    document.documentElement.setAttribute('data-theme', t);
    var b = document.getElementById('theme');
    if (!b) return;
    b.textContent = t === 'dark' ? '☀' : '☾';
    var it = document.documentElement.getAttribute('lang') !== 'en';
    var l = t === 'dark' ? (it ? 'Tema chiaro' : 'Light theme') : (it ? 'Tema scuro' : 'Dark theme');
    b.setAttribute('aria-label', l); b.setAttribute('title', l);
  }
  var saved = get();
  var def = document.documentElement.getAttribute('data-theme-default') === 'light' ? 'light' : 'dark';   // gli studi partono chiari
  apply(saved === 'light' || saved === 'dark' ? saved : def);
  document.addEventListener('DOMContentLoaded', function () {
    apply(document.documentElement.getAttribute('data-theme'));
    var b = document.getElementById('theme');
    if (b) b.addEventListener('click', function () {
      var t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      set(t); apply(t);
    });
  });
})();
