// js/store.js
let allProducts = [];
let selectedCategory = 'All';
let cart = [];

// Safely initialize Firestore db instance
const storeDb = window.firebase ? firebase.firestore() : null;

function listenToLiveCatalog() {
    if (!storeDb) {
        console.error("Firebase Firestore is not initialized!");
        document.getElementById('productGrid').innerHTML = `<div class="col-span-full text-center text-rose-400 py-8">Firebase connection error.</div>`;
        return;
    }

    storeDb.collection('products').onSnapshot(snapshot => {
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
        
        renderDynamicCategoryButtons(Array.from(dynamicCategories));
        renderPublicCategoriesGrid(allProducts);
        filterProducts();
    }, err => {
        console.error("Firestore Error:", err);
        document.getElementById('productGrid').innerHTML = `<div class="col-span-full text-center text-rose-400 py-8">Failed to sync inventory: ${err.message}</div>`;
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

function renderDynamicCategoryButtons(categories) {
    const container = document.getElementById('categoryFilterContainer');
    if (!container) return;
    const baseCategories = [
        'Fashion & Apparel', 
        'Electronics & Gadgets', 
        'Home & Kitchen', 
        'Accessories', 
        'Computer Accessories', 
        'Dish Set', 
        'Medicine Box', 
        'Mobile Accessories'
    ];
    const finalCategoryList = Array.from(new Set([...baseCategories, ...categories]));

    let html = `<button onclick="setCategory('All', this)" class="cat-btn px-4 py-1.5 rounded-lg font-bold ${selectedCategory === 'All' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'} transition whitespace-nowrap shadow">All Products</button>`;

    finalCategoryList.forEach(cat => {
        const isSelected = selectedCategory === cat;
        html += `
            <button onclick="setCategory('${cat}', this)" class="cat-btn px-4 py-1.5 rounded-lg font-bold ${isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'} transition whitespace-nowrap">${cat}</button>
        `;
    });

    container.innerHTML = html;
}

function setCategory(cat, btn) {
    selectedCategory = cat;
    document.querySelectorAll('.cat-btn').forEach(b => {
        b.className = "cat-btn px-4 py-1.5 rounded-lg font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition whitespace-nowrap";
    });
    if (btn) {
        btn.className = "cat-btn px-4 py-1.5 rounded-lg font-bold bg-amber-500 text-slate-950 transition whitespace-nowrap shadow";
    }
    filterProducts();
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
        <img src="${img}" onclick="switchModalMainImage('${img}')" class="w-12 h-12 object-cover rounded-lg border border-slate-700 cursor-pointer hover:border-amber-400 transition">
    `).join('');

    let reviewsHtml = '';
    try {
        const revSnap = await storeDb.collection('products').doc(id).collection('reviews').get();
        if (!revSnap.empty) {
            revSnap.forEach(rDoc => {
                const rev = rDoc.data();
                reviewsHtml += `
                    <div class="bg-slate-950 p-2 rounded border border-slate-800 text-[11px]">
                        <div class="flex justify-between text-amber-400 font-bold">
                            <span>${rev.reviewerName || 'Buyer'}</span>
                            <span>${'★'.repeat(rev.rating || 5)}</span>
                        </div>
                        <p class="text-slate-300 mt-0.5">${rev.comment}</p>
                    </div>
                `;
            });
        } else {
            reviewsHtml = `<p class="text-slate-500 text-[10px]">No reviews yet. Be the first to review!</p>`;
        }
    } catch(e) {
        reviewsHtml = `<p class="text-slate-500 text-[10px]">No reviews loaded.</p>`;
    }

    const modalHtml = `
        <div class="flex justify-between items-start">
            <div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-bold text-amber-400 bg-amber-950/50 border border-amber-500/30 px-2 py-0.5 rounded">${p.category}</span>
                    ${p.weight && p.weight !== 'N/A' ? `<span class="text-[10px] font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded"><i class="fa-solid fa-weight-hanging mr-1 text-amber-400"></i>${p.weight}</span>` : ''}
                </div>
                <h2 class="text-sm font-bold text-white mt-1">${p.title}</h2>
            </div>
            <div class="text-right">
                <div class="text-base font-black text-amber-300">PKR ${discPrice}</div>
                <div class="text-xs text-slate-500 line-through font-bold">PKR ${origPrice}</div>
            </div>
        </div>

        <div class="bg-slate-950 border border-slate-800 p-2 rounded-lg flex justify-between items-center text-[11px]">
            <span class="text-slate-300"><i class="fa-solid fa-cloud-arrow-down text-amber-400 mr-1"></i> Marketing Media Assets:</span>
            <button onclick="downloadMediaAsset('${imagesList[0]}', '${p.title}')" class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded text-[10px]">
                Download Image
            </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
                <div class="bg-slate-950 rounded-xl overflow-hidden h-56 border border-slate-800">
                    <img id="modalMainImg" src="${imagesList[0]}" class="w-full h-full object-cover">
                </div>
                <div class="flex gap-2 overflow-x-auto pb-1">
                    ${thumbsHtml}
                </div>
            </div>

            <div class="space-y-3">
                <div class="grid grid-cols-3 gap-2">
                    <div>
                        <label class="block text-slate-400 text-[10px] font-bold mb-1">SIZE:</label>
                        <select id="modalSelectSize" class="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-bold outline-none">
                            ${sizeOptions}
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-[10px] font-bold mb-1">COLOR:</label>
                        <select id="modalSelectColor" class="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-bold outline-none">
                            ${colorOptions}
                        </select>
                    </div>
                    <div>
                        <label class="block text-slate-400 text-[10px] font-bold mb-1">QTY:</label>
                        <input type="number" id="modalSelectQty" value="1" min="1" class="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-bold outline-none">
                    </div>
                </div>

                <div>
                    <h3 class="font-bold text-slate-300 mb-1 text-[11px]">Description:</h3>
                    <p class="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 leading-relaxed whitespace-pre-line">${p.desc || 'No description provided.'}</p>
                </div>
            </div>
        </div>

        <div class="border-t border-slate-800 pt-3 space-y-2">
            <h3 class="font-bold text-white text-xs"><i class="fa-solid fa-star text-amber-400 mr-1"></i> Customer Reviews & Ratings</h3>
            <div class="space-y-1.5 max-h-28 overflow-y-auto">
                ${reviewsHtml}
            </div>

            <form onsubmit="submitReview(event, '${id}')" class="flex gap-2 pt-1">
                <input type="text" id="revName" placeholder="Your Name" required class="w-1/3 p-1.5 bg-slate-950 border border-slate-700 rounded text-[10px]">
                <input type="text" id="revText" placeholder="Write a review..." required class="flex-1 p-1.5 bg-slate-950 border border-slate-700 rounded text-[10px]">
                <button type="submit" class="bg-amber-500 text-slate-950 font-bold px-3 py-1 rounded text-[10px]">Submit</button>
            </form>
        </div>

        <div class="pt-2 flex gap-3">
            <button onclick="addSelectedToCart('${p.id}')" ${isOutOfStock ? 'disabled' : ''} class="flex-1 py-2.5 ${isOutOfStock ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'} font-bold rounded-xl text-xs flex items-center justify-center gap-2">
                <i class="fa-solid fa-cart-plus text-amber-400"></i> ${isOutOfStock ? 'Out of Stock' : 'Add To Cart'}
            </button>
            <button onclick="buySelectedNow('${p.id}')" ${isOutOfStock ? 'disabled' : ''} class="flex-1 py-2.5 ${isOutOfStock ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600 text-slate-950'} font-black rounded-xl text-center text-xs shadow transition flex items-center justify-center gap-2">
                <i class="fa-solid fa-bolt"></i> Buy Now
            </button>
        </div>
    `;

    document.getElementById('modalContent').innerHTML = modalHtml;
    document.getElementById('productModal').classList.remove('hidden');
}

function downloadMediaAsset(url, title) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_media.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

async function submitReview(e, prodId) {
    e.preventDefault();
    const name = document.getElementById('revName').value.trim();
    const text = document.getElementById('revText').value.trim();

    try {
        await storeDb.collection('products').doc(prodId).collection('reviews').add({
            reviewerName: name,
            comment: text,
            rating: 5,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Thank you for your review! ⭐");
        openProductModal(prodId);
    } catch(err) {
        alert("Error submitting review: " + err.message);
    }
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
    let total = 0;
    cart.forEach(i => total += (calculateItemPrice(i) * i.qty));
    document.getElementById('checkoutOrderTotal').innerText = `PKR ${total}`;
    closeCartModal();
    document.getElementById('checkoutModal').classList.remove('hidden');
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

    let total = 0;
    cart.forEach(i => total += (calculateItemPrice(i) * i.qty));

    const autoTrackingId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const fullDestinationAddress = `${city} - ${address}`;

    try {
        await storeDb.collection('parcels').add({
            trackId: autoTrackingId,
            custName: name,
            custPhone: phone,
            custCity: city,
            custAddress: fullDestinationAddress,
            totalCod: total,
            items: cart,
            status: 'Pending',
            approvedByAdmin: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await storeDb.collection('orders').add({
            customerName: name,
            customerPhone: phone,
            customerAddress: fullDestinationAddress,
            items: cart,
            totalAmount: total,
            status: 'Pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(`Order successfully submit ho gaya hai! 🎉\nTracking ID: ${autoTrackingId}`);
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

// Initialize Store safely
listenToLiveCatalog();
