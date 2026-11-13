// js/admin.js
let selectedImageFiles = [];
let currentAdminEmail = "";
let loadedProductsMap = {};
window.allAdminProducts = [];

auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        currentAdminEmail = user.email || "Admin User";
        const display = document.getElementById('adminUserDisplay');
        if (display) display.innerText = `Logged in as: ${currentAdminEmail}`;
        loadAdminProducts();
        loadAdminOrders();
    }
});

function getVendorName(email) {
    const targetEmail = (email || "").toLowerCase().trim();
    if (targetEmail.includes("abubakr@primetraders.com")) return "AbuBakar";
    if (targetEmail.includes("mkashan@primetraders.com")) return "Muhammad Kashan";
    if (targetEmail.includes("admin@primetraders.com")) return "Shafi Ul Haq";
    return email || "Shafi Ul Haq";
}

function autoDetectCategory(titleText) {
    const title = titleText.toLowerCase();
    const select = document.getElementById('prodCategory');
    if (!select) return;

    if (title.includes('spice') || title.includes('jar') || title.includes('rack') || title.includes('kitchen') || title.includes('lamp') || title.includes('bottle') || title.includes('organizer') || title.includes('box')) {
        select.value = "Home & Kitchen";
    } else if (title.includes('shirt') || title.includes('pant') || title.includes('dress') || title.includes('cloth') || title.includes('wear') || title.includes('shoe')) {
        select.value = "Fashion & Apparel";
    } else if (title.includes('fan') || title.includes('usb') || title.includes('charger') || title.includes('led') || title.includes('gadget') || title.includes('cable') || title.includes('earbuds') || title.includes('phone') || title.includes('holder')) {
        select.value = "Electronics & Gadgets";
    } else if (title.includes('bag') || title.includes('watch') || title.includes('glass') || title.includes('belt') || title.includes('wallet') || title.includes('brush')) {
        select.value = "Accessories";
    }
    handleCategoryChange(select.value);
}

function handleCategoryChange(val) {
    const customBox = document.getElementById('customCategoryBox');
    if (!customBox) return;
    if (val === '__NEW__') {
        customBox.classList.remove('hidden');
        const input = document.getElementById('customCategoryInput');
        if (input) input.focus();
    } else {
        customBox.classList.add('hidden');
    }
}

async function handleImageSelection(e) {
    const files = Array.from(e.target.files);
    for (let f of files) {
        const base64 = await compressImageFile(f);
        selectedImageFiles.push(base64);
    }
    renderImagePreviews();
    e.target.value = "";
}

function renderImagePreviews() {
    const container = document.getElementById('imagePreviewContainer');
    if (!container) return;
    if (selectedImageFiles.length === 0) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = selectedImageFiles.map((b64, idx) => `
        <div class="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-300 group shadow-xs">
            <img src="${b64}" class="w-full h-full object-cover">
            <button type="button" onclick="removeSingleImage(${idx})" class="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shadow hover:bg-rose-700">
                ×
            </button>
        </div>
    `).join('');
}

function removeSingleImage(index) {
    selectedImageFiles.splice(index, 1);
    renderImagePreviews();
}

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function compressImageFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxWidth = 450;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.60));
            };
        };
    });
}

