let selectedItem = "";

/* PAGE SWITCH — browsing is open to everyone, no gating here */
const authRequiredPages = ["dashboard","veg","nonveg","juice","icecream","cakes","address","success"];

function show(id){
  if(authRequiredPages.includes(id) && localStorage.getItem("loggedIn")!=="true"){
    id = "login";
  }
  document.querySelectorAll(".container").forEach(c=>c.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({top:0,behavior:"smooth"});
}

/* "Order Now" on Home — go straight to dashboard if logged in, else login first */
function enterDashboard(){
  if(localStorage.getItem("loggedIn")==="true"){
    show("dashboard");
  } else {
    show("login");
  }
}

function updateNav(){
  const loggedIn = localStorage.getItem("loggedIn")==="true";
  document.getElementById("topNavLoggedOut").style.display = loggedIn ? "none" : "flex";
  document.getElementById("topNavLoggedIn").style.display = loggedIn ? "flex" : "none";
  if(loggedIn){
    const uname = localStorage.getItem("name") || "there";
    document.getElementById("hiUser").textContent = "Hi, " + uname;
    document.getElementById("dashHi").textContent = "Welcome back, " + uname + "!";
  }
}

/* SIGN IN */
async function register(){
  const n = document.getElementById("name").value.trim();
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("pass").value.trim();

  const res = await fetch("https://ultimate-platypus-93.hasura.app/v1/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": "IAWrXzoSLAqD8ft6pBTG6L1AK0Ed4AcT56Bfaw30mqy2YEMiVsFYVlNDUsGsLv6F"
    },
    body: JSON.stringify({
      query: `
        mutation {
          insert_users(objects: {
            name: "${n}",
            username: "${u}",
            password: "${p}"
          }) {
            returning { id }
          }
        }
      `
    })
  });

  const data = await res.json();

  if(data.errors){
    alert("User exists!");
  } else {
    alert("Registered!");
    show("login");
  }
}

/* LOGIN — after success, resume checkout if there was a pending order, else go to dashboard */
async function login(){
  const u = document.getElementById("loginUsername").value.trim();
  const p = document.getElementById("loginPass").value.trim();

  const res = await fetch("https://ultimate-platypus-93.hasura.app/v1/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": "IAWrXzoSLAqD8ft6pBTG6L1AK0Ed4AcT56Bfaw30mqy2YEMiVsFYVlNDUsGsLv6F"
    },
    body: JSON.stringify({
      query: `
        query {
          users(where: {
            username: {_eq: "${u}"},
            password: {_eq: "${p}"}
          }) {
            name
          }
        }
      `
    })
  });

  const data = await res.json();

  if(data.data.users.length > 0){
    localStorage.setItem("loggedIn","true");
    localStorage.setItem("username", u);
    localStorage.setItem("name", data.data.users[0].name);
    updateNav();
    show("dashboard");
  } else {
    alert("Invalid login");
  }
}
/* LOGOUT */
function logout(){
  localStorage.removeItem("loggedIn");
  updateNav();
  show("home");
}

/* BUY — requires login before checkout */
let selectedPrice = 0;
let selectedImg = "";
let selectedEmoji = "🍽";

function buy(item, price, img, emoji){
  selectedItem = item;
  selectedPrice = price;
  selectedImg = img || photoCache[item] || "";
  selectedEmoji = emoji || "🍽";
  if(localStorage.getItem("loggedIn")==="true"){
    renderOrderSummary();
    show("address");
  } else {
    show("login");
  }
}

function renderOrderSummary(){
  const box = document.getElementById("orderSummary");
  if(!box || !selectedItem) return;
  const deliveryFee = 20;
  const total = selectedPrice + deliveryFee;
  box.innerHTML = `
    <div class="order-item-row">
      ${selectedImg ? `<img src="${selectedImg}" alt="${selectedItem}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1544025162-d76694265947?w=200&auto=format&fit=crop';">` : `<div class="img-ph small">${selectedEmoji}</div>`}
      <div class="order-item-info">
        <span class="order-item-name">${selectedItem}</span>
        <span class="order-item-qty">Qty: 1</span>
      </div>
      <span class="order-item-price">₹${selectedPrice}</span>
    </div>
    <div class="order-line"><span>Delivery Fee</span><span>₹${deliveryFee}</span></div>
    <div class="order-line"><span>Estimated Delivery</span><span>30–40 mins</span></div>
    <div class="order-line total"><span>Total</span><span>₹${total}</span></div>
  `;
}

