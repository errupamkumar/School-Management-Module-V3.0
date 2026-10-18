"""Embed annotated screenshots into docs/USER_GUIDE.md.

Replaces each **[Screenshot Placeholder: ...]** paragraph (in document order) with
the matching image from docs/user-guide/images and a numbered callout key built
from docs/tools/shots.json, and inserts extra figures after named anchors.
Re-running is safe: previously embedded figures are recognised and refreshed.

    python docs/tools/embed-guide.py
"""
import json
import os
import re

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
GUIDE = os.path.join(ROOT, 'docs', 'USER_GUIDE.md')
SPEC = os.path.join(ROOT, 'docs', 'tools', 'shots.json')
IMG_DIR = os.path.join(ROOT, 'docs', 'user-guide', 'images')

# Placeholders in document order -> shot id.
PLACEHOLDERS = [
    '01-login', '60-profile', '02-app-frame', '03-dashboard-admin', '04-dashboard-teacher', '05-dashboard-parent-mobile',
    '06-admissions', '08-students', '09-new-admission', '10-student-profile', '11-promote', '12-logins', '13-guardians',
    '14-employees', '16-academics', '18-attendance-mark', '21-staff-attendance', '22-leave', '23-timetable',
    '25-give-homework', '26-homework-student-mobile', '27-lms', '28-live-classes', '29-exams', '30-marks-entry',
    '31-results', '32-class-tests', '33-question-bank', '34-behaviour', '38-fee-structure', '35-fees-collect',
    '37-fees-defaulters', '40-fees-parent-mobile', '41-accounts', '42-payroll', '44-notices', '45-messages', '46-sms',
    '47-calendar', '48-meetings', '49-transport', '50-library', '51-store', '51b-assets', '52-certificates',
    '53-reports', '55-study-tools', '57-settings', '58-access-control', '59-audit-log', '61-apply-form', '63-platform',
]

# Extra figures: inserted right after the first line that starts with the anchor text.
EXTRAS = [
    ('**Responsive behaviour**', ['66-dark-mode', '67-hindi', '75-language-menu', '76-tamil-dashboard']),
    ('#### 5.41.1 Set up hostels and rooms', ['71-hostel-rooms']),
    ('#### 5.41.2 Allot, move and vacate', ['72-hostel-residents']),
    ('#### 5.41.3 Family view', ['73-hostel-family-mobile']),
    ('#### 5.42.1 One-time setup (transport manager)', ['79-device-link']),
    ('#### 5.42.2 Driving a trip (driver)', ['70-driver-mobile']),
    ('#### 5.42.3 Live map (staff)', ['68-live-board']),
    ('#### 5.42.4 Parent view', ['69-parent-live-mobile']),
    ('#### Install on a phone', ['77-profile-app-mobile']),
    ('**Export to Tally:**', ['78-tally-menu']),
    ('Saved secrets show as', ['74-settings-app']),
    ('#### 5.2.2 Work an application', ['07-admission-detail']),
    ('#### 5.5.2 Employee profile', ['15-employee-profile']),
    ('**Recommended setup order:**', ['17-teacher-allocation']),
    ('#### 5.7.2 Scan ID cards', ['19-attendance-scan']),
    ('#### 5.7.3 Registers and reports', ['20-attendance-register']),
    ('#### 5.11.2 Check submissions', ['24-homework']),
    ('**Single report card:**', ['65-report-card']),
    ('#### 5.18.3 Generate monthly invoices', ['36-fees-invoices']),
    ('#### 5.18.5 Receipts', ['64-print-receipt']),
    ('#### 5.18.7 Collection report', ['39-fees-report']),
    ('#### 5.20.2 My payslips', ['43-payslips-staff']),
    ('### 5.32 Clubs & Activities', ['54-activities']),
    ('### 5.34 AI Assistant', ['56-ai-assistant']),
    ('#### Certificate verification', ['62-verify']),
    # 2026-10 modules
    ('### 5.44 Gate & Visitors', ['80-gate-visitors', '81-gate-pass']),
    ('### 5.45 Discipline register', ['82-discipline']),
    ('**Set an exam (teacher)**', ['83-online-exam-create']),
    ('**Take it (student)**', ['84-online-exam-take']),
    ('### 5.48 Polls & forms', ['86-polls-create', '85-polls-family']),
    ('### 5.49 Discussions', ['87-discussions']),
    ('### 5.50 Gallery', ['88-gallery']),
    ('### 5.51 News & blog', ['89-blog']),
    ('### 5.52 Reminders', ['92-reminders']),
    ('### 5.53 Tasks', ['90-tasks']),
    ('### 5.54 Document manager', ['91-documents']),
    ('### 5.55 Alumni', ['93-alumni']),
    ('### 5.56 Placements', ['94-placements-student']),
    ('### 5.57 Apps (App Frame)', ['98-apps']),
    ('### 5.58 Fees: advance', ['95-instant-invoice']),
    ('### 5.59 Imports, exports and the report builder', ['96-report-builder']),
    ('### 5.60 Email, single sign-on and BigBlueButton', ['99-sms-email', '97-settings-integrations']),
]

