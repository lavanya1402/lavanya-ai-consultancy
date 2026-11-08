"""Builds the Lavanya AI Consultancy website into site/.

Every page shares one header, menu and footer. Edit page copy in pages/*.html
(body content only) and the menu below, then run:  python3 build.py
"""
from pathlib import Path

ROOT = Path(__file__).parent
SITE = ROOT / "site"
PAGES = ROOT / "pages"
DOMAIN = "https://lavanya-ai-consultancy.vercel.app"  # change when the domain is live
EMAIL = "lavanya.sriva@gmail.com"

# (file, title, description, menu key)
PAGE_LIST = [
    ("index", "Lavanya AI Consultancy", "Practical AI learning for schools, colleges, universities and educators, and AI employees for businesses. AI drafts, a human decides.", ""),
    ("businesses", "AI Employees & Business Automation", "Your business, your AI workforce: AI receptionist, email, sales, research, operations and education assistants, working 24/7 with a person approving what matters.", "ai"),
    ("schools", "AI for Schools", "Teacher AI foundations, assessment support and leadership orientation for schools, with a teacher reviewing every output.", "who"),
    ("higher-education", "AI for Colleges & Universities", "Student capability, faculty development and AI curriculum support for colleges and universities.", "who"),
    ("educators", "AI for Educators", "Learn AI through tasks you already do as an educator: lesson resources, question papers, rubrics and verification.", "who"),
    ("student-projects", "Student AI Projects & Portfolios", "A guided journey for nontechnical students: from AI foundations to a documented project, a GitHub portfolio and a viva.", "prog"),
    ("programmes", "Programmes & Workshops", "Compare AI Readiness, Practical AI for Educators, AI Projects & Portfolios and Ongoing Mentoring.", "prog"),
    ("ai-readiness", "AI Readiness Check", "Eight short questions that suggest where your institution could start with AI, and what to decide first.", "prog"),
    ("applied-ai-lab", "Applied AI Lab", "AI applications built by Lavanya Srivastava: education tools, document intelligence, agents, evaluation and voice.", "work"),
    ("teaching", "Teaching & Learner Outcomes", "How Lavanya teaches AI to nontechnical learners, and how learning outcomes are assessed and reported.", "work"),
    ("about", "About Lavanya", "Founder story, qualifications, experience and approach of Lavanya Srivastava, founder of Lavanya AI Consultancy.", "about"),
    ("resources", "Resources & Insights", "Free checklists and templates for educators and students working with AI.", "res"),
    ("contact", "Contact", "Tell us about your institution and your AI learning goals.", "contact"),
    ("singapore", "Meet Lavanya in Singapore", "Lavanya Srivastava at Education 2.0, Singapore, 2–4 December 2026.", ""),
    ("privacy", "Privacy & Cookies", "How Lavanya AI Consultancy handles information you share through this website.", ""),
    ("terms", "Terms of Use", "Conditions for using this website and our services.", ""),
    ("cancellation", "Cancellation & Refunds", "How cancellations, rescheduling and refunds work for our programmes.", ""),
]

MENU = [
    ("who", "Who We Help", [
        ("schools", "Schools", "Principals, owners and coordinators"),
        ("higher-education", "Colleges & Universities", "Deans, departments and faculty cells"),
        ("educators", "Educators", "Teachers and faculty members"),
    ]),
    ("ai", "AI Employees", None),
    ("prog", "Programmes", [
        ("student-projects", "Student Projects & Portfolios", "Our signature student programme"),
        ("programmes", "Programmes & Workshops", "Compare every offering"),
        ("ai-readiness", "AI Readiness Check", "Eight questions, two minutes"),
    ]),
    ("work", "Our Work", [
        ("applied-ai-lab", "Applied AI Lab", "Applications we have built"),
        ("teaching", "Teaching & Learner Outcomes", "How learning is taught and assessed"),
    ]),
    ("about", "About", None),
    ("res", "Resources", None),
]


