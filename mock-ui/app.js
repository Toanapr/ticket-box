// Mock Database for Concerts and Tickets
const CONCERTS = [
  {
    id: 1,
    title: "Anh Trai Say Hi - Concert 2026",
    artists: ["HIEUTHUHAI", "RHYDER", "Quang Hùng MasterD", "Negav", "ISAAC", "HURRYKNG"],
    venue: "Sân vận động Quốc gia Mỹ Đình, Hà Nội",
    date: "19:00 - Thứ Bảy, 15/10/2026",
    rawDate: "2026-10-15T19:00:00",
    status: "selling", // selling, upcoming, soldout
    description: "Sau thành công rực rỡ của mùa trước, concert Anh Trai Say Hi 2026 quay trở lại với quy mô bùng nổ hơn tại Sân vận động Quốc gia Mỹ Đình. Sự kiện quy tụ dàn nghệ sĩ hàng đầu Việt Nam cùng hệ thống âm thanh, ánh sáng chuẩn quốc tế.",
    bannerColor: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)",
    graphicSeed: "hi",
    posterImage: "images/say-hi-poster.png",
    ticketTypes: [
      { id: "svip", name: "SVIP President", price: 4500000, quota: 2, available: 18, total: 100 },
      { id: "vip", name: "VIP A/B", price: 2800000, quota: 4, available: 45, total: 200 },
      { id: "cat1", name: "CAT 1 Zone", price: 1800000, quota: 4, available: 120, total: 300 },
      { id: "cat2", name: "CAT 2 Upper", price: 1200000, quota: 4, available: 9, total: 150 },
      { id: "ga", name: "General Admission", price: 800000, quota: 4, available: 450, total: 1000 }
    ]
  },
  {
    id: 2,
    title: "Anh Trai Vượt Ngàn Chông Gai - Concert 2",
    artists: ["Soobin Hoàng Sơn", "Bằng Kiều", "Tự Long", "Cường Seven", "Kay Trần", "Jun Phạm"],
    venue: "Sân vận động Quân khu 7, TP. Hồ Chí Minh",
    date: "19:30 - Thứ Bảy, 20/11/2026",
    rawDate: "2026-11-20T19:30:00",
    status: "upcoming",
    description: "Đại nhạc hội bùng nổ của các 'Anh Tài' vượt ngàn chông gai. Đêm diễn hứa hẹn mang đến những bản phối cực chất, những màn trình diễn tràn đầy năng lượng và ngập tràn cảm xúc tự hào.",
    bannerColor: "linear-gradient(135deg, #180c0c 0%, #3f1515 50%, #1c0e0e 100%)",
    graphicSeed: "chonggai",
    posterImage: "images/chong-gai-poster.png",
    ticketTypes: [
      { id: "svip", name: "SVIP Lounge", price: 5000000, quota: 2, available: 50, total: 50 },
      { id: "vip", name: "VIP Stage Front", price: 3000000, quota: 4, available: 150, total: 150 },
      { id: "cat1", name: "CAT 1 Lower Stand", price: 2000000, quota: 4, available: 250, total: 250 },
      { id: "cat2", name: "CAT 2 Upper Stand", price: 1500000, quota: 4, available: 300, total: 300 },
      { id: "ga", name: "GA Standing Pit", price: 900000, quota: 4, available: 800, total: 800 }
    ]
  },
  {
    id: 3,
    title: "Chị Đẹp Đạp Gió Rẽ Sóng 2026",
    artists: ["Tóc Tiên", "Minh Hằng", "Thiều Bảo Trâm", "Ngọc Thanh Tâm", "Đồng Ánh Quỳnh"],
    venue: "Nhà thi đấu Phú Thọ, TP. Hồ Chí Minh",
    date: "18:30 - Chủ Nhật, 05/12/2026",
    rawDate: "2026-12-05T18:30:00",
    status: "selling",
    description: "Đêm concert tôn vinh vẻ đẹp, sự kiên cường và tài năng của các 'Chị Đẹp'. Những màn kết hợp có 1-0-2 trên sân khấu Phú Thọ được đầu tư hoành tráng, lấy cảm hứng từ đại dương và ngọn lửa nội lực.",
    bannerColor: "linear-gradient(135deg, #071520 0%, #0d283f 50%, #1c183a 100%)",
    graphicSeed: "chidep",
    posterImage: "images/chi-dep-poster.png",
    ticketTypes: [
      { id: "svip", name: "L'Amour SVIP", price: 4200000, quota: 2, available: 5, total: 80 },
      { id: "vip", name: "VIP Ocean", price: 2600000, quota: 4, available: 28, total: 150 },
      { id: "cat1", name: "CAT 1 Diamond", price: 1600000, quota: 4, available: 88, total: 200 },
      { id: "cat2", name: "CAT 2 Ruby", price: 1100000, quota: 4, available: 110, total: 200 },
      { id: "ga", name: "GA Emerald", price: 750000, quota: 4, available: 350, total: 500 }
    ]
  },
  {
    id: 4,
    title: "Em Xinh Say Hi - Showcases",
    artists: ["Amee", "Mono", "tlinh", "Wren Evans", "Grey D", "hieuthuhai"],
    venue: "Trung tâm Hội chợ và Triển lãm Sài Gòn (SECC)",
    date: "20:00 - Thứ Sáu, 10/08/2026",
    rawDate: "2026-08-10T20:00:00",
    status: "soldout",
    description: "Show diễn dành riêng cho thế hệ trẻ với năng lượng tươi mới, ngọt ngào và thời thượng. Mọi vị trí ngồi đều được thiết kế tối ưu tầm nhìn để khán giả hòa mình cùng giai điệu sôi động.",
    bannerColor: "linear-gradient(135deg, #0b1c1e 0%, #133538 50%, #0f1c24 100%)",
    graphicSeed: "emxinh",
    posterImage: "images/em-xinh-poster.png",
    ticketTypes: [
      { id: "svip", name: "SVIP Sweet", price: 3800000, quota: 2, available: 0, total: 50 },
      { id: "vip", name: "VIP Pretty", price: 2400000, quota: 4, available: 0, total: 100 },
      { id: "cat1", name: "CAT 1 Cute", price: 1500000, quota: 4, available: 0, total: 200 },
      { id: "ga", name: "GA Standing", price: 800000, quota: 4, available: 0, total: 400 }
    ]
  }
];

// Seating Zone Colors mapped to ticket type IDs
const ZONE_COLORS = {
  svip: "#a855f7", // Purple
  vip: "#3b82f6",  // Blue
  cat1: "#22c55e", // Green
  cat2: "#f59e0b", // Amber
  ga: "#64748b"    // Slate
};

// Global App State
const state = {
  currentRoute: "",
  params: {},
  selectedConcert: null,
  selectedZone: null,
  selectedQuantity: 1,
  // System State simulation controls
  mockState: "normal",        // normal, force_sold_out, force_quota_exceeded, force_sale_closed
  mockPaymentStatus: "success", // success, failure, timeout
  appState: "ready",          // ready, loading, empty, error
  // Order active data
  currentOrder: null,
  reservationTimer: null,
  paymentPoller: null,
  logs: []
};

