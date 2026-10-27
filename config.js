/* ============================================================
   Heirloom Events — site settings
   This is the only file you should need to edit day to day.
   ============================================================ */
window.HEIRLOOM = {
  // Paste the Apps Script web app URL here after you deploy it
  // (ends in /exec). Leave it empty to run the pages in demo mode
  // with sample events.
  API_URL: "https://script.google.com/macros/s/AKfycby5j_82DGsF5rJad93rbv_Y6q8dYVbWQe1IpNKI8Sew4GOk2qW3rlMGodP5qcbbtEz3/exec",

  // The public Google Calendar (used for "Add to your calendar")
  PUBLIC_CALENDAR_ID:
    "c_2ec32c5e4a104f38248202a6cf1a06865d613f57113d7cb8a78c38b9c78fb63b@group.calendar.google.com",

  TIMEZONE: "America/Los_Angeles",

  // Main website links used in the header and footer
  MAIN_SITE: "https://www.heirloomeastbay.com",
  ADDRESS: "9990 Crow Canyon Road, Castro Valley, CA 94552",
  EMAIL: "staff@heirloomeastbay.com",
  INSTAGRAM: "https://instagram.com/heirloomeastbay",
  FACEBOOK: "https://facebook.com/heirloomeastbay",
  DONATE: "https://www.paypal.com/ncp/payment/YZZDM8KJSUXBU",
  STAY: "https://heirloomeastbay.lodgify.com",

  // Partner groups (filter tabs + colored labels). Once the backend is
  // live, the "Partners" tab in the Google Sheet takes over from this list.
  PARTNERS: [
    { slug: "plantify", label: "Plantify", name: "Plantify", color: "#b0742f", website: "https://plantify.org" },
    { slug: "soundbird-sanctuary", label: "Soundbird", name: "The Soundbird Sanctuary", color: "#6a5a8e",
      website: "https://www.eventbrite.com/o/the-soundbird-sanctuary-121418754117" }
  ],

  // "What kind of event?" choices in the form (each matches a Discord
  // channel). Once live, the "Discord channels" tab in the Sheet takes over.
  TYPES: ["Church", "Animals", "Garden", "Land", "Hospitality", "Workday"],

  // Suggestions that pop up under "Where on the farm?" in the form.
  // Edit freely — people can still type anything.
  LOCATIONS: [
    "Heirloom (main farmhouse)",
    "The big lawn",
    "The garden",
    "Goat pen",
    "Chicken coop",
    "Meet at the parking area"
  ],

  // Photos people can pick in the form, and the keywords that
  // auto-match a photo when nobody uploads one. Once the backend is
  // live, the "Keywords" tab in the Google Sheet takes over from this
  // list, so you can manage it there without touching code.
  PRESETS: [
    { label: "Goats",        image: "images/goats.jpg",          keywords: "goat, goats, kid goat, baby goat, goat yoga, milking" },
    { label: "Chickens",     image: "images/chickens.jpg",       keywords: "chicken, chickens, hen, hens, rooster, poultry, chicks" },
    { label: "Eggs",         image: "images/eggs.jpg",           keywords: "egg, eggs, egg collecting, coop" },
    { label: "Garden",       image: "images/squash-tunnel.jpg",  keywords: "garden, gardening, workday, work day, planting, squash, pumpkin, compost" },
    { label: "Flowers",      image: "images/flowers-kids.jpg",   keywords: "flower, flowers, bouquet, zinnia, kids, children, family" },
    { label: "Harvest",      image: "images/tomatoes.jpg",       keywords: "harvest, tomato, tomatoes, canning, preserving, vegetables, produce, seeds" },
    { label: "Art & making", image: "images/painting.jpg",       keywords: "art, paint, painting, workshop, craft, drawing, creativity, sketch" },
    { label: "Gathering",    image: "images/farmhouse-lawn.jpg", keywords: "supper, dinner, potluck, picnic, gathering, happy hour, party, celebration, worship" },
    { label: "The farm",     image: "images/farmhouse.jpg",      keywords: "open house, tour, visit, retreat" }
  ],

  // Used (in rotation) when no keyword matches
  FALLBACKS: ["images/farmhouse.jpg", "images/farmhouse-lawn.jpg", "images/tomatoes.jpg"]
};
