-- ==========================================
-- Migration: Add prompts for new game types
-- ==========================================

-- Hot Takes prompts
INSERT INTO game_prompts (game_type, prompt_data, tags) VALUES
  ('hot_takes', '{"statement": "Pineapple belongs on pizza"}', ARRAY['food', 'controversial']),
  ('hot_takes', '{"statement": "The book is always better than the movie"}', ARRAY['entertainment', 'debate']),
  ('hot_takes', '{"statement": "Social media has done more harm than good"}', ARRAY['technology', 'society']),
  ('hot_takes', '{"statement": "Remote work is better than office work"}', ARRAY['work', 'lifestyle']),
  ('hot_takes', '{"statement": "Dogs are better pets than cats"}', ARRAY['pets', 'fun']),
  ('hot_takes', '{"statement": "Money can buy happiness"}', ARRAY['philosophical', 'values']),
  ('hot_takes', '{"statement": "The Office is overrated"}', ARRAY['entertainment', 'controversial']),
  ('hot_takes', '{"statement": "Cold weather is better than hot weather"}', ARRAY['lifestyle', 'preferences']),
  ('hot_takes', '{"statement": "Video games are a waste of time"}', ARRAY['entertainment', 'controversial']),
  ('hot_takes', '{"statement": "Breakfast is the most important meal of the day"}', ARRAY['food', 'health'])
ON CONFLICT DO NOTHING;

-- Guess Who Said It prompts
INSERT INTO game_prompts (game_type, prompt_data, tags) VALUES
  ('guess_who_said_it', '{"question": "What''s your most embarrassing moment?"}', ARRAY['personal', 'fun']),
  ('guess_who_said_it', '{"question": "If you could have any superpower, what would it be?"}', ARRAY['creative', 'fun']),
  ('guess_who_said_it', '{"question": "What''s your biggest fear?"}', ARRAY['personal', 'deep']),
  ('guess_who_said_it', '{"question": "What''s the worst date you''ve ever been on?"}', ARRAY['dating', 'funny']),
  ('guess_who_said_it', '{"question": "What''s your guilty pleasure?"}', ARRAY['personal', 'fun']),
  ('guess_who_said_it', '{"question": "If you could live in any time period, when would it be?"}', ARRAY['creative', 'preferences']),
  ('guess_who_said_it', '{"question": "What''s the weirdest thing you''ve ever eaten?"}', ARRAY['food', 'funny']),
  ('guess_who_said_it', '{"question": "What''s one thing most people don''t know about you?"}', ARRAY['personal', 'surprising']),
  ('guess_who_said_it', '{"question": "If you could only eat one food for the rest of your life, what would it be?"}', ARRAY['food', 'preferences']),
  ('guess_who_said_it', '{"question": "What''s the most spontaneous thing you''ve ever done?"}', ARRAY['personal', 'adventure'])
ON CONFLICT DO NOTHING;

-- Most Likely To prompts
INSERT INTO game_prompts (game_type, prompt_data, tags) VALUES
  ('most_likely_to', '{"scenario": "Most likely to become famous"}', ARRAY['future', 'achievement']),
  ('most_likely_to', '{"scenario": "Most likely to survive a zombie apocalypse"}', ARRAY['survival', 'fun']),
  ('most_likely_to', '{"scenario": "Most likely to forget their own birthday"}', ARRAY['forgetful', 'funny']),
  ('most_likely_to', '{"scenario": "Most likely to win a Nobel Prize"}', ARRAY['achievement', 'intelligence']),
  ('most_likely_to', '{"scenario": "Most likely to become a millionaire"}', ARRAY['success', 'money']),
  ('most_likely_to', '{"scenario": "Most likely to get lost in their own neighborhood"}', ARRAY['direction', 'funny']),
  ('most_likely_to', '{"scenario": "Most likely to start their own business"}', ARRAY['entrepreneurship', 'ambitious']),
  ('most_likely_to', '{"scenario": "Most likely to laugh at the wrong time"}', ARRAY['humor', 'awkward']),
  ('most_likely_to', '{"scenario": "Most likely to become a viral meme"}', ARRAY['internet', 'funny']),
  ('most_likely_to', '{"scenario": "Most likely to eat pizza every day for a week"}', ARRAY['food', 'habits'])
ON CONFLICT DO NOTHING;

COMMENT ON TABLE game_prompts IS 'Pre-written prompts for all game types with tags for categorization';