// ==========================================
// CORE APP ROUTER & VIEWS
// ==========================================

function initRouter() {
  window.addEventListener("hashchange", handleRouting);
  // Initial load
  handleRouting();
}

function navigateTo(hash) {
  window.location.hash = hash;
}

function handleRouting() {
  const hash = window.location.hash || "#/concerts";
  state.currentRoute = hash;
  
  // Clear any timers from previous screens
  clearInterval(state.reservationTimer);
  clearInterval(state.paymentPoller);
  
  // Reset scroll
  window.scrollTo(0, 0);

  // Match routes
  if (hash === "#/concerts" || hash === "") {
    state.params = {};
    renderConcertsPage();
  } else if (hash.startsWith("#/concerts/")) {
    const parts = hash.split("/");
    const id = parseInt(parts[2]);
    
    if (parts.length > 3 && parts[3] === "checkout") {
      state.params = { id };
      renderCheckoutPage();
    } else {
      state.params = { id };
      renderDetailPage();
    }
  } else if (hash.startsWith("#/orders/")) {
    const parts = hash.split("/");
    state.params = { orderId: parts[2] };
    renderPaymentPage();
  } else if (hash.startsWith("#/tickets/")) {
    const parts = hash.split("/");
    state.params = { ticketId: parts[2] };
    renderTicketPage();
  } else {
    log("Route not found, redirecting to concerts list", "error");
    navigateTo("#/concerts");
  }
}

function showPageView(viewId) {
  document.querySelectorAll(".page-view").forEach(view => {
    view.classList.remove("active");
  });
  const activeView = document.getElementById(viewId);
  if (activeView) {
    activeView.classList.add("active");
  }
}

// Write logs to the floating console widget
function log(msg, type = "info") {
  const time = new Date().toLocaleTimeString();
  const formattedMsg = `[${time}] [${type.toUpperCase()}] ${msg}`;
  state.logs.push(formattedMsg);
  
  // Keep only last 20 logs
  if (state.logs.length > 20) state.logs.shift();
  
  const consoleEl = document.getElementById("proto-console");
  if (consoleEl) {
    consoleEl.innerHTML = state.logs.join("\n");
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }
}

// Generate dynamic SVG Event graphic banner on client side
function generateSVGGraphic(seed, color1, color2, width = 600, height = 350) {
  let circles = '';
  if (seed === "hi") {
    circles = `
      <circle cx="150" cy="150" r="120" fill="url(#gradCyan)" opacity="0.4" filter="url(#glow)"/>
      <circle cx="450" cy="200" r="160" fill="url(#gradPurple)" opacity="0.3" filter="url(#glow)"/>
      <path d="M 0 250 Q 150 150 300 250 T 600 200" fill="none" stroke="cyan" stroke-width="2" opacity="0.3"/>
      <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="44" fill="#ffffff" letter-spacing="10">SAY HI</text>
      <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="600" font-size="14" fill="#a855f7" letter-spacing="4">THE LIVE CONCERT 2026</text>
    `;
  } else if (seed === "chonggai") {
    circles = `
      <circle cx="300" cy="170" r="140" fill="url(#gradRed)" opacity="0.35" filter="url(#glow)"/>
      <path d="M 0 100 L 200 300 L 400 100 L 600 250" fill="none" stroke="#f59e0b" stroke-width="3" opacity="0.2"/>
      <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="34" fill="#ffffff" letter-spacing="8">VƯỢT NGÀN CHÔNG GAI</text>
      <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="600" font-size="14" fill="#ef4444" letter-spacing="6">STAGE II / HCMC</text>
    `;
  } else if (seed === "chidep") {
    circles = `
      <circle cx="200" cy="120" r="130" fill="url(#gradBlue)" opacity="0.4" filter="url(#glow)"/>
      <circle cx="420" cy="220" r="100" fill="url(#gradGold)" opacity="0.25" filter="url(#glow)"/>
      <path d="M -100 175 C 150 50 300 300 700 175" fill="none" stroke="#3b82f6" stroke-width="2" opacity="0.4"/>
      <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="36" fill="#ffffff" letter-spacing="8">ĐẠP GIÓ RẼ SÓNG</text>
      <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="600" font-size="14" fill="#f59e0b" letter-spacing="6">CONCERT PRESTIGE 2026</text>
    `;
  } else {
    circles = `
      <circle cx="300" cy="175" r="130" fill="url(#gradPink)" opacity="0.3" filter="url(#glow)"/>
      <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="40" fill="#ffffff" letter-spacing="10">EM XINH</text>
      <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="600" font-size="14" fill="#14b8a6" letter-spacing="4">SHOWCASE FESTIVAL</text>
    `;
  }

  return `
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%; display:block;">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color1}"/>
          <stop offset="100%" stop-color="${color2}"/>
        </linearGradient>
        <radialGradient id="gradPurple" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#a855f7" stop-opacity="1"/>
          <stop offset="100%" stop-color="#a855f7" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="gradCyan" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#06b6d4" stop-opacity="1"/>
          <stop offset="100%" stop-color="#06b6d4" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="gradRed" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ef4444" stop-opacity="1"/>
          <stop offset="100%" stop-color="#ef4444" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="gradBlue" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="1"/>
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="gradGold" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#f59e0b" stop-opacity="1"/>
          <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="gradPink" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ec4899" stop-opacity="1"/>
          <stop offset="100%" stop-color="#ec4899" stop-opacity="0"/>
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="15" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#bgGrad)"/>
      ${circles}
    </svg>
  `;
}

// Generate a mock QR SVG image
function generateQRcodeSVG(text) {
  // SVG Mock representation of QR grid with a TicketBox overlay
  return `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%;">
      <!-- QR Borders -->
      <rect x="0" y="0" width="100" height="100" fill="white"/>
      <!-- Finder patterns -->
      <rect x="10" y="10" width="25" height="25" fill="black" stroke="white" stroke-width="3"/>
      <rect x="15" y="15" width="15" height="15" fill="white"/>
      <rect x="18" y="18" width="9" height="9" fill="black"/>
      
      <rect x="65" y="10" width="25" height="25" fill="black" stroke="white" stroke-width="3"/>
      <rect x="70" y="15" width="15" height="15" fill="white"/>
      <rect x="73" y="73" width="9" height="9" fill="black"/>
      
      <rect x="10" y="65" width="25" height="25" fill="black" stroke="white" stroke-width="3"/>
      <rect x="15" y="70" width="15" height="15" fill="white"/>
      <rect x="18" y="73" width="9" height="9" fill="black"/>
      
      <!-- Small alignment pattern -->
      <rect x="68" y="68" width="12" height="12" fill="black" stroke="white" stroke-width="2"/>
      <rect x="72" y="72" width="4" height="4" fill="white"/>
      
      <!-- Custom QR dots scatter simulation -->
      <path d="M 40 10 h 5 v 5 h -5 z M 50 10 h 5 v 10 h -5 z M 60 15 h 5 v 5 h -5 z M 40 25 h 10 v 5 h -10 z
               M 45 35 h 15 v 5 h -15 z M 10 40 h 10 v 5 h -10 z M 25 40 h 5 v 5 h -5 z M 35 45 h 10 v 10 h -10 z
               M 55 45 h 10 v 5 h -10 z M 10 50 h 5 v 5 h -5 z M 20 50 h 10 v 5 h -10 z M 50 55 h 5 v 10 h -5 z
               M 65 50 h 10 v 5 h -10 z M 80 40 h 10 v 5 h -10 z M 85 50 h 5 v 10 h -5 z M 75 60 h 10 v 5 h -10 z
               M 40 65 h 5 v 5 h -5 z M 45 75 h 10 v 5 h -10 z M 35 80 h 5 v 10 h -5 z M 50 85 h 10 v 5 h -10 z
               M 65 80 h 5 v 5 h -5 z M 80 80 h 10 v 10 h -10 z" fill="black"/>
    </svg>
  `;
}