def nav(current, key):
    items = []
    for k, label, sub in MENU:
        if sub is None:
            href = {"about": "about.html", "res": "resources.html", "ai": "businesses.html"}[k]
            cur = ' aria-current="page"' if key == k else ""
            items.append(f'<li><a href="{href}"{cur}>{label}</a></li>')
            continue
        cur_attr = ' aria-current="page"'
        links = "".join(
            f'<li><a href="{f}.html"{cur_attr if current == f else ""}>{t}<small>{d}</small></a></li>'
            for f, t, d in sub
        )
        items.append(
            f'<li><button class="top" type="button" aria-expanded="false" aria-controls="sub-{k}">{label}</button>'
            f'<ul class="sub" id="sub-{k}">{links}</ul></li>'
        )
    return (
        '<nav class="nav" id="site-nav" aria-label="Main">'
        f'<ul>{"".join(items)}</ul>'
        '<a class="btn btn--gold nav-cta" href="contact.html">Discuss your requirement</a></nav>'
    )


HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{domain}/assets/lavanya.jpg">
<link rel="icon" href="assets/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,600&family=Jost:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/site.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <div class="wrap">
    <a class="brand" href="index.html"><img src="assets/logo.jpg" alt="" width="42" height="42"><span>Lavanya AI<small>Consultancy</small></span></a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><span>Menu</span></button>
    {nav}
  </div>
</header>
<main id="main">
"""

FOOT = """</main>
<footer class="site-foot">
  <div class="wrap">
    <div class="cols">
      <div class="stack">
        <p class="brandline">Lavanya AI Consultancy</p>
        <p>Practical AI learning for education, and AI employees for business. AI drafts; a human decides.</p>
        <p>Email: <span style="color:var(--on-dark)">{email}</span> <button type="button" class="btn btn--line" style="min-height:32px;padding:.2rem .8rem;font-size:.8rem" data-copy="{email}">Copy</button></p>
      </div>
      <div><h4>Who we help</h4><ul>
        <li><a href="schools.html">Schools</a></li>
        <li><a href="higher-education.html">Colleges &amp; Universities</a></li>
        <li><a href="educators.html">Educators</a></li>
        <li><a href="student-projects.html">Student Projects</a></li>
        <li><a href="businesses.html">AI Employees for Business</a></li></ul></div>
      <div><h4>Explore</h4><ul>
        <li><a href="programmes.html">Programmes</a></li>
        <li><a href="applied-ai-lab.html">Applied AI Lab</a></li>
        <li><a href="teaching.html">Teaching &amp; Outcomes</a></li>
        <li><a href="about.html">About Lavanya</a></li>
        <li><a href="resources.html">Resources</a></li>
        <li><a href="contact.html">Contact</a></li></ul></div>
      <div><h4>Elsewhere</h4><ul>
        <li><a href="https://www.linkedin.com/in/lavanya-srivastava/">LinkedIn</a></li>
        <li><a href="https://github.com/lavanya1402">GitHub</a></li>
        <li><a href="https://lavanya-portfolio-azure.vercel.app/">Project portfolio</a></li></ul></div>
    </div>
    <div class="base">
      <span>© 2026 Lavanya AI Consultancy</span>
      <span><a href="privacy.html">Privacy &amp; Cookies</a> · <a href="terms.html">Terms</a> · <a href="cancellation.html">Cancellation &amp; Refunds</a></span>
    </div>
  </div>
</footer>
<script src="js/site.js" defer></script>
{extra}
</body>
</html>
"""


def build():
    for f, title, desc, key in PAGE_LIST:
        body = (PAGES / f"{f}.html").read_text(encoding="utf-8")
        full_title = title if f == "index" else f"{title} · Lavanya AI Consultancy"
        url = f"{DOMAIN}/" if f == "index" else f"{DOMAIN}/{f}"
        extra = '<script src="js/enquiry-form.js" defer></script>' if "data-enquiry-form" in body else ""
        if "data-readiness" in body:
            extra += '\n<script src="js/readiness.js" defer></script>'
        if "data-demo" in body or 'id="roi-form"' in body:
            extra += '\n<script src="js/ai-employees.js" defer></script>'
        html = HEAD.format(title=full_title, desc=desc, url=url, domain=DOMAIN, nav=nav(f, key)) + body + FOOT.format(email=EMAIL, extra=extra)
        (SITE / f"{f}.html").write_text(html, encoding="utf-8")
    urls = "".join(f"<url><loc>{DOMAIN}/{'' if f == 'index' else f}</loc></url>" for f, *_ in PAGE_LIST if f != "singapore")
    (SITE / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>\n')
    (SITE / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {DOMAIN}/sitemap.xml\n")
    print(f"built {len(PAGE_LIST)} pages")


if __name__ == "__main__":
    build()