CAPTIONS = {
    '66-dark-mode': 'The same dashboard in dark mode.',
    '67-hindi': 'The teacher dashboard in Hindi (language button in the top bar).',
    '62-verify': 'Public verification page reached by scanning a certificate QR code.',
    '65-report-card': 'Printable report card as a parent downloads it.',
    '75-language-menu': 'Language menu: each person picks from the languages the school offers.',
    '76-tamil-dashboard': 'The teacher dashboard in Tamil.',
    '71-hostel-rooms': 'Hostels and rooms with bed occupancy.',
    '72-hostel-residents': 'Residents with move and vacate actions.',
    '73-hostel-family-mobile': 'A parent sees the child’s hostel room and warden.',
    '79-device-link': 'GPS device link for hardware trackers or the Traccar Client app.',
    '70-driver-mobile': 'Driver mode on the driver’s phone during a pickup trip.',
    '68-live-board': 'Live map: every bus, its trip and last-seen time.',
    '69-parent-live-mobile': 'A parent sees the bus, their stop and the ETA.',
    '77-profile-app-mobile': 'My profile → App & notifications on a phone.',
    '78-tally-menu': 'Accounts → Statement → Tally export menu.',
    '74-settings-app': 'School Settings → Languages & app.',
    '80-gate-visitors': 'Gate & Visitors: today’s visitor register.',
    '81-gate-pass': 'Student gate passes with collection details and status.',
    '82-discipline': 'Discipline register with severity and status.',
    '83-online-exam-create': 'Creating an online exam from the question bank.',
    '84-online-exam-take': 'A student taking a timed online exam.',
    '85-polls-family': 'A parent’s view: vote, see live results, fill in forms.',
    '86-polls-create': 'Creating a poll or form with its audience and options.',
    '87-discussions': 'Discussions for a parent: class topics and replies.',
    '88-gallery': 'Event albums as families see them.',
    '89-blog': 'News & Blog with the review queue and public page.',
    '90-tasks': 'Tasks across staff with priorities and due dates.',
    '91-documents': 'Document manager with folders, sharing and renewal alerts.',
    '92-reminders': 'Scheduled and repeating reminders.',
    '93-alumni': 'Alumni directory with mentors and self-registration.',
    '94-placements-student': 'A student’s placement drives and application status.',
    '95-instant-invoice': 'Fees → Invoices → Instant invoice.',
    '96-report-builder': 'Reports → Report builder with chosen columns.',
    '97-settings-integrations': 'School Settings → Integrations & data.',
    '98-apps': 'Apps a teacher can open (App Frame).',
    '99-sms-email': 'SMS, WhatsApp & Email: composing an email.',
}

spec = {s['id']: s for s in json.load(open(SPEC, encoding='utf-8'))['shots']}
fig_no = 0


def figure(shot_id, alt):
    """Markdown for one figure: image, caption and numbered callout key."""
    global fig_no
    if not os.path.exists(os.path.join(IMG_DIR, f'{shot_id}.png')):
        raise SystemExit(f'missing image for {shot_id}; run docs/tools/shoot.cjs first')
    fig_no += 1
    alt = re.sub(r'\s+', ' ', alt).strip().rstrip('.')
    alt = re.split(r'\. (?=Arrow|On phone)', alt)[0].strip().rstrip('.')
    markers = spec[shot_id].get('markers', [])
    key = ' · '.join(f'**{i + 1}** {m["note"]}' for i, m in enumerate(markers))
    caption = CAPTIONS.get(shot_id, alt.split('. ')[0] + '.')
    out = [f'<!-- fig:{shot_id} -->', f'![{alt}](user-guide/images/{shot_id}.png)', '', f'*Figure {fig_no}. {caption}*']
    if key:
        out += ['', f'> **Callouts:** {key}']
    out.append('<!-- /fig -->')
    return '\n'.join(out)


text = open(GUIDE, encoding='utf-8').read()
# Remove figures from a previous run (keeping the original placeholder text stored in them).
text = re.sub(r'\n*<!-- fig:[^>]+ -->\n.*?<!-- /fig -->', '', text, flags=re.S)
text = re.sub(r'<!-- placeholder: (.*?) -->', r'**[Screenshot Placeholder: \1]**', text)

lines = text.split('\n')
out = []
ph_i = 0
pending = {anchor: shots for anchor, shots in EXTRAS}
for line in lines:
    m = re.match(r'^\*\*\[Screenshot Placeholder: (.*)\]\*\*$', line)
    if m:
        shot = PLACEHOLDERS[ph_i]
        ph_i += 1
        out.append(f'<!-- placeholder: {m.group(1)} -->')
        out.append(figure(shot, m.group(1)))
        continue
    out.append(line)
    for anchor in list(pending):
        if line.startswith(anchor):
            for shot in pending.pop(anchor):
                out += ['', figure(shot, CAPTIONS.get(shot, spec[shot].get('markers', [{}])[0].get('note', shot) if spec[shot].get('markers') else shot))]
            break

if ph_i != len(PLACEHOLDERS):
    raise SystemExit(f'expected {len(PLACEHOLDERS)} placeholders, found {ph_i}')
if pending:
    raise SystemExit(f'anchors not found: {list(pending)}')
open(GUIDE, 'w', encoding='utf-8', newline='\n').write('\n'.join(out))
print(f'embedded {fig_no} figures ({ph_i} placeholders + {fig_no - ph_i} extras)')
