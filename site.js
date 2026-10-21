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