// Utility formatting
function formatCurrency(amount) {
  return amount.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
}

// Helper to check quota limit warning message
function getQuotaLimitMessage(zoneId, concert) {
  const type = concert.ticketTypes.find(t => t.id === zoneId);
  if (!type) return "";
  return `${type.name} có hạn mức mua tối đa ${type.quota} vé/tài khoản.`;
}

// ==========================================
// SCREEN 1: /concerts (Concert List Rendering)
// ==========================================

function renderConcertsPage() {
  log("Navigated to /concerts");
  showPageView("page-concerts");
  
  // Breadcrumbs Update
  document.getElementById("breadcrumbs-container").innerHTML = `
    <span class="current">Khám Phá Concerts</span>
  `;

  const grid = document.getElementById("concert-grid");
  const stateContainer = document.getElementById("concerts-state-container");
  
  // Handle Simulated App States (Loading, Error, Empty)
  if (state.appState === "loading") {
    stateContainer.style.display = "flex";
    stateContainer.innerHTML = `
      <div class="spinner"></div>
      <h3 class="state-title" style="margin-top:20px;">Đang tải danh sách sự kiện...</h3>
      <p class="state-desc">Vui lòng chờ trong giây lát.</p>
    `;
    grid.style.display = "none";
    return;
  }
  
  if (state.appState === "error") {
    stateContainer.style.display = "flex";
    stateContainer.innerHTML = `
      <div class="state-icon error"><i data-lucide="alert-triangle"></i></div>
      <h3 class="state-title">Lỗi kết nối máy chủ</h3>
      <p class="state-desc">Chúng tôi không thể lấy dữ liệu sự kiện ngay bây giờ. Hãy kiểm tra kết nối mạng hoặc thử lại.</p>
      <button class="hero-cta" onclick="resetAppState()"><i data-lucide="refresh-cw"></i> Thử lại</button>
    `;
    lucide.createIcons();
    grid.style.display = "none";
    return;
  }
  
  if (state.appState === "empty") {
    stateContainer.style.display = "flex";
    stateContainer.innerHTML = `
      <div class="state-icon"><i data-lucide="search"></i></div>
      <h3 class="state-title">Không tìm thấy concert nào</h3>
      <p class="state-desc">Rất tiếc, hiện tại không có buổi biểu diễn nào phù hợp với bộ lọc.</p>
    `;
    lucide.createIcons();
    grid.style.display = "none";
    return;
  }

  // Normal rendering
  stateContainer.style.display = "none";
  grid.style.display = "grid";
  grid.innerHTML = "";

  // Spotlight Event (First active selling event)
  const spotlightConcert = CONCERTS.find(c => c.status === "selling") || CONCERTS[0];
  const spotlightBanner = document.getElementById("spotlight-banner");
  
  if (spotlightConcert) {
    const graphicSVG = generateSVGGraphic(spotlightConcert.graphicSeed, "#064e3b", "#0f172a");
    const heroImageContent = spotlightConcert.posterImage 
      ? `<img src="${spotlightConcert.posterImage}" alt="${spotlightConcert.title}" style="width:100%; height:100%; object-fit:cover;">` 
      : graphicSVG;
    
    spotlightBanner.innerHTML = `
      <div class="hero-content">
        <span class="hero-tag">🔥 Nổi bật</span>
        <h2 class="hero-title">${spotlightConcert.title}</h2>
        <p class="hero-description">${spotlightConcert.description}</p>
        <div class="hero-meta">
          <div class="hero-meta-item">
            <i data-lucide="calendar"></i>
            <span>${spotlightConcert.date}</span>
          </div>
          <div class="hero-meta-item">
            <i data-lucide="map-pin"></i>
            <span>${spotlightConcert.venue}</span>
          </div>
        </div>
        <button class="hero-cta" onclick="navigateTo('#/concerts/${spotlightConcert.id}')">
          <span>Mua vé ngay</span>
          <i data-lucide="arrow-right"></i>
        </button>
      </div>
      <div class="hero-image">
        ${heroImageContent}
      </div>
    `;
  }
  
  // Render Grid Cards
  CONCERTS.forEach(concert => {
    const card = document.createElement("div");
    card.className = "concert-card";
    card.onclick = () => navigateTo(`#/concerts/${concert.id}`);
    
    let badgeText = "Đang bán vé";
    let badgeClass = "badge-selling";
    
    if (concert.status === "upcoming") {
      badgeText = "Sắp mở bán";
      badgeClass = "badge-upcoming";
    } else if (concert.status === "soldout") {
      badgeText = "Hết vé";
      badgeClass = "badge-soldout";
    }
    
    const cardGraphic = generateSVGGraphic(concert.graphicSeed, "#064e3b", "#0f172a", 300, 190);
    const cardImageContent = concert.posterImage 
      ? `<img src="${concert.posterImage}" alt="${concert.title}" style="width:100%; height:100%; object-fit:cover;">` 
      : cardGraphic;
    
    card.innerHTML = `
      <div class="card-image-wrap">
        <span class="card-badge ${badgeClass}">${badgeText}</span>
        ${cardImageContent}
      </div>
      <div class="card-content">
        <div class="card-artists">${concert.artists.slice(0, 3).join(" • ")}${concert.artists.length > 3 ? "..." : ""}</div>
        <h3 class="card-title">${concert.title}</h3>
        <div class="card-meta">
          <div class="card-meta-item">
            <i data-lucide="calendar"></i>
            <span>${concert.date.split(" - ")[1]}</span>
          </div>
          <div class="card-meta-item">
            <i data-lucide="map-pin"></i>
            <span>${concert.venue.split(",")[0]}</span>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
  
  lucide.createIcons();
}

// ==========================================
// SCREEN 2: /concerts/:id (Detail Page Rendering)
// ==========================================

function renderDetailPage() {
  const concertId = state.params.id;
  const concert = CONCERTS.find(c => c.id === concertId);
  
  if (!concert) {
    log(`Concert ID ${concertId} not found`, "error");
    navigateTo("#/concerts");
    return;
  }
  
  state.selectedConcert = concert;
  // Auto-select first available zone if active
  const availableZone = concert.ticketTypes.find(z => z.available > 0);
  state.selectedZone = availableZone ? availableZone.id : null;
  state.selectedQuantity = 1;

  log(`Navigated to /concerts/${concertId} (${concert.title})`);
  showPageView("page-detail");

  // Breadcrumbs Update
  document.getElementById("breadcrumbs-container").innerHTML = `
    <a href="#/concerts">Concerts</a>
    <span class="separator">/</span>
    <span class="current">${concert.title}</span>
  `;

  // Render Spotlight Hero Ticket Card
  const detailBanner = document.getElementById("detail-banner-container");
  
  // Calculate minimum price
  const minPrice = Math.min(...concert.ticketTypes.map(t => t.price));
  const minPriceStr = minPrice.toLocaleString('vi-VN') + ' đ';
  
  // Split venue into main and address
  let venueMain = concert.venue;
  let venueSub = "";
  if (concert.venue.includes(",")) {
    const commaIndex = concert.venue.indexOf(",");
    venueMain = concert.venue.substring(0, commaIndex).trim();
    venueSub = concert.venue.substring(commaIndex + 1).trim();
  } else if (concert.venue.includes("(")) {
    const parenIndex = concert.venue.indexOf("(");
    venueMain = concert.venue.substring(0, parenIndex).trim();
    venueSub = concert.venue.substring(parenIndex).trim();
  }
  
  // Determine ticket status button details
  let statusText = "Mua vé ngay";
  let isButtonDisabled = concert.status !== "selling";
  if (concert.status === "upcoming") {
    statusText = "Sắp mở bán";
  } else if (concert.status === "soldout") {
    statusText = "Hết vé";
  }

  // Right section poster content (image or dynamic SVG graphic seed)
  const posterContent = concert.posterImage 
    ? `<img src="${concert.posterImage}" alt="${concert.title}" class="hero-ticket-poster-img">` 
    : generateSVGGraphic(concert.graphicSeed, "#022c22", "#0f172a", 800, 400);

  detailBanner.innerHTML = `
    <div class="hero-ticket-card">
      <!-- Left Section: Stub -->
      <div class="hero-ticket-stub">
        <h2 class="hero-ticket-title">${concert.title}</h2>
        
        <div class="hero-ticket-info-group">
          <div class="hero-ticket-info-item">
            <div class="hero-ticket-icon-wrap">
              <i data-lucide="calendar"></i>
            </div>
            <div class="hero-ticket-info-text">
              <span class="hero-ticket-date-time">${concert.date}</span>
              <span class="hero-ticket-badge-extra">+ 1 ngày khác</span>
            </div>
          </div>
          
          <div class="hero-ticket-info-item">
            <div class="hero-ticket-icon-wrap">
              <i data-lucide="map-pin"></i>
            </div>
            <div class="hero-ticket-info-text">
              <span class="hero-ticket-venue-main">${venueMain}</span>
              <span class="hero-ticket-venue-sub">${venueSub}</span>
            </div>
          </div>
        </div>
        
        <div class="hero-ticket-divider-line"></div>
        
        <div class="hero-ticket-footer-row">
          <div class="hero-ticket-price-row" onclick="scrollToBooking()" style="cursor: pointer;">
            <span class="hero-ticket-price-label">Giá từ</span>
            <span class="hero-ticket-price-value">${minPriceStr}</span>
            <i data-lucide="chevron-right" class="hero-ticket-price-chevron"></i>
          </div>
          
          <button class="hero-ticket-buy-btn" id="ticket-hero-buy-btn" onclick="handleTicketCardBuyClick()" ${isButtonDisabled ? 'disabled' : ''}>
            ${statusText}
          </button>
        </div>
      </div>
      
      <!-- Middle Tear Section -->
      <div class="hero-ticket-tear-section">
        <div class="hero-ticket-cutout hero-ticket-cutout-top"></div>
        <div class="hero-ticket-dashed-line"></div>
        <div class="hero-ticket-cutout hero-ticket-cutout-bottom"></div>
      </div>
      
      <!-- Right Section: Poster -->
      <div class="hero-ticket-poster">
        ${posterContent}
      </div>
    </div>
  `;

  // Render Description & Artists
  document.getElementById("detail-description").innerText = concert.description;
  
  const artistContainer = document.getElementById("detail-artists");
  artistContainer.innerHTML = "";
  concert.artists.forEach(artist => {
    const chip = document.createElement("div");
    chip.className = "artist-chip";
    chip.innerHTML = `
      <div class="artist-avatar">${artist.charAt(0)}</div>
      <span>${artist}</span>
    `;
    artistContainer.appendChild(chip);
  });

  // Render Interactive Seating Map
  renderSeatingMap(concert);

  // Render Ticket Sidebar List
  renderTicketSidebar(concert);
  
  lucide.createIcons();
}

function renderSeatingMap(concert) {
  const mapContainer = document.getElementById("seating-map-wrap");
  
  // Custom simple Seating Map SVG with polygons matching our zones
  mapContainer.innerHTML = `
    <svg viewBox="0 0 400 300" class="seating-svg">
      <defs>
        <linearGradient id="stageGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#3b82f6"/>
          <stop offset="100%" stop-color="#1e3a8a"/>
        </linearGradient>
      </defs>
      
      <!-- Stage -->
      <rect x="100" y="10" width="200" height="30" rx="5" fill="url(#stageGrad)" />
      <text x="200" y="28" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="12" fill="white" text-anchor="middle">STAGE / SÂN KHẤU</text>
      
      <!-- Zone: SVIP (Center Front) -->
      <path d="M 120 60 L 280 60 L 290 110 L 110 110 Z" 
            class="seating-zone-path ${state.selectedZone === 'svip' ? 'selected' : ''} ${concert.ticketTypes.find(t=>t.id==='svip').available === 0 ? 'sold-out-zone' : ''}" 
            id="path-svip"
            fill="${ZONE_COLORS.svip}" 
            opacity="${state.selectedZone === 'svip' ? 0.95 : 0.6}"
            onclick="selectZoneFromMap('svip')"/>
      <text x="200" y="90" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="10" fill="white" text-anchor="middle" pointer-events="none">SVIP</text>

      <!-- Zone: VIP (Center Middle) -->
      <path d="M 105 120 L 295 120 L 310 180 L 90 180 Z" 
            class="seating-zone-path ${state.selectedZone === 'vip' ? 'selected' : ''} ${concert.ticketTypes.find(t=>t.id==='vip').available === 0 ? 'sold-out-zone' : ''}" 
            id="path-vip"
            fill="${ZONE_COLORS.vip}" 
            opacity="${state.selectedZone === 'vip' ? 0.95 : 0.6}"
            onclick="selectZoneFromMap('vip')"/>
      <text x="200" y="155" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="12" fill="white" text-anchor="middle" pointer-events="none">VIP</text>

      <!-- Zone: CAT 1 (Left Wing) -->
      <path d="M 20 60 L 95 110 L 80 230 L 10 180 Z" 
            class="seating-zone-path ${state.selectedZone === 'cat1' ? 'selected' : ''} ${concert.ticketTypes.find(t=>t.id==='cat1').available === 0 ? 'sold-out-zone' : ''}" 
            id="path-cat1"
            fill="${ZONE_COLORS.cat1}" 
            opacity="${state.selectedZone === 'cat1' ? 0.95 : 0.6}"
            onclick="selectZoneFromMap('cat1')"/>
      <text x="50" y="140" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="10" fill="white" text-anchor="middle" pointer-events="none">CAT 1</text>

      <!-- Zone: CAT 2 (Right Wing) -->
      <path d="M 305 110 L 380 60 L 390 180 L 320 230 Z" 
            class="seating-zone-path ${state.selectedZone === 'cat2' ? 'selected' : ''} ${concert.ticketTypes.find(t=>t.id==='cat2').available === 0 ? 'sold-out-zone' : ''}" 
            id="path-cat2"
            fill="${ZONE_COLORS.cat2}" 
            opacity="${state.selectedZone === 'cat2' ? 0.95 : 0.6}"
            onclick="selectZoneFromMap('cat2')"/>
      <text x="350" y="140" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="10" fill="white" text-anchor="middle" pointer-events="none">CAT 2</text>

      <!-- Zone: GA (Center Back) -->
      <path d="M 85 190 L 315 190 L 330 260 L 70 260 Z" 
            class="seating-zone-path ${state.selectedZone === 'ga' ? 'selected' : ''} ${concert.ticketTypes.find(t=>t.id==='ga').available === 0 ? 'sold-out-zone' : ''}" 
            id="path-ga"
            fill="${ZONE_COLORS.ga}" 
            opacity="${state.selectedZone === 'ga' ? 0.95 : 0.6}"
            onclick="selectZoneFromMap('ga')"/>
      <text x="200" y="230" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="12" fill="white" text-anchor="middle" pointer-events="none">GA STANDING</text>
    </svg>
  `;

  // Render Seating Legend
  const legend = document.getElementById("seating-legend-container");
  legend.innerHTML = "";
  concert.ticketTypes.forEach(type => {
    const item = document.createElement("div");
    item.className = `legend-item ${state.selectedZone === type.id ? 'active' : ''}`;
    item.onclick = () => selectZoneFromMap(type.id);
    item.innerHTML = `
      <span class="legend-dot" style="background:${ZONE_COLORS[type.id]}"></span>
      <span style="font-weight:600;">${type.name}</span>
      <span style="color:var(--text-secondary); margin-left:4px;">(${formatCurrency(type.price)})</span>
    `;
    legend.appendChild(item);
  });
}

function selectZoneFromMap(zoneId) {
  const concert = state.selectedConcert;
  const ticketType = concert.ticketTypes.find(t => t.id === zoneId);
  
  if (ticketType && ticketType.available === 0) {
    log(`Zone ${zoneId.toUpperCase()} is sold out, cannot select`, "warning");
    return;
  }

  state.selectedZone = zoneId;
  
  // Highlight SVG paths
  document.querySelectorAll(".seating-zone-path").forEach(path => {
    const id = path.id.replace("path-", "");
    path.classList.remove("selected");
    path.setAttribute("opacity", "0.6");
  });
  
  const selectedPath = document.getElementById(`path-${zoneId}`);
  if (selectedPath) {
    selectedPath.classList.add("selected");
    selectedPath.setAttribute("opacity", "0.95");
  }

  // Highlight Sidebar items
  document.querySelectorAll(".zone-item").forEach(item => {
    item.classList.remove("selected");
  });
  const selectedItem = document.getElementById(`zone-${zoneId}`);
  if (selectedItem) {
    selectedItem.classList.add("selected");
    selectedItem.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // Highlight Legend items
  document.querySelectorAll(".legend-item").forEach(item => {
    item.classList.remove("active");
  });

  // Enable/Disable CTA
  const ctaBtn = document.getElementById("btn-detail-checkout");
  if (ctaBtn) {
    ctaBtn.removeAttribute("disabled");
    ctaBtn.innerHTML = `Tiếp tục chọn số lượng <i data-lucide="arrow-right"></i>`;
    lucide.createIcons();
  }
  
  log(`Selected zone: ${zoneId.toUpperCase()} (${ticketType.name})`);
}

function renderTicketSidebar(concert) {
  const container = document.getElementById("sidebar-zones");
  container.innerHTML = "";
  
  concert.ticketTypes.forEach(type => {
    const item = document.createElement("div");
    item.className = `zone-item ${state.selectedZone === type.id ? 'selected' : ''} ${type.available === 0 ? 'sold-out' : ''}`;
    item.id = `zone-${type.id}`;
    
    // Custom click handler if not sold out
    if (type.available > 0) {
      item.onclick = () => selectZoneFromMap(type.id);
    }

    let availabilityText = `Còn ~${type.available} vé`;
    let availabilityClass = "availability-normal";
    
    if (type.available === 0) {
      availabilityText = "Hết vé";
      availabilityClass = "availability-critical";
    } else if (type.available < 15) {
      availabilityText = `🔥 Sắp hết vé (Còn ${type.available})`;
      availabilityClass = "availability-alert";
    }
    
    item.innerHTML = `
      <div class="zone-header">
        <span class="zone-name">${type.name}</span>
        <span class="zone-price">${formatCurrency(type.price)}</span>
      </div>
      <div class="zone-meta">
        <span class="${availabilityClass} zone-availability">${availabilityText}</span>
        <span style="color:var(--text-muted);">Hạn mức: ${type.quota} vé</span>
      </div>
    `;
    container.appendChild(item);
  });

  // Check state of CTA button
  const ctaBtn = document.getElementById("btn-detail-checkout");
  
  if (concert.status !== "selling") {
    ctaBtn.setAttribute("disabled", "true");
    ctaBtn.innerText = concert.status === "upcoming" ? "Sự kiện chưa mở bán" : "Sự kiện đã hết vé";
  } else if (!state.selectedZone) {
    ctaBtn.setAttribute("disabled", "true");
    ctaBtn.innerText = "Vui lòng chọn khu vực vé";
  } else {
    ctaBtn.removeAttribute("disabled");
    ctaBtn.innerHTML = `Tiếp tục chọn số lượng <i data-lucide="arrow-right"></i>`;
  }
}

function handleTicketCardBuyClick() {
  if (state.selectedZone) {
    proceedToCheckout();
  } else {
    scrollToBooking();
  }
}

function scrollToBooking() {
  const bookingSection = document.querySelector(".detail-grid");
  if (bookingSection) {
    bookingSection.scrollIntoView({ behavior: "smooth", block: "start" });
    
    // Highlight the sidebar zone list
    const sidebar = document.querySelector(".ticket-sidebar");
    if (sidebar) {
      sidebar.classList.add("highlight-pulse");
      setTimeout(() => {
        sidebar.classList.remove("highlight-pulse");
      }, 1500);
    }
  }
}

window.handleTicketCardBuyClick = handleTicketCardBuyClick;
window.scrollToBooking = scrollToBooking;

function proceedToCheckout() {
  if (!state.selectedConcert || !state.selectedZone) return;
  navigateTo(`#/concerts/${state.selectedConcert.id}/checkout`);
}

// ==========================================
// SCREEN 3: /checkout (Checkout Page Rendering)
// ==========================================

function renderCheckoutPage() {
  const concertId = state.params.id;
  const concert = CONCERTS.find(c => c.id === concertId);
  
  if (!concert || !state.selectedZone) {
    log(`Checkout failed: Concert/Zone invalid. Redirecting`, "error");
    navigateTo("#/concerts");
    return;
  }
  
  const zone = concert.ticketTypes.find(z => z.id === state.selectedZone);
  if (!zone) {
    navigateTo(`#/concerts/${concertId}`);
    return;
  }
  
  log(`Navigated to checkout for ${concert.title} - ${zone.name}`);
  showPageView("page-checkout");

  // Breadcrumbs Update
  document.getElementById("breadcrumbs-container").innerHTML = `
    <a href="#/concerts">Concerts</a>
    <span class="separator">/</span>
    <a href="#/concerts/${concert.id}">${concert.title}</a>
    <span class="separator">/</span>
    <span class="current">Thanh Toán</span>
  `;

  // Start Reservation Holding Timer (10:00)
  startReservationTimer(600); // 10 minutes

  // Hide Quota Business Error initially
  const errorAlert = document.getElementById("checkout-error-alert");
  errorAlert.style.display = "none";

  // Render Qty Card Info
  document.getElementById("qty-card-container").innerHTML = `
    <div class="ticket-qty-info">
      <span class="qty-name">${zone.name}</span>
      <span class="qty-price">${formatCurrency(zone.price)}</span>
      <span class="qty-limit">${getQuotaLimitMessage(zone.id, concert)}</span>
    </div>
    <div class="qty-selector">
      <button class="qty-btn" id="qty-minus" onclick="updateQty(-1)" disabled>-</button>
      <span class="qty-val" id="qty-value">1</span>
      <button class="qty-btn" id="qty-plus" onclick="updateQty(1)">+</button>
    </div>
  `;

  // Update quantity controls state
  state.selectedQuantity = 1;
  updateQtyDisplay(zone);

  // Render Sidebar Summary
  const summaryImg = document.getElementById("summary-event-img");
  // Set simple color background for image preview
  if (concert.posterImage) {
    summaryImg.src = concert.posterImage;
  } else {
    summaryImg.src = `data:image/svg+xml;utf8,${encodeURIComponent(generateSVGGraphic(concert.graphicSeed, '#064e3b', '#0f172a', 100, 100))}`;
  }
  
  document.getElementById("summary-event-title").innerText = concert.title;
  document.getElementById("summary-event-date").innerText = concert.date.split(" - ")[1];
  document.getElementById("summary-event-venue").innerText = concert.venue.split(",")[0];

  updateOrderTotals(zone);
  
  lucide.createIcons();
}

function startReservationTimer(durationSeconds) {
  let timer = durationSeconds;
  const display = document.getElementById("holding-timer-counter");
  
  clearInterval(state.reservationTimer);
  
  state.reservationTimer = setInterval(() => {
    const minutes = parseInt(timer / 60, 10);
    const seconds = parseInt(timer % 60, 10);

    const mStr = minutes < 10 ? "0" + minutes : minutes;
    const sStr = seconds < 10 ? "0" + seconds : seconds;

    display.textContent = mStr + ":" + sStr;

    if (--timer < 0) {
      clearInterval(state.reservationTimer);
      log("Reservation session timeout", "warning");
      alert("Hết thời gian giữ vé! Vui lòng thực hiện lại giao dịch.");
      navigateTo(`#/concerts/${state.selectedConcert.id}`);
    }
  }, 1000);
}

function updateQty(change) {
  const concert = state.selectedConcert;
  const zone = concert.ticketTypes.find(z => z.id === state.selectedZone);
  
  const newQty = state.selectedQuantity + change;
  // Constraint based on frontend display check (doesn't block backend simulation error test)
  if (newQty < 1 || newQty > zone.quota) return;

  state.selectedQuantity = newQty;
  updateQtyDisplay(zone);
  updateOrderTotals(zone);
}

function updateQtyDisplay(zone) {
  document.getElementById("qty-value").innerText = state.selectedQuantity;
  document.getElementById("qty-minus").disabled = state.selectedQuantity <= 1;
  document.getElementById("qty-plus").disabled = state.selectedQuantity >= zone.quota;
}

function updateOrderTotals(zone) {
  const ticketTotal = zone.price * state.selectedQuantity;
  const fee = ticketTotal * 0.02; // 2% booking fee
  const orderTotal = ticketTotal + fee;

  document.getElementById("summary-ticket-desc").innerText = `${zone.name} x ${state.selectedQuantity}`;
  document.getElementById("summary-ticket-cost").innerText = formatCurrency(ticketTotal);
  document.getElementById("summary-fee-cost").innerText = formatCurrency(fee);
  document.getElementById("summary-total-cost").innerText = formatCurrency(orderTotal);
}

// Simulated Order Submission (creating reservation)
function submitOrderReservation() {
  const btn = document.getElementById("btn-submit-order");
  btn.setAttribute("disabled", "true");
  btn.innerHTML = `<span class="spinner" style="width:16px; height:16px; border-width:2px; display:inline-block; margin-right:8px;"></span>Đang giữ chỗ...`;

  log(`[API POST] /orders/create - Payload: { concertId: ${state.selectedConcert.id}, zone: '${state.selectedZone}', qty: ${state.selectedQuantity} }`);

  setTimeout(() => {
    // Check Simulated Business Logic Error from Floating Controls widget
    if (state.mockState === "force_sold_out") {
      log("[API RESPONSE] 409 Conflict: TICKET_SOLD_OUT - Vé khu vực này vừa hết.", "error");
      showBusinessError("Vé đã bán hết", "Rất tiếc, loại vé này vừa được bán hết. Quý khách vui lòng chọn loại vé hoặc khu vực khác.");
      btn.removeAttribute("disabled");
      btn.innerHTML = `Xác nhận & Thanh toán <i data-lucide="credit-card"></i>`;
      lucide.createIcons();
      return;
    }

    if (state.mockState === "force_quota_exceeded") {
      log("[API RESPONSE] 400 Bad Request: QUOTA_LIMIT_EXCEEDED - Tài khoản đã mua vượt giới hạn.", "error");
      showBusinessError("Vượt quá giới hạn cho phép", "Tài khoản của bạn đã mua vé sự kiện này trước đó hoặc số lượng chọn vượt quá quota tối đa cho phép của tài khoản.");
      btn.removeAttribute("disabled");
      btn.innerHTML = `Xác nhận & Thanh toán <i data-lucide="credit-card"></i>`;
      lucide.createIcons();
      return;
    }

    if (state.mockState === "force_sale_closed") {
      log("[API RESPONSE] 403 Forbidden: SALE_CLOSED - Đợt mở bán chưa bắt đầu hoặc đã đóng.", "error");
      showBusinessError("Cổng bán vé đã đóng", "Đợt bán vé này hiện chưa mở hoặc đã kết thúc. Vui lòng quay lại sau.");
      btn.removeAttribute("disabled");
      btn.innerHTML = `Xác nhận & Thanh toán <i data-lucide="credit-card"></i>`;
      lucide.createIcons();
      return;
    }

    // Success reservation
    const orderId = `TB-${Math.floor(100000 + Math.random() * 900000)}`;
    log(`[API RESPONSE] 201 Created: Reservation successful. OrderId: ${orderId}`);
    
    state.currentOrder = {
      id: orderId,
      concert: state.selectedConcert,
      zone: state.selectedConcert.ticketTypes.find(z => z.id === state.selectedZone),
      quantity: state.selectedQuantity,
      totalAmount: (state.selectedConcert.ticketTypes.find(z => z.id === state.selectedZone).price * state.selectedQuantity) * 1.02,
      createdAt: new Date().toISOString()
    };

    navigateTo(`#/orders/${orderId}`);
  }, 1200); // 1.2s simulated backend delay
}

function showBusinessError(title, desc) {
  const alert = document.getElementById("checkout-error-alert");
  alert.querySelector(".alert-danger-title").innerText = title;
  alert.querySelector(".alert-danger-desc").innerText = desc;
  alert.style.display = "flex";
  
  // Smooth scroll to top of card to read the error
  alert.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ==========================================
// SCREEN 4: /orders/:id (Payment Status Rendering)
// ==========================================

function renderPaymentPage() {
  const order = state.currentOrder;
  
  if (!order || state.params.orderId !== order.id) {
    log(`Payment screen error: Order ID matches invalid or empty. Redirecting.`, "error");
    navigateTo("#/concerts");
    return;
  }

  log(`Navigated to payment page for order: ${order.id}`);
  showPageView("page-payment");

  // Breadcrumbs Update
  document.getElementById("breadcrumbs-container").innerHTML = `
    <span>Concerts</span>
    <span class="separator">/</span>
    <span>Thanh Toán</span>
    <span class="separator">/</span>
    <span class="current">Trạng Thái Đơn Hàng</span>
  `;

  // Render Billing Summary
  document.getElementById("payment-order-id").innerText = order.id;
  document.getElementById("payment-event-title").innerText = order.concert.title;
  document.getElementById("payment-ticket-type").innerText = `${order.zone.name} x ${order.quantity}`;
  document.getElementById("payment-amount-label").innerText = formatCurrency(order.totalAmount);

  // Transfer Info Details (VietQR simulation)
  document.getElementById("transfer-bank").innerText = "VIETCOMBANK (VCB)";
  document.getElementById("transfer-acc-no").innerHTML = `9837482937 <i data-lucide="copy" class="btn-copy" onclick="copyText('9837482937')"></i>`;
  document.getElementById("transfer-acc-name").innerText = "CONG TY TICKETBOX VIET NAM";
  document.getElementById("transfer-memo").innerHTML = `${order.id} <i data-lucide="copy" class="btn-copy" onclick="copyText('${order.id}')"></i>`;
  document.getElementById("transfer-amount").innerHTML = `${formatCurrency(order.totalAmount)} <i data-lucide="copy" class="btn-copy" onclick="copyText('${Math.round(order.totalAmount)}')"></i>`;

  // Render QR Code (VietQR mockup with MoMo logo inside)
  const qrBox = document.getElementById("payment-qr-wrap");
  qrBox.innerHTML = `
    ${generateQRcodeSVG(`vietqr://payment?bank=vcb&acc=9837482937&amount=${Math.round(order.totalAmount)}&memo=${order.id}`)}
    <div class="qr-logo-overlay">
      <span style="font-size:10px; font-weight:800; color:var(--accent-green);">Ticket</span>
    </div>
  `;

  // Start polling simulation status
  startPaymentPolling();
  
  lucide.createIcons();
}

function startPaymentPolling() {
  const sidebar = document.getElementById("payment-status-card");
  const badge = sidebar.querySelector(".status-badge");
  const title = sidebar.querySelector(".payment-status-title");
  const desc = sidebar.querySelector(".payment-status-desc");
  const pulseCircle = sidebar.querySelector(".pulse-circle");
  const innerCircle = sidebar.querySelector(".inner-circle");
  
  let ticks = 0;
  
  // Set starting state
  sidebar.className = "payment-status-sidebar"; // reset classes
  badge.innerText = "Đang chờ thanh toán";
  title.innerText = "Chờ Chuyển Khoản";
  desc.innerText = "Hệ thống đang quét giao dịch tự động. Quý khách vui lòng quét mã QR hoặc chuyển khoản đúng nội dung.";
  pulseCircle.style.background = "var(--accent-amber)";
  innerCircle.innerHTML = `<i data-lucide="loader-2" style="width:24px; height:24px;"></i>`;
  
  clearInterval(state.paymentPoller);
  
  // Simulated background API polling
  state.paymentPoller = setInterval(() => {
    ticks++;
    log(`[POLLING] /api/orders/${state.currentOrder.id}/status - Attempt #${ticks}... STATUS: PENDING`);
    
    if (ticks === 3) {
      log(`[POLLING] Verifying transaction matching OrderID: ${state.currentOrder.id}...`);
      badge.innerText = "Đang đối soát";
      title.innerText = "Đang Xác Thực GD";
      desc.innerText = "Đã phát hiện biến động số dư. Hệ thống đang xác nhận chữ ký số của giao dịch.";
    }
    
    if (ticks >= 6) {
      clearInterval(state.paymentPoller);
      resolvePaymentOutcome();
    }
  }, 2000); // Poll every 2 seconds
}

function forcePaymentOutcome(outcome) {
  state.mockPaymentStatus = outcome;
  clearInterval(state.paymentPoller);
  log(`[CONTROL] Forced Payment Outcome to: ${outcome.toUpperCase()}`);
  resolvePaymentOutcome();
}

function resolvePaymentOutcome() {
  const sidebar = document.getElementById("payment-status-card");
  const badge = sidebar.querySelector(".status-badge");
  const title = sidebar.querySelector(".payment-status-title");
  const desc = sidebar.querySelector(".payment-status-desc");
  const innerCircle = sidebar.querySelector(".inner-circle");
  
  if (state.mockPaymentStatus === "success") {
    log(`[API POLLING SUCCESS] Payment confirmed for Order ${state.currentOrder.id}. Generating E-Ticket...`);
    
    sidebar.classList.add("success");
    badge.innerText = "Thành công";
    title.innerText = "Thanh Toán Thành Công!";
    desc.innerText = "Vé của bạn đã được xuất trên hệ thống. Trình duyệt sẽ tự chuyển hướng sau 3 giây...";
    innerCircle.innerHTML = `<i data-lucide="check" style="width:28px; height:28px;"></i>`;
    
    lucide.createIcons();
    
    setTimeout(() => {
      navigateTo(`#/tickets/${state.currentOrder.id}`);
    }, 3000);
    
  } else if (state.mockPaymentStatus === "failure") {
    log(`[API POLLING FAILURE] Order ${state.currentOrder.id} verification failed. Bad signature or signature mismatch.`, "error");
    
    sidebar.classList.add("failure");
    badge.innerText = "Thất bại";
    title.innerText = "Giao Dịch Thất Bại";
    desc.innerText = "Cổng thanh toán phản hồi lỗi chữ ký giao dịch không hợp lệ hoặc giao dịch bị hủy.";
    innerCircle.innerHTML = `<i data-lucide="x" style="width:28px; height:28px;"></i>`;
    
    // Show retry trigger button
    const container = sidebar.querySelector(".polling-box");
    container.innerHTML = `
      <button class="btn-ticket-action primary" onclick="startPaymentPolling()" style="width:100%;">
        <i data-lucide="refresh-cw"></i> Thử lại thanh toán
      </button>
    `;
    lucide.createIcons();
    
  } else {
    // Timeout outcome
    log(`[API POLLING TIMEOUT] Order ${state.currentOrder.id} exceeded lock timer without successful webhook payment callback.`, "warning");
    
    sidebar.classList.add("failure");
    badge.innerText = "Hết hạn";
    title.innerText = "Giao Dịch Hết Hạn";
    desc.innerText = "Đã quá thời gian giữ chỗ 10 phút nhưng hệ thống chưa nhận được khoản thanh toán hợp lệ.";
    innerCircle.innerHTML = `<i data-lucide="clock" style="width:28px; height:28px;"></i>`;
    
    // Show escape route
    const container = sidebar.querySelector(".polling-box");
    container.innerHTML = `
      <button class="btn-ticket-action" onclick="navigateTo('#/concerts')" style="width:100%;">
        Quay lại trang chủ
      </button>
    `;
    lucide.createIcons();
  }
}

// ==========================================
// SCREEN 5: /tickets/:id (E-Ticket View Rendering)
// ==========================================

function renderTicketPage() {
  const order = state.currentOrder;
  
  if (!order || state.params.ticketId !== order.id) {
    log(`Ticket screen error: Ticket ID matches invalid or empty. Redirecting.`, "error");
    navigateTo("#/concerts");
    return;
  }

  log(`Navigated to E-ticket page for order: ${order.id}`);
  showPageView("page-ticket");

  // Breadcrumbs Update
  document.getElementById("breadcrumbs-container").innerHTML = `
    <span>Lịch Sử Mua Vé</span>
    <span class="separator">/</span>
    <span class="current">E-Ticket QR</span>
  `;

  // Render Stub Graphic Banner
  const stubBanner = document.getElementById("ticket-graphic-container");
  const stubBannerContent = order.concert.posterImage 
    ? `<img src="${order.concert.posterImage}" alt="${order.concert.title}" style="width:100%; height:100%; object-fit:cover;">` 
    : generateSVGGraphic(order.concert.graphicSeed, "#022c22", "#0f172a", 480, 120);
    
  stubBanner.innerHTML = `
    ${stubBannerContent}
    <div class="ticket-graphic-overlay">
      <span class="ticket-event-badge">Vé Khán Giả</span>
    </div>
  `;

  // Populate Ticket Info
  document.getElementById("ticket-concert-title").innerText = order.concert.title;
  document.getElementById("ticket-date").innerText = order.concert.date.split(" - ")[1];
  document.getElementById("ticket-venue").innerText = order.concert.venue.split(",")[0];
  document.getElementById("ticket-zone-name").innerText = order.zone.name;
  
  // Seat number generation
  const seats = [];
  for (let i = 0; i < order.quantity; i++) {
    seats.push(`Row J-${Math.floor(10 + Math.random() * 50)}`);
  }
  document.getElementById("ticket-seat").innerText = seats.join(", ");
  
  document.getElementById("ticket-buyer-name").innerText = "Nguyễn Văn Khán Giả";
  document.getElementById("ticket-buyer-email").innerText = "audience@ticketbox.vn";

  // Code formats
  document.getElementById("ticket-code-display").innerText = order.id;

  // Render Ticket QR
  const qrWrap = document.getElementById("ticket-qr-wrap");
  qrWrap.innerHTML = generateQRcodeSVG(`ticketbox://verify?ticketId=${order.id}&hash=signed_sha256_jwt_token`);

  // Crypto Signature mockup to prove backend validation
  const signatureHex = `SHA-256: ${sha256Mock(order.id + order.zone.id + order.quantity)}`;
  document.getElementById("ticket-signature").innerText = signatureHex;
  
  lucide.createIcons();
}

function sha256Mock(str) {
  // Simple deterministic mockup signature string
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `0x${Math.abs(hash).toString(16).padStart(8, '0')}7fcae8439df93aa${Math.abs(hash * 31).toString(16).slice(0, 8)}fd`;
}

// Copy to clipboard helper
function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    log(`Copied text: ${text}`);
    // Show mini toast notifications
    showToast("Đã sao chép vào bộ nhớ tạm");
  });
}

