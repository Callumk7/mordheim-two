INSERT OR IGNORE INTO warbands (id, name, faction, captain, rating, wins, status)
VALUES
  ('reikland-reavers', 'Reikland Reavers', 'Mercenaries', 'Otto Falk', 186, 7, 'Ready'),
  ('sisters-of-sigmar', 'The Silver Hammers', 'Sisters of Sigmar', 'Bertha Bestraufrung', 221, 10, 'Ready'),
  ('night-runners', 'Night Runners', 'Skaven', 'Skritch', 154, 5, 'Recruiting'),
  ('the-unquiet', 'The Unquiet', 'Undead', 'Count Vashenko', 208, 8, 'Recovering'),
  ('witch-hunters', 'Ash and Iron', 'Witch Hunters', 'Gregor Stahl', 173, 6, 'Ready'),
  ('possessed', 'Children of the Pit', 'The Possessed', 'Marius the Changed', 197, 7, 'Recovering');

INSERT OR IGNORE INTO warriors (id, name, class, status, warband_id)
VALUES
  ('otto-falk', 'Otto Falk', 'Captain', 'Alive', 'reikland-reavers'),
  ('albrecht-keller', 'Albrecht Keller', 'Champion', 'Alive', 'reikland-reavers'),
  ('bertha-bestraufrung', 'Bertha Bestraufrung', 'Matriarch', 'Alive', 'sisters-of-sigmar'),
  ('greta-voss', 'Greta Voss', 'Sister Superior', 'Alive', 'sisters-of-sigmar'),
  ('skritch', 'Skritch', 'Assassin Adept', 'Alive', 'night-runners'),
  ('squeek', 'Squeek', 'Black Skaven', 'Alive', 'night-runners'),
  ('count-vashenko', 'Count Vashenko', 'Vampire', 'Alive', 'the-unquiet'),
  ('hans-the-restless', 'Hans the Restless', 'Dreg', 'Alive', 'the-unquiet'),
  ('gregor-stahl', 'Gregor Stahl', 'Witch Hunter Captain', 'Alive', 'witch-hunters'),
  ('matthias-kern', 'Matthias Kern', 'Flagellant', 'Alive', 'witch-hunters'),
  ('marius-the-changed', 'Marius the Changed', 'Magister', 'Alive', 'possessed'),
  ('gorath', 'Gorath', 'Mutant', 'Alive', 'possessed');

-- Victories are initially inserted as pending so their participants can be
-- created before the composite winner-participant foreign key is populated.
INSERT OR IGNORE INTO matches (id, name, scenario, status, result)
VALUES
  ('market-square-ambush', 'Market Square Ambush', 'Surprise Attack', 'Completed', 'Pending'),
  ('temple-standoff', 'Temple Standoff', 'Occupy', 'Completed', 'Pending'),
  ('wyrdstone-rush', 'Wyrdstone Rush', 'Wyrdstone Hunt', 'Completed', 'Pending'),
  ('old-road-draw', 'Old Road Stalemate', 'Chance Encounter', 'Completed', 'Draw');

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
  ('market-otto-injures-skritch', 'market-square-ambush', 'reikland-reavers', 'otto-falk', 'night-runners', 'skritch', 'Otto caught Skritch in the open.', 1, 'Injury', '2026-01-10T19:05:00.000Z', '2026-01-10T19:04:00.000Z', '2026-01-10T19:05:00.000Z'),
  ('market-skritch-recovers-albrecht', 'market-square-ambush', 'night-runners', 'skritch', 'reikland-reavers', 'albrecht-keller', 'Albrecht shook off the knockdown.', 1, 'Recovery', '2026-01-10T19:12:00.000Z', '2026-01-10T19:11:00.000Z', '2026-01-10T19:12:00.000Z'),
  ('market-otto-kills-squeek', 'market-square-ambush', 'reikland-reavers', 'otto-falk', 'night-runners', 'squeek', 'Squeek fell defending the market gate.', 1, 'Death', '2026-01-10T19:21:00.000Z', '2026-01-10T19:20:00.000Z', '2026-01-10T19:21:00.000Z'),
  ('temple-bertha-injures-hans', 'temple-standoff', 'sisters-of-sigmar', 'bertha-bestraufrung', 'the-unquiet', 'hans-the-restless', 'Bertha drove the undead back from the shrine.', 1, 'Injury', '2026-01-17T20:08:00.000Z', '2026-01-17T20:07:00.000Z', '2026-01-17T20:08:00.000Z'),
  ('temple-vashenko-injures-greta', 'temple-standoff', 'the-unquiet', 'count-vashenko', 'sisters-of-sigmar', 'greta-voss', 'Vashenko struck from the chapel shadows.', 1, 'Injury', '2026-01-17T20:15:00.000Z', '2026-01-17T20:14:00.000Z', '2026-01-17T20:15:00.000Z'),
  ('temple-bertha-recovers-vashenko', 'temple-standoff', 'sisters-of-sigmar', 'bertha-bestraufrung', 'the-unquiet', 'count-vashenko', 'Vashenko recovered before the final bell.', 1, 'Recovery', '2026-01-17T20:24:00.000Z', '2026-01-17T20:23:00.000Z', '2026-01-17T20:24:00.000Z'),
  ('wyrdstone-marius-injures-gregor', 'wyrdstone-rush', 'possessed', 'marius-the-changed', 'witch-hunters', 'gregor-stahl', 'Warped magic threw Gregor from the wyrdstone cache.', 1, 'Injury', '2026-01-24T18:10:00.000Z', '2026-01-24T18:09:00.000Z', '2026-01-24T18:10:00.000Z'),
  ('wyrdstone-gregor-kills-gorath', 'wyrdstone-rush', 'witch-hunters', 'gregor-stahl', 'possessed', 'gorath', 'Gregor landed a fatal counterattack.', 1, 'Death', '2026-01-24T18:18:00.000Z', '2026-01-24T18:17:00.000Z', '2026-01-24T18:18:00.000Z'),
  ('wyrdstone-marius-injures-matthias', 'wyrdstone-rush', 'possessed', 'marius-the-changed', 'witch-hunters', 'matthias-kern', 'Matthias was overwhelmed near the final shard.', 1, 'Injury', '2026-01-24T18:28:00.000Z', '2026-01-24T18:27:00.000Z', '2026-01-24T18:28:00.000Z'),
  ('old-road-otto-injures-matthias', 'old-road-draw', 'reikland-reavers', 'otto-falk', 'witch-hunters', 'matthias-kern', 'The clash opened with a brutal exchange.', 1, 'Injury', '2026-01-31T21:03:00.000Z', '2026-01-31T21:02:00.000Z', '2026-01-31T21:03:00.000Z'),
  ('old-road-gregor-injures-albrecht', 'old-road-draw', 'witch-hunters', 'gregor-stahl', 'reikland-reavers', 'albrecht-keller', 'Gregor answered before both bands withdrew.', 1, 'Injury', '2026-01-31T21:11:00.000Z', '2026-01-31T21:10:00.000Z', '2026-01-31T21:11:00.000Z');
