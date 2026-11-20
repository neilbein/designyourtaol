/* ============================================================
   DesignYourTaol — Mock data layer
   Front-end only. Structured so it can be swapped for real API
   responses later (see service functions in storage.js).
   ============================================================ */

/* ---------- Coffin models (catalog) ---------- */
const coffinModels = [
  {
    id: "classic-elegance",
    name: "Classic Elegance",
    tagline: "Traditional premium coffin",
    description: "A timeless silhouette finished with clean lines and a dignified profile, suited for a traditional service.",
    price: 25000,
    material: "Premium Wood",
    style: "Traditional",
    defaultColor: "walnut",
    shape: "classic"
  },
  {
    id: "royal-heritage",
    name: "Royal Heritage",
    tagline: "Luxury design with decorative details",
    description: "An ornamental design with raised trim and a richer finish, for families who want a more decorated presentation.",
    price: 35000,
    material: "Mahogany",
    style: "Luxury",
    defaultColor: "mahogany",
    shape: "classic"
  },
  {
    id: "modern-serenity",
    name: "Modern Serenity",
    tagline: "Minimal modern coffin",
    description: "Understated and contemporary, with soft edges and a quiet, uncluttered surface.",
    price: 28000,
    material: "Engineered Wood",
    style: "Modern",
    defaultColor: "black",
    shape: "tapered"
  },
  {
    id: "classic-wood",
    name: "Classic Wood",
    tagline: "Natural wood aesthetic",
    description: "Natural grain and warm tones for a design that favors material honesty over ornamentation.",
    price: 26500,
    material: "Natural Oak",
    style: "Natural",
    defaultColor: "natural-wood",
    shape: "classic"
  },
  {
    id: "premium-gold",
    name: "Premium Gold",
    tagline: "Luxury decorative finish",
    description: "A statement design with gold trim and hardware, built for a ceremonial presentation.",
    price: 42000,
    material: "Mahogany",
    style: "Ceremonial",
    defaultColor: "dark-brown",
    shape: "tapered"
  },
  {
    id: "simple-grace",
    name: "Simple Grace",
    tagline: "Minimal and elegant design",
    description: "A gentle, restrained design with soft satin tones — quiet elegance without excess detail.",
    price: 23000,
    material: "Engineered Wood",
    style: "Minimal",
    defaultColor: "white",
    shape: "tapered"
  }
];

/* ---------- Colors ---------- */
const colorOptions = [
  /* Classic */
  { id: "black",        name: "Black",         hex: "#15171a", group: "Classic" },
  { id: "charcoal",     name: "Charcoal",       hex: "#2d3035", group: "Classic" },
  { id: "graphite",     name: "Graphite",       hex: "#4a4f56", group: "Classic" },
  { id: "white",        name: "White",          hex: "#e9eceb", group: "Classic" },
  { id: "pearl",        name: "Pearl White",    hex: "#f0ede4", group: "Classic" },
  { id: "ivory",        name: "Ivory",          hex: "#e8e0cc", group: "Classic" },
  /* Wood */
  { id: "ebony",        name: "Ebony",          hex: "#1a1210", group: "Wood" },
  { id: "dark-brown",   name: "Dark Brown",     hex: "#3b2618", group: "Wood" },
  { id: "walnut",       name: "Walnut",         hex: "#5a3a26", group: "Wood" },
  { id: "mahogany",     name: "Mahogany",       hex: "#6b1f1f", group: "Wood" },
  { id: "cherry",       name: "Cherry",         hex: "#7c2a2a", group: "Wood" },
  { id: "teak",         name: "Teak",           hex: "#8a6a3c", group: "Wood" },
  { id: "natural-wood", name: "Natural Oak",    hex: "#b98a53", group: "Wood" },
  { id: "ash",          name: "Ash",            hex: "#c8b89a", group: "Wood" },
  /* Metallic */
  { id: "gold",         name: "Gold",           hex: "#d4af37", group: "Metallic" },
  { id: "rose-gold",    name: "Rose Gold",      hex: "#c9956c", group: "Metallic" },
  { id: "copper",       name: "Copper",         hex: "#b87333", group: "Metallic" },
  { id: "bronze",       name: "Bronze",         hex: "#8c5a2b", group: "Metallic" },
  { id: "silver",       name: "Silver",         hex: "#c0c0c8", group: "Metallic" },
  { id: "gunmetal",     name: "Gunmetal",       hex: "#3d4046", group: "Metallic" },
  /* Tones */
  { id: "midnight",     name: "Midnight",       hex: "#1a1a2e", group: "Tones" },
  { id: "navy",         name: "Navy Blue",      hex: "#1a2a4a", group: "Tones" },
  { id: "forest",       name: "Forest Green",   hex: "#1a3a26", group: "Tones" },
  { id: "burgundy",     name: "Burgundy",       hex: "#4a0e1a", group: "Tones" },
  { id: "slate",        name: "Slate Gray",     hex: "#4a5560", group: "Tones" },
  { id: "mauve",        name: "Mauve",          hex: "#6b4c5e", group: "Tones" },
  /* Custom (free picker) */
  { id: "custom",       name: "Custom",         hex: "#00e676", group: "Custom" }
];

