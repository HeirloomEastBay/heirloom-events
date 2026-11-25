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
| People | Everyone in one list: residents, volunteers, and anyone who posts events. Click a name to open their profile (see below). |
| Chore chart | The weekly slots, and upcoming coverage requests. |

- **Editing a form event** opens the form, saves right away, and gives you a checkbox to email the person who submitted it, with an optional personal note. Replies go to you. **Cancelling** always emails them, plus anyone who RSVP'd.
- **Editing an event added in Google Calendar:** name, date, time, place and description change in Google Calendar itself. The image, cost, link, host and More details are saved on the **Calendar extras** tab and shown on the website. For a repeating event, the time and dates stay as set in Google Calendar; everything else applies to every date.
- **Deleting** an event added in Google Calendar saves a full backup copy on the **Admin log** tab first. For repeating events you choose "just this date" or "every date".
- Everything admins do is listed on the **Admin log** tab (who, when, what).

### Volunteers: opportunities, portal, chore chart and coverage

**People and profiles.** The **People** tab in the Sheet (called "Volunteers" before; `setup()` renames it, nothing is lost) has one row per person. On the Admin page, **People** lists everyone, with search and filters (Residents, Volunteers, New volunteers to follow up, Admins, Event approvers, Trusted posters, Event posters & contacts). Click a name for their profile:
- **Contact:** name, phone, address, emergency contact, news & updates. Phone, address and emergency contact are private: only admins and the person themselves see them.
- **Resident switch:** residents count as approved volunteers with a cleared background check and every training. Turning it on also turns on **Post events without review**. **Approve events** stays a separate choice, so approval emails only go to the people whose job that is.
- **Can:** post events without review, approve other people's events, use the Admin page. These are the same lists as columns A–C of Settings. You can't remove the last admin.
- **Volunteer:** stage (Not a volunteer, New, Contacted, Background check sent, Active volunteer, Not right now), background check (Not yet / Sent / Cleared), and trainings. "Active volunteer" makes them an approved volunteer. Edit the trainings list itself with **Edit trainings list**.
- **Chore chart:** the slots they're on, **Take off**, and **Add to a chore slot**. They get an email and see it when they log in.
- **Activity:** hours helped, shifts, last helped, sign-ups, coverage and events they've posted. Plus their volunteer form answers and admin-only notes.
- **Other emails they log in with:** for people with more than one email (a work and a personal one). Any of them logs in as the same person, with the same profile, chores and permissions, and events posted from any of them show up together. If the other email already has its own row on the People tab, remove that row in the Sheet first.
- **Remove from People** (bottom of a profile): takes them off the list, their chore slots (which go back to Open) and the permission lists, and they stop counting as a volunteer. Their row stays on the People tab with the date in "Removed", so their info and hours are kept. Find them under **Removed people** to restore.
- **Add a person** for residents or anyone who hasn't filled out a form. They can log in right away.

**Hours helped** add up automatically: past volunteer sign-ups (all-day ones count as 4 hours), every week on a chore slot since they took it (minus dates they asked to have covered), and dates they covered for someone. When someone leaves a slot, their hours on it are saved to "Earlier hours" and "Earlier shifts" on their People row.

**Profile (profile.html):** anyone logged in gets a **Profile** link in the menu to update their own contact info. Address and emergency contact are only asked for there, never on the public forms. The volunteer form has an optional phone number. If someone who's already in People fills out the volunteer form again, their row is updated instead of duplicated.

**Volunteer opportunities:** trusted posters and admins tick **"This is a volunteer opportunity"** in the Submit form, then pick:
- an area,
- who can sign up: **Anyone** (on the public calendar, under a new **Volunteer** tab) or **Approved volunteers only** (only in the portal, never on the public calendar),
- and optional requirements: a background check and/or a training. If an opportunity has requirements, the public calendar shows "Volunteers: log in to sign up", and only volunteers who meet them can sign up in the portal.

Sign-ups reuse the RSVP system: spots, waitlist, reminders and the guest list.

**Volunteer portal (portal.html):** volunteers tap **Log in** on the home page and land here. Admins land on Admin, which links to the portal.
- **Sign up:** opportunities for the next 3 months.
- At the top: hours helped, shifts and the last time they helped. The first shift and 10, 25, 50, 100, 200, 500 and 1000 hours get a little confetti (once per milestone, per device; skipped if their device asks for reduced motion).
- **My shifts:** their sign-ups, chore slots and dates they're covering, plus **Add to my calendar** (a calendar file).
- **Reminder emails:** each person chooses per chore. Off by default for their regular chores, on by default when they cover someone's date. They go out the day before at about 9am.
- **Chore chart:** take an open slot or give one up.
- **Coverage:** ask for coverage on certain dates, or pick up someone else's request.

