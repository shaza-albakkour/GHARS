/* ==========================================================================
   icons.js — أيقونات SVG خطية موحّدة (تأخذ لون النص المحيط)
   الاستخدام: Ghars.icon('home')
   ========================================================================== */
(function (G) {
  'use strict';

  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    today: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/>',
    crescent: '<path d="M15.5 3.5a8.5 8.5 0 1 0 5 13.5 7 7 0 0 1-5-13.5Z"/><path d="m18 6 .6 1.4L20 8l-1.4.6L18 10l-.6-1.4L16 8l1.4-.6Z"/>',
    heart: '<path d="M12 20s-7.5-4.6-9-9.5C2 6.9 4.3 4 7.4 4c2 0 3.5 1.1 4.6 2.6C13.1 5.1 14.6 4 16.6 4 19.7 4 22 6.9 21 10.5 19.5 15.4 12 20 12 20Z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    alarm: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M5 3 2 6M22 6l-3-3M6.4 19.4 4 22M17.6 19.4 20 22"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    more: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 3.1a4 4 0 0 1 0 7.8M22 21a7 7 0 0 0-4-6.3"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
    sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 1.5v2M12 20.5v2M3.5 12h-2M22.5 12h-2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
    flame: '<path d="M12 22c4.4 0 7-2.9 7-6.6 0-3.7-2.6-6.1-4.2-8.4-.6 1.8-1.6 3-3 3.6.3-2.8-.8-5.6-3.3-8.1C8.8 6.3 5 9.6 5 15.4 5 19.1 7.6 22 12 22Z"/>',
    scale: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 9a5.5 5.5 0 0 1 8 0l-2 3h-4Z"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',
    pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
    play: '<path d="M7 4.5v15l12-7.5Z"/>',
    flag: '<path d="M5 22V4M5 4h11l-2 4 2 4H5"/>',
    sparkle: '<path d="M12 3 13.8 9 20 11l-6.2 2L12 19l-1.8-6L4 11l6.2-2Z"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
    skip: '<path d="M5 4.5v15l10-7.5Z"/><path d="M19 5v14"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    drop: '<path d="M12 2.5s7 7.6 7 12.5a7 7 0 0 1-14 0c0-4.9 7-12.5 7-12.5Z"/>',
    book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5Z"/><path d="M4 21.5V4.5M8 7h8"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 4 13c0-6 5-10 16-10 0 11-4 17-9 17Z"/><path d="M4 21c3-5 6-8 11-11"/>',
    arrow: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    calendarCheck: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M9 15l2 2 4-4"/>',
    palette: '<path d="M12 21a9 9 0 1 1 9-9c0 2.2-1.8 3.5-4 3.5h-1.8a1.7 1.7 0 0 0-1.2 2.9c.6.6.2 2.6-2 2.6Z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
    heartPulse: '<path d="M12 20s-7.5-4.6-9-9.5C2 6.9 4.3 4 7.4 4c2 0 3.5 1.1 4.6 2.6C13.1 5.1 14.6 4 16.6 4 19.7 4 22 6.9 21 10.5c-.3 1-.8 2-1.5 3"/><path d="M3.5 12.5h4l2-3 3 6 2-3h6"/>',
    devices: '<rect x="2" y="5" width="13" height="10" rx="1.5"/><path d="M5 19h7M8.5 15v4"/><rect x="16" y="8" width="6" height="12" rx="1.5"/><path d="M19 17h.01"/>',
    run: '<circle cx="14.5" cy="4.5" r="2"/><path d="m8 21 3-6 3 2v4M6 12l3-3.5 4 1.5 2.5 3H19M11 15l-1.5-4"/>',
    bookOpen: '<path d="M2 5.5C4.5 4 8.5 4 12 6c3.5-2 7.5-2 10-.5V19c-2.5-1.5-6.5-1.5-10 .5-3.5-2-7.5-2-10-.5Z"/><path d="M12 6v13.5"/>',
    flower: '<circle cx="12" cy="9" r="2.5"/><path d="M12 6.5C12 4 13.5 3 15 3c0 2-1 3.5-3 3.5ZM12 6.5C12 4 10.5 3 9 3c0 2 1 3.5 3 3.5ZM14.5 9c2.5 0 3.5 1.5 3.5 3-2 0-3.5-1-3.5-3ZM9.5 9C7 9 6 10.5 6 12c2 0 3.5-1 3.5-3ZM12 11.5V21M12 17c-2-2-4-2-6-1.5M12 17c2-2 4-2 6-1.5"/>',
    zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0Z"/><path d="M16 5h3a2 2 0 0 1-2 4h-1M8 5H5a2 2 0 0 0 2 4h1M12 13v4M8 21h8M9 17h6"/>',
    tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    megaphone: '<path d="M3 10v4a1 1 0 0 0 1 1h3l6 4V5L7 9H4a1 1 0 0 0-1 1Z"/><path d="M17 8a5 5 0 0 1 0 8"/>',
    lock: '<rect x="4" y="10.5" width="16" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    skipForward: '<path d="m5 4 10 8-10 8Z"/><path d="M19 5v14"/>',
    hourglass: '<path d="M6 2h12M6 22h12M7 2c0 5 10 5 10 10S7 17 7 22M17 2c0 5-10 5-10 10s10 5 10 10"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
  };

  G.icon = function (name, cls) {
    const body = P[name] || P.sparkle;
    return `<svg class="icon${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  };
})(window.Ghars = window.Ghars || {});
