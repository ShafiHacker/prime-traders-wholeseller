// js/store.js
let allProducts = [];
let selectedCategory = 'All';
let cart = [];

// Safely initialize Firestore db instance
const database = window.db || (window.firebase ? firebase.firestore() : null);

function listenToLiveCatalog() {
    if (!database) {
        console.error("Firebase Firestore is not initialized!");
        document.getElementById('productGrid').innerHTML = `<div class="col-span-full text-center text-rose-400 py-8">Firebase connection error. Please check configuration.</div>`;
        return;
    }

    // 1. INSTANT LOAD: Pehle local storage se foran products dikhao taaki loading khatam ho jaye
    const cachedProducts = localStorage.getItem('prime_cached_products');
    if (cachedProducts) {
        try {
            allProducts = JSON.parse(cachedProducts);
            renderPublicCategoriesGrid(allProducts);
            filterProducts();
        } catch (e) {
            console.error("Cache parse error:", e);
        }
    }

    // 2. REAL-TIME SYNC: Background mein Firebase se data sync hota rahega aur cache update hogi
    database.collection('products').onSnapshot(snapshot => {
        allProducts = [];
        const dynamicCategories = new Set();

        snapshot.forEach(doc => {
            const data = doc.data();
            allProducts.push({ id: doc.id, ...data });
            if (data.category && data.category.trim() !== '') {
                dynamicCategories.add(data.category.trim());
            }
        });

        allProducts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        
        // Save to LocalStorage safely (Protected against QuotaExceededError)
        try {
            localStorage.setItem('prime_cached_products', JSON.stringify(allProducts));
        } catch (storageError) {
            console.warn("Storage quota full, clearing cache:", storageError);
            localStorage.removeItem('prime_cached_products');
        }
        
        renderPublicCategoriesGrid(allProducts);
        filterProducts();
    }, err => {
        console.error("Firestore Error, retrying connection...", err);
        setTimeout(listenToLiveCatalog, 3000);
    });
}

function renderPublicCategoriesGrid(productsList) {
    const counts = {};
    productsList.forEach(p => {
        const cat = p.category || 'General';
        counts[cat] = (counts[cat] || 0) + 1;
    });

    const defaultCats = [
        'Fashion & Apparel', 
        'Electronics & Gadgets', 
        'Home & Kitchen', 
        'Accessories',
        'Computer Accessories',
        'Dish Set',
        'Medicine Box',
        'Mobile Accessories'
    ];

    const allCats = Array.from(new Set([...defaultCats, ...Object.keys(counts)]));

    // 1. Render Left Sidebar Menu
    const sidebar = document.getElementById('publicCategoriesSidebar');
    if (sidebar) {
        let sidebarHtml = `
            <div onclick="setCategoryFromGrid('All')" class="flex items-center justify-between p-2 rounded-xl hover:bg-blue-50 text-slate-700 hover:text-[#2563EB] cursor-pointer transition text-xs font-bold">
                <span><i class="fa-solid fa-layer-group mr-2 text-[#2563EB]"></i> All Products</span>
                <span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">${productsList.length}</span>
            </div>
        `;
        allCats.forEach(cat => {
            const num = counts[cat] || 0;
            sidebarHtml += `
                <div onclick="setCategoryFromGrid('${cat}')" class="flex items-center justify-between p-2 rounded-xl hover:bg-blue-50 text-slate-700 hover:text-[#2563EB] cursor-pointer transition text-xs font-semibold">
                    <span class="truncate"><i class="fa-solid fa-angle-right mr-2 text-[10px] text-slate-400"></i> ${cat}</span>
                    <span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">${num}</span>
                </div>
            `;
        });
        sidebar.innerHTML = sidebarHtml;
    }
}

function setCategoryFromGrid(catName) {
    selectedCategory = catName;
    filterProducts();
    window.scrollTo({ top: 400, behavior: 'smooth' });
}

function filterProducts() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    const filtered = allProducts.filter(p => {
        const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
        const matchesQuery = p.title.toLowerCase().includes(query) || (p.desc && p.desc.toLowerCase().includes(query));
        return matchesCat && matchesQuery;
    });
    renderProducts(filtered);
}