/* CONFIRM ORDER */
async function confirmOrder(){
  const a = document.getElementById("addr").value;
  const p = document.getElementById("phone").value;

  const username = localStorage.getItem("username");

  await fetch("https://ultimate-platypus-93.hasura.app/v1/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": "IAWrXzoSLAqD8ft6pBTG6L1AK0Ed4AcT56Bfaw30mqy2YEMiVsFYVlNDUsGsLv6F"
    },
    body: JSON.stringify({
      query: `
        mutation {
          insert_orders(objects: {
            username: "${username}",
            item: "${selectedItem}",
            price: ${selectedPrice},
            address: "${a}",
            phone: "${p}"
          }) {
            returning { id }
          }
        }
      `
    })
  });

  alert("Order placed!");
  show("success");
}
/* Success chime — synthesized so it always plays, no external audio file needed */
function playSuccessSound(){
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i)=>{
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const startTime = ctx.currentTime + i*0.12;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime+0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime+0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime+0.4);
    });
  }catch(e){ /* audio not available — fail silently */ }
}

/* ---------- MENU DATA (name, price, image, type, desc, badge, emoji) ----------
   If image is "", a real photo is loaded automatically (see REAL PHOTOS below). */
const veg = [
["Paneer Butter Masala",180,"https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400","veg","Creamy tomato gravy, cottage cheese cubes","Bestseller","🍛"],
["Veg Biryani",130,"https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400","veg","Basmati rice layered with garden vegetables","","🍚"],
["Samosa",40,"https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400","veg","Crispy pastry stuffed with spiced potato","Popular","🥟"],
["Veg Fried Rice",110,"https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400","veg","Wok-tossed rice with fresh vegetables","","🍚"],
["Masala Dosa",80,"","veg","Crisp dosa with spiced potato masala, chutney and sambar","Popular","🥞"],
["Idli Sambar",60,"","veg","Four soft idlis with sambar and coconut chutney","","🍥"],
["Chole Bhature",120,"","veg","Spicy chickpea curry with fluffy fried bhature","","🫓"],
["Palak Paneer",170,"","veg","Paneer cubes in a smooth spinach gravy","","🥬"],
["Dal Tadka",120,"","veg","Yellow lentils tempered with garlic and cumin","","🍲"],
["Gobi Manchurian",110,"","veg","Crispy cauliflower tossed in a tangy Indo-Chinese sauce","","🥦"]
];

const nonveg = [
["Chicken Biryani",180,"https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=400","nonveg","Slow-cooked basmati rice with tender chicken","Bestseller","🍗"],
["Fish Fry",200,"https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400","nonveg","Crispy pan-fried fish, coastal spice rub","","🐟"],
["Mutton Curry",280,"https://images.unsplash.com/photo-1544025162-d76694265947?w=400","nonveg","Slow-braised mutton in a spiced onion gravy","","🍖"],
["Prawn Biryani",240,"https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400","nonveg","Basmati rice layered with spiced prawns","Popular","🍤"],
["Fish Curry",190,"","nonveg","Tangy Thoothukudi-style fish curry with tamarind and coconut","Popular","🐟"],
["Butter Chicken",220,"","nonveg","Tandoori chicken in a rich buttery tomato gravy","Bestseller","🍛"],
["Chicken 65",160,"","nonveg","Spicy deep-fried chicken bites with curry leaves","","🍗"],
["Tandoori Chicken",240,"","nonveg","Yogurt-marinated chicken roasted in a clay oven","","🍗"],
["Chilli Chicken",180,"","nonveg","Indo-Chinese chicken tossed with capsicum and onions","","🌶️"],
["Mutton Biryani",260,"","nonveg","Dum-cooked basmati rice with juicy mutton pieces","","🍚"]
];

const juice = [
["Orange Juice",60,"https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400","veg","Freshly squeezed, no added sugar","","🍊"],
["Apple Juice",80,"https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400","veg","Crisp apple juice, no preservatives","","🍎"],
["Watermelon Juice",50,"","veg","Chilled and refreshing, pressed fresh","Popular","🍉"],
["Pineapple Juice",60,"","veg","Sweet and tangy, made from ripe pineapple","","🍍"],
["Pomegranate Juice",90,"","veg","Rich ruby juice, full of antioxidants","","🍷"],
["Sweet Lime Juice",50,"","veg","Light and fresh mosambi juice","","🍋"],
["Grape Juice",60,"","veg","Pressed from black seedless grapes","","🍇"],
["Mango Juice",70,"","veg","Made from ripe Alphonso mangoes","Bestseller","🥭"],
["Banana Milkshake",80,"","veg","Thick shake blended with chilled milk","Popular","🍌"],
["Lemon Mint Cooler",45,"","veg","Fresh lime, mint and a pinch of black salt","","🍹"]
];

