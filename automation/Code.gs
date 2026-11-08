/**
 * Lavanya AI Consultancy — enquiry automation
 * Runs free inside Google Apps Script, attached to a Google Sheet.
 *
 * What happens when someone sends the website form:
 *   1. The enquiry is checked, then SAVED FIRST in the "Enquiries" sheet
 *      with a unique ID (LAI-YYYYMMDD-0001), timestamp and source/campaign.
 *   2. A follow-up task is added to the "Follow-ups" sheet.
 *   3. The visitor gets an acknowledgement email; you get an alert email.
 *   4. If an email fails, the enquiry is still safe. A timer retries every
 *      15 minutes, up to 3 times, then writes to the "Error log" and alerts you.
 *   5. The same submission sent twice (double click, slow network, retry)
 *      is stored once, because each form send carries a unique key.
 *
 * Setup: see the handover doc. In short: paste this file into
 * Extensions > Apps Script of a new Google Sheet, edit CONFIG, run setup()
 * once, then Deploy > New deployment > Web app (Execute as: Me,
 * Who has access: Anyone) and put the web app URL in enquiry-form.js.
 */

const CONFIG = {
  OWNER_EMAIL: 'lavanya.sriva@gmail.com',
  BUSINESS_NAME: 'Lavanya AI Consultancy',
  WEBSITE: 'https://lavanyaautomation.com',
  REPLY_WORKING_DAYS: 2,
  BOOKING_LINK: '', // e.g. your Calendly or Google booking page; leave '' until ready
  WHATSAPP_LINK: 'https://wa.me/919821294499',
  TIMEZONE: 'Asia/Kolkata',
  MAX_EMAIL_ATTEMPTS: 3,
  SHEET_ENQUIRIES: 'Enquiries',
  SHEET_FOLLOWUPS: 'Follow-ups',
  SHEET_LOG: 'Error log',
};

const STATUSES = ['New', 'Contacted', 'Meeting', 'Proposal', 'Won', 'Lost'];

const SEGMENTS = [
  'A school',
  'A college or university',
  'Educator or student training',
  'An applied AI collaboration',
  'A business: automation or consulting',
  'A business: staff training',
  'Something else',
];

const HEADERS = [
  'Enquiry ID', 'Received at', 'Status', 'Name', 'Email', 'Organisation',
  'Country', 'Enquiring for', 'Requirement', 'Phone', 'Marketing consent',
  'Source', 'UTM source', 'UTM medium', 'UTM campaign', 'Landing page',
  'Referrer', 'Submission key', 'Visitor email', 'Owner alert',
  'Email attempts', 'Last error', 'Won value (INR)', 'Notes',
];

const COL = HEADERS.reduce(function (map, name, i) { map[name] = i + 1; return map; }, {});

// ---------------------------------------------------------------- web entry points

function doGet() {
  return json_({ ok: true, service: 'enquiries' });
}

function doPost(e) {
  let data;
  try {
    data = parseBody_(e);
  } catch (err) {
    return json_({ ok: false, error: 'bad_request' });
  }

  // Hidden "website" field: people never fill it, spam bots usually do.
  if (data.website) {
    return json_({ ok: false, error: 'rejected' });
  }

  const fieldErrors = validate_(data);
  if (fieldErrors.length) {
    return json_({ ok: false, error: 'invalid', fields: fieldErrors });
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json_({ ok: false, error: 'busy' });
  }

  let id;
  let isNew = false;
  try {
    const sheet = sheet_(CONFIG.SHEET_ENQUIRIES);
    id = findIdBySubmissionKey_(sheet, data.submissionKey);
    if (!id) {
      id = nextId_();
      sheet.appendRow(rowFor_(id, data));
      SpreadsheetApp.flush();
      isNew = true;
    }
  } catch (err) {
    logError_('save', err, data.submissionKey);
    return json_({ ok: false, error: 'save_failed' });
  } finally {
    lock.releaseLock();
  }

  // The enquiry is saved. Nothing below can lose it.
  if (isNew) {
    try {
      addFollowUp_(id, data);
    } catch (err) {
      logError_('follow-up', err, id);
    }
    try {
      sendEmailsForId_(id);
    } catch (err) {
      logError_('email', err, id);
    }
  }

  return json_({ ok: true, id: id, duplicate: !isNew });
}

