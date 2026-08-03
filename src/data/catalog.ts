/**
 * A starter catalog of real recipes from publishers whose pages Forkast can
 * read. Entries are links and factual labels only.
 *
 * Deliberately no `description`, `ingredients`, or `instructions`: a recipe's
 * instructions are the publisher's writing, and shipping them in this
 * repository would be republishing them. The recipe text arrives the same way
 * every other imported recipe does — through `import-recipe`, into the
 * household's own Firestore, when someone chooses to add it.
 *
 * Every URL below was fetched and run through the real extractor
 * (`scripts/verify-catalog.ts`) on 2026-08-03; each returned a schema.org
 * Recipe with ingredients and directions. Re-run that script if entries start
 * failing — publishers move URLs, and a broken entry is a broken feature.
 */
export type CatalogEntry = {
  /** Stable slug. Used for dedupe and for the week rotation. */
  id: string;
  /** The publisher's title, a factual label for the page. */
  title: string;
  siteName: string;
  /** The canonical recipe URL. */
  url: string;
  tags: string[];
  /**
   * Rough total time from the page's own structured data. Null where the
   * publisher does not state one — an invented number would read as measured.
   */
  minutes: number | null;
};

export const catalog: CatalogEntry[] = [
  {
    id: 'bb-cajun-chicken-pasta',
    title: 'One Pot Creamy Cajun Chicken Pasta',
    siteName: 'Budget Bytes',
    url: 'https://www.budgetbytes.com/one-pot-creamy-cajun-chicken-pasta/',
    tags: ['weeknight', 'one-pot', 'pasta'],
    minutes: 30,
  },
  {
    id: 'bb-chicken-stir-fry',
    title: 'Chicken Stir Fry',
    siteName: 'Budget Bytes',
    url: 'https://www.budgetbytes.com/chicken-stir-fry/',
    tags: ['weeknight', 'skillet'],
    minutes: 35,
  },
  {
    id: 'bb-lemon-pepper-orzo',
    title: 'One Pot Lemon Pepper Chicken with Orzo',
    siteName: 'Budget Bytes',
    url: 'https://www.budgetbytes.com/lemon-pepper-chicken-with-orzo/',
    tags: ['weeknight', 'one-pot'],
    minutes: 45,
  },
  {
    id: 'bb-mac-and-cheese',
    title: 'Homemade Mac and Cheese',
    siteName: 'Budget Bytes',
    url: 'https://www.budgetbytes.com/extra-cheesy-homemade-mac-and-cheese/',
    tags: ['weeknight', 'vegetarian', 'pasta'],
    minutes: 25,
  },
  {
    id: 'rte-coconut-chicken-curry',
    title: 'Coconut Chicken Curry',
    siteName: 'RecipeTin Eats',
    url: 'https://www.recipetineats.com/coconut-chicken-curry-quick-easy/',
    tags: ['weeknight', 'curry'],
    minutes: 35,
  },
  {
    id: 'rte-three-cup-chicken',
    title: 'Taiwanese Three Cup Chicken',
    siteName: 'RecipeTin Eats',
    url: 'https://www.recipetineats.com/taiwanese-three-cup-chicken/',
    tags: ['weeknight', 'skillet'],
    minutes: 18,
  },
  {
    id: 'rte-chicken-au-poivre',
    title: "JB's Chicken au Poivre",
    siteName: 'RecipeTin Eats',
    url: 'https://www.recipetineats.com/french-chicken-au-poivre-sauce/',
    tags: ['weeknight', 'skillet'],
    minutes: 28,
  },
  {
    id: 'nyt-ratatouille-pasta',
    title: 'One-Pot Ratatouille Pasta',
    siteName: 'NYT Cooking',
    url: 'https://cooking.nytimes.com/recipes/1025450-one-pot-ratatouille-pasta',
    tags: ['weeknight', 'vegetarian', 'one-pot', 'pasta'],
    minutes: 30,
  },
  {
    id: 'nyt-cumin-green-beans-chicken',
    title: 'Stir-Fried Cumin Green Beans and Chicken',
    siteName: 'NYT Cooking',
    url: 'https://cooking.nytimes.com/recipes/784835537-stir-fried-cumin-green-beans-and-chicken',
    tags: ['weeknight', 'skillet'],
    minutes: 25,
  },
  {
    id: 'nyt-chickpeas-al-limone',
    title: 'Chickpeas al Limone With Burrata',
    siteName: 'NYT Cooking',
    url: 'https://cooking.nytimes.com/recipes/768413295-chickpeas-al-limone-with-burrata',
    tags: ['weeknight', 'vegetarian'],
    minutes: 25,
  },
  {
    id: 'nyt-lemon-chicken-asparagus',
    title: 'Lemon Chicken With Asparagus',
    siteName: 'NYT Cooking',
    url: 'https://cooking.nytimes.com/recipes/778097361-lemon-chicken-with-asparagus',
    tags: ['weeknight', 'sheet-pan'],
    minutes: 45,
  },
  {
    id: 'lal-shakshuka',
    title: 'Shakshuka',
    siteName: 'Love and Lemons',
    url: 'https://www.loveandlemons.com/shakshuka-recipe/',
    tags: ['vegetarian', 'breakfast', 'skillet'],
    minutes: 35,
  },
  {
    id: 'lal-lentil-soup',
    title: 'Best Lentil Soup',
    siteName: 'Love and Lemons',
    url: 'https://www.loveandlemons.com/lentil-soup/',
    tags: ['vegetarian', 'soup', 'make-ahead'],
    minutes: 60,
  },
  {
    id: 'lal-sheet-pan-gnocchi',
    title: 'Sheet Pan Gnocchi',
    siteName: 'Love and Lemons',
    url: 'https://www.loveandlemons.com/sheet-pan-gnocchi/',
    tags: ['weeknight', 'vegetarian', 'sheet-pan'],
    minutes: 40,
  },
  {
    id: 'lal-vegetarian-chili',
    title: 'Vegetarian Chili',
    siteName: 'Love and Lemons',
    url: 'https://www.loveandlemons.com/vegetarian-chili-recipe/',
    tags: ['vegetarian', 'one-pot', 'make-ahead'],
    minutes: 45,
  },
  {
    id: 'poy-black-bean-tacos',
    title: 'Crispy Black Bean Tacos with Cilantro Lime Sauce',
    siteName: 'Pinch of Yum',
    url: 'https://pinchofyum.com/crispy-black-bean-tacos-with-cilantro-lime-sauce',
    tags: ['weeknight', 'vegetarian'],
    minutes: 25,
  },
  {
    id: 'poy-chicken-tinga-tacos',
    title: 'The Best Chicken Tinga Tacos',
    siteName: 'Pinch of Yum',
    url: 'https://pinchofyum.com/the-best-chicken-tinga-tacos',
    tags: ['weeknight'],
    minutes: 20,
  },
  {
    id: 'poy-tortellini-soup',
    title: "Ang's Creamy Tortellini Soup",
    siteName: 'Pinch of Yum',
    url: 'https://pinchofyum.com/tortellini-soup',
    tags: ['weeknight', 'soup', 'one-pot'],
    minutes: 40,
  },
  {
    id: 'bbc-easy-chicken-curry',
    title: 'Easy chicken curry',
    siteName: 'BBC Good Food',
    url: 'https://www.bbcgoodfood.com/recipes/easy-chicken-curry',
    tags: ['weeknight', 'curry'],
    minutes: 50,
  },
  {
    id: 'bbc-lentil-coconut-curry',
    title: 'Speedy lentil coconut curry',
    siteName: 'BBC Good Food',
    url: 'https://www.bbcgoodfood.com/recipes/speedy-lentil-coconut-curry',
    tags: ['weeknight', 'vegetarian', 'curry'],
    minutes: 25,
  },
  {
    id: 'bbc-salmon-leek-traybake',
    title: 'Creamy salmon, leek & potato traybake',
    siteName: 'BBC Good Food',
    url: 'https://www.bbcgoodfood.com/recipes/creamy-salmon-leek-potato-traybake',
    tags: ['weeknight', 'sheet-pan', 'fish'],
    minutes: 40,
  },
  {
    id: 'bbc-chicken-pasta-bake',
    title: 'Chicken pasta bake',
    siteName: 'BBC Good Food',
    url: 'https://www.bbcgoodfood.com/recipes/chicken-pasta-bake',
    tags: ['pasta', 'make-ahead'],
    minutes: 75,
  },
  {
    id: 'mb-chickpea-taco-salad',
    title: 'Vegan Sweet Potato Chickpea Taco Salad',
    siteName: 'Minimalist Baker',
    url: 'https://minimalistbaker.com/vegan-chickpea-taco-salad/',
    tags: ['vegetarian', 'salad'],
    minutes: 30,
  },
  {
    id: 'mb-black-eyed-pea-soup',
    title: 'Creamy Curried Black Eyed Pea Soup',
    siteName: 'Minimalist Baker',
    url: 'https://minimalistbaker.com/curried-black-eyed-pea-soup/',
    tags: ['vegetarian', 'soup', 'one-pot'],
    minutes: 60,
  },
  {
    id: 'mb-morning-glory-muffins',
    title: 'Vegan Gluten-Free Morning Glory Muffins',
    siteName: 'Minimalist Baker',
    url: 'https://minimalistbaker.com/vegan-gluten-free-morning-glory-muffins/',
    tags: ['breakfast', 'baking', 'vegetarian'],
    minutes: 35,
  },
  {
    id: 'ba-pasta-alla-vodka',
    title: 'Pasta Alla Vodka',
    siteName: 'Bon Appétit',
    url: 'https://www.bonappetit.com/recipe/rigatoni-with-easy-vodka-sauce',
    tags: ['vegetarian', 'pasta'],
    minutes: null,
  },
  {
    id: 'ba-crispy-tofu-peanut-sauce',
    title: 'Crispy Tofu With Peanut Sauce',
    siteName: 'Bon Appétit',
    url: 'https://www.bonappetit.com/recipe/tofu-peanut-sauce',
    tags: ['weeknight', 'vegetarian'],
    minutes: null,
  },
  {
    id: 'ba-hot-honey-salmon',
    title: 'Hot Honey–Glazed Salmon',
    siteName: 'Bon Appétit',
    url: 'https://www.bonappetit.com/recipe/hot-honey-glazed-salmon',
    tags: ['weeknight', 'fish'],
    minutes: null,
  },
  {
    id: 'epi-caramelized-onion-pasta',
    title: 'Caramelized Onion Pasta',
    siteName: 'Epicurious',
    url: 'https://www.epicurious.com/recipes/food/views/caramelized-onion-pasta',
    tags: ['vegetarian', 'pasta'],
    minutes: null,
  },
  {
    id: 'epi-buttermilk-pancakes',
    title: 'Fluffy Diner-Style Buttermilk Pancakes',
    siteName: 'Epicurious',
    url: 'https://www.epicurious.com/recipes/food/views/diner-style-buttermilk-pancakes',
    tags: ['breakfast', 'vegetarian'],
    minutes: null,
  },
  {
    id: 'epi-butter-paneer',
    title: 'Baked Butter Paneer',
    siteName: 'Epicurious',
    url: 'https://www.epicurious.com/recipes/food/views/baked-butter-paneer',
    tags: ['vegetarian', 'curry'],
    minutes: null,
  },
  {
    id: 'fn-kimchi-ramen',
    title: '10-Minute Chicken, Corn and Kimchi Ramen',
    siteName: 'Food Network',
    url: 'https://www.foodnetwork.com/recipes/food-network-kitchen/10-minute-chicken-corn-and-kimchi-ramen-3363134',
    tags: ['weeknight', 'soup'],
    minutes: null,
  },
  {
    id: 'fn-beef-pho',
    title: '1-Hour Beef Pho',
    siteName: 'Food Network',
    url: 'https://www.foodnetwork.com/recipes/food-network-kitchen/1-hour-beef-pho-12572145',
    tags: ['soup'],
    minutes: null,
  },
  {
    id: 'fn-pasta-e-fagioli',
    title: '"16 Bean" Pasta E Fagioli',
    siteName: 'Food Network',
    url: 'https://www.foodnetwork.com/recipes/ina-garten/16-bean-pasta-e-fagioli-3612570',
    tags: ['soup', 'make-ahead'],
    minutes: null,
  },
  {
    id: 'fdc-beef-and-broccoli',
    title: 'The Best Easy Beef and Broccoli Stir-Fry',
    siteName: 'Food.com',
    url: 'https://www.food.com/recipe/the-best-easy-beef-and-broccoli-stir-fry-99476',
    tags: ['weeknight', 'skillet'],
    minutes: 25,
  },
  {
    id: 'fdc-fajitas',
    title: 'Steak (Or Chicken) Fajitas',
    siteName: 'Food.com',
    url: 'https://www.food.com/recipe/steak-or-chicken-fajitas-63786',
    tags: ['weeknight'],
    minutes: 20,
  },
  {
    id: 'fdc-chicken-noodle-soup',
    title: 'Homemade Chicken Noodle Soup',
    siteName: 'Food.com',
    url: 'https://www.food.com/recipe/homemade-chicken-noodle-soup-8528',
    tags: ['soup', 'make-ahead'],
    minutes: 360,
  },
  {
    id: 'toh-shrimp-linguine',
    title: 'Shrimp Linguine with Saffron Sauce',
    siteName: 'Taste of Home',
    url: 'https://www.tasteofhome.com/recipes/shrimp-linguine-with-saffron-sauce/',
    tags: ['weeknight', 'pasta', 'fish'],
    minutes: 25,
  },
  {
    id: 'toh-blueberry-brie-grilled-cheese',
    title: 'Blueberry Brie Grilled Cheese',
    siteName: 'Taste of Home',
    url: 'https://www.tasteofhome.com/recipes/blueberry-brie-grilled-cheese/',
    tags: ['vegetarian', 'lunch'],
    minutes: 35,
  },
  {
    id: 'delish-halloumi-skewers',
    title: 'Greek Chicken & Halloumi Skewers',
    siteName: 'Delish',
    url: 'https://www.delish.com/cooking/recipe-ideas/a73288337/greek-chicken-and-halloumi-skewers-recipe/',
    tags: ['grilling'],
    minutes: 60,
  },
  {
    id: 'delish-ham-cheese-brunch-bake',
    title: 'Ham & Cheese Brunch Bake',
    siteName: 'Delish',
    url: 'https://www.delish.com/cooking/recipe-ideas/a50777/ham-cheese-brunch-bake-recipe/',
    tags: ['breakfast', 'make-ahead'],
    minutes: 75,
  },
  {
    id: 'sba-banana-muffins',
    title: 'Quick & Easy Banana Muffins',
    siteName: "Sally's Baking Addiction",
    url: 'https://sallysbakingaddiction.com/banana-muffins/',
    tags: ['baking', 'breakfast'],
    minutes: 30,
  },
  {
    id: 'sba-brown-butter-cookies',
    title: 'Brown Butter Chocolate Chip Cookies',
    siteName: "Sally's Baking Addiction",
    url: 'https://sallysbakingaddiction.com/brown-butter-chocolate-chip-cookies/',
    tags: ['baking'],
    minutes: 300,
  },
  {
    id: 'kab-sheet-pan-pizza',
    title: 'Gluten-Free Sheet Pan Pizza',
    siteName: 'King Arthur Baking',
    url: 'https://www.kingarthurbaking.com/recipes/gluten-free-sheet-pan-pizza-recipe',
    tags: ['baking', 'vegetarian'],
    minutes: 180,
  },
  {
    id: 'kab-mini-cheesecakes',
    title: 'Mini Cheesecakes',
    siteName: 'King Arthur Baking',
    url: 'https://www.kingarthurbaking.com/recipes/mini-cheesecakes-recipe',
    tags: ['baking'],
    minutes: 300,
  },
];
