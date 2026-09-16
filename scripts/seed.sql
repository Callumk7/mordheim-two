INSERT OR IGNORE INTO campaigns (id, name)
VALUES
  ('city-of-the-damned', 'City of the Damned');

INSERT OR IGNORE INTO warbands (id, campaign_id, name, faction, bio, gold, rating, wins)
VALUES
  ('reikland-reavers', 'city-of-the-damned', 'Reikland Reavers', 'Mercenaries', 'Disciplined veterans from Reikland who prize steady aim and mutual loyalty.', 86, 186, 7),
  ('sisters-of-sigmar', 'city-of-the-damned', 'The Silver Hammers', 'Sisters of Sigmar', 'Devout sisters who scour the ruins to deny wyrdstone to the corrupt.', 121, 221, 10),
  ('night-runners', 'city-of-the-damned', 'Night Runners', 'Skaven', 'A swift and treacherous pack hunting warpstone beneath Mordheim.', 54, 154, 5),
  ('the-unquiet', 'city-of-the-damned', 'The Unquiet', 'Undead', 'Restless dead bound to Count Vashenko''s will and hunger.', 108, 208, 8),
  ('witch-hunters', 'city-of-the-damned', 'Ash and Iron', 'Witch Hunters', 'Zealous hunters who bring fire and judgment to the City of the Damned.', 73, 173, 6),
  ('possessed', 'city-of-the-damned', 'Children of the Pit', 'The Possessed', 'Twisted devotees seeking dark favor among Mordheim''s ruins.', 97, 197, 7);

INSERT OR IGNORE INTO warriors (id, campaign_id, name, class, status, warband_id)
VALUES
  ('otto-falk', 'city-of-the-damned', 'Otto Falk', 'Captain', 'Alive', 'reikland-reavers'),
  ('albrecht-keller', 'city-of-the-damned', 'Albrecht Keller', 'Champion', 'Alive', 'reikland-reavers'),
  ('bertha-bestraufrung', 'city-of-the-damned', 'Bertha Bestraufrung', 'Matriarch', 'Alive', 'sisters-of-sigmar'),
  ('greta-voss', 'city-of-the-damned', 'Greta Voss', 'Sister Superior', 'Alive', 'sisters-of-sigmar'),
  ('skritch', 'city-of-the-damned', 'Skritch', 'Assassin Adept', 'Alive', 'night-runners'),
  ('squeek', 'city-of-the-damned', 'Squeek', 'Black Skaven', 'Alive', 'night-runners'),
  ('count-vashenko', 'city-of-the-damned', 'Count Vashenko', 'Vampire', 'Alive', 'the-unquiet'),
  ('hans-the-restless', 'city-of-the-damned', 'Hans the Restless', 'Dreg', 'Alive', 'the-unquiet'),
  ('gregor-stahl', 'city-of-the-damned', 'Gregor Stahl', 'Witch Hunter Captain', 'Alive', 'witch-hunters'),
  ('matthias-kern', 'city-of-the-damned', 'Matthias Kern', 'Flagellant', 'Alive', 'witch-hunters'),
  ('marius-the-changed', 'city-of-the-damned', 'Marius the Changed', 'Magister', 'Alive', 'possessed'),
  ('gorath', 'city-of-the-damned', 'Gorath', 'Mutant', 'Alive', 'possessed');

-- Victories are initially inserted as pending so their participants can be
-- created before the composite winner-participant foreign key is populated.
INSERT OR IGNORE INTO matches (id, campaign_id, name, scenario, status, result)
VALUES
  ('market-square-ambush', 'city-of-the-damned', 'Market Square Ambush', 'Surprise Attack', 'Completed', 'Pending'),
  ('temple-standoff', 'city-of-the-damned', 'Temple Standoff', 'Occupy', 'Completed', 'Pending'),
  ('wyrdstone-rush', 'city-of-the-damned', 'Wyrdstone Rush', 'Wyrdstone Hunt', 'Completed', 'Pending'),
  ('old-road-draw', 'city-of-the-damned', 'Old Road Stalemate', 'Chance Encounter', 'Completed', 'Draw');

INSERT OR IGNORE INTO warband_matches (id, match_id, warband_id)
VALUES
  ('market-square-reikland', 'market-square-ambush', 'reikland-reavers'),
  ('market-square-night-runners', 'market-square-ambush', 'night-runners'),
  ('temple-sisters', 'temple-standoff', 'sisters-of-sigmar'),
  ('temple-unquiet', 'temple-standoff', 'the-unquiet'),
  ('wyrdstone-witch-hunters', 'wyrdstone-rush', 'witch-hunters'),
  ('wyrdstone-possessed', 'wyrdstone-rush', 'possessed'),
  ('old-road-reikland', 'old-road-draw', 'reikland-reavers'),
  ('old-road-witch-hunters', 'old-road-draw', 'witch-hunters');

UPDATE matches
SET result = 'Victory', winner_warband_id = 'reikland-reavers'
WHERE id = 'market-square-ambush';

