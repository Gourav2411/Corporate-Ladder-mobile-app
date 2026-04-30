import {
  ChangeDetectionStrategy,
  Component,
  signal,
  computed,
  effect,
  ViewChild,
  ElementRef,
  OnDestroy,
  HostListener,
  afterNextRender,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import {
  FirebaseService,
  Challenge,
  MultiplayerRoom,
  WatercoolerPost,
  WatercoolerChannel,
} from "./firebase.service";
import { AchievementService } from "./achievements.service";
import { RoastService } from "./roast.service";
import { Unsubscribe, onSnapshot, doc } from "firebase/firestore";
import { db } from "./firebase.service";

interface LogEntry {
  message: string;
  type: "info" | "success" | "warning" | "error";
  time: Date;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  action: { type: string; icon: string; color: string; text: string };
  isHurdle: boolean;
  speedModifier: number;
  collected: boolean;
}

const TITLES = [
  "Unpaid Intern",
  "Junior Manager",
  "Middle Manager",
  "Senior Manager",
  "Director of Synergy",
  "VP of Vague Strategy",
  "Chief Nothing Officer (CNO)",
  "Board Member",
  "Visionary Founder",
  "Corporate Deity",
];

const SYNERGY_THRESHOLDS = [
  0, 100, 300, 600, 1200, 2500, 5000, 8000, 12000, 20000,
];

const LIFETIME_TITLES = [
  "Promising Hire",
  "Junior Synergist",
  "Associate VP of Emails",
  "Director of Meaningless Meetings",
  "Global Head of Bureaucracy",
  "Chief Officer of Office Politics",
  "Emperor of the Ping Pong Table",
  "Deity of Deliverables",
  "The Immutable Stakeholder",
  "Intergalactic Corporate Overlord",
];
const LIFETIME_THRESHOLDS = [
  0, 1000, 5000, 15000, 35000, 75000, 150000, 300000, 750000, 1500000,
];

const STORY_EVENTS: Record<
  number,
  { title: string; text: string; boss: string }
> = {
  100: {
    title: "The First Win",
    text: "You forwarded your first email chain. Welcome to the team. Time to climb.",
    boss: "Line Manager",
  },
  300: {
    title: "Performance Review",
    text: "You've survived enough useless meetings to justify an existence. Here's a new title. Keep up the aesthetic of hard work.",
    boss: "VP of Synergies",
  },
  1200: {
    title: "Welcome to Middle Management",
    text: "You don't do real work anymore. You manage the people who do. Fire them if they look at you funny. We've given you a company fleece.",
    boss: "The CEO",
  },
  5000: {
    title: "The Corner Office",
    text: "You did it. You took credit for everything. The golden parachute is secured. But there's always a bigger fish...",
    boss: "The Board",
  },
  12000: {
    title: "A Paradigm Shift",
    text: "You are no longer a person. You are a brand. You speak only in LinkedIn posts.",
    boss: "Your PR Manager",
  },
};

export interface SkillNode {
  id: string;
  name: string;
  desc: string;
  cost: number;
  icon: string;
  dependencies: string[];
  type: "passive" | "action";
  keyCode?: string;
}

export const SKILL_TREE: SkillNode[] = [
  {
    id: "coffee_boost",
    name: "Premium Beans",
    desc: "Coffee breaks last 2x as long.",
    cost: 500,
    icon: "☕",
    dependencies: [],
    type: "passive",
  },
  {
    id: "combo_retain",
    name: "Retention Plan",
    desc: "Combo meter drains 30% slower.",
    cost: 1200,
    icon: "🔥",
    dependencies: ["coffee_boost"],
    type: "passive",
  },
  {
    id: "action_gaslight",
    name: "Gaslight Team",
    desc: "New Action (G): Clear all obstacles on screen. Costs 40 Morale.",
    cost: 3000,
    icon: "💨",
    dependencies: ["combo_retain"],
    type: "action",
    keyCode: "G",
  },
  {
    id: "marketing_buzz",
    name: "Buzzwords",
    desc: "Passively generate +1 Synergy every second.",
    cost: 800,
    icon: "📈",
    dependencies: [],
    type: "passive",
  },
  {
    id: "viral_referral",
    name: "Affiliate Marketing",
    desc: "Double Synergy points gained from Daily Objectives.",
    cost: 1500,
    icon: "🔗",
    dependencies: ["marketing_buzz"],
    type: "passive",
  },
  {
    id: "viral_influencer",
    name: "LinkedIn Influencer",
    desc: "Gain +2 Synergy passively every second. Unlocks elite title.",
    cost: 4000,
    icon: "🤳",
    dependencies: ["viral_referral"],
    type: "passive",
  },
  {
    id: "action_synergize_aoe",
    name: "Reply All",
    desc: "Synergize Email (E) clears ALL emails on screen.",
    cost: 2500,
    icon: "📧",
    dependencies: ["marketing_buzz"],
    type: "passive",
    keyCode: "E",
  },
  {
    id: "skill_growth_hacking_0",
    name: "Growth Hacking",
    desc: "Increases global Synergy multiplier by 0.5%.",
    cost: 8200,
    icon: "📅",
    dependencies: ["action_synergize_aoe"],
    type: "passive",
  },
  {
    id: "skill_disruptive_innovation_1",
    name: "Disruptive Innovation",
    desc: "Increases global Synergy multiplier by 0.7%.",
    cost: 8050,
    icon: "📅",
    dependencies: ["coffee_boost"],
    type: "passive",
  },
  {
    id: "skill_blockchain_integration_2",
    name: "Blockchain Integration",
    desc: "Increases global Synergy multiplier by 0.5%.",
    cost: 7412,
    icon: "📅",
    dependencies: ["action_synergize_aoe"],
    type: "passive",
  },
  {
    id: "skill_agile_transformation_3",
    name: "Agile Transformation",
    desc: "Increases global Synergy multiplier by 0.2%.",
    cost: 7787,
    icon: "🚀",
    dependencies: ["marketing_buzz"],
    type: "passive",
  },
  {
    id: "skill_six_sigma_black_belt_4",
    name: "Six Sigma Black Belt",
    desc: "Increases global Synergy multiplier by 0.9%.",
    cost: 10476,
    icon: "💼",
    dependencies: ["skill_blockchain_integration_2"],
    type: "passive",
  },
  {
    id: "skill_bleeding_edge_insights_5",
    name: "Bleeding Edge Insights",
    desc: "Increases global Synergy multiplier by 0.7%.",
    cost: 10479,
    icon: "📋",
    dependencies: ["skill_agile_transformation_3"],
    type: "passive",
  },
  {
    id: "skill_thought_leadership_6",
    name: "Thought Leadership",
    desc: "Increases global Synergy multiplier by 0.8%.",
    cost: 10697,
    icon: "💼",
    dependencies: ["action_synergize_aoe"],
    type: "passive",
  },
  {
    id: "skill_holistic_approach_7",
    name: "Holistic Approach",
    desc: "Increases global Synergy multiplier by 0.5%.",
    cost: 11831,
    icon: "💡",
    dependencies: ["skill_six_sigma_black_belt_4"],
    type: "passive",
  },
  {
    id: "skill_paradigm_shift_8",
    name: "Paradigm Shift",
    desc: "Increases global Synergy multiplier by 0.9%.",
    cost: 9082,
    icon: "🗑️",
    dependencies: ["skill_thought_leadership_6"],
    type: "passive",
  },
  {
    id: "skill_pivot_strategy_9",
    name: "Pivot Strategy",
    desc: "Increases global Synergy multiplier by 0.3%.",
    cost: 8051,
    icon: "🚀",
    dependencies: ["skill_disruptive_innovation_1"],
    type: "passive",
  },
  {
    id: "skill_blue_ocean_strategy_10",
    name: "Blue Ocean Strategy",
    desc: "Increases global Synergy multiplier by 0.9%.",
    cost: 12238,
    icon: "📋",
    dependencies: ["skill_paradigm_shift_8"],
    type: "passive",
  },
  {
    id: "skill_core_competencies_11",
    name: "Core Competencies",
    desc: "Increases global Synergy multiplier by 0.9%.",
    cost: 12344,
    icon: "📉",
    dependencies: ["skill_blue_ocean_strategy_10"],
    type: "passive",
  },
  {
    id: "skill_wheelhouse_optimization_12",
    name: "Wheelhouse Optimization",
    desc: "Increases global Synergy multiplier by 0.2%.",
    cost: 13171,
    icon: "🤝",
    dependencies: ["skill_bleeding_edge_insights_5"],
    type: "passive",
  },
  {
    id: "skill_boil_the_ocean_13",
    name: "Boil the Ocean",
    desc: "Increases global Synergy multiplier by 0.7%.",
    cost: 10619,
    icon: "💰",
    dependencies: ["skill_pivot_strategy_9"],
    type: "passive",
  },
  {
    id: "skill_low_hanging_fruit_14",
    name: "Low Hanging Fruit",
    desc: "Increases global Synergy multiplier by 0.3%.",
    cost: 14489,
    icon: "💼",
    dependencies: ["skill_holistic_approach_7"],
    type: "passive",
  },
  {
    id: "skill_wheel_reinvention_15",
    name: "Wheel Reinvention",
    desc: "Increases global Synergy multiplier by 0.10%.",
    cost: 11983,
    icon: "🏢",
    dependencies: ["skill_holistic_approach_7"],
    type: "passive",
  },
  {
    id: "skill_deep_dive_16",
    name: "Deep Dive",
    desc: "Increases global Synergy multiplier by 0.1%.",
    cost: 15202,
    icon: "📉",
    dependencies: ["skill_pivot_strategy_9"],
    type: "passive",
  },
  {
    id: "skill_bandwidth_expansion_17",
    name: "Bandwidth Expansion",
    desc: "Increases global Synergy multiplier by 0.8%.",
    cost: 12247,
    icon: "🚀",
    dependencies: ["skill_wheel_reinvention_15"],
    type: "passive",
  },
  {
    id: "skill_circle_back_18",
    name: "Circle Back",
    desc: "Increases global Synergy multiplier by 0.4%.",
    cost: 13619,
    icon: "💼",
    dependencies: ["skill_low_hanging_fruit_14"],
    type: "passive",
  },
  {
    id: "skill_ping_protocol_19",
    name: "Ping Protocol",
    desc: "Increases global Synergy multiplier by 0.2%.",
    cost: 14919,
    icon: "💼",
    dependencies: ["skill_deep_dive_16"],
    type: "passive",
  },
  {
    id: "skill_take_offline_20",
    name: "Take Offline",
    desc: "Increases global Synergy multiplier by 0.3%.",
    cost: 16149,
    icon: "📅",
    dependencies: ["skill_low_hanging_fruit_14"],
    type: "passive",
  },
  {
    id: "skill_actionable_insights_21",
    name: "Actionable Insights",
    desc: "Increases global Synergy multiplier by 0.2%.",
    cost: 17711,
    icon: "💼",
    dependencies: ["skill_circle_back_18"],
    type: "passive",
  },
  {
    id: "skill_big_data_mining_22",
    name: "Big Data Mining",
    desc: "Increases global Synergy multiplier by 0.2%.",
    cost: 17006,
    icon: "🚀",
    dependencies: ["skill_bandwidth_expansion_17"],
    type: "passive",
  },
  {
    id: "skill_cloud_native_workflow_23",
    name: "Cloud Native Workflow",
    desc: "Increases global Synergy multiplier by 0.2%.",
    cost: 15536,
    icon: "👔",
    dependencies: ["skill_big_data_mining_22"],
    type: "passive",
  },
  {
    id: "skill_value_add_24",
    name: "Value Add",
    desc: "Increases global Synergy multiplier by 0.8%.",
    cost: 16302,
    icon: "⏱️",
    dependencies: ["skill_circle_back_18"],
    type: "passive",
  },
  {
    id: "skill_game_changer_25",
    name: "Game Changer",
    desc: "Increases global Synergy multiplier by 0.3%.",
    cost: 17707,
    icon: "⏱️",
    dependencies: ["skill_actionable_insights_21"],
    type: "passive",
  },
  {
    id: "skill_win_win_scenario_26",
    name: "Win-Win Scenario",
    desc: "Increases global Synergy multiplier by 0.6%.",
    cost: 18352,
    icon: "💡",
    dependencies: ["skill_big_data_mining_22"],
    type: "passive",
  },
  {
    id: "skill_hyperlocal_targeting_27",
    name: "Hyperlocal Targeting",
    desc: "Increases global Synergy multiplier by 0.3%.",
    cost: 22939,
    icon: "🤝",
    dependencies: ["skill_take_offline_20"],
    type: "passive",
  },
  {
    id: "skill_omnichannel_execution_28",
    name: "Omnichannel Execution",
    desc: "Increases global Synergy multiplier by 0.5%.",
    cost: 24070,
    icon: "📋",
    dependencies: ["skill_hyperlocal_targeting_27"],
    type: "passive",
  },
  {
    id: "skill_touchplot_sync_29",
    name: "Touchplot Sync",
    desc: "Increases global Synergy multiplier by 0.4%.",
    cost: 22448,
    icon: "📊",
    dependencies: ["skill_game_changer_25"],
    type: "passive",
  },
  {
    id: "skill_north_star_alignment_30",
    name: "North Star Alignment",
    desc: "Increases global Synergy multiplier by 0.6%.",
    cost: 23875,
    icon: "👔",
    dependencies: ["skill_value_add_24"],
    type: "passive",
  },
  {
    id: "skill_key_deliverables_31",
    name: "Key Deliverables",
    desc: "Increases global Synergy multiplier by 0.9%.",
    cost: 23253,
    icon: "📈",
    dependencies: ["skill_win_win_scenario_26"],
    type: "passive",
  },
  {
    id: "skill_silo_busting_32",
    name: "Silo Busting",
    desc: "Increases global Synergy multiplier by 0.4%.",
    cost: 25285,
    icon: "🚀",
    dependencies: ["skill_key_deliverables_31"],
    type: "passive",
  },
  {
    id: "skill_cross_functional_synergy_33",
    name: "Cross-functional Synergy",
    desc: "Increases global Synergy multiplier by 0.4%.",
    cost: 27274,
    icon: "🏢",
    dependencies: ["skill_game_changer_25"],
    type: "passive",
  },
  {
    id: "skill_scalable_solutions_34",
    name: "Scalable Solutions",
    desc: "Increases global Synergy multiplier by 0.2%.",
    cost: 29922,
    icon: "💡",
    dependencies: ["skill_silo_busting_32"],
    type: "passive",
  },
  {
    id: "skill_optics_management_35",
    name: "Optics Management",
    desc: "Increases global Synergy multiplier by 0.3%.",
    cost: 28733,
    icon: "📅",
    dependencies: ["skill_key_deliverables_31"],
    type: "passive",
  },
  {
    id: "skill_bandwidth_reallocation_36",
    name: "Bandwidth Reallocation",
    desc: "Increases global Synergy multiplier by 0.5%.",
    cost: 31109,
    icon: "💰",
    dependencies: ["skill_touchplot_sync_29"],
    type: "passive",
  },
  {
    id: "skill_stakeholder_alignment_37",
    name: "Stakeholder Alignment",
    desc: "Increases global Synergy multiplier by 0.10%.",
    cost: 34554,
    icon: "👔",
    dependencies: ["skill_key_deliverables_31"],
    type: "passive",
  },
  {
    id: "skill_roi_maximization_38",
    name: "ROI Maximization",
    desc: "Increases global Synergy multiplier by 0.10%.",
    cost: 32671,
    icon: "📅",
    dependencies: ["skill_key_deliverables_31"],
    type: "passive",
  },
  {
    id: "skill_kpi_crushing_39",
    name: "KPI Crushing",
    desc: "Increases global Synergy multiplier by 0.3%.",
    cost: 36864,
    icon: "📅",
    dependencies: ["skill_cross_functional_synergy_33"],
    type: "passive",
  },
  {
    id: "skill_data_driven_decisions_40",
    name: "Data-Driven Decisions",
    desc: "Increases global Synergy multiplier by 0.4%.",
    cost: 37037,
    icon: "📅",
    dependencies: ["skill_roi_maximization_38"],
    type: "passive",
  },
  {
    id: "skill_customer_centricity_41",
    name: "Customer Centricity",
    desc: "Increases global Synergy multiplier by 0.4%.",
    cost: 36893,
    icon: "📋",
    dependencies: ["skill_optics_management_35"],
    type: "passive",
  },
  {
    id: "skill_market_penetration_42",
    name: "Market Penetration",
    desc: "Increases global Synergy multiplier by 0.6%.",
    cost: 42837,
    icon: "🤝",
    dependencies: ["skill_data_driven_decisions_40"],
    type: "passive",
  },
  {
    id: "skill_first_mover_advantage_43",
    name: "First Mover Advantage",
    desc: "Increases global Synergy multiplier by 0.1%.",
    cost: 43573,
    icon: "📋",
    dependencies: ["skill_customer_centricity_41"],
    type: "passive",
  },
  {
    id: "skill_b2b_dynamics_44",
    name: "B2B Dynamics",
    desc: "Increases global Synergy multiplier by 0.9%.",
    cost: 46206,
    icon: "🤝",
    dependencies: ["skill_bandwidth_reallocation_36"],
    type: "passive",
  },
  {
    id: "skill_b2c_outreach_45",
    name: "B2C Outreach",
    desc: "Increases global Synergy multiplier by 0.8%.",
    cost: 49241,
    icon: "📋",
    dependencies: ["skill_roi_maximization_38"],
    type: "passive",
  },
  {
    id: "skill_growth_mindset_46",
    name: "Growth Mindset",
    desc: "Increases global Synergy multiplier by 0.9%.",
    cost: 49183,
    icon: "🤝",
    dependencies: ["skill_first_mover_advantage_43"],
    type: "passive",
  },
  {
    id: "skill_ideation_session_47",
    name: "Ideation Session",
    desc: "Increases global Synergy multiplier by 0.3%.",
    cost: 52837,
    icon: "📉",
    dependencies: ["skill_growth_mindset_46"],
    type: "passive",
  },
  {
    id: "skill_mindshare_capture_48",
    name: "Mindshare Capture",
    desc: "Increases global Synergy multiplier by 0.3%.",
    cost: 54408,
    icon: "🧠",
    dependencies: ["skill_customer_centricity_41"],
    type: "passive",
  },
  {
    id: "skill_strategic_alliance_49",
    name: "Strategic Alliance",
    desc: "Increases global Synergy multiplier by 0.6%.",
    cost: 58203,
    icon: "🤝",
    dependencies: ["skill_b2b_dynamics_44"],
    type: "passive",
  },
  {
    id: "skill_leverage_assets_50",
    name: "Leverage Assets",
    desc: "Increases global Synergy multiplier by 0.5%.",
    cost: 60828,
    icon: "🧠",
    dependencies: ["skill_first_mover_advantage_43"],
    type: "passive",
  },
  {
    id: "skill_monetization_engine_51",
    name: "Monetization Engine",
    desc: "Increases global Synergy multiplier by 0.6%.",
    cost: 61089,
    icon: "📋",
    dependencies: ["skill_first_mover_advantage_43"],
    type: "passive",
  },
  {
    id: "skill_future_proofing_52",
    name: "Future-Proofing",
    desc: "Increases global Synergy multiplier by 0.2%.",
    cost: 67693,
    icon: "🚀",
    dependencies: ["skill_leverage_assets_50"],
    type: "passive",
  },
  {
    id: "skill_mission_critical_53",
    name: "Mission Critical",
    desc: "Increases global Synergy multiplier by 0.2%.",
    cost: 68347,
    icon: "🏢",
    dependencies: ["skill_ideation_session_47"],
    type: "passive",
  },
  {
    id: "skill_return_on_investment_54",
    name: "Return on Investment",
    desc: "Increases global Synergy multiplier by 0.1%.",
    cost: 71059,
    icon: "📊",
    dependencies: ["skill_mindshare_capture_48"],
    type: "passive",
  },
  {
    id: "skill_skin_in_the_game_55",
    name: "Skin in the Game",
    desc: "Increases global Synergy multiplier by 0.5%.",
    cost: 76236,
    icon: "🤝",
    dependencies: ["skill_leverage_assets_50"],
    type: "passive",
  },
  {
    id: "skill_sweat_equity_56",
    name: "Sweat Equity",
    desc: "Increases global Synergy multiplier by 0.4%.",
    cost: 81587,
    icon: "🧠",
    dependencies: ["skill_mindshare_capture_48"],
    type: "passive",
  },
  {
    id: "skill_move_the_needle_57",
    name: "Move the Needle",
    desc: "Increases global Synergy multiplier by 0.2%.",
    cost: 82221,
    icon: "🧠",
    dependencies: ["skill_leverage_assets_50"],
    type: "passive",
  },
  {
    id: "skill_outside_the_box_58",
    name: "Outside the Box",
    desc: "Increases global Synergy multiplier by 0.2%.",
    cost: 86247,
    icon: "📋",
    dependencies: ["skill_future_proofing_52"],
    type: "passive",
  },
  {
    id: "skill_thought_shower_59",
    name: "Thought Shower",
    desc: "Increases global Synergy multiplier by 0.4%.",
    cost: 89474,
    icon: "📋",
    dependencies: ["skill_sweat_equity_56"],
    type: "passive",
  },
  {
    id: "skill_brain_dump_60",
    name: "Brain Dump",
    desc: "Increases global Synergy multiplier by 0.7%.",
    cost: 95512,
    icon: "📅",
    dependencies: ["skill_outside_the_box_58"],
    type: "passive",
  },
  {
    id: "skill_drill_down_61",
    name: "Drill Down",
    desc: "Increases global Synergy multiplier by 0.1%.",
    cost: 101972,
    icon: "🧠",
    dependencies: ["skill_return_on_investment_54"],
    type: "passive",
  },
  {
    id: "skill_scope_creep_management_62",
    name: "Scope Creep Management",
    desc: "Increases global Synergy multiplier by 0.8%.",
    cost: 105365,
    icon: "📋",
    dependencies: ["skill_brain_dump_60"],
    type: "passive",
  },
  {
    id: "skill_right_sizing_63",
    name: "Right-sizing",
    desc: "Increases global Synergy multiplier by 0.8%.",
    cost: 109603,
    icon: "💰",
    dependencies: ["skill_thought_shower_59"],
    type: "passive",
  },
  {
    id: "skill_downsizing_64",
    name: "Downsizing",
    desc: "Increases global Synergy multiplier by 0.6%.",
    cost: 114598,
    icon: "🤝",
    dependencies: ["skill_outside_the_box_58"],
    type: "passive",
  },
  {
    id: "skill_restructuring_65",
    name: "Restructuring",
    desc: "Increases global Synergy multiplier by 0.7%.",
    cost: 119362,
    icon: "📈",
    dependencies: ["skill_drill_down_61"],
    type: "passive",
  },
  {
    id: "skill_vertical_integration_66",
    name: "Vertical Integration",
    desc: "Increases global Synergy multiplier by 0.4%.",
    cost: 128310,
    icon: "🤝",
    dependencies: ["skill_thought_shower_59"],
    type: "passive",
  },
  {
    id: "skill_horizontal_scaling_67",
    name: "Horizontal Scaling",
    desc: "Increases global Synergy multiplier by 0.9%.",
    cost: 132955,
    icon: "🗑️",
    dependencies: ["skill_right_sizing_63"],
    type: "passive",
  },
  {
    id: "skill_360_degree_feedback_68",
    name: "360-Degree Feedback",
    desc: "Increases global Synergy multiplier by 0.5%.",
    cost: 138812,
    icon: "💼",
    dependencies: ["skill_drill_down_61"],
    type: "passive",
  },
  {
    id: "skill_open_door_policy_69",
    name: "Open Door Policy",
    desc: "Increases global Synergy multiplier by 0.7%.",
    cost: 149397,
    icon: "💡",
    dependencies: ["skill_downsizing_64"],
    type: "passive",
  },
  {
    id: "skill_culture_fit_70",
    name: "Culture Fit",
    desc: "Increases global Synergy multiplier by 0.4%.",
    cost: 151826,
    icon: "📊",
    dependencies: ["skill_scope_creep_management_62"],
    type: "passive",
  },
  {
    id: "skill_onboarding_optimization_71",
    name: "Onboarding Optimization",
    desc: "Increases global Synergy multiplier by 0.2%.",
    cost: 162517,
    icon: "⏱️",
    dependencies: ["skill_360_degree_feedback_68"],
    type: "passive",
  },
  {
    id: "skill_offboarding_streamlining_72",
    name: "Offboarding Streamlining",
    desc: "Increases global Synergy multiplier by 0.7%.",
    cost: 168687,
    icon: "🚀",
    dependencies: ["skill_culture_fit_70"],
    type: "passive",
  },
  {
    id: "skill_talent_acquisition_73",
    name: "Talent Acquisition",
    desc: "Increases global Synergy multiplier by 0.3%.",
    cost: 178456,
    icon: "💡",
    dependencies: ["skill_open_door_policy_69"],
    type: "passive",
  },
  {
    id: "skill_headcount_management_74",
    name: "Headcount Management",
    desc: "Increases global Synergy multiplier by 0.10%.",
    cost: 185443,
    icon: "💼",
    dependencies: ["skill_culture_fit_70"],
    type: "passive",
  },
  {
    id: "skill_freemium_model_75",
    name: "Freemium Model",
    desc: "Increases global Synergy multiplier by 0.7%.",
    cost: 198170,
    icon: "📉",
    dependencies: ["skill_horizontal_scaling_67"],
    type: "passive",
  },
  {
    id: "skill_a_b_testing_76",
    name: "A/B Testing",
    desc: "Increases global Synergy multiplier by 0.2%.",
    cost: 206458,
    icon: "🏢",
    dependencies: ["skill_freemium_model_75"],
    type: "passive",
  },
  {
    id: "skill_growth_loop_77",
    name: "Growth Loop",
    desc: "Increases global Synergy multiplier by 0.5%.",
    cost: 214230,
    icon: "📊",
    dependencies: ["skill_culture_fit_70"],
    type: "passive",
  },
  {
    id: "skill_viral_coefficient_78",
    name: "Viral Coefficient",
    desc: "Increases global Synergy multiplier by 0.5%.",
    cost: 226511,
    icon: "📋",
    dependencies: ["skill_onboarding_optimization_71"],
    type: "passive",
  },
  {
    id: "skill_churn_reduction_79",
    name: "Churn Reduction",
    desc: "Increases global Synergy multiplier by 0.2%.",
    cost: 235826,
    icon: "📅",
    dependencies: ["skill_viral_coefficient_78"],
    type: "passive",
  },
  {
    id: "skill_ltv_maximization_80",
    name: "LTV Maximization",
    desc: "Increases global Synergy multiplier by 0.7%.",
    cost: 251302,
    icon: "🤝",
    dependencies: ["skill_headcount_management_74"],
    type: "passive",
  },
  {
    id: "skill_cac_optimization_81",
    name: "CAC Optimization",
    desc: "Increases global Synergy multiplier by 0.5%.",
    cost: 260267,
    icon: "🧠",
    dependencies: ["skill_growth_loop_77"],
    type: "passive",
  },
  {
    id: "skill_funnel_conversion_82",
    name: "Funnel Conversion",
    desc: "Increases global Synergy multiplier by 0.1%.",
    cost: 276550,
    icon: "🏢",
    dependencies: ["skill_headcount_management_74"],
    type: "passive",
  },
  {
    id: "skill_bounce_rate_minimization_83",
    name: "Bounce Rate Minimization",
    desc: "Increases global Synergy multiplier by 0.9%.",
    cost: 287882,
    icon: "🚀",
    dependencies: ["skill_freemium_model_75"],
    type: "passive",
  },
  {
    id: "skill_net_promoter_score_84",
    name: "Net Promoter Score",
    desc: "Increases global Synergy multiplier by 0.8%.",
    cost: 301196,
    icon: "🚀",
    dependencies: ["skill_growth_loop_77"],
    type: "passive",
  },
  {
    id: "skill_customer_journey_85",
    name: "Customer Journey",
    desc: "Increases global Synergy multiplier by 0.6%.",
    cost: 319725,
    icon: "💼",
    dependencies: ["skill_growth_loop_77"],
    type: "passive",
  },
  {
    id: "skill_user_flow_86",
    name: "User Flow",
    desc: "Increases global Synergy multiplier by 0.8%.",
    cost: 335606,
    icon: "📈",
    dependencies: ["skill_customer_journey_85"],
    type: "passive",
  },
  {
    id: "skill_ui_ux_enhancement_87",
    name: "UI/UX Enhancement",
    desc: "Increases global Synergy multiplier by 0.9%.",
    cost: 349376,
    icon: "🗑️",
    dependencies: ["skill_bounce_rate_minimization_83"],
    type: "passive",
  },
  {
    id: "skill_design_thinking_88",
    name: "Design Thinking",
    desc: "Increases global Synergy multiplier by 0.8%.",
    cost: 366974,
    icon: "📈",
    dependencies: ["skill_cac_optimization_81"],
    type: "passive",
  },
  {
    id: "skill_minimum_viable_product_89",
    name: "Minimum Viable Product",
    desc: "Increases global Synergy multiplier by 0.8%.",
    cost: 386042,
    icon: "📅",
    dependencies: ["skill_cac_optimization_81"],
    type: "passive",
  },
  {
    id: "skill_product_market_fit_90",
    name: "Product Market Fit",
    desc: "Increases global Synergy multiplier by 0.6%.",
    cost: 403424,
    icon: "📋",
    dependencies: ["skill_customer_journey_85"],
    type: "passive",
  },
  {
    id: "skill_iteration_velocity_91",
    name: "Iteration Velocity",
    desc: "Increases global Synergy multiplier by 0.4%.",
    cost: 427365,
    icon: "🤝",
    dependencies: ["skill_net_promoter_score_84"],
    type: "passive",
  },
  {
    id: "skill_pivot_to_video_92",
    name: "Pivot to Video",
    desc: "Increases global Synergy multiplier by 0.1%.",
    cost: 448113,
    icon: "📉",
    dependencies: ["skill_ui_ux_enhancement_87"],
    type: "passive",
  },
  {
    id: "skill_metaverse_integration_93",
    name: "Metaverse Integration",
    desc: "Increases global Synergy multiplier by 0.2%.",
    cost: 467318,
    icon: "📋",
    dependencies: ["skill_minimum_viable_product_89"],
    type: "passive",
  },
  {
    id: "skill_web3_strategy_94",
    name: "Web3 Strategy",
    desc: "Increases global Synergy multiplier by 0.3%.",
    cost: 489933,
    icon: "⏱️",
    dependencies: ["skill_metaverse_integration_93"],
    type: "passive",
  },
  {
    id: "skill_ai_driven_development_95",
    name: "AI-Driven Development",
    desc: "Increases global Synergy multiplier by 0.6%.",
    cost: 518314,
    icon: "💼",
    dependencies: ["skill_minimum_viable_product_89"],
    type: "passive",
  },
  {
    id: "skill_machine_learning_pipeline_96",
    name: "Machine Learning Pipeline",
    desc: "Increases global Synergy multiplier by 0.7%.",
    cost: 540919,
    icon: "💰",
    dependencies: ["skill_design_thinking_88"],
    type: "passive",
  },
  {
    id: "skill_quantum_readiness_97",
    name: "Quantum Readiness",
    desc: "Increases global Synergy multiplier by 0.2%.",
    cost: 569709,
    icon: "💡",
    dependencies: ["skill_product_market_fit_90"],
    type: "passive",
  },
  {
    id: "skill_neural_network_scaling_98",
    name: "Neural Network Scaling",
    desc: "Increases global Synergy multiplier by 0.9%.",
    cost: 596449,
    icon: "🗑️",
    dependencies: ["skill_pivot_to_video_92"],
    type: "passive",
  },
  {
    id: "skill_llm_prompt_engineering_99",
    name: "LLM Prompt Engineering",
    desc: "Increases global Synergy multiplier by 0.8%.",
    cost: 629706,
    icon: "🚀",
    dependencies: ["skill_neural_network_scaling_98"],
    type: "passive",
  },
];

import * as htmlToImage from "html-to-image";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "app-root",
  imports: [CommonModule, MatIconModule],
  templateUrl: "./app.html",
  styleUrl: "./app.css",
})
export class App implements OnDestroy {
  synergy = signal(0);
  busyness = signal(0);
  teamMorale = signal(100);