function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    if (!products.length) {
        grid.innerHTML = `<div class="col-span-full text-center text-slate-400 py-12">No products found.</div>`;
        return;
    }

    let html = '';
    products.forEach(p => {
        const discPrice = p.price || 0;
        const origPrice = p.originalPrice || Math.round(discPrice * 1.3);
        const discountPercent = origPrice > discPrice ? Math.round(((origPrice - discPrice) / origPrice) * 100) : 0;
        const mainImg = (p.images && p.images.length > 0) ? p.images[0] : (p.image || 'https://via.placeholder.com/400');
        const isOutOfStock = p.stock !== undefined && p.stock <= 0;
        const bulkBadge = p.bulkPrice && p.bulkQty ? `<div class="text-[10px] text-orange-600 font-bold bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md mt-1 inline-block">Buy ${p.bulkQty}+ @ PKR ${p.bulkPrice}/pc</div>` : '';

        html += `
            <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl transition shadow-sm flex flex-col justify-between relative group">
                <div>
                    <div class="relative h-48 bg-slate-50 overflow-hidden cursor-pointer" onclick="openProductModal('${p.id}')">
                        <img src="${mainImg}" alt="${p.title}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition duration-300 ${isOutOfStock ? 'opacity-40' : ''}">
                        
                        <!-- Discount Badge -->
                        ${discountPercent > 0 && !isOutOfStock ? `<span class="absolute top-2.5 left-2.5 bg-orange-500 text-white px-2 py-0.5 rounded-md text-[10px] font-black uppercase shadow-sm">-${discountPercent}%</span>` : ''}
                        
                        <!-- Stock Status Badge -->
                        ${isOutOfStock ? `<span class="absolute top-2.5 left-2.5 bg-rose-600 text-white px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase shadow-sm">OUT OF STOCK</span>` : ''}

                        <!-- Wishlist Button -->
                        <button onclick="event.stopPropagation(); alert('Added to Wishlist! ❤️');" class="absolute top-2.5 right-2.5 w-8 h-8 bg-white/90 hover:bg-white text-slate-400 hover:text-rose-500 rounded-full flex items-center justify-center shadow transition">
                            <i class="fa-regular fa-heart text-sm"></i>
                        </button>
                    </div>

                    <div class="p-4 space-y-1.5">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${p.category || 'General'}</span>
                        <h3 class="font-bold text-slate-800 text-xs md:text-sm line-clamp-2 cursor-pointer hover:text-[#2563EB] h-9" onclick="openProductModal('${p.id}')">${p.title}</h3>
                        
                        <div class="flex items-center gap-2 pt-1">
                            <span class="text-sm md:text-base font-black text-[#102544]">PKR ${discPrice}</span>
                            ${origPrice > discPrice ? `<span class="text-xs text-slate-400 line-through font-semibold">PKR ${origPrice}</span>` : ''}
                        </div>
                        ${bulkBadge}
                    </div>
                </div>

                <div class="p-4 pt-0 grid grid-cols-2 gap-2">
                    <button onclick="openProductModal('${p.id}')" ${isOutOfStock ? 'disabled' : ''} class="w-full py-2.5 ${isOutOfStock ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-[#102544]'} font-bold rounded-xl text-[11px] transition flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-cart-shopping text-amber-500"></i> ${isOutOfStock ? 'Out of Stock' : 'Cart'}
                    </button>
                    <button onclick="buyCardProductDirect('${p.id}')" ${isOutOfStock ? 'disabled' : ''} class="w-full py-2.5 ${isOutOfStock ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#102544] hover:bg-[#2563EB] text-white shadow-md'} font-bold rounded-xl text-[11px] transition flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-bolt text-amber-400"></i> Buy Now
                    </button>
                </div>
            </div>
        `;
    });
    grid.innerHTML = html;
}

function buyCardProductDirect(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;
    cart = []; // Reset cart for direct buy or push
    cart.push({ ...product, selectedSize: product.sizes?.[0] || 'Standard', selectedColor: product.colors?.[0] || 'As Shown', qty: 1 });
    updateCartBadge();
    openCheckoutModal();
}

