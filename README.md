# Heirloom Events

One form, two calendars, and a public events page for heirloomeastbay.com.

- **index.html** is the events splash page: hero with the next event, the schedule, a photo strip, and buttons back to heirloomeastbay.com. It works on its own if someone lands there from Instagram.
- **index.html?embed=1** is the calendar only, for the Squarespace Upcoming Events page.
- **submit.html** is the "Submit an event" form (no Google sign-in needed, phone-friendly photo upload).
- **mine.html** is **My events**: people sign in with their email and a 6-digit code we email them (no password), then see every event they've submitted with Edit or cancel and Guest list buttons. They stay signed in on that device for 30 days. It's linked from the form header, the events page and the confirmation emails.
- **volunteer.html** is the volunteer application. Each one lands on the **Volunteers** tab and is emailed to admin@heirloomeastbay.com (change it under *Volunteer applications go to* on the Settings tab). Replying to that email goes straight to the applicant. The applicant gets a confirmation with the background-check note. The areas they can pick are `VOLUNTEER_AREAS` in config.js.
- **apps-script/Code.gs** is the backend. It lives in a Google Sheet owned by community@heirloomeastbay.com.
- **config.js** holds the settings for the pages. It's the only web file you'll normally edit.

Until `API_URL` is filled in, both pages run in **preview mode** with sample events, so you can share the look before anything is connected.

---

## How it works

1. Someone fills out **submit.html** and picks Public, Residents', or both.
2. The backend saves the row in the Sheet and puts any uploaded photo in the **Heirloom Event Photos** Drive folder.
3. If their email is on the **Trusted posters** or **Approvers** list, the event goes straight onto the chosen calendar(s). Approvers get an FYI email with an **Unpublish** button.
4. Otherwise it's **Pending**. Every approver gets an email with **Approve / Decline**. Whoever clicks first wins; the next person sees "Already approved by …".
5. The submitter gets an email when it's received, when it's live, or (kindly) if it's declined.
6. Every 6 hours the backend imports **partner events** (see below) onto the public calendar.
7. The public page reads the **public calendar** through the backend, so anything added straight into that Google Calendar shows up too.

### Cost and saved photos

**Cost** is a set of choices: *Free*, *Suggested donation* (a dollar amount per person), *Materials fee* (a dollar amount per person) or *Other* (anything they type). It shows on the card as, for example, "$10 suggested donation per person."

**Saved photos:** when someone uploads their own photo, they can tick *"I'll host more events like this."* Once the event is live, the photo is added to the top of the **Keywords** tab with the event's name as its keyword (dates, seasons and "edition" are left out, so "Play Night - Fall Edition!" saves as "play night"). The next event with a similar name gets that photo automatically, and it shows in the "Pick one of ours" gallery. Untick *Show in form gallery*, or delete the row, to retire one.

### Event details popup

