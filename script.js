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

function buy(item, price, img){
  selectedItem = item;
  selectedPrice = price;
  selectedImg = img;
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
      <img src="${selectedImg}" alt="${selectedItem}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1544025162-d76694265947?w=200&auto=format&fit=crop';">
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

/* ---------- MENU DATA (name, price, image, type, desc, badge) ---------- */
const veg = [
["Paneer Butter Masala",120,"https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400","veg","Creamy tomato gravy, cottage cheese cubes","Bestseller"],
["Veg Biryani",50,"https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400","veg","Basmati rice layered with garden vegetables",""],
["Samosa",80,"https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400","veg","Crispy pastry stuffed with spiced potato","Popular"],
["Veg Fried Rice",90,"https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400","veg","Wok-tossed rice with fresh vegetables",""]
];

const nonveg = [
["Chicken Biryani",150,"https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=400","nonveg","Slow-cooked basmati rice with tender chicken","Bestseller"],
["Fish Fry",160,"https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=400","nonveg","Crispy pan-fried fish, coastal spice rub",""],
["Mutton Curry",220,"https://images.unsplash.com/photo-1544025162-d76694265947?w=400","nonveg","Slow-braised mutton in a spiced onion gravy",""],
["Prawn Biryani",100,"https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400","nonveg","Basmati rice layered with spiced prawns","Popular"]
];

const juice = [
["Orange Juice",40,"https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400","veg","Freshly squeezed, no added sugar",""],
["Mango Juice",45,"https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400","veg","Made from ripe Alphonso mangoes","Bestseller"]
];

const icecream = [
["Chocolate",50,"https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400","veg","Rich cocoa with fudge swirls","Bestseller"],
["Vanilla",60,"https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400","veg","Classic Madagascar vanilla bean",""],
["Strawberry",55,"https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=400","veg","Made with real strawberry puree",""]
];

const cakes = [
["Chocolate Cake",200,"https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400","veg","Layers of dark chocolate sponge & ganache","Bestseller"],
["Black Forest",250,"https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=400","veg","Cherries, whipped cream, chocolate shavings","Popular"],
["Vanilla Cake",180,"https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=400","veg","Light vanilla sponge, buttercream finish",""]
];

const categoryLabels = {
  veg:"Veg Foods", nonveg:"Non-Veg Foods", juice:"Fresh Juices",
  icecream:"Ice Creams", cakes:"Cakes"
};

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
    const [nameItem, price, img, type, desc, badge] = i;
    html += `
      <div class="card">
        <div class="img-wrap">
          <img src="${img}" alt="${nameItem}">
          <div class="tag ${type}"></div>
          ${badge ? `<div class="badge">${badge}</div>` : ""}
        </div>
        <div class="card-body">
          <h4>${nameItem}</h4>
          <div class="desc">${desc}</div>
          <div class="price-row">
            <span class="price">₹${price}</span>
            <button class="buy-btn" onclick="buy('${nameItem}', ${price}, '${img}')">Buy Now</button>
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