async function openProductModal(id) {
    const p = allProducts.find(item => item.id === id);
    if (!p) return;

    const discPrice = p.price || 0;
    const origPrice = p.originalPrice || Math.round(discPrice * 1.3);
    const imagesList = (p.images && p.images.length > 0) ? p.images : [p.image || 'https://via.placeholder.com/400'];
    const isOutOfStock = p.stock !== undefined && p.stock <= 0;

    let sizeOptions = p.sizes && p.sizes.length > 0 ? p.sizes.map(s => `<option value="${s}">${s}</option>`).join('') : '<option value="Standard">Standard</option>';
    let colorOptions = p.colors && p.colors.length > 0 ? p.colors.map(c => `<option value="${c}">${c}</option>`).join('') : '<option value="As Shown">As Shown</option>';

    let thumbsHtml = imagesList.map((img) => `
        <img src="${img}" onclick="switchModalMainImage('${img}')" class="w-14 h-14 object-cover rounded-xl border border-slate-200 cursor-pointer hover:border-[#2563EB] transition shadow-xs">
    `).join('');

    const modalWrapper = document.getElementById('productModal');
    if (modalWrapper) {
        const innerBox = modalWrapper.querySelector('div > div') || modalWrapper.children[0];
        if (innerBox) {
            innerBox.className = "bg-white border border-slate-200 rounded-3xl p-5 md:p-8 max-w-4xl w-full mx-4 relative max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl";
        }
    }

    const modalHtml = `
        <div class="flex justify-between items-start border-b border-slate-100 pb-4">
            <div>
                <div class="flex items-center gap-2">
                    <span class="text-[11px] font-bold text-[#102544] bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">${p.category}</span>
                    ${p.weight && p.weight !== 'N/A' ? `<span class="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full"><i class="fa-solid fa-weight-hanging mr-1 text-[#102544]"></i>${p.weight}</span>` : ''}
                </div>
                <h2 class="text-base md:text-xl font-black text-slate-900 mt-2">${p.title}</h2>
            </div>
            <div class="text-right flex items-center gap-4">
                <div>
                    <div class="text-lg md:text-2xl font-black text-[#102544]">PKR ${discPrice}</div>
                    <div class="text-xs text-slate-400 line-through font-bold">PKR ${origPrice}</div>
                </div>
                <button onclick="closeProductModal()" class="text-slate-400 hover:text-slate-700 w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-lg transition"><i class="fa-solid fa-xmark"></i></button>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div class="space-y-3">
                <div class="bg-slate-50 rounded-2xl overflow-hidden h-72 md:h-80 border border-slate-200 shadow-inner flex items-center justify-center p-2">
                    <img id="modalMainImg" src="${imagesList[0]}" class="w-full h-full object-cover rounded-xl">
                </div>
                <div class="flex gap-2 overflow-x-auto pb-1">
                    ${thumbsHtml}
                </div>
            </div>

            <div class="space-y-4">
                <div class="grid grid-cols-3 gap-3">
                    <div>
                        <label class="block text-slate-600 text-xs font-bold mb-1.5">SIZE:</label>
                        <select id="modalSelectSize" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-bold outline-none focus:border-[#2563EB]">
                            ${sizeOptions}
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-600 text-xs font-bold mb-1.5">COLOR:</label>
                        <select id="modalSelectColor" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-bold outline-none focus:border-[#2563EB]">
                            ${colorOptions}
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-600 text-xs font-bold mb-1.5">QTY:</label>
                        <input type="number" id="modalSelectQty" value="1" min="1" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-bold outline-none focus:border-[#2563EB]">
                    </div>
                </div>

                <div>
                    <h3 class="font-bold text-slate-700 mb-1.5 text-xs">Description:</h3>
                    <p class="text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200 leading-relaxed whitespace-pre-line max-h-44 overflow-y-auto">${p.desc || 'No description provided.'}</p>
                </div>
            </div>
        </div>

        <div class="border-t border-slate-100 pt-5 flex gap-3">
            <button onclick="addSelectedToCart('${p.id}')" ${isOutOfStock ? 'disabled' : ''} class="flex-1 py-3.5 ${isOutOfStock ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' : 'bg-white border-2 border-[#102544] hover:bg-slate-50 text-[#102544]'} font-bold rounded-2xl text-xs md:text-sm flex items-center justify-center gap-2 transition shadow-xs">
                <i class="fa-solid fa-cart-plus text-[#102544]"></i> ${isOutOfStock ? 'Out of Stock' : 'Add To Cart'}
            </button>
            <button onclick="buySelectedNow('${p.id}')" ${isOutOfStock ? 'disabled' : ''} class="flex-1 py-3.5 ${isOutOfStock ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#102544] hover:bg-[#2563EB] text-white'} font-black rounded-2xl text-center text-xs md:text-sm shadow-md transition flex items-center justify-center gap-2">
                <i class="fa-solid fa-bolt text-amber-400"></i> Buy Now
            </button>
        </div>
    `;

    document.getElementById('modalContent').innerHTML = modalHtml;
    modalWrapper.classList.remove('hidden');
}

function switchModalMainImage(src) {
    document.getElementById('modalMainImg').src = src;
}

function closeProductModal() {
    document.getElementById('productModal').classList.add('hidden');
}

function addSelectedToCart(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    const size = document.getElementById('modalSelectSize').value;
    const color = document.getElementById('modalSelectColor').value;
    const qty = parseInt(document.getElementById('modalSelectQty').value) || 1;

    cart.push({ ...product, selectedSize: size, selectedColor: color, qty });
    updateCartBadge();
    closeProductModal();
    alert(`${product.title} (x${qty}) added to Cart! 🛒`);
}