// ---------------------------------------------------------------- one-time setup

/** Run once from the Apps Script editor. Safe to run again. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(CONFIG.TIMEZONE);

  const enq = sheet_(CONFIG.SHEET_ENQUIRIES);
  enq.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  enq.setFrozenRows(1);
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUSES, true)
    .setAllowInvalid(false)
    .build();
  enq.getRange(2, COL['Status'], enq.getMaxRows() - 1, 1).setDataValidation(statusRule);

  const fu = sheet_(CONFIG.SHEET_FOLLOWUPS);
  fu.getRange(1, 1, 1, 5).setValues([['Enquiry ID', 'Task', 'Due', 'Done', 'Created at']]).setFontWeight('bold');
  fu.setFrozenRows(1);
  fu.getRange(2, 4, fu.getMaxRows() - 1, 1).insertCheckboxes();

  const log = sheet_(CONFIG.SHEET_LOG);
  log.getRange(1, 1, 1, 4).setValues([['Time', 'Step', 'Reference', 'Error']]).setFontWeight('bold');
  log.setFrozenRows(1);

  // Timers: retry failed emails every 15 minutes; follow-up digest each weekday morning.
  ScriptApp.getProjectTriggers().forEach(function (t) {
    const fn = t.getHandlerFunction();
    if (fn === 'retryFailedEmails' || fn === 'dailyFollowUpDigest') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('retryFailedEmails').timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger('dailyFollowUpDigest').timeBased().everyDays(1).atHour(9).inTimezone(CONFIG.TIMEZONE).create();
}

// ---------------------------------------------------------------- timers

/** Retries emails that failed earlier. Runs every 15 minutes. */
function retryFailedEmails() {
  const sheet = sheet_(CONFIG.SHEET_ENQUIRIES);
  const last = sheet.getLastRow();
  if (last < 2) return;
  const rows = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  rows.forEach(function (r) {
    const pending = r[COL['Visitor email'] - 1] !== 'sent' || r[COL['Owner alert'] - 1] !== 'sent';
    const attempts = Number(r[COL['Email attempts'] - 1]) || 0;
    if (pending && attempts < CONFIG.MAX_EMAIL_ATTEMPTS) {
      try {
        sendEmailsForId_(r[COL['Enquiry ID'] - 1]);
      } catch (err) {
        logError_('retry', err, r[COL['Enquiry ID'] - 1]);
      }
    }
  });
}

/** Emails you the follow-ups due today or overdue. Runs each morning; skips weekends. */
function dailyFollowUpDigest() {
  const today = new Date();
  const day = Number(Utilities.formatDate(today, CONFIG.TIMEZONE, 'u')); // 1 = Monday … 7 = Sunday
  if (day > 5) return;
  const fu = sheet_(CONFIG.SHEET_FOLLOWUPS);
  const last = fu.getLastRow();
  if (last < 2) return;
  const todayKey = Utilities.formatDate(today, CONFIG.TIMEZONE, 'yyyy-MM-dd');
  const due = fu.getRange(2, 1, last - 1, 4).getValues().filter(function (r) {
    if (!r[0] || r[3] === true) return false;
    const dueKey = Utilities.formatDate(new Date(r[2]), CONFIG.TIMEZONE, 'yyyy-MM-dd');
    return dueKey <= todayKey;
  });
  if (!due.length) return;
  const lines = due.map(function (r) {
    return '• ' + r[0] + ' — ' + r[1] + ' (due ' + Utilities.formatDate(new Date(r[2]), CONFIG.TIMEZONE, 'd MMM') + ')';
  });
  MailApp.sendEmail({
    to: CONFIG.OWNER_EMAIL,
    subject: due.length + ' follow-up' + (due.length > 1 ? 's' : '') + ' due today',
    body: 'Follow-ups due today or overdue:\n\n' + lines.join('\n') +
      '\n\nOpen the sheet: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl(),
  });
}

// ---------------------------------------------------------------- email

