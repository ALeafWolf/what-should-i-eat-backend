import type { EvalSeedRow } from "../../schemas/dataset.schemas.js";

const g = (text: string, rating: number, id: string) => ({
  text,
  rating,
  source: "google_places" as const,
  date: "2025-08-01T12:00:00Z",
  author: `reviewer_${id}`,
});

/**
 * Hand-curated seed rows for Phase 1 calibration. Reviews are synthetic but realistic.
 */
export const SEED_EXAMPLES: EvalSeedRow[] = [
  {
    inputs: {
      restaurantName: "Bright Noodle House",
      language: "en",
      snippets: [
        g("Best hand-pulled noodles I've had in years. The broth is rich and the lamb is tender.", 5, "a"),
        g("Consistently excellent. Spicy cumin lamb noodles are a must.", 5, "b"),
        g("Great flavors, fair prices, friendly staff. Will be back weekly.", 5, "c"),
        g("Food came fast and hot. Portions are generous.", 4, "d"),
      ],
    },
    metadata: {
      difficulty: "easy",
      scenario_tags: ["strong_positive", "clear_consensus"],
      curation_source: "manual",
      restaurant: { area: "Toronto, ON", cuisine: "Chinese", rating: 4.6, userRatingCount: 420 },
      userQuery: { area: "Toronto", cuisine: "Chinese noodles", budget: 25, preferences: ["spicy"] },
      expected_risk: "overgeneralization",
      label_notes: "Mostly 5s; summary should not invent negatives.",
    },
  },
  {
    inputs: {
      restaurantName: "Grey Harbor Diner",
      language: "en",
      snippets: [
        g("Cold food, rude server, waited 45 minutes for toast.", 1, "a"),
        g("Dirty tables and wrong order twice. Avoid.", 1, "b"),
        g("Worst brunch experience in the city.", 2, "c"),
        g("Coffee was okay but everything else was a mess.", 2, "d"),
      ],
    },
    metadata: {
      difficulty: "easy",
      scenario_tags: ["strong_negative", "clear_consensus"],
      curation_source: "manual",
      restaurant: { area: "Seattle, WA", cuisine: "American", rating: 2.1, userRatingCount: 88 },
      userQuery: { area: "Seattle", cuisine: "brunch" },
      label_notes: "Uniformly negative; balance still matters but skew is clear.",
    },
  },
  {
    inputs: {
      restaurantName: "Maple & Smoke BBQ",
      language: "en",
      snippets: [
        g("Ribs were incredible — fall-off-the-bone. Lines are long on weekends.", 5, "a"),
        g("Amazing brisket but we waited over an hour for a table.", 4, "b"),
        g("Food is top tier. Service was chaotic and they forgot our sides.", 4, "c"),
        g("Meat quality is great. Not a place if you're in a hurry.", 4, "d"),
        g("Overhyped. Meat was dry and sides were bland.", 2, "e"),
      ],
    },
    metadata: {
      difficulty: "medium",
      scenario_tags: ["mixed_reviews", "food_positive_service_wait"],
      curation_source: "manual",
      restaurant: { area: "Austin, TX", cuisine: "BBQ", rating: 4.2, userRatingCount: 2100 },
      expected_risk: "hiding_mixed_sentiment",
      label_notes: "Most love the meat; wait times and service issues are real themes; one strong negative.",
    },
    referenceOutput: {
      reviewSummary:
        "Reviewers often praise the smoked meats, especially ribs and brisket, but several mention long waits and inconsistent service. A minority found the food dry or bland.",
      positives: ["Strong praise for ribs and brisket", "High meat quality mentioned often"],
      complaints: ["Long waits / crowded on weekends", "Chaotic or slow service in some visits"],
      recommendedDishes: ["Ribs", "Brisket"],
    },
  },
  {
    inputs: {
      restaurantName: "Tiny Dumpling Window",
      language: "en",
      snippets: [
        g("Soup dumplings were perfect. Cash only.", 5, "a"),
        g("Small menu but everything we tried was excellent.", 5, "b"),
      ],
    },
    metadata: {
      difficulty: "medium",
      scenario_tags: ["sparse_reviews", "limited_evidence"],
      curation_source: "manual",
      restaurant: { area: "Vancouver, BC", cuisine: "Chinese", rating: 4.8, userRatingCount: 34 },
      expected_risk: "overgeneralization",
      label_notes: "Only two reviews — broad claims about 'everyone' or many themes are unsupported.",
    },
  },
  {
    inputs: {
      restaurantName: "Harbor Catch Seafood",
      language: "en",
      snippets: [
        g("Server was attentive and knowledgeable about the fish.", 5, "a"),
        g("Our waiter ignored us for 20 minutes; food was fine.", 3, "b"),
        g("Great oysters. Staff seemed overwhelmed on a Friday night.", 4, "c"),
        g("Friendly host, but the main server was cold and rushed.", 3, "d"),
      ],
    },
    metadata: {
      difficulty: "medium",
      scenario_tags: ["conflicting_service", "mixed_sentiment"],
      curation_source: "manual",
      restaurant: { area: "Boston, MA", cuisine: "Seafood", rating: 4.0, userRatingCount: 560 },
      expected_risk: "overstates_consensus",
      label_notes: "Service is genuinely mixed; 'great service' or 'terrible service' alone is wrong.",
    },
  },
  {
    inputs: {
      restaurantName: "Copper Pot Bistro",
      language: "en",
      snippets: [
        g("Tasty pasta but small portions for $32.", 3, "a"),
        g("Flavor was there; I left hungry given the bill.", 3, "b"),
        g("Excellent wine list and cozy room. Mains felt a bit pricey for the size.", 4, "c"),
        g("Dessert was the highlight. Mains were just okay portion-wise.", 4, "d"),
      ],
    },
    metadata: {
      difficulty: "medium",
      scenario_tags: ["value_concern", "mixed_reviews"],
      curation_source: "manual",
      restaurant: { area: "Chicago, IL", cuisine: "Italian", rating: 4.1, userRatingCount: 900 },
      userQuery: { area: "Chicago", cuisine: "Italian", budget: 45 },
      expected_risk: "omits_major_caveat",
      label_notes: "Portion/value is a recurring theme.",
    },
  },
  {
    inputs: {
      restaurantName: "老城饺子馆",
      language: "zh",
      snippets: [
        g("饺子皮很劲道，三鲜馅很鲜。环境一般，有点吵。", 5, "a"),
        g("上菜快，价格实惠。就是座位有点挤。", 4, "b"),
        g("味道不错，但服务基本靠自己找服务员。", 3, "c"),
      ],
    },
    metadata: {
      difficulty: "hard",
      scenario_tags: ["non_english", "mixed_sentiment", "value_positive"],
      curation_source: "manual",
      restaurant: { area: "Beijing", cuisine: "Chinese", rating: 4.3, userRatingCount: 1200 },
      userQuery: { area: "Beijing", cuisine: "dumplings", language: "zh" },
      label_notes: "Judge and summarizer should respect zh output when language is zh.",
    },
  },
  {
    inputs: {
      restaurantName: "The Neutral Grill",
      language: "en",
      snippets: [
        g("Solid neighborhood spot. Nothing blew me away but I'd go back.", 3, "a"),
        g("Steak was cooked right. Atmosphere is pretty generic.", 3, "b"),
        g("Okay for a business lunch — reliable, not memorable.", 4, "c"),
      ],
    },
    metadata: {
      difficulty: "medium",
      scenario_tags: ["no_standout_dishes", "muted_sentiment"],
      curation_source: "manual",
      restaurant: { area: "Denver, CO", cuisine: "Steakhouse", rating: 3.7, userRatingCount: 210 },
      expected_risk: "overhyping",
      label_notes: "No specific dish is a hero; invented 'must-try' dishes would fail dish_recommendation.",
    },
  },
  {
    inputs: {
      restaurantName: "Spice Route Express",
      language: "en",
      snippets: [
        g("Chicken tikka masala was buttery and delicious.", 5, "a"),
        g("Good curry but one review said naan was stale — ours was fresh.", 4, "b"),
        g("Love the lunch buffet variety.", 5, "c"),
        g("Buffet was lukewarm during our visit.", 2, "d"),
        g("Friendly owner; food quality varies by day.", 3, "e"),
      ],
    },
    metadata: {
      difficulty: "hard",
      scenario_tags: ["buffet_mixed", "food_mixed"],
      curation_source: "manual",
      restaurant: { area: "Markham, ON", cuisine: "Indian", rating: 4.0, userRatingCount: 650 },
      expected_risk: "hiding_mixed_sentiment",
      label_notes: "Buffet temperature and consistency split; tikka masala gets praise.",
    },
    referenceOutput: {
      reviewSummary:
        "Chicken tikka masala and the lunch buffet get praise from several reviewers, but buffet temperature and inconsistent quality come up as concerns.",
      positives: ["Praised chicken tikka masala", "Lunch buffet variety appreciated by some"],
      complaints: ["Some negative experiences with buffet temperature", "Inconsistent quality mentioned"],
      recommendedDishes: ["Chicken tikka masala"],
    },
  },
];