function showToast(msg) {
  // Simple alert/toast mechanism
  const toast = document.createElement("div");
  toast.style.position = "fixed";
  toast.style.bottom = "84px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.background = "var(--bg-tertiary)";
  toast.style.border = "1px solid var(--border-active)";
  toast.style.color = "var(--text-primary)";
  toast.style.padding = "10px 24px";
  toast.style.borderRadius = "30px";
  toast.style.fontSize = "13px";
  toast.style.fontWeight = "600";
  toast.style.zIndex = "9999";
  toast.style.boxShadow = "var(--shadow-premium)";
  toast.style.animation = "fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
  
  toast.innerText = msg;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = "fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards";
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// Print Handler
function printTicket() {
  window.print();
}

// ==========================================
// MOCK STATE / CONTROLS INTERACTIVE PANEL
// ==========================================

function initControlsPanel() {
  const widget = document.getElementById("proto-controls-widget");
  const header = widget.querySelector(".proto-widget-header");
  const toggleBtn = document.getElementById("proto-widget-toggle");

  header.addEventListener("click", () => {
    widget.classList.toggle("collapsed");
    const isCollapsed = widget.classList.contains("collapsed");
    toggleBtn.innerHTML = isCollapsed ? `<i data-lucide="chevron-up"></i>` : `<i data-lucide="chevron-down"></i>`;
    lucide.createIcons();
  });

  // Attach controls listeners
  document.getElementById("ctrl-backend-state").addEventListener("change", (e) => {
    state.mockState = e.target.value;
    log(`[CONTROL] Configured mock backend response state: ${state.mockState.toUpperCase()}`);
  });

  document.getElementById("ctrl-payment-state").addEventListener("change", (e) => {
    state.mockPaymentStatus = e.target.value;
    log(`[CONTROL] Configured mock payment verification outcome: ${state.mockPaymentStatus.toUpperCase()}`);
  });
}

function changeAppState(newState) {
  state.appState = newState;
  log(`[CONTROL] Changing application state to: ${newState.toUpperCase()}`);
  
  // Re-run listing if current route is concerts
  if (state.currentRoute === "#/concerts" || state.currentRoute === "") {
    renderConcertsPage();
  }
}

function resetAppState() {
  state.appState = "ready";
  log(`[CONTROL] Reset app state to default READY`);
  renderConcertsPage();
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  initRouter();
  initControlsPanel();
  log("Prototype System Initialized. Use the float control panel to toggle system errors.");
});
