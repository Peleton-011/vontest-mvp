-- ==========================================
-- Sample Prompt Package Data
-- ==========================================
-- This file contains sample data for testing the prompt packages system.
-- Run this AFTER migrations 028 and 029 are applied.

-- ==========================================
-- SAMPLE PACKAGE: Date Night ($0.99)
-- ==========================================

-- Create the package
INSERT INTO prompt_packages (
  slug,
  name,
  description,
  theme_color,
  icon,
  price_cents,
  is_active,
  is_featured,
  sort_order,
  tags,
  release_date
) VALUES (
  'date-night',
  'Date Night Questions',
  '50 engaging questions designed to spark deeper conversations with your partner. From lighthearted fun to meaningful discussions about your relationship, dreams, and memories together.',
  '#FF6B9D',
  '💕',
  99,
  true,
  true,
  1,
  ARRAY['couples', 'romance', 'deep', 'fun'],
  NOW()
) ON CONFLICT (slug) DO NOTHING;

-- Add prompts to the package
DO $$
DECLARE
  v_package_id UUID;
BEGIN
  SELECT id INTO v_package_id FROM prompt_packages WHERE slug = 'date-night';

  -- Would You Rather (15 prompts)
  INSERT INTO game_prompts (game_type, prompt_data, tags, package_id) VALUES
    ('would_you_rather', '{"option_a": "Relive our first date", "option_b": "Fast-forward to our 10-year anniversary", "option_a_visual": {"type": "emoji", "value": "🎬"}, "option_b_visual": {"type": "emoji", "value": "⏩"}}', ARRAY['couples', 'memories'], v_package_id),
    ('would_you_rather', '{"option_a": "Know all my thoughts", "option_b": "Know all my dreams", "option_a_visual": {"type": "emoji", "value": "💭"}, "option_b_visual": {"type": "emoji", "value": "💫"}}', ARRAY['couples', 'deep'], v_package_id),
    ('would_you_rather', '{"option_a": "Have a romantic dinner at home", "option_b": "Go on an adventure date", "option_a_visual": {"type": "emoji", "value": "🍽️"}, "option_b_visual": {"type": "emoji", "value": "🎢"}}', ARRAY['couples', 'date-ideas'], v_package_id),
    ('would_you_rather', '{"option_a": "Dance in the rain together", "option_b": "Watch the sunrise together", "option_a_visual": {"type": "emoji", "value": "🌧️"}, "option_b_visual": {"type": "emoji", "value": "🌅"}}', ARRAY['couples', 'romantic'], v_package_id),
    ('would_you_rather', '{"option_a": "Recreate our first kiss", "option_b": "Plan our dream vacation", "option_a_visual": {"type": "emoji", "value": "💋"}, "option_b_visual": {"type": "emoji", "value": "✈️"}}', ARRAY['couples', 'romance'], v_package_id),
    ('would_you_rather', '{"option_a": "Spend a day doing what I love", "option_b": "Spend a day doing what you love", "option_a_visual": {"type": "emoji", "value": "🎯"}, "option_b_visual": {"type": "emoji", "value": "💝"}}', ARRAY['couples', 'thoughtful'], v_package_id),
    ('would_you_rather', '{"option_a": "Live in a city together", "option_b": "Live in the countryside together", "option_a_visual": {"type": "emoji", "value": "🏙️"}, "option_b_visual": {"type": "emoji", "value": "🌾"}}', ARRAY['couples', 'future'], v_package_id),
    ('would_you_rather', '{"option_a": "Get a couples tattoo", "option_b": "Get matching jewelry", "option_a_visual": {"type": "emoji", "value": "💉"}, "option_b_visual": {"type": "emoji", "value": "💍"}}', ARRAY['couples', 'commitment'], v_package_id),
    ('would_you_rather', '{"option_a": "Cook a romantic meal together", "option_b": "Bake desserts together", "option_a_visual": {"type": "emoji", "value": "🍝"}, "option_b_visual": {"type": "emoji", "value": "🧁"}}', ARRAY['couples', 'fun'], v_package_id),
    ('would_you_rather', '{"option_a": "Take a spontaneous road trip", "option_b": "Plan a dream vacation for a year from now", "option_a_visual": {"type": "emoji", "value": "🚗"}, "option_b_visual": {"type": "emoji", "value": "📅"}}', ARRAY['couples', 'travel'], v_package_id),
    ('would_you_rather', '{"option_a": "Know how long we''ll be together", "option_b": "Never know and enjoy the mystery", "option_a_visual": {"type": "emoji", "value": "🔮"}, "option_b_visual": {"type": "emoji", "value": "❓"}}', ARRAY['couples', 'deep'], v_package_id),
    ('would_you_rather', '{"option_a": "Write love letters to each other", "option_b": "Make a video message for each other", "option_a_visual": {"type": "emoji", "value": "💌"}, "option_b_visual": {"type": "emoji", "value": "📹"}}', ARRAY['couples', 'romantic'], v_package_id),
    ('would_you_rather', '{"option_a": "Share all our passwords", "option_b": "Keep some privacy", "option_a_visual": {"type": "emoji", "value": "🔓"}, "option_b_visual": {"type": "emoji", "value": "🔒"}}', ARRAY['couples', 'trust'], v_package_id),
    ('would_you_rather', '{"option_a": "Adopt a pet together", "option_b": "Start a garden together", "option_a_visual": {"type": "emoji", "value": "🐕"}, "option_b_visual": {"type": "emoji", "value": "🌱"}}', ARRAY['couples', 'future'], v_package_id),
    ('would_you_rather', '{"option_a": "Have a song that''s ''our song''", "option_b": "Have a place that''s ''our place''", "option_a_visual": {"type": "emoji", "value": "🎵"}, "option_b_visual": {"type": "emoji", "value": "📍"}}', ARRAY['couples', 'memories'], v_package_id)
  ON CONFLICT DO NOTHING;

  -- Guess Who Said It (15 prompts)
  INSERT INTO game_prompts (game_type, prompt_data, tags, package_id) VALUES
    ('guess_who_said_it', '{"question": "What''s your favorite memory of us together?", "visual": {"type": "emoji", "value": "💭"}}', ARRAY['couples', 'memories'], v_package_id),
    ('guess_who_said_it', '{"question": "What first attracted you to your partner?", "visual": {"type": "emoji", "value": "😍"}}', ARRAY['couples', 'romantic'], v_package_id),
    ('guess_who_said_it', '{"question": "What''s one thing you wish you knew about me before we met?", "visual": {"type": "emoji", "value": "🤔"}}', ARRAY['couples', 'deep'], v_package_id),
    ('guess_who_said_it', '{"question": "Describe our perfect date night", "visual": {"type": "emoji", "value": "🌃"}}', ARRAY['couples', 'date-ideas'], v_package_id),
    ('guess_who_said_it', '{"question": "What song reminds you most of your relationship?", "visual": {"type": "emoji", "value": "🎵"}}', ARRAY['couples', 'music'], v_package_id),
    ('guess_who_said_it', '{"question": "What''s the most romantic thing you''ve done for your partner?", "visual": {"type": "emoji", "value": "💝"}}', ARRAY['couples', 'romantic'], v_package_id),
    ('guess_who_said_it', '{"question": "Where do you see us in 5 years?", "visual": {"type": "emoji", "value": "🔮"}}', ARRAY['couples', 'future'], v_package_id),
    ('guess_who_said_it', '{"question": "What''s your partner''s most endearing quality?", "visual": {"type": "emoji", "value": "✨"}}', ARRAY['couples', 'sweet'], v_package_id),
    ('guess_who_said_it', '{"question": "What''s one thing that always makes you smile about your partner?", "visual": {"type": "emoji", "value": "😊"}}', ARRAY['couples', 'happy'], v_package_id),
    ('guess_who_said_it', '{"question": "What adventure do you want to go on together?", "visual": {"type": "emoji", "value": "🗺️"}}', ARRAY['couples', 'travel'], v_package_id),
    ('guess_who_said_it', '{"question": "What''s a secret talent you want to show your partner?", "visual": {"type": "emoji", "value": "🎭"}}', ARRAY['couples', 'fun'], v_package_id),
    ('guess_who_said_it', '{"question": "What would be the title of the movie about your relationship?", "visual": {"type": "emoji", "value": "🎬"}}', ARRAY['couples', 'creative'], v_package_id),
    ('guess_who_said_it', '{"question": "What do you appreciate most about your relationship?", "visual": {"type": "emoji", "value": "🙏"}}', ARRAY['couples', 'gratitude'], v_package_id),
    ('guess_who_said_it', '{"question": "If you could relive one moment together, which would it be?", "visual": {"type": "emoji", "value": "⏮️"}}', ARRAY['couples', 'memories'], v_package_id),
    ('guess_who_said_it', '{"question": "What''s your favorite inside joke or shared memory?", "visual": {"type": "emoji", "value": "😂"}}', ARRAY['couples', 'fun'], v_package_id)
  ON CONFLICT DO NOTHING;

  -- Hot Takes (10 prompts)
  INSERT INTO game_prompts (game_type, prompt_data, tags, package_id) VALUES
    ('hot_takes', '{"statement": "Love at first sight is real", "visual": {"type": "emoji", "value": "👀"}}', ARRAY['couples', 'romance'], v_package_id),
    ('hot_takes', '{"statement": "Couples should share all their passwords", "visual": {"type": "emoji", "value": "🔐"}}', ARRAY['couples', 'trust'], v_package_id),
    ('hot_takes', '{"statement": "Living together before marriage is essential", "visual": {"type": "emoji", "value": "🏠"}}', ARRAY['couples', 'relationship'], v_package_id),
    ('hot_takes', '{"statement": "You should always go to bed at the same time as your partner", "visual": {"type": "emoji", "value": "😴"}}', ARRAY['couples', 'habits'], v_package_id),
    ('hot_takes', '{"statement": "Surprise dates are better than planned dates", "visual": {"type": "emoji", "value": "🎁"}}', ARRAY['couples', 'dates'], v_package_id),
    ('hot_takes', '{"statement": "You should stay friends with your exes", "visual": {"type": "emoji", "value": "👥"}}', ARRAY['couples', 'controversial'], v_package_id),
    ('hot_takes', '{"statement": "Opposites attract makes for the best relationships", "visual": {"type": "emoji", "value": "🧲"}}', ARRAY['couples', 'compatibility'], v_package_id),
    ('hot_takes', '{"statement": "You should text your partner throughout the day, every day", "visual": {"type": "emoji", "value": "💬"}}', ARRAY['couples', 'communication'], v_package_id),
    ('hot_takes', '{"statement": "Separate bank accounts are healthier than joint accounts", "visual": {"type": "emoji", "value": "💰"}}', ARRAY['couples', 'finance'], v_package_id),
    ('hot_takes', '{"statement": "Pet names for your partner are cringey", "visual": {"type": "emoji", "value": "🥰"}}', ARRAY['couples', 'fun'], v_package_id)
  ON CONFLICT DO NOTHING;

  -- Most Likely To (10 prompts)
  INSERT INTO game_prompts (game_type, prompt_data, tags, package_id) VALUES
    ('most_likely_to', '{"scenario": "Most likely to plan a surprise romantic getaway", "visual": {"type": "emoji", "value": "✈️"}}', ARRAY['couples', 'romantic'], v_package_id),
    ('most_likely_to', '{"scenario": "Most likely to cry during a romantic movie", "visual": {"type": "emoji", "value": "😢"}}', ARRAY['couples', 'emotional'], v_package_id),
    ('most_likely_to', '{"scenario": "Most likely to remember important dates and anniversaries", "visual": {"type": "emoji", "value": "📅"}}', ARRAY['couples', 'thoughtful'], v_package_id),
    ('most_likely_to', '{"scenario": "Most likely to initiate deep conversations at 2 AM", "visual": {"type": "emoji", "value": "🌙"}}', ARRAY['couples', 'deep'], v_package_id),
    ('most_likely_to', '{"scenario": "Most likely to cook a romantic dinner", "visual": {"type": "emoji", "value": "🍷"}}', ARRAY['couples', 'domestic'], v_package_id),
    ('most_likely_to', '{"scenario": "Most likely to give the best gifts", "visual": {"type": "emoji", "value": "🎁"}}', ARRAY['couples', 'thoughtful'], v_package_id),
    ('most_likely_to', '{"scenario": "Most likely to fall asleep during a movie", "visual": {"type": "emoji", "value": "😴"}}', ARRAY['couples', 'funny'], v_package_id),
    ('most_likely_to', '{"scenario": "Most likely to want more date nights", "visual": {"type": "emoji", "value": "💑"}}', ARRAY['couples', 'romantic'], v_package_id),
    ('most_likely_to', '{"scenario": "Most likely to write a love letter", "visual": {"type": "emoji", "value": "💌"}}', ARRAY['couples', 'romantic'], v_package_id),
    ('most_likely_to', '{"scenario": "Most likely to suggest trying something new together", "visual": {"type": "emoji", "value": "🆕"}}', ARRAY['couples', 'adventurous'], v_package_id)
  ON CONFLICT DO NOTHING;

END $$;

-- Package stats should auto-update via trigger
-- But you can manually verify:
-- SELECT slug, name, total_prompts, prompts_by_game_type FROM prompt_packages WHERE slug = 'date-night';

-- ==========================================
-- TEST: Grant package to a group
-- ==========================================
-- To test granting the package to a group:
-- SELECT grant_package_to_group('your-group-id-here', (SELECT id FROM prompt_packages WHERE slug = 'date-night'));

-- To verify a group's packages:
-- SELECT * FROM get_group_packages('your-group-id-here');

-- To test what prompts a group can access:
-- SELECT * FROM test_package_access('your-group-id-here', 'would_you_rather');
