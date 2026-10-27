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

    const grid = document.getElementById('publicCategoriesGrid');
    if (!grid) return;

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

    let html = `
        <div onclick="setCategoryFromGrid('All')" class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center flex flex-col items-center justify-center space-y-1 hover:border-amber-500/50 transition shadow cursor-pointer">
            <div class="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs">
                <i class="fa-solid fa-layer-group"></i>
            </div>
            <h3 class="font-bold text-slate-200 text-[11px] line-clamp-1">All Products</h3>
            <span class="bg-amber-950/60 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[9px] font-bold">${productsList.length} products</span>
        </div>
    `;

    allCats.forEach(cat => {
        const num = counts[cat] || 0;
        html += `
            <div onclick="setCategoryFromGrid('${cat}')" class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center flex flex-col items-center justify-center space-y-1 hover:border-amber-500/50 transition shadow cursor-pointer">
                <div class="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs">
                    <i class="fa-solid fa-box-open"></i>
                </div>
                <h3 class="font-bold text-slate-200 text-[11px] line-clamp-1">${cat}</h3>
                <span class="bg-amber-950/60 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[9px] font-bold">${num} products</span>
            </div>
        `;
    });
    grid.innerHTML = html;
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
        const mainImg = (p.images && p.images.length > 0) ? p.images[0] : (p.image || 'https://via.placeholder.com/400');
        const isOutOfStock = p.stock !== undefined && p.stock <= 0;
        const bulkBadge = p.bulkPrice && p.bulkQty ? `<div class="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded mt-1 inline-block">Buy ${p.bulkQty}+ @ PKR ${p.bulkPrice}/pc</div>` : '';

        html += `
            <div class="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-amber-400/60 transition shadow-lg flex flex-col justify-between">
                <div>
                    <div class="relative h-48 bg-slate-950 overflow-hidden cursor-pointer" onclick="openProductModal('${p.id}')">
                        <img src="${mainImg}" alt="${p.title}" class="w-full h-full object-cover hover:scale-105 transition duration-300 ${isOutOfStock ? 'opacity-40' : ''}">
                        ${isOutOfStock ? `<span class="absolute top-2 left-2 bg-rose-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase">OUT OF STOCK</span>` : `<span class="absolute top-2 left-2 bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase">IN STOCK</span>`}
                    </div>
                    <div class="p-3.5 space-y-1.5">
                        <span class="text-[10px] font-bold text-amber-500 uppercase tracking-wider">${p.category || 'General'}</span>
                        <h3 class="font-bold text-slate-100 text-xs line-clamp-2 cursor-pointer hover:text-amber-400" onclick="openProductModal('${p.id}')">${p.title}</h3>
                        
                        <div class="flex items-center gap-2">
                            <span class="text-sm font-black text-amber-300">PKR ${discPrice}</span>
                            <span class="text-xs text-slate-500 line-through font-semibold">PKR ${origPrice}</span>
                        </div>
                        ${bulkBadge}
                    </div>
                </div>
                <div class="p-3.5 pt-2 grid grid-cols-2 gap-2">
                    <button onclick="openProductModal('${p.id}')" ${isOutOfStock ? 'disabled' : ''} class="w-full py-2 ${isOutOfStock ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'} font-bold rounded-lg text-[11px] transition flex items-center justify-center gap-1">
                        <i class="fa-solid fa-cart-plus text-amber-400"></i> Add To Cart
                    </button>
                    <button onclick="openProductModal('${p.id}')" ${isOutOfStock ? 'disabled' : ''} class="w-full py-2 ${isOutOfStock ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600 text-slate-950'} font-black rounded-lg text-[11px] text-center transition flex items-center justify-center gap-1 shadow">
                        <i class="fa-solid fa-bolt"></i> Buy Now
                    </button>
                </div>
            </div>
        `;
    });
    grid.innerHTML = html;
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
        <img src="${img}" onclick="switchModalMainImage('${img}')" class="w-14 h-14 object-cover rounded-lg border border-slate-700 cursor-pointer hover:border-amber-400 transition">
    `).join('');

    const modalWrapper = document.getElementById('productModal');
    if (modalWrapper) {
        const innerBox = modalWrapper.querySelector('div > div') || modalWrapper.children[0];
        if (innerBox) {
            innerBox.className = "bg-slate-900 border border-slate-700 rounded-2xl p-4 md:p-6 max-w-4xl w-full mx-4 relative max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl";
        }
    }

    const modalHtml = `
        <div class="flex justify-between items-start border-b border-slate-800 pb-3">
            <div>
                <div class="flex items-center gap-2">
                    <span class="text-[11px] font-bold text-amber-400 bg-amber-950/50 border border-amber-500/30 px-2.5 py-0.5 rounded">${p.category}</span>
                    ${p.weight && p.weight !== 'N/A' ? `<span class="text-[11px] font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded"><i class="fa-solid fa-weight-hanging mr-1 text-amber-400"></i>${p.weight}</span>` : ''}
                </div>
                <h2 class="text-base md:text-lg font-bold text-white mt-1.5">${p.title}</h2>
            </div>
            <div class="text-right flex items-center gap-3">
                <div>
                    <div class="text-lg md:text-xl font-black text-amber-300">PKR ${discPrice}</div>
                    <div class="text-xs text-slate-500 line-through font-bold">PKR ${origPrice}</div>
                </div>
                <button onclick="closeProductModal()" class="text-slate-400 hover:text-white p-2 text-lg"><i class="fa-solid fa-xmark"></i></button>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div class="space-y-3">
                <div class="bg-slate-950 rounded-xl overflow-hidden h-72 md:h-80 border border-slate-800 shadow-inner">
                    <img id="modalMainImg" src="${imagesList[0]}" class="w-full h-full object-cover">
                </div>
                <div class="flex gap-2 overflow-x-auto pb-1">
                    ${thumbsHtml}
                </div>
            </div>

            <div class="space-y-4">
                <div class="grid grid-cols-3 gap-3">
                    <div>
                        <label class="block text-slate-400 text-xs font-bold mb-1">SIZE:</label>
                        <select id="modalSelectSize" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs font-bold outline-none">
                            ${sizeOptions}
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-xs font-bold mb-1">COLOR:</label>
                        <select id="modalSelectColor" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs font-bold outline-none">
                            ${colorOptions}
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-xs font-bold mb-1">QTY:</label>
                        <input type="number" id="modalSelectQty" value="1" min="1" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs font-bold outline-none">
                    </div>
                </div>

                <div>
                    <h3 class="font-bold text-slate-300 mb-1.5 text-xs">Description:</h3>
                    <p class="text-xs text-slate-300 bg-slate-950 p-3.5 rounded-xl border border-slate-800 leading-relaxed whitespace-pre-line max-h-44 overflow-y-auto">${p.desc || 'No description provided.'}</p>
                </div>
            </div>
        </div>

        <div class="border-t border-slate-800 pt-4 flex gap-3">
            <button onclick="addSelectedToCart('${p.id}')" ${isOutOfStock ? 'disabled' : ''} class="flex-1 py-3 ${isOutOfStock ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'} font-bold rounded-xl text-xs md:text-sm flex items-center justify-center gap-2 transition">
                <i class="fa-solid fa-cart-plus text-amber-400"></i> ${isOutOfStock ? 'Out of Stock' : 'Add To Cart'}
            </button>
            <button onclick="buySelectedNow('${p.id}')" ${isOutOfStock ? 'disabled' : ''} class="flex-1 py-3 ${isOutOfStock ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600 text-slate-950'} font-black rounded-xl text-center text-xs md:text-sm shadow transition flex items-center justify-center gap-2">
                <i class="fa-solid fa-bolt"></i> Buy Now
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
    openCartModal();
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
        list.innerHTML = `<p class="text-center text-slate-500 py-6">Your cart is empty.</p>`;
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
                <div class="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <div class="flex items-center gap-2">
                        <img src="${img}" class="w-10 h-10 object-cover rounded-md">
                        <div>
                            <h4 class="font-bold text-white text-[11px] line-clamp-1">${item.title}</h4>
                            <p class="text-amber-400 font-bold text-[10px]">PKR ${unitPrice} x ${item.qty} = PKR ${subtotal}</p>
                        </div>
                    </div>
                    <button onclick="removeFromCart(${index})" class="text-rose-400 hover:text-rose-600 p-1">
                        <i class="fa-solid fa-trash"></i>
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
    container.className = "space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs";
    container.innerHTML = `
        <div class="grid grid-cols-2 gap-2">
            <div>
                <label class="block text-slate-400 font-bold mb-1">Estimated Distance (KM):</label>
                <input type="number" id="custDistanceKm" value="5" min="1" oninput="calculateLiveDC()" class="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold outline-none">
            </div>
            <div>
                <label class="block text-slate-400 font-bold mb-1">Total Weight (KG):</label>
                <input type="number" id="custTotalWeightKg" value="0.5" step="0.1" min="0.1" oninput="calculateLiveDC()" class="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold outline-none">
            </div>
        </div>
        <div class="border-t border-slate-800 pt-2 space-y-1 text-slate-300">
            <div class="flex justify-between"><span>Subtotal:</span> <span id="summarySubtotal" class="font-bold text-white">PKR 0</span></div>
            <div class="flex justify-between"><span>Delivery Charges (DC):</span> <span id="summaryDC" class="font-bold text-amber-400">PKR 0</span></div>
            <div class="flex justify-between text-sm border-t border-slate-800 pt-1 font-black text-amber-300">
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
    const distanceKm = parseFloat(document.getElementById('custDistanceKm')?.value) || 5;
    const weightKg = parseFloat(document.getElementById('custTotalWeightKg')?.value) || 0.5;

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

    const finalTotal = subtotal + calculatedDC;

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
    const distanceKm = parseFloat(document.getElementById('custDistanceKm')?.value) || 5;
    const weightKg = parseFloat(document.getElementById('custTotalWeightKg')?.value) || 0.5;

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

        alert(`Order successfully submit ho gaya hai! 🎉\nTracking ID: ${autoTrackingId}\nTotal COD (Incl. DC): PKR ${finalTotal}`);
        cart = [];
        updateCartBadge();
        closeCheckoutModal();
        document.getElementById('checkoutModal').querySelector('form').reset();
    } catch (err) {
        alert("Error submitting order: " + err.message);
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
        btnEl.className = "w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl text-xs tracking-wider uppercase shadow-lg transition transform active:scale-95";
    } else {
        titleEl.className = "text-xl font-black uppercase tracking-wider text-rose-600";
        iconEl.className = "flex justify-center text-rose-500 text-5xl mb-2";
        iconEl.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
        btnEl.className = "w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl text-xs tracking-wider uppercase shadow-lg transition transform active:scale-95";
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