  totalSynergy = signal<number>(0);
  lifetimeEarnedSynergy = signal<number>(0);
  unlockedSkills = signal<string[]>([]);
  readonly skillTree = SKILL_TREE;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trackAnalytics(eventName: string, data: any = {}) {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({ event: eventName, ...data });
    }
  }

  levelIndex = computed(() => {
    const s = this.synergy();
    let level = 0;
    for (let i = 0; i < SYNERGY_THRESHOLDS.length; i++) {
      if (s >= SYNERGY_THRESHOLDS[i]) {
        level = i;
      }
    }

    // Track highest progression immediately instead of just end of match
    // we use untracked so it does not make the computed trigger on highestLevelEver updates
    if (level > this.highestLevelEver()) {
      setTimeout(() => {
        this.highestLevelEver.set(level);
        if (typeof window !== "undefined")
          localStorage.setItem("corp_highest_level", level.toString());
      }, 0);
    }

    return level;
  });

  currentTitle = computed(() => TITLES[this.levelIndex()]);
  currentLevel = computed(() => this.levelIndex() + 1);

  lifetimeLevelIndex = computed(() => {
    const s = this.totalSynergy();
    let level = 0;
    for (let i = 0; i < LIFETIME_THRESHOLDS.length; i++) {
      if (s >= LIFETIME_THRESHOLDS[i]) level = i;
    }
    return level;
  });

  lifetimeTitle = computed(() => LIFETIME_TITLES[this.lifetimeLevelIndex()]);

  nextLevelThreshold = computed(() => {
    const idx = this.levelIndex();
    if (idx < SYNERGY_THRESHOLDS.length - 1) {
      return SYNERGY_THRESHOLDS[idx + 1];
    }
    return null;
  });

  progressToNextLevel = computed(() => {
    const threshold = this.nextLevelThreshold();
    const idx = this.levelIndex();
    if (!threshold) return 100;
    const currentBase = SYNERGY_THRESHOLDS[idx];
    return Math.min(
      100,
      Math.max(
        0,
        Math.floor(
          ((this.synergy() - currentBase) / (threshold - currentBase)) * 100,
        ),
      ),
    );
  });

  logs = signal<LogEntry[]>([]);

  // ---- VIRAL STATS & STATE ----
  emailsSynergized = 0;
  doersFired = 0;

  gameState = signal<
    | "menu"
    | "tutorial"
    | "playing"
    | "story"
    | "gameover"
    | "account"
    | "leaderboard"
    | "wardrobe"
    | "skills"
    | "multiplayer_lobby"
    | "require_login"
    | "onboarding"
    | "watercooler"
    | "companies"
    | "roast"
  >("menu");
  tutorialStep = signal<number>(1);
  gameMode = signal<string>("endless");
  championshipTimeLeft = signal<number>(120);
  currentStoryNode = signal<{
    title: string;
    text: string;
    boss: string;
  } | null>(null);
  promotionsClaimed = new Set<number>();

  // Customization
  playerSkin = signal<string>("classic");
  highestLevelEver = signal<number>(0);
  availableSkins = [
    {
      id: "classic",
      name: "Standard Issue Suit",
      desc: "The corporate default.",
      unlockLevel: 0,
    },
    {
      id: "fleece",
      name: "Tech Bro Fleece",
      desc: "For when you want to seem approachable.",
      unlockLevel: 2,
    },
    {
      id: "gold",
      name: "Executive Gold",
      desc: "Reserved for the C-Suite.",
      unlockLevel: 5,
    },
    {
      id: "cyber",
      name: "Neon Disruptor",
      desc: "Move fast, break things.",
      unlockLevel: 8,
    },
    {
      id: "ninja",
      name: "Scrum Ninja",
      desc: "Sprints in stealth.",
      unlockLevel: 10,
    },
    {
      id: "wizard",
      name: "Data Wizard",
      desc: "Predicts the past.",
      unlockLevel: 15,
    },
    {
      id: "pirate",
      name: "Growth Pirate",
      desc: "Aaaargh-O-I.",
      unlockLevel: 20,
    },
    {
      id: "astronaut",
      name: "Moonshot Strategist",
      desc: "Houston, we have synergy.",
      unlockLevel: 25,
    },
    {
      id: "casual",
      name: "Jeans & Blazer",
      desc: "Casual Friday veteran.",
      unlockLevel: 30,
    },
    {
      id: "goth",
      name: "Corporate Goth",
      desc: "It is not a phase, HR.",
      unlockLevel: 35,
    },
    {
      id: "robo",
      name: "Automated Executive",
      desc: "Replaced by AI.",
      unlockLevel: 40,
    },
    {
      id: "zombie",
      name: "Burnout Survivor",
      desc: "Powered by espresso and fear.",
      unlockLevel: 45,
    },
    {
      id: "ghost",
      name: "Quiet Quitter",
      desc: "Barely visible during meetings.",
      unlockLevel: 50,
    },
    {
      id: "clown",
      name: "Office Clown",
      desc: "Brings joy, misses KPIs.",
      unlockLevel: 55,
    },
    {
      id: "knight",
      name: "White Knight",
      desc: "Saves failing projects.",
      unlockLevel: 60,
    },
    {
      id: "vampire",
      name: "Time Vampire",
      desc: "Specializes in 2-hour meetings.",
      unlockLevel: 65,
    },
    {
      id: "angel",
      name: "Angel Investor",
      desc: "Sprinkles seed funding.",
      unlockLevel: 70,
    },
    {
      id: "demon",
      name: "Micromanager",
      desc: "Breathes down your neck.",
      unlockLevel: 75,
    },
    {
      id: "hacker",
      name: "10x Engineer",
      desc: "Types very fast.",
      unlockLevel: 80,
    },
    {
      id: "dinosaur",
      name: "Legacy System",
      desc: "Refuses to upgrade.",
      unlockLevel: 85,
    },
    {
      id: "superhero",
      name: "Agile Champion",
      desc: "Rescues the sprint.",
      unlockLevel: 90,
    },
    {
      id: "king",
      name: "The Founder",
      desc: "Rules with an iron fist.",
      unlockLevel: 95,
    },
    {
      id: "god",
      name: "Board Member",
      desc: "Unreachable. Unknowable.",
      unlockLevel: 100,
    },
    {
      id: "alien",
      name: "Outside Consultant",
      desc: "Doesnt understand the culture.",
      unlockLevel: 150,
    },
  ];

  selectSkin(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.playerSkin.set(id as any);
    if (typeof window !== "undefined") {
      localStorage.setItem("corp_skin", id);
    }
  }
  quests = signal<
    {
      type: string;
      desc: string;
      target: number;
      progress: number;
      reward: number;
      completed: boolean;
    }[]
  >([]);

  firebaseInfoMode = signal<string>("endless");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  leaderboards = signal<any[]>([]);

  // Watercooler
  watercoolerPosts = signal<WatercoolerPost[]>([]);
  watercoolerChannel = signal<string>("general");
  watercoolerChannels = signal<WatercoolerChannel[]>([]);
  newWatercoolerPost = signal<string>("");
  isCreatingChannel = signal(false);
  newChannelName = signal("");
  newChannelDesc = signal("");
  isAnonymousPost = signal(false);
  showMobileComposer = signal(false);
  expandedPosts = signal<Set<string>>(new Set<string>());

  POST_TRUNCATE_LIMIT = 250;

  // ---- streak ----
  streakCount = signal<number>(0);
  streakBoosted = signal<boolean>(false);
  get streakMultiplier(): number {
    const s = this.streakCount();
    if (s >= 7) return 1.25;
    if (s >= 3) return 1.10;
    return 1.0;
  }

  // ---- ghost race ----
  ghostScore = signal<{ score: number; name: string } | null>(null);
  ghostEnabled = signal<boolean>(false);
  ghostBeaten = signal<boolean>(false);
  private runStartMs = 0;
  private RUN_LENGTH_MS = 90_000; // ghost interpolated over 90s

  ghostCurrentScore(): number {
    const g = this.ghostScore();
    if (!g) return 0;
    if (this.runStartMs === 0) return 0;
    const t = Math.min(1, (performance.now() - this.runStartMs) / this.RUN_LENGTH_MS);
    return Math.floor(g.score * t);
  }

  // ---- bounties ----
  activeBounties = signal<import('./firebase.service').Bounty[]>([]);
  showBountyCreator = signal(false);
  bountyDraft = signal({ mode: 'endless', target: 1000, reward: 200, hours: 24 });
  bountyClaimedAlert = signal<string>('');

  // ---- share ----
  shareInProgress = signal(false);

  // ---- companies ----
  myCompany = signal<import('./firebase.service').Company | null>(null);
  myCompanyMembers = signal<import('./firebase.service').CompanyMember[]>([]);
  myCompanyBoard = signal<import('./firebase.service').LeaderboardEntry[]>([]);
  companyView = signal<'intro' | 'create' | 'join' | 'hq'>('intro');
  companyDraft = signal({ name: '', motto: '' });
  companyJoinCodeInput = signal<string>('');
  companyLoadingMsg = signal<string>('');
  companyBoardMode = signal<string>('endless');

  // ---- hero watercooler preview ----
  heroWatercoolerPosts = signal<import('./firebase.service').WatercoolerPost[]>([]);
  private heroPreviewTimer: ReturnType<typeof setInterval> | null = null;

  // ---- roast my career ----
  roastForm = signal({ jobTitle: '', yearsExperience: 5, buzzword: '', metric: '' });
  roastResult = signal<string>('');
  roastLoading = signal<boolean>(false);
  roastApiKeyInput = signal<string>('');
  roastShowKeySetup = signal<boolean>(false);

  openRoast() {
    this.gameState.set('roast');
    this.roastResult.set('');
    if (!this.roastSvc.hasApiKey()) {
      this.roastShowKeySetup.set(true);
    } else {
      this.roastShowKeySetup.set(false);
    }
  }

  saveRoastApiKey() {
    const k = this.roastApiKeyInput().trim();
    if (!k) {
      this.addLog('Paste a Gemini API key first.', 'error');
      return;
    }
    this.roastSvc.setApiKey(k);
    this.roastApiKeyInput.set('');
    this.roastShowKeySetup.set(false);
    this.addLog('🔑 Gemini key saved on this device.', 'success');
  }

  clearRoastApiKey() {
    this.roastSvc.setApiKey('');
    this.roastShowKeySetup.set(true);
    this.addLog('Gemini key cleared.', 'success');
  }

  async generateRoast() {
    const f = this.roastForm();
    if (!f.jobTitle.trim() || !f.buzzword.trim() || !f.metric.trim()) {
      this.addLog('Fill all fields, you absolute professional.', 'error');
      return;
    }
    if (!this.roastSvc.hasApiKey()) {
      this.roastShowKeySetup.set(true);
      this.addLog('Add your Gemini API key first.', 'error');
      return;
    }
    this.roastLoading.set(true);
    this.roastResult.set('');
    try {
      const out = await this.roastSvc.roast({
        jobTitle: f.jobTitle.trim(),
        yearsExperience: Number(f.yearsExperience) || 0,
        buzzword: f.buzzword.trim(),
        metric: f.metric.trim(),
      });
      this.roastResult.set(out);
    } catch (err) {
      const msg = (err as Error).message || 'Unknown error';
      this.addLog('Roast failed: ' + msg, 'error');
      // Common case: invalid key — re-show setup
      if (/api[_ ]?key|invalid|401|403|permission/i.test(msg)) {
        this.roastShowKeySetup.set(true);
      }
    } finally {
      this.roastLoading.set(false);
    }
  }

  /** Native or web share of the roast text + URL. */
  async shareRoast() {
    const text = this.roastResult();
    if (!text) return;
    const url = (typeof window !== 'undefined' ? window.location.origin : 'https://corporate-ladder.web.app');
    const payload = `${text}\n\n— Generated by Corporate Ladder Simulator\n${url}`;
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import('@capacitor/share');
        await Share.share({ text: payload, url, dialogTitle: 'Share your roast' });
      } else if (typeof navigator !== 'undefined' && (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share) {
        await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({ text: payload, url });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(payload);
        this.addLog('Roast copied to clipboard.', 'success');
      }
    } catch { /* user cancel — fine */ }
  }

  copyRoast() {
    const text = this.roastResult();
    if (!text || typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => this.addLog('Roast copied to clipboard.', 'success'));
  }

  playWithRoastTitle() {
    // Pull the satirical title from the roast and seed it as the player's display title
    const text = this.roastResult();
    const m = text.match(/ASSIGNED NEW TITLE:\s*(.+)/i);
    const newTitle = (m?.[1] || this.roastForm().jobTitle).trim().slice(0, 60);
    if (newTitle) {
      this.spawnFloatingText(newTitle.toUpperCase(), '#06B6D4', 0, 0);
      this.addLog(`Entering as: ${newTitle}`, 'success');
    }
    this.startGame(this.gameMode());
  }

  async loadHeroWatercoolerPreview() {
    try {
      // Pull latest from /watercooler ordered by createdAt desc, take first 3 across any channel
      const posts = await this.fb.getWatercoolerPosts('general'); // we'll reuse — getWatercoolerPosts filters by channel; need cross-channel
      // The current getWatercoolerPosts already fetches all 50 then filters; we want unfiltered, so do a direct query.
      const cross = await this.fb.getRecentWatercoolerPostsAnyChannel(5);
      this.heroWatercoolerPosts.set(cross.length ? cross.slice(0, 3) : posts.slice(0, 3));
    } catch { /* silent */ }
  }

  async upvoteHeroPost(postId: string) {
    if (!this.fb.user()) {
      this.addLog('Sign in to upvote.', 'error');
      return;
    }
    const list = this.heroWatercoolerPosts();
    const target = list.find((p) => p.id === postId);
    if (!target) return;
    // Optimistic
    target.upvotes = (target.upvotes || 0) + 1;
    this.heroWatercoolerPosts.set([...list]);
    try {
      await this.fb.upvoteWatercoolerPost(postId, (target.upvotes || 1) - 1);
    } catch {
      // Roll back on failure
      target.upvotes = Math.max(0, (target.upvotes || 1) - 1);
      this.heroWatercoolerPosts.set([...list]);
      this.addLog('Upvote failed.', 'error');
    }
  }

  startHeroPreviewPolling() {
    if (this.heroPreviewTimer) return;
    this.loadHeroWatercoolerPreview();
    if (typeof window !== 'undefined') {
      this.heroPreviewTimer = setInterval(() => {
        if (this.gameState() === 'menu') this.loadHeroWatercoolerPreview();
      }, 30000); // refresh every 30s while on menu
    }
  }

  get isCompanyCEO(): boolean {
    const c = this.myCompany();
    const u = this.fb.user();
    return !!(c && u && c.ownerId === u.uid);
  }

  async openCompanies() {
    this.gameState.set('companies');
    if (!this.fb.user()) {
      this.companyView.set('intro');
      return;
    }
    this.companyLoadingMsg.set('Loading...');
    const profile = await this.fb.getUserProfile();
    const cid = profile?.currentCompanyId;
    if (cid) {
      const c = await this.fb.getCompany(cid);
      if (c) {
        this.myCompany.set(c);
        this.companyView.set('hq');
        await this.refreshCompanyHQ();
      } else {
        // Stale reference; clear and show intro
        this.myCompany.set(null);
        this.companyView.set('intro');
      }
    } else {
      this.myCompany.set(null);
      this.companyView.set('intro');
    }
    this.companyLoadingMsg.set('');
  }

  async refreshCompanyHQ() {
    const c = this.myCompany();
    if (!c?.id) return;
    const [members, board] = await Promise.all([
      this.fb.getCompanyMembers(c.id),
      this.fb.getCompanyLeaderboard(c.id, this.companyBoardMode()),
    ]);
    this.myCompanyMembers.set(members);
    this.myCompanyBoard.set(board);
  }

  async createCompanyFromDraft() {
    const d = this.companyDraft();
    if (!d.name.trim()) {
      this.addLog('Company name required.', 'error');
      return;
    }
    this.companyLoadingMsg.set('Founding company...');
    const res = await this.fb.createCompany(d.name, d.motto);
    this.companyLoadingMsg.set('');
    if (!res.ok) {
      this.addLog('Could not found company: ' + (res.reason || 'unknown'), 'error');
      return;
    }
    this.myCompany.set(res.company!);
    this.companyView.set('hq');
    this.companyDraft.set({ name: '', motto: '' });
    this.addLog(`🏢 Founded ${res.company!.name}. You are now the CEO.`, 'success');
    await this.refreshCompanyHQ();
  }

  async joinCompanyByCode() {
    const code = this.companyJoinCodeInput().trim();
    if (!code) {
      this.addLog('Enter a join code.', 'error');
      return;
    }
    this.companyLoadingMsg.set('Submitting application...');
    const res = await this.fb.joinCompany(code);
    this.companyLoadingMsg.set('');
    if (!res.ok) {
      this.addLog('Application denied: ' + (res.reason || 'unknown'), 'error');
      return;
    }
    this.myCompany.set(res.company!);
    this.companyView.set('hq');
    this.companyJoinCodeInput.set('');
    this.addLog(`🤝 Hired by ${res.company!.name}. Welcome to the cult.`, 'success');
    await this.refreshCompanyHQ();
  }

  async leaveMyCompany() {
    const c = this.myCompany();
    if (!c?.id) return;
    if (typeof window !== 'undefined' && !window.confirm(`Quit ${c.name}? You'll lose your seat at the table.`)) return;
    await this.fb.leaveCompany(c.id);
    this.myCompany.set(null);
    this.companyView.set('intro');
    this.addLog('You have resigned. HR has been notified.', 'success');
  }

  async kickEmployee(targetUid: string, name: string) {
    const c = this.myCompany();
    if (!c?.id) return;
    if (typeof window !== 'undefined' && !window.confirm(`Lay off ${name}? They'll be banned from rejoining unless you unban them.`)) return;
    const res = await this.fb.kickMember(c.id, targetUid);
    if (res.ok) {
      this.addLog(`🛑 ${name} has been laid off.`, 'success');
      await this.refreshCompanyHQ();
      const refreshed = await this.fb.getCompany(c.id);
      if (refreshed) this.myCompany.set(refreshed);
    } else {
      this.addLog('Layoff blocked: ' + (res.reason || 'unknown'), 'error');
    }
  }

  async unbanEmployee(targetUid: string) {
    const c = this.myCompany();
    if (!c?.id) return;
    await this.fb.unbanMember(c.id, targetUid);
    const refreshed = await this.fb.getCompany(c.id);
    if (refreshed) this.myCompany.set(refreshed);
  }

  async regenerateCompanyJoinCode() {
    const c = this.myCompany();
    if (!c?.id) return;
    const code = await this.fb.regenerateJoinCode(c.id);
    if (code) {
      this.myCompany.set({ ...c, joinCode: code });
      this.addLog(`New join code: ${code}`, 'success');
    }
  }

  copyCompanyInvite() {
    const c = this.myCompany();
    if (!c) return;
    const url = (typeof window !== 'undefined' ? window.location.origin : 'https://corporate-ladder.web.app');
    const text = `🏢 Join ${c.name} on Corporate Ladder Simulator.\nJoin code: ${c.joinCode}\n${url}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => this.addLog('Invite copied to clipboard.', 'success'));
    }
  }

  challengeCompanyMember(member: import('./firebase.service').CompanyMember) {
    // Reuse existing P.I.P. challenge link generator
    this.addLog(`🛑 P.I.P. issued to ${member.displayName}. Generating link...`, 'success');
    this.generateChallengeLink();
  }

  changeCompanyBoardMode(mode: string) {
    this.companyBoardMode.set(mode);
    this.refreshCompanyHQ();
  }

  openCompanyChannel() {
    const c = this.myCompany();
    if (!c?.channelName) return;
    this.gameState.set('watercooler');
    this.watercoolerChannel.set(c.channelName);
    this.loadWatercoolerPosts();
    this.loadWatercoolerChannels();
    this.loadActiveBounties();
  }

  isPostExpanded(id: string): boolean {
    return this.expandedPosts().has(id);
  }

  togglePostExpanded(id: string) {
    const next = new Set(this.expandedPosts());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.expandedPosts.set(next);
  }

  openMobileComposer() {
    if (!this.fb.user()) {
      this.gameState.set('onboarding');
      return;
    }
    this.showMobileComposer.set(true);
  }

  closeMobileComposer() {
    this.showMobileComposer.set(false);
  }

  async submitMobileComposer() {
    await this.createWatercoolerPost();
    this.showMobileComposer.set(false);
  }

  AVAILABLE_MODES = [
    { id: "endless", name: "ENDLESS", icon: "📈", desc: "Standard Grinding" },
    {
      id: "championship",
      name: "Q3 SPRINT",
      icon: "⏱️",
      desc: "Timed 2 Minute Run",
    },
    {
      id: "takeover",
      name: "HOSTILE TAKEOVER",
      icon: "🦈",
      desc: "High Chaos Fast Speed",
    },
    { id: "quiet", name: "QUIET QUITTING", icon: "🤫", desc: "Slow & Steady" },
    {
      id: "startup",
      name: "STARTUP CHAOS",
      icon: "🚀",
      desc: "High Risk High Reward",
    },
    {
      id: "hardcore",
      name: "HARDCORE",
      icon: "🔥",
      desc: "No Margin For Error",
    },
    {
      id: "enterprise",
      name: "ENTERPRISE",
      icon: "🏢",
      desc: "Slow Bureaucracy",
    },
    {
      id: "agile",
      name: "AGILE SPRINT",
      icon: "🏃",
      desc: "Constantly Changing",
    },
    {
      id: "waterfall",
      name: "WATERFALL",
      icon: "🌊",
      desc: "Predictable but Tedious",
    },
    {
      id: "crunch",
      name: "CRUNCH TIME",
      icon: "⏳",
      desc: "Permanent Negative Morale",
    },
    {
      id: "layoff",
      name: "LAYOFF SEASON",
      icon: "✂️",
      desc: "Extremely Hostile",
    },
    {
      id: "synergy_max",
      name: "SYNERGY MAX",
      icon: "✨",
      desc: "Only Synergy Matters",
    },
    {
      id: "reorg",
      name: "REORG SURVIVOR",
      icon: "🔄",
      desc: "Confusing Objectives",
    },
    {
      id: "pivot",
      name: "THE PIVOT",
      icon: "🔙",
      desc: "Rapid Strategy Changes",
    },
    { id: "consulting", name: "CONSULTING", icon: "💼", desc: "Billing Hours" },
    {
      id: "crypto",
      name: "CRYPTO BRO",
      icon: "💸",
      desc: "Extreme Volatility",
    },
    {
      id: "ai_bubble",
      name: "AI BUBBLE",
      icon: "🤖",
      desc: "Everything is AI",
    },
    {
      id: "remote",
      name: "REMOTE WORK",
      icon: "🏠",
      desc: "Slow, More Emails",
    },
    { id: "rto", name: "RTO MANDATE", icon: "📉", desc: "Morale Drops Faster" },
    {
      id: "hybrid",
      name: "HYBRID ROLE",
      icon: "☯️",
      desc: "Unpredictable Setup",
    },
    {
      id: "freemium",
      name: "FREEMIUM API",
      icon: "🪙",
      desc: "Wait Times Required",
    },
    {
      id: "metaverse",
      name: "METAVERSE STRATEGY",
      icon: "🥽",
      desc: "Virtually Pointless",
    },
    {
      id: "outsourced",
      name: "OUTSOURCED",
      icon: "🌐",
      desc: "Somebody Else Does It",
    },
    {
      id: "offshore",
      name: "OFFSHORE TEAM",
      icon: "🏝️",
      desc: "Timezone Delays",
    },
  ];

  selectedMode = signal<string>("endless");

  // Account deletion modal state (Play Store / GDPR compliance)
  showDeleteAccountConfirm = signal(false);
  deleteAccountBusy = signal(false);
  deleteAccountError = signal<string | null>(null);

  // Exit Interview — satirical farewell card shown after a successful deletion.
  // Stats are captured BEFORE the deletion call (since the profile doc is
  // erased server-side immediately after).
  showExitInterview = signal(false);
  exitInterview = signal<{
    displayName: string;
    days: number;            // days "employed" since first sign-in
    title: string;           // last earned satirical title
    lifetimeSynergy: number; // running total
    topScore: number;        // best score across all modes
    topMode: string;         // mode that produced topScore
    achievements: number;    // count
    reason: string;          // randomly picked satirical reason
    shareText: string;       // pre-rendered share copy
    shareUrl: string;        // marketing link with utm tag
  } | null>(null);
  exitShareBusy = signal(false);

  readonly fb = inject(FirebaseService);
  readonly achievements = inject(AchievementService);
  readonly roastSvc = inject(RoastService);

  gameOverReason = "";
  linkedInPost = "";

  // Challenge State
  activeChallenge = signal<Challenge | null>(null);
  challengeShareLink = signal<string | null>(null);

  // Multiplayer Live Room State
  activeRoom = signal<MultiplayerRoom | null>(null);
  joinCodeInput = signal<string>("");
  private roomSub: Unsubscribe | null = null;

  // Combos & Juice
  comboMeter = 0;
  comboMultiplier = 1;
  screenShake = 0;
  floatingTexts: {
    x: number;
    y: number;
    text: string;
    color: string;
    alpha: number;
    vy: number;
  }[] = [];
  firedEffects: { x: number; y: number; scale: number; alpha: number }[] = [];
  synergizeEffects: { x: number; y: number; radius: number; alpha: number }[] =
    [];
  confetti: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    ang: number;
    vAng: number;
  }[] = [];

  // ---- ENDLESS RUNNER STATE ----
  @ViewChild("gameCanvas") canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private animationFrameId = 0;
  private lastTime = 0;
  private frameCount = 0;
  private baseSpeed = 5;
  private coffeeBoostTimer = 0;
  private groundLevel = 400;

  private player = {
    x: 50,
    y: 150,
    width: 30, // Tighter bounding box
    height: 50,
    vy: 0,
    gravity: 0.8,
    jumpPower: -13, // Slightly higher to clear red tape
    grounded: true,
    isJumping: false,
  };

  private obstacles: Obstacle[] = [];

  private GAME_ACTIONS = [
    { type: "stareAtDeck", icon: "👁️", color: "#2563EB", text: "Stare" },
    { type: "pingThoughts", icon: "💬", color: "#2DD4BF", text: "Thoughts?" },
    { type: "circleBack", icon: "🔄", color: "#2DD4BF", text: "Circle Back" },
    {
      type: "giveVagueDirection",
      icon: "😶‍🌫️",
      color: "#EF4444",
      text: "Direction",
    },
    {
      type: "scheduleUselessMeeting",
      icon: "🗓️",
      color: "#2563EB",
      text: "Meeting",
    },
    { type: "networkingLunch", icon: "🍕", color: "#2DD4BF", text: "Lunch" },
    { type: "mentoringSession", icon: "🧠", color: "#F59E0B", text: "Mentor" },
    { type: "delegateTasks", icon: "📋", color: "#F59E0B", text: "Delegate" },
    { type: "takeCredit", icon: "💎", color: "#F59E0B", text: "Take Credit" },
    { type: "synergyWorkshop", icon: "🎪", color: "#2DD4BF", text: "Workshop" },
    {
      type: "brainstormingSession",
      icon: "💡",
      color: "#2563EB",
      text: "Brainstorm",
    },
    {
      type: "fakeCollaboration",
      icon: "🤝",
      color: "#2DD4BF",
      text: "Fake Collab",
    },
  ];

  synergyBoostTimer = signal<number>(0);

  private POWERUPS = [
    {
      type: "synergyBoost",
      icon: "🔋",
      color: "#10B981",
      text: "Synergy Boost",
    },
    { type: "fastTrack", icon: "🚀", color: "#F59E0B", text: "Fast Track" },
  ];

  private HURDLES = [
    {
      type: "redTape",
      icon: "🛑",
      color: "#EF4444",
      text: "Red Tape",
      width: 90,
      speedModifier: 0.7,
    },
    {
      type: "urgentEmail",
      icon: "📧",
      color: "#EAB308",
      text: "Email",
      width: 36,
      speedModifier: 1.2,
    },
    {
      type: "realWork",
      icon: "💻",
      color: "#EF4444",
      text: "Coding",
      width: 36,
      speedModifier: 1,
    },
    {
      type: "realWork",
      icon: "📄",
      color: "#EF4444",
      text: "Strategy",
      width: 36,
      speedModifier: 1,
    },
    {
      type: "realWork",
      icon: "📈",
      color: "#EF4444",
      text: "Marketing",
      width: 36,
      speedModifier: 1,
    },
    {
      type: "realWork",
      icon: "📊",
      color: "#EF4444",
      text: "QA Testing",
      width: 36,
      speedModifier: 1.1,
    },
    {
      type: "micromanager",
      icon: "🕵️",
      color: "#7C3AED",
      text: "Micromanager",
      width: 45,
      speedModifier: 0.8,
    },
    {
      type: "endlessMeeting",
      icon: "📅",
      color: "#3B82F6",
      text: "Endless Meeting",
      width: 120,
      speedModifier: 0.6,
    },
  ];

  isPaused = false;
  private projectiles: {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
  }[] = [];
  private blocks: {
    x: number;
    y: number;
    width: number;
    height: number;
    active: boolean;
  }[] = [];

  constructor() {
    afterNextRender(() => {
      if (typeof window !== "undefined") {
        const highest = localStorage.getItem("corp_highest_level");
        if (highest) this.highestLevelEver.set(parseInt(highest, 10));
        const skin = localStorage.getItem("corp_skin");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (skin) this.playerSkin.set(skin as any);
      }

      // Hero watercooler live-preview polling (only on the menu screen)
      this.startHeroPreviewPolling();

      if (this.canvasRef) {
        this.ctx = this.canvasRef.nativeElement.getContext("2d")!;
        this.lastTime = window.performance.now();
        this.isPaused = true;
        this.gameState.set("menu");
        this.gameLoop();
      }

      // First-time visitors get the splash carousel automatically.
      // Returning visitors (or signed-in users) skip straight past it.
      try {
        const seen =
          typeof window !== "undefined" &&
          window.localStorage &&
          window.localStorage.getItem("cl_onb_seen") === "1";
        const hasChallenge =
          typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).has("challenge");
        if (!seen && !this.fb.user() && !hasChallenge) {
          this.onboardingStep.set(0);
          this.gameState.set("onboarding");
        }
      } catch { /* private mode / SSR — fine to skip */ }
    });

    effect(
      () => {
        // Cloud Sync listener when user changes
        const u = this.fb.user();
        if (u) {
          this.loadUserProfile();
        }
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        // Need untracked or allowing writes for the effect
        const currentMorale = this.teamMorale();
        const currentBusyness = this.busyness();

        if (typeof window !== "undefined") {
          const savedMeta = localStorage.getItem("corp_meta_synergy");
          if (savedMeta) this.totalSynergy.set(parseInt(savedMeta, 10));
          const savedLifetime = localStorage.getItem("corp_meta_lifetime");
          if (savedLifetime) {
            this.lifetimeEarnedSynergy.set(parseInt(savedLifetime, 10));
          } else if (savedMeta) {
            this.lifetimeEarnedSynergy.set(parseInt(savedMeta, 10)); // Fallback migration
          }
          const savedSkills = localStorage.getItem("corp_skills");
          if (savedSkills) this.unlockedSkills.set(JSON.parse(savedSkills));

          // Check for challenge linking
          const params = new URLSearchParams(window.location.search);
          const challengeId = params.get("challenge");
          if (challengeId) {
            this.loadChallenge(challengeId);
          }
        }

        if (currentMorale <= 0) {
          setTimeout(() => {
            this.addLog(
              "Your team's morale hit 0%. Upper management loves your 'tough decisions'. Synergy boosted!",
              "success",
            );
            this.synergy.update((s) => s + 50);
            this.teamMorale.set(80); // new team with slightly lowered initial morale because of reputation
          }, 0);
        }

        if (currentBusyness >= 100) {
          setTimeout(() => {
            this.addLog(
              "You looked extremely busy today. Perception is reality! Synergy +20",
              "success",
            );
            this.synergy.update((s) => s + 20);
            this.busyness.set(0);
          }, 0);
        }
      },
      { allowSignalWrites: true },
    );
  }

  createConfetti() {
    const colors = ["#38BDF8", "#D946EF", "#F59E0B", "#10B981", "#EF4444"];
    for (let i = 0; i < 100; i++) {
      this.confetti.push({
        x: this.canvasRef?.nativeElement.width / 2 || 400,
        y: this.canvasRef?.nativeElement.height / 2 || 300,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15 - 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        ang: Math.random() * Math.PI,
        vAng: (Math.random() - 0.5) * 0.2,
      });
    }
  }

  updateConfetti() {
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.2; // gravity
      c.ang += c.vAng;
      if (
        typeof window !== "undefined" &&
        this.canvasRef &&
        c.y > this.canvasRef.nativeElement.height
      ) {
        this.confetti.splice(i, 1);
      }
    }
  }

  private audioCtx: AudioContext | null = null;

  initAudio() {
    if (typeof window !== "undefined" && !this.audioCtx) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  playSound(type: "fire" | "synergize" | "levelUp" | "jump" | "shoot") {
    if (typeof window === "undefined") return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;
      const ctx = this.audioCtx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "fire") {
        osc.type = "square";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === "synergize") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === "levelUp") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(800, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === "jump") {
        // Much softer jump sound so it isn't an annoying screech when button mashing
        osc.type = "sine";
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === "shoot") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch (err) {
      // Audio context may fail if no interaction
      console.debug("Audio play failed ignored", err);
    }
  }

  addLog(
    message: string,
    type: "info" | "success" | "warning" | "error" = "info",
  ) {
    this.trackAnalytics("game_activity", {
      message,
      log_type: type,
      current_synergy: this.synergy(),
      title: this.currentTitle(),
    });
    this.logs.update((logs) => {
      const newLogs = [{ message, type, time: new Date() }, ...logs];
      if (newLogs.length > 20) return newLogs.slice(0, 20);
      return newLogs;
    });
  }

  stareAtDeck() {
    this.runStats["stareAtDeck"] = (this.runStats["stareAtDeck"] || 0) + 1;
    this.busyness.update((b) => Math.min(100, b + 15));
    this.addCombo(10);
    this.addLog(
      "Stared intensely at a 90-page slide deck. Didn't read a word.",
      "info",
    );
    this.updateQuest("deck");
  }

  circleBack() {
    this.runStats["circleBack"] = (this.runStats["circleBack"] || 0) + 1;
    this.synergy.update((s) => s + 10 * this.comboMultiplier);
    this.teamMorale.update((m) => Math.max(0, m - 5));
    this.addCombo(15);
    this.addLog("Told a subordinate to 'circle back' on that.", "warning");
    this.updateQuest("circle_back");
  }

  pingThoughts() {
    this.runStats["pingThoughts"] = (this.runStats["pingThoughts"] || 0) + 1;
    this.synergy.update((s) => s + 5 * this.comboMultiplier);
    this.busyness.update((b) => Math.min(100, b + 5));
    this.teamMorale.update((m) => Math.max(0, m - 2));
    this.addCombo(10);
    this.addLog("Forwarded an email chain with just 'Thoughts?'", "info");
    this.updateQuest("ping");
  }

  takeCredit() {
    if (this.teamMorale() < 30) {
      this.addLog(
        "Team morale is too low to take credit. They are actively complaining.",
        "error",
      );
      return;
    }
    this.runStats["takeCredit"] = (this.runStats["takeCredit"] || 0) + 1;
    this.synergy.update((s) => s + 40 * this.comboMultiplier);
    this.teamMorale.update((m) => Math.max(0, m - 30));
    this.addCombo(50);
    this.addLog(
      "Presented your team's hard work as your own. Executive leadership is impressed!",
      "success",
    );
    this.updateQuest("take_credit");
  }

  fakeCollaboration() {
    this.runStats["fakeCollaboration"] =
      (this.runStats["fakeCollaboration"] || 0) + 1;
    this.busyness.update((b) => Math.min(100, b + 10));
    this.teamMorale.update((m) => Math.max(0, m - 5));
    this.addCombo(15);
    this.addLog(
      "Engaged in 'fake collaboration' with another department. Nothing was accomplished, but perceptions are managed.",
      "info",
    );
    this.updateQuest("collab");
  }

  fireTeamMember() {
    this.doersFired++;
    this.achievements.track("fire");
    // Tracking doers fired is in its own stat `doersFired` when an obstacle is hit, but we'll track this button press too
    this.teamMorale.update((m) => Math.max(0, m - 20));
    this.synergy.update((s) => s + 10 * this.comboMultiplier);
    this.addCombo(20);
    this.addLog(
      "Successfully terminated a high-performing employee. Your decisiveness is noted.",
      "success",
    );
    this.updateQuest("fire");
    this.updateQuest("fire_many");
    this.updateQuest("fire_cause");

    // Fire a 'real work' obstacle if present
    for (const obs of this.obstacles) {
      if (obs.isHurdle && obs.action.type === "realWork" && !obs.collected) {
        obs.collected = true;
        this.doersFired++;
        this.screenShake = 10;
        this.addCombo(15);
        this.spawnFloatingText("TERMINATED!", "#EF4444", obs.x, obs.y - 20);
        break; // Only affect one obstacle at a time
      }
    }
  }

  scheduleUselessMeeting() {
    this.runStats["scheduleUselessMeeting"] =
      (this.runStats["scheduleUselessMeeting"] || 0) + 1;
    this.synergy.update((s) => s + 15 * this.comboMultiplier);
    this.busyness.update((b) => Math.min(100, b + 20));
    this.teamMorale.update((m) => Math.max(0, m - 10));
    this.addCombo(20);
    this.addLog(
      "Scheduled a 2-hour 'Sync-up' meeting that could have been an email.",
      "warning",
    );
    this.updateQuest("meeting");
  }

  giveVagueDirection() {
    this.runStats["giveVagueDirection"] =
      (this.runStats["giveVagueDirection"] || 0) + 1;
    this.synergy.update((s) => s + 5 * this.comboMultiplier);
    this.busyness.update((b) => Math.min(100, b + 10));
    this.teamMorale.update((m) => Math.max(0, m - 15));
    this.addCombo(10);
    this.addLog(
      "Told the team to 'make it pop' and 'think outside the box'.",
      "warning",
    );
    this.updateQuest("vague");
  }

  networkingLunch() {
    this.runStats["networkingLunch"] =
      (this.runStats["networkingLunch"] || 0) + 1;
    this.synergy.update((s) => s + 20 * this.comboMultiplier);
    this.busyness.update((b) => Math.max(0, b - 15));
    this.addCombo(20);
    this.addLog(
      "Attended a networking lunch. Exchanged business cards with a VP. High-level synergy achieved!",
      "success",
    );
    this.updateQuest("network");
  }

  mentoringSession() {
    this.runStats["mentoringSession"] =
      (this.runStats["mentoringSession"] || 0) + 1;
    this.teamMorale.update((m) => Math.min(100, m + 10));
    this.synergy.update((s) => Math.max(0, s - 5));
    this.addLog(
      'Held a "mentoring session" where you mainly talked about yourself. Team feels slightly more motivated, but confused.',
      "info",
    );
    this.updateQuest("mentor");
  }

  delegateTasks() {
    this.runStats["delegateTasks"] = (this.runStats["delegateTasks"] || 0) + 1;
    this.teamMorale.update((m) => Math.max(0, m - 10));
    this.synergy.update((s) => s + 5 * this.comboMultiplier);
    this.addCombo(10);
    this.addLog("Delegated tasks to the team. You are a great leader.", "info");
    this.updateQuest("delegate");
  }

  synergyWorkshop() {
    this.runStats["synergyWorkshop"] =
      (this.runStats["synergyWorkshop"] || 0) + 1;
    this.synergy.update((s) => s + 25 * this.comboMultiplier);
    this.busyness.update((b) => Math.max(0, b - 10));
    this.addCombo(30);
    this.addLog(
      "Conducted a 'synergy workshop' focusing on abstract concepts. Everyone left feeling more 'aligned'.",
      "success",
    );
    this.updateQuest("workshop");
  }

  brainstormingSession() {
    this.runStats["brainstormingSession"] =
      (this.runStats["brainstormingSession"] || 0) + 1;
    this.busyness.update((b) => Math.min(100, b + 10));
    this.teamMorale.update((m) => Math.max(0, m - 5));
    this.addCombo(15);
    this.addLog(
      "Held a 'brainstorming session' that was mostly you asking for ideas. The team provided them.",
      "info",
    );
    this.updateQuest("brainstorm");
  }

  async loadChallenge(challengeId: string) {
    const challenge = await this.fb.getChallenge(challengeId);
    if (challenge) {
      this.activeChallenge.set(challenge);
    } else {
      console.error("Challenge not found.");
      this.addLog("Shared challenge could not be found.", "error");
    }
  }

  onboardingUsername = signal<string>("");

  // Auth tab state for the redesigned step-3 login screen.
  // Tab values: 'signin' (email login) | 'signup' (email register) | 'guest' (anonymous)
  authTab = signal<"signin" | "signup" | "guest">("signup");
  authEmail = signal<string>("");
  authPassword = signal<string>("");
  authPasswordConfirm = signal<string>("");
  authBusy = signal<boolean>(false);
  authError = signal<string | null>(null);
  authNotice = signal<string | null>(null);
  authShowPassword = signal<boolean>(false);

  // Onboarding flow state.
  // Step 0/1/2 = the three splash screens.
  // Step 3 = the terminal-styled login screen.
  // localStorage flag `cl_onb_seen=1` is set after the user finishes the splashes
  // OR taps "Skip intro" — so returning users go straight to the login screen.
  onboardingStep = signal<number>(0);

  /** Open the full onboarding flow. Skips splashes for returning users. */
  openOnboarding(forceFromStart = false) {
    let seen = false;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        seen = window.localStorage.getItem("cl_onb_seen") === "1";
      }
    } catch { /* private mode */ }
    // First-timers see splashes (step 0); returning users land on the auth form
    // and we default them to "Sign In" since they've been here before.
    this.authTab.set(seen ? "signin" : "signup");
    this.authError.set(null);
    this.authNotice.set(null);
    this.onboardingStep.set(forceFromStart ? 0 : seen ? 3 : 0);
    this.gameState.set("onboarding");
  }

  nextOnboardingStep() {
    const next = Math.min(3, this.onboardingStep() + 1);
    // Sign-up flow: user already authenticated → skip the login step entirely
    // and launch the tutorial run (existing `gameState === 'tutorial'` path
    // triggers automatically inside startGame() when corp_tutorial_done is unset).
    if (next === 3 && this.fb.user()) {
      this.markOnboardingSeen();
      this.gameState.set("menu");
      // tiny delay so the menu paints first; the tutorial then opens over it.
      setTimeout(() => this.startGame("endless"), 60);
      return;
    }
    this.onboardingStep.set(next);
    if (next === 3) this.markOnboardingSeen();
  }

  prevOnboardingStep() {
    this.onboardingStep.set(Math.max(0, this.onboardingStep() - 1));
  }

  skipOnboardingToLogin() {
    this.markOnboardingSeen();
    this.onboardingStep.set(3);
  }

  setOnboardingStep(step: number) {
    if (step < 0 || step > 3) return;
    this.onboardingStep.set(step);
    if (step === 3) this.markOnboardingSeen();
  }

  /** Post the current game-over performance review into the Watercooler #brags channel. */
  postToWatercoolerBusy = signal<boolean>(false);
  postToWatercoolerDone = signal<boolean>(false);
  async postScoreToWatercooler() {
    if (this.postToWatercoolerBusy() || this.postToWatercoolerDone()) return;
    if (!this.fb.user()) {
      this.addLog("Sign in to post your score to the Watercooler.", "warning");
      this.openOnboarding();
      return;
    }
    if (this.fb.isGuest()) {
      this.addLog("Guests can't post to public channels. Upgrade your account first.", "warning");
      return;
    }
    this.postToWatercoolerBusy.set(true);
    try {
      const score = this.synergy();
      const title = this.currentTitle() || "Corporate Drone";
      const mode = this.gameMode().toUpperCase();
      const reason = this.gameOverReason.includes("FIRED") ? "🛑 TERMINATED" : "🪂 RETIRED";
      const content =
        `📈 PERFORMANCE REVIEW\n` +
        `${title} — ${reason} in ${mode}\n` +
        `Synergy yield: +${score.toLocaleString()} · ` +
        `Emails cleared: ${this.emailsSynergized || 0} · ` +
        `Doers fired: ${this.doersFired || 0}\n\n` +
        `"${(this.linkedInPost || '').slice(0, 220)}"`;
      await this.fb.createWatercoolerPost(content, "brags");
      this.postToWatercoolerDone.set(true);
      this.addLog("Posted to #brags — your coworkers will judge silently.", "success");
    } catch (err) {
      console.warn("Watercooler post failed", err);
      this.addLog("Couldn't post — try again or open Watercooler manually.", "error");
    } finally {
      this.postToWatercoolerBusy.set(false);
    }
  }

  closeOnboarding() {
    this.markOnboardingSeen();
    this.gameState.set("menu");
  }

  private markOnboardingSeen() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("cl_onb_seen", "1");
      }
    } catch { /* private mode */ }
  }

  /** Map a Firebase auth/* error code to a friendly user-facing message. */
  private friendlyAuthError(code: string): string {
    const map: Record<string, string> = {
      "auth/email-already-in-use": "That email is already registered. Try signing in instead.",
      "auth/invalid-email": "That email address looks invalid.",
      "auth/weak-password": "Password must be at least 6 characters.",
      "auth/missing-password": "Enter a password.",
      "auth/user-not-found": "No account found for that email.",
      "auth/wrong-password": "Wrong password. Try again or reset.",
      "auth/invalid-credential": "Email or password is incorrect.",
      "auth/too-many-requests": "Too many failed attempts. Wait a minute and retry.",
      "auth/network-request-failed": "Network error. Check your connection.",
      "auth/credential-already-in-use": "That account is already linked to another user. Sign in directly instead.",
      "auth/popup-closed-by-user": "Sign-in popup was closed before finishing.",
      "auth/popup-blocked": "Browser blocked the popup. Enable popups and retry.",
    };
    return map[code] || "Something went wrong. Try again in a moment.";
  }

  setAuthTab(tab: "signin" | "signup" | "guest") {
    this.authTab.set(tab);
    this.authError.set(null);
    this.authNotice.set(null);
  }

  toggleShowPassword() {
    this.authShowPassword.set(!this.authShowPassword());
  }

  /** Sign-up handler — Email + Password + handle, then enters splash flow. */
  async submitSignUp() {
    if (this.authBusy()) return;
    const email = this.authEmail().trim();
    const password = this.authPassword();
    const confirm = this.authPasswordConfirm();
    const handle = this.onboardingUsername().trim();
    this.authError.set(null);
    this.authNotice.set(null);
    if (!email) { this.authError.set("Enter your email."); return; }
    if (password.length < 6) { this.authError.set("Password must be at least 6 characters."); return; }
    if (password !== confirm) { this.authError.set("Passwords don't match."); return; }
    if (!handle) { this.authError.set("Pick a display handle so coworkers know who to PIP."); return; }
    this.authBusy.set(true);
    try {
      await this.fb.signUpWithEmail(email, password, handle);
      // Successful: clear sensitive fields, enter splash carousel.
      this.authPassword.set("");
      this.authPasswordConfirm.set("");
      this.authNotice.set(null);
      this.onboardingStep.set(0); // jump to splash 1 of 3
      this.markOnboardingSeen();
      // Tutorial will trigger on first menu game-launch (see startGame override below).
      this.queueFirstRunTutorial();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "";
      this.authError.set(this.friendlyAuthError(code));
    } finally {
      this.authBusy.set(false);
    }
  }

  /** Sign-in handler — Email + Password. */
  async submitSignIn() {
    if (this.authBusy()) return;
    const email = this.authEmail().trim();
    const password = this.authPassword();
    this.authError.set(null);
    this.authNotice.set(null);
    if (!email || !password) { this.authError.set("Email and password required."); return; }
    this.authBusy.set(true);
    try {
      await this.fb.signInWithEmail(email, password);
      this.authPassword.set("");
      this.markOnboardingSeen();
      // Returning user — straight to menu.
      this.gameState.set("menu");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "";
      this.authError.set(this.friendlyAuthError(code));
    } finally {
      this.authBusy.set(false);
    }
  }

  /** Send password reset email for the email currently in the form. */
  async submitPasswordReset() {
    const email = this.authEmail().trim();
    if (!email) { this.authError.set("Enter your email first, then tap Forgot Password."); return; }
    this.authBusy.set(true);
    this.authError.set(null);
    try {
      await this.fb.sendPasswordReset(email);
      this.authNotice.set(`Reset link sent to ${email}. Check spam too.`);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "";
      this.authError.set(this.friendlyAuthError(code));
    } finally {
      this.authBusy.set(false);
    }
  }

  /** Guest sign-in (Firebase anonymous). */
  async submitGuest() {
    if (this.authBusy()) return;
    const handle = this.onboardingUsername().trim();
    this.authBusy.set(true);
    this.authError.set(null);
    try {
      await this.fb.signInAsGuest(handle || undefined);
      this.markOnboardingSeen();
      // Skip splashes for guests (they're trying it out — get them in fast).
      this.gameState.set("menu");
      this.addLog("Signed in as Guest. Sync to email/Google later from your profile.", "info");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "";
      this.authError.set(this.friendlyAuthError(code));
    } finally {
      this.authBusy.set(false);
    }
  }

  /** Used by the existing button: kicks off Google sign-in then enters splashes if first time. */
  async submitGoogleSignIn() {
    if (this.authBusy()) return;
    this.authBusy.set(true);
    this.authError.set(null);
    try {
      await this.fb.loginWithGoogle(this.onboardingUsername().trim() || undefined);
      this.markOnboardingSeen();
      this.gameState.set("menu");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "";
      this.authError.set(this.friendlyAuthError(code) || "Google sign-in failed.");
    } finally {
      this.authBusy.set(false);
    }
  }

  // ---- First-run tutorial trigger ----
  // Reuses the existing `gameState === 'tutorial'` flow + `corp_tutorial_done`
  // localStorage flag. queueFirstRunTutorial() resets the flag for NEW signups
  // so they re-experience the tutorial regardless of any past flag set on this
  // device — matches the user's "Sign Up → Splash → Tutorial → Game" intent.
  private queueFirstRunTutorial() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem("corp_tutorial_done");
      }
    } catch { /* private mode */ }
  }

  maybeShowTutorial(): boolean { return false; /* deprecated — handled by existing startGame() */ }

  async login() {
    try {
      await this.fb.loginWithGoogle(
        this.onboardingUsername().trim() || undefined,
      );
      if (this.gameState() === "onboarding") {
        this.startGame(this.gameMode());
      }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.toLowerCase().includes("domain")
      ) {
        this.addLog(
          `Login failed: Please add "${window.location.hostname}" to your Firebase Authorized Domains in the Firebase Console (Authentication > Settings > Authorized domains).`,
          "error",
        );
      } else if (
        err instanceof Error &&
        err.message.toLowerCase().includes("popup-closed")
      ) {
        this.addLog(
          "Login failed: The sign in popup was closed. Please try again.",
          "error",
        );
      } else if (
        err instanceof Error &&
        err.message.toLowerCase().includes("popup-blocked")
      ) {
        this.addLog(
          "Login failed: The sign in popup was blocked by your browser. Please allow popups for this site.",
          "error",
        );
      } else {
        this.addLog(
          "Login failed: " + (err instanceof Error ? err.message : String(err)),
          "error",
        );
      }
    }
  }

  acceptChallenge() {
    if (!this.fb.user()) {
      this.addLog("You must sign in to accept challenges.", "error");
      this.login();
      return;
    }
    const challenge = this.activeChallenge();
    if (!challenge) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.startGame(challenge.gameMode as any);
  }

  /**
   * Open the in-app account deletion confirmation modal.
   * Required by Google Play's Account Deletion policy (any app with sign-in
   * must offer deletion both inside the app AND via a public web page).
   */
  openDeleteAccountConfirm() {
    this.deleteAccountError.set(null);
    this.showDeleteAccountConfirm.set(true);
  }

  closeDeleteAccountConfirm() {
    if (this.deleteAccountBusy()) return; // don't close mid-deletion
    this.showDeleteAccountConfirm.set(false);
    this.deleteAccountError.set(null);
  }

  async confirmDeleteAccount() {
    if (this.deleteAccountBusy()) return;
    this.deleteAccountBusy.set(true);
    this.deleteAccountError.set(null);
    try {
      // 1. Capture stats BEFORE deletion (profile doc is wiped server-side
      //    as soon as deleteAccount() resolves).
      const snapshot = await this.captureExitSnapshot();

      // 2. Actually delete.
      const res = await this.fb.deleteAccount();

      if (res.success) {
        // 3. Build the satirical farewell payload.
        const payload = this.buildExitInterview(snapshot);
        this.exitInterview.set(payload);
        this.showDeleteAccountConfirm.set(false);
        this.showExitInterview.set(true);
        this.gameState.set("menu");
      } else if (res.needsReauth) {
        this.deleteAccountError.set(
          "For security, please sign out and sign in again, then retry deletion.",
        );
      } else {
        this.deleteAccountError.set(res.error || "Deletion failed. Try again.");
      }
    } finally {
      this.deleteAccountBusy.set(false);
    }
  }

  /**
   * Snapshot the user's "career" stats before we delete their profile.
   * Falls back to sensible defaults if Firestore is slow / unreachable
   * — the Exit Interview should never be the thing that blocks a deletion.
   */
  private async captureExitSnapshot(): Promise<{
    displayName: string;
    days: number;
    lifetimeSynergy: number;
    topScore: number;
    topMode: string;
    achievements: number;
  }> {
    const u = this.fb.user();
    const fallback = {
      displayName: u?.displayName || "Anonymous Drone",
      days: 1,
      lifetimeSynergy: 0,
      topScore: 0,
      topMode: "endless",
      achievements: 0,
    };
    try {
      const profile = await this.fb.getUserProfile();
      const created = u?.metadata?.creationTime
        ? new Date(u.metadata.creationTime).getTime()
        : Date.now();
      const days = Math.max(1, Math.round((Date.now() - created) / 86400000));

      // Find best score across modes.
      let topScore = 0;
      let topMode = "endless";
      const p = (profile || {}) as Record<string, unknown>;
      for (const k of Object.keys(p)) {
        if (k.startsWith("highestScore_")) {
          const v = Number(p[k] || 0);
          if (v > topScore) {
            topScore = v;
            topMode = k.replace("highestScore_", "");
          }
        }
      }
      const achievements = Array.isArray(p["achievements"])
        ? (p["achievements"] as unknown[]).length
        : 0;
      return {
        displayName:
          (typeof p["displayName"] === "string" && (p["displayName"] as string)) ||
          fallback.displayName,
        days,
        lifetimeSynergy: Number(p["lifetimeSynergy"] || 0),
        topScore,
        topMode,
        achievements,
      };
    } catch {
      return fallback;
    }
  }

  /**
   * Stitch the Exit Interview card together: pick a random satirical reason,
   * pick the right share copy, and embed a UTM-tagged re-onboarding link.
   */
  private buildExitInterview(snap: {
    displayName: string;
    days: number;
    lifetimeSynergy: number;
    topScore: number;
    topMode: string;
    achievements: number;
  }) {
    const reasons = [
      "creative differences with reality",
      "a better synergy opportunity",
      "to spend more time with their LinkedIn",
      "after a successful Performance Improvement Plan was opened against them",
      "to pursue a passion project (sleeping)",
      "to focus on their personal brand",
      "to begin an unpaid sabbatical",
      "to escape an aggressive return-to-office mandate",
      "in protest of a 4th re-org in 6 months",
      "after their calendar achieved sentience",
      "to take a step back and think about their journey",
    ];
    const titlePool = [
      "Senior Vice Vibes Officer",
      "Director of Synergy Compliance",
      "Chief Disengagement Architect",
      "Principal Email-Triage Strategist",
      "Head of Performative Productivity",
      "VP of Empty Calendar Holds",
    ];
    const reason = reasons[Math.floor(Math.random() * reasons.length)];
    const title = titlePool[Math.floor(Math.random() * titlePool.length)];

    const url =
      (typeof window !== "undefined"
        ? window.location.origin
        : "https://corporateladder.xyz") + "?utm_source=exit_interview";

    // ~270 chars — fits in a tweet AND looks great pasted into LinkedIn.
    const shareText =
      `📰 RESIGNATION ANNOUNCEMENT\n\n` +
      `After ${snap.days} day${snap.days === 1 ? "" : "s"} at Corporate Ladder Inc., ${snap.displayName} ` +
      `(${title}) has voluntarily resigned, citing "${reason}".\n\n` +
      `Career stats: ${snap.lifetimeSynergy.toLocaleString()} lifetime synergy · ` +
      `${snap.topScore.toLocaleString()} peak ${snap.topMode} · ${snap.achievements} achievements unlocked.\n\n` +
      `They will be missed by absolutely no one.`;

    return {
      displayName: snap.displayName,
      days: snap.days,
      title,
      lifetimeSynergy: snap.lifetimeSynergy,
      topScore: snap.topScore,
      topMode: snap.topMode,
      achievements: snap.achievements,
      reason,
      shareText,
      shareUrl: url,
    };
  }

  closeExitInterview() {
    this.showExitInterview.set(false);
    this.exitInterview.set(null);
  }

  /** One-tap share to X/Twitter intent. */
  shareExitToTwitter() {
    const e = this.exitInterview();
    if (!e) return;
    const text = encodeURIComponent(`${e.shareText}\n\n${e.shareUrl}`);
    if (typeof window !== "undefined") {
      window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
    }
  }

  /** Copy the farewell to clipboard so the user can paste on LinkedIn / Slack / wherever. */
  async shareExitToLinkedIn() {
    const e = this.exitInterview();
    if (!e) return;
    const full = `${e.shareText}\n\n${e.shareUrl}`;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(full);
        this.addLog("Resignation copy copied. Paste it as your next LinkedIn post.", "success");
      }
    } catch {
      this.addLog("Couldn't copy automatically — long-press the card to copy manually.", "warning");
    }
    if (typeof window !== "undefined") {
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(e.shareUrl)}`,
        "_blank",
      );
    }
  }

  /** Native share sheet (Capacitor on Android, Web Share API in browsers). */
  async shareExitNative() {
    const e = this.exitInterview();
    if (!e || this.exitShareBusy()) return;
    this.exitShareBusy.set(true);
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import("@capacitor/share");
        await Share.share({
          title: "Resignation Announcement",
          text: e.shareText,
          url: e.shareUrl,
          dialogTitle: "Share your exit interview",
        });
      } else if (
        typeof navigator !== "undefined" &&
        (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share
      ) {
        await (navigator as Navigator & {
          share: (d: ShareData) => Promise<void>;
        }).share({
          title: "Resignation Announcement",
          text: e.shareText,
          url: e.shareUrl,
        });
      } else {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(`${e.shareText}\n\n${e.shareUrl}`);
          this.addLog("Resignation copied to clipboard.", "success");
        }
      }
    } catch (err) {
      console.warn("Exit share failed", err);
    } finally {
      this.exitShareBusy.set(false);
    }
  }

  async copyExitInterview() {
    const e = this.exitInterview();
    if (!e) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(`${e.shareText}\n\n${e.shareUrl}`);
        this.addLog("Resignation copied. Paste anywhere petty.", "success");
      }
    } catch {
      this.addLog("Clipboard blocked — select the text and copy manually.", "warning");
    }
  }

  declineChallenge() {
    this.activeChallenge.set(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("challenge");
      window.history.replaceState({}, "", url.toString());
    }
  }

  async generateChallengeLink() {
    const id = await this.fb.createChallenge(this.synergy(), this.gameMode());
    if (id && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("challenge", id);
      this.challengeShareLink.set(url.toString());
    }
  }

  copyChallengeLink(inputElement?: HTMLInputElement) {
    const link = this.challengeShareLink();
    if (!link) return;
    const roastText = `🚨 *URGENT HR NOTICE: PERFORMANCE IMPROVEMENT PLAN* 🚨\n\nI have placed you on an official Performance Improvement Plan. To retain your employment and prove your cultural fit, you must beat my Synergy Output of ${this.synergy()}.\n\n*Execute your deliverables here:* ${link}`;
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      navigator.clipboard.writeText
    ) {
      navigator.clipboard
        .writeText(roastText)
        .then(() => {
          this.addLog("P.I.P. Link & Message copied!", "success");
        })
        .catch(() => {
          this.fallbackCopy(link, inputElement);
        });
    } else {
      this.fallbackCopy(link, inputElement);
    }
  }

  fallbackCopy(text: string, inputElement?: HTMLInputElement) {
    if (inputElement) {
      inputElement.select();
      try {
        document.execCommand("copy");
        this.addLog(
          "Link copied! (Manual copy needed for full message)",
          "success",
        );
      } catch {
        this.addLog("Please copy the link manually.", "warning");
      }
    } else {
      this.addLog(
        "Copy API unavailable. Please select and copy manually.",
        "warning",
      );
    }
  }

  startGame(mode = "endless") {
    if (!this.fb.user() && this.gameState() !== "onboarding") {
      this.gameMode.set(mode);
      this.gameState.set("onboarding");
      return;
    }

    this.gameMode.set(mode);
    if (
      typeof window !== "undefined" &&
      !localStorage.getItem("corp_tutorial_done")
    ) {
      this.tutorialStep.set(1);
      this.gameState.set("tutorial");
      return;
    }
    this.actuallyStartGame();
  }

  nextTutorialStep() {
    if (this.tutorialStep() < 3) {
      this.tutorialStep.update((s) => s + 1);
    } else {
      this.finishTutorial();
    }
  }

  finishTutorial() {
    if (typeof window !== "undefined")
      localStorage.setItem("corp_tutorial_done", "true");
    this.actuallyStartGame();
  }

  // --- MULTIPLAYER LOBBY METHODS ---
  hostSelectedMode = signal<string>("endless");

  async hostRoom() {
    if (!this.fb.user()) {
      this.addLog("Sign in to host multiplayer rooms.", "error");
      return;
    }
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const success = await this.fb.createRoom(code, this.hostSelectedMode());
    if (success) {
      this.joinCodeInput.set(code);
      this.gameState.set("multiplayer_lobby");
      this.listenToRoom(code);
    }
  }

  async joinRoom() {
    if (!this.fb.user()) {
      this.addLog("Sign in to join multiplayer rooms.", "error");
      return;
    }
    const code = this.joinCodeInput().toUpperCase();
    if (!code) return;
    const success = await this.fb.joinRoom(code);
    if (success) {
      this.gameState.set("multiplayer_lobby");
      this.listenToRoom(code);
    } else {
      this.addLog("Room not found or could not join.", "error");
    }
  }

  processedSabotages = new Set<string>();
  isFrozen = false;
  freezeTimer = 0;
  sabotageText = "";

  listenToRoom(roomId: string) {
    if (this.roomSub) this.roomSub();
    this.roomSub = onSnapshot(doc(db, "multiplayer_rooms", roomId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as MultiplayerRoom;
        data.roomId = snap.id;
        this.activeRoom.set(data);

        // Sabotage processing
        if (data.sabotages && this.gameState() === "playing") {
          const myUid = this.fb.user()?.uid;
          for (const [sabId, sab] of Object.entries(data.sabotages)) {
            if (sab.targetId === myUid && !this.processedSabotages.has(sabId)) {
              this.processedSabotages.add(sabId);
              // Only trigger if it happened recently (within last 30s)
              if (Date.now() - sab.timestamp < 30000) {
                this.triggerSabotage(sab.type, sab.senderName);
              }
            }
          }
        }

        // If host starts the game, jump in!
        if (
          data.status === "playing" &&
          this.gameState() === "multiplayer_lobby"
        ) {
          this.fb.updateRoomPlayer(roomId, 0, "playing");
          this.processedSabotages.clear(); // Reset on start
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.startGame(data.gameMode as any);
        }
      }
    });
  }

  executeSabotage(
    targetUid: string,
    type: "email_wall" | "freeze",
    cost: number,
  ) {
    if (this.synergy() < cost) return;
    const room = this.activeRoom();
    if (!room) return;

    this.synergy.update((s) => s - cost);
    this.fb.sendSabotage(room.roomId, targetUid, type);

    // Visual feedback for the sender
    const typeName = type === "email_wall" ? "Email Wall" : "Surprise Sync";
    this.spawnFloatingText(
      `SENT SABOTAGE! (-${cost})`,
      "#D946EF",
      this.player.x,
      this.player.y - 40,
    );
    this.addLog(`Sabotaged opponent with ${typeName}!`, "warning");
  }

  triggerSabotage(type: string, senderName: string) {
    this.spawnFloatingText(
      `SABOTAGE FROM ${senderName.toUpperCase()}!`,
      "#EF4444",
      400,
      300,
    );
    this.addLog(`You were sabotaged by ${senderName}!`, "error");

    if (type === "email_wall") {
      this.screenShake = 15;
      // Spawn 5 fast urgent emails grouped tightly
      for (let i = 0; i < 5; i++) {
        this.obstacles.push({
          x: 1000 + i * 120,
          y: 500,
          width: 30,
          height: 30,
          speedModifier: 1.8,
          isHurdle: true,
          collected: false,
          action: {
            type: "urgentEmail",
            icon: "📧",
            color: "#EF4444",
            text: "URGENT EMAIL WALL!",
          },
        });
      }
    } else if (type === "freeze") {
      this.screenShake = 20;
      this.isFrozen = true;
      this.freezeTimer = 180; // ~3 seconds at 60fps
      this.sabotageText = `SURPRISE SYNC WITH ${senderName.toUpperCase()}!`;
    }
  }

  leaveRoom() {
    if (this.roomSub) {
      this.roomSub();
      this.roomSub = null;
    }
    this.activeRoom.set(null);
    this.gameState.set("menu");
  }

  startHostedRoom() {
    const rm = this.activeRoom();
    if (rm && rm.hostId === this.fb.user()?.uid) {
      this.fb.startRoomMatch(rm.roomId);
    }
  }

  actuallyStartGame() {
    this.gameState.set("playing");
    this.isPaused = false;
    this.synergy.set(0);
    this.busyness.set(0);
    this.teamMorale.set(100);
    this.comboMeter = 0;
    this.runStats = {};
    this.runStartMs = performance.now();
    this.ghostBeaten.set(false);
    this.postToWatercoolerDone.set(false);

    // Tick the daily streak (best-effort, async)
    if (this.fb.user()) {
      this.fb.tickStreak().then(({ count, rolled }) => {
        this.streakCount.set(count);
        if (rolled && count >= 3) {
          this.streakBoosted.set(true);
          this.addLog(`🔥 Day ${count} streak! Synergy boost +${Math.round((this.streakMultiplier - 1) * 100)}% active.`, 'success');
        }
      });
      // Pre-fetch yesterday's #1 for ghost race
      if (this.ghostEnabled()) {
        this.fb.getYesterdayTopScore(this.gameMode()).then((g) => this.ghostScore.set(g));
      } else {
        this.ghostScore.set(null);
      }
      // Refund any of my own expired bounties (lazy GC)
      this.fb.refundExpiredBounties();
    }

    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }

    this.trackAnalytics("game_start", { game_mode: this.gameMode() });

    const m = this.gameMode();
    if (m === "takeover") {
      this.baseSpeed = 7;
      this.addLog("Hostile Takeover Mode! Excessive speed.", "warning");
    } else if (m === "quiet") {
      this.baseSpeed = 3;
      this.addLog("Quiet Quitting Mode. Keeping head down.", "info");
    } else if (m === "hardcore") {
      this.baseSpeed = 8;
      this.addLog("Hardcore Mode. No margin for error.", "error");
    } else if (m === "enterprise") {
      this.baseSpeed = 2; // slow bureaucracy
      this.addLog("Enterprise Mode. Extreme bureaucracy incoming.", "info");
    } else if (m === "startup") {
      this.baseSpeed = 6;
      this.addLog("Startup Mode. Time to break things.", "warning");
    } else if (m === "remote" || m === "outsourced") {
      this.baseSpeed = 3.5;
      this.addLog(m + " mode activated. Network lag simulated.", "info");
    } else {
      this.baseSpeed = 5;
      this.addLog(`Started a new run in ${m} mode.`, "info");
    }

    this.emailsSynergized = 0;
    this.doersFired = 0;
    this.promotionsClaimed.clear();
    this.championshipTimeLeft.set(120);
    this.player.y = this.groundLevel - this.player.height;
    this.player.vy = 0;
    this.obstacles = [];
    this.blocks = [];
    this.projectiles = [];
    this.floatingTexts = [];
    this.firedEffects = [];
    this.synergizeEffects = [];
    this.confetti = [];
    this.logs.set([]);
    this.generateQuests();
    this.lastTime = performance.now();
  }

  resumeFromRequireLogin() {
    this.gameState.set("playing");
    this.isPaused = false;
    this.lastTime = performance.now();
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
  }

  async handleRequireLogin() {
    await this.login();
    if (this.fb.user()) {
      this.resumeFromRequireLogin();
    }
  }

  resumeFromStory() {
    if (this.promotionsClaimed.size >= 3 && !this.fb.user()) {
      this.gameState.set("require_login");
      return;
    }

    this.gameState.set("playing");
    this.isPaused = false;
    this.lastTime = performance.now();
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
  }

  generateQuests() {
    const pool = [
      {
        type: "fire",
        desc: "Fire Doers",
        target: 3,
        progress: 0,
        reward: 500,
        completed: false,
      },
      {
        type: "fire_many",
        desc: "Clean House",
        target: 10,
        progress: 0,
        reward: 2000,
        completed: false,
      },
      {
        type: "fire_cause",
        desc: "Fire without cause",
        target: 2,
        progress: 0,
        reward: 500,
        completed: false,
      },
      {
        type: "meeting",
        desc: "Attend pointless meeting",
        target: 2,
        progress: 0,
        reward: 250,
        completed: false,
      },
      {
        type: "coffee",
        desc: "Drink Coffees",
        target: 2,
        progress: 0,
        reward: 250,
        completed: false,
      },
      {
        type: "coffee_addict",
        desc: "Coffee Addict",
        target: 8,
        progress: 0,
        reward: 1000,
        completed: false,
      },
      {
        type: "emails",
        desc: "Clear Urgent Emails",
        target: 5,
        progress: 0,
        reward: 300,
        completed: false,
      },
      {
        type: "inbox_zero",
        desc: "Inbox Zero Pursuit",
        target: 20,
        progress: 0,
        reward: 2500,
        completed: false,
      },
      {
        type: "jump",
        desc: "Jump over hurdles",
        target: 15,
        progress: 0,
        reward: 150,
        completed: false,
      },
      {
        type: "jump_high",
        desc: "Acrobatic Manager",
        target: 50,
        progress: 0,
        reward: 600,
        completed: false,
      },
      {
        type: "kissup",
        desc: "Bootlick Management",
        target: 3,
        progress: 0,
        reward: 800,
        completed: false,
      },
      {
        type: "deck",
        desc: "Stare at Slide Deck",
        target: 4,
        progress: 0,
        reward: 350,
        completed: false,
      },
      {
        type: "network",
        desc: "Networking Lunch",
        target: 2,
        progress: 0,
        reward: 400,
        completed: false,
      },
      {
        type: "empathy",
        desc: "Offer Fake Empathy",
        target: 3,
        progress: 0,
        reward: 600,
        completed: false,
      },
      {
        type: "expenses",
        desc: "Approve Expenses",
        target: 5,
        progress: 0,
        reward: 750,
        completed: false,
      },
      {
        type: "workshop",
        desc: "Synergy Workshop",
        target: 2,
        progress: 0,
        reward: 600,
        completed: false,
      },
      {
        type: "brainstorm",
        desc: "Brainstorm Session",
        target: 3,
        progress: 0,
        reward: 500,
        completed: false,
      },
      {
        type: "delegate",
        desc: "Delegate Tasks",
        target: 5,
        progress: 0,
        reward: 900,
        completed: false,
      },
      {
        type: "mentor",
        desc: "Mentoring Session",
        target: 1,
        progress: 0,
        reward: 300,
        completed: false,
      },
      {
        type: "collab",
        desc: "Fake Collaboration",
        target: 4,
        progress: 0,
        reward: 550,
        completed: false,
      },
      {
        type: "gaslight",
        desc: "Gaslight Team",
        target: 1,
        progress: 0,
        reward: 1000,
        completed: false,
      },
      {
        type: "gaslight_pro",
        desc: "Master Gaslighter",
        target: 3,
        progress: 0,
        reward: 4000,
        completed: false,
      },
      {
        type: "ping",
        desc: "Ping for Thoughts",
        target: 3,
        progress: 0,
        reward: 400,
        completed: false,
      },
      {
        type: "circle_back",
        desc: "Circle Back later",
        target: 4,
        progress: 0,
        reward: 500,
        completed: false,
      },
      {
        type: "take_credit",
        desc: "Take Credit for work",
        target: 2,
        progress: 0,
        reward: 800,
        completed: false,
      },
      {
        type: "vague",
        desc: "Give Vague Directions",
        target: 3,
        progress: 0,
        reward: 450,
        completed: false,
      },
    ];

    // Shuffle pool safely
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Take first 3
    this.quests.set(pool.slice(0, 3));
  }

  updateQuest(type: string, amount = 1) {
    this.quests.update((qs) => {
      let updated = false;
      const nextQs = qs.map((q) => {
        if (q.type === type && !q.completed) {
          q.progress += amount;
          if (q.progress >= q.target) {
            q.progress = q.target;
            q.completed = true;
            const reward = this.hasSkill("viral_referral")
              ? q.reward * 2
              : q.reward;
            this.synergy.update((s) => s + reward);
            this.spawnFloatingText(
              "QUEST COMPLETE!",
              "#EAB308",
              this.player.x,
              this.player.y - 40,
            );
            this.addLog(
              `Challenge completed: ${q.desc}. Bonus Synergy +${reward}`,
              "success",
            );
          }
          updated = true;
        }
        return q;
      });
      return updated ? nextQs : qs;
    });
  }

  quickCoffeeBreak() {
    this.runStats["quickCoffeeBreak"] =
      (this.runStats["quickCoffeeBreak"] || 0) + 1;
    if (this.coffeeBoostTimer === 0) {
      this.addLog(
        "Took a quick coffee break! Energy surged for " +
          (this.hasSkill("coffee_boost") ? "10" : "5") +
          " seconds.",
        "success",
      );
      this.achievements.track("coffee");
      this.updateQuest("coffee");
      this.updateQuest("coffee_addict");
      this.triggerHaptic(20);
    }
    this.coffeeBoostTimer = this.hasSkill("coffee_boost") ? 600 : 300; // 5 seconds vs 10 seconds at 60fps
    this.addCombo(10);
  }

  fakeEmpathy() {
    this.runStats["fakeEmpathy"] = (this.runStats["fakeEmpathy"] || 0) + 1;
    this.teamMorale.update((m) => Math.min(100, m + 10));
    this.busyness.update((b) => Math.min(100, b + 5));
    this.addLog(
      "Offered fake empathy to a struggling team member. They feel heard, you look like a great leader.",
      "success",
    );
  }

  fakeCrisis() {
    this.runStats["fakeCrisis"] = (this.runStats["fakeCrisis"] || 0) + 1;
    this.busyness.update((b) => Math.min(100, b + 10));
    this.synergy.update((s) => s + 20 * this.comboMultiplier);
    this.teamMorale.update((m) => Math.max(0, m - 15));
    this.addCombo(20);
    this.addLog(
      "Fabricated an 'All Hands on Deck' crisis. Everyone stressed, but synergy spiked!",
      "warning",
    );
  }

  sabotageCoworker() {
    this.runStats["sabotageCoworker"] =
      (this.runStats["sabotageCoworker"] || 0) + 1;
    this.synergy.update((s) => s + 30 * this.comboMultiplier);
    this.teamMorale.update((m) => Math.max(0, m - 20));
    this.addCombo(30);
    this.addLog(
      "Threw a peer under the bus during QBR. Brilliant strategy, terrible ethics.",
      "success",
    );
  }

  attendMandatoryFun() {
    this.runStats["attendMandatoryFun"] =
      (this.runStats["attendMandatoryFun"] || 0) + 1;
    this.teamMorale.update((m) => Math.min(100, m + 20));
    this.busyness.update((b) => Math.max(0, b - 15));
    this.synergy.update((s) => Math.max(0, s - 10));
    this.addLog(
      "Attended Mandatory Fun Friday. Smiled through the pain.",
      "info",
    );
  }

  synergyBoost() {
    this.synergyBoostTimer.set(600); // 10 seconds of 2x
    this.addLog(
      "Picked up SYNERGY BOOST! 2x Combo Multiplier active!",
      "success",
    );
    this.addCombo(20);
  }

  fastTrack() {
    this.synergy.update((s) => s + 500);
    this.addLog(
      "FAST TRACK PROMOTION INITIATIVE! Massive Synergy gain!",
      "success",
    );
    this.addCombo(50);
  }

  approveExpenseReport() {
    this.runStats["approveExpenseReport"] =
      (this.runStats["approveExpenseReport"] || 0) + 1;
    this.synergy.update((s) => s + 10 * this.comboMultiplier);
    this.teamMorale.update((m) => Math.max(0, m - 15));
    this.addCombo(20);
    this.addLog(
      "Approved an expense report without reading it. Synergy increased due to your 'trust' in the team.",
      "info",
    );
  }

  togglePause() {
    if (
      this.gameState() === "gameover" ||
      this.gameState() === "menu" ||
      this.gameState() === "story"
    )
      return;
    this.isPaused = !this.isPaused;
    if (!this.isPaused) {
      this.lastTime = performance.now();
    }
  }

  retire() {
    const baseScore = this.synergy();
    const runScore = Math.floor(baseScore * this.streakMultiplier);
    if (runScore > baseScore) {
      this.addLog(`🔥 Streak bonus: +${runScore - baseScore} synergy`, 'success');
    }
    this.totalSynergy.update((s) => {
      const next = s + runScore;
      if (typeof window !== "undefined")
        localStorage.setItem("corp_meta_synergy", next.toString());
      return next;
    });
    this.lifetimeEarnedSynergy.update((s) => {
      const next = s + runScore;
      if (typeof window !== "undefined")
        localStorage.setItem("corp_meta_lifetime", next.toString());
      return next;
    });
    this.gameState.set("gameover");
    this.isPaused = true;
    this.gameOverReason =
      "Voluntarily Retired to protect your Golden Parachute!";
    this.generateLinkedInPost();
    this.fb.submitScore(this.synergy(), this.gameMode(), this.lifetimeTitle());
    this.fb.syncMeta(
      this.lifetimeEarnedSynergy(),
      this.unlockedSkills(),
      this.achievements.unlocked(),
    );
    this.challengeShareLink.set(null); // Reset for next game
    this.tryClaimBounties();

    this.trackAnalytics("game_over", {
      reason: "retired",
      synergy: runScore,
      mode: this.gameMode(),
      title: this.currentTitle(),
    });

    this.achievements.checkSynergy(this.lifetimeEarnedSynergy());
    this.achievements.checkGameMode(this.gameMode());

    if (this.activeRoom()) {
      this.fb.updateRoomPlayer(
        this.activeRoom()!.roomId,
        this.synergy(),
        "gameover",
      );
    }
  }

  triggerFired(
    reason = "FIRED! 🛑 Caught doing ACTUAL WORK! Executives don't do real work.",
  ) {
    const baseScore = this.synergy();
    const runScore = Math.floor(baseScore * this.streakMultiplier);
    if (runScore > baseScore) {
      this.addLog(`🔥 Streak bonus: +${runScore - baseScore} synergy`, 'success');
    }
    this.totalSynergy.update((s) => {
      const next = s + runScore;
      if (typeof window !== "undefined")
        localStorage.setItem("corp_meta_synergy", next.toString());
      return next;
    });
    this.lifetimeEarnedSynergy.update((s) => {
      const next = s + runScore;
      if (typeof window !== "undefined")
        localStorage.setItem("corp_meta_lifetime", next.toString());
      return next;
    });
    this.gameState.set("gameover");
    this.isPaused = true;
    this.gameOverReason = reason;
    this.screenShake += 30; // Massive shake
    this.generateLinkedInPost();
    this.fb.submitScore(this.synergy(), this.gameMode(), this.lifetimeTitle());
    this.fb.syncMeta(
      this.lifetimeEarnedSynergy(),
      this.unlockedSkills(),
      this.achievements.unlocked(),
    );
    this.challengeShareLink.set(null); // Reset for next game
    this.tryClaimBounties();

    this.trackAnalytics("game_over", {
      reason: "fired",
      details: reason,
      synergy: runScore,
      mode: this.gameMode(),
      title: this.currentTitle(),
    });

    this.achievements.checkSynergy(this.lifetimeEarnedSynergy());
    this.achievements.checkGameMode(this.gameMode());

    if (this.activeRoom()) {
      this.fb.updateRoomPlayer(
        this.activeRoom()!.roomId,
        this.synergy(),
        "gameover",
      );
    }
  }

  runStats: Record<string, number> = {};

  slackPost = "";

  generateLinkedInPost() {
    const title = this.currentTitle();
    const syn = this.synergy();
    let statsStr = "";
    let slackStatsStr = "";
    const actionNames: Record<string, string> = {
      stareAtDeck: "slide decks stared at",
      circleBack: "times circled back",
      pingThoughts: 'emails forwarded with "Thoughts?"',
      takeCredit: "times stealing credit",
      fakeCollaboration: "fake collaborations",
      scheduleUselessMeeting: "useless meetings scheduled",
      giveVagueDirection: "vague directions given",
      networkingLunch: "networking lunches",
      mentoringSession: "narcissistic mentoring sessions",
      delegateTasks: "tasks delegated",
      synergyWorkshop: "synergy workshops",
      brainstormingSession: "pointless brainstorms",
      quickCoffeeBreak: "coffee breaks",
      fakeEmpathy: "fake empathies offered",
      approveExpenseReport: "expense reports approved blindly",
    };

    const taken: string[] = [];
    for (const [key, label] of Object.entries(actionNames)) {
      if (this.runStats[key] && this.runStats[key] > 0) {
        taken.push(`${this.runStats[key]} ${label}`);
      }
    }
    if (taken.length > 0) {
      statsStr = ` \n\nMy actionable deliverables included:\n- ${taken.join("\n- ")}`;
      slackStatsStr = taken.map((t) => `> • ${t}`).join("\n");
    }

    let modeText = "";
    if (this.gameMode() === "takeover") modeText = " [Hostile Takeover]";
    if (this.gameMode() === "championship") modeText = " [Q3 Sprint]";
    if (this.gameMode() === "quiet") modeText = " [Quiet Quitting]";

    // Generate a fake 'Wordle-like' emoji chart for the run to make it viral
    let scoreEmojiStr = "";
    const blocks = ["🟦", "🟪", "🟩", "🟨", "🏢", "📉"];
    for (let i = 0; i < 3; i++) {
      scoreEmojiStr += "\n>";
      for (let j = 0; j < 5; j++) {
        scoreEmojiStr += blocks[Math.floor(Math.random() * blocks.length)];
      }
    }

    this.linkedInPost = `🚀 Thrilled to announce my transitioning phase! Played Corporate Ladder${modeText} and reached [${title}] with ${syn} Synergy. I boldly 'synergized' ${this.emailsSynergized} Urgent Emails and fired ${this.doersFired} actual doers to protect company culture.${statsStr}\n\nCan you climb the corporate ladder faster? 📈💼 #ThoughtLeader #Grindset #CorporateRun`;

    this.slackPost = `:chart_with_upwards_trend: *Corporate Ladder${modeText}*
*Title:* ${title}
*Synergy Delivered:* ${syn}
*Emails Handled:* ${this.emailsSynergized} | *Doers Terminated:* ${this.doersFired}
${scoreEmojiStr}
${slackStatsStr ? "\n*Key Deliverables:*\n" + slackStatsStr : ""}
\nI challenge you to beat my performance metrics directly. See you at the top. :handshake:`;
  }

  hallOfFame = signal<import('./firebase.service').LeaderboardEntry[]>([]);
  showSeasonOnly = signal<boolean>(true);

  async openLeaderboard(mode = "endless") {
    this.firebaseInfoMode.set(mode);
    this.leaderboards.set([]);
    this.hallOfFame.set([]);
    this.gameState.set("leaderboard");
    if (mode === "global") {
      const data = await this.fb.getGlobalLeaderboard();
      this.leaderboards.set(data);
    } else {
      // Lazy archive last season + load
      this.fb.archiveLastSeasonIfNeeded(mode);
      const data = this.showSeasonOnly()
        ? await this.fb.getCurrentSeasonLeaderboard(mode)
        : await this.fb.getLeaderboard(mode);
      this.leaderboards.set(data);
      const { lastWeekIsoId } = await import('./firebase.service');
      const hof = await this.fb.getSeasonHallOfFame(mode, lastWeekIsoId());
      this.hallOfFame.set(hof);
    }
  }

  openAccount() {
    this.gameState.set("account");
    this.loadUserProfile();
  }

  userProfile = signal<{
    endless: number;
    champion: number;
    takeover: number;
    quiet: number;
    synergy: number;
    skills: number;
    displayName: string;
    avatarId: string;
  } | null>(null);

  isEditingHandle = signal(false);
  editHandleValue = signal("");

  AVAILABLE_AVATARS = [
    { id: "drone_1", emoji: "🤖" },
    { id: "drone_2", emoji: "👽" },
    { id: "drone_3", emoji: "🥷" },
    { id: "drone_4", emoji: "🕵️" },
    { id: "drone_5", emoji: "🧛" },
    { id: "drone_6", emoji: "🧜‍♀️" },
    { id: "drone_7", emoji: "🧟" },
    { id: "drone_8", emoji: "🧞" },
  ];

  getAvatarEmoji() {
    const id = this.userProfile()?.avatarId;
    if (!id) return this.AVAILABLE_AVATARS[0].emoji;
    const f = this.AVAILABLE_AVATARS.find((a) => a.id === id);
    return f ? f.emoji : this.AVAILABLE_AVATARS[0].emoji;
  }

  async loadUserProfile() {
    const p = await this.fb.getUserProfile();
    if (p) {
      // ---- Reconcile local (offline) progress with server.
      // Take MAX of each metric so local-only progress isn't wiped on first login.
      let localLifetime = 0;
      let localSkills: string[] = [];
      let localAch: string[] = [];
      if (typeof window !== "undefined") {
        const lf = localStorage.getItem("corp_meta_lifetime") ?? localStorage.getItem("corp_meta_synergy");
        if (lf) localLifetime = parseInt(lf, 10) || 0;
        try {
          localSkills = JSON.parse(localStorage.getItem("corp_skills") || "[]");
        } catch { localSkills = []; }
        try {
          localAch = JSON.parse(localStorage.getItem("corp_achievements") || "[]");
        } catch { localAch = []; }
      }

      const serverLifetime = p.lifetimeSynergy || 0;
      const mergedLifetime = Math.max(localLifetime, serverLifetime);
      const serverSkills = p.unlockedSkills || [];
      const mergedSkills = Array.from(new Set([...serverSkills, ...localSkills]));
      const serverAch = p.achievements || [];
      const mergedAch = Array.from(new Set([...serverAch, ...localAch]));

      // Per-mode high scores: max of local in-memory vs server
      const localScores = this.userProfile();
      const mergedHi = {
        endless: Math.max(p.highestScore_endless || 0, localScores?.endless || 0),
        champion: Math.max(p.highestScore_championship || 0, localScores?.champion || 0),
        takeover: Math.max(p.highestScore_takeover || 0, localScores?.takeover || 0),
        quiet: Math.max(p.highestScore_quiet || 0, localScores?.quiet || 0),
      };

      this.userProfile.set({
        endless: mergedHi.endless,
        champion: mergedHi.champion,
        takeover: mergedHi.takeover,
        quiet: mergedHi.quiet,
        synergy: mergedLifetime,
        skills: mergedSkills.length,
        displayName: p.displayName || "Anonymous Drone",
        avatarId: p.avatarId || "drone_1",
      });
      this.streakCount.set(p.streakCount || 0);

      // Apply merged values everywhere
      this.totalSynergy.set(mergedLifetime);
      this.lifetimeEarnedSynergy.set(mergedLifetime);
      if (typeof window !== "undefined") {
        localStorage.setItem("corp_meta_synergy", mergedLifetime.toString());
        localStorage.setItem("corp_meta_lifetime", mergedLifetime.toString());
        localStorage.setItem("corp_skills", JSON.stringify(mergedSkills));
      }
      this.unlockedSkills.set(mergedSkills);
      this.achievements.initUnlocked(mergedAch);

      // If server was behind, push the merged values up so other devices see them too
      const serverIsBehind =
        mergedLifetime > serverLifetime ||
        mergedSkills.length > serverSkills.length ||
        mergedAch.length > serverAch.length ||
        mergedHi.endless > (p.highestScore_endless || 0) ||
        mergedHi.champion > (p.highestScore_championship || 0) ||
        mergedHi.takeover > (p.highestScore_takeover || 0) ||
        mergedHi.quiet > (p.highestScore_quiet || 0);
      if (serverIsBehind) {
        this.fb.syncMeta(mergedLifetime, mergedSkills, mergedAch);
        // Push high scores via submitScore for any mode the local exceeded server in
        if (mergedHi.endless > (p.highestScore_endless || 0)) {
          this.fb.submitScore(mergedHi.endless, 'endless', this.lifetimeTitle());
        }
        if (mergedHi.champion > (p.highestScore_championship || 0)) {
          this.fb.submitScore(mergedHi.champion, 'championship', this.lifetimeTitle());
        }
        if (mergedHi.takeover > (p.highestScore_takeover || 0)) {
          this.fb.submitScore(mergedHi.takeover, 'takeover', this.lifetimeTitle());
        }
        if (mergedHi.quiet > (p.highestScore_quiet || 0)) {
          this.fb.submitScore(mergedHi.quiet, 'quiet', this.lifetimeTitle());
        }
        this.addLog(`☁️ Synced offline progress: ${mergedLifetime} synergy.`, 'success');
      }

      this.editHandleValue.set(p.displayName || "Anonymous Drone");
    }
  }

  async saveHandle() {
    const newHandle = this.editHandleValue().trim();
    if (!newHandle) return;
    if (this.fb.user()) {
      try {
        await this.fb.updateHandle(newHandle);
        await this.loadUserProfile();
        this.isEditingHandle.set(false);
      } catch {
        this.addLog("Failed to update handle", "error");
      }
    }
  }

  async setAvatar(avatarId: string) {
    if (this.fb.user()) {
      try {
        await this.fb.updateAvatar(avatarId);
        await this.loadUserProfile();
      } catch {
        this.addLog("Failed to update avatar", "error");
      }
    }
  }

  shareToTwitter() {
    const url = window.location.origin;
    const text = encodeURIComponent(
      this.linkedInPost +
        `\n\nPlay Corporate Ladder Simulator now!\n${url}\nBuilt by @gourav_kondadadi`,
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  }

  // ---- Native share (Capacitor + Web Share API fallback) ----
  async shareNative() {
    if (this.shareInProgress()) return;
    this.shareInProgress.set(true);
    const score = this.synergy();
    const title = this.currentTitle();
    const url = (typeof window !== 'undefined' ? window.location.origin : 'https://corporate-ladder.web.app');
    const text = `📈 I just climbed to ${title.toUpperCase()} with ${score} synergy on Corporate Ladder Simulator. Think you can beat me?`;
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import('@capacitor/share');
        await Share.share({ title: 'Corporate Ladder', text, url, dialogTitle: 'Share your humiliation' });
      } else if (typeof navigator !== 'undefined' && (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share) {
        await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({ title: 'Corporate Ladder', text, url });
      } else {
        // Final fallback: copy to clipboard
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(`${text}\n${url}`);
          this.addLog('Brag copied to clipboard.', 'success');
        }
      }
    } catch (err) {
      console.warn('Share failed', err);
    } finally {
      this.shareInProgress.set(false);
    }
  }

  // ---- Bounties ----
  async loadActiveBounties() {
    const bs = await this.fb.getActiveBounties();
    this.activeBounties.set(bs);
  }

  async createBountyFromDraft() {
    const draft = this.bountyDraft();
    if (!this.fb.user()) {
      this.addLog('Sign in to post a bounty.', 'error');
      return;
    }
    const res = await this.fb.createBounty(
      draft.mode, draft.target, draft.reward, draft.hours,
      this.lifetimeEarnedSynergy(),
    );
    if (res.ok) {
      this.addLog(`🎯 Bounty posted: ${draft.reward} SYN for ${draft.target} in ${draft.mode}`, 'success');
      this.lifetimeEarnedSynergy.update((s) => Math.max(0, s - draft.reward));
      this.showBountyCreator.set(false);
      await this.loadActiveBounties();
    } else {
      this.addLog(`Bounty failed: ${res.reason}`, 'error');
    }
  }

  bountyTimeLeft(b: import('./firebase.service').Bounty): string {
    const ms = b.expiresAt - Date.now();
    if (ms <= 0) return 'expired';
    const h = Math.floor(ms / 3600_000);
    if (h < 1) return `${Math.floor(ms / 60_000)}m`;
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  async tryClaimBounties() {
    if (!this.fb.user()) return;
    const score = this.synergy();
    if (score <= 0) return;
    const res = await this.fb.claimBountiesForScore(this.gameMode(), score);
    if (res.total > 0) {
      this.lifetimeEarnedSynergy.update((s) => s + res.total);
      this.totalSynergy.update((s) => s + res.total);
      const names = res.claimed.map((b) => b.creatorName).join(', ');
      this.bountyClaimedAlert.set(`🏆 Claimed ${res.total} SYN bounty from ${names}!`);
      this.addLog(`🏆 You claimed ${res.claimed.length} bounty: +${res.total} SYN`, 'success');
    }
  }

  // ---- Ghost race ----
  toggleGhost() {
    this.ghostEnabled.update((v) => !v);
  }

  /** Called once per frame from the game loop to detect first ghost-beat. */
  checkGhostBeat() {
    const g = this.ghostScore();
    if (!g || this.ghostBeaten()) return;
    if (this.synergy() > g.score) {
      this.ghostBeaten.set(true);
      this.addLog(`🥇 Beat ${g.name}'s ${g.score}! Yesterday's #1 has been dethroned.`, 'success');
      this.createConfetti();
    }
  }

  async loadWatercoolerChannels() {
    const channels = await this.fb.getWatercoolerChannels();
    this.watercoolerChannels.set(channels);
  }

  async loadWatercoolerPosts() {
    this.watercoolerPosts.set([]);
    try {
      const posts = await this.fb.getWatercoolerPosts(this.watercoolerChannel());
      this.watercoolerPosts.set(posts);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const code = (err as any)?.code ? ` [${(err as any).code}]` : "";
      this.addLog("Failed to load posts:" + code + " " + msg, "error");
      console.error("Watercooler load failed:", err);
    }
  }

  async createNewChannel() {
    const name = this.newChannelName().trim();
    const desc = this.newChannelDesc().trim();
    if (!name) return;
    if (!this.fb.user()) {
      this.addLog("Sign in to create a channel.", "error");
      return;
    }
    try {
      const actualName = await this.fb.createWatercoolerChannel(name, desc);
      this.addLog(`Channel #${actualName} created!`, "info");
      this.isCreatingChannel.set(false);
      this.newChannelName.set("");
      this.newChannelDesc.set("");
      await this.loadWatercoolerChannels();
      this.selectChannel(actualName);
    } catch (err) {
      this.addLog(
        "Failed to create channel: " +
          (err instanceof Error ? err.message : String(err)),
        "error",
      );
    }
  }

  async deleteChannel(id: string) {
    if (!this.fb.user()) return;
    const success = await this.fb.deleteWatercoolerChannel(id);
    if (success) {
      this.addLog("Channel deleted.", "info");
      if (
        this.watercoolerChannel() ===
        this.watercoolerChannels().find((c) => c.id === id)?.name
      ) {
        this.selectChannel("general");
      }
      await this.loadWatercoolerChannels();
    } else {
      this.addLog("Failed to delete channel.", "error");
    }
  }

  selectChannel(channel: string) {
    this.watercoolerChannel.set(channel);
    this.loadWatercoolerPosts();
  }

  async createWatercoolerPost() {
    const content = this.newWatercoolerPost().trim();
    if (!content) return;
    if (!this.fb.user()) {
      this.addLog(
        "Sign in with Google to join the Watercooler discussion.",
        "error",
      );
      return;
    }

    const chan = this.watercoolerChannel();

    try {
      await this.fb.createWatercoolerPost(
        content,
        chan,
        this.isAnonymousPost(),
      );
      this.newWatercoolerPost.set("");
      await this.loadWatercoolerPosts();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const code = (err as any)?.code ? ` [${(err as any).code}]` : "";
      this.addLog("Failed to post message:" + code + " " + msg, "error");
      console.error("Watercooler post failed:", err);
    }
  }

  async upvoteWatercoolerPost(postId: string, currentUpvotes: number) {
    if (!this.fb.user()) {
      this.addLog("Sign in to upvote.", "error");
      return;
    }
    await this.fb.upvoteWatercoolerPost(postId, currentUpvotes);
    await this.loadWatercoolerPosts();
  }

  downloadReviewCard() {
    const node = document.getElementById("performance-review-card");
    if (!node) return;

    // Add a quick visual indicator that it's downloading
    this.spawnFloatingText(
      "EXPORTING...",
      "#06B6D4",
      this.player.x,
      this.player.y,
    );

    htmlToImage
      .toJpeg(node, { quality: 0.95, backgroundColor: "#0A101D" })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = "Corporate_Performance_Review.jpeg";
        link.href = dataUrl;
        link.click();
        this.addLog(
          "Performance Review Card downloaded successfully! Share it to your network.",
          "success",
        );
      })
      .catch((error) => {
        console.error("Oops, something went wrong!", error);
        this.addLog("Failed to export review card.", "error");
      });
  }

  // ---- Direct image share to social platforms ----
  // Captions per platform; {{title}}, {{score}}, {{url}} substituted at call time.
  private CAPTIONS: Record<string, string> = {
    'instagram-story': "📈 I just made it to {{title}} on Corporate Ladder Simulator. Tap to play.",
    'twitter':         "I just got promoted to {{title}} with {{score}} synergy on @CorpLadderSim. Think you can beat me? {{url}} #CorporateLadder #Layoffs",
    'linkedin':        "Thrilled to share that I've reached the role of {{title}}, demonstrating {{score}} units of pure synergy. Looking forward to the next chapter of executive ascension.",
    'tiktok':          "POV: you climbed the ladder #corporateladder #layoffs #fyp",
    'native':          "I climbed to {{title}} with {{score}} synergy on Corporate Ladder Simulator. Beat me? {{url}}",
  };

  private fillCaption(template: string): string {
    const url = (typeof window !== 'undefined' ? window.location.origin : 'https://corporate-ladder.web.app');
    return template
      .replace(/{{title}}/g, this.currentTitle().toUpperCase())
      .replace(/{{score}}/g, String(this.synergy()))
      .replace(/{{url}}/g, url);
  }

  /** Render the performance-review card and return a JPEG dataURL. */
  private async renderCardDataUrl(): Promise<string | null> {
    const node = document.getElementById("performance-review-card");
    if (!node) return null;
    try {
      return await htmlToImage.toJpeg(node, { quality: 0.95, backgroundColor: "#0A101D" });
    } catch (err) {
      console.warn('card render failed', err);
      return null;
    }
  }

  /** Save a dataURL to device cache and return the file URI (Capacitor only). */
  private async saveToCacheFile(dataUrl: string): Promise<string | null> {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return null;
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const base64 = dataUrl.split(',')[1];
      const filename = `review_${Date.now()}.jpg`;
      const result = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });
      return result.uri;
    } catch (err) {
      console.warn('save card failed', err);
      return null;
    }
  }

  async shareCardTo(platform: 'instagram-story' | 'twitter' | 'linkedin' | 'tiktok' | 'native') {
    if (this.shareInProgress()) return;
    this.shareInProgress.set(true);
    try {
      const caption = this.fillCaption(this.CAPTIONS[platform]);
      const dataUrl = await this.renderCardDataUrl();
      const { Capacitor } = await import('@capacitor/core');

      // Web fallback — open the platform's web share intent (no image attachment possible)
      if (!Capacitor.isNativePlatform()) {
        const text = encodeURIComponent(caption);
        const url  = encodeURIComponent(window.location.origin);
        const map: Record<string, string> = {
          'twitter':  `https://twitter.com/intent/tweet?text=${text}`,
          'linkedin': `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
          'tiktok':   'https://www.tiktok.com/upload',
          'instagram-story': 'https://www.instagram.com/',
          'native':   '',
        };
        if (map[platform]) {
          window.open(map[platform], '_blank');
          this.addLog('Opened share page. Attach your downloaded card image to post.', 'success');
          // Convenience — also trigger a download so they have the image
          if (dataUrl) {
            const link = document.createElement('a');
            link.download = 'Corporate_Performance_Review.jpeg';
            link.href = dataUrl;
            link.click();
          }
        } else if (dataUrl && (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share) {
          await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({ text: caption, url: window.location.origin });
        }
        return;
      }

      // Native: write file → either fire IG-Story intent or open the share sheet pre-pinned to the platform's package
      if (!dataUrl) {
        this.addLog('Card image render failed.', 'error');
        return;
      }
      const fileUri = await this.saveToCacheFile(dataUrl);
      if (!fileUri) {
        this.addLog('Failed to save card to device.', 'error');
        return;
      }

      if (platform === 'instagram-story') {
        const { InstagramStory } = await import('./instagram-story.plugin');
        if (!InstagramStory) {
          this.addLog('Instagram Stories plugin unavailable.', 'error');
          return;
        }
        try {
          await InstagramStory.share({ filePath: fileUri });
          this.addLog('Opened Instagram Stories with your card.', 'success');
        } catch (err) {
          const msg = (err as Error).message || '';
          if (msg.includes('not installed')) {
            this.addLog('Instagram is not installed on this device.', 'error');
          } else {
            this.addLog('Could not open Instagram Stories: ' + msg, 'error');
          }
        }
        return;
      }

      // Other platforms — Capacitor Share with file attachment + caption
      const { Share } = await import('@capacitor/share');
      try {
        await Share.share({
          title: 'Corporate Ladder Simulator',
          text: caption,
          files: [fileUri],
          dialogTitle: `Share to ${platform === 'twitter' ? 'X' : platform.charAt(0).toUpperCase() + platform.slice(1)}`,
        });
      } catch (err) {
        // User-cancelled is normal; log only real failures
        const msg = (err as Error).message || '';
        if (!/cancel/i.test(msg)) {
          console.warn('share failed', err);
          this.addLog('Share failed: ' + msg, 'error');
        }
      }
    } finally {
      this.shareInProgress.set(false);
    }
  }

  shareToSlack() {
    const url =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://corporate-ladder.web.app";
    const post = this.slackPost + `\n*Play Now:* ${url}`;
    navigator.clipboard
      .writeText(post)
      .then(() => {
        alert(
          "Slack/Teams format copied to clipboard! Paste it directly into your company chat.",
        );
      })
      .catch(() => {
        alert("Failed to copy string. Let's circle back.");
      });
  }

  shareToLinkedIn() {
    // LinkedIn doesn't have a direct prefilled text generic intent without a registered app URI,
    // but we can copy it and open the feed
    const url = window.location.origin;
    const post =
      this.linkedInPost +
      `\n\nPlay Corporate Ladder Simulator here: ${url}\nBuilt by @Gourav Kondadadi (https://www.linkedin.com/in/gourav-kondadadi/)`;
    navigator.clipboard
      .writeText(post)
      .then(() => {
        alert("Post copied to clipboard! Opening LinkedIn...");
        window.open("https://www.linkedin.com/feed/", "_blank");
      })
      .catch(() => {
        alert("Failed to copy. Please manually copy the review.");
      });
  }

  exportIgStory() {
    const node = document.getElementById("performance-review-card");
    if (!node) return;

    // To make it 9:16 for IG stories, we wrap it in a vertical container before screenshotting
    // We physically modify DOM directly for a second, capture, and restore.
    this.spawnFloatingText(
      "GENERATING STORY...",
      "#EC4899",
      this.player.x,
      this.player.y,
    );

    const wrapper = document.createElement("div");
    wrapper.style.width = "1080px";
    wrapper.style.height = "1920px";
    wrapper.style.backgroundColor = "#060B14";
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.alignItems = "center";
    wrapper.style.justifyContent = "center";
    wrapper.style.position = "absolute";
    wrapper.style.top = "-9999px";
    wrapper.style.left = "-9999px";
    wrapper.style.padding = "80px";

    const heading = document.createElement("h1");
    heading.innerText = "MY CORPORATE PERFORMANCE";
    heading.style.color = "#FFFFFF";
    heading.style.fontFamily = "Inter, sans-serif";
    heading.style.fontSize = "64px";
    heading.style.fontWeight = "900";
    heading.style.marginBottom = "60px";
    heading.style.textAlign = "center";
    heading.style.textTransform = "uppercase";
    heading.style.background = "linear-gradient(to right, #ec4899, #8b5cf6)";
    heading.style.webkitBackgroundClip = "text";
    heading.style.webkitTextFillColor = "transparent";
    wrapper.appendChild(heading);

    const clone = node.cloneNode(true) as HTMLElement;
    clone.style.transform = "scale(1.8)";
    clone.style.transformOrigin = "center top";
    wrapper.appendChild(clone);

    const footerText = document.createElement("h2");
    footerText.innerText =
      "THINK YOU CAN BEAT MY SYNERGY?\nLINK IN BIO TO PLAY";
    footerText.style.color = "#ffffff";
    footerText.style.fontFamily = "Inter, sans-serif";
    footerText.style.fontSize = "42px";
    footerText.style.fontWeight = "900";
    footerText.style.marginTop = "420px";
    footerText.style.textAlign = "center";
    footerText.style.lineHeight = "1.4";
    wrapper.appendChild(footerText);

    document.body.appendChild(wrapper);

    htmlToImage
      .toJpeg(wrapper, {
        quality: 0.95,
        width: 1080,
        height: 1920,
        backgroundColor: "#060B14",
      })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = "Corporate_Ladder_IG_Story.jpeg";
        link.href = dataUrl;
        link.click();
        this.addLog(
          "IG Story exported! Upload it to your Instagram or TikTok.",
          "success",
        );
      })
      .catch((error) => {
        console.error("Oops, something went wrong!", error);
        this.addLog("Failed to export IG Story.", "error");
      })
      .finally(() => {
        document.body.removeChild(wrapper);
      });
  }

  copyForInstagram() {
    this.exportIgStory(); // Overwrite logic to actually download a slick 9:16 image
    const url = window.location.origin;
    const post =
      this.linkedInPost +
      `\n\nPlay Corporate Ladder Simulator!\nLink in bio: ${url}\nBuilt by @gourav_kondadadi`;
    navigator.clipboard
      .writeText(post)
      .then(() => {
        alert(
          "Downloaded 9:16 Story Image! Caption text also copied to clipboard.",
        );
      })
      .catch(() => {
        // do nothing
      });
  }

  // --- MONETIZATION: TIP JAR --- //
  // Replace this url with your Live Razorpay Payment Link, Stripe Link, Payoneer Request Link, or UPI address page
  tipJarLink = "https://rzp.io/l/YOUR_PAYMENT_LINK_ID_HERE";

  bribeTheDev() {
    if (this.synergy() >= 10000) {
      this.synergy.update((s) => s - 10000);
      this.addLog(
        "Bribed HR effectively (-10k). 'Records updated'. Wait, you still have to play to level up.",
        "success",
      );
      this.createConfetti();
      this.playSound("levelUp");
    } else {
      this.addLog(
        "You tried to Bribe HR, but you're too poor. Need 10,000 Synergy.",
        "error",
      );
    }
  }

  firePinkSlip() {
    if (this.player.isJumping) return;
    this.projectiles.push({
      x: this.player.x + this.player.width,
      y: this.groundLevel - 35, // Shoot horizontally at a consistent height level near workers
      width: 25,
      height: 12,
      speed: 10,
    });
    this.playSound("shoot");
    this.triggerHaptic([30, 40]);
    this.addLog(
      "Fired a pink slip out of nowhere. 'Re-org' energy underway.",
      "warning",
    );
    this.updateQuest("fire_cause");
  }

  onCanvasClick(e: MouseEvent | TouchEvent) {
    if (this.isPaused || this.gameState() !== "playing") return;

    let cx, cy;
    let isTouch = false;
    if ("touches" in e && e.touches.length > 0) {
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
      isTouch = true;
    } else if ("clientX" in e) {
      cx = (e as MouseEvent).clientX;
      cy = (e as MouseEvent).clientY;
    } else {
      return;
    }

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const scale = Math.max(
      rect.width / this.canvasRef.nativeElement.width,
      rect.height / this.canvasRef.nativeElement.height,
    );
    const offsetY =
      (scale * this.canvasRef.nativeElement.height - rect.height) / 2;
    const x = (cx - rect.left) / scale;
    const y = (cy - rect.top + offsetY) / scale;

    let clickedEmail = false;
    for (const obs of this.obstacles) {
      if (obs.isHurdle && obs.action.type === "urgentEmail" && !obs.collected) {
        // generous circular tap hit box
        const centerX = obs.x + obs.width / 2;
        const centerY = obs.y + obs.height / 2;
        const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

        if (dist < 80) {
          if (isTouch) e.preventDefault();
          this.synergizeEmail(obs);
          clickedEmail = true;
          break;
        }
      }
    }

    if (!clickedEmail) this.jump();
  }

  // ---- ENDLESS RUNNER GAME LOGIC ----

  ngOnDestroy() {
    if (this.animationFrameId && typeof window !== "undefined") {
      window.cancelAnimationFrame(this.animationFrameId);
    }
  }

  triggerHaptic(pattern: number | number[] = 30) {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore
      }
    }
  }

  jump() {
    if (this.player.grounded) {
      this.player.vy = this.player.jumpPower;
      this.player.grounded = false;
      this.player.isJumping = true;
      this.playSound("jump");
      this.triggerHaptic(40);
      this.trackAnalytics("action_jumped");
      this.achievements.track("jump");
      this.updateQuest("jump");
      this.updateQuest("jump_high");
    }
  }

  stopJump() {
    if (this.player.isJumping && this.player.vy < 0) {
      this.player.vy *= 0.5; // Short hop
    }
    this.player.isJumping = false;
  }

  @HostListener("window:keydown.c", ["$event"])
  onC(e: Event) {
    if (!this.isPaused && this.gameState() === "playing") {
      if (
        (e.target as HTMLElement).tagName !== "INPUT" &&
        (e.target as HTMLElement).tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        this.quickCoffeeBreak();
      }
    }
  }

  @HostListener("window:keydown.f", ["$event"])
  onF(e: Event) {
    if (!this.isPaused && this.gameState() === "playing") {
      if (
        (e.target as HTMLElement).tagName !== "INPUT" &&
        (e.target as HTMLElement).tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        this.firePinkSlip();
      }
    }
  }

  @HostListener("window:keydown.g", ["$event"])
  onG(e: Event) {
    if (!this.isPaused && this.gameState() === "playing") {
      if (
        (e.target as HTMLElement).tagName !== "INPUT" &&
        (e.target as HTMLElement).tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        if (this.hasSkill("action_gaslight")) this.gaslightTeam();
      }
    }
  }

  gaslightTeam() {
    if (this.teamMorale() < 40) {
      this.addLog("Team morale too low to gaslight!", "error");
      return;
    }
    this.runStats["gaslightTeam"] = (this.runStats["gaslightTeam"] || 0) + 1;
    this.teamMorale.update((m) => Math.max(0, m - 40));
    this.addLog(
      "Gaslit the entire department. Obstacles 'resolved' magically.",
      "success",
    );
    this.updateQuest("gaslight");
    this.updateQuest("gaslight_pro");
    this.screenShake = 20;
    this.playSound("shoot");
    this.triggerHaptic([20, 30, 20]);
    let cleared = 0;
    for (const obs of this.obstacles) {
      if (
        obs.x > this.player.x - 100 &&
        obs.x < this.canvasRef.nativeElement.width
      ) {
        if (!obs.collected) {
          obs.collected = true;
          this.synergizeEffects.push({
            x: obs.x + obs.width / 2,
            y: obs.y + obs.height / 2,
            radius: 20,
            alpha: 1,
          });
          cleared++;
        }
      }
    }
    this.synergy.update((s) => s + cleared * 10);
    this.addCombo(cleared * 10);
  }

  @HostListener("window:keydown.e", ["$event"])
  onE(e: Event) {
    if (!this.isPaused && this.gameState() === "playing") {
      if (
        (e.target as HTMLElement).tagName !== "INPUT" &&
        (e.target as HTMLElement).tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        this.clearClosestEmail();
      }
    }
  }

  clearClosestEmail() {
    const isAoe = this.hasSkill("action_synergize_aoe");
    for (const obs of this.obstacles) {
      if (obs.isHurdle && obs.action.type === "urgentEmail" && !obs.collected) {
        if (obs.x < this.player.x + (isAoe ? 1200 : 300)) {
          this.synergizeEmail(obs);
          if (!isAoe) return; // if not AOE, just clear one
        }
      }
    }
  }

  synergizeEmail(obs: Obstacle) {
    obs.collected = true;
    this.emailsSynergized++;
    this.synergy.update((s) => s + 5 * this.comboMultiplier);
    this.addCombo(5);
    this.spawnFloatingText("SYNERGIZED!", "#EAB308", obs.x, obs.y - 20);
    this.addLog(
      "Swiped away an Urgent Email. Handled it like a pro.",
      "success",
    );
    this.updateQuest("emails");
    this.updateQuest("inbox_zero");
    this.playSound("synergize");
    this.triggerHaptic(50);
    this.synergizeEffects.push({
      x: this.player.x + this.player.width / 2,
      y: this.player.y + this.player.height / 2,
      radius: 10,
      alpha: 1,
    });
  }

  @HostListener("window:keydown.space", ["$event"])
  onSpaceDown(e: Event) {
    const tag = (e.target as HTMLElement).tagName;
    const activeTag = (typeof document !== 'undefined' && document.activeElement)
      ? document.activeElement.tagName : '';
    const isFormField =
      tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'A' ||
      activeTag === 'INPUT' || activeTag === 'TEXTAREA' ||
      (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement && document.activeElement.isContentEditable);
    if (!isFormField) {
      e.preventDefault();
      if (!this.isPaused && this.gameState() === "playing") {
        if (!(e as KeyboardEvent).repeat) {
          this.jump();
        }
      }
    }
  }

  @HostListener("window:keyup.space", ["$event"])
  onSpaceUp(e: Event) {
    const tag = (e.target as HTMLElement).tagName;
    const activeTag = (typeof document !== 'undefined' && document.activeElement)
      ? document.activeElement.tagName : '';
    const isFormField =
      tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'A' ||
      activeTag === 'INPUT' || activeTag === 'TEXTAREA' ||
      (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement && document.activeElement.isContentEditable);
    if (!isFormField) {
      e.preventDefault();
      if (!this.isPaused && this.gameState() === "playing") {
        this.stopJump();
      }
    }
  }

  gameLoop() {
    if (
      !this.isPaused &&
      (this.gameState() === "playing" || this.gameState() === "story")
    ) {
      if (this.gameState() === "playing") {
        this.frameCount++;
        this.update();
        if (this.frameCount % 10 === 0) this.checkGhostBeat();
      }
    }

    if (this.gameState() === "story" && this.confetti.length > 0) {
      this.updateConfetti();
    }
    this.draw();

    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  addCombo(amount: number) {
    this.comboMeter = Math.min(100, this.comboMeter + amount);
  }

  spawnFloatingText(text: string, color: string, x: number, y: number) {
    this.floatingTexts.push({ x, y, text, color, alpha: 1, vy: -1.5 });
  }

  drawWorker(obs: Obstacle, scale: number) {
    const px = obs.x;
    const py = obs.y;
    const pWidth = obs.width;
    const pHeight = obs.height;

    let topColor = "#374151";
    let bottomColor = "#1D4ED8";
    let accessory = "💻";
    let skinColor = "#FCD34D";

    if (obs.action.text === "Marketing") {
      topColor = "#D946EF"; // fuchsia-500
      bottomColor = "#FDF4FF";
      accessory = "📱";
      skinColor = "#FDBA74";
    } else if (obs.action.text === "Strategy") {
      topColor = "#38BDF8"; // light blue
      bottomColor = "#a855f7"; // purple
      accessory = "📊";
      skinColor = "#FDA4AF";
    }

    const headRadius = pWidth * 0.35;
    const headX = px + pWidth / 2;
    const headY = py + headRadius;

    // Walking animation oblivious towards the executive
    const walkTime = this.frameCount * 0.4;
    const legStride = 15;

    // Back Arm
    this.ctx.strokeStyle = topColor;
    this.ctx.lineWidth = 5 * scale;
    this.ctx.lineCap = "round";
    this.ctx.beginPath();
    this.ctx.moveTo(px + pWidth * 0.7, py + pHeight * 0.4);
    this.ctx.lineTo(
      px + pWidth * 0.9,
      py + pHeight * 0.6 + Math.sin(walkTime) * 5,
    );
    this.ctx.stroke();

    // Legs
    this.ctx.strokeStyle = bottomColor;
    this.ctx.lineWidth = 6 * scale;
    this.ctx.beginPath();
    // Right leg (back)
    this.ctx.moveTo(px + pWidth * 0.7, py + pHeight * 0.6);
    this.ctx.lineTo(
      px + pWidth * 0.7 + Math.sin(walkTime) * legStride * scale,
      py + pHeight,
    );
    // Left leg (front)
    this.ctx.moveTo(px + pWidth * 0.3, py + pHeight * 0.6);
    this.ctx.lineTo(
      px + pWidth * 0.3 - Math.sin(walkTime) * legStride * scale,
      py + pHeight,
    );
    this.ctx.stroke();

    // Body
    this.ctx.fillStyle = topColor;
    if (this.ctx.roundRect) {
      this.ctx.beginPath();
      this.ctx.roundRect(
        px + pWidth * 0.1,
        py + headRadius * 1.5,
        pWidth * 0.8,
        pHeight * 0.5,
        4,
      );
      this.ctx.fill();
    } else {
      this.ctx.fillRect(
        px + pWidth * 0.1,
        py + headRadius * 1.5,
        pWidth * 0.8,
        pHeight * 0.5,
      );
    }

    // Head
    this.ctx.fillStyle = skinColor;
    this.ctx.beginPath();
    this.ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Glasses for Strategy/Coding
    if (obs.action.text === "Strategy" || obs.action.text === "Coding") {
      this.ctx.fillStyle = "#060B14"; // Very dark indigo
      this.ctx.fillRect(headX - pWidth * 0.2, headY - 2, pWidth * 0.3, 4);
    }

    // Front Arm holding accessory
    this.ctx.strokeStyle = topColor;
    this.ctx.lineWidth = 5 * scale;
    this.ctx.beginPath();
    this.ctx.moveTo(px + pWidth * 0.3, py + pHeight * 0.4);
    this.ctx.lineTo(px - 5, py + pHeight * 0.55); // reaching forward/down to look at object
    this.ctx.stroke();

    // Accessory
    this.ctx.font = `${16 * scale}px Arial`;
    this.ctx.fillStyle = "#000000";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(accessory, px - 10, py + pHeight * 0.55);

    // Label floating above them
    this.ctx.font = "bold 16px Arial";
    this.ctx.fillStyle = "#D946EF"; // fuchsia
    this.ctx.fillText(obs.action.text, headX, py - 12);
  }

  triggerRandomEvent() {
    const events = [
      {
        title: "Company Picnic",
        log: "Company Picnic! Free pizza cures burnout.",
        effect: () => this.teamMorale.update((m) => Math.min(100, m + 10)),
      },
      {
        title: "Layoffs Announced",
        log: "Layoffs Announced. Do more with less.",
        effect: () => {
          this.teamMorale.update((m) => Math.max(0, m - 20));
          this.busyness.update((b) => Math.min(100, b + 10));
        },
      },
      {
        title: "Executive Retreat",
        log: "Exec retreat to Aspen! Return completely renewed.",
        effect: () => {
          this.busyness.update((b) => Math.max(0, b - 20));
          this.synergy.update((s) => s + 50);
        },
      },
      {
        title: "Compliance Training",
        log: "Mandatory compliance module.",
        effect: () => {
          this.busyness.update((b) => Math.min(100, b + 20));
          this.teamMorale.update((m) => Math.max(0, m - 5));
        },
      },
      {
        title: "Free Bagels",
        log: "Free Bagels in the breakroom! Morale slightly restored.",
        effect: () => this.teamMorale.update((m) => Math.min(100, m + 5)),
      },
    ];
    const ev = events[Math.floor(Math.random() * events.length)];
    this.addLog(`EVENT: ${ev.log}`, "info");
    ev.effect();
    this.spawnFloatingText(
      "EVENT: " + ev.title,
      "#FBBF24",
      this.canvasRef.nativeElement.width / 2,
      50,
    );
  }

  update() {
    if (this.frameCount % (60 * 15) === 0) {
      // Every 15 seconds
      this.triggerRandomEvent();
    }

    if (this.synergyBoostTimer() > 0) {
      this.synergyBoostTimer.update((t) => t - 1);
    }

    // Check story promotions
    const levelParams = Object.keys(STORY_EVENTS)
      .map((k) => parseInt(k))
      .sort((a, b) => a - b);
    for (const threshold of levelParams) {
      if (
        this.synergy() >= threshold &&
        !this.promotionsClaimed.has(threshold)
      ) {
        this.promotionsClaimed.add(threshold);
        this.currentStoryNode.set(STORY_EVENTS[threshold]);
        this.gameState.set("story");
        this.isPaused = true;
        this.playSound("levelUp");
        this.createConfetti();
        this.trackAnalytics("promotion", {
          new_level: threshold,
          current_title: this.currentTitle(),
        });
      }
    }

    if (this.gameMode() === "championship" && this.frameCount % 60 === 0) {
      if (this.championshipTimeLeft() > 0 && !this.isFrozen) {
        this.championshipTimeLeft.update((t) => t - 1);
      } else if (this.championshipTimeLeft() <= 0) {
        this.triggerFired("Time's up! Q3 Earnings are in.");
        return;
      }
    }

    if (
      this.hasSkill("marketing_buzz") &&
      this.frameCount % 60 === 0 &&
      !this.isFrozen
    ) {
      this.synergy.update((s) => s + 1);
    }

    if (this.isFrozen) {
      this.freezeTimer--;
      if (this.freezeTimer <= 0) {
        this.isFrozen = false;
        this.sabotageText = "";
      }
    }

    // Calculate combo multiplier
    if (this.comboMeter > 75) this.comboMultiplier = 3;
    else if (this.comboMeter > 40) this.comboMultiplier = 2;
    else this.comboMultiplier = 1;

    if (this.synergyBoostTimer() > 0) {
      this.comboMultiplier *= 2;
    }

    if (!this.isPaused && this.comboMeter > 0) {
      this.comboMeter -= this.hasSkill("combo_retain") ? 0.07 : 0.1; // Drain combo
    }

    if (this.screenShake > 0) {
      this.screenShake *= 0.9;
      if (this.screenShake < 0.5) this.screenShake = 0;
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.015;
      if (ft.alpha <= 0) this.floatingTexts.splice(i, 1);
    }

    for (let i = this.firedEffects.length - 1; i >= 0; i--) {
      const ef = this.firedEffects[i];
      ef.scale += 0.05;
      ef.alpha -= 0.02;
      ef.y -= 0.5;
      if (ef.alpha <= 0) this.firedEffects.splice(i, 1);
    }

    for (let i = this.synergizeEffects.length - 1; i >= 0; i--) {
      const ef = this.synergizeEffects[i];
      ef.radius += 5;
      ef.alpha -= 0.05;
      if (ef.alpha <= 0) this.synergizeEffects.splice(i, 1);
    }

    if (this.isFrozen) {
      return; // Skip player movement, spawning, collision
    }

    // Scale player based on level (Super Mario style growth)
    const oldHeight = this.player.height;
    const scale = 1 + this.levelIndex() * 0.3;
    this.player.width = 30 * scale;
    this.player.height = 50 * scale;

    if (this.player.grounded && this.player.height > oldHeight) {
      this.player.y -= this.player.height - oldHeight;
    }

    // Player physics
    this.player.vy += this.player.gravity;
    this.player.y += this.player.vy;

    if (this.player.y + this.player.height >= this.groundLevel) {
      this.player.y = this.groundLevel - this.player.height;
      this.player.vy = 0;
      this.player.grounded = true;
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.speed;
      if (p.x > this.canvasRef.nativeElement.width) {
        this.projectiles.splice(i, 1);
      }
    }

    const currentSpeed = this.baseSpeed + (this.coffeeBoostTimer > 0 ? 2 : 0);

    // Spawn Blocks (Upper management block)
    if (this.frameCount % 180 === 0) {
      this.blocks.push({
        x: this.canvasRef.nativeElement.width,
        y: this.groundLevel - this.player.height - 60, // Always reachable above head
        width: 40,
        height: 40,
        active: true,
      });
    }

    // Update Blocks
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const b = this.blocks[i];
      b.x -= currentSpeed;

      // Collision with player (hitting from below)
      if (
        b.active &&
        this.player.x < b.x + b.width &&
        this.player.x + this.player.width > b.x &&
        this.player.y < b.y + b.height &&
        this.player.y + this.player.height > b.y
      ) {
        if (this.player.vy < 0 && this.player.y > b.y + b.height / 2) {
          this.player.vy = 0; // Bonk head
          b.active = false;
          this.screenShake = 8;
          this.addCombo(20);
          const points = 50 * this.comboMultiplier;
          this.synergy.update((s) => s + points);
          this.spawnFloatingText("10X LEADER!", "#F59E0B", b.x, b.y - 20);
          this.addLog(
            `Bootlicked upper management successfully! +${points} Synergy`,
            "success",
          );
          this.updateQuest("kissup");
        }
      }
      if (b.x + b.width < 0) this.blocks.splice(i, 1);
    }

    // Spawn obstacles
    // Speed increases slightly over time
    // Mobile friendly: lower minimum bounds for faster pacing
    const spawnRate = Math.max(25, 60 - Math.floor(this.frameCount / 120));
    if (this.frameCount % spawnRate === 0) {
      const r = Math.random();
      const isHurdle = r > 0.6; // 40% chance of an actionable item
      const isPowerup = !isHurdle && r < 0.05; // 5% chance of a powerup

      let action;
      let width = 36;
      let speedModifier = 1;
      const level = this.levelIndex();

      if (isPowerup) {
        action =
          this.POWERUPS[Math.floor(Math.random() * this.POWERUPS.length)];
        speedModifier = 1.2;
      } else if (isHurdle) {
        const availableHurdles = this.HURDLES.filter((h) => {
          if (h.type === "realWork") return level >= 1;
          if (h.type === "micromanager") return level >= 3;
          if (h.type === "endlessMeeting") return level >= 4;
          return true;
        });

        action =
          availableHurdles[Math.floor(Math.random() * availableHurdles.length)];
        width = action.width;
        speedModifier = action.speedModifier;

        // Level-based difficulty scaling for extreme grinds
        if (level >= 5) {
          if (action.type === "redTape") {
            width = action.width + (level - 4) * 25; // Wider jumps
          }
          if (action.type === "urgentEmail") {
            speedModifier = action.speedModifier + (level - 4) * 0.2; // Faster emails
          }
          if (action.type === "realWork") {
            speedModifier = action.speedModifier + (level - 4) * 0.1; // Harder to hit workers
          }
        }
      } else {
        action =
          this.GAME_ACTIONS[
            Math.floor(Math.random() * this.GAME_ACTIONS.length)
          ];
        if (action.type === "networkingLunch") {
          speedModifier = 0.45; // Make the pizza float by extremely slow so it's impossible to miss on mobile
        }
      }

      // Hurdles usually on ground unless they are small
      let height = 36;
      if (isHurdle && action.type === "realWork") {
        height = 45; // Dynamic height for workers to match player scale roughly
      }
      const isAirborne =
        (!isHurdle && !isPowerup && Math.random() > 0.5) || isPowerup;
      const originY = isAirborne
        ? this.groundLevel - 60 - Math.random() * 40
        : this.groundLevel - height;

      this.obstacles.push({
        x: this.canvasRef.nativeElement.width,
        y: originY,
        width: width,
        height: height,
        action: action,
        isHurdle: isHurdle,
        speedModifier: speedModifier,
        collected: false,
      });
    }

    if (this.coffeeBoostTimer > 0) this.coffeeBoostTimer--;

    // Update and collide
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= currentSpeed * obs.speedModifier;

      // Adjust collision box to be slightly smaller than drawn visual for "fair" gameplay feeling
      if (
        !obs.collected &&
        this.player.x + 5 < obs.x + obs.width - 5 &&
        this.player.x + this.player.width - 5 > obs.x + 5 &&
        this.player.y + 5 < obs.y + obs.height - 5 &&
        this.player.y + this.player.height - 5 > obs.y + 5
      ) {
        if (obs.action.type !== "urgentEmail") {
          obs.collected = true;
          if (obs.isHurdle) {
            if (obs.action.type === "redTape") {
              const penalty = 20;
              this.synergy.update((s) => Math.max(0, s - penalty));
              this.screenShake = 5;
              this.spawnFloatingText("BLOCKED!", "#EF4444", obs.x, obs.y - 20);
              this.addLog(
                "Got tangled in Bureaucratic Red Tape. Productivity halted.",
                "error",
              );
            } else if (obs.action.type === "micromanager") {
              const mmPenalty = 10;
              this.synergy.update((s) => Math.max(0, s - mmPenalty));
              this.teamMorale.update((m) => Math.max(0, m - 15));
              this.screenShake = 8;
              this.spawnFloatingText(
                "MICROMANAGED!",
                "#7C3AED",
                obs.x,
                obs.y - 20,
              );
              this.addLog(
                "A micromanager asked for a TPS report. Morale plummeted.",
                "warning",
              );
            } else if (obs.action.type === "endlessMeeting") {
              this.busyness.update((b) => Math.min(100, b + 20));
              this.teamMorale.update((m) => Math.max(0, m - 5));
              this.screenShake = 4;
              this.spawnFloatingText("BORED!", "#3B82F6", obs.x, obs.y - 20);
              this.addLog(
                "Trapped in an endless alignment meeting.",
                "warning",
              );
            } else {
              this.triggerFired();
            }
          } else {
            this.handleAction(obs.action.type);
          }
        }
      }

      // Projectile collision
      for (let j = this.projectiles.length - 1; j >= 0; j--) {
        const p = this.projectiles[j];
        if (
          obs.isHurdle &&
          obs.action.type === "realWork" &&
          !obs.collected &&
          p.x < obs.x + obs.width &&
          p.x + p.width > obs.x &&
          p.y < obs.y + obs.height &&
          p.y + p.height > obs.y
        ) {
          obs.collected = true;
          this.projectiles.splice(j, 1);
          this.doersFired++;
          this.achievements.track("fire");
          this.screenShake = 10;
          this.addCombo(15);
          this.spawnFloatingText("PIVOT!", "#EF4444", obs.x, obs.y - 20);
          this.firedEffects.push({
            x: obs.x + obs.width / 2,
            y: obs.y + obs.height / 2,
            scale: 0.2,
            alpha: 1.0,
          });
          this.playSound("fire");
          this.addLog(
            `Fired the ${obs.action.text} doer! Cleaned house efficiently.`,
            "success",
          );
          this.updateQuest("fire");
          break; // Stop checking this projectile
        }
      }

      if (obs.x + obs.width < 0) {
        if (
          !obs.collected &&
          obs.isHurdle &&
          obs.action.type === "urgentEmail"
        ) {
          const mailPenalty = 5;
          this.synergy.update((s) => Math.max(0, s - mailPenalty));
          this.addLog(
            "Missed an Urgent Email. Penalty to your synergy standing.",
            "error",
          );
        }
        this.obstacles.splice(i, 1);
      } else if (obs.collected) {
        this.obstacles.splice(i, 1);
      }
    }

    // Scale speed cap
    if (this.baseSpeed < 11 && this.frameCount % 500 === 0) {
      this.baseSpeed += 0.5;
    }

    // Check Championship Time
    if (this.gameMode() === "championship") {
      if (this.frameCount % 60 === 0) {
        this.championshipTimeLeft.update((t) => t - 1);
        if (this.championshipTimeLeft() <= 0) {
          this.retire();
          this.addLog("Q3 Sprint Ended! Final Score tallied.", "info");
        }
      }
    }

    // Live Multiplayer Score Syncing (every ~1.5s to prevent massive firebase spam but keep users feeling connected)
    if (this.activeRoom() && this.frameCount % 90 === 0) {
      this.fb.updateRoomPlayer(
        this.activeRoom()!.roomId,
        this.synergy(),
        "playing",
      );
    }
  }

  draw() {
    const level = this.levelIndex();
    const scale = 1 + level * 0.3;
    const canvas = this.canvasRef.nativeElement;

    this.ctx.save();

    // Apply Screen Shake Juice
    if (this.screenShake > 0) {
      const dx = (Math.random() - 0.5) * this.screenShake;
      const dy = (Math.random() - 0.5) * this.screenShake;
      this.ctx.translate(dx, dy);
    }

    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    // BG
    this.ctx.fillStyle = "#070b13";
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ceiling Lights (LED panels)
    this.ctx.fillStyle = "rgba(56, 189, 248, 0.15)";
    this.ctx.shadowColor = "#38BDF8";
    this.ctx.shadowBlur = 10;
    for (let i = 0; i < 10; i++) {
      const lx = i * 200 - ((this.frameCount * 4) % 200);
      this.ctx.fillRect(lx, 10, 120, 20);
      this.ctx.fillRect(lx + 10, 15, 100, 10); // Inner bright spot
    }
    this.ctx.shadowBlur = 0;

    // Layer 1: Back Wall - Glass Meeting Rooms (Moves slow)
    // Draw Wall Base
    this.ctx.fillStyle = "#0a101ce6";
    this.ctx.fillRect(0, 50, canvas.width, this.groundLevel - 50);

    // Draw Meeting Rooms
    this.ctx.strokeStyle = "#1e293b"; // Frames
    this.ctx.lineWidth = 3;
    for (let i = 0; i < 10; i++) {
      const rx = i * 300 - ((this.frameCount * 0.5) % 300) - 50;
      const ry = 80;
      const rw = 250;
      const rh = this.groundLevel - ry;

      // Glass Pane Refection
      this.ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
      this.ctx.fillRect(rx, ry, rw, rh);
      this.ctx.strokeRect(rx, ry, rw, rh);

      // Meeting Room Table & Whiteboard
      this.ctx.fillStyle = "#0f172a"; // Whiteboard
      this.ctx.fillRect(rx + 50, ry + 30, 150, 60);
      this.ctx.strokeStyle = "#38bdf8"; // Chart on whiteboard
      this.ctx.lineWidth = 2;
      this.ctx.globalAlpha = 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(rx + 60, ry + 80);
      this.ctx.lineTo(rx + 90, ry + 60);
      this.ctx.lineTo(rx + 120, ry + 70);
      this.ctx.lineTo(rx + 180, ry + 40);
      this.ctx.stroke();
      this.ctx.globalAlpha = 1.0;

      // Table
      this.ctx.fillStyle = "#1e293b";
      this.ctx.fillRect(rx + 30, ry + 120, 190, 10);
      this.ctx.fillRect(rx + 50, ry + 130, 10, rh - 130);
      this.ctx.fillRect(rx + 190, ry + 130, 10, rh - 130);
    }

    // Layer 2: Corporate Cabins and Cubicles (Moves medium)
    for (let i = 0; i < 8; i++) {
      const bx = i * 240 - ((this.frameCount * 1.5) % 240) - 100;
      const by = this.groundLevel - 140;

      // Cubicle Partition
      this.ctx.fillStyle = "#0f172a";
      this.ctx.fillRect(bx, by, 180, 140);
      this.ctx.strokeStyle = "#334155";
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(bx, by, 180, 140);

      // Desk
      this.ctx.fillStyle = "#1e293b";
      this.ctx.fillRect(bx + 10, by + 70, 160, 8);

      // Monitor
      this.ctx.fillStyle = "#020617";
      this.ctx.fillRect(bx + 100, by + 30, 50, 35);
      this.ctx.fillStyle = "#cbd5e1"; // Monitor Stand
      this.ctx.fillRect(bx + 120, by + 65, 10, 5);

      // Screen code lines
      this.ctx.fillStyle = "#10b981";
      this.ctx.globalAlpha = 0.6;
      this.ctx.fillRect(bx + 105, by + 35, 40, 4);
      this.ctx.fillRect(bx + 105, by + 43, 30, 4);
      this.ctx.fillRect(bx + 105, by + 51, 35, 4);
      this.ctx.globalAlpha = 1.0;

      // Coffee Mug
      this.ctx.fillStyle = "#e2e8f0";
      this.ctx.fillRect(bx + 150, by + 60, 8, 10);

      // Rolling Chair
      this.ctx.fillStyle = "#0f172a";
      this.ctx.fillRect(bx + 40, by + 40, 30, 40); // Backrest
      this.ctx.fillRect(bx + 35, by + 80, 40, 10); // Seat
      this.ctx.fillRect(bx + 50, by + 90, 10, 30); // Pole
      // Wheels
      this.ctx.fillStyle = "#334155";
      this.ctx.fillRect(bx + 35, by + 120, 40, 4);
      this.ctx.fillRect(bx + 35, by + 124, 8, 8);
      this.ctx.fillRect(bx + 67, by + 124, 8, 8);

      // Potted Plant (every other desk)
      if (i % 2 === 0) {
        this.ctx.fillStyle = "#1e293b";
        this.ctx.fillRect(bx + 15, by + 100, 25, 30);
        this.ctx.fillStyle = "#059669"; // Leaves
        this.ctx.beginPath();
        this.ctx.arc(bx + 27, by + 85, 20, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // Layer 3: Faint background corporate charts over the whole scene blending in
    this.ctx.strokeStyle = "#10B981"; // Emerald chart line
    this.ctx.lineWidth = 4;
    this.ctx.globalAlpha = 0.05;
    this.ctx.beginPath();
    for (let i = 0; i < canvas.width; i += 100) {
      const lx = i * 100 - ((this.frameCount * 3) % (canvas.width + 100));
      const ly =
        100 + Math.abs(Math.sin((i + this.frameCount * 0.01) * 0.5) * 150);
      if (i === 0) this.ctx.moveTo(lx, ly);
      else this.ctx.lineTo(lx, ly);
    }
    this.ctx.stroke();
    this.ctx.globalAlpha = 1.0;

    // Ground Floor (Modern Corporate Carpet)
    this.ctx.fillStyle = "#090e17";
    this.ctx.fillRect(
      0,
      this.groundLevel,
      canvas.width,
      canvas.height - this.groundLevel,
    );

    // Carpet Grid (Perspective)
    this.ctx.strokeStyle = "#0f172a";
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      const lineX = i * 80 - ((this.frameCount * 5) % 80);
      this.ctx.beginPath();
      this.ctx.moveTo(lineX, this.groundLevel);
      this.ctx.lineTo(lineX - 200, canvas.height); // Diagonal sweep
      this.ctx.stroke();
    }
    // Horizontal carpet dividers
    for (let i = 0; i < 4; i++) {
      const yOffset = i * 40;
      this.ctx.beginPath();
      this.ctx.moveTo(0, this.groundLevel + yOffset);
      this.ctx.lineTo(canvas.width, this.groundLevel + yOffset);
      this.ctx.stroke();
    }

    // Baseboard/Horizon Line
    this.ctx.strokeStyle = "#38BDF8";
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundLevel);
    this.ctx.lineTo(canvas.width, this.groundLevel);
    this.ctx.stroke();

    // Floor Baseboard Glow
    this.ctx.shadowColor = "#38BDF8";
    this.ctx.shadowBlur = 10;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0; // Reset

    // Player (Full Human Draw)
    const pr = this.player;
    const headRadius = pr.width * 0.25;
    const headX = pr.x + pr.width / 2;
    const headY = pr.y + headRadius;

    const bodyWidth = pr.width * 0.6;
    const bodyHeight = pr.height * 0.4;
    const bodyX = pr.x + (pr.width - bodyWidth) / 2;
    const bodyY = pr.y + headRadius * 2;

    const legLength = pr.height * 0.35;

    // ---- UNLOCKABLE SKINS BASE ----
    const activeSkin = this.playerSkin();
    let suitColor = "#1E293B";
    let sleeveColor = "#0F172A";
    let tieColor = "#D946EF";
    let shirtColor = "#E2E8F0";

    if (activeSkin === "fleece") {
      suitColor = "#334155"; // Grey fleece body
      sleeveColor = "#1E293B"; // Lighter grey/blue shirt sleeves
      tieColor = "transparent"; // No tie
      shirtColor = "#38BDF8"; // Cyan checkered shirt underneath
    } else if (activeSkin === "gold") {
      suitColor = "#8B5CF6"; // Solid purple suit
      sleeveColor = "#6D28D9"; // Darker purple arms
      tieColor = "#22D3EE"; // Cyan tie
      shirtColor = "#FDF4FF"; // Crisp shirt
    } else if (activeSkin === "cyber") {
      suitColor = "#06b6d4"; // Cyan suit
      sleeveColor = "#0891b2"; // Dark cyan arms
      tieColor = "#e879f9"; // Pink tie
      shirtColor = "#172033"; // Dark shirt
    }

    // Draw back arm (behind body)
    this.ctx.strokeStyle = sleeveColor;
    this.ctx.lineWidth = Math.max(2, 4 * scale);
    this.ctx.lineCap = "round";
    this.ctx.beginPath();

    const time = this.frameCount * 0.3;

    // Animate idle if no obstacle is fairly close
    const isIdle =
      pr.grounded &&
      !this.obstacles.some((o) => o.x > pr.x - 50 && o.x < pr.x + 300);
    let idleAnim = 0;
    if (isIdle) {
      idleAnim = Math.floor(this.frameCount / 60) % 3; // Cycle every 60 frames: 0 (normal), 1 (phone), 2 (watch)
    }

    if (pr.isJumping) {
      // Small back arm flail
      this.ctx.moveTo(bodyX + bodyWidth, bodyY + 5 * scale);
      this.ctx.lineTo(bodyX + bodyWidth + 10 * scale, bodyY - 15 * scale);
    } else {
      // Normal running back arm swing
      this.ctx.moveTo(bodyX + bodyWidth, bodyY + 5 * scale);
      this.ctx.lineTo(
        bodyX + bodyWidth + 5 * scale,
        bodyY + bodyHeight * 0.8 - Math.sin(time) * 10 * scale,
      );
    }
    this.ctx.stroke();

    // Legs
    this.ctx.strokeStyle = "#1E293B";
    this.ctx.beginPath();
    this.ctx.moveTo(bodyX + bodyWidth * 0.7, bodyY + bodyHeight);
    this.ctx.lineTo(
      bodyX +
        bodyWidth * 0.7 +
        (pr.grounded ? -Math.sin(time) * 15 * scale : 5 * scale),
      bodyY + bodyHeight + legLength,
    );
    this.ctx.moveTo(bodyX + bodyWidth * 0.3, bodyY + bodyHeight);
    this.ctx.lineTo(
      bodyX +
        bodyWidth * 0.3 +
        (pr.grounded ? Math.sin(time) * 15 * scale : -10 * scale),
      bodyY + bodyHeight + legLength,
    );
    this.ctx.stroke();

    // Body suit
    this.ctx.fillStyle = suitColor;
    if (this.ctx.roundRect) {
      this.ctx.beginPath();
      this.ctx.roundRect(bodyX, bodyY, bodyWidth, bodyHeight, 4 * scale);
      this.ctx.fill();
    } else {
      this.ctx.fillRect(bodyX, bodyY, bodyWidth, bodyHeight);
    }

    // Front Arm & Accessories
    if (!pr.isJumping) {
      this.ctx.strokeStyle = suitColor;
      this.ctx.beginPath();
      this.ctx.moveTo(bodyX + bodyWidth * 0.3, bodyY + 5 * scale);

      if (idleAnim === 1) {
        // Glancing at phone
        this.ctx.lineTo(bodyX + 15 * scale, bodyY + bodyHeight * 0.4);
        this.ctx.stroke();
        this.ctx.fillStyle = "#1E293B";
        this.ctx.fillRect(
          bodyX + 10 * scale,
          bodyY + bodyHeight * 0.2,
          5 * scale,
          8 * scale,
        );
      } else if (idleAnim === 2) {
        // Checking watch
        this.ctx.lineTo(bodyX + 10 * scale, bodyY + bodyHeight * 0.5);
        this.ctx.lineTo(bodyX + 5 * scale, bodyY + bodyHeight * 0.5);
        this.ctx.stroke();
        this.ctx.fillStyle = "#EAB308";
        this.ctx.fillRect(
          bodyX + 4 * scale,
          bodyY + bodyHeight * 0.48,
          4 * scale,
          4 * scale,
        );
      } else {
        // Normal swing running
        const handX = bodyX - 5 * scale;
        const handY = bodyY + bodyHeight * 0.8 + Math.sin(time) * 10 * scale;
        this.ctx.lineTo(handX, handY);
        this.ctx.stroke();

        // Draw Briefcase
        this.ctx.fillStyle = "#78350f"; // Dark leather
        this.ctx.fillRect(handX - 6 * scale, handY, 14 * scale, 10 * scale);
        this.ctx.fillStyle = "#b45309"; // Handle
        this.ctx.fillRect(
          handX - 2 * scale,
          handY - 3 * scale,
          6 * scale,
          3 * scale,
        );
      }
    } else {
      // Jumping pose front arm holding briefcase up
      this.ctx.strokeStyle = suitColor;
      this.ctx.beginPath();
      this.ctx.moveTo(bodyX + bodyWidth * 0.3, bodyY + 5 * scale);
      const handX = bodyX - 10 * scale;
      const handY = bodyY - 10 * scale;
      this.ctx.lineTo(handX, handY);
      this.ctx.stroke();

      // Draw Briefcase Mid-air
      this.ctx.fillStyle = "#78350f";
      this.ctx.save();
      this.ctx.translate(handX, handY);
      this.ctx.rotate(-Math.PI / 6);
      this.ctx.fillRect(-6 * scale, 0, 14 * scale, 10 * scale);
      this.ctx.fillStyle = "#b45309";
      this.ctx.fillRect(-2 * scale, -3 * scale, 6 * scale, 3 * scale);
      this.ctx.restore();

      // Speed lines / sweat drops
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      this.ctx.fillRect(
        bodyX - 10 * scale,
        bodyY + 20 * scale,
        4 * scale,
        2 * scale,
      );
      this.ctx.fillRect(
        bodyX - 20 * scale,
        bodyY + 30 * scale,
        8 * scale,
        2 * scale,
      );
    }

    // Collar
    this.ctx.fillStyle = shirtColor;
    this.ctx.fillRect(
      bodyX + bodyWidth * 0.2,
      bodyY,
      bodyWidth * 0.6,
      4 * scale,
    );

    // Tie
    if (tieColor !== "transparent") {
      this.ctx.fillStyle = tieColor;
      this.ctx.beginPath();
      this.ctx.moveTo(headX - 2 * scale, bodyY + 2 * scale);
      this.ctx.lineTo(headX + 2 * scale, bodyY + 2 * scale);
      this.ctx.lineTo(headX, bodyY + bodyHeight * 0.7);
      this.ctx.fill();
    }

    // Head
    this.ctx.fillStyle = "#FCD34D";
    this.ctx.beginPath();
    this.ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Projectiles
    this.ctx.fillStyle = "#EC4899"; // Pink Slip Color
    for (const p of this.projectiles) {
      this.ctx.fillRect(p.x, p.y, p.width, p.height);
      this.ctx.shadowColor = "transparent";
      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.font = "16px Arial";
      this.ctx.fillText("📄", p.x + 4, p.y - 2);
      this.ctx.fillStyle = "#D946EF";
    }

    // Blocks
    for (const b of this.blocks) {
      if (b.active) {
        this.ctx.fillStyle = "#8B5CF6"; // Purple block
        this.ctx.fillRect(b.x, b.y, b.width, b.height);
        this.ctx.strokeStyle = "#A855F7";
        this.ctx.strokeRect(b.x, b.y, b.width, b.height);
        this.ctx.fillStyle = "#E0E7FF";
        this.ctx.font = "24px Arial";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText("?", b.x + b.width / 2, b.y + b.height / 2 + 2);
      } else {
        this.ctx.fillStyle = "#1E293B"; // Empty block
        this.ctx.fillRect(b.x, b.y, b.width, b.height);
      }
    }

    // Obstacles
    for (const obs of this.obstacles) {
      if (obs.isHurdle && obs.action.type === "realWork") {
        this.drawWorker(obs, scale);
        continue;
      }

      this.ctx.fillStyle = obs.isHurdle ? "#1E1B4B" : "#0F172A";

      let shadowColor = obs.isHurdle
        ? "rgba(239, 68, 68, 0.4)"
        : "rgba(139, 92, 246, 0.4)";
      let strokeColor = obs.isHurdle ? "#EF4444" : "#A855F7";
      if (
        obs.action.type === "synergyBoost" ||
        obs.action.type === "fastTrack"
      ) {
        shadowColor = "rgba(16, 185, 129, 0.6)";
        strokeColor = "#10B981";
      }

      this.ctx.shadowColor = shadowColor;
      this.ctx.shadowBlur = 8;
      this.ctx.shadowOffsetY = 0;

      // Fallback for roundRect
      if (this.ctx.roundRect) {
        this.ctx.beginPath();
        this.ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 8);
        this.ctx.fill();
      } else {
        this.ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      }
      this.ctx.shadowColor = "transparent";

      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.font = "24px Arial"; // Increased from 18px
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(
        obs.action.icon,
        obs.x + obs.width / 2,
        obs.y + obs.height / 2 + 2,
      );

      this.ctx.font = "bold 16px Arial"; // Increased from 10px and made bold
      this.ctx.fillStyle = "#94A3B8";
      this.ctx.fillText(obs.action.text, obs.x + obs.width / 2, obs.y - 12); // Moved slightly higher
    }

    // Floating Texts
    for (const ft of this.floatingTexts) {
      this.ctx.fillStyle = ft.color;
      this.ctx.globalAlpha = ft.alpha;
      this.ctx.font = "bold 32px Arial"; // Increased from 24px
      this.ctx.textAlign = "center";
      this.ctx.fillText(ft.text, ft.x, ft.y);
      this.ctx.globalAlpha = 1.0;
    }

    // Synergize Effects
    for (const ef of this.synergizeEffects) {
      this.ctx.beginPath();
      this.ctx.arc(ef.x, ef.y, ef.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(234, 179, 8, ${Math.max(0, ef.alpha)})`;
      this.ctx.lineWidth = 4;
      this.ctx.stroke();
    }

    // Fired Effects
    for (const ef of this.firedEffects) {
      this.ctx.save();
      this.ctx.translate(ef.x, ef.y);
      this.ctx.scale(ef.scale, ef.scale);
      this.ctx.rotate(-0.2); // slight angled stamp

      this.ctx.globalAlpha = ef.alpha;
      this.ctx.strokeStyle = "#EF4444"; // Red stamp
      this.ctx.lineWidth = 4;

      // Stamp border
      this.ctx.strokeRect(-60, -25, 120, 50);

      this.ctx.fillStyle = "#EF4444";
      this.ctx.font = "900 36px Impact, Arial Black, sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText("FIRED", 0, 0);

      this.ctx.restore();
    }

    // Combo Meter HUD
    if (this.comboMeter > 0) {
      const w = 150;
      this.ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
      this.ctx.fillRect(10, 10, w + 10, 30);

      this.ctx.fillStyle =
        this.comboMultiplier >= 3
          ? "#D946EF"
          : this.comboMultiplier >= 2
            ? "#A855F7"
            : "#38BDF8";
      this.ctx.fillRect(15, 15, Math.max(0, (this.comboMeter / 100) * w), 20);

      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.font = "bold 12px Arial";
      this.ctx.textAlign = "left";
      this.ctx.fillText(`🔥 COMBO: ${this.comboMultiplier}x`, 20, 30);
    }

    // Pause overlay
    if (this.isPaused && this.gameState() === "playing") {
      this.ctx.fillStyle = "rgba(6, 11, 20, 0.6)";
      this.ctx.fillRect(0, 0, canvas.width, canvas.height);
      this.ctx.fillStyle = "#38BDF8";
      this.ctx.font = "bold 36px Arial";
      this.ctx.textAlign = "center";
      this.ctx.shadowColor = "rgba(56, 189, 248, 0.5)";
      this.ctx.shadowBlur = 15;
      this.ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2 - 16);
      this.ctx.shadowColor = "transparent";
    }

    // Confetti
    if (this.confetti.length > 0) {
      for (const c of this.confetti) {
        this.ctx.save();
        this.ctx.translate(c.x, c.y);
        this.ctx.rotate(c.ang);
        this.ctx.fillStyle = c.color;
        this.ctx.fillRect(-5, -5, 10, 10);
        this.ctx.restore();
      }
    }

    // Comic Fired Overlay (Drawn right inside canvas to be funny)
    if (this.gameState() === "gameover") {
      this.ctx.fillStyle = "rgba(6, 11, 20, 0.8)";
      this.ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (this.gameOverReason.includes("FIRED")) {
        this.ctx.save();
        this.ctx.translate(canvas.width / 2, canvas.height / 2);
        this.ctx.rotate(-0.2); // Diagonal stamp
        this.ctx.strokeStyle = "#EF4444";
        this.ctx.lineWidth = 10;
        this.ctx.fillStyle = "#EF4444";
        this.ctx.shadowColor = "rgba(239, 68, 68, 0.8)";
        this.ctx.shadowBlur = 20;
        this.ctx.font = "bold 80px Courier New";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.strokeRect(-250, -80, 500, 160);
        this.ctx.fillText("FIRED", 0, 0);
        this.ctx.restore();
      }
    }

    this.ctx.restore();
  }

  handleAction(type: string) {
    if (typeof (this as Record<string, unknown>)[type] === "function") {
      ((this as Record<string, unknown>)[type] as () => void)();
    }
  }

  buySkill(skill: SkillNode) {
    if (this.unlockedSkills().includes(skill.id)) return;
    if (this.totalSynergy() < skill.cost) return;

    const depsMet = skill.dependencies.every((d) =>
      this.unlockedSkills().includes(d),
    );
    if (!depsMet) return;

    this.totalSynergy.update((s) => s - skill.cost);
    this.unlockedSkills.update((skills) => {
      const next = [...skills, skill.id];
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "corp_meta_synergy",
          this.totalSynergy().toString(),
        );
        localStorage.setItem("corp_skills", JSON.stringify(next));
      }
      return next;
    });
    this.fb.syncMeta(
      this.lifetimeEarnedSynergy(),
      this.unlockedSkills(),
      this.achievements.unlocked(),
    );
    this.trackAnalytics("skill_unlocked", {
      skill_id: skill.id,
      skill_name: skill.name,
    });
    this.playSound("levelUp");
    this.createConfetti();
  }

  hasSkill(id: string) {
    return this.unlockedSkills().includes(id);
  }

  canBuySkill(skill: SkillNode) {
    if (this.hasSkill(skill.id)) return false;
    if (this.totalSynergy() < skill.cost) return false;
    return skill.dependencies.every((d) => this.hasSkill(d));
  }
}
