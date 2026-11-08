/* Menu: dropdowns on desktop, one expandable panel on phones. */
(function () {
  var nav = document.getElementById('site-nav');
  var toggle = document.querySelector('.menu-toggle');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.querySelector('span').textContent = open ? 'Close' : 'Menu';
    });
  }
  function closeAll(except) {
    document.querySelectorAll('.nav li.open').forEach(function (li) {
      if (li !== except) { li.classList.remove('open'); li.querySelector('button.top').setAttribute('aria-expanded', 'false'); }
    });
  }
  document.querySelectorAll('.nav button.top').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var li = btn.parentElement;
      var open = !li.classList.contains('open');
      closeAll(li);
      li.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
  document.addEventListener('click', function () { closeAll(null); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(null); });

  // Copy-to-clipboard for the email address
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var text = b.getAttribute('data-copy');
      var done = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
    });
  });
})();