**Chore chart:** manage it on the Admin page's **Chore chart** tab (or the Chore chart tab in the Sheet), or put people on slots from their profile. `setup()` adds the standard chores: AM animal chores (by 10am, 1 hr), PM animal chores (~5pm, 1 hr), Eggs & welfare check (after 2pm, 30 min) and AM milking (morning, 30 min) every day, plus Chicken feed/water refill (anytime, 30 min) on Tuesdays, Thursdays and Saturdays. Each slot has a **When** (free text, like "by 10am") and **Hours each** (what a shift counts for). Edit any of it on the Admin page; tick "Also change… the other days" to update every day of a chore at once, or add a chore on several days at once. **Who** can be a person, **Volunteers** (the general pool shares it, no one person), or **Open** (qualified volunteers get an email). **Needs coverage…** on any slot asks for someone on certain dates; volunteers get an email and can grab it in their portal. Volunteers can also make a "Volunteers" slot their own regular slot. Each slot is one person, every week. When a slot becomes Open, all qualified active volunteers get an email. Coverage requests email qualified volunteers, and both people get an email when someone covers. Admin FYIs go to "Volunteer applications go to".

### Menu and flyers for admins
Once signed in, every page's top-right menu shows **My events**, plus **Volunteer portal** and **Admin panel** for the people who have them. On the Admin page's Public calendar tab, each event has **Flyer & images**. They're made fresh from the event's current photo and details every time.

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

### Changing one date of a repeating event
Repeating events from the form have **Change one date** on the Admin page and, for whoever posted them, on My events. Pick a date to:
- **Cancel it:** just that date comes off both calendars. People who RSVP'd for it get an email (with an optional message), and their RSVPs for that date are cancelled.
- **Move it:** pick a different day (and time if you like). People who RSVP'd move with it and get an email.
- **Change it:** a different time, place, note ("Moved to the barn, rain!") or photo for that date. Google Calendar is updated, the website shows the note on that date's card, and anyone who RSVP'd gets an email.
- **Back to normal** / **Bring it back** undoes it.

The changes are kept on the **Date changes** tab, and are put back automatically if someone later edits the whole series. Repeating events added straight in Google Calendar (like Supper Church) have **Change one date** too, for admins. For those, bringing back a cancelled date adds it back as a one-time event.

### Resident panel
Residents (Role "Resident" on the People tab) get a lighter version of the Admin page, called **Resident panel** in the menu (they go there after logging in):
- **Public and Residents' calendars:** to look at (and make flyers). No approving, editing or cancelling, no review queue, and no posters' contact info.
- **Photo library:** look, and add photos. Changing or removing photos stays with admins.
- **Chore chart:** add chores, and change, remove or ask for coverage on the chores they added. Other chores are read-only.
- **Guest rooms:** book and manage stays (see below).
- **People** is admins only.

### Venues (reserving places by the hour)
The **Venues** tab (Admin and Resident panels):
- **Day view:** every venue as a row from 7am to 11pm. Green = reserved, gold = an event from the event form at that place (it holds the venue automatically), dashed = something on either calendar that mentions the venue (a heads-up only), striped = setup/cleanup time. Tap an open time to reserve it, or a bar for details.
- **Week view:** switch Day / Week at the top. Week shows every venue down the side and Monday–Sunday across, with each booking as a short line ("7p–9p Book club"), in the same colors. Tap an empty day to reserve it. The page remembers which view you used last.
- **Reserve:** what it's for, one or more venues, date, start/end, optional setup & cleanup (default 1 hour before and after, editable), repeats (weekly, every other week, monthly) until a date, host, notes. If you tick Residents' calendar it shows there as "📍 Yurt: Book club (Lindsey)".
- **Repeats** can also be **certain days each week** (e.g. Mon, Wed, Fri 3–4pm stretching).
- **Also show it on:** off by default, so reservations stay on the venue schedule only. Tick Residents' calendar and/or Public calendar if needed, but anything worth a calendar spot should go through **Add an event** (which holds the venue too). The venue is held either way. On the public calendar it shows just the activity name and place; on the residents' calendar it's "📍 Venue: What (host)".
- **Overlaps:** venues set to "Not allowed" refuse a second booking (admins can reserve anyway); "Heads-up" venues (outdoor spaces, Pool, Meadow & Stage, Main House) warn and let you go ahead.
- Whoever reserved it, or an admin, can edit or cancel (a repeating one is changed or cancelled as a whole). Admins get an FYI email when a resident reserves (same setting as guest stays).
- **Edit venues** (admins): names, "Also called" names (used to match calendar events and older posts, e.g. "Autoshop"), Public (shown on the public event form), Reservable, and Can share. All on the **Venues** tab in the Sheet too.