/* ---------- Materials (physical props feed the Three.js material) ---------- */
const materialOptions = [
  { id: "mahogany",       name: "Mahogany",       price: 5000, roughness: 0.42, metalness: 0.0 },
  { id: "oak",             name: "Oak",             price: 3500, roughness: 0.48, metalness: 0.0 },
  { id: "walnut",          name: "Walnut",          price: 4200, roughness: 0.4,  metalness: 0.0 },
  { id: "natural-wood",    name: "Natural Wood",    price: 2500, roughness: 0.5,  metalness: 0.0 },
  { id: "gloss-finish",    name: "Gloss Finish",    price: 3000, roughness: 0.15, metalness: 0.05 },
  { id: "matte-finish",    name: "Matte Finish",    price: 1500, roughness: 0.75, metalness: 0.0 },
  { id: "premium-finish",  name: "Premium Finish",  price: 6000, roughness: 0.22, metalness: 0.08 }
];

/* ---------- Finish (gloss level slider 0-100) ---------- */
const finishPresets = [
  { id: "matte",  name: "Matte",         gloss: 10 },
  { id: "satin",  name: "Satin",         gloss: 45 },
  { id: "glossy", name: "Glossy",        gloss: 75 },
  { id: "premium",name: "Premium Polish",gloss: 95 }
];

/* ---------- Handles ---------- */
const handleOptions = [
  { id: "classic", name: "Classic", price: 0,    color: "#8a8f94", metalness: 0.5, roughness: 0.4 },
  { id: "gold",    name: "Gold",    price: 2500, color: "#d4af37", metalness: 0.85,roughness: 0.2 },
  { id: "silver",  name: "Silver",  price: 2200, color: "#c7ccd1", metalness: 0.9, roughness: 0.18 },
  { id: "black",   name: "Black",   price: 1200, color: "#1c1c1e", metalness: 0.6, roughness: 0.35 },
  { id: "bronze",  name: "Bronze",  price: 1800, color: "#8c5a2b", metalness: 0.75,roughness: 0.3 },
  { id: "premium", name: "Premium", price: 3200, color: "#e8d9a0", metalness: 0.9, roughness: 0.12 }
];

/* ---------- Decorations (toggleable) ---------- */
const decorationOptions = [
  { id: "cross",          name: "Cross",              price: 1200 },
  { id: "floral",         name: "Floral Decoration",  price: 1500 },
  { id: "border",         name: "Decorative Border",  price: 900  },
  { id: "gold-trim",      name: "Gold Trim",          price: 2000 },
  { id: "silver-trim",    name: "Silver Trim",        price: 1700 },
  { id: "corner-ornament",name: "Corner Ornaments",   price: 1100 },
  { id: "emblem",         name: "Custom Emblem",      price: 1600 }
];

/* ---------- Patterns (rendered as a generated canvas texture) ---------- */
const patternOptions = [
  { id: "none",      name: "None" },
  { id: "classic",   name: "Classic" },
  { id: "floral",    name: "Floral" },
  { id: "geometric", name: "Geometric" },
  { id: "royal",     name: "Royal" },
  { id: "minimal",   name: "Minimal" },
  { id: "cross",     name: "Cross Pattern" }
];