UPDATE matches
SET result = 'Victory', winner_warband_id = 'sisters-of-sigmar'
WHERE id = 'temple-standoff';

UPDATE matches
SET result = 'Victory', winner_warband_id = 'possessed'
WHERE id = 'wyrdstone-rush';

-- Seed resolved events directly so campaign projections have injuries, deaths,
-- recoveries, knockdowns, and combat statistics to display immediately.
INSERT OR IGNORE INTO events (
  id,
  campaign_id,
  match_id,
  attacker_warband_id,
  attacker_warrior_id,
  defender_warband_id,
  defender_warrior_id,
  notes,
  is_processed,
  outcome,
  resolved_at,
  created_at,
  updated_at
)
VALUES
  ('market-otto-injures-skritch', 'city-of-the-damned', 'market-square-ambush', 'reikland-reavers', 'otto-falk', 'night-runners', 'skritch', 'Otto caught Skritch in the open.', 1, 'Injury', '2026-01-10T19:05:00.000Z', '2026-01-10T19:04:00.000Z', '2026-01-10T19:05:00.000Z'),
  ('market-skritch-recovers-albrecht', 'city-of-the-damned', 'market-square-ambush', 'night-runners', 'skritch', 'reikland-reavers', 'albrecht-keller', 'Albrecht shook off the knockdown.', 1, 'Recovery', '2026-01-10T19:12:00.000Z', '2026-01-10T19:11:00.000Z', '2026-01-10T19:12:00.000Z'),
  ('market-otto-kills-squeek', 'city-of-the-damned', 'market-square-ambush', 'reikland-reavers', 'otto-falk', 'night-runners', 'squeek', 'Squeek fell defending the market gate.', 1, 'Death', '2026-01-10T19:21:00.000Z', '2026-01-10T19:20:00.000Z', '2026-01-10T19:21:00.000Z'),
  ('temple-bertha-injures-hans', 'city-of-the-damned', 'temple-standoff', 'sisters-of-sigmar', 'bertha-bestraufrung', 'the-unquiet', 'hans-the-restless', 'Bertha drove the undead back from the shrine.', 1, 'Injury', '2026-01-17T20:08:00.000Z', '2026-01-17T20:07:00.000Z', '2026-01-17T20:08:00.000Z'),
  ('temple-vashenko-injures-greta', 'city-of-the-damned', 'temple-standoff', 'the-unquiet', 'count-vashenko', 'sisters-of-sigmar', 'greta-voss', 'Vashenko struck from the chapel shadows.', 1, 'Injury', '2026-01-17T20:15:00.000Z', '2026-01-17T20:14:00.000Z', '2026-01-17T20:15:00.000Z'),
  ('temple-bertha-recovers-vashenko', 'city-of-the-damned', 'temple-standoff', 'sisters-of-sigmar', 'bertha-bestraufrung', 'the-unquiet', 'count-vashenko', 'Vashenko recovered before the final bell.', 1, 'Recovery', '2026-01-17T20:24:00.000Z', '2026-01-17T20:23:00.000Z', '2026-01-17T20:24:00.000Z'),
  ('wyrdstone-marius-injures-gregor', 'city-of-the-damned', 'wyrdstone-rush', 'possessed', 'marius-the-changed', 'witch-hunters', 'gregor-stahl', 'Warped magic threw Gregor from the wyrdstone cache.', 1, 'Injury', '2026-01-24T18:10:00.000Z', '2026-01-24T18:09:00.000Z', '2026-01-24T18:10:00.000Z'),
  ('wyrdstone-gregor-kills-gorath', 'city-of-the-damned', 'wyrdstone-rush', 'witch-hunters', 'gregor-stahl', 'possessed', 'gorath', 'Gregor landed a fatal counterattack.', 1, 'Death', '2026-01-24T18:18:00.000Z', '2026-01-24T18:17:00.000Z', '2026-01-24T18:18:00.000Z'),
  ('wyrdstone-marius-injures-matthias', 'city-of-the-damned', 'wyrdstone-rush', 'possessed', 'marius-the-changed', 'witch-hunters', 'matthias-kern', 'Matthias was overwhelmed near the final shard.', 1, 'Injury', '2026-01-24T18:28:00.000Z', '2026-01-24T18:27:00.000Z', '2026-01-24T18:28:00.000Z'),
  ('old-road-otto-injures-matthias', 'city-of-the-damned', 'old-road-draw', 'reikland-reavers', 'otto-falk', 'witch-hunters', 'matthias-kern', 'The clash opened with a brutal exchange.', 1, 'Injury', '2026-01-31T21:03:00.000Z', '2026-01-31T21:02:00.000Z', '2026-01-31T21:03:00.000Z'),
  ('old-road-gregor-injures-albrecht', 'city-of-the-damned', 'old-road-draw', 'witch-hunters', 'gregor-stahl', 'reikland-reavers', 'albrecht-keller', 'Gregor answered before both bands withdrew.', 1, 'Injury', '2026-01-31T21:11:00.000Z', '2026-01-31T21:10:00.000Z', '2026-01-31T21:11:00.000Z');
