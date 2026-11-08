/* AI Employees page: simulated receptionist demo and ROI calculator.
   The demo is scripted with fictional businesses; nothing is sent anywhere. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  /* ------------------------------------------------------------ demo */
  var BIZ = {
    clinic: {
      name: 'Sunrise Dental Clinic', thing: 'appointment', slot: 'tomorrow at 11:30 am with Dr Mehra',
      price: 'A check-up and cleaning is ₹1,200. Root canal treatment starts at ₹6,500 after an X-ray.',
      policy: 'clinic price list', hours: 'Mon–Sat, 10 am to 7 pm',
      samples: ['Can I book a cleaning tomorrow?', 'How much is a root canal?', 'I need to move my appointment to Friday', 'My filling hurts after yesterday\'s visit, I want a refund'],
    },
    coaching: {
      name: 'BrightPath Coaching Institute', thing: 'demo class', slot: 'Saturday at 4 pm (Class 10 Science)',
      price: 'Class 10 Science is ₹2,500 a month, or ₹26,000 for the year with notes and tests.',
      policy: 'fee structure', hours: 'Mon–Sat, 3 pm to 8 pm',
      samples: ['Can my son join a demo class this week?', 'What are the fees for Class 10 science?', 'Please change our demo class to Sunday', 'The teacher was rude, I want my fees back'],
    },
    agency: {
      name: 'Northstar Insurance Agency', thing: 'call with an advisor', slot: 'Thursday at 3 pm with Ms Kapoor',
      price: 'Family health cover for two adults and two children starts at about ₹28,000 a year, depending on age and cover.',
      policy: 'product sheet', hours: 'Mon–Fri, 9:30 am to 6 pm',
      samples: ['I want to speak to someone about health insurance', 'How much is family health cover?', 'Can we reschedule my call to Monday?', 'My claim was rejected, this is unacceptable'],
    },
  };

  function intent(text) {
    var t = text.toLowerCase();
    if (/(refund|money back|complain|rude|unacceptable|rejected|hurts|pain|angry|worst|bad experience)/.test(t)) return 'escalate';
    if (/(reschedul|move|change|postpone|shift|cancel)/.test(t)) return 'reschedule';
    if (/(price|cost|fee|fees|charge|how much|rate|quote)/.test(t)) return 'price';
    if (/(open|timing|hours|close|what time|address|where are you|location)/.test(t)) return 'hours';
    if (/(book|appointment|slot|available|demo|join|speak|call|visit|meet|tomorrow|today|this week)/.test(t)) return 'book';
    return 'other';
  }

  function plan(b, kind, text) {
    switch (kind) {
      case 'book': return {
        steps: ['Reads the message: wants to book a ' + b.thing + '.', 'Checks the calendar for the next free slot.', 'Holds ' + b.slot + ' and asks for a name and phone number.', 'Will send a reminder the day before.'],
        reply: 'Thank you for contacting ' + b.name + '. I can book your ' + b.thing + ' for ' + b.slot + '. May I have your name and phone number to confirm?',
        status: 'auto', label: 'Replied automatically',
      };
      case 'price': return {
        steps: ['Reads the message: asking about price.', 'Looks up the answer in the ' + b.policy + ' (your document, not a guess).', 'Adds an offer to book, to turn the question into a visit.'],
        reply: b.price + ' Would you like me to book a ' + b.thing + '?',
        status: 'auto', label: 'Replied automatically',
      };
      case 'reschedule': return {
        steps: ['Reads the message: wants to change an existing booking.', 'Finds the booking and checks the requested day.', 'Offers the closest free time and updates the calendar once confirmed.'],
        reply: 'No problem. The closest free time is at the same hour on the day you asked. Shall I move your ' + b.thing + ' there? I\'ll update your reminder too.',
        status: 'auto', label: 'Replied automatically',
      };
      case 'escalate': return {
        steps: ['Reads the message: a complaint or refund request.', 'Rule: refunds and complaints always go to the owner.', 'Drafts a calm reply and alerts the owner with the full conversation.', 'Waits. Nothing is promised until the owner approves.'],
        reply: 'I\'m sorry to hear this. I\'ve passed your message to our manager, who will call you today. Your reference is REF-1042.',
        status: 'wait', label: 'Waiting for the owner\'s approval',
      };
      case 'hours': return {
        steps: ['Reads the message: asking about timings.', 'Looks up opening hours in the business profile.', 'Answers and offers to book.'],
        reply: 'We\'re open ' + b.hours + '. Would you like me to book a ' + b.thing + ' for you?',
        status: 'auto', label: 'Replied automatically',
      };
      default: return {
        steps: ['Reads the message: not something it has an approved answer for.', 'Rule: when unsure, don\'t guess.', 'Shares opening hours and forwards the question to the team.'],
        reply: 'Thanks for your message. Our team will reply shortly. We\'re open ' + b.hours + '.',
        status: 'handoff', label: 'Handed to the team',
      };
    }
  }

  var running = 0;
  function run(text) {
    var bizKey = $('d-biz').value, b = BIZ[bizKey], token = ++running;
    var chat = $('d-chat'), trace = $('d-trace');
    var p = plan(b, intent(text), text);
    chat.innerHTML = '<p class="bubble in"><span>Customer</span>' + esc(text) + '</p>';
    trace.innerHTML = '';
    var i = 0;
    function next() {
      if (token !== running) return;
      if (i < p.steps.length) {
        var li = document.createElement('li');
        li.textContent = p.steps[i++];
        trace.appendChild(li);
        setTimeout(next, reduce ? 0 : 650);
      } else {
        chat.insertAdjacentHTML('beforeend', '<p class="bubble out"><span>AI Receptionist · ' + esc(b.name) + '</span>' + esc(p.reply) + '</p>' +
          '<p class="verdict verdict--' + p.status + '">' + esc(p.label) + '</p>');
      }
    }
    setTimeout(next, reduce ? 0 : 300);
  }

  function samples() {
    var b = BIZ[$('d-biz').value], box = $('d-samples');
    box.innerHTML = '';
    b.samples.forEach(function (s, idx) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'chip'; btn.textContent = s;
      btn.addEventListener('click', function () { run(s); });
      box.appendChild(btn);
      if (idx === 0 && !box.dataset.started) { box.dataset.started = '1'; }
    });
  }

  if (document.querySelector('[data-demo]')) {
    $('d-biz').addEventListener('change', function () { samples(); run(BIZ[$('d-biz').value].samples[0]); });
    $('d-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = $('d-input').value.trim();
      if (v) { run(v); $('d-input').value = ''; }
    });
    samples();
    run(BIZ.clinic.samples[0]);
  }

  /* ------------------------------------------------------------ ROI */
  var form = $('roi-form');
  if (form) {
    var SYM = { INR: '₹', USD: '$', AED: 'AED ', SGD: 'S$' };
    var LOCALE = { INR: 'en-IN', USD: 'en-US', AED: 'en-AE', SGD: 'en-SG' };
    var DEFAULT_RATE = { INR: 300, USD: 25, AED: 60, SGD: 30 };
    var lastCur = $('r-cur').value;
    function calc() {
      var cur = $('r-cur').value;
      if (cur !== lastCur) { $('r-rate').value = DEFAULT_RATE[cur]; lastCur = cur; }
      var hours = Math.max(0, parseFloat($('r-hours').value) || 0);
      var rate = Math.max(0, parseFloat($('r-rate').value) || 0);
      var share = parseInt($('r-share').value, 10) / 100;
      $('r-share-out').textContent = Math.round(share * 100) + '%';
      var yearHours = hours * 52 * share;
      var monthHours = yearHours / 12;
      var value = yearHours * rate;
      $('r-hours-month').textContent = Math.round(monthHours).toLocaleString('en-IN');
      $('r-cost-year').textContent = SYM[cur] + Math.round(value).toLocaleString(LOCALE[cur]);
      var fte = yearHours / (40 * 48);
      $('r-note').textContent = fte >= 0.25
        ? 'That is roughly ' + (fte >= 1 ? fte.toFixed(1) + ' full-time staff members’' : Math.round(fte * 100) + '% of one full-time staff member’s') + ' working year, freed for work that needs a person.'
        : 'A small but steady saving. Usually one AI employee is enough to start.';
    }
    form.addEventListener('input', calc);
    form.addEventListener('change', calc);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    calc();
  }
})();
