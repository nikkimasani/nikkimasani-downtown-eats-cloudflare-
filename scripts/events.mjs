// Upcoming Rockets (Toyota Center) and Astros (Daikin Park) home games from ESPN's public schedule feed,
// so the map can show game-day crowds and the app can warn about busy streets.
import fs from 'fs';
const TEAMS = [
  { url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/hou/schedule', team: 'Rockets', emoji: '🏀', venue: 'Toyota Center' },
  { url: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/hou/schedule', team: 'Astros', emoji: '⚾', venue: 'Daikin Park' },
];
const out = [], now = Date.now();
for (const t of TEAMS) {
  try {
    const j = await (await fetch(t.url, { headers: { 'user-agent': 'Mozilla/5.0 (DowntownEats events)' } })).json();
    for (const e of j.events || []) {
      const c = e.competitions?.[0]; const home = c?.competitors?.find((x) => x.homeAway === 'home'); if (!home || !/hou/i.test(home.team?.abbreviation || '')) continue;
      const at = Date.parse(e.date); if (!(at > now - 6 * 3600e3 && at < now + 21 * 86400e3)) continue;
      const opp = c.competitors.find((x) => x.homeAway === 'away')?.team?.displayName || '';
      out.push({ team: t.team, emoji: t.emoji, venue: t.venue, vs: opp, start: new Date(at).toISOString() });
    }
  } catch (err) { console.log('events: ' + t.team + ' unavailable'); }
}
out.sort((a, b) => a.start.localeCompare(b.start));
fs.writeFileSync('public/events.json', JSON.stringify({ updated: new Date().toISOString(), source: 'ESPN public schedules', events: out }, null, 1));
console.log('events: ' + out.length + ' home games in the next 3 weeks');