const icecream = [
["Chocolate",70,"https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400","veg","Rich cocoa with fudge swirls","Bestseller","🍫"],
["Vanilla",60,"https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400","veg","Classic Madagascar vanilla bean","","🍦"],
["Strawberry",65,"","veg","Made with real strawberry puree","","🍓"],
["Butterscotch",70,"","veg","Creamy ice cream with crunchy caramel nuts","Popular","🍨"],
["Pista",80,"","veg","Pistachio ice cream with crushed nuts","","🍨"],
["Black Currant",75,"","veg","Sweet and tart black currant swirl","","🍇"],
["Cookies and Cream",90,"","veg","Vanilla ice cream loaded with chocolate cookie bits","Bestseller","🍪"],
["Tender Coconut",80,"","veg","Smooth ice cream with tender coconut pieces","","🥥"],
["Malai Kulfi",60,"","veg","Traditional slow-cooked milk kulfi","","🍡"]
];

const cakes = [
["Chocolate Cake",200,"https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400","veg","Layers of dark chocolate sponge & ganache","Bestseller","🎂"],
["Black Forest",250,"https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=400","veg","Cherries, whipped cream, chocolate shavings","Popular","🍰"],
["Vanilla Cake",180,"https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=400","veg","Light vanilla sponge, buttercream finish","","🎂"],
["Red Velvet",280,"","veg","Red sponge layered with cream cheese frosting","Popular","❤️"],
["Pineapple Cake",220,"","veg","Soft sponge with pineapple chunks and cream","","🍍"],
["Butterscotch Cake",240,"","veg","Caramel cream with crunchy butterscotch praline","","🍰"],
["Plum Cake",200,"","veg","Rich fruit and nut cake, soaked in spices","","🎄"],
["Cheesecake",300,"","veg","Creamy baked cheesecake on a biscuit base","Bestseller","🧁"],
["Mango Cake",260,"","veg","Fresh mango cream layered between soft sponge","","🥭"],
["Chocolate Truffle",320,"","veg","Dense chocolate cake coated in glossy truffle ganache","","🍫"]
];

const categoryLabels = {
  veg:"Veg Foods", nonveg:"Non-Veg Foods", juice:"Fresh Juices",
  icecream:"Ice Creams", cakes:"Cakes"
};

/* REAL PHOTOS — items with image "" get a real photo from Wikipedia / Wikimedia Commons.
   The emoji tile shows first, then swaps to the photo once it loads.
   To use your own photo for any item, paste its URL in the data above instead of "". */
const wikiTitles = {
  "Masala Dosa":["Masala_dosa"],"Idli Sambar":["Idli","Sambar_(dish)"],"Chole Bhature":["Chole_bhature"],
  "Palak Paneer":["Palak_paneer"],"Dal Tadka":["Dal_makhani"],"Gobi Manchurian":["Gobi_Manchurian"],
  "Fish Curry":["Fish_curry"],"Butter Chicken":["Butter_chicken"],"Chicken 65":["Chicken_65"],
  "Tandoori Chicken":["Tandoori_chicken"],"Chilli Chicken":["Chilli_chicken","Chicken_65"],"Mutton Biryani":["Biryani"],
  "Watermelon Juice":["Watermelon_juice","Watermelon"],"Pineapple Juice":["Pineapple_juice","Pineapple"],
  "Pomegranate Juice":["Pomegranate_juice","Pomegranate"],"Sweet Lime Juice":["Citrus_limetta","Limeade"],
  "Grape Juice":["Grape_juice","Grape"],"Apple Juice":["Apple_juice","Apple"],
  "Banana Milkshake":["Milkshake","Banana"],"Lemon Mint Cooler":["Limeade","Lemonade"],
  "Butterscotch":["Butterscotch","Ice_cream"],"Pista":["Pistachio_ice_cream","Pistachio"],
  "Black Currant":["Blackcurrant"],"Cookies and Cream":["Cookies_and_cream"],"Tender Coconut":["Coconut_water","Coconut"],
  "Malai Kulfi":["Kulfi"],
  "Red Velvet":["Red_velvet_cake"],"Pineapple Cake":["Pineapple_cake","Pineapple_upside-down_cake"],
  "Butterscotch Cake":["Butterscotch","Cake"],"Plum Cake":["Fruitcake"],"Cheesecake":["Cheesecake"],
  "Mango Cake":["Mango","Cake"],"Chocolate Truffle":["Chocolate_truffle","Chocolate_cake"]
};
const photoCache = {};

