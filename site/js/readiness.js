/* AI Readiness Check: fixed, explainable rules. Runs in the browser only; nothing is sent. */
(function () {
  var form = document.querySelector('[data-readiness]');
  if (!form) return;
  var $ = function (id) { return document.getElementById(id); };
  var PROGRAMMES = {
    readiness: { title: 'Institutional AI Readiness workshop', link: 'ai-readiness.html', page: 'contact.html?for=' },
    educators: { title: 'Practical AI for Educators', link: 'educators.html' },
    students: { title: 'AI Projects & Portfolios', link: 'student-projects.html' },
    curriculum: { title: 'Curriculum & assessment support', link: 'higher-education.html' },
  };

  function val(name) { var el = form.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ''; }

  function decide(a) {
    var why = [], pick;
    if (a.audience === 'leaders' || a.audience === 'all' || a.policy === 'no' && a.goal === 'policy') {
      pick = 'readiness';
      why.push(a.audience === 'leaders' || a.audience === 'all'
        ? 'You want to reach leadership or everyone at once, so agreeing priorities together comes first.'
        : 'Your goal is safe use and there is no policy yet, so leaders should agree the ground rules first.');
    } else if (a.goal === 'curriculum') {
      pick = a.type === 'school' ? 'educators' : 'curriculum';
      why.push(a.type === 'school'
        ? 'Bringing AI into a school curriculum starts with teachers who are confident using it themselves.'
        : 'You want AI inside courses, so learning outcomes, session plans and assessment come first.');
    } else if (a.audience === 'students' || a.goal === 'skills') {
      pick = a.type === 'school' ? 'educators' : 'students';
      why.push(a.type === 'school'
        ? 'For school students, AI should arrive gradually through trained teachers, so teachers come first.'
        : 'You want students to show job-ready skills, which is what a documented project and portfolio provide.');
    } else {
      pick = 'educators';
      why.push('Your first audience is teachers or faculty, and the quickest value comes from their own weekly tasks.');
    }
    if (a.familiar === 'new') why.push('Most participants are new to AI, so sessions should start from plain-language foundations.');
    if (a.familiar === 'regular') why.push('Many already use AI, so sessions can move quickly to review, verification and better practice.');

    var todo = [];
    if (a.policy !== 'yes') todo.push('Basic rules for AI use: what data must never be entered, and who reviews outputs');
    if (a.devices !== 'good') todo.push(a.devices === 'poor'
      ? 'Device and internet access, or an offline-friendly format for the first sessions'
      : 'How shared devices will be scheduled during sessions');
    if (a.mode !== 'online') todo.push('A room, a projector and a coordinator on campus');
    if (a.mode !== 'campus') todo.push('A video platform and how participants will share their work');
    todo.push(pick === 'students' ? 'Which course and cohort runs first, and how projects will be credited' : 'Which subjects or departments go first, and how many participants');
    if (a.when === 'month') todo.push('Dates now: a programme within a month needs a confirmed schedule this week');
    if (a.when === 'exploring') todo.push('Who will own AI adoption once you decide to go ahead');
    return { pick: pick, why: why, todo: todo };
  }

  function render() {
    var a = {};
    ['type', 'audience', 'familiar', 'goal', 'devices', 'policy', 'mode', 'when'].forEach(function (k) { a[k] = val(k); });
    var r = decide(a), p = PROGRAMMES[r.pick];
    $('r-title').innerHTML = '<a href="' + p.link + '">' + p.title + '</a>';
    $('r-why').textContent = r.why.join(' ');
    $('r-decide').innerHTML = r.todo.map(function (t) { return '<li>' + t + '</li>'; }).join('');
    var seg = a.type === 'school' ? 'A school' : a.type === 'college' ? 'A college or university' : 'Educator or student training';
    $('r-cta').href = 'contact.html?for=' + encodeURIComponent(seg);
  }
  form.addEventListener('change', render);
  render();
})();