function buySelectedNow(id) {
    addSelectedToCart(id);
    closeProductModal();
    openCheckoutModal();
}

function updateCartBadge() {
    const badge = document.getElementById('cartCountBadge');
    if (!badge) return;
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    badge.innerText = totalQty;
}

function calculateItemPrice(item) {
    if (item.bulkPrice && item.bulkQty && item.qty >= item.bulkQty) {
        return item.bulkPrice;
    }
    return item.price;
}

function openCartModal() {
    const list = document.getElementById('cartItemsList');
    if (!list) return;
    if (cart.length === 0) {
        list.innerHTML = `<p class="text-center text-slate-400 py-8">Your cart is empty.</p>`;
        document.getElementById('cartTotalAmount').innerText = "PKR 0";
    } else {
        let html = '';
        let total = 0;
        cart.forEach((item, index) => {
            const unitPrice = calculateItemPrice(item);
            const subtotal = unitPrice * item.qty;
            total += subtotal;
            const img = (item.images && item.images.length > 0) ? item.images[0] : (item.image || '');

            html += `
                <div class="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div class="flex items-center gap-3">
                        <img src="${img}" class="w-12 h-12 object-cover rounded-lg border border-slate-200">
                        <div>
                            <h4 class="font-bold text-slate-800 text-xs line-clamp-1">${item.title}</h4>
                            <p class="text-[#102544] font-bold text-[11px] mt-0.5">PKR ${unitPrice} x ${item.qty} = <span class="font-black">PKR ${subtotal}</span></p>
                        </div>
                    </div>
                    <button onclick="removeFromCart(${index})" class="text-rose-500 hover:text-rose-700 p-2 transition">
                        <i class="fa-solid fa-trash text-sm"></i>
                    </button>
                </div>
            `;
        });
        list.innerHTML = html;
        document.getElementById('cartTotalAmount').innerText = `PKR ${total}`;
    }
    document.getElementById('cartModal').classList.remove('hidden');
}

function closeCartModal() {
    document.getElementById('cartModal').classList.add('hidden');
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartBadge();
    openCartModal();
}

function openCheckoutModal() {
    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }
    
    setupCheckoutDCInputs();
    calculateLiveDC();
    closeCartModal();
    document.getElementById('checkoutModal').classList.remove('hidden');
}

function setupCheckoutDCInputs() {
    const form = document.querySelector('#checkoutModal form');
    if (!form || document.getElementById('checkoutDCBreakdown')) return;

    const container = document.createElement('div');
    container.id = 'checkoutDCBreakdown';
    container.className = "space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs";
    container.innerHTML = `
        <div class="border-t border-slate-200 pt-2 space-y-1.5 text-slate-600">
            <div class="flex justify-between"><span>Subtotal:</span> <span id="summarySubtotal" class="font-bold text-slate-900">PKR 0</span></div>
            <div class="flex justify-between"><span>Delivery Charges (DC):</span> <span id="summaryDC" class="font-bold text-[#102544]">PKR 0</span></div>
            <div class="flex justify-between text-sm border-t border-slate-200 pt-2 font-black text-[#102544]">
                <span>Total COD Amount:</span> <span id="summaryFinalTotal">PKR 0</span>
            </div>
        </div>
    `;
    
    const submitBtn = form.querySelector('button[type="submit"]') || form.lastElementChild;
    form.insertBefore(container, submitBtn);
}

async function calculateLiveDC() {
    let subtotal = 0;
    cart.forEach(i => subtotal += (calculateItemPrice(i) * i.qty));

    const cityInput = document.getElementById('custCity');
    const cityName = cityInput ? cityInput.value.trim().toLowerCase() : 'karachi';
    
    // Fixed default distance and weight without showing inputs on form
    const distanceKm = 5;
    const weightKg = 0.5;

    let baseDC = 150, perKm = 20, perKg = 50, outerCityDC = 450;
    try {
        const doc = await database.collection('settings').doc('logistics').get();
        if (doc.exists) {
            const d = doc.data();
            baseDC = d.baseDC || 150;
            perKm = d.perKm || 20;
            perKg = d.perKg || 50;
            outerCityDC = d.outerCityDC || 450;
        }
    } catch (e) {
        console.error("Error fetching DC rates:", e);
    }

    let calculatedDC = 0;
    if (cityName.includes('karachi') || cityName === '') {
        calculatedDC = baseDC + (distanceKm * perKm) + (weightKg * perKg);
    } else {
        calculatedDC = outerCityDC;
    }

    let finalTotal = subtotal + calculatedDC;

    if (document.getElementById('summarySubtotal')) document.getElementById('summarySubtotal').innerText = `PKR ${subtotal}`;
    if (document.getElementById('summaryDC')) document.getElementById('summaryDC').innerText = `PKR ${calculatedDC}`;
    if (document.getElementById('summaryFinalTotal')) document.getElementById('summaryFinalTotal').innerText = `PKR ${finalTotal}`;
    if (document.getElementById('checkoutOrderTotal')) document.getElementById('checkoutOrderTotal').innerText = `PKR ${finalTotal}`;

    return { subtotal, calculatedDC, finalTotal };
}

