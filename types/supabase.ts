export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: "13.0.5";
	};
	public: {
		Tables: {
			ballots: {
				Row: {
					created_at: string;
					id: string;
					user_id: string;
					vontest_id: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					user_id?: string;
					vontest_id?: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					user_id?: string;
					vontest_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "ballots_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "ballots_vontest_id_fkey";
						columns: ["vontest_id"];
						isOneToOne: false;
						referencedRelation: "vontests";
						referencedColumns: ["id"];
					},
				];
			};
			comment_links: {
				Row: {
					child_id: string;
					parent_id: string;
					thread_id: string;
				};
				Insert: {
					child_id?: string;
					parent_id?: string;
					thread_id?: string;
				};
				Update: {
					child_id?: string;
					parent_id?: string;
					thread_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "comment_links_child_id_thread_id_fkey";
						columns: ["child_id", "thread_id"];
						isOneToOne: false;
						referencedRelation: "comments";
						referencedColumns: ["id", "thread_id"];
					},
					{
						foreignKeyName: "comment_links_parent_id_thread_id_fkey";
						columns: ["parent_id", "thread_id"];
						isOneToOne: false;
						referencedRelation: "comments";
						referencedColumns: ["id", "thread_id"];
					},
					{
						foreignKeyName: "comment_links_thread_id_fkey";
						columns: ["thread_id"];
						isOneToOne: false;
						referencedRelation: "threads";
						referencedColumns: ["id"];
					},
				];
			};
			comments: {
				Row: {
					comment: string;
					created_at: string;
					id: string;
					thread_id: string;
					user_id: string;
				};
				Insert: {
					comment: string;
					created_at?: string;
					id?: string;
					thread_id?: string;
					user_id?: string;
				};
				Update: {
					comment?: string;
					created_at?: string;
					id?: string;
					thread_id?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "comments_thread_id_fkey";
						columns: ["thread_id"];
						isOneToOne: false;
						referencedRelation: "threads";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "comments_user_id_fkey1";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
				];
			};
			profiles: {
				Row: {
					avatar_url: string;
					created_at: string | null;
					id: string;
					settings: Json | null;
					username: string | null;
				};
				Insert: {
					avatar_url?: string;
					created_at?: string | null;
					id: string;
					settings?: Json | null;
					username?: string | null;
				};
				Update: {
					avatar_url?: string;
					created_at?: string | null;
					id?: string;
					settings?: Json | null;
					username?: string | null;
				};
				Relationships: [];
			};
			proposals: {
				Row: {
					created_at: string | null;
					created_by: string | null;
					description: string | null;
					id: string;
					title: string;
					vontest_id: string | null;
				};
				Insert: {
					created_at?: string | null;
					created_by?: string | null;
					description?: string | null;
					id?: string;
					title: string;
					vontest_id?: string | null;
				};
				Update: {
					created_at?: string | null;
					created_by?: string | null;
					description?: string | null;
					id?: string;
					title?: string;
					vontest_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "proposals_created_by_fkey";
						columns: ["created_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "proposals_vontest_id_fkey";
						columns: ["vontest_id"];
						isOneToOne: false;
						referencedRelation: "vontests";
						referencedColumns: ["id"];
					},
				];
			};
			threads: {
				Row: {
					id: string;
					reference_id: string;
					type: string;
				};
				Insert: {
					id?: string;
					reference_id: string;
					type: string;
				};
				Update: {
					id?: string;
					reference_id?: string;
					type?: string;
				};
				Relationships: [];
			};
			vontests: {
				Row: {
					created_at: string | null;
					created_by: string | null;
					description: string | null;
					id: string;
					title: string | null;
					type: string;
					voting_settings_id: string;
				};
				Insert: {
					created_at?: string | null;
					created_by?: string | null;
					description?: string | null;
					id?: string;
					title?: string | null;
					type?: string;
					voting_settings_id: string;
				};
				Update: {
					created_at?: string | null;
					created_by?: string | null;
					description?: string | null;
					id?: string;
					title?: string | null;
					type?: string;
					voting_settings_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "vontests_created_by_fkey";
						columns: ["created_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "vontests_voting_settings_id_fkey";
						columns: ["voting_settings_id"];
						isOneToOne: false;
						referencedRelation: "voting_settings";
						referencedColumns: ["id"];
					},
				];
			};
			votes: {
				Row: {
					ballot_id: string;
					proposal_id: string;
					value: number;
				};
				Insert: {
					ballot_id: string;
					proposal_id: string;
					value?: number;
				};
				Update: {
					ballot_id?: string;
					proposal_id?: string;
					value?: number;
				};
				Relationships: [
					{
						foreignKeyName: "votes_ballot_id_fkey";
						columns: ["ballot_id"];
						isOneToOne: false;
						referencedRelation: "ballots";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "votes_proposal_id_fkey";
						columns: ["proposal_id"];
						isOneToOne: false;
						referencedRelation: "proposals";
						referencedColumns: ["id"];
					},
				];
			};
			voting_settings: {
				Row: {
					allow_revoting: boolean;
					anonymous: boolean;
					created_at: string;
					created_by: string;
					id: string;
					max_votes: number | null;
					min_votes: number | null;
					requires_login: boolean;
					result_visibility: string;
					updated_at: string | null;
					voting_end_at: string | null;
					voting_start_at: string | null;
					voting_type: string;
				};
				Insert: {
					allow_revoting?: boolean;
					anonymous?: boolean;
					created_at?: string;
					created_by?: string;
					id?: string;
					max_votes?: number | null;
					min_votes?: number | null;
					requires_login?: boolean;
					result_visibility?: string;
					updated_at?: string | null;
					voting_end_at?: string | null;
					voting_start_at?: string | null;
					voting_type: string;
				};
				Update: {
					allow_revoting?: boolean;
					anonymous?: boolean;
					created_at?: string;
					created_by?: string;
					id?: string;
					max_votes?: number | null;
					min_votes?: number | null;
					requires_login?: boolean;
					result_visibility?: string;
					updated_at?: string | null;
					voting_end_at?: string | null;
					voting_start_at?: string | null;
					voting_type?: string;
				};
				Relationships: [
					{
						foreignKeyName: "voting_settings_created_by_fkey";
						columns: ["created_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
				];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			create_comment_with_links: {
				Args: {
					in_comment_text: string;
					in_parent_ids: string[];
					in_thread_id: string;
					in_user_id: string;
				};
				Returns: string;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
	keyof Database,
	"public"
>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
				DefaultSchema["Views"])
		? (DefaultSchema["Tables"] &
				DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema["Enums"]
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
		: never = never,
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
		? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema["CompositeTypes"]
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
		: never = never,
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
		? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	public: {
		Enums: {},
	},
} as const;