/* ---------- Interior ---------- */
const interiorColorOptions = [
  { id: "white", name: "White", hex: "#f1efe9" },
  { id: "cream", name: "Cream", hex: "#e6d9bd" },
  { id: "black", name: "Black", hex: "#141414" },
  { id: "gray",  name: "Gray",  hex: "#8a8d90" },
  { id: "beige", name: "Beige", hex: "#d8c6a8" }
];
const interiorMaterialOptions = [
  { id: "satin",      name: "Satin",      price: 1500, roughness: 0.3, metalness: 0.0 },
  { id: "velvet",     name: "Velvet",     price: 2200, roughness: 0.85,metalness: 0.0 },
  { id: "soft-fabric",name: "Soft Fabric",price: 1000, roughness: 0.65,metalness: 0.0 }
];
const interiorStyleOptions = [
  { id: "classic", name: "Classic" },
  { id: "premium", name: "Premium" },
  { id: "minimal", name: "Minimal" }
];

/* ---------- Accessories ---------- */
const accessoryOptions = [
  { id: "pillow",   name: "Pillow",             price: 800  },
  { id: "cross-acc",name: "Cross",              price: 1200 },
  { id: "flowers",  name: "Flowers",            price: 1800 },
  { id: "nameplate",name: "Name Plate",         price: 1400 },
  { id: "ribbon",   name: "Decorative Ribbon",  price: 600  },
  { id: "lining",   name: "Premium Lining",     price: 2500 },
  { id: "corners",  name: "Corner Ornaments",   price: 1100 }
];

/* ---------- Text fonts / positions ---------- */
const textFontOptions = [
  { id: "elegant", name: "Elegant", css: "'Manrope', serif" },
  { id: "classic", name: "Classic", css: "'Inter', serif" },
  { id: "modern",  name: "Modern",  css: "'Manrope', sans-serif" }
];
const textPositionOptions = [
  { id: "center", name: "Center" },
  { id: "top",    name: "Top" },
  { id: "bottom", name: "Bottom" }
];

/* ---------- Feature list (marketing) ---------- */
const featureList = [
  { title: "3D Customization",        desc: "Adjust color, material and detail on a true 3D coffin model — not a static photo." },
  { title: "360° Preview",            desc: "Rotate freely to inspect every angle before you decide." },
  { title: "Real-Time Changes",       desc: "Every option you choose updates the model instantly, with no reload." },
  { title: "Material Selection",      desc: "Compare wood tones, finishes and premium materials side by side." },
  { title: "Color Customization",     desc: "Choose from curated tones or fine-tune your own." },
  { title: "Decoration Controls",     desc: "Toggle trims, borders and ornamental details on or off." },
  { title: "Price Estimation",        desc: "See an estimated total that updates as you design." },
  { title: "Save Design",             desc: "Keep your design saved locally and return to it anytime." },
  { title: "Quotation Submission",    desc: "Prepare your finished design for formal quotation." }
];

/* ---------- Traditional vs DesignYourTaol comparison ---------- */
const comparisonData = {
  traditional: [
    "Limited choices",
    "Manual customization",
    "Verbal descriptions",
    "Difficult visualization",
    "Miscommunication",
    "Multiple revisions",
    "Longer processing"
  ],
  designyourtaol: [
    "More customization",
    "Digital design",
    "Visual interface",
    "3D preview",
    "Clear preferences",
    "Easy editing",
    "Faster finalization"
  ]
};

/* ---------- Benefits ---------- */
const benefitsData = {
  customer: [
    "Personalized experience",
    "Better visualization",
    "Easier decision-making",
    "Convenience",
    "Clear expectations"
  ],
  business: [
    "Improved efficiency",
    "Fewer errors",
    "Faster processing",
    "Better customer satisfaction",
    "Competitive advantage"
  ]
};

/* ---------- How it works ---------- */
const howItWorksSteps = [
  { num: "01", title: "Choose a Model",        desc: "Browse curated coffin models and pick a starting point." },
  { num: "02", title: "Customize",              desc: "Adjust color, material, handles, decorations and interior." },
  { num: "03", title: "Preview in 3D",          desc: "Rotate, zoom and inspect your design from every angle." },
  { num: "04", title: "Finalize Your Design",   desc: "Review the summary, confirm, and submit for quotation." }
];

/* ---------- Base pricing helper ---------- */
function getBasePrice(modelId){
  const m = coffinModels.find(c => c.id === modelId);
  return m ? m.price : 0;
}