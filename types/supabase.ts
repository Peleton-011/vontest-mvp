export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ballots: {
        Row: {
          created_at: string
          id: string
          user_id: string
          vontest_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id?: string
          vontest_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          vontest_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ballots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ballots_vontest_id_fkey"
            columns: ["vontest_id"]
            isOneToOne: false
            referencedRelation: "vontests"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_links: {
        Row: {
          child_id: string
          parent_id: string
          thread_id: string
        }
        Insert: {
          child_id?: string
          parent_id?: string
          thread_id?: string
        }
        Update: {
          child_id?: string
          parent_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_links_child_id_thread_id_fkey"
            columns: ["child_id", "thread_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id", "thread_id"]
          },
          {
            foreignKeyName: "comment_links_parent_id_thread_id_fkey"
            columns: ["parent_id", "thread_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id", "thread_id"]
          },
          {
            foreignKeyName: "comment_links_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "recent_games_detailed"
            referencedColumns: ["thread_id"]
          },
          {
            foreignKeyName: "comment_links_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          thread_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          thread_id?: string
          user_id?: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "recent_games_detailed"
            referencedColumns: ["thread_id"]
          },
          {
            foreignKeyName: "comments_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      debate_matches: {
        Row: {
          created_at: string
          game_instance_id: string
          id: string
          status: string | null
          thread_id: string | null
          user_a_id: string
          user_a_stance: string | null
          user_b_id: string
          user_b_stance: string | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          game_instance_id: string
          id?: string
          status?: string | null
          thread_id?: string | null
          user_a_id: string
          user_a_stance?: string | null
          user_b_id: string
          user_b_stance?: string | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          game_instance_id?: string
          id?: string
          status?: string | null
          thread_id?: string | null
          user_a_id?: string
          user_a_stance?: string | null
          user_b_id?: string
          user_b_stance?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debate_matches_game_instance_id_fkey"
            columns: ["game_instance_id"]
            isOneToOne: false
            referencedRelation: "active_games_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debate_matches_game_instance_id_fkey"
            columns: ["game_instance_id"]
            isOneToOne: false
            referencedRelation: "game_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debate_matches_game_instance_id_fkey"
            columns: ["game_instance_id"]
            isOneToOne: false
            referencedRelation: "recent_games_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debate_matches_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "recent_games_detailed"
            referencedColumns: ["thread_id"]
          },
          {
            foreignKeyName: "debate_matches_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debate_matches_user_a_id_fkey"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debate_matches_user_b_id_fkey"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debate_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_analytics: {
        Row: {
          analytics_type: string
          data: Json
          game_instance_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          analytics_type: string
          data: Json
          game_instance_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          analytics_type?: string
          data?: Json
          game_instance_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_analytics_game_instance_id_fkey"
            columns: ["game_instance_id"]
            isOneToOne: false
            referencedRelation: "active_games_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_analytics_game_instance_id_fkey"
            columns: ["game_instance_id"]
            isOneToOne: false
            referencedRelation: "game_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_analytics_game_instance_id_fkey"
            columns: ["game_instance_id"]
            isOneToOne: false
            referencedRelation: "recent_games_detailed"
            referencedColumns: ["id"]
          },
        ]
      }
      game_instances: {
        Row: {
          created_at: string
          current_phase: string | null
          expires_at: string
          game_type: string
          group_id: string
          id: string
          metadata: Json | null
          phase_deadline: string | null
          prompt: Json
          status: string
        }
        Insert: {
          created_at?: string
          current_phase?: string | null
          expires_at: string
          game_type: string
          group_id: string
          id?: string
          metadata?: Json | null
          phase_deadline?: string | null
          prompt: Json
          status?: string
        }
        Update: {
          created_at?: string
          current_phase?: string | null
          expires_at?: string
          game_type?: string
          group_id?: string
          id?: string
          metadata?: Json | null
          phase_deadline?: string | null
          prompt?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_instances_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_instances_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "recent_games_detailed"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "game_instances_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      game_leaderboards: {
        Row: {
          game_type: string | null
          group_id: string
          id: string
          rankings: Json
          timeframe: string | null
          updated_at: string | null
        }
        Insert: {
          game_type?: string | null
          group_id: string
          id?: string
          rankings: Json
          timeframe?: string | null
          updated_at?: string | null
        }
        Update: {
          game_type?: string | null
          group_id?: string
          id?: string
          rankings?: Json
          timeframe?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_leaderboards_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_leaderboards_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "recent_games_detailed"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "game_leaderboards_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      game_phase_history: {
        Row: {
          ended_at: string | null
          game_instance_id: string
          id: string
          phase: string
          started_at: string | null
        }
        Insert: {
          ended_at?: string | null
          game_instance_id: string
          id?: string
          phase: string
          started_at?: string | null
        }
        Update: {
          ended_at?: string | null
          game_instance_id?: string
          id?: string
          phase?: string
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_phase_history_game_instance_id_fkey"
            columns: ["game_instance_id"]
            isOneToOne: false
            referencedRelation: "active_games_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_phase_history_game_instance_id_fkey"
            columns: ["game_instance_id"]
            isOneToOne: false
            referencedRelation: "game_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_phase_history_game_instance_id_fkey"
            columns: ["game_instance_id"]
            isOneToOne: false
            referencedRelation: "recent_games_detailed"
            referencedColumns: ["id"]
          },
        ]
      }
      game_responses: {
        Row: {
          created_at: string
          game_instance_id: string
          id: string
          intensity_score: number | null
          response_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_instance_id: string
          id?: string
          intensity_score?: number | null
          response_data: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_instance_id?: string
          id?: string
          intensity_score?: number | null
          response_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_responses_game_instance_id_fkey"
            columns: ["game_instance_id"]
            isOneToOne: false
            referencedRelation: "active_games_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_responses_game_instance_id_fkey"
            columns: ["game_instance_id"]
            isOneToOne: false
            referencedRelation: "game_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_responses_game_instance_id_fkey"
            columns: ["game_instance_id"]
            isOneToOne: false
            referencedRelation: "recent_games_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_user_scores: {
        Row: {
          game_instance_id: string
          score: number | null
          score_breakdown: Json | null
          user_id: string
        }
        Insert: {
          game_instance_id: string
          score?: number | null
          score_breakdown?: Json | null
          user_id: string
        }
        Update: {
          game_instance_id?: string
          score?: number | null
          score_breakdown?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_user_scores_game_instance_id_fkey"
            columns: ["game_instance_id"]
            isOneToOne: false
            referencedRelation: "active_games_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_user_scores_game_instance_id_fkey"
            columns: ["game_instance_id"]
            isOneToOne: false
            referencedRelation: "game_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_user_scores_game_instance_id_fkey"
            columns: ["game_instance_id"]
            isOneToOne: false
            referencedRelation: "recent_games_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_user_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_votes: {
        Row: {
          created_at: string
          game_instance_id: string
          id: string
          voted_for_response_id: string | null
          voted_for_user_id: string | null
          voted_option: string | null
          voter_id: string
        }
        Insert: {
          created_at?: string
          game_instance_id: string
          id?: string
          voted_for_response_id?: string | null
          voted_for_user_id?: string | null
          voted_option?: string | null
          voter_id: string
        }
        Update: {
          created_at?: string
          game_instance_id?: string
          id?: string
          voted_for_response_id?: string | null
          voted_for_user_id?: string | null
          voted_option?: string | null
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_votes_game_instance_id_fkey"
            columns: ["game_instance_id"]
            isOneToOne: false
            referencedRelation: "active_games_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_votes_game_instance_id_fkey"
            columns: ["game_instance_id"]
            isOneToOne: false
            referencedRelation: "game_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_votes_game_instance_id_fkey"
            columns: ["game_instance_id"]
            isOneToOne: false
            referencedRelation: "recent_games_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_votes_voted_for_response_id_fkey"
            columns: ["voted_for_response_id"]
            isOneToOne: false
            referencedRelation: "game_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_votes_voted_for_user_id_fkey"
            columns: ["voted_for_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invitations: {
        Row: {
          created_at: string
          email: string | null
          expires_at: string
          group_id: string
          id: string
          invited_by: string
          invited_user_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          expires_at?: string
          group_id: string
          id?: string
          invited_by: string
          invited_user_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          expires_at?: string
          group_id?: string
          id?: string
          invited_by?: string
          invited_user_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_invitations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invitations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "recent_games_detailed"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "group_invitations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invitations_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "recent_games_detailed"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          settings: Json
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          settings?: Json
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          settings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string
          created_at: string | null
          id: string
          settings: Json | null
          username: string | null
        }
        Insert: {
          avatar_url?: string
          created_at?: string | null
          id: string
          settings?: Json | null
          username?: string | null
        }
        Update: {
          avatar_url?: string
          created_at?: string | null
          id?: string
          settings?: Json | null
          username?: string | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          title: string
          vontest_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          title: string
          vontest_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          title?: string
          vontest_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_vontest_id_fkey"
            columns: ["vontest_id"]
            isOneToOne: false
            referencedRelation: "vontests"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          id: string
          reference_id: string
          type: string
        }
        Insert: {
          id?: string
          reference_id: string
          type: string
        }
        Update: {
          id?: string
          reference_id?: string
          type?: string
        }
        Relationships: []
      }
      vontests: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          title: string | null
          type: string
          voting_settings_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          title?: string | null
          type?: string
          voting_settings_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          title?: string | null
          type?: string
          voting_settings_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vontests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vontests_voting_settings_id_fkey"
            columns: ["voting_settings_id"]
            isOneToOne: false
            referencedRelation: "voting_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          ballot_id: string
          proposal_id: string
          value: number
        }
        Insert: {
          ballot_id: string
          proposal_id: string
          value?: number
        }
        Update: {
          ballot_id?: string
          proposal_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "votes_ballot_id_fkey"
            columns: ["ballot_id"]
            isOneToOne: false
            referencedRelation: "ballots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      voting_settings: {
        Row: {
          allow_revoting: boolean
          anonymous: boolean
          created_at: string
          created_by: string
          id: string
          max_votes: number | null
          min_votes: number | null
          requires_login: boolean
          result_visibility: string
          updated_at: string | null
          voting_end_at: string | null
          voting_start_at: string | null
          voting_type: string
        }
        Insert: {
          allow_revoting?: boolean
          anonymous?: boolean
          created_at?: string
          created_by?: string
          id?: string
          max_votes?: number | null
          min_votes?: number | null
          requires_login?: boolean
          result_visibility?: string
          updated_at?: string | null
          voting_end_at?: string | null
          voting_start_at?: string | null
          voting_type: string
        }
        Update: {
          allow_revoting?: boolean
          anonymous?: boolean
          created_at?: string
          created_by?: string
          id?: string
          max_votes?: number | null
          min_votes?: number | null
          requires_login?: boolean
          result_visibility?: string
          updated_at?: string | null
          voting_end_at?: string | null
          voting_start_at?: string | null
          voting_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "voting_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_games_with_stats: {
        Row: {
          created_at: string | null
          current_phase: string | null
          expires_at: string | null
          game_type: string | null
          group_id: string | null
          group_name: string | null
          id: string | null
          metadata: Json | null
          participation_rate: number | null
          phase_deadline: string | null
          prompt: Json | null
          response_count: number | null
          status: string | null
          total_members: number | null
          vote_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_instances_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_instances_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "recent_games_detailed"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "game_instances_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      recent_games_detailed: {
        Row: {
          comment_count: number | null
          created_at: string | null
          current_phase: string | null
          expires_at: string | null
          game_type: string | null
          group_id: string | null
          group_name: string | null
          id: string | null
          member_count: number | null
          prompt: Json | null
          response_count: number | null
          status: string | null
          thread_id: string | null
          vote_count: number | null
        }
        Relationships: []
      }
      user_groups_with_stats: {
        Row: {
          active_games_count: number | null
          avatar_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string | null
          member_count: number | null
          name: string | null
          settings: Json | null
          total_games_count: number | null
        }
        Insert: {
          active_games_count?: never
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          member_count?: never
          name?: string | null
          settings?: Json | null
          total_games_count?: never
        }
        Update: {
          active_games_count?: never
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          member_count?: never
          name?: string | null
          settings?: Json | null
          total_games_count?: never
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_participation_summary: {
        Row: {
          games_responded: number | null
          games_voted: number | null
          group_id: string | null
          group_name: string | null
          total_score: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "recent_games_detailed"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_group_invitation: {
        Args: { invitation_id: string }
        Returns: undefined
      }
      advance_game_phase: {
        Args: { p_game_instance_id: string; p_next_phase: string }
        Returns: undefined
      }
      all_members_responded: {
        Args: { p_game_instance_id: string }
        Returns: boolean
      }
      award_game_points: {
        Args: {
          p_game_instance_id: string
          p_points: number
          p_reason?: string
          p_user_id: string
        }
        Returns: undefined
      }
      award_participation_points: {
        Args: { p_game_instance_id: string }
        Returns: number
      }
      calculate_intensity_distribution: {
        Args: { p_game_instance_id: string }
        Returns: undefined
      }
      calculate_leaderboard: {
        Args: { p_game_type?: string; p_group_id: string; p_timeframe?: string }
        Returns: undefined
      }
      complete_game: {
        Args: { p_game_instance_id: string }
        Returns: undefined
      }
      create_comment_with_links: {
        Args: {
          in_comment_text: string
          in_parent_ids: string[]
          in_thread_id: string
          in_user_id: string
        }
        Returns: string
      }
      create_debate_thread: {
        Args: { p_debate_match_id: string }
        Returns: string
      }
      create_game_thread: {
        Args: { p_game_instance_id: string }
        Returns: string
      }
      create_group_chat_thread: {
        Args: { p_group_id: string }
        Returns: string
      }
      expire_old_games: { Args: never; Returns: undefined }
      get_active_game: {
        Args: { p_group_id: string }
        Returns: {
          created_at: string
          current_phase: string | null
          expires_at: string
          game_type: string
          group_id: string
          id: string
          metadata: Json | null
          phase_deadline: string | null
          prompt: Json
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "game_instances"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_game_results: {
        Args: { p_game_instance_id: string }
        Returns: {
          game_type: string
          response_summary: Json
          top_scorers: Json
          total_responses: number
          total_votes: number
          vote_summary: Json
        }[]
      }
      get_game_thread: { Args: { p_game_instance_id: string }; Returns: string }
      get_group_game_history: {
        Args: { p_group_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          comment_count: number | null
          created_at: string | null
          current_phase: string | null
          expires_at: string | null
          game_type: string | null
          group_id: string | null
          group_name: string | null
          id: string | null
          member_count: number | null
          prompt: Json | null
          response_count: number | null
          status: string | null
          thread_id: string | null
          vote_count: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "recent_games_detailed"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_group_members_with_stats: {
        Args: { p_group_id: string }
        Returns: {
          avatar_url: string
          games_played: number
          joined_at: string
          role: string
          total_score: number
          user_id: string
          username: string
        }[]
      }
      get_non_responders: {
        Args: { p_game_instance_id: string }
        Returns: {
          user_id: string
          username: string
        }[]
      }
      get_pending_games_for_user: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          current_phase: string | null
          expires_at: string
          game_type: string
          group_id: string
          id: string
          metadata: Json | null
          phase_deadline: string | null
          prompt: Json
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "game_instances"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_groups: {
        Args: { p_user_id: string }
        Returns: {
          active_games_count: number | null
          avatar_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string | null
          member_count: number | null
          name: string | null
          settings: Json | null
          total_games_count: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "user_groups_with_stats"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      user_can_access_game: {
        Args: { p_game_instance_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