async function handleSaveProduct(e) {
    e.preventDefault();
    if (selectedImageFiles.length === 0) {
        alert("Please attach at least 1 image file.");
        return;
    }

    const btn = document.getElementById('submitBtn');
    const editingId = document.getElementById('editingProductId').value;
    btn.disabled = true;
    btn.innerText = editingId ? "Updating Product..." : "Publishing to Portal...";

    const title = document.getElementById('prodTitle').value.trim();
    let category = document.getElementById('prodCategory').value;
    if (category === '__NEW__') {
        const customCat = document.getElementById('customCategoryInput').value.trim();
        if (customCat) {
            category = customCat;
        } else {
            alert("Please enter custom category name.");
            btn.disabled = false;
            return;
        }
    }

    const originalPrice = parseFloat(document.getElementById('prodOriginalPrice').value);
    const price = parseFloat(document.getElementById('prodPrice').value);
    const bulkPrice = parseFloat(document.getElementById('prodBulkPrice').value) || 0;
    const bulkQty = parseInt(document.getElementById('prodBulkQty').value) || 0;
    const stock = parseInt(document.getElementById('prodStock').value);
    const weight = document.getElementById('prodWeight').value.trim();
    const desc = document.getElementById('prodDesc').value.trim();

    const sizeBoxes = document.querySelectorAll('input[name="prodSize"]:checked');
    const sizes = Array.from(sizeBoxes).map(cb => cb.value);

    const rawColors = document.getElementById('prodColors').value;
    const colors = rawColors ? rawColors.split(',').map(c => c.trim()).filter(c => c) : [];

    const videoFileInput = document.getElementById('prodVideoFile');
    const videoFile = videoFileInput ? videoFileInput.files[0] : null;

    try {
        let videoBase64 = "";
        if (videoFile) {
            videoBase64 = await convertFileToBase64(videoFile);
        }

        let assignedVendorName = "";
        let originalCreator = "";

        if (editingId && loadedProductsMap[editingId]) {
            const existing = loadedProductsMap[editingId];
            assignedVendorName = existing.vendorName && !existing.vendorName.includes("@") 
                ? existing.vendorName 
                : getVendorName(existing.originalCreatorEmail || existing.addedByAdmin);
            originalCreator = existing.originalCreatorEmail || existing.addedByAdmin || currentAdminEmail;
        } else {
            assignedVendorName = getVendorName(currentAdminEmail);
            originalCreator = currentAdminEmail;
        }

        const productData = {
            title, category, originalPrice, price, bulkPrice, bulkQty, stock,
            weight: weight || "N/A", sizes, colors, 
            images: selectedImageFiles, 
            image: selectedImageFiles[0] || "",
            desc,
            isActive: true,
            vendorName: assignedVendorName,
            originalCreatorEmail: originalCreator,
            addedByAdmin: currentAdminEmail,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (videoBase64) {
            productData.videoUrl = videoBase64;
        }

        if (editingId) {
            const existingProd = loadedProductsMap[editingId];
            if (existingProd && existingProd.isActive !== undefined) {
                productData.isActive = existingProd.isActive;
            }
            if (existingProd && existingProd.createdAt) {
                productData.createdAt = existingProd.createdAt;
            }
            await db.collection('products').doc(editingId).update(productData);
            alert("Product updated successfully! 🔄");
        } else {
            productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('products').add(productData);
            alert("Product published successfully! 🎉");
        }

        resetProductForm();
        loadAdminProducts();
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Publish Product to Central Catalog";
    }
}

async function toggleProductStatus(id, currentStatus) {
    const newStatus = currentStatus === false ? true : false;
    try {
        await db.collection('products').doc(id).update({ isActive: newStatus });
    } catch (e) {
        alert("Error updating status: " + e.message);
    }
}

async function updateProductStock(id, newStock) {
    try {
        await db.collection('products').doc(id).update({ stock: newStock });
    } catch (e) {
        alert("Error updating stock: " + e.message);
    }
}

function editProduct(id) {
    const p = loadedProductsMap[id];
    if (!p) return;

    document.getElementById('editingProductId').value = id;
    document.getElementById('prodTitle').value = p.title || '';
    
    const select = document.getElementById('prodCategory');
    let matched = false;
    for (let option of select.options) {
        if (option.value === p.category) {
            select.value = p.category;
            matched = true;
            break;
        }
    }
    if (!matched && p.category) {
        const newOpt = document.createElement('option');
        newOpt.value = p.category;
        newOpt.innerText = p.category;
        select.insertBefore(newOpt, select.options[select.options.length - 1]);
        select.value = p.category;
    }

    document.getElementById('prodOriginalPrice').value = p.originalPrice || '';
    document.getElementById('prodPrice').value = p.price || '';
    document.getElementById('prodBulkPrice').value = p.bulkPrice || '';
    document.getElementById('prodBulkQty').value = p.bulkQty || '';
    document.getElementById('prodStock').value = p.stock || '';
    document.getElementById('prodWeight').value = p.weight !== 'N/A' ? p.weight : '';
    document.getElementById('prodColors').value = p.colors ? p.colors.join(', ') : '';
    document.getElementById('prodDesc').value = p.desc || '';

    document.querySelectorAll('input[name="prodSize"]').forEach(cb => {
        cb.checked = p.sizes && p.sizes.includes(cb.value);
    });

    selectedImageFiles = p.images || (p.image ? [p.image] : []);
    renderImagePreviews();

    document.getElementById('formHeading').innerHTML = `<i class="fa-solid fa-pen-to-square text-[#2563EB] mr-1.5"></i> Edit Product: ${p.title}`;
    document.getElementById('submitBtn').innerText = "Update Product Changes";
    document.getElementById('cancelEditBtn').classList.remove('hidden');

    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Automatically switch tab to product form view
    if (typeof switchTab === 'function') {
        switchTab('add-product');
    }
}

function resetProductForm() {
    const form = document.getElementById('addProductForm');
    if (form) form.reset();
    document.getElementById('editingProductId').value = '';
    const customBox = document.getElementById('customCategoryBox');
    if (customBox) customBox.classList.add('hidden');
    selectedImageFiles = [];
    renderImagePreviews();
    document.getElementById('formHeading').innerHTML = `<i class="fa-solid fa-plus-circle text-emerald-600 mr-1.5"></i> Add New Wholesale Product`;
    document.getElementById('submitBtn').innerText = "Publish Product to Central Catalog";
    document.getElementById('cancelEditBtn').classList.add('hidden');
}

async function deleteProduct(id) {
    if (confirm("Are you sure you want to delete this product?")) {
        try {
            await db.collection('products').doc(id).delete();
            alert("Product deleted successfully.");
        } catch(e) {
            alert("Error deleting product: " + e.message);
        }
    }
}

function renderCategoriesGrid(productsList) {
    const counts = {};
    productsList.forEach(p => {
        const cat = p.category || 'General';
        counts[cat] = (counts[cat] || 0) + 1;
    });

    const grid = document.getElementById('categoriesGrid');
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

    let html = '';
    allCats.forEach(cat => {
        const num = counts[cat] || 0;
        html += `
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center space-y-1.5 hover:border-[#2563EB] transition shadow-xs">
                <div class="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB] text-sm font-bold">
                    <i class="fa-solid fa-box-open"></i>
                </div>
                <h3 class="font-bold text-slate-800 text-xs line-clamp-1">${cat}</h3>
                <span class="bg-blue-100 text-[#102544] px-2.5 py-0.5 rounded-full text-[10px] font-black">${num} products</span>
            </div>
        `;
    });
    grid.innerHTML = html;
}

function loadAdminProducts() {
    const tbody = document.getElementById('adminProductTableBody');
    if (!tbody) return;
    
    db.collection('products').onSnapshot(snapshot => {
        loadedProductsMap = {};
        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-500 font-semibold">No products uploaded yet.</td></tr>`;
            renderCategoriesGrid([]);
            window.allAdminProducts = [];
            if (typeof renderStockAssetsTable === 'function') renderStockAssetsTable();
            return;
        }

        let productsList = [];
        snapshot.forEach(doc => {
            productsList.push({ id: doc.id, ...doc.data() });
        });

        productsList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        window.allAdminProducts = productsList;

        renderCategoriesGrid(productsList);
        if (typeof renderStockAssetsTable === 'function') renderStockAssetsTable();

        let html = '';
        const categoriesSet = new Set();

        productsList.forEach(p => {
            const id = p.id;
            loadedProductsMap[id] = p;
            if (p.category) categoriesSet.add(p.category);

            const mainImg = (p.images && p.images.length > 0) ? p.images[0] : (p.image || 'https://via.placeholder.com/100');
            const imgCount = p.images ? p.images.length : 1;
            const stockVal = p.stock !== undefined ? p.stock : 0;
            
            const isActive = p.isActive !== false;
            const statusBadge = isActive 
                ? `<button onclick="toggleProductStatus('${id}', true)" class="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-bold hover:bg-rose-100 hover:text-rose-800 transition">Active (Visible)</button>`
                : `<button onclick="toggleProductStatus('${id}', false)" class="bg-rose-100 text-rose-800 border border-rose-300 px-2.5 py-1 rounded-full text-[10px] font-bold hover:bg-emerald-100 hover:text-emerald-800 transition">Inactive (Hidden)</button>`;

            const bulkInfo = p.bulkPrice && p.bulkQty ? `<div class="text-[10px] font-bold text-orange-600 mt-0.5">Bulk: PKR ${p.bulkPrice} (${p.bulkQty}+ pcs)</div>` : '';

            html += `
                <tr class="border-b border-slate-200 hover:bg-slate-50 transition ${!isActive ? 'opacity-60 bg-slate-100/50' : ''}">
                    <td class="p-3">
                        <div class="flex items-center gap-1.5">
                            <img src="${mainImg}" class="w-11 h-11 object-cover rounded-lg border border-slate-200 shadow-xs">
                            <span class="text-[10px] text-slate-500 font-bold">+${imgCount-1}</span>
                        </div>
                    </td>
                    <td class="p-3">
                        <div class="font-black text-slate-900 text-xs">${p.title}</div>
                        <div class="text-[10px] font-bold text-[#2563EB] mt-0.5">${p.category}</div>
                    </td>
                    <td class="p-3">
                        <div class="flex items-center gap-2">
                            <span class="font-black text-slate-900 text-xs">${stockVal} units</span>
                            <div class="flex flex-col gap-0.5">
                                <button onclick="updateProductStock('${id}', ${stockVal + 1})" class="w-5 h-5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded flex items-center justify-center font-black text-[10px]" title="Increase Stock">+</button>
                                <button onclick="updateProductStock('${id}', ${Math.max(0, stockVal - 1)})" class="w-5 h-5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded flex items-center justify-center font-black text-[10px]" title="Decrease Stock">-</button>
                            </div>
                        </div>
                    </td>
                    <td class="p-3">
                        <div class="font-black text-slate-900 text-xs">Single: PKR ${p.price}</div>
                        ${bulkInfo}
                    </td>
                    <td class="p-3">
                        <div>${statusBadge}</div>
                    </td>
                    <td class="p-3 text-center space-x-1">
                        <button onclick="editProduct('${id}')" class="bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs">
                            <i class="fa-solid fa-pen"></i> Edit
                        </button>
                        <button onclick="deleteProduct('${id}')" class="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

        const select = document.getElementById('prodCategory');
        if (select) {
            categoriesSet.forEach(cat => {
                let exists = Array.from(select.options).some(opt => opt.value === cat);
                if (!exists && cat) {
                    const newOpt = document.createElement('option');
                    newOpt.value = cat;
                    newOpt.innerText = cat;
                    select.insertBefore(newOpt, select.options[select.options.length - 1]);
                }
            });
        }
    }, err => {
        console.error("Error loading products, retrying...", err);
        setTimeout(loadAdminProducts, 3000);
    });
}

function updateLogisticsSummaryCards(ordersList) {
    const totalParcels = ordersList.length;
    let delivered = 0;
    let processing = 0;
    let returned = 0;
    let totalCod = 0;

    ordersList.forEach(o => {
        const st = (o.status || 'Pending').toLowerCase();
        const amt = parseFloat(o.totalAmount || o.totalCod || 0) || 0;
        totalCod += amt;

        if (st.includes('delivered') || st.includes('completed')) {
            delivered++;
        } else if (st.includes('returned') || st.includes('cancel') || st.includes('rejected')) {
            returned++;
        } else {
            processing++;
        }
    });

    const successRate = totalParcels > 0 ? ((delivered / totalParcels) * 100).toFixed(1) : 0;

    const el1 = document.getElementById('statTotalParcels');
    const el2 = document.getElementById('statDelivered');
    const el3 = document.getElementById('statProcessing');
    const el4 = document.getElementById('statReturned');
    const el5 = document.getElementById('statTotalCod');
    const el6 = document.getElementById('statSuccessRate');

    if (el1) el1.innerText = totalParcels;
    if (el2) el2.innerText = delivered;
    if (el3) el3.innerText = processing;
    if (el4) el4.innerText = returned;
    if (el5) el5.innerText = `PKR ${totalCod}`;
    if (el6) el6.innerText = `${successRate}%`;
}

function loadAdminOrders() {
    const tbody = document.getElementById('adminOrdersTableBody');
    if (!tbody) return;

    db.collection('orders').onSnapshot(snapshot => {
        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-500 font-semibold">No orders received yet.</td></tr>`;
            updateLogisticsSummaryCards([]);
            return;
        }

        let ordersList = [];
        snapshot.forEach(doc => {
            ordersList.push({ id: doc.id, ...doc.data() });
        });

        ordersList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        updateLogisticsSummaryCards(ordersList);

        let html = '';
        ordersList.forEach(o => {
            const id = o.id;
            let itemsStr = o.items ? o.items.map(i => `<span class="font-bold text-slate-900">${i.title}</span> (x${i.qty || 1}) - Size: ${i.selectedSize || 'N/A'}, Color: ${i.selectedColor || 'N/A'}`).join('<br>') : (o.itemDetail || 'Details N/A');

            html += `
                <tr class="border-b border-slate-200 hover:bg-slate-50 transition">
                    <td class="p-3 font-bold text-slate-900">
                        ${o.customerName || o.custName || 'N/A'}
                        <div class="text-[11px] font-bold text-[#2563EB]">${o.customerPhone || o.custPhone || ''}</div>
                        <div class="text-[11px] text-slate-600 font-normal">${o.customerAddress || o.custAddress || ''}</div>
                    </td>
                    <td class="p-3 text-slate-700 text-xs">${itemsStr}</td>
                    <td class="p-3 font-black text-slate-900">PKR ${o.totalAmount || o.totalCod || 0}</td>
                    <td class="p-3">
                        <span class="px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">${o.status || 'Pending'}</span>
                    </td>
                    <td class="p-3 text-center">
                        <button onclick="deleteAdminOrder('${id}')" class="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs">Delete</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }, err => {
        console.error("Orders error, retrying...", err);
        setTimeout(loadAdminOrders, 3000);
    });
}

async function deleteAdminOrder(id) {
    if (confirm("Delete this order?")) {
        await db.collection('orders').doc(id).delete();
    }
}

function handleLogout() {
    auth.signOut().then(() => window.location.href = "login.html");
}

function renderStockAssetsTable() {
    const container = document.getElementById('stockAssetDetailsContainer');
    const totalValuationEl = document.getElementById('totalStockAssetAmount');
    if (!container || !window.allAdminProducts) return;

    let totalValuation = 0;
    let html = `
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="border-b border-slate-300 text-slate-700 text-[11px] font-black uppercase">
                    <th class="p-3 w-12">Sr#</th>
                    <th class="p-3">Product Title</th>
                    <th class="p-3">Category</th>
                    <th class="p-3">Unit Price (PKR)</th>
                    <th class="p-3">Available Stock Qty</th>
                    <th class="p-3 text-right">Asset Worth (PKR)</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 text-xs font-medium text-slate-800">
    `;

    if (window.allAdminProducts.length === 0) {
        html += `<tr><td colspan="6" class="p-6 text-center text-slate-500">No products found in inventory.</td></tr>`;
    } else {
        window.allAdminProducts.forEach((p, index) => {
            const price = p.price || 0;
            const stock = p.stock !== undefined ? p.stock : 0;
            const assetWorth = price * stock;
            totalValuation += assetWorth;

            html += `
                <tr class="hover:bg-slate-50 transition">
                    <td class="p-3 font-bold text-slate-600">${index + 1}</td>
                    <td class="p-3 font-bold text-slate-900">${p.title}</td>
                    <td class="p-3 text-slate-600">${p.category || 'General'}</td>
                    <td class="p-3 font-bold text-slate-800">PKR ${price.toLocaleString()}</td>
                    <td class="p-3">
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-black ${stock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                            ${stock > 0 ? stock + ' units available' : 'Out of Stock'}
                        </span>
                    </td>
                    <td class="p-3 text-right font-black text-slate-900">PKR ${assetWorth.toLocaleString()}</td>
                </tr>
            `;
        });
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
    if (totalValuationEl) totalValuationEl.innerText = `PKR ${totalValuation.toLocaleString()}`;
}
