import React from 'react';
import ProductCard from './ProductCard';

const ProductList = () => {
  // Dữ liệu mẫu thay thế cho các div lặp lại trong HTML
  const products = [
    {
      id: 1,
      discount: '10%',
      image: 'https://via.placeholder.com/200',
      name: 'Viên uống hỗ trợ xương khớp',
      price: '150.000đ',
      oldPrice: '180.000đ'
    }
    // Bạn có thể thêm nhiều sản phẩm vào đây, component ProductCard sẽ tự động render ra thêm
  ];

  return (
    <section className="products container">
      <div className="section-title">
        <h2>Sản phẩm bán chạy</h2>
        <a href="#xem-tat-ca">Xem tất cả</a>
      </div>
      <div className="product-grid">
        {products.map(product => (
          <ProductCard 
            key={product.id}
            discount={product.discount}
            image={product.image}
            name={product.name}
            price={product.price}
            oldPrice={product.oldPrice}
          />
        ))}
      </div>
    </section>
  );
};

export default ProductList;