function closeCheckoutModal() {
    document.getElementById('checkoutModal').classList.add('hidden');
}

async function submitCheckoutOrder(e) {
    e.preventDefault();
    const btn = document.getElementById('confirmOrderBtn');
    btn.disabled = true;
    btn.innerText = "Submitting Order to Logistics...";

    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const city = document.getElementById('custCity').value.trim();
    const address = document.getElementById('custAddress').value.trim();
    const distanceKm = 5;
    const weightKg = 0.5;

    const { subtotal, calculatedDC, finalTotal } = await calculateLiveDC();

    const autoTrackingId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const fullDestinationAddress = `${city} - ${address} (Dist: ${distanceKm}km, Wt: ${weightKg}kg)`;

    try {
        await database.collection('parcels').add({
            trackId: autoTrackingId,
            custName: name,
            custPhone: phone,
            custCity: city,
            custAddress: fullDestinationAddress,
            subtotal: subtotal,
            deliveryCharges: calculatedDC,
            totalCod: finalTotal,
            weightKg: weightKg,
            distanceKm: distanceKm,
            items: cart,
            status: 'Pending',
            approvedByAdmin: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await database.collection('orders').add({
            customerName: name,
            customerPhone: phone,
            customerAddress: fullDestinationAddress,
            subtotal: subtotal,
            deliveryCharges: calculatedDC,
            totalAmount: finalTotal,
            items: cart,
            status: 'Pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showCustomAlert("SUCCESS", `Order successfully submit ho gaya hai!\nTracking ID: ${autoTrackingId}\nTotal COD (Incl. DC): PKR ${finalTotal}`, "success");
        cart = [];
        updateCartBadge();
        closeCheckoutModal();
        document.getElementById('checkoutModal').querySelector('form').reset();
    } catch (err) {
        showCustomAlert("ERROR!", "Error submitting order: " + err.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Submit Order to Main Dashboard`;
    }
}

listenToLiveCatalog();

// Custom Modal Alert Function (Replaces native alert popups)
function showCustomAlert(title, message, type = 'success', callback = null) {
    const modal = document.getElementById('customAlertModal');
    if (!modal) {
        alert(message); // Fallback
        return;
    }

    const titleEl = document.getElementById('customAlertTitle');
    const msgEl = document.getElementById('customAlertMessage');
    const iconEl = document.getElementById('customAlertIcon');
    const btnEl = document.getElementById('customAlertBtn');

    titleEl.innerText = title || (type === 'success' ? 'SUCCESS' : 'ERROR!');
    msgEl.innerText = message || '';

    if (type === 'success') {
        titleEl.className = "text-xl font-black uppercase tracking-wider text-emerald-600";
        iconEl.className = "flex justify-center text-emerald-500 text-5xl mb-2";
        iconEl.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
        btnEl.className = "w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl text-xs tracking-wider uppercase shadow-lg transition transform active:scale-95";
    } else {
        titleEl.className = "text-xl font-black uppercase tracking-wider text-rose-600";
        iconEl.className = "flex justify-center text-rose-500 text-5xl mb-2";
        iconEl.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
        btnEl.className = "w-full py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl text-xs tracking-wider uppercase shadow-lg transition transform active:scale-95";
    }

    btnEl.onclick = function() {
        closeCustomAlert();
        if (typeof callback === 'function') callback();
    };

    modal.classList.remove('hidden');
}

function closeCustomAlert() {
    const modal = document.getElementById('customAlertModal');
    if (modal) modal.classList.add('hidden');
}

// Override default window alert to use our custom modal automatically
window.alert = function(msg) {
    let isError = msg.toLowerCase().includes('error') || msg.toLowerCase().includes('failed') || msg.toLowerCase().includes('enter');
    showCustomAlert(isError ? "ERROR!" : "SUCCESS", msg, isError ? "error" : "success");
};
