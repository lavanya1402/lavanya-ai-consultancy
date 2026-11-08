/*
 * Lavanya AI Consultancy — website enquiry form script.
 * Add to any page that has <form data-enquiry-form> … </form>.
 *
 * It: checks the fields, locks the button while sending, sends once with a
 * unique key (so retries never create duplicates), shows "saved" only when
 * the server confirms it, and keeps the visitor's text if sending fails.
 * It also remembers the campaign (utm_…) a visitor arrived with.
 */
(function () {
  'use strict';

  // Paste your Apps Script web app URL here after deploying Code.gs.
  var ENDPOINT = 'PASTE-YOUR-WEB-APP-URL-HERE';
  var TIMEOUT_MS = 20000;

  // ---- remember where the visitor came from (first landing in this visit)
  var CAMPAIGN_KEY = 'lai_campaign';
  function readCampaign() {
    var params = new URLSearchParams(window.location.search);
    var fresh = {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      page: window.location.pathname,
      referrer: document.referrer || '',
    };
    try {
      var saved = JSON.parse(sessionStorage.getItem(CAMPAIGN_KEY) || 'null');
      if (saved && !fresh.utm_campaign) return saved;
      sessionStorage.setItem(CAMPAIGN_KEY, JSON.stringify(fresh));
    } catch (e) { /* storage blocked: use this page's values */ }
    return fresh;
  }
  var campaign = readCampaign();

  function newKey() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }

  function track(name, params) {
    // Sends an event to Google Analytics 4 if it is installed on the page.
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  }

  // Count WhatsApp, email and booking clicks as clicks (not as messages or bookings).
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('wa.me') !== -1) track('whatsapp_click', { link_url: href });
    else if (href.indexOf('mailto:') === 0) track('email_click', {});
    else if (a.hasAttribute('data-booking-link')) track('booking_link_click', {});
  });

  var FIELD_MESSAGES = {
    name: 'Please enter your name',
    email: 'Enter a full email address, like name@school.edu',
    organisation: 'Please enter your institution or company',
    country: 'Please enter your country',
    requirement: 'Tell us briefly what you need',
  };

  function setFieldError(form, name, message) {
    var input = form.elements[name];
    if (!input) return;
    var id = 'err-' + name;
    var old = form.querySelector('#' + id);
    if (old) old.remove();
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', id);
      var span = document.createElement('span');
      span.id = id;
      span.className = 'field-error';
      span.textContent = message;
      input.insertAdjacentElement('afterend', span);
    } else {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    }
  }

  function showBanner(form, kind, html) {
    var box = form.querySelector('[data-form-message]');
    if (!box) {
      box = document.createElement('div');
      box.setAttribute('data-form-message', '');
      form.insertBefore(box, form.firstChild);
    }
    box.className = 'form-message form-message--' + kind;
    box.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    box.innerHTML = html;
    box.hidden = false;
    box.setAttribute('tabindex', '-1');
    box.focus();
  }

  function validate(form) {
    var bad = [];
    Object.keys(FIELD_MESSAGES).forEach(function (name) {
      var el = form.elements[name];
      if (!el) return;
      var ok = el.value.trim().length > 0 && (name !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim()));
      if (name === 'requirement' && el.value.trim().length < 5) ok = false;
      setFieldError(form, name, ok ? '' : FIELD_MESSAGES[name]);
      if (!ok) bad.push(name);
    });
    return bad;
  }

  function escapeText(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function init(form) {
    var button = form.querySelector('[type="submit"]');
    var buttonLabel = button ? button.textContent : '';
    var startedAt = Date.now();
    // One key per filled-in form. A retry after a timeout reuses it, so the server stores it once.
    var submissionKey = newKey();

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (form.getAttribute('aria-busy') === 'true') return;

      var bad = validate(form);
      if (bad.length) {
        showBanner(form, 'error', 'Please fix ' + bad.length + ' field' + (bad.length > 1 ? 's' : '') + ' before sending.');
        form.elements[bad[0]].focus();
        return;
      }

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      data.marketing = !!(form.elements.marketing && form.elements.marketing.checked);
      data.submissionKey = submissionKey;
      data.source = data.source || 'website';
      data.utm_source = campaign.utm_source;
      data.utm_medium = campaign.utm_medium;
      data.utm_campaign = campaign.utm_campaign;
      data.page = campaign.page;
      data.referrer = campaign.referrer;
      if (Date.now() - startedAt < 2500) data.website = 'too-fast'; // bots fill forms instantly

      form.setAttribute('aria-busy', 'true');
      if (button) { button.disabled = true; button.textContent = 'Sending…'; }

      var controller = window.AbortController ? new AbortController() : null;
      var timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;

      // text/plain keeps this a "simple" request, which Apps Script accepts from any site.
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data),
        signal: controller ? controller.signal : undefined,
      })
        .then(function (res) { return res.json(); })
        .then(function (out) {
          if (out && out.ok && out.id) {
            track('generate_lead', { form: data.source, segment: data.segment || '' });
            var first = escapeText(String(data.name).split(' ')[0]);
            form.innerHTML =
              '<div class="form-message form-message--success" role="status" tabindex="-1">' +
              '<h3>Thank you, ' + first + '. Your requirement is with us.</h3>' +
              '<p>Reference <strong>' + escapeText(out.id) + '</strong>. A copy is on its way to ' +
              escapeText(data.email) + '. We reply within two working days.</p></div>';
            form.firstChild.focus();
            return;
          }
          if (out && out.error === 'invalid' && out.fields) {
            out.fields.forEach(function (f) { setFieldError(form, f, FIELD_MESSAGES[f] || 'Please check this field'); });
            throw new Error('invalid');
          }
          throw new Error((out && out.error) || 'unknown');
        })
        .catch(function (err) {
          var msg = err && err.message === 'invalid'
            ? 'Please check the highlighted fields and try again.'
            : '<strong>We could not send your enquiry.</strong> It has not been received yet. ' +
              'Your text is still here, so nothing is lost. Please try again, or reach us by ' +
              '<a href="mailto:lavanya.sriva@gmail.com">email</a> or ' +
              '<a href="https://wa.me/919821294499">WhatsApp</a>.';
          showBanner(form, 'error', msg);
        })
        .then(function () {
          if (timer) clearTimeout(timer);
          if (document.body.contains(form) && form.querySelector('[type="submit"]')) {
            form.removeAttribute('aria-busy');
            if (button) { button.disabled = false; button.textContent = buttonLabel || 'Send'; }
          }
        });
    });
  }

  document.querySelectorAll('form[data-enquiry-form]').forEach(init);
})();
