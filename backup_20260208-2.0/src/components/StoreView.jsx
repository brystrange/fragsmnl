import React, { useState } from 'react';
import { ShoppingBag, Plus, Minus } from 'lucide-react';
import StoreNavbar from './StoreNavbar';

const StoreView = ({ collections, products, user, reserveProduct, logout, reservations, isAdmin }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [loadingProducts, setLoadingProducts] = useState({});
  const [filters, setFilters] = useState({
    collection: '',
    minPrice: '',
    maxPrice: '',
    inStock: false
  });

  // Filter to only show published collections in the PRODUCT LIST
  const publishedCollections = collections.filter(c => (c.status || 'published') === 'published');

  // Filter to only show products from published collections
  const publishedProducts = products.filter(p => {
    const collection = collections.find(c => c.id === p.collectionId);
    return collection && (collection.status || 'published') === 'published';
  });

  // Get quantity for a product (default 1)
  const getQuantity = (productId) => quantities[productId] || 1;

  // Update quantity
  const updateQuantity = (productId, change) => {
    const currentQty = getQuantity(productId);
    const product = publishedProducts.find(p => p.id === productId);
    const newQty = Math.max(1, Math.min(currentQty + change, product.availableStock));
    setQuantities({ ...quantities, [productId]: newQty });
  };

  // Set quantity directly
  const setQuantity = (productId, value) => {
    const product = publishedProducts.find(p => p.id === productId);
    const qty = Math.max(1, Math.min(parseInt(value) || 1, product.availableStock));
    setQuantities({ ...quantities, [productId]: qty });
  };

  // Handle reservation with quantity and loading state
  const handleReserveProduct = async (productId) => {
    const quantity = getQuantity(productId);
    setLoadingProducts({ ...loadingProducts, [productId]: true });

    try {
      await reserveProduct(productId, quantity);
      // Reset quantity after reservation
      setQuantities({ ...quantities, [productId]: 1 });
    } finally {
      setLoadingProducts({ ...loadingProducts, [productId]: false });
    }
  };

  // Filter products based on search and filters
  const filteredProducts = publishedProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCollection = !filters.collection || product.collectionId === filters.collection;

    const matchesMinPrice = !filters.minPrice || product.price >= parseFloat(filters.minPrice);
    const matchesMaxPrice = !filters.maxPrice || product.price <= parseFloat(filters.maxPrice);

    const matchesStock = !filters.inStock || product.availableStock > 0;

    return matchesSearch && matchesCollection && matchesMinPrice && matchesMaxPrice && matchesStock;
  });

  const clearFilters = () => {
    setFilters({
      collection: '',
      minPrice: '',
      maxPrice: '',
      inStock: false
    });
    setSearchQuery('');
  };

  const activeFilterCount = [
    filters.collection,
    filters.minPrice,
    filters.maxPrice,
    filters.inStock
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Shared Navbar - Pass ALL collections for navigation menu */}
      <StoreNavbar
        collections={collections}
        user={user}
        logout={logout}
        reservations={reservations}
        isAdmin={isAdmin}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filters={filters}
        setFilters={setFilters}
        showAdvancedSearch={showAdvancedSearch}
        setShowAdvancedSearch={setShowAdvancedSearch}
        activeFilterCount={activeFilterCount}
        clearFilters={clearFilters}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Results Info */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-gray-600">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
          </p>
          {(searchQuery || activeFilterCount > 0) && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear search & filters
            </button>
          )}
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No products found</p>
            {(searchQuery || activeFilterCount > 0) && (
              <button
                onClick={clearFilters}
                className="text-purple-600 hover:text-purple-700 font-semibold"
              >
                Clear filters to see all products
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProducts.map(product => {
              const collection = publishedCollections.find(c => c.id === product.collectionId);
              const quantity = getQuantity(product.id);
              const isLoading = loadingProducts[product.id];

              return (
                <div key={product.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition group">
                  {/* Product Image */}
                  <div className="relative overflow-hidden bg-gray-100">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-56 object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-56 flex items-center justify-center">
                        <ShoppingBag className="w-16 h-16 text-gray-300" />
                      </div>
                    )}
                    {product.availableStock === 0 && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                          Out of Stock
                        </span>
                      </div>
                    )}
                    {product.availableStock > 0 && product.availableStock <= 5 && (
                      <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-semibold">
                        Only {product.availableStock} left!
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    {collection && (
                      <p className="text-xs text-purple-600 font-medium mb-1">{collection.name}</p>
                    )}
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 min-h-[2.5rem]">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2 min-h-[2.5rem]">
                      {product.description}
                    </p>

                    {/* Price and Stock */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl font-bold text-gray-900">₱{product.price.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className={`text-xs font-medium ${product.availableStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {product.availableStock > 0 ? `${product.availableStock} available` : 'Out of stock'}
                      </span>
                    </div>

                    {/* Compact Quantity Selector */}
                    {product.availableStock > 0 && (
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600">Qty:</span>
                        <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                          <button
                            onClick={() => updateQuantity(product.id, -1)}
                            disabled={quantity <= 1 || isLoading}
                            className="px-2 py-1 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition text-gray-700"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={product.availableStock}
                            value={quantity}
                            onChange={(e) => setQuantity(product.id, e.target.value)}
                            disabled={isLoading}
                            className="w-12 text-center py-1 text-sm border-0 focus:ring-0 focus:outline-none disabled:bg-gray-50"
                          />
                          <button
                            onClick={() => updateQuantity(product.id, 1)}
                            disabled={quantity >= product.availableStock || isLoading}
                            className="px-2 py-1 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition text-gray-700"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action Button with loading state */}
                    <button
                      onClick={() => handleReserveProduct(product.id)}
                      disabled={product.availableStock <= 0 || isLoading}
                      className={`w-full py-2.5 rounded-lg font-semibold transition text-sm ${product.availableStock > 0
                          ? isLoading
                            ? 'bg-purple-400 text-white cursor-wait'
                            : 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                      {product.availableStock > 0
                        ? (isLoading
                          ? 'Reserving...'
                          : `Mine ${quantity > 1 ? `(${quantity})` : ''}`)
                        : 'Out of Stock'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreView;