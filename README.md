# Heirloom Events

One form, two calendars, and a public events page for heirloomeastbay.com.

- **index.html** is the events splash page: hero with the next event, the schedule, a photo strip, and buttons back to heirloomeastbay.com. It works on its own if someone lands there from Instagram.
- **index.html?embed=1** is the calendar only, for the Squarespace Upcoming Events page.
- **submit.html** is the "Share an event" form (no Google sign-in needed, phone-friendly photo upload).
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

**Community members** (neighbors and friends who aren't part of a partner group) pick "Community member" under *Who's hosting?* and can add a name to show as "Hosted by …". Their events sit under the Community partners tab with their own chip. Whether a post goes live right away still depends only on the poster's email (trusted list or not), not on what they pick here.

Each partner gets its own tab on the calendar (All · Heirloom · Plantify · Soundbird…), shown only when they have upcoming events. Imported events keep their own photo, price and ticket link (Eventbrite's **Get tickets**). Imports add, update and remove only the events they created. A partner without an automatic feed can still post through the form by choosing themselves under **Who's hosting?**

**Eventbrite needs a free token, once.** Log in to eventbrite.com with any account (yours is fine, it doesn't need to be Erin's), go to **Account settings → Developer links → API keys**, create a key, and copy the **Private token** into **Eventbrite private token** on the Settings tab. It can only read public event info.

**Adding a partner:** add a row on the Partners tab, then run **syncPartners** in Apps Script (or wait up to 6 hours).

### Discord

New public events post themselves to Heirloom's Discord, sorted by channel. The **Discord channels** tab has one row per channel:

| Channel | Gets |
|---|---|
| #church-events | Church events |
| #animal-volunteers | Animals |
| #garden-volunteers | Garden |
| #land-volunteers | Land |
| #hospitality-volunteers | Hospitality |
| #workdays-info | Workdays |
| #events | Anything that doesn't fit the others, plus a **"This week at Heirloom" roundup every Monday at 9am** |

How an event finds its channel:
- **From the form:** the poster ticks "What kind of event?" (any number). An event can go to more than one channel, e.g. a garden workday goes to #garden-volunteers and #workdays-info.
- **Partner imports, events added straight in Calendar, or no type ticked:** the **Keywords** column decides (e.g. "fence, brush clearing" → #land-volunteers). Edit the keywords anytime.
- **Nothing fits:** it goes to #events.

Setup for each channel (about a minute each): in Discord, hover the channel → ⚙️ **Edit Channel → Integrations → Webhooks → New Webhook**. Name it "Heirloom Events", give it the Heirloom badge (`images/logo-badge.png`) as its picture, click **Copy Webhook URL**, and paste it into that channel's row. You need "Manage Webhooks" permission. Then run **testDiscord** in Apps Script to send one test post to each channel.

Good to know:
- Approved and trusted posts go out right away; everything else is picked up within the hour. A repeating event is posted once.
- When a channel is first connected, or the public calendar is switched, it marks what's already there as posted, so nothing floods.
- Add or rename channels by editing rows; a channel with no webhook is skipped. Untick **Active** to pause one. The form's "What kind of event?" choices come from the **Event type** column.
- The **Discord log** tab shows what was posted where. Both kinds of posts can be turned off on the Settings tab.
- **Connect the webhooks after you go live** (or use a private test channel), so demo events don't post to the real channels.

The residents' copy of an event includes the submitter's contact info and notes. The public copy never does.

---

## Setup (about 20 minutes)

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

On the Upcoming Events page, add a **Code** block with:

```html
<iframe id="heirloom-cal" src="https://YOUR-NAME.github.io/heirloom-events/?embed=1"
  style="width:100%;border:0;min-height:700px" loading="lazy" title="Heirloom events"></iframe>
<script>
  window.addEventListener("message", function (e) {
    if (e.data && e.data.heirloomHeight) document.getElementById("heirloom-cal").style.height = e.data.heirloomHeight + "px";
  });
</script>
```

The iframe grows to fit the calendar, so there's no inner scrollbar. Add `&view=month` to the URL to open in month view.

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
| Change an event's time or title | Edit it in Google Calendar (both copies if it's on both) |
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