**The event form's places** come from the Venues tab. Anyone sees the Public ones; residents, approved volunteers and admins (signed in) see every venue. If the chosen place is reserved at that time, the form shows a heads-up (without names). The old Locations tab isn't used anymore.

### Guest rooms (overnight stays)
**stays.html** ("Guest rooms" in the menu, for residents and admins) and the Admin page's **Guest rooms** tab:
- **Tonight:** a card per room, filled in with the guest if someone's staying, outlined if it's open (with who's next).
- **Timeline:** the rooms across the next 4 weeks (2 on phones); stays are bars with the guest's name. Tap an empty day to add a stay, or a name to see it.
- **Upcoming / Past stays / Cancelled**, with search.
- **Add a stay:** one or more rooms (taken rooms can't be picked), check-in and check-out, guest name, who they are / why (shows in parentheses), optional arriving/leaving times, how many people, host, guest email and phone (only admins and whoever booked it can see those), notes. With an email, you can send the guest a confirmation using "Guest arrival info" from Settings. Admins can also **block** rooms (no guests).
- Whoever booked a stay, or an admin, can edit or cancel it. Admins get an FYI email when a resident books ("Email admins about new guest stays").

Each stay is one all-day block on the residents' calendar, titled like staff already write them: "Room 1: Sarah (Sabbath 365)", "Rooms 1 & 2: Tanya (BK friend)". Stays typed straight into Google Calendar in that style are picked up too: `setup()` reads in the whole history, and the Guest rooms page re-checks every few minutes (changes and deletions made in Google Calendar carry over). Everything is on the **Guest stays** tab in the Sheet.

Settings: **Guest rooms** (the room names, "1, 2, 3, 4"), **Guest stay blocks include the check-out day** (TRUE: a block shown Nov 6–10 means the guest leaves the 10th; set FALSE if blocks only cover the nights, then re-run setup), **Guest check-in time**, **Guest check-out time**, **Guest arrival info**.

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


### Squarespace embeds: no inner scroll on the first visit
The Heirloom Squarespace template uses Ajax loading: clicking a menu link swaps the page in without a real reload, and Squarespace doesn't run scripts inside Code blocks on those visits. So the calendar/volunteer frame stayed at 600px (inner scroll) until a refresh. Fix either way:
1. **No code:** Design → Site Styles → turn off **Enable Ajax Loading**.
2. **Keep Ajax:** paste `squarespace-code-injection.js` (wrapped in `<script>…</script>`) into Settings → Advanced → Code Injection → **Footer**. It sizes every Heirloom embed on every page, however the page was reached. The scripts in the Code blocks can stay; they do no harm.


## Roles, profiles and trainings (Nov 16, 2026)

Everyone is a **Resident** or a **Community member**. On top of that, admins switch on add-ons on the People page:
Volunteer (the usual steps), Church family, Community partner, Post events without review, Approves events, Admin.

- **Residents** see the residents' calendar and guest rooms, post without review, are church family, and count as
  volunteers trained for everything **except power tools & the woodshop**.
- **Power tools & woodshop** only counts after the person reads and accepts the safety agreement on their Profile.
  The wording lives in `welcome.js` (search for `AGREEMENT`); if you change it, bump `POWER_AGREEMENT` in `Code.gs` too.
  Who accepted, and when, is in the "Power tools agreement" column of the People tab.
- **Background check** is one-time. Once it says Cleared on someone's profile, chores and volunteers-only shifts open up.
  Drop-in events open to "Anyone" never need it.
- **First sign-in** shows a Welcome popup (`welcome.js`) with the profile questions. Only a name is required.
- **"I'd like to learn this"** in the volunteer portal adds a row to the new **Alerts** tab and, for now, emails the
  "Volunteer applications go to" address. The admin home page (next stage) will list and clear these.
- The first time `setup()` runs with this version it renames the old trainings (Animal chores → Animal feeding +
  Collecting eggs, Garden tools → Gardening, Power tools → Power tools & woodshop) everywhere, and adds the residents
  and first partners to the People tab. It only does each of those once.

### Round 2 (Nov 16b)

- **Welcome popup** appears right after the sign-in code. **Power tools agreement** pops up at the next sign-in after an
  admin ticks that training (community members only; residents don't need it).
- **Sign out** is in the top menu. **People** is the last tab on the Admin page.
- **Profile:** last name required; address is Street / City / State / Zip; emergency contact is name + phone.
- **Residents' birthdays** go on the residents' calendar as a yearly "🎂 Name's birthday" (month and day only). Each
  resident can untick it on their Profile; the Settings line "Show residents' birthdays on the residents' calendar" turns it off for everyone.
- **Chore chart privacy:** community members see "Covered" or "Needs a new regular", never names. Residents and admins see names.
- **Volunteer emails:** volunteers can turn off coverage-request and open-slot emails in the portal (bottom of Chore chart / Coverage).
- **Stages:** New → Contacted → Background check sent → Active volunteer, then Not approved / Not right now. Background check can be Failed, with an admin-only note.
- **Settings added:** "Training requests go to" (staff@) and "Owner email (app help, new partner requests)" (community@).

### Church family page (Nov 16c)

`church.html` / `church.js`. For residents and anyone with "church family" on (people turn it on in their Profile, or an admin does on People).

- **Supper Church:** the next 8 Sundays (the "Supper Church: Sundays to show" setting), skipping fifth Sundays
  ("Supper Church: skip fifth Sundays"). Each has one main dish and an open list of sides, desserts and other things.
  A Sunday with no main is highlighted. Sign-ups live on the **Supper Church** tab of the Sheet.
- **Notes:** any admin can write one (bold, italics, lists, links), on its own or tied to a Sunday. They live on the **Church notes** tab.
- **Dietary counts** come from church-family profiles, with no names.
- **Discord:** add a row for `#church-fam` on the "Discord channels" tab (name + webhook URL, Active ticked). Then a new main
  dish, a midweek nudge when Sunday has no main, a Saturday roundup, and notes (when the box is ticked) post there.
  The channel name is the "Supper Church: Discord channel" setting. No row = nothing posts.
- The "What is Supper Church?" words are at the top of `church.js` (`ABOUT`).

### Church notes as a blog (Nov 16d)

- The note editor is the same as the event form's "More details": bold, italics, headings, lists, quotes, links and up
  to 6 photos per note (saved to the photo folder in Drive).
- Each note can have **themes** and **scripture passages**. Passages link to BibleGateway.
- Everyone in the church family can **search** notes by word and **filter** by theme or book of the Bible. Tapping a theme on a note filters to it.
- The Church notes tab has three new columns (Format, Themes, Scripture); `setup()` adds them. Notes written before this still show.

### Add to Home Screen (Nov 16e)

- `manifest.webmanifest`, `sw.js`, `install.js` and the `images/app-icon-*.png` files make the site installable: an icon
  on the phone's home screen that opens full screen. All of them must be uploaded with the rest of the site.
- Signed-in people on phones see a one-time prompt. Android gets an Install button; iPhones get the two steps
  (Share, then Add to Home Screen). The Profile page has an "Add to Home Screen" button any time.
- The app opens on `mine.html` (their signed-in page). When the home page exists, change `start_url` in the manifest.
- The service worker saves nothing, so updates show up as usual.

### Room titles and the Activity log (Nov 17)

- A **public** event whose title mentions "room", "rooms" or "guest stay" always waits for an admin, even from residents
  and admins (guest stays don't belong on the website). The words are the Settings line "Always review public events
  whose title mentions". The event form shows a heads-up with a link to the Guest rooms page while they type.
- Every event posted or changed through the form is now written to the Admin log too.
- **Activity log** tab on the Admin page (admins only): the newest 1,500 log entries, searchable, filterable by person and kind.

### Discord posts follow edits (Nov 17b)

- New Discord posts keep their message ID (two new columns on the Discord log tab: Message ID, Posted version).
- When the event changes (time, date, place, title, photo, cost…), the post is edited in place. Cancelled or taken off
  the public calendar: the post is changed to say so. Checked every 10 minutes and right after any edit.
- Posts made before this version can't be edited. To redo one: delete it in Discord, delete its row on the Discord log
  tab, and the next hourly run posts it again.

### Sabbath 365 (Nov 18)

- `sabbath.html` / `sabbath.js`: the application (no account needed), then each applicant's progress, then for approved
  people the 🌿 badge and a form to request dates (up to 21 nights; fully booked nights are blocked).
- Answers go on the new **Sabbath 365 applications** tab. Emails go to "Sabbath 365 applications go to" (staff@).
- On People, the Sabbath 365 add-on has the steps (Applied → Contacted → Interview scheduled → Background check sent →
  Approved), interview date / done, the shared one-time background check, notes, and the application answers.
  Approving needs the interview done and the background check Cleared, and emails them a link to request dates.
- Date requests wait on the **Guest rooms** page (admins confirm with a room, or decline with a note). Everyone who sees
  Guest rooms sees "X of 365 Sabbath 365 nights given in <year>". Stays count if ticked "Sabbath 365 stay" or if
  "Sabbath" is in the purpose (how older stays were written).
- Admins can pick someone from People when adding a stay; stays tied to an approved person show the 🌿 badge.

### Living at Heirloom: residency (Nov 18b)

- `residency.html` / `residency.js`: the 2026 Resident Interest Form & FAQ as a page (no account needed). Answers go on
  the **Resident applications** tab; only "Resident applications go to" (staff@, Brit) is emailed. Applicants can sign
  in to see where they are in the process.
- On People, the 🏡 Residency add-on has Brit's steps (Applied → Brit reviewing → One-on-one with Brit → Interview with
  residents → Resident feedback week → Approved (moving in), or Waitlist / Not right now / Not approved), a checklist
  (guest visit, background check, Ministry Safe, policies signed, ID, income, lease), move-in date, living space, lease and trial end.
- From "Interview with residents" on, residents see the application on residency.html (without employment, rent plan,
  phone, medical and children answers). Moving someone to "Resident feedback week" opens a 7-day window and emails the
  residents; their feedback goes on the **Resident feedback** tab and shows only to admins, on the person's profile.
- Switching an approved applicant to Resident starts a 3-month trial (from move-in). staff@ gets a reminder 2 weeks before it ends.
- A resident living in a guest room: tick "Block that guest room" and it's blocked on Guest rooms for the trial.
  Blocking any room on Guest rooms also has quick 1 / 3 / 6 / 12-month buttons.
- Living spaces are the Settings line "Living spaces (for residents)".

## Residency changes (Nov 18, 2026, round 2)

- **Public form link:** `residency.html?apply` always opens the about section and the interest form, even for someone signed in. Point the website's "apply" button here.
- **Emailed copy:** applicants get a full copy of their answers, plus an "Edit my form" link (signed, no account needed). Edits update the same row (column "Updated"), Brit gets a short note, and the applicant gets a fresh copy. The link stops working once the step is "Approved (moving in)" or "Not approved".
- **No 3-month trial:** switching someone to Resident no longer sets a lease, trial end date or reminder.
- **Occupied guest rooms:** Settings → "Occupied guest rooms (room: who lives there)", e.g. `4: Lisa Sharpe`. An occupied room can't be booked on any date until it's unticked. Admins change it on the Guest rooms page (tap the room's card, or "A resident lives in a guest room?") or with the Occupied tick on a resident's People profile when their living space is a guest room.
- **Living spaces:** Main house rooms 1-3, Guest room 4, Loft, Alcove. Set-up adds Loft and Alcove and puts Lisa in Guest room 4.

## Home pages, tab bar and alert emails (Nov 18, 2026)

- **home.html** is where everyone lands after logging in (and where the installed app opens). It's different for each role:
  - **Admins:** Alerts first (event requests, training requests, Sabbath 365 and residency, new volunteers), each with Review/Open or Done.
  - **Residents:** Submit an event + Book a guest room, a smaller "Reserve a space", then this week (public and residents' calendars together, duplicates removed), their shifts, shifts to pick up, Supper Church this Sunday and Brit's latest note (hidden after 3 weeks).
  - **Volunteers:** Submit an event, volunteer opportunities, their shifts, this week (public), then church if they're church family.
  - **Everyone else:** Submit an event, this week, their own events and any Sabbath 365 or residency progress.
- **Bottom tab bar on phones**, by role. Admins: Admin · Home · Calendar · Guest rooms · More. Residents: Home · Calendar · Guest rooms · Church · More. Volunteers: Home · Calendar · Shifts · (Church) · More. Others: Home · Calendar · My events · (Church) · More.
- **Alert emails per admin:** "Email me about…" on the Alerts card (saved in the People column "Alert emails"). staff@ gets everything except chore-chart and venue emails by default; other admins get none until they tick some. If no admin wants a kind, it goes to the old Settings address. Approvers who aren't admins still get event-request emails.
- **Venues:** "Every week on…" shows the days of the week to pick (e.g. Mon, Wed, Fri 3–5pm).

## Dark mode (Nov 18, 2026)

- **Profile → Appearance:** Light, Dark or Match my phone. It's also in the first-login welcome popup. The choice shows right away, is kept on the device, and is saved on People (column "Theme"), so it follows the person to their other devices once they log in there.
- Everyone starts on Light. The Squarespace embed always stays light.
- How it works: `theme.js` (loaded in every page's `<head>`) sets `data-theme="dark"` on `<html>`, and the end of `styles.css` swaps the color variables. Light colors in pages are now variables (`--surface`, `--tint-*`, `--*-fill`), so new screens should use those instead of `#fff`.

## Home speed and sign-in fixes (Nov 18, 2026)

- Home asks for its four parts at once (core, week, shifts, church) and draws each as it arrives; a part that takes over 20 seconds says so, and a part that fails gets a "Try again" button. One broken card can't blank the page any more.
- Each part's time is logged in Apps Script → Executions as "Home week 1.2s (email)".
- After logging in, people go straight to Home (no flash of My events). Logged-in people: the logo goes to Home, and the calendar's "Log in" button becomes "My home".
- Home parts are saved on the server for 5 minutes per person. Any change made through the app or an email link clears them all, so Home is never stale. Edits typed straight into the Sheet can take up to 5 minutes to show on Home.
- Phones: long words and links wrap inside cards instead of running off the right edge (rules at the end of styles.css; Home's grids use minmax(0, 1fr); church theme pills wrap).

## Church round 1 (Nov 18, 2026)

- **Church events from the church tab** (admins): "Add a church event" with date, time, repeats, place, description, optional scripture and theme, and a link. "Put it on the public Heirloom calendar" and "Post it to #church-events" are ticked by default. Unticked, the event goes on the residents' calendar and the church page only. These save as events typed "Church", the same as the Submit form, which now always offers "Church" as a kind of event.
- **Discord:** #church-events posts once a Discord channels row has Event type "Church", Active TRUE and its webhook.
- **Church filter** on the public calendar (shows when there are church events coming up).
- **Song of the month** (tab "Church songs", added by setup): title, writers, YouTube (plays on the page), a note, a copyright line and a lyrics link. Lyrics only show when "Public domain, or we have permission" is ticked, because a CCLI license doesn't cover lyrics on websites. The church family never receives lyrics that aren't ticked. Next month's song can be posted early; it shows when its month starts.

## Church round 2: weekly recordings (Nov 18, 2026)

- **Listen** section at the top of the church page. It shows this week's recordings (Weekly message, Psalm of the week, Kids Bible story, Other), each with a player, length, scripture links, theme tags and an optional description. Earlier weeks fold below. Search, kind, theme and scripture filters appear once there are a few.
- **Add a recording** (admins): choose the kind and week (next, this or the past two), upload a voice memo (up to 30 MB), and add a title, scripture, themes and description. Optionally post to #church-fam. Edit replaces the text or the file; Remove takes it off the page and leaves the file in Drive.
- Weeks start Monday. A recording posted on Sunday defaults to the coming week.
- Files go to the "Heirloom Church Audio" Drive folder (made by setup, shared "anyone with the link can view"). The "Church audio" tab keeps what a podcast feed needs later: title, description, date, length, type, size and episode number.
- Home shows "Listen this week" for church family when there are recordings.

## Special Sundays + footer (Nov 18, 2026)

- **Phones:** the footer's dark green runs to the bottom of the screen. The room for the tab bar is inside the footer now instead of under it.
- **Fifth Sundays** were already skipped ("Supper Church: skip fifth Sundays"). The church page now shows a "No Supper Church: it's a fifth Sunday" line in their place.
- **Special Sundays** (admins: "Change this Sunday" on any Sunday card; tab "Supper Church days"):
  - **Potluck:** everyone brings a dish, no main needed. Several people can bring mains, the need bar and Wednesday nudge skip it, and the Saturday roundup lists what's coming.
  - **No Supper Church:** sign-ups close, and the reminders skip it.
  - Each has an optional name and note, and an optional Discord announcement to #church-fam. Existing sign-ups are kept.
- Setup marks Sunday, Nov 22, 2026 as a "Thanksgiving potluck" (once).

## Church books + Proverb of the week (Nov 18, 2026)

- **Proverb of the week** is a recording type. It shares a slot with the Psalm, so "Add a recording" suggests whichever of the two hasn't been posted that week.
- **Books we're reading** (tab "Church books"): admins add a book with title, author, "For" (Psalms & Proverbs or Kids Bible stories), cover image, buy link and store name (e.g. Books on Bee), started and finished dates, and a note. Adding a new book finishes the current one of the same kind (the day before), which moves it to "Books we've read".
- **Recordings** have "From the book" (defaults to the book current that week) and **Pages**. The card shows "📚 From *Book*, pp. 42–47".
- **books.html** is a public page (no sign-in) listing the books we're reading now and the ones we've read, with covers and buy links. Its data comes from ?action=churchBooks.

## Church fixes (Nov 18, 2026)

- **Audio plays in the page:** Drive won't stream into a web page's player, so ▶ Play fetches the recording through the app (churchAudioGet) and plays it here. "Trouble playing? Open it" stays as a backup.
- **Scripture opens in place:** tap a 📖 passage on a note or recording and the text appears under it (bible-api.com, World English Bible, public domain), with a link to other translations on BibleGateway.
- **Discord:** "Also post to #church-fam" starts unticked on notes and recordings. Round 3 adds a Monday summary to #church-fam with the weekly email.
- **Church page is the same for everyone.** Editing moved to **Admin → Church**: shortcuts open church.html?manage=1 (with &do=audio|note|event|sunday|song|book to open that form) with an "Editing the church page" bar and all the add/change buttons.

## Church round 3: the Monday email (Nov 18, 2026)

- Every Monday at 7am (Settings → "Church weekly email: send Mondays at"), the church family gets "This week at Heirloom church". It holds Brit's notes (posted since the last email, or for that week's Sundays), the week's recordings with Listen buttons, this Sunday's Supper Church, the week's church events and the song of the month. A summary posts to #church-fam (Settings → "Church weekly email: also post to #church-fam").
- It only sends when there's a note or a recording for that week; otherwise the week is marked skipped.
- **Brit's controls** (Admin → Church → This week's email, or church.html?manage=1): Preview, Send now, Send later (any time that week), Hold, Back to Monday morning, Skip this week. The tab "Church weekly email" keeps a row per week.
- **Who gets it:** residents and church family. Each person can turn it off in their Profile ("Send me the Monday church email") or with "Stop these emails" in the email.
- The check runs inside warmFeed (every 10 minutes), so no new trigger is needed.

## Residents-only and monthly chores (Nov 18, 2026)
- Chore chart tab: two new columns, **Residents only** (Yes) and **Repeats** (Every week, or 1st/2nd/3rd/4th/Last of the month). Run `setup` once to add them.
- Residents-only chores (and their coverage requests) only show for residents and admins. Open-slot and coverage emails only go to residents. Only residents can be put on them; "Volunteers" on one shows as "Residents" (anyone who lives here).
- Monthly chores sit in a "Once a month" group on the chore chart, with dates on that weekday of each month for coverage, reminders and Home.
- Also fixed: setup adds new columns by name (duplicate "Removed" on Church audio).

## Monthly chore checklist (Nov 18, 2026)
- New tabs: **Monthly chores** (the list: Chore, Details, Order; setup fills in the 8 house chores) and **Monthly chore log** (one row per chore per month: who has it, when it was done).
- Admin → Chore chart → Monthly chores: pick who has each chore (residents only), flip between months to plan ahead, check off, and add/edit/remove chores (admins). Residents can assign and check off too.
- Each chore keeps the same person the next month until someone changes it; the checkmarks start fresh on the 1st.
- Residents see the whole list (with names) at the top of the portal's Chore chart, and their own on Home under Your shifts, with a checkbox.
- Emails: on the 1st, each resident gets their chore(s) for the month; a week before the month ends, anyone who hasn't checked theirs off gets a reminder. Changing who has a chore this month emails them.
- Fixed: Home now shows the saved copy right away while it refreshes (the first draw was failing).

## BK + Pastor Brit (Nov 18, 2026)
- Setup adds Brit Keeton (britkeeton@gmail.com, goes by BK) as a resident and church family, and sets Brit's (staff@) preferred name to "Pastor Brit" so the two Brits are easy to tell apart in lists.
- New setting **Song of the month: who else can post it (emails)** (BK by default): those people see Edit / New song on the Song of the month card on the church page.

## Home: Your chores, All Play, Church fam (Nov 18, 2026)
- Home has a **Your chores** card: every regular chore you're on by day ("Tuesday · Kitchen duty"), set-day monthly ones ("1st Saturday … · monthly"), and your monthly house chores with checkboxes. Your shifts now only lists dated sign-ups and covers.
- **All Play** (anyone can do it) is a new choice next to "Volunteers" (the pool) on the chore chart. On residents-only chores it replaces the pool ("All Play (any resident)"); setup switches any residents-only chore marked "Volunteers" to All Play. Monthly chores can be All Play too (no reminder emails for those; anyone can check them off).
- A **Church fam** button at the top of Home (for church family, residents and admins) opens the church page.

## Quiet by default (Nov 18, 2026)
- Nothing done from the Admin page, the church page's admin tools, an approve/decline email link, or edits in the Sheet emails anyone, unless it's a button for emailing:
  - **Ask for coverage** (chore chart), Brit's **Send now** on the Monday email, and the new **Email …** checkboxes (approve, decline, cancel an event; edit an event; change a date for RSVPs; decline Sabbath dates; confirm a guest stay). All of these start unticked.
- Settings: **Admin changes email people** (FALSE) turns the old behaviour back on. **Monthly chores: reminder emails** (FALSE) controls the 1st-of-month and week-left emails.
- Still sent: things people do themselves (their own forms, sign-ups, coverage requests, login codes), the reminders they turned on, and the Monday church email.
- **Church weekly email: send automatically** (FALSE): the Monday email only goes out on its own once this is TRUE, and then only in the 3 hours after its send time (it never catches up later in the week). Brit's Send now works either way.

## Other books (Nov 18, 2026)
- Church books have a third kind, **Other books**: a standing list shown as "More books we love" on the church page and the public books page. No reading dates, and adding one doesn't finish the current Psalms/Proverbs or Kids book.
- The Monday church email's Supper Church section now lists the sides and desserts signed up so far (with names), under the main dish (or "still needed"), with buttons to make the main or bring a side. Fifth Sundays say there's no Supper Church. The #church-fam summary gets the sides too.

## Email choices on Profile (Nov 18, 2026)
- Profile has an **Emails** card: "No emails at all" (sign-in codes still come), or keep/drop each kind: confirmations, reminders, updates, the Monday church email (residents/church family), coverage requests and open chore slots (volunteers/residents). It saves as you tick.
- People tab columns: **Email: none** (Yes) and **Email: off** (receipts, reminders, updates); church/coverage/open use their existing columns.
- Every email is tagged with its kind by the function that sends it, and checked against the person's choices right before it goes out.

## Church email from staff@ (Nov 18, 2026)
- Settings: **Church weekly email: send from** (staff@heirloomeastbay.com) and **from name** (Heirloom Church).
- Google only sends "from" another address if it's a **Send mail as** address on the Google account that owns this script (Gmail → Settings → See all settings → Accounts → Send mail as → Add another email address; Gmail emails a confirmation code to staff@). Until then the email comes from the script's account, named "Heirloom Church", and replies go to staff@. Running `setup` logs which one applies.
- First run after this update asks for one new permission (Gmail), needed to use the Send-mail-as address.
- Open chore slot emails are now **opt-in**: nobody gets them unless they turn them on (Profile → Emails, or the volunteer portal). Open slots still show on Home and the chore chart. People who had already ticked them on keep them.
- Coverage requests now go through the app by default (Home "Shifts to pick up", the portal's Coverage tab). The "I need coverage" and admin "Needs coverage…" dialogs have an unticked **Also email the volunteer pool** box for when an email is really needed; then people who haven't turned off coverage emails get one.
- Admin → Church → This week's email has Brit's checkbox **Send it automatically every Monday morning** (off). Until she ticks it, nothing goes out unless she taps Send now or picks a time with Send later. Ticking it asks to confirm and sets the Settings line for her.
- Fewer emails: hosts aren't emailed about each RSVP (they check My events); day-before RSVP reminders only go for events where the poster or an admin ticked **Email everyone who RSVPs a reminder the day before** on the event form; someone covering a chore date no longer gets a day-before reminder unless they turn it on. Setup switches the two Settings lines over once.
- "FYI emails when trusted people post" is FALSE (setup switches it over once).

## Nov 19, 2026
- Tab rows (calendar filters, List/Month…) wrap onto another line on phones instead of breaking words mid-word; buttons and chips never break mid-word.
- Home "This week": events with the poster's own photo (uploaded or linked, not a library picture) show a small thumbnail. **Show 8 more** loads the next 8 events at a time (up to two months out) right on Home.
- Home: **Show through…** opens a date picker and loads everything up to that date (up to 6 months out); Show 8 more keeps going after it.
- Calendar: **Share** on every upcoming event card and in the event popup (also on the website embed). Phones get their share sheet; elsewhere a panel with Copy link, Email, Text and Facebook. The link (index.html?event=…) opens that event.
- No ticket prices on the calendar (cards, popup, flyers, Google Calendar notes): only "Free" or wording without amounts shows. "Get tickets" buttons are now "More info" everywhere, including Soundbird/Eventbrite imports.
- The event popup (after tapping a card) shows "Cost: …" for events posted through our form with a price or donation. Cards and flyers stay price-free. Eventbrite imports (Soundbird) bring no price in, so theirs only shows on their own page.