function sendEmailsForId_(id) {
  const sheet = sheet_(CONFIG.SHEET_ENQUIRIES);
  const rowNum = findRowById_(sheet, id);
  if (!rowNum) return;
  const range = sheet.getRange(rowNum, 1, 1, HEADERS.length);
  const r = range.getValues()[0];
  const get = function (h) { return r[COL[h] - 1]; };
  const set = function (h, v) { sheet.getRange(rowNum, COL[h]).setValue(v); };

  let failed = false;
  let lastError = '';

  if (get('Visitor email') !== 'sent') {
    try {
      sendVisitorAck_(id, get('Name'), get('Email'), get('Requirement'));
      set('Visitor email', 'sent');
    } catch (err) {
      failed = true;
      lastError = 'visitor: ' + err;
      set('Visitor email', 'failed');
    }
  }

  if (get('Owner alert') !== 'sent') {
    try {
      sendOwnerAlert_(id, r);
      set('Owner alert', 'sent');
    } catch (err) {
      failed = true;
      lastError += (lastError ? ' | ' : '') + 'owner: ' + err;
      set('Owner alert', 'failed');
    }
  }

  if (failed) {
    const attempts = (Number(get('Email attempts')) || 0) + 1;
    set('Email attempts', attempts);
    set('Last error', String(lastError).slice(0, 500));
    if (attempts >= CONFIG.MAX_EMAIL_ATTEMPTS) {
      logError_('email gave up', lastError, id);
    }
  }
}

function sendVisitorAck_(id, name, email, requirement) {
  const first = String(name).split(' ')[0];
  const booking = CONFIG.BOOKING_LINK
    ? '<p>Would you like to talk sooner? <a href="' + CONFIG.BOOKING_LINK + '">Book a 30-minute call</a>.</p>'
    : '';
  const html =
    '<p>Dear ' + esc_(first) + ',</p>' +
    '<p>Thank you for contacting ' + CONFIG.BUSINESS_NAME + '. We have received your requirement ' +
    '(reference <strong>' + id + '</strong>) and will reply within ' + CONFIG.REPLY_WORKING_DAYS + ' working days.</p>' +
    '<p style="border-left:3px solid #B7791F;padding-left:12px;color:#5C4636">' + esc_(requirement).replace(/\n/g, '<br>') + '</p>' +
    booking +
    '<p>You can also reach us on <a href="' + CONFIG.WHATSAPP_LINK + '">WhatsApp</a>, or simply reply to this email.</p>' +
    '<p>Warm regards,<br>Lavanya Srivastava<br>Founder, ' + CONFIG.BUSINESS_NAME + '</p>' +
    '<p style="font-size:12px;color:#7A6A5C">You are receiving this one-time email because you sent an enquiry at ' + CONFIG.WEBSITE + '.</p>';
  MailApp.sendEmail({
    to: email,
    subject: 'We received your requirement — ' + id,
    htmlBody: html,
    body: html.replace(/<[^>]+>/g, ''),
    name: CONFIG.BUSINESS_NAME,
    replyTo: CONFIG.OWNER_EMAIL,
  });
}

function sendOwnerAlert_(id, r) {
  const get = function (h) { return r[COL[h] - 1]; };
  const fields = ['Name', 'Email', 'Organisation', 'Country', 'Enquiring for', 'Phone',
    'Marketing consent', 'Source', 'UTM campaign', 'Landing page'];
  const lines = fields.map(function (h) { return h + ': ' + (get(h) || '—'); });
  MailApp.sendEmail({
    to: CONFIG.OWNER_EMAIL,
    subject: 'New enquiry ' + id + ' — ' + get('Organisation') + ' (' + get('Country') + ')',
    body: lines.join('\n') + '\n\nRequirement:\n' + get('Requirement') +
      '\n\nOpen the sheet: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl(),
    replyTo: String(get('Email')),
  });
}

// ---------------------------------------------------------------- helpers

function parseBody_(e) {
  if (e && e.postData && e.postData.contents) {
    const type = String(e.postData.type || '');
    if (type.indexOf('application/x-www-form-urlencoded') === -1) {
      return JSON.parse(e.postData.contents);
    }
  }
  if (e && e.parameter) return e.parameter;
  throw new Error('empty body');
}

