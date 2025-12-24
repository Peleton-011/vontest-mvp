-- ==========================================
-- Migration: Add prompts for new game types
-- ==========================================

-- Hot Takes prompts
INSERT INTO game_prompts (game_type, prompt_data, tags) VALUES
  ('hot_takes', '{"statement": "Pineapple belongs on pizza", "visual": {"type": "emoji", "value": "🍕"}}', ARRAY['food', 'controversial']),
  ('hot_takes', '{"statement": "The book is always better than the movie", "visual": {"type": "emoji", "value": "📚"}}', ARRAY['entertainment', 'debate']),
  ('hot_takes', '{"statement": "Social media has done more harm than good", "visual": {"type": "emoji", "value": "📱"}}', ARRAY['technology', 'society']),
  ('hot_takes', '{"statement": "Remote work is better than office work", "visual": {"type": "emoji", "value": "💻"}}', ARRAY['work', 'lifestyle']),
  ('hot_takes', '{"statement": "Dogs are better pets than cats", "visual": {"type": "emoji", "value": "🐕"}}', ARRAY['pets', 'fun']),
  ('hot_takes', '{"statement": "Money can buy happiness", "visual": {"type": "emoji", "value": "💰"}}', ARRAY['philosophical', 'values']),
  ('hot_takes', '{"statement": "The Office is overrated", "visual": {"type": "emoji", "value": "📺"}}', ARRAY['entertainment', 'controversial']),
  ('hot_takes', '{"statement": "Cold weather is better than hot weather", "visual": {"type": "emoji", "value": "❄️"}}', ARRAY['lifestyle', 'preferences']),
  ('hot_takes', '{"statement": "Video games are a waste of time", "visual": {"type": "emoji", "value": "🎮"}}', ARRAY['entertainment', 'controversial']),
  ('hot_takes', '{"statement": "Breakfast is the most important meal of the day", "visual": {"type": "emoji", "value": "🍳"}}', ARRAY['food', 'health'])
ON CONFLICT DO NOTHING;

-- Guess Who Said It prompts
INSERT INTO game_prompts (game_type, prompt_data, tags) VALUES
  ('guess_who_said_it', '{"question": "What''s your most embarrassing moment?", "visual": {"type": "emoji", "value": "😳"}}', ARRAY['personal', 'fun']),
  ('guess_who_said_it', '{"question": "If you could have any superpower, what would it be?", "visual": {"type": "emoji", "value": "🦸"}}', ARRAY['creative', 'fun']),
  ('guess_who_said_it', '{"question": "What''s your biggest fear?", "visual": {"type": "emoji", "value": "😱"}}', ARRAY['personal', 'deep']),
  ('guess_who_said_it', '{"question": "What''s the worst date you''ve ever been on?", "visual": {"type": "emoji", "value": "💔"}}', ARRAY['dating', 'funny']),
  ('guess_who_said_it', '{"question": "What''s your guilty pleasure?", "visual": {"type": "emoji", "value": "🙈"}}', ARRAY['personal', 'fun']),
  ('guess_who_said_it', '{"question": "If you could live in any time period, when would it be?", "visual": {"type": "emoji", "value": "⏰"}}', ARRAY['creative', 'preferences']),
  ('guess_who_said_it', '{"question": "What''s the weirdest thing you''ve ever eaten?", "visual": {"type": "emoji", "value": "🤢"}}', ARRAY['food', 'funny']),
  ('guess_who_said_it', '{"question": "What''s one thing most people don''t know about you?", "visual": {"type": "emoji", "value": "🤫"}}', ARRAY['personal', 'surprising']),
  ('guess_who_said_it', '{"question": "If you could only eat one food for the rest of your life, what would it be?", "visual": {"type": "emoji", "value": "🍔"}}', ARRAY['food', 'preferences']),
  ('guess_who_said_it', '{"question": "What''s the most spontaneous thing you''ve ever done?", "visual": {"type": "emoji", "value": "🎲"}}', ARRAY['personal', 'adventure'])
ON CONFLICT DO NOTHING;

-- Most Likely To prompts
INSERT INTO game_prompts (game_type, prompt_data, tags) VALUES
  ('most_likely_to', '{"scenario": "Most likely to become famous", "visual": {"type": "emoji", "value": "⭐"}}', ARRAY['future', 'achievement']),
  ('most_likely_to', '{"scenario": "Most likely to survive a zombie apocalypse", "visual": {"type": "emoji", "value": "🧟"}}', ARRAY['survival', 'fun']),
  ('most_likely_to', '{"scenario": "Most likely to forget their own birthday", "visual": {"type": "emoji", "value": "🎂"}}', ARRAY['forgetful', 'funny']),
  ('most_likely_to', '{"scenario": "Most likely to win a Nobel Prize", "visual": {"type": "emoji", "value": "🏆"}}', ARRAY['achievement', 'intelligence']),
  ('most_likely_to', '{"scenario": "Most likely to become a millionaire", "visual": {"type": "emoji", "value": "💵"}}', ARRAY['success', 'money']),
  ('most_likely_to', '{"scenario": "Most likely to get lost in their own neighborhood", "visual": {"type": "emoji", "value": "🗺️"}}', ARRAY['direction', 'funny']),
  ('most_likely_to', '{"scenario": "Most likely to start their own business", "visual": {"type": "emoji", "value": "💼"}}', ARRAY['entrepreneurship', 'ambitious']),
  ('most_likely_to', '{"scenario": "Most likely to laugh at the wrong time", "visual": {"type": "emoji", "value": "😂"}}', ARRAY['humor', 'awkward']),
  ('most_likely_to', '{"scenario": "Most likely to become a viral meme", "visual": {"type": "emoji", "value": "📸"}}', ARRAY['internet', 'funny']),
  ('most_likely_to', '{"scenario": "Most likely to eat pizza every day for a week", "visual": {"type": "emoji", "value": "🍕"}}', ARRAY['food', 'habits'])
ON CONFLICT DO NOTHING;

COMMENT ON TABLE game_prompts IS 'Pre-written prompts for all game types with tags for categorization';
