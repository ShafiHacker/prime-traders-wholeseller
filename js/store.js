function listenToLiveCatalog() {
    db.collection('products').onSnapshot(snapshot => {
        allProducts = [];
        const dynamicCategories = new Set();

        snapshot.forEach(doc => {
            const data = doc.data();
            // isActive ki restriction hata di hai taake saare products show hon
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
        document.getElementById('productGrid').innerHTML = `<div class="col-span-full text-center text-rose-400 py-8">Failed to sync inventory.</div>`;
    });
}