function validate_(d) {
  const errors = [];
  const text = function (k, min, max) {
    const v = String(d[k] == null ? '' : d[k]).trim();
    d[k] = v.slice(0, max);
    if (v.length < min) errors.push(k);
  };
  text('name', 1, 120);
  text('email', 3, 200);
  text('organisation', 1, 200);
  text('country', 1, 100);
  text('requirement', 5, 3000);
  text('phone', 0, 40);
  text('segment', 0, 80);
  text('submissionKey', 8, 100);
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) errors.push('email');
  if (d.segment && SEGMENTS.indexOf(d.segment) === -1) d.segment = 'Something else';
  ['source', 'utm_source', 'utm_medium', 'utm_campaign', 'page', 'referrer'].forEach(function (k) {
    d[k] = String(d[k] == null ? '' : d[k]).slice(0, 300);
  });
  d.marketing = d.marketing === true || d.marketing === 'true' || d.marketing === 'on';
  return errors.filter(function (v, i, a) { return a.indexOf(v) === i; });
}

function rowFor_(id, d) {
  const row = new Array(HEADERS.length).fill('');
  const put = function (h, v) { row[COL[h] - 1] = safe_(v); };
  row[COL['Received at'] - 1] = new Date();
  put('Enquiry ID', id);
  put('Status', 'New');
  put('Name', d.name);
  put('Email', d.email);
  put('Organisation', d.organisation);
  put('Country', d.country);
  put('Enquiring for', d.segment);
  put('Requirement', d.requirement);
  put('Phone', d.phone);
  put('Marketing consent', d.marketing ? 'Yes' : 'No');
  put('Source', d.source || 'website');
  put('UTM source', d.utm_source);
  put('UTM medium', d.utm_medium);
  put('UTM campaign', d.utm_campaign);
  put('Landing page', d.page);
  put('Referrer', d.referrer);
  put('Submission key', d.submissionKey);
  put('Visitor email', 'pending');
  put('Owner alert', 'pending');
  row[COL['Email attempts'] - 1] = 0;
  return row;
}

/** Stops spreadsheet formulas from being injected through the form. */
function safe_(v) {
  const s = String(v == null ? '' : v);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function nextId_() {
  const props = PropertiesService.getScriptProperties();
  const day = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd');
  const key = 'seq_' + day;
  const n = (Number(props.getProperty(key)) || 0) + 1;
  props.setProperty(key, String(n));
  return 'LAI-' + day + '-' + ('000' + n).slice(-4);
}

function findIdBySubmissionKey_(sheet, key) {
  const last = sheet.getLastRow();
  if (last < 2 || !key) return null;
  const cell = sheet.getRange(2, COL['Submission key'], last - 1, 1)
    .createTextFinder(safe_(key)).matchEntireCell(true).findNext();
  return cell ? sheet.getRange(cell.getRow(), COL['Enquiry ID']).getValue() : null;
}

function findRowById_(sheet, id) {
  const last = sheet.getLastRow();
  if (last < 2) return null;
  const cell = sheet.getRange(2, COL['Enquiry ID'], last - 1, 1)
    .createTextFinder(String(id)).matchEntireCell(true).findNext();
  return cell ? cell.getRow() : null;
}

function addFollowUp_(id, d) {
  const due = addWorkingDays_(new Date(), CONFIG.REPLY_WORKING_DAYS);
  sheet_(CONFIG.SHEET_FOLLOWUPS).appendRow([
    id, safe_('Reply to ' + d.name + ' (' + d.organisation + ')'), due, false, new Date(),
  ]);
}

function addWorkingDays_(date, n) {
  const d = new Date(date.getTime());
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) added++;
  }
  return d;
}

function sheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function logError_(step, err, ref) {
  try {
    sheet_(CONFIG.SHEET_LOG).appendRow([new Date(), step, safe_(ref || ''), safe_(String(err).slice(0, 1000))]);
  } catch (ignored) { /* never let logging break the request */ }
  if (step === 'save' || step === 'email gave up') {
    try {
      MailApp.sendEmail(CONFIG.OWNER_EMAIL, 'Website enquiry problem: ' + step,
        'Step: ' + step + '\nReference: ' + (ref || '') + '\nError: ' + err +
        '\n\nCheck the "Error log" sheet.');
    } catch (ignored) { /* the log row above is the record */ }
  }
}

function esc_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