/* Photo alias: this item keeps the photo that was originally loaded for another name */
const photoAlias = { "Mango Juice":"Apple Juice" };

/* Better-matching photos: search Wikimedia Commons with a specific phrase for these items */
const commonsQueries = {
  "Dal Tadka":"dal tadka",
  "Fish Curry":"kerala fish curry meen curry",
  "Watermelon Juice":"watermelon juice glass",
  "Sweet Lime Juice":"mosambi sweet lime juice glass",
  "Banana Milkshake":"banana milkshake",
  "Strawberry":"strawberry ice cream scoop",
  "Butterscotch":"butterscotch ice cream",
  "Black Currant":"blackcurrant ice cream",
  "Tender Coconut":"coconut ice cream",
  "Pineapple Cake":"pineapple cream cake slice",
  "Butterscotch Cake":"butterscotch cake",
  "Mango Cake":"mango cake slice",
  "Chocolate Truffle":"chocolate truffle cake slice"
};

async function commonsPhoto(query){
  const url = "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*"
    + "&generator=search&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|mime&iiurlwidth=500"
    + "&gsrsearch=" + encodeURIComponent(query);
  const r = await fetch(url);
  if(!r.ok) return null;
  const j = await r.json();
  const pages = Object.values((j.query && j.query.pages) || {}).sort((x,y)=>x.index-y.index);
  for(const p of pages){
    const info = p.imageinfo && p.imageinfo[0];
    if(info && info.mime === "image/jpeg" && info.thumburl) return info.thumburl;
  }
  return null;
}

async function wikiPagePhoto(titles){
  for(const t of titles){
    try{
      const r = await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + t);
      if(!r.ok) continue;
      const j = await r.json();
      if(j.thumbnail && j.thumbnail.source) return j.thumbnail.source;
    }catch(e){ /* try next title */ }
  }
  return null;
}

async function findPhoto(name){
  let src = null;
  if(commonsQueries[name]){
    try{ src = await commonsPhoto(commonsQueries[name]); }catch(e){}
  }
  if(!src) src = await wikiPagePhoto(wikiTitles[name] || []);
  return src;
}

function loadWikiPhotos(){
  document.querySelectorAll("[data-wiki]").forEach(async el=>{
    const name = el.dataset.wiki;
    const src = await findPhoto(photoAlias[name] || name);
    if(!src) return;
    const img = new Image();
    img.alt = name;
    img.onload = ()=>{ photoCache[name] = src; el.replaceWith(img); };
    img.src = src;
  });
}

/* RENDER FUNCTION */
function render(id,data){
  const wrap = document.querySelector(`#${id} [data-body]`);
  let html = `
    <div class="food-header">
      <h2>${categoryLabels[id]}</h2>
      <button class="back-btn" onclick="show('dashboard')">← Back to Menu</button>
    </div>
    <div class="grid">`;

  data.forEach(i=>{
    const [nameItem, price, img, type, desc, badge, emoji] = i;
    const em = emoji || "🍽";
    html += `
      <div class="card">
        <div class="img-wrap">
          ${img
            ? `<img src="${img}" alt="${nameItem}" onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('div'),{className:'img-ph',textContent:'${em}'}))">`
            : `<div class="img-ph" data-wiki="${nameItem}">${em}</div>`}
          <div class="tag ${type}"></div>
          ${badge ? `<div class="badge">${badge}</div>` : ""}
        </div>
        <div class="card-body">
          <h4>${nameItem}</h4>
          <div class="desc">${desc}</div>
          <div class="price-row">
            <span class="price">₹${price}</span>
            <button class="buy-btn" onclick="buy('${nameItem}', ${price}, '${img}', '${em}')">Buy Now</button>
          </div>
        </div>
      </div>`;
  });

  html += `</div>`;
  wrap.innerHTML = html;
}

render("veg",veg);
render("nonveg",nonveg);
render("juice",juice);
render("icecream",icecream);
render("cakes",cakes);
loadWikiPhotos();

/* IMAGE FALLBACK — replace any image that fails to load */
const FALLBACK_IMG = "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop";
function attachImageFallback(){
  document.querySelectorAll("img").forEach(img=>{
    img.addEventListener("error", function handler(){
      if(this.src !== FALLBACK_IMG){
        this.src = FALLBACK_IMG;
      }
      this.removeEventListener("error", handler);
    });
  });
}
attachImageFallback();

/* Set initial nav state on load */
updateNav();
