const fs = require('fs');

const svgIcons = {
  info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  email: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  check: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
  users: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  user: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  hourglass: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>`,
  clock: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  barChart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  alert: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  money: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>`,
  eye: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  edit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
  sun: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  moon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  globe: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  laptop: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
  building: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="22"/><line x1="15" y1="22" x2="15" y2="22"/><line x1="9" y1="6" x2="9" y2="6"/><line x1="15" y1="6" x2="15" y2="6"/><line x1="9" y1="10" x2="9" y2="10"/><line x1="15" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="9" y2="14"/><line x1="15" y1="14" x2="15" y2="14"/><line x1="9" y1="18" x2="9" y2="18"/><line x1="15" y1="18" x2="15" y2="18"/></svg>`,
  family: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  city: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="10" width="6" height="12"/><rect x="8" y="2" width="8" height="20"/><rect x="16" y="14" width="6" height="8"/></svg>`,
  party: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`
};

let indexHtml = fs.readFileSync('index.html', 'utf8');

// Replace all occurrences in index.html
indexHtml = indexHtml.replace(/ℹ️/g, svgIcons.info);
indexHtml = indexHtml.replace(/📧/g, svgIcons.email);
indexHtml = indexHtml.replace(/✅(?!\sPaid|\sMark)/g, svgIcons.check);
indexHtml = indexHtml.replace(/🌙(?!\sNight)/g, svgIcons.moon);
indexHtml = indexHtml.replace(/👤/g, svgIcons.user);
indexHtml = indexHtml.replace(/👥/g, svgIcons.users);
indexHtml = indexHtml.replace(/⏳(?!\sPending|\sMark)/g, svgIcons.hourglass);
indexHtml = indexHtml.replace(/⏰/g, svgIcons.clock);
indexHtml = indexHtml.replace(/📊/g, svgIcons.barChart);
indexHtml = indexHtml.replace(/💰/g, svgIcons.money);
indexHtml = indexHtml.replace(/⚠️/g, svgIcons.alert);
indexHtml = indexHtml.replace(/🌐/g, svgIcons.globe);
indexHtml = indexHtml.replace(/💻/g, svgIcons.laptop);
indexHtml = indexHtml.replace(/⚙️/g, svgIcons.alert);
indexHtml = indexHtml.replace(/✅ Paid/g, `${svgIcons.check} Paid`);
indexHtml = indexHtml.replace(/⏳ Pending/g, `${svgIcons.hourglass} Pending`);
indexHtml = indexHtml.replace(/🌅 Morning/g, `${svgIcons.sun} Morning`);
indexHtml = indexHtml.replace(/🌇 Evening/g, `${svgIcons.sun} Evening`);
indexHtml = indexHtml.replace(/🌙 Night/g, `${svgIcons.moon} Night`);
indexHtml = indexHtml.replace(/✏️ Edit/g, `${svgIcons.edit} Edit`);
indexHtml = indexHtml.replace(/⏳ Mark/g, `${svgIcons.hourglass} Mark`);
indexHtml = indexHtml.replace(/✅ Mark/g, `${svgIcons.check} Mark`);
indexHtml = indexHtml.replace(/��/g, svgIcons.sun);
indexHtml = indexHtml.replace(/🌇/g, svgIcons.sun);
indexHtml = indexHtml.replace(/🌙/g, svgIcons.moon);
indexHtml = indexHtml.replace(/✏️/g, svgIcons.edit);
indexHtml = indexHtml.replace(/☀️/g, svgIcons.sun);

fs.writeFileSync('index.html', indexHtml);

let appJs = fs.readFileSync('app-v3.js', 'utf8');

appJs = appJs.replace(/'☀️' : '🌙'/g, `\`${svgIcons.sun}\` : \`${svgIcons.moon}\``);
appJs = appJs.replace(/>👥</g, `>${svgIcons.users}<`);
appJs = appJs.replace(/>👁</g, `>${svgIcons.eye}<`);
appJs = appJs.replace(/>✏️</g, `>${svgIcons.edit}<`);
appJs = appJs.replace(/>🗑</g, `>${svgIcons.trash}<`);
appJs = appJs.replace(/>✓</g, `>${svgIcons.check}<`);
appJs = appJs.replace(/>✗</g, `>${svgIcons.alert}<`);
appJs = appJs.replace(/'🏛️','👨‍👦','🏙️'/g, `[\`${svgIcons.building}\`,\`${svgIcons.family}\`,\`${svgIcons.city}\`]`);
appJs = appJs.replace(/>🌅 Morning</g, `>${svgIcons.sun} Morning<`);
appJs = appJs.replace(/>🌇 Evening</g, `>${svgIcons.sun} Evening<`);
appJs = appJs.replace(/>🌙 Night</g, `>${svgIcons.moon} Night<`);
appJs = appJs.replace(/>✏️ Edit Timings</g, `>${svgIcons.edit} Edit Timings<`);
appJs = appJs.replace(/shiftName === 'Morning' \? '🌅' : shiftName === 'Evening' \? '🌇' : '🌙'/g, `shiftName === 'Morning' ? \`${svgIcons.sun}\` : shiftName === 'Evening' ? \`${svgIcons.sun}\` : \`${svgIcons.moon}\``);
appJs = appJs.replace(/>🎉</g, `>${svgIcons.check}<`);
appJs = appJs.replace(/🌅/g, svgIcons.sun);
appJs = appJs.replace(/🌇/g, svgIcons.sun);
appJs = appJs.replace(/🌙/g, svgIcons.moon);
appJs = appJs.replace(/✏️/g, svgIcons.edit);
appJs = appJs.replace(/☀️/g, svgIcons.sun);

fs.writeFileSync('app-v3.js', appJs);
console.log('Emojis replaced with SVGs successfully.');