Tapping an event's photo or title opens a popup with the **whole photo, uncropped** (good for flyers), the short description, and the **More details** section if the poster filled it in. Each event also has a **Directions** button: Heirloom's address for farm spots, or the event's own address if it's off-site (typed under "Somewhere else", or a partner's venue).

**More details** is an optional box in the form with headings, bold/italic, bulleted lists, links and up to 6 inline photos. It shows only in the popup and in the Google Calendar event, where photos become links because Google Calendar can't show images. Everything is cleaned to a short list of safe formatting before it's saved and again before it's shown.

Links like `…/heirloom-events/?event=<id>` open an event's popup directly. Discord posts use these links.

### Admins (admin.html)
Admins sign in on **My events** (same emailed code), then tap **Admin**. The Admins list is column C on the Settings tab. It starts with lindsey.j.huffman@gmail.com, staff@, community@ and admin@.

| Tab | What you can do |
|---|---|
| Public calendar | Everything on the website. **Events from the form:** Edit, Approve/Decline, Cancel. **Added in Google Calendar:** Edit, Delete. **Partner imports:** Change image, Hide/Show. |
| Residents' calendar | Same, for the private calendar (no images there). |
| Photo library | Add photos, rename them, edit keywords, reorder (the first match wins), remove. This is the Keywords tab. |
| People | Admins, Approvers and Trusted posters. Only admins can change these, here or in the Sheet (columns A–C of Settings are protected). |

- **Editing a form event** opens the form, saves right away, and gives you a checkbox to email the person who submitted it, with an optional personal note. Replies go to you. **Cancelling** always emails them, plus anyone who RSVP'd.
- **Editing an event added in Google Calendar:** name, date, time, place and description change in Google Calendar itself. The image, cost, link, host and More details are saved on the **Calendar extras** tab and shown on the website. For a repeating event, the time and dates stay as set in Google Calendar; everything else applies to every date.
- **Deleting** an event added in Google Calendar saves a full backup copy on the **Admin log** tab first. For repeating events you choose "just this date" or "every date".
- Everything admins do is listed on the **Admin log** tab (who, when, what).

### Volunteers: opportunities, portal, chore chart and coverage

**Who's a volunteer:** anyone on the **Volunteers** tab. On the Admin page's Volunteers tab, set each person's:
- **Status:** "Active volunteer" makes them an approved volunteer.
- **Background check:** Not yet / Sent / Cleared.
- **Trainings:** checkboxes. Edit the list itself with "Edit trainings list" (saved as "Volunteer trainings" on Settings).

**Volunteer opportunities:** trusted posters and admins tick **"This is a volunteer opportunity"** in the Submit form, then pick:
- an area,
- who can sign up: **Anyone** (on the public calendar, under a new **Volunteer** tab) or **Approved volunteers only** (only in the portal, never on the public calendar),
- and optional requirements: a background check and/or a training. If an opportunity has requirements, the public calendar shows "Volunteers: log in to sign up", and only volunteers who meet them can sign up in the portal.

Sign-ups reuse the RSVP system: spots, waitlist, reminders and the guest list.

**Volunteer portal (portal.html):** volunteers tap **Log in** on the home page and land here. Admins land on Admin, which links to the portal.
- **Sign up:** opportunities for the next 3 months.
- **My shifts:** their sign-ups, chore slots and dates they're covering, plus **Add to my calendar** (a calendar file).
- **Chore chart:** take an open slot or give one up.
- **Coverage:** ask for coverage on certain dates, or pick up someone else's request.

**Chore chart:** manage it on the Admin page's **Chore chart** tab (or the Chore chart tab in the Sheet). Each slot is one person, every week. When a slot becomes Open, all qualified active volunteers get an email. Coverage requests email qualified volunteers, and both people get an email when someone covers. Admin FYIs go to "Volunteer applications go to".

### Flyers and social images
Every public event gets three ready-made graphics in Heirloom's colors and fonts, made from the event's photo, title, date, place and cost:
- **Printable flyer** (PDF, letter size) with a QR code. It opens the RSVP form for RSVP events, or the event's details otherwise.
- **Square post** (1080 × 1080) for Instagram and Facebook feeds.
- **Story** (1080 × 1920) for Instagram and Facebook stories.

Find them under "Share this event" in each event's popup, on the "Thanks!" screen right after submitting, and from My events ("Flyer & images"). On a phone they open the share sheet; on a computer they download. They're drawn in the visitor's browser (`flyer.js`, with the PDF and QR code tools in `vendor/`), so there's nothing to set up and nothing is stored.

### Editing or cancelling

Every confirmation email (and the "Thanks!" screen after posting) has an **Edit or cancel your event** button. It opens the form already filled in. Only the person who posted gets the link, and it only works for their event.

- **Trusted posters:** changes go live right away. Approvers get an FYI.
- **Anyone else:** if the event is already live, their changes wait for an approver ("Approve changes / Decline changes" email showing what's changing). The calendar keeps the current version until then.
- If the time, date or place changes, everyone who RSVP'd gets an update email.
- **Cancel this event** (bottom of the form) takes it off both calendars, emails anyone who RSVP'd, and sets its Status to *Cancelled*.

### RSVPs

When someone shares an event they choose **Just show up**, **Collect RSVPs here**, or **Use my own link**. With *Collect RSVPs here*:

- The event card gets an **RSVP** button. People enter name, email, how many are coming and an optional note. No sign-in.
- Every sign-up lands on the **RSVPs** tab of the Sheet, so you and Brit can see everyone for every event.
- An optional **spot limit** shows "3 spots left" on the card. Once it's full, people join a **waitlist** and move in automatically (with an email) when someone cancels.
- Guests get a confirmation email with a **Cancel my RSVP** button, and a reminder at 9am the day before.
- The host gets an email for each sign-up or cancellation, plus a private **guest list** link. They don't need Sheet access.
- Repeating events take RSVPs per date.
- A link like `…/heirloom-events/?rsvp=EV-261103-AB12` opens the RSVP popup straight away. It's also added to the Google Calendar event, so you can share it anywhere.
- If an event is unpublished, everyone signed up for a future date gets a "this is cancelled" email.

### Partners

Groups like Plantify and The Soundbird Sanctuary are listed on the **Partners** tab, one row each:

| Column | What it does |
|---|---|
| Partner / Short label | Full name for the form; short label for the filter tab and the "With Soundbird" tag |
| Color | The tag color on the page (a hex code like `#6a5a8e`) |
| Import type / Import from | How their events arrive automatically: **Eventbrite** (organizer page link), **iCal** (any public .ics calendar link), **Plantify page**, or **None** |
| Location name / Address | Where their events are, when the import doesn't say |
| Partner emails | These people are trusted posters, and the form's "Who's hosting?" list includes the partner |
| Active | Untick to hide a partner without deleting the row |
| Also on residents' calendar | **At Heirloom only** (default: their on-farm events also go on the residents' calendar), **All events**, or **None**. Imports always go on the public calendar. |

**Community members** (neighbors and friends who aren't part of a partner group) pick "Community member" under *Who's hosting?* and can add a name to show as "Hosted by …". Their events sit under the Community partners tab with their own chip. Whether a post goes live right away still depends only on the poster's email (trusted list or not), not on what they pick here.

Each partner gets its own tab on the calendar (All · Heirloom · Plantify · Soundbird…), shown only when they have upcoming events. Imported events keep their own photo, price and ticket link (Eventbrite's **Get tickets**). Imports add, update and remove only the events they created. A partner without an automatic feed can still post through the form by choosing themselves under **Who's hosting?**

**Eventbrite needs a free token, once.** Log in to eventbrite.com with any account (yours is fine, it doesn't need to be Erin's), go to **Account settings → Developer links → API keys**, create a key, and copy the **Private token** into **Eventbrite private token** on the Settings tab. It can only read public event info.

**Adding a partner:** add a row on the Partners tab, then run **syncPartners** in Apps Script (or wait up to 6 hours).

### Discord (opt-in)

Nothing goes to Discord unless someone asks for it. At the end of the form, step 8 asks **"Do you want to post this on Heirloom's Discord?"** (No is the default). If they choose **Yes, post it**, they pick one or more channels, and the event is posted only there.

- **Events added straight in Google Calendar are never posted**, so placeholders are safe.
- **Partner imports** (Plantify, Soundbird) aren't posted unless *Discord: also post partner imports* is TRUE on the Settings tab. Then they go by the **Keywords** column on the Discord channels tab, or to #community-events if nothing matches.
- The **Monday roundup** in #community-events lists only the week's opted-in events.
- The channels offered in the form come from the **Discord channels** tab: every active row with an **Event type** and a webhook. The **Channel** column is the name people see.
- Residents'-calendar-only events never post, so the question is hidden for them.

Setup for each channel: Discord → Edit Channel → Integrations → Webhooks → New Webhook → Copy Webhook URL, paste it into that channel's row, then run **testDiscord**. You need the "Manage Webhooks" permission on the server.

### 1. The Sheet and backend (signed in as community@heirloomeastbay.com)

1. Create a new Google Sheet called **Heirloom Events**.
2. **Extensions → Apps Script**. Delete what's there, paste in all of `apps-script/Code.gs`, and save.
3. Click the ⚙️ **Project Settings** and check the time zone is **(GMT-08:00) Pacific Time - Los Angeles**.
4. Back in the editor, pick **setup** in the function dropdown and click **▶ Run**. Google will ask for permissions (Sheets, Calendar, Drive, Gmail sending). Click through: *Advanced → Go to project → Allow*.
5. A popup confirms both calendars connected. You'll now have **Submissions**, **RSVPs**, **Settings**, **Keywords**, **Partners**, **Locations** and **Discord channels** tabs.
6. **Deploy → New deployment → ⚙️ Web app**
   - Execute as: **Me (community@…)**
   - Who has access: **Anyone**
   - Click **Deploy** and copy the **Web app URL** (ends in `/exec`).

> If you change Code.gs later: **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. That keeps the same URL.

### 2. The website files (GitHub Pages)

1. Create a repo called `heirloom-events` and upload everything in this folder **except** the `apps-script` folder.
2. In `config.js`, paste the Web app URL into `API_URL: ""`.
3. **Settings → Pages → Deploy from branch → main / root**. Your pages will be at `https://YOUR-NAME.github.io/heirloom-events/`.
4. In the Sheet's **Settings** tab, put that address in **Website address** (the backend uses it to link the preset photos).

### 3. Make the public calendar public

In Google Calendar → public calendar → **Settings and sharing → Access permissions → Make available to public → See all event details**. Leave the residents' calendar private.

### 4. Embed on Squarespace

On the events page, add a **Code** block (not an Embed block) with:

```html
<iframe id="heirloom-cal"
  src="https://heirloomeastbay.github.io/heirloom-events/?embed=1"
  style="width:100%;border:0;min-height:600px;display:block"
  title="Heirloom events calendar"></iframe>
<script>
  (function () {
    var f = document.getElementById("heirloom-cal");
    window.addEventListener("message", function (e) {
      if (e.origin !== "https://heirloomeastbay.github.io" || e.source !== f.contentWindow || !e.data) return;
      if (e.data.heirloomHeight) { f.style.height = e.data.heirloomHeight + "px"; f.contentWindow.postMessage({ heirloomAck: 1 }, "*"); }
    });
    f.addEventListener("load", function () { f.contentWindow.postMessage({ heirloomHello: 1 }, "*"); });
  })();
</script>
```

The embed shows the month calendar on top (including the last 6 months of past events, faded), then the upcoming events 10 at a time with a Load more button. Every date of a repeating event gets its own card. The frame resizes itself to fit, with no inner scrollbar.

### Volunteer form on heirloomeastbay.com/volunteer

Add a **Code** block with:

```html
<iframe id="heirloom-volunteer"
  src="https://heirloomeastbay.github.io/heirloom-events/volunteer.html?embed=1"
  style="width:100%;border:0;min-height:400px;display:block"
  title="Heirloom volunteer form"></iframe>
<script>
  (function () {
    var f = document.getElementById("heirloom-volunteer");
    window.addEventListener("message", function (e) {
      if (e.origin !== "https://heirloomeastbay.github.io" || e.source !== f.contentWindow || !e.data) return;
      if (e.data.heirloomHeight) { f.style.height = e.data.heirloomHeight + "px"; f.contentWindow.postMessage({ heirloomAck: 1 }, "*"); }
      if (e.data.heirloomScrollTo) f.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    f.addEventListener("load", function () { f.contentWindow.postMessage({ heirloomHello: 1 }, "*"); });
  })();
</script>
```

Answers go to the Volunteers tab and to the "Volunteer applications go to" address on Settings.

### 5. Test it

- In Apps Script, run **testSubmission**. It sends a fake event from an untrusted address, so approvers should get an Approve/Decline email.
- Then submit the real form from your phone using a trusted email. It should show up on the page within ~5 minutes (the feed is cached for 5 minutes).

---

## Demo first, then go live

To show it off before launch, point everything at two **test calendars** in community@ (for example "Heirloom Events (TEST)" and "Heirloom Residents (TEST)"):

1. Put the test calendar IDs in **Public calendar ID** and **Residents' calendar ID** on the Settings tab.
2. Run **seedDemoEvents** to add seven sample events (one weekly, three with RSVPs, a few pretend sign-ups). No emails are sent.
3. Everything else is real: the form, approvals, RSVP emails and partner imports.

**Going live:**
1. Run **removeDemoEvents** (removes the sample events and pretend RSVPs).
2. On the Settings tab, swap in the real calendar IDs:
   - Public: `c_2ec32c5e4a104f38248202a6cf1a06865d613f57113d7cb8a78c38b9c78fb63b@group.calendar.google.com`
   - Residents: `s3vvihjbb73eakaq0lb9lva73o@group.calendar.google.com`
3. Put the full approver list back if you trimmed it for testing.
4. Run **syncPartners** so Plantify and Soundbird land on the real calendar.
5. Add the embed to Squarespace.

The page's "Add to your calendar" button follows whatever the Settings tab says, so nothing on GitHub changes. Delete the test calendars whenever you like.

## Day-to-day

| To… | Do this |
|---|---|
| Add an event without the form | Add it straight to the **public** Google Calendar. It shows on the site within ~5 minutes with a keyword photo. Optional: a line like `Cost: $10` and a link in the description become the cost tag and button. |
| Add or remove a trusted poster or approver | Edit the **Settings** tab, one email per row |
| Approve without the email | **Submissions** tab → change Status from *Pending* to *Approved* |
| Take an event down | Unpublish button in the FYI email, or set Status to *Unpublished* |
| Change an event's details | **Form events:** the poster uses *My events*, or you edit the row on the **Submissions** tab (title, date, start/end, repeats, until, location, description, details, cost, link, calendars). Sheet edits go to both calendars and the website right away; a value that doesn't make sense turns the cell red with a note and nothing is sent, and a good edit gets a "✓ Synced" note. Date/time/place changes email anyone who RSVP'd. **Events added in Google Calendar:** edit them in Google Calendar. |
| Add a preset photo | Upload it to `images/` on GitHub, then add a row on the **Keywords** tab |
| Add or reorder places in "Where on the farm?" | **Locations** tab, one per row (people can always pick "Somewhere else" and type their own) |
| See who's coming | **RSVPs** tab (filter by Event), or the guest-list link in the host's emails |
| Change an event's spot limit | **Spots** column on the Submissions tab |
| Turn off host emails or reminders | **Settings** tab |
| Add or change a partner | **Partners** tab, then run **syncPartners** |
| Pull partner events in right now | Apps Script → run **syncPartners** (it also runs every 6 hours) |

## Good to know

- **Fonts:** Recoleta, Brown and Archive Antique are commercial fonts. Check that Heirloom's license covers web use before going live. If not, delete the `@font-face` lines at the top of `styles.css` and the pages fall back to free look-alikes (Fraunces and Figtree).
- **Photo links:** uploaded photos are shared "anyone with the link can view" so they can appear on the website. If heirloomeastbay.com is a Google Workspace domain that blocks link sharing, an admin needs to allow it for community@.
- **Email limits:** Google allows 100 emails/day on a regular account and 1,500 on Workspace. Each pending request sends one email per approver, and each RSVP sends two (guest + host) plus a reminder. If heirloomeastbay.com is on Workspace you won't come close; on a regular account, a big event could. Turning off host emails on the Settings tab halves it.
- **Spam:** the form has a hidden spam trap and limits each email address to 10 submissions a day. Untrusted posts never go live without an approver.
- **Who owns what:** Brit owns both calendars and has shared them with community@ (make changes + manage sharing). If that sharing is ever removed, publishing stops.
